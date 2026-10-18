"""Host-side server control. Run as tfmc-server-control, outside website containers.

Every Minecraft instance in AMP is a server here. The helper reaches each one
only through the AMP API, using its own login from the systemd credential
`amp-login`: console input, backups, schedules and the files in the instance's
Minecraft folder. Without that credential it still answers status requests,
but it knows no servers.

The Unix socket only accepts inventory reads, plans, countdowns, cancellation
and reopening. Console input and paths are fixed here, never supplied by
website callers. POLICIES holds the rules that differ between servers.
"""
from __future__ import annotations

import fcntl
import grp
import hashlib
import json
import logging
import os
import re
import shutil
import socketserver
import threading
import time
import urllib.parse
import urllib.request
import uuid
import base64
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, asdict
from pathlib import Path
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from src.servers import inventory
from src.servers.control import ControlError, MAX_MESSAGE

ACTIVE = {"countdown", "installing", "restarting", "checking", "reopening"}
ID = re.compile(r"^[0-9a-f]{32}$")
SAFE_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,150}$")
SHA = re.compile(r"^[0-9a-f]{64}$")
AMP_ADS = os.getenv("SERVER_CONTROL_AMP_URL", "http://127.0.0.1:8080")
BACKUP_WAIT = 1200
CHUNK = 4 << 20
# Restarts keep this far from any task in the instance's AMP schedule.
SCHEDULE_MARGIN = timedelta(minutes=15)
# AMP time trigger fields and the values each may hold.
SCHEDULE_FIELDS = {"MatchMonths": range(12), "MatchDays": range(7), "MatchDaysOfMonth": range(1, 32),
                   "MatchHours": range(24), "MatchMinutes": range(60)}
STATES = {0: "stopped", 5: "starting", 10: "starting", 20: "running", 30: "restarting", 40: "stopping",
          45: "sleeping", 50: "sleeping", 60: "waiting", 70: "installing", 75: "updating", 100: "failed"}


@dataclass(frozen=True)
class Policy:
    # In-game warnings before the restart, in seconds; 0 restarts at once.
    countdown: int = 300
    # AMP takes a backup during the countdown and the restart waits for it.
    backup: bool = False
    # Updates install only releases Dev already runs.
    dev_verified: bool = True
    # After changed plugins the server stays in maintenance until staff reopen it.
    review: bool = False
    # The Maintenance plugin must be installed; otherwise it is used when present.
    maintenance: bool = False
    # Any jar that is not a published release is flagged.
    releases_only: bool = True
    # AMP's schedule must hold timed tasks; an empty one stops restarts instead of allowing any time.
    scheduled: bool = False


# Every other Minecraft instance gets the default Policy().
POLICIES = {
    "TFMCMain01": Policy(backup=True, review=True, maintenance=True, scheduled=True),
    "TFMCDev01": Policy(countdown=0, dev_verified=False, maintenance=True, releases_only=False, scheduled=True),
}
# Servers listed first; the rest follow by name.
ORDER = ("TFMCMain01", "TFMCDev01")
# Minecraft instances the helper leaves out: no inventory, no controls.
HIDDEN = {"TFMCS601"}  # Season 6, while it is being set up
ANNOUNCEMENTS = ((300, "5 minutes"), (180, "3 minutes"), (60, "1 minute"), (30, "30 seconds"), (10, "10 seconds"))


def server_key(instance: str) -> tuple[str, str]:
    """(key, label) from an AMP instance name: TFMCLobby01 is lobby, Lobby; TFMCS601 is s6, S6."""
    # AMP numbers instances with two digits.
    label = re.sub(r"\d{2}$", "", re.sub(r"^(TFMC|TF)", "", instance)) or instance
    return re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-") or instance.lower(), label


def numeric_version(value: str) -> tuple[int, ...] | None:
    return tuple(map(int, value.split("."))) if re.fullmatch(r"\d+(?:\.\d+){1,3}", value) else None


def _zone() -> ZoneInfo:
    return ZoneInfo(os.getenv("SERVER_CONTROL_LOG_TIMEZONE", "Etc/UTC"))


def scheduled_restart(times: list[dict], now: float, minutes: float) -> bool:
    """Whether [now, now + minutes] comes within SCHEDULE_MARGIN of a scheduled AMP task.

    `times` are AMP time triggers: MatchMonths (0-11), MatchDays (0 is Sunday),
    MatchDaysOfMonth, MatchHours and MatchMinutes; an empty list matches anything.
    """
    zone = _zone()
    start = datetime.fromtimestamp(now, zone)
    end = start + timedelta(minutes=minutes)
    midnight = start.replace(hour=0, minute=0, second=0, microsecond=0)
    for trigger in times:
        for day in (-1, 0, 1):
            base = (midnight + timedelta(days=day)).replace(tzinfo=None)
            if trigger.get("MatchMonths") and base.month - 1 not in trigger["MatchMonths"]:
                continue
            if trigger.get("MatchDays") and (base.weekday() + 1) % 7 not in trigger["MatchDays"]:
                continue
            if trigger.get("MatchDaysOfMonth") and base.day not in trigger["MatchDaysOfMonth"]:
                continue
            for hour in trigger.get("MatchHours") or range(24):
                for minute in trigger.get("MatchMinutes") or range(60):
                    at = base.replace(hour=hour, minute=minute).replace(tzinfo=zone)
                    if start <= at + SCHEDULE_MARGIN and end >= at - SCHEDULE_MARGIN:
                        return True
    return False


def save_json(path: Path, value: dict):
    temporary = path.with_suffix(".tmp")
    with temporary.open("w") as handle:
        json.dump(value, handle, sort_keys=True)
        handle.flush()
        os.fsync(handle.fileno())
    temporary.replace(path)
    with open_directory(path.parent) as handle:
        os.fsync(handle)


class open_directory:
    def __init__(self, path):
        self.fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY)

    def __enter__(self):
        return self.fd

    def __exit__(self, *_):
        os.close(self.fd)


def digest(path: Path) -> str:
    sha = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            sha.update(chunk)
    return sha.hexdigest()


def download(release: dict, target: Path):
    url = "https://github.com/TF-Minecraft/{}/releases/download/{}/{}".format(
        *(urllib.parse.quote(release[field], safe="") for field in ("repo", "tag", "asset")))
    request = urllib.request.Request(url, headers={"User-Agent": "TFMC-Server-Control/1.0"})
    with urllib.request.urlopen(request, timeout=30) as source, target.open("xb") as output:
        size = 0
        while chunk := source.read(1 << 20):
            size += len(chunk)
            if size > 128 << 20:
                raise ControlError("release_too_large")
            output.write(chunk)
        output.flush()
        os.fsync(output.fileno())
    if digest(target) != release["sha256"]:
        raise ControlError("release_checksum_failed")


class Amp:
    """AMP API client for the service account named in the helper's credential."""

    def __init__(self, username: str, password: str, ads: str = AMP_ADS):
        self.username, self.password, self.ads = username, password, ads
        self.sessions: dict[str, tuple[str, str]] = {}
        self.lock = threading.Lock()

    @staticmethod
    def _post(base: str, method: str, **body):
        request = urllib.request.Request(f"{base}/API/{method}", data=json.dumps(body).encode(),
                                         headers={"Accept": "application/json", "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(request, timeout=25) as response:
                result = json.loads(response.read() or b"null")
        except (OSError, ValueError) as exc:
            raise ControlError("amp_unavailable") from exc
        if isinstance(result, dict) and result.get("Title") == "Unauthorized Access":
            raise PermissionError(method)
        if isinstance(result, dict) and result.get("Status") is False:
            raise ControlError("amp_action_failed")
        return result

    def _login(self, base: str) -> str:
        result = self._post(base, "Core/Login", username=self.username, password=self.password,
                            token="", rememberMe=False)
        if not isinstance(result, dict) or not result.get("success"):
            raise ControlError("amp_login_failed")
        return result["sessionID"]

    def instances(self) -> list[dict]:
        """Every instance ADS manages, as AMP lists it."""
        with self.lock:
            for attempt in (1, 2):
                if "" not in self.sessions:
                    self.sessions[""] = self.ads, self._login(self.ads)
                try:
                    targets = self._post(self.ads, "ADSModule/GetInstances", SESSIONID=self.sessions[""][1])
                    return [instance for target in targets or [] for instance in target.get("AvailableInstances", [])]
                except PermissionError:
                    del self.sessions[""]
            raise ControlError("amp_login_failed")

    def _session(self, instance: str) -> tuple[str, str]:
        if instance not in self.sessions:
            ads = self._login(self.ads)
            ports = {item["InstanceName"]: item["Port"]
                     for target in self._post(self.ads, "ADSModule/GetInstances", SESSIONID=ads)
                     for item in target.get("AvailableInstances", [])}
            if instance not in ports:
                raise ControlError("amp_unavailable")
            base = f"http://127.0.0.1:{int(ports[instance])}"
            self.sessions[instance] = base, self._login(base)
        return self.sessions[instance]

    def call(self, instance: str, method: str, **body):
        # The lock covers only the session table, so calls to AMP run in parallel.
        for attempt in (1, 2):
            with self.lock:
                current = self._session(instance)
            base, session = current
            try:
                return self._post(base, method, SESSIONID=session, **body)
            except PermissionError:
                # Sessions expire; log in again once.
                self._forget(instance, current)
            except ControlError as exc:
                # Look the instance up again next time; never resend, as AMP may have acted.
                if exc.code == "amp_unavailable":
                    self._forget(instance, current)
                raise
        raise ControlError("amp_login_failed")

    def _forget(self, instance: str, session: tuple[str, str]):
        with self.lock:
            if self.sessions.get(instance) == session:
                del self.sessions[instance]


def _amp_time(value) -> float:
    """AMP's ISO times, or the /Date(ms)/ form some calls still return."""
    if isinstance(value, (int, float)):
        return float(value)
    match = re.fullmatch(r"/Date\((-?\d+)\)/", str(value))
    if match:
        return int(match[1]) / 1000
    # Python 3.10's fromisoformat takes neither 7 fractional digits nor "Z".
    match = re.fullmatch(r"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})?", str(value))
    if not match:
        raise ValueError(f"unexpected AMP time {value!r}")
    zone = timezone.utc if match[3] in {None, "Z"} else datetime.strptime(match[3].replace(":", ""), "%z").tzinfo
    stamp = datetime.strptime(match[1], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=zone).timestamp()
    return stamp + (int(match[2]) / 10 ** len(match[2]) if match[2] else 0)


class AmpFiles:
    """One instance's Minecraft folder through AMP's file manager, with LocalFiles' calls."""

    def __init__(self, amp: Amp, instance: str):
        self.amp, self.instance = amp, instance

    def __call__(self, method: str, **body):
        return self.amp.call(self.instance, f"FileManagerPlugin/{method}", **body)

    def listing(self, folder: str) -> list[dict] | None:
        try:
            result = self("GetDirectoryListing", Dir=folder)
        except ControlError as exc:
            if exc.code == "amp_action_failed":
                return None
            raise
        if not isinstance(result, list):
            return None
        found = []
        for e in result:
            created = _amp_time(e.get("Created", e["Modified"]))
            # AMP's Created is the modification time, so it can't tell one file from another.
            found.append({**e, "Modified": _amp_time(e["Modified"]), "Created": created, "Identity": None})
        return found

    def read(self, name: str, start: int = 0, size: int | None = None) -> bytes:
        """Bytes from `start` to the size AMP lists (or `size`); never reads past the end."""
        if size is None:
            item = inventory.entry(self, name)
            if item is None:
                raise FileNotFoundError(name)
            size = item["SizeBytes"]
        data = bytearray()
        while start + len(data) < size:
            try:
                chunk = self("GetFileChunk", Filename=name, Position=start + len(data),
                             Length=min(CHUNK, size - start - len(data)))
            except ControlError as exc:
                if exc.code == "amp_action_failed":
                    raise FileNotFoundError(name) from None
                raise
            piece = base64.b64decode((chunk or {}).get("Base64Data") or "")
            if not piece:
                break
            data += piece
        if start + len(data) != size:
            raise OSError(f"short read of {name}")
        return bytes(data)

    def write(self, name: str, data: bytes):
        if inventory.entry(self, name) is not None:
            raise FileExistsError(name)
        for offset in range(0, max(len(data), 1), CHUNK):
            self("WriteFileChunk", Filename=name, Offset=offset,
                 Data=base64.b64encode(data[offset:offset + CHUNK]).decode(), FinalChunk=offset + CHUNK >= len(data))

    def rename(self, name: str, new_name: str):
        self("RenameFile", Filename=name, NewFilename=new_name)

    def trash(self, name: str):
        self("TrashFile", Filename=name)

    def md5(self, name: str) -> str:
        return str(self("CalculateFileMD5Sum", FilePath=name)["Result"]).lower()


@dataclass(frozen=True)
class Instance:
    key: str
    label: str
    instance: str
    policy: Policy
    # The AMP instance is up, so its API and files can be reached.
    running: bool
    files: object


class Registry:
    """Every Minecraft instance in AMP, looked up again at most once a minute."""

    def __init__(self, amp: Amp | None, fixed: list[Instance] | None = None, ttl: float = 60):
        self.amp, self.ttl = amp, ttl
        self.lock = threading.Lock()
        self.found: dict[str, Instance] = {i.key: i for i in fixed or []}
        self.fixed = fixed is not None
        self.checked = 0.0

    def all(self) -> dict[str, Instance]:
        if self.fixed:
            return dict(self.found)
        with self.lock:
            if self.amp is not None and time.monotonic() - self.checked > self.ttl:
                try:
                    rows = [r for r in self.amp.instances()
                            if r.get("Module") == "Minecraft" and r.get("InstanceName") not in HIDDEN]
                except (ControlError, OSError, KeyError, TypeError, ValueError):
                    logging.exception("Could not list AMP instances")
                    rows = None
                if rows is not None:
                    self.found = self._build(rows)
                    self.checked = time.monotonic()
            return dict(self.found)

    def _build(self, rows: list[dict]) -> dict[str, Instance]:
        ordered = sorted(rows, key=lambda r: (ORDER.index(r["InstanceName"]) if r["InstanceName"] in ORDER else len(ORDER),
                                              server_key(r["InstanceName"])[1].lower()))
        found = {}
        for row in ordered:
            name = row["InstanceName"]
            key, label = server_key(name)
            if key in found:
                key = name.lower()
            found[key] = Instance(key, label, name, POLICIES.get(name, Policy()), bool(row.get("Running")),
                                  AmpFiles(self.amp, name))
        return found

    def get(self, key: str) -> Instance:
        found = self.all().get(key) if isinstance(key, str) else None
        if found is None:
            raise ControlError("bad_server", 400)
        return found


class Controller:
    def __init__(self, state: Path, registry: Registry, *, console=None, fetch=None, amp=None):
        self.state, self.registry = state, registry
        self.amp = amp
        self.console = console or self._console
        self.fetch = fetch or download
        self.lock = threading.RLock()
        self.cancelled = threading.Event()
        self.worker = None
        self.status_json = "[]"
        # Display reads skip unchanged jars; plans and restarts always read fresh bytes.
        self.jar_cache: dict[str, dict] = {}
        self.schedules: dict[str, tuple[float, list[dict]]] = {}
        state.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.jobs = json.loads((state / "jobs.json").read_text()) if (state / "jobs.json").exists() else {}
        # Recover an accepted job whose journal reached disk just before a
        # crash prevented the latest-jobs index from being written.
        for path in state.glob("*/job.json"):
            recorded = json.loads(path.read_text())
            current = self.jobs.get(recorded["server"])
            if current is None or recorded.get("accepted_at", recorded["deadline"] - 300) > current.get("accepted_at", current["deadline"] - 300):
                self.jobs[recorded["server"]] = recorded
        # Never replay writes after a helper crash or host restart.
        for job in self.jobs.values():
            if job["phase"] in ACTIVE:
                if job["phase"] == "countdown":
                    try:
                        self.console(job["server"], "broadcast &eThe server restart has been cancelled after a control connection restart.")
                    except Exception:
                        logging.exception("Could not cancel interrupted countdown for %s", job["server"])
                job.update(phase="failed", error="helper_interrupted")
        self._save()

    def _save(self):
        for job in self.jobs.values():
            save_json(self.state / job["id"] / "job.json", job)
        save_json(self.state / "jobs.json", self.jobs)
        self.status_json = json.dumps(list(self.jobs.values()))

    def _client(self) -> Amp:
        if self.amp is None:
            raise ControlError("amp_not_configured", 503)
        return self.amp

    def _call(self, server: str, method: str, **body):
        return self._client().call(self.registry.get(server).instance, method, **body)

    def _console(self, server: str, command: str):
        self._call(server, "Core/SendConsoleMessage", message=command)

    def _take_backup(self, server: str, job_id: str, actor: str, reason: str) -> dict:
        title = f"Before restart {job_id[:8]}"
        task = self._call(server, "LocalFileBackupPlugin/TakeBackup", Title=title,
                          Description=f"{actor}: {reason}"[:500], Sticky=False, Local=True, S3=False,
                          WasCreatedAutomatically=False, DirtyOnly=False, BackupWhileRunning=None)
        if not isinstance(task, dict) or not task.get("Id"):
            raise ControlError("amp_backup_failed")
        return {"title": title, "task": task["Id"], "state": "running"}

    def _await_backup(self, server: str, job: dict) -> bool:
        """Wait for the countdown's backup; False when the restart was cancelled meanwhile."""
        backup = job.get("backup")
        if not backup:
            return True
        deadline, told = time.monotonic() + BACKUP_WAIT, False
        while any(task.get("Id") == backup["task"] for task in self._call(server, "Core/GetTasks")):
            if self.cancelled.is_set():
                return False
            if not told:
                self.console(server, "broadcast &7Finishing a backup before the restart.")
                told = True
            if time.monotonic() > deadline:
                raise ControlError("amp_backup_timeout")
            if self.cancelled.wait(10):
                return False
        done = next((b for b in self._call(server, "LocalFileBackupPlugin/GetBackups")
                     if b.get("Name") == backup["title"]), None)
        if self.cancelled.is_set():
            return False
        if not done:
            raise ControlError("amp_backup_failed")
        with self.lock:
            backup.update(state="done", id=done["Id"])
            self._save()
        return True

    def _files(self, server: str):
        """The server's files, once its Minecraft folder lists plugins and logs folders."""
        found = self.registry.get(server)
        if not found.running:
            raise ControlError("server_files_unavailable", 503)
        try:
            folders = {e["Filename"] for e in found.files.listing("") or [] if e["IsDirectory"]}
            if not {"plugins", "logs"} <= folders:
                raise ControlError("server_files_unavailable", 503)
        except ControlError as exc:
            if exc.code == "amp_unavailable":
                raise ControlError("server_files_unavailable", 503) from None
            raise
        return found.files

    def snapshot(self, server: str) -> list[dict]:
        files = self._files(server)
        result = []
        names = set()
        for path, update, item in inventory.plugin_folders(files):
            if update:
                raise ControlError("pending_plugin_update")
            try:
                sha, name, version = inventory.describe(files.read(path, size=item["SizeBytes"]))
            except PermissionError:
                raise ControlError("plugin_unreadable") from None
            except FileNotFoundError:
                raise ControlError("plugins_changed") from None
            except OSError:
                # The jar changed size while it was read.
                raise ControlError("plugins_changed") from None
            if not name or not version or name.lower() in names:
                raise ControlError("plugin_inventory_conflict")
            names.add(name.lower())
            result.append({"file": path.rpartition("/")[2], "sha256": sha, "name": name, "version": version})
        return result

    def _maintenance(self, server: str) -> bool | None:
        """Whether maintenance is on; None when the server has no Maintenance plugin and its policy allows that."""
        files = self._files(server)
        if inventory.entry(files, "plugins/Maintenance/config.yml") is None:
            if self.registry.get(server).policy.maintenance:
                raise ControlError("maintenance_unavailable")
            return None
        text = files.read("plugins/Maintenance/config.yml").decode("utf-8", "replace")
        match = re.search(r"^maintenance-enabled:\s*(true|false)\s*$", text, re.MULTILINE)
        if not match:
            raise ControlError("maintenance_unavailable")
        return match[1] == "true"

    def _schedule(self, server: str) -> list[dict]:
        """The instance's enabled AMP time triggers that run at least one enabled task, cached for five minutes."""
        cached = self.schedules.get(server)
        if cached and time.monotonic() - cached[0] < 300:
            return cached[1]
        # Anything AMP returns in another shape stops the restart rather than allowing any time.
        try:
            data = self._call(server, "Core/GetScheduleData")
            triggers = data["PopulatedTriggers"]
            if not isinstance(triggers, list):
                raise TypeError("PopulatedTriggers")
            times = []
            for trigger in triggers:
                if not trigger["EnabledState"] or not any(task["EnabledState"] for task in trigger["Tasks"]):
                    continue
                if "Time" not in trigger["Type"]:
                    continue  # Event triggers, such as on start, have no time.
                if trigger["Type"] != "TimeIntervalTrigger":
                    raise TypeError(trigger["Type"])
                detail = self._call(server, "Core/GetTimeIntervalTrigger", Id=trigger["Id"])
                for key, values in SCHEDULE_FIELDS.items():
                    if not isinstance(detail[key], list) or not all(
                            type(v) is int and v in values for v in detail[key]):
                        raise TypeError(key)
                times.append(detail)
        except (ControlError, KeyError, TypeError, AttributeError) as exc:
            raise ControlError("schedule_unavailable") from exc
        if not times and self.registry.get(server).policy.scheduled:
            raise ControlError("schedule_unavailable")
        self.schedules[server] = (time.monotonic(), times)
        return times

    def _scheduled(self, server: str, minutes: float) -> bool:
        return scheduled_restart(self._schedule(server), time.time(), minutes)

    def _idle(self, server):
        if any(job["phase"] in ACTIVE or (key == server and job["phase"] in {"failed", "awaiting_review"})
               for key, job in self.jobs.items()):
            raise ControlError("server_job_active")

    def plan(self, server: str, mode: str, releases: list[dict], expected: list[dict] | None = None) -> dict:
        if mode not in {"restart", "latest"} or not isinstance(releases, list) or len(releases) > 100:
            raise ControlError("bad_server_action", 400)
        policy = self.registry.get(server).policy
        with self.lock:
            self._idle(server)
            for folder in self.state.iterdir():
                if folder.is_dir() and ID.fullmatch(folder.name) and not any(
                    job["id"] == folder.name for job in self.jobs.values()
                ):
                    path = folder / "plan.json"
                    if not (folder / "job.json").exists() and (not path.exists() or json.loads(path.read_text())["expires_at"] < time.time()):
                        shutil.rmtree(folder)
            baseline = self.snapshot(server)
            if expected is not None and baseline != expected:
                raise ControlError("plugins_changed")
            files = self._files(server)
            startup = inventory.read_startup(files)
            if not startup or not startup["done"] or self._maintenance(server):
                raise ControlError("server_not_ready")
            self.console(server, "list")
            plan_id = uuid.uuid4().hex
            folder = self.state / plan_id
            folder.mkdir(mode=0o700)
            changes = []
            skipped = []
            dev = None
            try:
                if mode == "latest":
                    used = set()
                    for release in releases:
                        if set(release) != {"repo", "tag", "asset", "sha256", "known"} or any(
                            not isinstance(release.get(field), str) or not SAFE_NAME.fullmatch(release[field])
                            for field in ("repo", "tag", "asset")
                        ) or not release["asset"].endswith(".jar") or not SHA.fullmatch(release["sha256"]) or not isinstance(release["known"], list):
                            raise ControlError("bad_release", 400)
                        version = release["tag"].removeprefix("v")
                        prefix = release["asset"].removesuffix(".jar").removesuffix("-" + version)
                        old = [jar for jar in baseline if jar["file"].lower().startswith(prefix.lower() + "-")
                               or inventory.plugin_identifier(jar["name"]) == release["repo"].lower()]
                        if not old:
                            continue  # Never add plugins that are not already installed.
                        if len(old) != 1 or old[0]["file"] in used:
                            raise ControlError("plugin_inventory_conflict")
                        used.add(old[0]["file"])
                        if old[0]["sha256"] == release["sha256"]:
                            continue
                        known = next((r for r in release["known"] if r.get("sha256") == old[0]["sha256"]), None)
                        target_version = numeric_version(version)
                        # A test build is offered for replacement; staff choose it when starting.
                        test_build = known is None
                        if test_build:
                            current_version = numeric_version(old[0]["version"])
                            newer_test = current_version is not None and target_version is not None and current_version > target_version
                        else:
                            current_version = numeric_version(known.get("version", ""))
                            if current_version is None or target_version is None or target_version <= current_version:
                                skipped.append({"repo": release["repo"], "reason": "not_a_newer_version"})
                                continue
                        if policy.dev_verified:
                            if dev is None:
                                dev = self._dev_evidence()
                            if not self._dev_verified(release, dev):
                                skipped.append({"repo": release["repo"], "reason": "not_verified_on_dev"})
                                continue
                        target = folder / release["asset"]
                        if inventory.entry(files, "plugins/" + release["asset"]) is not None and release["asset"] != old[0]["file"]:
                            raise ControlError("plugin_inventory_conflict")
                        self.fetch(release, target)
                        sha, name, jar_version = inventory.describe(target.read_bytes())
                        if sha != release["sha256"] or name != old[0]["name"] or jar_version != version:
                            raise ControlError("release_identity_failed")
                        changes.append({**{k: v for k, v in release.items() if k != "known"}, "name": name, "version": jar_version,
                                        "old_file": old[0]["file"], "old_version": old[0]["version"],
                                        **({"test_build": True, "newer_test": newer_test} if test_build else {})})
                activation = [{"name": jar["name"], "loaded": startup["enabled"].get(jar["name"].lower()),
                               "version": jar["version"]} for jar in baseline
                              if startup["enabled"].get(jar["name"].lower()) != jar["version"]
                              and startup["failed"].get(jar["name"].lower()) != jar["version"]]
                plan = {"id": plan_id, "server": server, "mode": mode, "expires_at": time.time() + 600,
                        "baseline": baseline, "changes": changes, "activation": activation, "skipped": skipped,
                        "boot_errors": self._boot_errors(files, startup["log"]), "failed_at_startup": startup["failed"],
                        "last_backup_at": self._backup_time(server),
                        "backup": policy.backup}
                save_json(folder / "plan.json", plan)
                return self._public_plan(plan)
            except BaseException:
                shutil.rmtree(folder)
                raise

    @staticmethod
    def _public_plan(plan: dict) -> dict:
        return {**{key: plan[key] for key in ("id", "server", "mode", "expires_at", "changes", "activation", "skipped", "last_backup_at")},
                "backup": plan.get("backup", False)}

    def _backup_time(self, server: str) -> float | None:
        try:
            backups = self._call(server, "LocalFileBackupPlugin/GetBackups")
            return max((_amp_time(b["Timestamp"]) for b in backups or [] if b.get("Timestamp")), default=None)
        except (ControlError, KeyError, TypeError, ValueError, AttributeError):
            return None

    def _dev_evidence(self) -> tuple | None:
        """Dev's files, latest startup and jars, read once per plan; None when Dev can't be read."""
        try:
            files = self._files("dev")
            return files, inventory.read_startup(files), self.snapshot("dev")
        except ControlError:
            return None

    def _dev_verified(self, release: dict, evidence: tuple | None = None) -> bool:
        evidence = evidence if evidence is not None else self._dev_evidence()
        if evidence is None:
            return False
        files, startup, jars = evidence
        if not startup or not startup["done"]:
            return False
        for jar in jars:
            if jar["sha256"] == release["sha256"] and startup["enabled"].get(jar["name"].lower()) == jar["version"]:
                # A matching version alone cannot prove the running bytes. The
                # recorded jar must have been on disk before that startup.
                log = inventory.entry(files, "logs/" + startup["log"])
                match = re.match(r"(\d{4}-\d{2}-\d{2})-", startup["log"])
                zone = _zone()
                written_at = log["Modified"]
                date = match[1] if match else datetime.fromtimestamp(written_at, zone).strftime("%Y-%m-%d")
                for line in inventory.log_lines(files, startup["log"]):
                    if inventory._BOOT.search(line):
                        stamp = re.search(r"\[(\d{2}:\d{2}:\d{2})\]", line)
                        if stamp is None:
                            return False
                        boot = datetime.fromisoformat(date + "T" + stamp[1]).replace(tzinfo=zone)
                        if boot.timestamp() > written_at:
                            boot -= timedelta(days=1)
                        placed = inventory.entry(files, "plugins/" + jar["file"])
                        return placed is not None and max(placed["Modified"], placed["Created"]) <= boot.timestamp()
        return False

    @staticmethod
    def _boot_errors(files, name: str) -> list[str]:
        errors = []
        for line in inventory.log_lines(files, name):
            if "ERROR]" in line or any(text in line for text in ("Error occurred while enabling", "Could not load", "Disabling ")):
                # Preserve the message and severity, strip the log's time.
                errors.append(re.sub(r"^\[\d{2}:\d{2}:\d{2}", "[TIME", line).strip())
            if inventory._DONE.search(line):
                break
        return errors

    @staticmethod
    def _error_key(line: str) -> str:
        # Worker IDs change between boots; preserve the actual error message.
        header, separator, message = line.partition("]:")
        return re.sub(r"\d+", "N", header) + separator + message if separator else line

    def _plan(self, plan_id: str) -> dict:
        if not isinstance(plan_id, str) or not ID.fullmatch(plan_id):
            raise ControlError("bad_plan", 400)
        try:
            return json.loads((self.state / plan_id / "plan.json").read_text())
        except FileNotFoundError:
            raise ControlError("plan_expired") from None

    def _unchanged(self, plan: dict):
        if self.snapshot(plan["server"]) != plan["baseline"]:
            raise ControlError("plugins_changed")
        for change in plan["changes"]:
            if digest(self.state / plan["id"] / change["asset"]) != change["sha256"]:
                raise ControlError("release_checksum_failed")

    def start(self, server: str, plan_id: str, actor: str, reason: str, emergency_override: bool = False,
              replace_test_builds: list[str] | None = None) -> dict:
        replace_test_builds = [] if replace_test_builds is None else replace_test_builds
        policy = self.registry.get(server).policy
        with self.lock:
            if not isinstance(emergency_override, bool) or (not policy.countdown and emergency_override):
                raise ControlError("bad_server_action", 400)
            if not isinstance(replace_test_builds, list) or any(not isinstance(repo, str) for repo in replace_test_builds):
                raise ControlError("bad_server_action", 400)
            plan = self._plan(plan_id)
            if plan["server"] != server:
                raise ControlError("bad_plan", 400)
            # Retrying the same accepted plan must not start a second countdown.
            previous = self.state / plan_id / "job.json"
            if previous.exists():
                return json.loads(previous.read_text())
            self._idle(server)
            if plan["server"] != server or plan["expires_at"] < time.time():
                raise ControlError("plan_expired")
            countdown = policy.countdown if not emergency_override else 0
            if self._scheduled(server, countdown / 60 + 15):
                raise ControlError("scheduled_restart_conflict")
            tests = {change["repo"] for change in plan["changes"] if change.get("test_build")}
            if not set(replace_test_builds) <= tests:
                raise ControlError("bad_server_action", 400)
            kept = tests - set(replace_test_builds)
            if kept:
                # Test builds staff left alone are not installed or checked.
                plan = {**plan, "changes": [c for c in plan["changes"] if c["repo"] not in kept],
                        "skipped": plan["skipped"] + [{"repo": repo, "reason": "test_build_kept"} for repo in sorted(kept)]}
            self._unchanged(plan)
            maintenance = self._maintenance(server)
            if maintenance:
                raise ControlError("server_not_ready")
            self.console(server, "list")
            accepted_at = time.time()
            # The backup runs alongside the countdown; an emergency restart skips it.
            backup = self._take_backup(server, plan_id, actor, reason) if countdown and policy.backup else None
            job = {"id": plan_id, "server": server, "phase": "countdown" if countdown else "installing",
                   "accepted_at": accepted_at, "deadline": accepted_at + countdown,
                   "countdown": countdown, "emergency_override": emergency_override,
                   "maintenance": maintenance is not None, "review": policy.review,
                   "actor": actor, "reason": reason, "changes": plan["changes"], "activation": plan["activation"],
                   "error": None, "maintenance_started": False, "backup": backup, "events": []}
            if kept:
                save_json(self.state / plan_id / "plan.json", plan)
            self.jobs[server] = job
            self.cancelled.clear()
            self._save()
            self.worker = threading.Thread(target=self.run, args=(plan, job), daemon=True)
            self.worker.start()
            return dict(job)

    def _event(self, job: dict, phase: str, **fields):
        with self.lock:
            job.update(phase=phase, **fields)
            job["events"].append({"at": time.time(), "phase": phase})
            self._save()

    def cancel(self, server: str, job_id: str) -> dict:
        with self.lock:
            job = self._job(server, job_id)
            if job["phase"] == "cancelled":
                return dict(job)
            if job["phase"] == "failed" and not job["maintenance_started"]:
                self._unchanged(self._plan(job_id))
                if self._maintenance(server):
                    raise ControlError("cannot_cancel")
            elif job["phase"] != "countdown":
                raise ControlError("cannot_cancel")
            self.console(server, "broadcast &eThe server restart has been cancelled.")
            if job["phase"] == "countdown":
                self.cancelled.set()
            self._event(job, "cancelled")
            return dict(job)

    def _job(self, server: str, job_id: str) -> dict:
        job = self.jobs.get(server)
        if not job or job["id"] != job_id:
            raise ControlError("job_not_found", 404)
        return job

    @staticmethod
    def _countdown(job: dict) -> int:
        # Jobs from before per-server policies: Main counted down for five minutes.
        if "countdown" in job:
            return job["countdown"]
        return 300 if job["server"] == "main" and not job.get("emergency_override", False) else 0

    def run(self, plan: dict, job: dict | None = None):
        server = plan["server"]
        job = job or self.jobs[server]
        if job["id"] != plan["id"]:
            return
        countdown = self._countdown(job)
        maintenance = job.get("maintenance", True)
        try:
            announcements = tuple((r, label) for r, label in ANNOUNCEMENTS if r <= countdown) + ((0, ""),)
            for remaining, label in announcements:
                delay = max(0, job["deadline"] - remaining - time.time())
                if self.cancelled.wait(delay):
                    return
                if not remaining and not self._await_backup(server, job):
                    return
                with self.lock:
                    if job["phase"] != ("countdown" if countdown else "installing"):
                        return
                    if remaining:
                        self.console(server, f"broadcast &c&lServer restart &7in &f{label}&7. Finish what you are doing.")
                    else:
                        self._unchanged(plan)
                        # The countdown is over; only the restart itself still needs room.
                        if self._scheduled(server, 15):
                            raise ControlError("scheduled_restart_conflict")
                        if self._maintenance(server):
                            raise ControlError("maintenance_changed")
                        self._event(job, "installing")  # Cancel and commit to writes share this lock.
            self.console(server, "broadcast &c&lServer restart &7is starting now.")
            with self.lock:
                job["maintenance_started"] = True
                self._save()
            if maintenance:
                self.console(server, "maintenance on")
                self._wait(lambda: self._maintenance(server), 30, "maintenance_unavailable")
            self._save_game(server)
            self._unchanged(plan)
            self._install(plan)
            files = self._files(server)
            before = self._settled(lambda: self._boot(files))
            self._event(job, "restarting")
            self.console(server, "stop")
            self._event(job, "checking")
            self._wait(lambda: self._boot(files) != before and self._startup_ok(plan), 600, "startup_check_failed")
            if job.get("review", server == "main") and maintenance and (plan["changes"] or plan["activation"]):
                self._event(job, "awaiting_review")
            else:
                self._reopen(plan, job)
        except Exception as exc:
            logging.exception("Server operation failed for %s", server)
            # One step under the lock, so a cancel can't land between the check and the failure.
            with self.lock:
                if job["phase"] == "cancelled":
                    return  # Cancelled meanwhile; players were already told.
                if countdown and not job["maintenance_started"]:
                    # Players were warned; tell them the restart is off.
                    try:
                        self.console(server, "broadcast &eThe server restart has been cancelled.")
                    except Exception:
                        logging.exception("Could not announce the failed countdown for %s", server)
                self._event(job, "failed", error=exc.code if isinstance(exc, ControlError) else "server_operation_failed")

    @staticmethod
    def _wait(predicate, timeout: float, code: str):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            try:
                if predicate():
                    return
            except ControlError as exc:
                # AMP restarts its view of the instance while Paper stops; keep waiting.
                if exc.code not in {"amp_unavailable", "server_files_unavailable"}:
                    raise
            time.sleep(1)
        raise ControlError(code)

    @staticmethod
    def _log_state(files) -> tuple[int, tuple]:
        """latest.log's size and what tells it from the next log, from one listing: the file's
        identity where the files have one, its first line, which carries the time Paper started
        writing it, and the newest rotated log, since Paper compresses the old latest.log
        whenever it opens a new one.

        A listing that fails, or a log Paper is still replacing or whose first line isn't
        written yet, raises server_files_unavailable, which waits retry.
        """
        listing = files.listing("logs")
        log = next((e for e in listing or [] if e["Filename"] == "latest.log" and not e["IsDirectory"]), None)
        if log is None:
            raise ControlError("server_files_unavailable", 503)
        try:
            head = files.read("logs/latest.log", 0, size=min(512, log["SizeBytes"]))
        except OSError:
            raise ControlError("server_files_unavailable", 503) from None
        if b"\n" not in head and len(head) < 512:
            raise ControlError("server_files_unavailable", 503)
        rotated = max(((m.group(1), int(m.group(2))) for e in listing
                       if (m := inventory._ROTATED.match(e["Filename"]))), default=None)
        return log["SizeBytes"], (log.get("Identity"), head.split(b"\n", 1)[0], rotated)

    @staticmethod
    def _settled(read, timeout: float = 30):
        """`read()`'s result once the files are readable: a log being replaced is retried."""
        deadline = time.monotonic() + timeout
        while True:
            try:
                return read()
            except ControlError as exc:
                if exc.code not in {"amp_unavailable", "server_files_unavailable"} or time.monotonic() > deadline:
                    raise
            time.sleep(1)

    def _save_game(self, server: str):
        files = self._files(server)
        offset, identity = self._settled(lambda: self._log_state(files))
        self.console(server, "save-all flush")

        def saved():
            size, now = self._log_state(files)
            if size < offset or now != identity:
                raise ControlError("unexpected_restart")
            return b"Saved the game" in files.read("logs/latest.log", offset)
        self._wait(saved, 60, "save_failed")

    def _install(self, plan: dict):
        files = self._files(plan["server"])
        backup = self.state / plan["id"] / "backup"
        backup.mkdir(exist_ok=True, mode=0o700)
        expected = {jar["file"]: jar["sha256"] for jar in plan["baseline"]}

        def current(name: str) -> str:
            return hashlib.sha256(files.read("plugins/" + name)).hexdigest()

        for change in plan["changes"]:
            data = files.read("plugins/" + change["old_file"])
            if hashlib.sha256(data).hexdigest() != expected[change["old_file"]]:
                raise ControlError("plugins_changed")
            with (backup / change["old_file"]).open("wb") as handle:
                handle.write(data)
                handle.flush()
                os.fsync(handle.fileno())
            if digest(backup / change["old_file"]) != expected[change["old_file"]]:
                raise ControlError("backup_failed")
        with open_directory(backup) as fd:
            os.fsync(fd)

        def place(data: bytes, temporary: str, name: str):
            """Write `data` under a name Paper ignores, check it, then give it its jar name."""
            if inventory.entry(files, "plugins/" + temporary) is not None:
                files.trash("plugins/" + temporary)
            files.write("plugins/" + temporary, data)
            if files.md5("plugins/" + temporary) != hashlib.md5(data).hexdigest():
                files.trash("plugins/" + temporary)
                raise ControlError("release_checksum_failed")
            files.rename("plugins/" + temporary, name)

        def restore(change: dict):
            """Put the original jar back, judging only by what is on disk now."""
            old, new = "plugins/" + change["old_file"], "plugins/" + change["asset"]
            if change["asset"] != change["old_file"] and inventory.entry(files, new) is not None:
                files.trash(new)
            if inventory.entry(files, old) is not None:
                if current(change["old_file"]) == expected[change["old_file"]]:
                    return
                files.trash(old)
            place((backup / change["old_file"]).read_bytes(), ".restore-" + plan["id"], change["old_file"])

        # The old jar moves to AMP's trash, so Java keeps its open copy until stop.
        # Each change counts as started before its first write: AMP can act on a
        # call and still fail to answer, so rollback checks the files themselves.
        swapped = []
        try:
            for change in plan["changes"]:
                data = (self.state / plan["id"] / change["asset"]).read_bytes()
                if hashlib.sha256(data).hexdigest() != change["sha256"]:
                    raise ControlError("release_checksum_failed")
                if current(change["old_file"]) != expected[change["old_file"]]:
                    raise ControlError("plugins_changed")
                same = change["asset"] == change["old_file"]
                if not same and inventory.entry(files, "plugins/" + change["asset"]) is not None:
                    raise ControlError("plugin_inventory_conflict")
                swapped.append(change)
                if same:
                    files.trash("plugins/" + change["old_file"])
                    place(data, ".control-" + plan["id"], change["asset"])
                else:
                    place(data, ".control-" + plan["id"], change["asset"])
                    files.trash("plugins/" + change["old_file"])
            if plan["changes"] and self._files_on_disk(plan["server"]) != self._expected_files(plan):
                raise ControlError("install_check_failed")
        except Exception as exc:
            failed = []
            # restore() judges by disk state, so a second try finishes what a lost reply interrupted.
            for change in reversed(swapped):
                for attempt in (1, 2):
                    try:
                        restore(change)
                        break
                    except Exception:
                        logging.exception("Could not restore %s on %s (try %d)", change["old_file"], plan["server"], attempt)
                else:
                    failed.append(change["repo"])
            for temporary in (".control-", ".restore-"):
                try:
                    if inventory.entry(files, "plugins/" + temporary + plan["id"]) is not None:
                        files.trash("plugins/" + temporary + plan["id"])
                except Exception:
                    logging.exception("Could not clear a temporary jar on %s", plan["server"])
            try:
                intact = not swapped or self._files_on_disk(plan["server"]) == self._expected_files({**plan, "changes": []})
            except Exception:
                intact = False
            # A folder proven to match the original is fine, whatever the restore calls answered.
            if not intact:
                raise ControlError("install_rollback_failed") from exc
            raise

    def _files_on_disk(self, server: str) -> dict[str, str]:
        return {jar["file"]: jar["sha256"] for jar in self.snapshot(server)}

    @staticmethod
    def _expected_files(plan: dict) -> dict[str, str]:
        """Each jar file and its SHA-256 once the plan's changes are installed."""
        found = {jar["file"]: jar["sha256"] for jar in plan["baseline"]}
        for change in plan["changes"]:
            found.pop(change["old_file"])
            found[change["asset"]] = change["sha256"]
        return found

    @classmethod
    def _boot(cls, files):
        identity = cls._log_state(files)[1]
        try:
            boot = next((line for line in inventory.log_lines(files, "latest.log") if inventory._BOOT.search(line)), None)
        except OSError:
            raise ControlError("server_files_unavailable", 503) from None
        return identity, boot

    def _startup_ok(self, plan: dict, *, fresh: bool = True) -> bool:
        files = self._files(plan["server"])
        startup = inventory.read_startup(files)
        # Right after a restart the startup must be in latest.log. A later
        # recheck may follow Paper's midnight rotation into an older log.
        if not startup or not startup["done"] or (fresh and startup["log"] != "latest.log"):
            return False
        expected = {jar["name"].lower(): jar["version"] for jar in plan["baseline"]}
        expected.update({change["name"].lower(): change["version"] for change in plan["changes"]})
        changed = {change["name"].lower() for change in plan["changes"]}
        for name, version in expected.items():
            if startup["enabled"].get(name) == version:
                continue
            # An unchanged plugin may retain its explicitly recorded failure;
            # missing, newly failed or upgraded plugins must never pass.
            if (name in changed or plan.get("failed_at_startup", {}).get(name) != version
                    or startup["failed"].get(name) != version):
                return False
        if self._files_on_disk(plan["server"]) != self._expected_files(plan):
            return False
        return {self._error_key(line) for line in self._boot_errors(files, startup["log"])} <= {
            self._error_key(line) for line in plan["boot_errors"]}

    def _reopen(self, plan: dict, job: dict, *, fresh: bool = True):
        if not self._startup_ok(plan, fresh=fresh):
            raise ControlError("startup_check_failed")
        self.console(plan["server"], "list")
        if job.get("maintenance", True):
            self.console(plan["server"], "maintenance off")
            self._wait(lambda: not self._maintenance(plan["server"]), 30, "maintenance_unavailable")
        self.console(plan["server"], "broadcast &aThe restart is complete. The server is open.")
        self._event(job, "complete", error=None)

    def reopen(self, server: str, job_id: str) -> dict:
        with self.lock:
            job = self._job(server, job_id)
            if job["phase"] == "complete":
                return dict(job)
            if job["phase"] not in {"failed", "awaiting_review"}:
                raise ControlError("cannot_reopen")
            if any(other["phase"] in ACTIVE for key, other in self.jobs.items() if key != server):
                raise ControlError("server_job_active")
            plan = self._plan(job_id)
            self._event(job, "reopening")
            try:
                # An operator may have restored the recorded old jars while
                # stopped in AMP. Reopen only after those pass the same checks.
                if not self._startup_ok(plan, fresh=False) and self._startup_ok({**plan, "changes": []}, fresh=False):
                    plan = {**plan, "changes": []}
                    job["rolled_back"] = True
                self._reopen(plan, job, fresh=False)
            except Exception as exc:
                self._event(job, "failed", error=exc.code if isinstance(exc, ControlError) else "server_operation_failed")
                raise
            return dict(job)

    def resolve(self, server: str, job_id: str) -> dict:
        with self.lock:
            job = self._job(server, job_id)
            if job["phase"] == "resolved":
                return dict(job)
            if job["phase"] != "failed":
                raise ControlError("cannot_resolve")
            self._event(job, "resolved")
            return dict(job)

    def servers(self) -> list[dict]:
        """Each server's identity and rules, for the status reply."""
        return [{"key": i.key, "label": i.label, "instance": i.instance, "running": i.running, "policy": asdict(i.policy)}
                for i in self.registry.all().values()]

    def _read(self, found: Instance, fresh: bool) -> dict:
        row = {"key": found.key, "label": found.label, "instance": found.instance, "policy": asdict(found.policy),
               "releases_only": found.policy.releases_only, "state": "off", "error": None, "jars": [], "startup": None}
        if not found.running:
            row["error"] = "instance_off"
            return row
        try:
            status = self._client().call(found.instance, "Core/GetStatus")
            row["state"] = STATES.get((status or {}).get("State"), "unknown")
            files = self._files(found.key)
            cache = None if fresh else self.jar_cache.setdefault(found.key, {})
            row["jars"] = [asdict(j) for j in inventory.read_jars(files, cache)]
            row["startup"] = inventory.read_startup(files)
        except ControlError as exc:
            row["error"] = "files_unavailable" if exc.code in {"server_files_unavailable", "amp_unavailable"} else exc.code
        except Exception:
            logging.exception("Could not read %s", found.instance)
            row["error"] = "files_unavailable"
        return row

    def inventory(self, server: str | None = None) -> dict:
        """Every server's jars and latest startup, read in parallel. One named server is read fresh."""
        found = [self.registry.get(server)] if server is not None else list(self.registry.all().values())
        if not found:
            return {"servers": []}
        with ThreadPoolExecutor(max_workers=min(8, len(found))) as pool:
            rows = list(pool.map(lambda i: self._read(i, fresh=server is not None), found))
        return {"servers": rows}

    def dispatch(self, body: dict) -> dict:
        body = dict(body)
        # Older websites still send their own AMP login; the helper uses its credential.
        body.pop("amp", None)
        operation = body.get("operation")
        allowed = {"status": {"operation"}, "inventory": {"operation"}, "plan": {"operation", "server", "mode", "releases"},
                   "start": {"operation", "server", "plan_id", "actor", "reason", "emergency_override"},
                   "cancel": {"operation", "server", "job_id", "actor", "reason"},
                   "reopen": {"operation", "server", "job_id", "actor", "reason"},
                   "resolve": {"operation", "server", "job_id", "actor", "reason"}}
        # Older websites omit the optional baseline and test-build choices and still send backup_ref.
        optional = ({"replace_test_builds", "backup_ref"} if operation == "start" else {"expected"} if operation == "plan"
                    else {"server"} if operation == "inventory" else set())
        if operation not in allowed or set(body) - optional != allowed[operation]:
            raise ControlError("bad_control_request", 400)
        if operation == "status":
            return {"jobs": json.loads(self.status_json), "servers": self.servers()}
        if operation == "inventory":
            return self.inventory(body.get("server"))
        server = body["server"]
        # Each operation checks the files it needs; resolving a failure needs none.
        self.registry.get(server)
        if operation == "plan":
            expected = body.get("expected")
            if "expected" in body and (not isinstance(expected, list) or len(expected) > 300):
                raise ControlError("bad_control_request", 400)
            return self.plan(server, body["mode"], body["releases"], expected)
        if any(not isinstance(body[key], str) or not 3 <= len(body[key]) <= 500 for key in ("actor", "reason")):
            raise ControlError("bad_control_request", 400)
        if operation == "start":
            replace = body.get("replace_test_builds", [])
            if not isinstance(replace, list) or len(replace) > 100:
                raise ControlError("bad_control_request", 400)
            return self.start(server, body["plan_id"], body["actor"], body["reason"],
                              body["emergency_override"], replace)
        with self.lock:
            job = self._job(server, body["job_id"])
            event = {"at": time.time(), "action": operation, "actor": body["actor"],
                     "reason": body["reason"], "outcome": "requested"}
            job["events"].append(event)
            self._save()
            try:
                if operation == "resolve":
                    result = self.resolve(server, body["job_id"])
                else:
                    result = self.cancel(server, body["job_id"]) if operation == "cancel" else self.reopen(server, body["job_id"])
            except Exception as exc:
                event.update(outcome="failed", error=exc.code if isinstance(exc, ControlError) else "server_operation_failed")
                raise
            else:
                event["outcome"] = "ok"
                return result
            finally:
                self._save()


class Handler(socketserver.StreamRequestHandler):
    def handle(self):
        self.connection.settimeout(180)
        try:
            raw = self.rfile.readline(MAX_MESSAGE + 1)
            if len(raw) > MAX_MESSAGE or not raw.endswith(b"\n"):
                raise ControlError("bad_control_request", 400)
            body = json.loads(raw)
            if not isinstance(body, dict):
                raise ControlError("bad_control_request", 400)
            allowed = self.server.allowed()
            # Inventory is read-only, so every site may read every server.
            if body.get("operation") not in {"status", "inventory"} and body.get("server") not in allowed:
                raise ControlError("server_not_allowed", 403)
            result = self.server.controller.dispatch(body)
            if body.get("operation") == "status":
                result["jobs"] = [job for job in result["jobs"] if job["server"] in allowed]
                result["allowed_servers"] = sorted(allowed)
        except ControlError as exc:
            result = {"error": exc.code, "status": exc.status}
        except Exception:
            logging.exception("Server control request failed")
            result = {"error": "control_failed", "status": 503}
        self.wfile.write(json.dumps(result).encode() + b"\n")


class Server(socketserver.ThreadingUnixStreamServer):
    daemon_threads = True
    # None: every server the registry knows.
    allowed_servers: set[str] | None = {"main", "dev"}

    def allowed(self) -> set[str]:
        if self.allowed_servers is not None:
            return set(self.allowed_servers)
        return set(self.controller.registry.all())


# Which servers each site's socket may control.
SITES = (("www", None), ("dev", {"dev"}))


def socket_group(name: str) -> int | None:
    """The group the website backends run in, checked before any socket is bound."""
    if not name:
        return None
    try:
        return grp.getgrnam(name).gr_gid
    except KeyError:
        raise SystemExit(f"SERVER_CONTROL_SOCKET_GROUP names a group that does not exist: {name}") from None


def share_socket(path: Path, gid: int | None):
    """Owner-only, or also the website backends' group when they are not root."""
    if gid is not None:
        os.chown(path, -1, gid)
        path.chmod(0o660)
    else:
        path.chmod(0o600)


def amp_login(directory: str | None) -> Amp | None:
    """The helper's AMP client from its systemd credential, or None when there is none."""
    path = Path(directory) / "amp-login" if directory else None
    # The unit supplies an empty credential when the login file is missing.
    if path is None or not path.is_file() or not path.stat().st_size:
        logging.warning("No amp-login credential: console input and backups are unavailable.")
        return None
    try:
        login = json.loads(path.read_text())
    except (OSError, ValueError):
        login = None
    if not (isinstance(login, dict) and set(login) == {"username", "password"}
            and all(isinstance(v, str) and 0 < len(v) <= 200 for v in login.values())):
        raise SystemExit("The amp-login credential must be JSON with only a username and a password.")
    return Amp(login["username"], login["password"])


def main():
    os.umask(0o077)
    gid = socket_group(os.getenv("SERVER_CONTROL_SOCKET_GROUP", ""))
    root = Path(os.environ["SERVER_CONTROL_HOME"])
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    # Includes separate invocations and sockets; only one deployment owner.
    with (root / "lock").open("w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        sockets = Path(os.getenv("SERVER_CONTROL_SOCKET_DIR", str(root)))
        amp = amp_login(os.getenv("CREDENTIALS_DIRECTORY"))
        controller = Controller(root / "state", Registry(amp), amp=amp)
        # Fill the jar cache so the first Servers page after a restart is quick.
        threading.Thread(target=controller.inventory, daemon=True).start()
        servers = []
        for site, allowed in SITES:
            run = sockets / site
            run.mkdir(exist_ok=True, mode=0o755)
            path = run / "control.sock"
            path.unlink(missing_ok=True)
            server = Server(str(path), Handler)
            server.controller, server.allowed_servers = controller, allowed
            share_socket(path, gid)
            servers.append(server)
            threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            threading.Event().wait()
        finally:
            for server in servers:
                server.shutdown()
                server.server_close()


if __name__ == "__main__":
    main()
