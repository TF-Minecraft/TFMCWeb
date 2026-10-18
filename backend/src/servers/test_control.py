import hashlib
import json
import threading
import zipfile

import pytest
from fastapi import FastAPI

from src.servers import control, host, inventory
from src.auth import testing
from src.auth.test_admin import account, client, audit_rows, ORIGIN


def jar(path, name="Core", version="1.0.0"):
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("plugin.yml", f"name: {name}\nversion: {version}\n")
    return hashlib.sha256(path.read_bytes()).hexdigest()


def startup(logs, version="1.0.0", error=False):
    (logs / "latest.log").write_text("[06:00:00 INFO]: [bootstrap] Loading Paper 1.21.10\n"
                                    f"[06:00:01 INFO]: [Core] Enabling Core v{version}\n"
                                    + ("[06:00:02 ERROR]: plugin failed\n" if error else "")
                                    + "[06:00:03 INFO]: Done (1.0s)!\n")


class FakeAmp:
    def __init__(self, busy=2, listed=True):
        self.calls, self.busy, self.listed = [], busy, listed
        self.title = None

    def call(self, server, method, **body):
        self.calls.append((server, method, body))
        if method == "LocalFileBackupPlugin/TakeBackup":
            self.title = body["Title"]
            return {"Id": "task-1", "Name": "Creating Backup"}
        if method == "Core/GetTasks":
            self.busy -= 1
            return [{"Id": "task-1"}] if self.busy >= 0 else []
        if method == "LocalFileBackupPlugin/GetBackups":
            return [{"Id": "backup-1", "Name": self.title}] if self.listed else []
        return None


def registry(roots):
    """A fixed registry over local folders; instance names are the keys, so AMP calls name the server."""
    names = {"main": "TFMCMain01", "dev": "TFMCDev01"}
    return host.Registry(None, [host.Instance(key, key.title(), key, host.POLICIES.get(names.get(key), host.Policy()),
                                              True, inventory.LocalFiles(plugins.parent))
                                for key, (plugins, _) in roots.items()])


@pytest.fixture
def controller(tmp_path, monkeypatch):
    monkeypatch.setattr(host, "scheduled_restart", lambda *_: False)
    monkeypatch.setattr(host.Controller, "_schedule", lambda self, server: [])
    roots = {}
    commands = []
    # Lobby has no Maintenance plugin, like the real one.
    for server in ("main", "dev", "lobby"):
        plugins = tmp_path / server / "plugins"
        logs = tmp_path / server / "logs"
        plugins.mkdir(parents=True)
        logs.mkdir()
        if server != "lobby":
            (plugins / "Maintenance").mkdir()
            (plugins / "Maintenance" / "config.yml").write_text("maintenance-enabled: false\n")
        jar(plugins / "core-1.0.0.jar")
        startup(logs)
        roots[server] = plugins, logs

    def console(server, command):
        commands.append((server, command))
        plugins, logs = roots[server]
        if command in {"maintenance on", "maintenance off"}:
            (plugins / "Maintenance" / "config.yml").write_text(f"maintenance-enabled: {str(command.endswith('on')).lower()}\n")
        if command == "save-all flush":
            with (logs / "latest.log").open("a") as handle:
                handle.write("[06:00:04 INFO]: Saved the game\n")
        if command == "stop":
            (logs / "latest.log").rename(logs / "old.log")
            jars = inventory.read_jars(inventory.LocalFiles(plugins.parent))
            startup(logs, jars[0].version)

    instance = host.Controller(tmp_path / "state", registry(roots), console=console, amp=FakeAmp(busy=0))
    instance.roots = roots
    instance.commands = commands
    return instance


def ready_job(controller, plan):
    job = {"id": plan["id"], "server": plan["server"], "phase": "countdown" if plan["server"] == "main" else "installing", "deadline": 0,
           "maintenance_started": False, "error": None, "events": [], "changes": plan["changes"]}
    controller.jobs[plan["server"]] = job
    return job


def test_restart_saves_then_stops_then_verifies_then_reopens(controller):
    public = controller.plan("main", "restart", [])
    plan = controller._plan(public["id"])
    job = ready_job(controller, plan)
    controller.run(plan)
    assert job["phase"] == "complete"
    commands = [c for _, c in controller.commands]
    assert commands.index("maintenance on") < commands.index("save-all flush") < commands.index("stop") < commands.index("maintenance off")
    assert commands.count("stop") == 1
    assert len([c for c in commands if "Finish what you are doing" in c]) == 5
    assert json.loads((controller.state / "jobs.json").read_text())["main"]["phase"] == "complete"


def test_release_install_has_verified_backup_and_one_runtime_jar(controller, tmp_path):
    new = tmp_path / "new.jar"
    sha = jar(new, version="2.0.0")
    controller.fetch = lambda release, target: target.write_bytes(new.read_bytes())
    public = controller.plan("dev", "latest", [{"repo": "Core", "tag": "v2.0.0", "asset": "core-2.0.0.jar", "sha256": sha, "known": [{"sha256": controller.snapshot("dev")[0]["sha256"], "version": "1.0.0"}]}])
    plan = controller._plan(public["id"])
    old = plan["baseline"][0]["sha256"]
    job = ready_job(controller, plan)
    controller.run(plan)
    assert job["phase"] == "complete"
    assert host.digest(controller.state / plan["id"] / "backup" / "core-1.0.0.jar") == old
    assert [p.name for p in controller.roots["dev"][0].glob("*.jar")] == ["core-2.0.0.jar"]


def test_changed_same_size_same_mtime_file_aborts_before_writes(controller):
    public = controller.plan("main", "restart", [])
    plan = controller._plan(public["id"])
    path = controller.roots["main"][0] / "core-1.0.0.jar"
    stamp = path.stat()
    content = path.read_bytes()
    path.write_bytes(content[:-1] + bytes([content[-1] ^ 1]))
    import os
    os.utime(path, ns=(stamp.st_atime_ns, stamp.st_mtime_ns))
    job = ready_job(controller, plan)
    controller.run(plan)
    assert job["phase"] == "failed" and job["error"] == "plugins_changed"
    assert not job["maintenance_started"]
    assert not any(command in {"stop", "maintenance on"} for _, command in controller.commands)


def test_countdown_cancel_and_duplicate_start_are_safe(controller, monkeypatch):
    class NoWorker:
        def __init__(self, **_): pass
        def start(self): pass
    monkeypatch.setattr(host.threading, "Thread", NoWorker)
    plan = controller.plan("main", "restart", [])
    first = controller.start("main", plan["id"], "site-user:1", "test restart")
    assert controller.start("main", plan["id"], "site-user:1", "test restart")["id"] == first["id"]
    with pytest.raises(control.ControlError, match="server_job_active"):
        controller.plan("dev", "restart", [])
    assert controller.cancel("main", first["id"])["phase"] == "cancelled"
    controller.run(controller._plan(plan["id"]))
    assert not any(c == "stop" for _, c in controller.commands)


def test_crash_is_not_replayed_and_checks_block_reopen(controller):
    plan = controller.plan("main", "restart", [])
    job = ready_job(controller, controller._plan(plan["id"]))
    job.update(phase="checking", maintenance_started=True)
    controller._save()
    recovered = host.Controller(controller.state, controller.registry, console=controller.console)
    assert recovered.jobs["main"]["error"] == "helper_interrupted"
    startup(controller.roots["main"][1], error=True)
    with pytest.raises(control.ControlError, match="startup_check_failed"):
        recovered.reopen("main", job["id"])
    assert not any(c == "maintenance off" for _, c in controller.commands)


def test_release_checksum_and_identity_and_path_rejected(controller, tmp_path):
    new = tmp_path / "new.jar"
    sha = jar(new, name="Different", version="2.0.0")
    controller.fetch = lambda release, target: target.write_bytes(new.read_bytes())
    release = {"repo": "Core", "tag": "v2.0.0", "asset": "core-2.0.0.jar", "sha256": sha, "known": [{"sha256": controller.snapshot("dev")[0]["sha256"], "version": "1.0.0"}]}
    with pytest.raises(control.ControlError, match="release_identity_failed"):
        controller.plan("dev", "latest", [release])
    with pytest.raises(control.ControlError, match="release_identity_failed"):
        controller.plan("dev", "latest", [{**release, "sha256": "0" * 64}])
    with pytest.raises(control.ControlError, match="bad_release"):
        controller.plan("dev", "latest", [{**release, "asset": "../evil.jar"}])
    with pytest.raises(control.ControlError, match="bad_control_request"):
        controller.dispatch({"operation": "console", "server": "main", "command": "stop"})


def test_pending_update_refused(controller, tmp_path):
    plugins, _ = controller.roots["dev"]
    (plugins / "update").mkdir()
    jar(plugins / "update" / "core-2.0.0.jar", version="2.0.0")
    with pytest.raises(control.ControlError, match="pending_plugin_update"):
        controller.plan("dev", "restart", [])


def test_socket_transport_and_invalid_message(tmp_path, monkeypatch):
    class Fake:
        def dispatch(self, body):
            assert body == {"operation": "status"}
            return {"jobs": []}
    path = tmp_path / "control.sock"
    with host.Server(str(path), host.Handler) as server:
        server.controller = Fake()
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        monkeypatch.setenv("SERVER_CONTROL_SOCKET", str(path))
        assert control.status() == {"status": "available", "jobs": [], "allowed_servers": ["dev", "main"]}
        server.shutdown()
        worker.join()


@pytest.fixture
def app(database, postgres, monkeypatch):
    from src.api import admin_routes, auth_routes
    monkeypatch.setenv("DISCORD_AUTH_ENABLED", "1")
    monkeypatch.setenv("DISCORD_CLIENT_ID", "client-id")
    monkeypatch.setenv("DISCORD_CLIENT_SECRET", "client-secret")
    monkeypatch.setenv("DISCORD_GUILD_ID", "999999999999999999")
    monkeypatch.setenv("SITE_PUBLIC_URL", "https://www.tfminecraft.net")
    monkeypatch.delenv("PS_PRODUCTION", raising=False)
    app = FastAPI()
    app.include_router(auth_routes.auth_router)
    admin_routes.install(app)
    return app


def test_write_requires_admin_session_origin_reason_and_logs_actor(app, database, monkeypatch):
    calls = []
    monkeypatch.setattr(control, "request", lambda op, **body: calls.append((op, body)) or {"id": body["plan_id"]})
    _, mod = account(database, "mod", "mod")
    user_id, admin = account(database, "admin", "admin")
    _, root = account(database, "owner", "root")
    body = {"id": "a" * 32, "reason": "scheduled restart"}
    url = "/admin/servers/main/start"
    assert client(app).post(url, json=body, headers=ORIGIN).status_code == 401
    assert client(app, mod).post(url, json=body, headers=ORIGIN).status_code == 403
    assert client(app, admin).post(url, json=body).status_code == 403
    assert client(app, admin).post(url, json={**body, "reason": "x"}, headers=ORIGIN).status_code == 400
    assert not calls
    result = client(app, admin).post(url, json=body, headers=ORIGIN)
    assert result.status_code == 200 and result.headers["cache-control"] == "no-store"
    assert calls[0][1]["actor"] == f"www.tfminecraft.net:user:{user_id}"
    assert client(app, root).post(url, json=body, headers=ORIGIN).status_code == 200
    assert [r["outcome"] for r in audit_rows(database)][-4:] == ["requested", "ok", "requested", "ok"]


def test_demoted_or_revoked_session_cannot_reach_helper(app, database, monkeypatch):
    monkeypatch.setattr(control, "request", lambda *_args, **_kwargs: pytest.fail("helper called"))
    user_id, token = account(database, "demoted", "admin")
    testing.execute("UPDATE users SET role='mod' WHERE id=%s", (user_id,))
    body = {"id": "b" * 32, "reason": "testing role"}
    assert client(app, token).post("/admin/servers/dev/cancel", json=body, headers=ORIGIN).status_code == 403
    testing.execute("DELETE FROM user_sessions WHERE user_id=%s", (user_id,))
    assert client(app, token).post("/admin/servers/dev/cancel", json=body, headers=ORIGIN).status_code == 401


def release_for(controller, sha, version="2.0.0", server="dev"):
    return {"repo": "Core", "tag": "v" + version, "asset": "core-" + version + ".jar", "sha256": sha,
            "known": [{"sha256": controller.snapshot(server)[0]["sha256"], "version": "1.0.0"}]}


def test_backport_is_skipped(controller):
    backport = release_for(controller, "0" * 64, version="0.9.0")
    plan = controller.plan("dev", "latest", [backport])
    assert plan["changes"] == [] and plan["skipped"][0]["reason"] == "not_a_newer_version"


def test_main_requires_dev_evidence_and_feature_review(controller, tmp_path, monkeypatch):
    new = tmp_path / "new.jar"
    sha = jar(new, version="2.0.0")
    release = release_for(controller, sha, server="main")
    plan = controller.plan("main", "latest", [release])
    assert plan["skipped"][0]["reason"] == "not_verified_on_dev"
    monkeypatch.setattr(controller, "_dev_verified", lambda *_: True)
    controller.fetch = lambda release, target: target.write_bytes(new.read_bytes())
    plan = controller.plan("main", "latest", [release])
    job = ready_job(controller, controller._plan(plan["id"]))
    controller.run(controller._plan(plan["id"]))
    assert job["phase"] == "awaiting_review"
    assert not any(c == "maintenance off" for _, c in controller.commands)
    assert controller.reopen("main", job["id"])["phase"] == "complete"


def test_known_boot_errors_allow_restart_new_errors_block(controller):
    logs = controller.roots["dev"][1]
    startup(logs, error=True)
    plan = controller.plan("dev", "restart", [])
    assert controller._startup_ok(controller._plan(plan["id"]))
    with (logs / "latest.log").open("r+") as f:
        text = f.read().replace("[06:00:03 INFO]: Done", "[06:00:02 ERROR]: new problem\n[06:00:03 INFO]: Done")
        f.seek(0)
        f.write(text)
        f.truncate()
    assert not controller._startup_ok(controller._plan(plan["id"]))


def test_partial_install_restores_every_old_file(controller, tmp_path, monkeypatch):
    import shutil
    plugins, _ = controller.roots["dev"]
    old_sha = jar(plugins / "other-1.0.0.jar", name="Other")
    new_core, new_other = tmp_path / "new-core.jar", tmp_path / "new-other.jar"
    sha = jar(new_core, version="2.0.0")
    other_sha = jar(new_other, name="Other", version="2.0.0")
    releases = [release_for(controller, sha), {"repo": "Other", "tag": "v2.0.0", "asset": "other-2.0.0.jar", "sha256": other_sha,
                "known": [{"sha256": old_sha, "version": "1.0.0"}]}]
    controller.fetch = lambda r, p: p.write_bytes((new_core if r["repo"] == "Core" else new_other).read_bytes())
    public = controller.plan("dev", "latest", releases)
    plan = controller._plan(public["id"])
    original = inventory.LocalFiles.write
    def write(self, name, data):
        # AMP stores a different file than was sent for the second jar.
        corrupt = name.startswith("plugins/.control-") and data == new_other.read_bytes()
        return original(self, name, b"corrupted" if corrupt else data)
    monkeypatch.setattr(inventory.LocalFiles, "write", write)
    with pytest.raises(control.ControlError, match="release_checksum_failed"):
        controller._install(plan)
    assert controller.snapshot("dev") == plan["baseline"]
    assert not list(plugins.glob(".control-*")) and not list(plugins.glob(".restore-*"))


def test_resolve_does_not_issue_commands_and_other_server_remains_usable(controller):
    public = controller.plan("dev", "restart", [])
    job = ready_job(controller, controller._plan(public["id"]))
    job.update(phase="failed", maintenance_started=True)
    controller._save()
    controller.plan("main", "restart", [])
    commands = list(controller.commands)
    assert controller.resolve("dev", job["id"])["phase"] == "resolved"
    assert controller.commands == commands


def trigger(hours, minutes, **match):
    return {"MatchMonths": list(range(12)), "MatchDays": list(range(7)), "MatchDaysOfMonth": [],
            "MatchHours": hours, "MatchMinutes": minutes, **match}


def test_scheduler_blackouts_cross_midnight_and_cover_restart_window():
    from datetime import datetime, timezone
    def stamp(value): return datetime.fromisoformat(value).replace(tzinfo=timezone.utc).timestamp()
    # Main's AMP schedule: warnings at 05:30 and 05:55, stop 06:00, backup 06:02, start 06:10.
    main = [trigger([5], [30]), trigger([5], [55]), trigger([6], [0]), trigger([6], [2]), trigger([6], [10])]
    assert host.scheduled_restart(main, stamp("2026-10-12T05:10:00"), 20)
    assert host.scheduled_restart(main, stamp("2026-10-12T06:15:00"), 20)
    assert not host.scheduled_restart(main, stamp("2026-10-12T04:30:00"), 20)
    assert not host.scheduled_restart(main, stamp("2026-10-12T08:00:00"), 20)
    dev = [trigger([0, 6, 12, 18], [0])]
    assert host.scheduled_restart(dev, stamp("2026-10-12T23:40:00"), 15)
    assert host.scheduled_restart(dev, stamp("2026-10-12T00:10:00"), 15)
    assert not host.scheduled_restart(dev, stamp("2026-10-12T01:00:00"), 15)
    assert not host.scheduled_restart([], stamp("2026-10-12T06:00:00"), 15)


def test_scheduler_matches_amp_weekdays_and_months():
    from datetime import datetime, timezone
    # 2026-10-12 is a Monday; AMP counts days from Sunday = 0 and months from January = 0.
    monday = datetime(2026, 10, 12, 12, tzinfo=timezone.utc).timestamp()
    assert host.scheduled_restart([trigger([12], [0], MatchDays=[1])], monday, 15)
    assert not host.scheduled_restart([trigger([12], [0], MatchDays=[2])], monday, 15)
    assert host.scheduled_restart([trigger([12], [0], MatchMonths=[9])], monday, 15)
    assert not host.scheduled_restart([trigger([12], [0], MatchMonths=[10])], monday, 15)


def test_schedule_reads_enabled_amp_time_triggers_only(controller, monkeypatch):
    monkeypatch.undo()
    calls = []
    class Schedule(FakeAmp):
        def call(self, server, method, **body):
            calls.append(method)
            if method == "Core/GetScheduleData":
                return {"PopulatedTriggers": [
                    {"Id": "on", "Type": "TimeIntervalTrigger", "EnabledState": 1, "Tasks": [{"EnabledState": 1}]},
                    {"Id": "off", "Type": "TimeIntervalTrigger", "EnabledState": 0, "Tasks": [{"EnabledState": 1}]},
                    {"Id": "idle", "Type": "TimeIntervalTrigger", "EnabledState": 1, "Tasks": [{"EnabledState": 0}]},
                    {"Id": "boot", "Type": "EventTrigger", "EnabledState": 1, "Tasks": [{"EnabledState": 1}]}]}
            if method == "Core/GetTimeIntervalTrigger":
                assert body == {"Id": "on"}
                return trigger([6], [0])
            return super().call(server, method, **body)
    controller.amp = Schedule()
    assert controller._schedule("dev") == [trigger([6], [0])]
    assert controller._schedule("dev") == [trigger([6], [0])]
    assert calls.count("Core/GetScheduleData") == 1


def test_dev_socket_cannot_control_main(tmp_path, monkeypatch):
    class Fake:
        def dispatch(self, body): pytest.fail("Main control reached")
    path = tmp_path / "dev.sock"
    with host.Server(str(path), host.Handler) as server:
        server.allowed_servers = {"dev"}
        server.controller = Fake()
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        monkeypatch.setenv("SERVER_CONTROL_SOCKET", str(path))
        with pytest.raises(control.ControlError, match="server_not_allowed"):
            control.request("plan", server="main", mode="restart", releases=[])
        server.shutdown()
        worker.join()


def test_cancelling_failed_dev_job_does_not_cancel_active_main(controller):
    dev = controller.plan("dev", "restart", [])
    dev_job = ready_job(controller, controller._plan(dev["id"]))
    dev_job.update(phase="failed", deadline=1)
    main = controller.plan("main", "restart", [])
    ready_job(controller, controller._plan(main["id"]))
    assert not controller.cancelled.is_set()
    controller.cancel("dev", dev_job["id"])
    assert not controller.cancelled.is_set()


def test_accepted_journal_recovers_missing_index_and_is_not_replayed(controller):
    public = controller.plan("dev", "restart", [])
    job = ready_job(controller, controller._plan(public["id"]))
    job["deadline"] = 10
    host.save_json(controller.state / job["id"] / "job.json", job)
    recovered = host.Controller(controller.state, controller.registry, console=controller.console)
    assert recovered.jobs["dev"]["id"] == job["id"]
    assert recovered.jobs["dev"]["phase"] == "failed"
    assert recovered.start("dev", job["id"], "www:user:1", "retry after disconnect")["phase"] == "failed"
    assert not any(c == "stop" for _, c in controller.commands)


@pytest.mark.parametrize("server,override", [("dev", False), ("main", True)])
@pytest.mark.parametrize("mode", ["restart", "latest"])
def test_instant_restarts_skip_warnings_but_save_verify_and_stop(controller, monkeypatch, tmp_path, server, override, mode):
    monkeypatch.setattr(host.threading.Thread, "start", lambda _: None)
    releases = []
    if mode == "latest":
        path = tmp_path / "new-instant.jar"
        sha = jar(path, version="2.0.0")
        releases = [release_for(controller, sha, server=server)]
        controller.fetch = lambda release, target: target.write_bytes(path.read_bytes())
        monkeypatch.setattr(controller, "_dev_verified", lambda *_: True)
    public = controller.plan(server, mode, releases)
    result = controller.start(server, public["id"], "www:user:1", "emergency fix" if override else "Dev test", override)
    assert result["phase"] == "installing"
    assert result["deadline"] == result["accepted_at"]
    assert result["emergency_override"] is override
    with pytest.raises(control.ControlError, match="cannot_cancel"):
        controller.cancel(server, public["id"])
    monkeypatch.setattr(controller.cancelled, "wait", lambda delay: pytest.fail("countdown delay") if delay > 0 else False)
    controller.run(controller._plan(public["id"]))
    commands = [c for _, c in controller.commands]
    assert not any("Finish what you are doing" in c for c in commands)
    assert commands.index("maintenance on") < commands.index("save-all flush") < commands.index("stop")
    assert controller.jobs[server]["phase"] == ("awaiting_review" if server == "main" and mode == "latest" else "complete")


def test_main_default_still_has_five_minute_countdown(controller, monkeypatch):
    monkeypatch.setattr(host.threading.Thread, "start", lambda _: None)
    plan = controller.plan("main", "restart", [])
    result = controller.start("main", plan["id"], "www:user:1", "planned restart")
    assert result["phase"] == "countdown" and result["emergency_override"] is False
    assert result["deadline"] - result["accepted_at"] == 300


def test_emergency_override_needs_a_countdown_to_skip(controller, monkeypatch):
    monkeypatch.setattr(host.threading.Thread, "start", lambda _: None)
    dev = controller.plan("dev", "restart", [])
    with pytest.raises(control.ControlError, match="bad_server_action"):
        controller.start("dev", dev["id"], "www:user:1", "Dev test", emergency_override=True)


def test_emergency_flag_is_strict_audited_and_forwarded(app, database, monkeypatch):
    calls=[]
    monkeypatch.setattr(control, "request", lambda op, **body: calls.append(body) or {"id": body["plan_id"]})
    _, admin = account(database, "instant-admin", "admin")
    body = {"id": "c"*32, "reason": "emergency plugin fix", "emergency_override": True}
    assert client(app, admin).post("/admin/servers/main/start", json=body, headers=ORIGIN).status_code == 200
    assert calls[-1]["emergency_override"] is True and calls[-1]["backup_ref"] == ""
    assert audit_rows(database)[-1]["detail"]["emergency_override"] is True
    assert client(app, admin).post("/admin/servers/main/start", json={**body,"emergency_override":"false"}, headers=ORIGIN).status_code == 422
    assert client(app, admin).post("/admin/servers/main/cancel", json=body, headers=ORIGIN).status_code == 400
    # Which servers have a countdown to skip is the helper's call (test_emergency_override_needs_a_countdown_to_skip).
    assert client(app, admin).post("/admin/servers/lobby/start", json=body, headers=ORIGIN).status_code == 200
    assert calls[-1]["emergency_override"] is True
    assert len(calls) == 2


def test_recovery_orders_instant_jobs_by_acceptance_not_deadline(controller):
    legacy = controller.plan("dev", "restart", [])
    old = ready_job(controller, controller._plan(legacy["id"]))
    old.update(phase="complete", deadline=600)  # legacy acceptance was 300
    controller._save()
    instant = controller.plan("dev", "restart", [])
    new = ready_job(controller, controller._plan(instant["id"]))
    new.update(accepted_at=400, deadline=400)
    controller._save()
    recovered = host.Controller(controller.state, controller.registry, console=controller.console)
    assert recovered.jobs["dev"]["id"] == new["id"]
    assert recovered.jobs["dev"]["phase"] == "failed"


@pytest.mark.parametrize("zone,written,boot,after", [
    ("Etc/UTC", "2026-10-13T00:02:00+00:00", "23:59:00", "2026-10-13T00:01:00+00:00"),
    ("America/New_York", "2026-10-13T04:02:00+00:00", "23:59:00", "2026-10-13T04:01:00+00:00"),
])
def test_dev_bytes_replaced_after_midnight_boot_are_not_verified(controller, monkeypatch, zone, written, boot, after):
    import os
    from datetime import datetime
    from types import SimpleNamespace
    monkeypatch.setenv("SERVER_CONTROL_LOG_TIMEZONE", zone)
    plugins, logs = controller.roots["dev"]
    log = logs / "latest.log"
    log.write_text(f"[{boot}] [ServerMain/INFO]: [bootstrap] Loading Paper 1.21.10\n"
                   "[00:00:00] [Server thread/INFO]: [Core] Enabling Core v1.0.0\n"
                   "[00:00:01] [Server thread/INFO]: Done (1s)!\n")
    stamp = datetime.fromisoformat(written).timestamp()
    os.utime(log, (stamp, stamp))
    jar_path = plugins / "core-1.0.0.jar"
    jar_time = datetime.fromisoformat(after).timestamp()
    original = inventory.LocalFiles.listing
    def listing(self, folder):
        found = original(self, folder)
        return [{**e, "Modified": jar_time, "Created": jar_time} if e["Filename"] == jar_path.name else e for e in found or []]
    monkeypatch.setattr(inventory.LocalFiles, "listing", listing)
    monkeypatch.setattr(controller, "snapshot", lambda *_: [{"file": jar_path.name, "name": "Core", "version": "1.0.0", "sha256": "known"}])
    assert not controller._dev_verified({"sha256": "known"})
    jar_time = datetime.fromisoformat(after).timestamp() - 180
    assert controller._dev_verified({"sha256": "known"})


def test_known_error_repetition_and_thread_numbers_do_not_block_reopen(controller):
    logs = controller.roots['main'][1]
    def write_errors(count, thread, extra=''):
        startup(logs)
        path = logs / 'latest.log'
        errors = '[06:00:02] [Server thread/ERROR]: [MythicMobs] [SCHEDULER] Exception thrown whilst executing task\n' * count
        errors += f'[06:00:02] [Craft Scheduler Thread - {thread}/ERROR]: [MCPets] Known failure\n'
        path.write_text(path.read_text().replace('[06:00:03 INFO]: Done', errors + extra + '[06:00:03 INFO]: Done'))
    write_errors(2, 19)
    public = controller.plan('main', 'restart', [])
    plan = controller._plan(public['id'])
    job = ready_job(controller, plan)
    job.update(phase='failed', maintenance_started=True)
    controller.console('main', 'maintenance on')
    write_errors(3, 27)
    assert controller.reopen('main', job['id'])['phase'] == 'complete'
    write_errors(3, 27, '[06:00:02] [Server thread/ERROR]: [Core] New failure\n')
    assert not controller._startup_ok(plan)


@pytest.mark.parametrize('server,override', [('main', False), ('main', True), ('dev', False)])
def test_staged_main_activation_waits_for_review(controller, server, override):
    plugins, _ = controller.roots[server]
    jar(plugins / 'core-1.0.0.jar', version='2.0.0')
    public = controller.plan(server, 'restart', [])
    assert public['changes'] == []
    assert public['activation'] == [{'name': 'Core', 'loaded': '1.0.0', 'version': '2.0.0'}]
    plan = controller._plan(public['id'])
    job = ready_job(controller, plan)
    if override:
        job.update(phase='installing', emergency_override=True)
    controller.run(plan)
    assert job['phase'] == ('awaiting_review' if server == 'main' else 'complete')
    if server == 'main':
        assert not any(c == 'maintenance off' for _, c in controller.commands)
        assert controller.reopen(server, job['id'])['phase'] == 'complete'


def test_known_failed_enable_does_not_prove_dev_release_but_allows_unchanged_restart(controller):
    import os
    from datetime import datetime, timezone
    plugins, logs = controller.roots['dev']
    boot = datetime.fromtimestamp(host.time.time() + 60, timezone.utc).strftime('%H:%M:%S')
    text = (f'[{boot}] [ServerMain/INFO]: [bootstrap] Loading Paper 1.21.10\n'
            f'[{boot}] [Server thread/INFO]: [Core] Enabling Core v1.0.0\n'
            f'[{boot}] [Server thread/INFO]: Done (1s)!\n')
    path = logs / 'latest.log'
    stamp = host.time.time() + 120
    path.write_text(text)
    os.utime(path, (stamp, stamp))
    release = {'sha256': host.digest(plugins / 'core-1.0.0.jar')}
    assert controller._dev_verified(release)
    failed = f'[{boot}] [Server thread/ERROR]: Error occurred while enabling Core v1.0.0 (Is it up to date?)\n'
    path.write_text(text.replace(f'[{boot}] [Server thread/INFO]: Done', failed + f'[{boot}] [Server thread/INFO]: Done'))
    os.utime(path, (stamp, stamp))
    assert not controller._dev_verified(release)
    public = controller.plan('dev', 'restart', [])
    assert not public['activation']
    assert controller._startup_ok(controller._plan(public['id']))


def test_refused_job_action_records_failure_outcome(controller):
    public = controller.plan('dev', 'restart', [])
    job = ready_job(controller, controller._plan(public['id']))
    body = {'operation': 'cancel', 'server': 'dev', 'job_id': job['id'], 'actor': 'www:user:1', 'reason': 'stop this restart'}
    with pytest.raises(control.ControlError, match='cannot_cancel'):
        controller.dispatch(body)
    event = [e for e in json.loads((controller.state / job['id'] / 'job.json').read_text())['events'] if 'action' in e][-1]
    assert event['action'] == 'cancel' and event['outcome'] == 'failed' and event['error'] == 'cannot_cancel'
    job['phase'] = 'failed'
    controller.dispatch({**body, 'operation': 'resolve'})
    event = [e for e in json.loads((controller.state / job['id'] / 'job.json').read_text())['events'] if 'action' in e][-1]
    assert event['action'] == 'resolve' and event['outcome'] == 'ok'


@pytest.mark.parametrize('upgrade', [False, True])
def test_unchanged_known_plugin_failure_can_restart_but_upgrade_failure_cannot(controller, tmp_path, upgrade):
    logs = controller.roots['dev'][1]
    def fail_enable(version):
        path = logs / 'latest.log'
        line = f'[06:00:02 ERROR]: Error occurred while enabling Core v{version} (Is it up to date?)\n'
        path.write_text(path.read_text().replace('[06:00:03 INFO]: Done', line + '[06:00:03 INFO]: Done'))
    fail_enable('1.0.0')
    releases = []
    if upgrade:
        new = tmp_path / 'new.jar'
        sha = jar(new, version='2.0.0')
        controller.fetch = lambda release, target: target.write_bytes(new.read_bytes())
        releases = [release_for(controller, sha)]
    public = controller.plan('dev', 'latest' if upgrade else 'restart', releases)
    plan = controller._plan(public['id'])
    original_console = controller.console
    def console(server, command):
        original_console(server, command)
        if command == 'stop':
            fail_enable('2.0.0' if upgrade else '1.0.0')
    controller.console = console
    def immediate_check(predicate, timeout, code):
        if not predicate():
            raise control.ControlError(code)
    controller._wait = immediate_check
    job = ready_job(controller, plan)
    controller.run(plan)
    assert job['phase'] == ('failed' if upgrade else 'complete')
    assert controller._maintenance('dev') is upgrade


def test_newly_staged_plugin_without_a_prior_failure_still_requires_activation(controller):
    plugins, _ = controller.roots['main']
    jar(plugins / 'other-1.0.0.jar', name='Other')
    public = controller.plan('main', 'restart', [])
    assert public['activation'] == [{'name': 'Other', 'loaded': None, 'version': '1.0.0'}]
    assert not controller._startup_ok(controller._plan(public['id']))


@pytest.mark.parametrize('first,second', [
    ('Worker-Main-12', 'Worker-Main-15'), ('pool-3-thread-1', 'pool-5-thread-9'),
    ('ForkJoinPool.commonPool-worker-5', 'ForkJoinPool.commonPool-worker-9'),
    ('Netty Epoll #3', 'Netty Epoll #4'), ('Timer-0', 'Timer-2'),
])
def test_worker_identity_changes_do_not_mask_error_message_changes(first, second):
    key = host.Controller._error_key
    before = f'[TIME] [{first}/ERROR]: failure code 23'
    after = f'[TIME] [{second}/ERROR]: failure code 23'
    assert key(before) == key(after)
    assert key(before) != key(after.replace('code 23', 'code 24'))


def test_test_builds_are_replaced_only_when_chosen(controller, tmp_path, monkeypatch):
    monkeypatch.setattr(host.threading.Thread, "start", lambda _: None)
    plugins, _ = controller.roots["dev"]
    (plugins / "core-1.0.0.jar").unlink()
    jar(plugins / "core-stage4-abc.jar", version="3.0.0")
    new = tmp_path / "new.jar"
    release = {**release_for(controller, jar(new, version="2.0.0")), "known": []}
    controller.fetch = lambda release, target: target.write_bytes(new.read_bytes())
    plan = controller.plan("dev", "latest", [release])
    assert plan["skipped"] == []
    assert [(c["repo"], c["old_version"], c["test_build"], c["newer_test"]) for c in plan["changes"]] == [("Core", "3.0.0", True, True)]
    with pytest.raises(control.ControlError, match="bad_server_action"):
        controller.start("dev", plan["id"], "www:user:1", "Dev test", replace_test_builds=["Other"])
    kept = controller.start("dev", plan["id"], "www:user:1", "Dev test")
    assert kept["changes"] == []
    stored = controller._plan(plan["id"])
    assert stored["changes"] == [] and stored["skipped"] == [{"repo": "Core", "reason": "test_build_kept"}]

    controller.jobs.clear()
    plan = controller.plan("dev", "latest", [release])
    chosen = controller.start("dev", plan["id"], "www:user:1", "Dev test", replace_test_builds=["Core"])
    assert [c["repo"] for c in chosen["changes"]] == ["Core"]
    controller.run(controller._plan(plan["id"]))
    assert controller.jobs["dev"]["phase"] == "complete"
    assert [j["file"] for j in controller.snapshot("dev")] == ["core-2.0.0.jar"]


def test_main_test_build_still_needs_dev_evidence(controller, tmp_path):
    plugins, _ = controller.roots["main"]
    (plugins / "core-1.0.0.jar").unlink()
    jar(plugins / "core-1.0.0-SNAPSHOT.jar", version="1.0.0-SNAPSHOT")
    release = {**release_for(controller, "0" * 64, server="main"), "known": []}
    plan = controller.plan("main", "latest", [release])
    assert plan["changes"] == [] and plan["skipped"][0]["reason"] == "not_verified_on_dev"


def test_test_build_choice_is_start_only_and_forwarded(app, database, monkeypatch):
    calls = []
    monkeypatch.setattr(control, "request", lambda op, **body: calls.append(body) or {"id": body.get("plan_id")})
    _, admin = account(database, "test-build-admin", "admin")
    body = {"id": "d" * 32, "reason": "replace test builds", "replace_test_builds": ["Core"]}
    assert client(app, admin).post("/admin/servers/dev/start", json=body, headers=ORIGIN).status_code == 200
    assert calls[-1]["replace_test_builds"] == ["Core"]
    assert audit_rows(database)[-1]["detail"]["replace_test_builds"] == ["Core"]
    assert client(app, admin).post("/admin/servers/dev/start", json={**body, "replace_test_builds": []}, headers=ORIGIN).status_code == 200
    assert "replace_test_builds" not in calls[-1]
    assert client(app, admin).post("/admin/servers/dev/cancel", json=body, headers=ORIGIN).status_code == 400
    assert len(calls) == 2


def test_socket_test_build_list_is_optional_and_checked(controller, monkeypatch):
    monkeypatch.setattr(host.threading.Thread, "start", lambda _: None)
    plan = controller.plan("dev", "restart", [])
    body = {"operation": "start", "server": "dev", "plan_id": plan["id"], "actor": "www:user:1", "reason": "Dev test",
            "emergency_override": False}
    with pytest.raises(control.ControlError, match="bad_control_request"):
        controller.dispatch({**body, "replace_test_builds": "Core"})
    with pytest.raises(control.ControlError, match="bad_control_request"):
        controller.dispatch({**body, "operation": "cancel", "job_id": plan["id"], "replace_test_builds": []})
    assert controller.dispatch(body)["phase"] == "installing"


def test_socket_still_accepts_backup_ref_from_older_websites(controller, monkeypatch):
    monkeypatch.setattr(host.threading.Thread, "start", lambda _: None)
    plan = controller.plan("main", "restart", [])
    body = {"operation": "start", "server": "main", "plan_id": plan["id"], "actor": "www:user:1",
            "reason": "planned restart", "backup_ref": "AMP 16 Oct", "emergency_override": False}
    assert controller.dispatch(body)["phase"] == "countdown"


def amp_controller(controller, amp):
    instance = host.Controller(controller.state, controller.registry, console=controller.console, amp=amp)
    instance.commands = controller.commands
    return instance


def test_main_countdown_takes_an_amp_backup_and_waits_for_it(controller, monkeypatch):
    monkeypatch.setattr(host.threading.Thread, "start", lambda _: None)
    amp = FakeAmp()
    controller = amp_controller(controller, amp)
    public = controller.plan("main", "restart", [])
    assert public["backup"] is True
    job = controller.start("main", public["id"], "www:user:1", "planned restart")
    assert job["backup"] == {"title": f"Before restart {public['id'][:8]}", "task": "task-1", "state": "running"}
    taken = [body for _, method, body in amp.calls if method == "LocalFileBackupPlugin/TakeBackup"]
    assert taken[0]["Description"] == "www:user:1: planned restart" and taken[0]["Sticky"] is False
    monkeypatch.setattr(controller.cancelled, "wait", lambda delay: False)
    controller.run(controller._plan(public["id"]), controller.jobs["main"])
    job = controller.jobs["main"]
    assert job["phase"] == "complete"
    assert job["backup"]["state"] == "done" and job["backup"]["id"] == "backup-1"
    commands = [c for _, c in controller.commands]
    assert commands.index("broadcast &7Finishing a backup before the restart.") < commands.index("maintenance on")


def test_failed_amp_backup_cancels_before_maintenance(controller, monkeypatch):
    monkeypatch.setattr(host.threading.Thread, "start", lambda _: None)
    controller = amp_controller(controller, FakeAmp(busy=0, listed=False))
    public = controller.plan("main", "restart", [])
    controller.start("main", public["id"], "www:user:1", "planned restart")
    monkeypatch.setattr(controller.cancelled, "wait", lambda delay: False)
    controller.run(controller._plan(public["id"]), controller.jobs["main"])
    job = controller.jobs["main"]
    assert job["phase"] == "failed" and job["error"] == "amp_backup_failed"
    commands = [c for _, c in controller.commands]
    assert "maintenance on" not in commands and commands[-1] == "broadcast &eThe server restart has been cancelled."


def test_emergency_and_dev_restarts_take_no_amp_backup(controller, monkeypatch):
    monkeypatch.setattr(host.threading.Thread, "start", lambda _: None)
    amp = FakeAmp()
    controller = amp_controller(controller, amp)
    assert controller.plan("dev", "restart", [])["backup"] is False
    public = controller.plan("main", "restart", [])
    assert controller.start("main", public["id"], "www:user:1", "emergency fix", emergency_override=True)["backup"] is None
    assert not any(method == "LocalFileBackupPlugin/TakeBackup" for _, method, _ in amp.calls)


LOGIN = {"username": "TFWeb", "password": "secret-pass"}


def test_console_uses_the_helpers_own_login_and_ignores_a_sent_one(controller, monkeypatch):
    sent = []
    monkeypatch.setattr(host.Amp, "call", lambda self, server, method, **body: sent.append((self.password, server, method, body)))
    instance = host.Controller(controller.state, controller.registry, amp=host.Amp(**LOGIN))
    # Older websites still send their login; the helper drops it, status included.
    plan = instance.dispatch({"operation": "plan", "server": "main", "mode": "restart", "releases": [],
                              "amp": {"username": "TFWeb", "password": "old"}})
    assert plan["backup"] is True
    assert sent == [("secret-pass", "main", "Core/SendConsoleMessage", {"message": "list"}),
                    ("secret-pass", "main", "LocalFileBackupPlugin/GetBackups", {})]
    assert instance.dispatch({"operation": "status", "amp": LOGIN})["jobs"] == []


def test_without_a_login_console_and_backups_fail(controller, monkeypatch):
    monkeypatch.setattr(host.threading.Thread, "start", lambda _: None)
    instance = host.Controller(controller.state, controller.registry)
    assert not hasattr(host, "subprocess")  # no sudo fallback
    assert instance.dispatch({"operation": "status"})["jobs"] == []
    with pytest.raises(control.ControlError, match="amp_not_configured") as error:
        instance.dispatch({"operation": "plan", "server": "dev", "mode": "restart", "releases": []})
    assert error.value.status == 503
    # With console input but no AMP login, Main's countdown cannot take its backup.
    instance = host.Controller(controller.state, controller.registry, console=controller.console)
    plan = instance.plan("main", "restart", [])
    with pytest.raises(control.ControlError, match="amp_not_configured"):
        instance.start("main", plan["id"], "www:user:1", "planned restart")
    assert "main" not in instance.jobs
    with pytest.raises(control.ControlError, match="amp_not_configured"):
        instance._await_backup("main", {"backup": {"title": "Before restart", "task": "task-1"}})


def test_the_credential_gives_the_helper_its_login(tmp_path):
    (tmp_path / "amp-login").write_text(json.dumps(LOGIN))
    amp = host.amp_login(str(tmp_path))
    assert (amp.username, amp.password) == ("TFWeb", "secret-pass")


def test_a_missing_credential_leaves_the_helper_without_a_login(tmp_path):
    assert host.amp_login(None) is None
    assert host.amp_login(str(tmp_path)) is None
    (tmp_path / "amp-login").write_text("")  # the unit's fallback
    assert host.amp_login(str(tmp_path)) is None


@pytest.mark.parametrize("content", ["\n", "not json", json.dumps("TFWeb:secret"), json.dumps({"username": "TFWeb"}),
                                     json.dumps({"username": "", "password": "x"}),
                                     json.dumps({"username": "TFWeb", "password": 5}), json.dumps({**LOGIN, "extra": 1})])
def test_a_malformed_credential_stops_the_helper(tmp_path, content):
    (tmp_path / "amp-login").write_text(content)
    with pytest.raises(SystemExit, match="amp-login credential") as error:
        host.amp_login(str(tmp_path))
    assert "secret" not in str(error.value)


def test_a_cancel_during_the_backup_wait_stays_cancelled(controller, monkeypatch):
    monkeypatch.setattr(host.threading.Thread, "start", lambda _: None)
    amp = FakeAmp(busy=5, listed=False)
    instance = amp_controller(controller, amp)
    public = instance.plan("main", "restart", [])
    instance.start("main", public["id"], "www:user:1", "planned restart")
    calls = {"n": 0}
    original = amp.call

    def call(server, method, **body):
        # Cancel lands between AMP calls; the backup lookup then fails.
        if method == "Core/GetTasks":
            calls["n"] += 1
            if calls["n"] == 2:
                instance.cancel("main", public["id"])
        return original(server, method, **body)
    monkeypatch.setattr(amp, "call", call)
    monkeypatch.setattr(instance.cancelled, "wait", lambda delay: False)
    instance.run(instance._plan(public["id"]), instance.jobs["main"])
    assert instance.jobs["main"]["phase"] == "cancelled"
    assert "maintenance on" not in [c for _, c in instance.commands]


def test_the_login_is_never_written_to_the_state_files(controller, monkeypatch):
    monkeypatch.setattr(host.threading.Thread, "start", lambda _: None)
    instance = host.Controller(controller.state, controller.registry, amp=host.Amp(**LOGIN))
    monkeypatch.setattr(host.Amp, "call", lambda self, server, method, **body: {"Id": "task-1"})
    plan = instance.dispatch({"operation": "plan", "server": "main", "mode": "restart", "releases": []})
    instance.dispatch({"operation": "start", "server": "main", "plan_id": plan["id"], "actor": "www:user:1",
                       "reason": "planned restart", "emergency_override": False})
    stored = "".join(p.read_text(errors="replace") for p in controller.state.rglob("*.json"))
    assert "secret-pass" not in stored and "TFWeb" not in stored


def test_the_site_sends_no_amp_login(tmp_path, monkeypatch):
    import socket as sockets
    path = tmp_path / "control.sock"
    received = []
    server = sockets.socket(sockets.AF_UNIX, sockets.SOCK_STREAM)
    server.bind(str(path))
    server.listen()

    def serve():
        for _ in range(2):
            conn, _ = server.accept()
            with conn, conn.makefile("rb") as stream:
                received.append(json.loads(stream.readline()))
                conn.sendall(b'{"jobs": []}\n')
    thread = threading.Thread(target=serve, daemon=True)
    thread.start()
    monkeypatch.setenv("SERVER_CONTROL_SOCKET", str(path))
    control.request("plan", server="main")
    control.request("status")
    thread.join(5)
    server.close()
    assert received == [{"operation": "plan", "server": "main"}, {"operation": "status"}]


def test_amp_logs_in_again_when_its_session_expires(monkeypatch):
    posts = []

    def post(base, method, **body):
        posts.append((base, method))
        if method == "Core/Login":
            return {"success": True, "sessionID": f"s{len(posts)}"}
        if method == "ADSModule/GetInstances":
            return [{"AvailableInstances": [{"InstanceName": "TFMCMain01", "Port": 8081}]}]
        if body["SESSIONID"] == "s3":
            raise PermissionError(method)
        return "ok"
    monkeypatch.setattr(host.Amp, "_post", staticmethod(post))
    amp = host.Amp("TFWeb", "secret", ads="http://ads")
    assert amp.call("TFMCMain01", "Core/GetStatus") == "ok"
    assert [m for _, m in posts].count("Core/Login") == 4
    assert posts[-1] == ("http://127.0.0.1:8081", "Core/GetStatus")


def test_amp_finds_the_instance_again_after_a_connection_failure(monkeypatch):
    posts = []

    def post(base, method, **body):
        posts.append(method)
        if method == "Core/Login":
            return {"success": True, "sessionID": "s"}
        if method == "ADSModule/GetInstances":
            return [{"AvailableInstances": [{"InstanceName": "TFMCMain01", "Port": 8081}]}]
        if posts.count("Core/GetStatus") == 1:
            raise control.ControlError("amp_unavailable")
        return "ok"
    monkeypatch.setattr(host.Amp, "_post", staticmethod(post))
    amp = host.Amp("TFWeb", "secret", ads="http://ads")
    with pytest.raises(control.ControlError, match="amp_unavailable"):
        amp.call("TFMCMain01", "Core/GetStatus")
    assert posts.count("Core/GetStatus") == 1 and "TFMCMain01" not in amp.sessions
    assert amp.call("TFMCMain01", "Core/GetStatus") == "ok"
    assert posts.count("ADSModule/GetInstances") == 2


def test_recheck_after_midnight_reads_the_rotated_startup_log(controller, tmp_path, monkeypatch):
    import gzip
    new = tmp_path / "new.jar"
    release = release_for(controller, jar(new, version="2.0.0"), server="main")
    monkeypatch.setattr(controller, "_dev_verified", lambda *_: True)
    controller.fetch = lambda release, target: target.write_bytes(new.read_bytes())
    public = controller.plan("main", "latest", [release])
    job = ready_job(controller, controller._plan(public["id"]))
    controller.run(controller._plan(public["id"]))
    assert job["phase"] == "awaiting_review"
    logs = controller.roots["main"][1]
    with gzip.open(logs / "2026-10-12-1.log.gz", "wt") as handle:
        handle.write((logs / "latest.log").read_text())
    (logs / "latest.log").write_text("[00:00:05 INFO]: <Player> evening\n")
    assert controller.reopen("main", job["id"])["phase"] == "complete"


def test_countdown_zero_only_reserves_the_restart(controller, monkeypatch):
    windows = []
    monkeypatch.setattr(host, "scheduled_restart", lambda times, now, minutes: windows.append(minutes) or False)
    monkeypatch.setattr(controller.cancelled, "wait", lambda delay: False)
    public = controller.plan("main", "restart", [])
    ready_job(controller, controller._plan(public["id"]))
    controller.run(controller._plan(public["id"]))
    assert windows == [15]


def test_failed_countdown_tells_players_the_restart_is_off(controller, monkeypatch):
    monkeypatch.setattr(controller.cancelled, "wait", lambda delay: False)
    public = controller.plan("main", "restart", [])
    job = ready_job(controller, controller._plan(public["id"]))
    jar(controller.roots["main"][0] / "late-1.0.0.jar", name="Late")
    controller.run(controller._plan(public["id"]))
    assert job["phase"] == "failed" and job["error"] == "plugins_changed"
    assert controller.commands[-1] == ("main", "broadcast &eThe server restart has been cancelled.")
    assert not any(c == "maintenance on" for _, c in controller.commands)


def test_unreadable_jar_has_its_own_error(controller, monkeypatch):
    def unreadable(self, name, start=0):
        raise PermissionError(name)
    monkeypatch.setattr(inventory.LocalFiles, "read", unreadable)
    with pytest.raises(control.ControlError, match="plugin_unreadable"):
        controller.snapshot("dev")


def test_accepted_job_with_its_own_error_field_is_not_a_refusal(tmp_path, monkeypatch):
    class Fake:
        def dispatch(self, body):
            if body["operation"] == "cancel":
                raise control.ControlError("cannot_cancel")
            return {"id": "e" * 32, "server": "dev", "phase": "installing", "error": None}
    path = tmp_path / "dev.sock"
    with host.Server(str(path), host.Handler) as server:
        server.allowed_servers = {"dev"}
        server.controller = Fake()
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        monkeypatch.setenv("SERVER_CONTROL_SOCKET", str(path))
        assert control.request("start", server="dev", plan_id="e" * 32)["phase"] == "installing"
        with pytest.raises(control.ControlError, match="cannot_cancel") as refused:
            control.request("cancel", server="dev", job_id="e" * 32)
        assert refused.value.status == 409
        server.shutdown()
        worker.join()


def helper(controller, sent, reply=None):
    """control.request answered by the controller for inventory reads; other requests are recorded."""
    def request(operation, **body):
        if operation == "inventory":
            return controller.dispatch({"operation": operation, **body})
        sent.append((operation, body))
        return reply if reply is not None else {"id": "plan"}
    return request


def test_latest_plan_fetches_fresh_releases_and_passes_verified_full_inventory(controller, monkeypatch):
    from src.servers.test_inventory import Github, release
    monkeypatch.delenv("SERVERS_GITHUB_TOKEN", raising=False)
    monkeypatch.delenv("PATCHNOTES_GITHUB_TOKEN", raising=False)
    monkeypatch.delenv("SERVERS_GITHUB_ORG", raising=False)
    baseline = controller.snapshot("dev")
    rows = [release("v2.0.0", "2026-10-01T00:00:00Z", "core-2.0.0.jar", "2" * 64),
            release("v1.0.0", "2026-09-01T00:00:00Z", "core-1.0.0.jar", baseline[0]["sha256"])]
    fetch = Github({"Core": rows})
    monkeypatch.setattr(inventory, "_github", lambda path, body=None, **_: fetch(path, body))
    sent = []
    monkeypatch.setattr(control, "request", helper(controller, sent))
    assert control.plan("dev", "latest") == {"id": "plan"}
    rows.insert(0, release("v3.0.0", "2026-10-02T00:00:00Z", "core-3.0.0.jar", "3" * 64))
    control.plan("dev", "latest")
    assert [body["releases"][0]["tag"] for _, body in sent] == ["v2.0.0", "v3.0.0"]
    assert all(operation == "plan" and body["expected"] == baseline for operation, body in sent)
    assert all({"sha256": baseline[0]["sha256"], "version": "1.0.0"} in body["releases"][0]["known"] for _, body in sent)
    assert sum(path.startswith("/orgs/") for path, _ in fetch.calls) == 2
    assert controller.commands == []


def test_latest_plan_for_an_unknown_or_unreadable_server_reaches_no_plan(controller, monkeypatch):
    sent = []
    monkeypatch.setattr(control, "request", helper(controller, sent))
    with pytest.raises(control.ControlError, match="bad_server"):
        control.plan("nowhere", "latest")
    with pytest.raises(control.ControlError, match="bad_server_action"):
        control.plan("../main", "latest")
    controller.registry.found["dev"] = host.Instance(**{**controller.registry.found["dev"].__dict__, "running": False})
    with pytest.raises(control.ControlError, match="server_files_unavailable"):
        control.plan("dev", "latest")
    assert sent == []


@pytest.mark.parametrize("failure", ["global", "partial", "history", "renamed"])
def test_latest_plan_fails_closed_before_helper_for_unverified_releases(controller, monkeypatch, failure):
    plugins, _ = controller.roots["dev"]
    monkeypatch.delenv("SERVERS_GITHUB_ORG", raising=False)
    found = inventory.Releases()
    found.repos.add("Core")
    found["Core"] = [inventory.Release("Core", "2.0.0", "2026-10-01T00:00:00Z", "url", "core-2.0.0.jar", "2" * 64, "v2.0.0")]
    if failure == "global":
        found.error = "github_unavailable"
    elif failure == "partial":
        found.errors["Core"] = "github_unavailable"
    elif failure == "renamed":
        found.clear()
        found.repos = {"DifferentRepo"}
    if failure == "renamed":
        monkeypatch.setattr(inventory, "compare", lambda *_: ([], [{"name": "Core", "unverified": True}]))
    monkeypatch.setattr(inventory, "check_releases", lambda *_: found)
    sent = []
    monkeypatch.setattr(control, "request", helper(controller, sent))
    with pytest.raises(control.ControlError, match="releases_unavailable"):
        control.plan("dev", "latest")
    assert sent == [] and controller.commands == []


def test_latest_plan_refuses_an_old_helper_protocol_instead_of_retrying_unsafely(controller, monkeypatch):
    monkeypatch.delenv("SERVERS_GITHUB_ORG", raising=False)
    found = inventory.Releases()
    calls = []
    monkeypatch.setattr(inventory, "check_releases", lambda *_: found)
    def refused(operation, **body):
        if operation == "inventory":
            return controller.dispatch({"operation": operation, **body})
        calls.append(body)
        assert "expected" in body
        raise control.ControlError("bad_control_request", 400)
    monkeypatch.setattr(control, "request", refused)
    with pytest.raises(control.ControlError, match="control_unavailable") as error:
        control.plan("dev", "latest")
    assert error.value.status == 503 and len(calls) == 1


def test_restart_plan_keeps_legacy_protocol_without_a_github_check(monkeypatch):
    monkeypatch.setattr(inventory, "check_releases", lambda *_: pytest.fail("restart looked up releases"))
    sent = []
    monkeypatch.setattr(control, "request", lambda op, **body: sent.append((op, body)) or {"id": "legacy"})
    assert control.plan("dev", "restart") == {"id": "legacy"}
    assert sent == [("plan", {"server": "dev", "mode": "restart", "releases": []})]


def test_helper_plan_accepts_old_protocol_and_matching_new_inventory(controller):
    old = controller.dispatch({"operation": "plan", "server": "dev", "mode": "restart", "releases": []})
    expected = controller.snapshot("dev")
    new = controller.dispatch({"operation": "plan", "server": "dev", "mode": "restart", "releases": [], "expected": expected})
    assert old["id"] != new["id"]
    assert controller._plan(new["id"])["baseline"] == expected


def test_helper_rejects_changed_expected_inventory_before_commands_or_new_files(controller):
    expected = controller.snapshot("dev")
    old = controller.roots["dev"][0] / expected[0]["file"]
    import os
    stamp = old.stat()
    raw = old.read_bytes()
    old.write_bytes(raw[:-1] + bytes([raw[-1] ^ 1]))
    os.utime(old, ns=(stamp.st_atime_ns, stamp.st_mtime_ns))
    before = set(controller.state.iterdir())
    with pytest.raises(control.ControlError, match="plugins_changed"):
        controller.dispatch({"operation": "plan", "server": "dev", "mode": "latest", "releases": [], "expected": expected})
    assert controller.commands == []
    assert set(controller.state.iterdir()) == before


@pytest.mark.parametrize("expected", [None, "invalid", {}, [{}] * 301])
def test_helper_rejects_malformed_new_inventory_field(controller, expected):
    with pytest.raises(control.ControlError, match="bad_control_request"):
        controller.dispatch({"operation": "plan", "server": "dev", "mode": "latest", "releases": [], "expected": expected})
    assert controller.commands == []


def test_snapshot_reads_each_jar_once(controller, monkeypatch):
    original = inventory.LocalFiles.read
    calls = []
    def read(self, name, start=0):
        calls.append(name)
        return original(self, name, start)
    monkeypatch.setattr(inventory.LocalFiles, "read", read)
    monkeypatch.setattr(host, "digest", lambda *_: pytest.fail("snapshot hashed the jar twice"))
    [copy] = controller.snapshot("dev")
    assert calls == ["plugins/core-1.0.0.jar"]
    assert copy["name"] == "Core" and len(copy["sha256"]) == 64


def test_latest_plan_upgrades_renamed_geiger_counter_from_its_verified_old_hash(controller, tmp_path):
    plugins, _ = controller.roots["dev"]
    old_sha = jar(plugins / "radiation-old.jar", name="geiger_counter", version="1.0.0")
    target = tmp_path / "geiger-release.jar"
    new_sha = jar(target, name="geiger_counter", version="2.0.0")
    controller.fetch = lambda release, path: path.write_bytes(target.read_bytes())
    release = {"repo": "GeigerCounters", "tag": "v2.0.0", "asset": "geigercounters-2.0.0.jar", "sha256": new_sha,
               "known": [{"sha256": old_sha, "version": "1.0.0"}]}
    plan = controller.plan("dev", "latest", [release], expected=controller.snapshot("dev"))
    [change] = plan["changes"]
    assert change["repo"] == "GeigerCounters" and change["name"] == "geiger_counter"
    assert change["old_file"] == "radiation-old.jar" and change["old_version"] == "1.0.0"
    assert change["sha256"] == new_sha and "test_build" not in change
    assert plan["skipped"] == []


def test_socket_is_owner_only_unless_shared_with_a_group(tmp_path):
    import grp
    import os
    import stat

    path = tmp_path / "control.sock"
    path.touch(mode=0o644)
    host.share_socket(path, host.socket_group(""))
    assert stat.S_IMODE(path.stat().st_mode) == 0o600
    host.share_socket(path, host.socket_group(grp.getgrgid(os.getgid()).gr_name))
    assert stat.S_IMODE(path.stat().st_mode) == 0o660
    assert path.stat().st_gid == os.getgid()
    with pytest.raises(SystemExit, match="does not exist"):
        host.socket_group("no-such-group-for-tfmc")



def test_server_keys_and_labels_come_from_amp_instance_names():
    assert host.server_key("TFMCMain01") == ("main", "Main")
    assert host.server_key("TFMCLobby01") == ("lobby", "Lobby")
    assert host.server_key("TFMCS601") == ("s6", "S6")
    assert host.server_key("TFRandom01") == ("random", "Random")


class Instances(FakeAmp):
    def __init__(self, rows):
        super().__init__(busy=0)
        self.rows = rows

    def instances(self):
        return self.rows


def test_registry_lists_minecraft_instances_with_their_policies():
    rows = [{"InstanceName": name, "Module": module, "Running": running} for name, module, running in (
        ("TFMCTutorial01", "Minecraft", True), ("TFMCDiscordBot01", "GenericModule", True),
        ("TFMCDev01", "Minecraft", True), ("TFMCBuild01", "Minecraft", False),
        ("TFMCMain01", "Minecraft", True), ("ADS01", "ADS", True))]
    found = host.Registry(Instances(rows)).all()
    assert [(i.key, i.label, i.instance, i.running) for i in found.values()] == [
        ("main", "Main", "TFMCMain01", True), ("dev", "Dev", "TFMCDev01", True),
        ("build", "Build", "TFMCBuild01", False), ("tutorial", "Tutorial", "TFMCTutorial01", True)]
    assert found["main"].policy == host.Policy(backup=True, review=True, maintenance=True)
    assert found["dev"].policy.countdown == 0 and not found["dev"].policy.releases_only
    assert found["tutorial"].policy == host.Policy()
    assert isinstance(found["tutorial"].files, host.AmpFiles) and found["tutorial"].files.instance == "TFMCTutorial01"


def test_registry_keeps_the_last_list_when_amp_is_unreachable(monkeypatch):
    amp = Instances([{"InstanceName": "TFMCLobby01", "Module": "Minecraft", "Running": True}])
    registry = host.Registry(amp, ttl=0)
    assert list(registry.all()) == ["lobby"]
    def unreachable():
        raise control.ControlError("amp_unavailable")
    amp.instances = unreachable
    assert list(registry.all()) == ["lobby"]
    with pytest.raises(control.ControlError, match="bad_server"):
        registry.get("main")


def test_clashing_keys_fall_back_to_the_instance_name():
    rows = [{"InstanceName": name, "Module": "Minecraft", "Running": True} for name in ("TFMCLobby01", "TFLobby02")]
    assert sorted(host.Registry(Instances(rows)).all()) == ["lobby", "tflobby02"]


def test_servers_without_maintenance_count_down_and_reopen_without_review(controller, monkeypatch, tmp_path):
    monkeypatch.setattr(host.threading.Thread, "start", lambda _: None)
    new = tmp_path / "new.jar"
    sha = jar(new, version="2.0.0")
    controller.fetch = lambda release, target: target.write_bytes(new.read_bytes())
    monkeypatch.setattr(controller, "_dev_verified", lambda *_: True)
    public = controller.plan("lobby", "latest", [release_for(controller, sha, server="lobby")])
    assert public["backup"] is False and [c["asset"] for c in public["changes"]] == ["core-2.0.0.jar"]
    job = controller.start("lobby", public["id"], "www:user:1", "lobby update")
    assert job["phase"] == "countdown" and job["deadline"] - job["accepted_at"] == 300
    assert job["backup"] is None and job["maintenance"] is False and job["review"] is False
    monkeypatch.setattr(controller.cancelled, "wait", lambda delay: False)
    controller.run(controller._plan(public["id"]), controller.jobs["lobby"])
    assert controller.jobs["lobby"]["phase"] == "complete"
    commands = [c for server, c in controller.commands if server == "lobby"]
    assert len([c for c in commands if "Finish what you are doing" in c]) == 5
    assert not any(c.startswith("maintenance") for c in commands)
    assert commands.index("save-all flush") < commands.index("stop")
    assert [j["file"] for j in controller.snapshot("lobby")] == ["core-2.0.0.jar"]


def test_updates_on_other_servers_still_need_dev_evidence(controller, tmp_path):
    new = tmp_path / "new.jar"
    sha = jar(new, version="2.0.0")
    controller.fetch = lambda release, target: target.write_bytes(new.read_bytes())
    public = controller.plan("lobby", "latest", [release_for(controller, sha, server="lobby")])
    assert public["changes"] == [] and public["skipped"] == [{"repo": "Core", "reason": "not_verified_on_dev"}]


def test_an_emergency_restart_needs_a_countdown_to_skip(controller, monkeypatch):
    monkeypatch.setattr(host.threading.Thread, "start", lambda _: None)
    plan = controller.plan("lobby", "restart", [])
    job = controller.start("lobby", plan["id"], "www:user:1", "lobby is stuck", emergency_override=True)
    assert job["phase"] == "installing" and job["countdown"] == 0


def test_main_requires_its_maintenance_plugin(controller):
    (controller.roots["main"][0] / "Maintenance" / "config.yml").unlink()
    with pytest.raises(control.ControlError, match="maintenance_unavailable"):
        controller.plan("main", "restart", [])
    assert controller._maintenance("lobby") is None


def test_the_restart_avoids_the_servers_own_amp_schedule(controller, monkeypatch):
    seen = []
    monkeypatch.setattr(host, "scheduled_restart", lambda times, now, minutes: seen.append((times, minutes)) or True)
    monkeypatch.setattr(host.Controller, "_schedule", lambda self, server: [f"{server} schedule"])
    plan = controller.plan("lobby", "restart", [])
    with pytest.raises(control.ControlError, match="scheduled_restart_conflict"):
        controller.start("lobby", plan["id"], "www:user:1", "planned restart")
    assert seen == [(["lobby schedule"], 20)]


def test_same_named_jar_is_replaced_and_restored(controller, tmp_path, monkeypatch):
    plugins, _ = controller.roots["dev"]
    (plugins / "core-1.0.0.jar").rename(plugins / "TLibs.jar")
    old = host.digest(plugins / "TLibs.jar")
    new = tmp_path / "new.jar"
    sha = jar(new, version="2.0.0")
    controller.fetch = lambda release, target: target.write_bytes(new.read_bytes())
    release = {"repo": "Core", "tag": "v2.0.0", "asset": "TLibs.jar", "sha256": sha, "known": [{"sha256": old, "version": "1.0.0"}]}
    plan = controller._plan(controller.plan("dev", "latest", [release])["id"])
    controller._install(plan)
    assert host.digest(plugins / "TLibs.jar") == sha
    (plugins / "TLibs.jar").unlink()
    (plugins / "TLibs.jar").write_bytes((controller.state / plan["id"] / "backup" / "TLibs.jar").read_bytes())
    original = inventory.LocalFiles.md5
    monkeypatch.setattr(inventory.LocalFiles, "md5", lambda self, name: "0" if ".control-" in name else original(self, name))
    with pytest.raises(control.ControlError, match="release_checksum_failed"):
        controller._install(plan)
    assert host.digest(plugins / "TLibs.jar") == old


def test_inventory_reads_every_server_and_reports_switched_off_ones(controller, monkeypatch):
    lobby = controller.registry.found["lobby"]
    controller.registry.found["build"] = host.Instance("build", "Build", "build", host.Policy(), False, lobby.files)
    rows = {r["key"]: r for r in controller.dispatch({"operation": "inventory"})["servers"]}
    assert list(rows) == ["main", "dev", "lobby", "build"]
    assert rows["dev"]["error"] is None and rows["dev"]["releases_only"] is False
    assert [j["file"] for j in rows["dev"]["jars"]] == ["core-1.0.0.jar"] and rows["dev"]["startup"]["done"]
    assert rows["build"]["error"] == "instance_off" and rows["build"]["jars"] == []
    reads = []
    original = inventory.LocalFiles.read
    monkeypatch.setattr(inventory.LocalFiles, "read", lambda self, name, start=0: reads.append(name) or original(self, name, start))
    controller.dispatch({"operation": "inventory"})
    assert not any(name.endswith(".jar") for name in reads)  # unchanged jars come from the cache
    controller.dispatch({"operation": "inventory", "server": "dev"})
    assert "plugins/core-1.0.0.jar" in reads  # one named server is read fresh
    with pytest.raises(control.ControlError, match="bad_control_request"):
        controller.dispatch({"operation": "inventory", "extra": 1})


def test_status_lists_servers_with_their_rules(controller):
    status = controller.dispatch({"operation": "status"})
    assert [s["key"] for s in status["servers"]] == ["main", "dev", "lobby"]
    assert status["servers"][0]["policy"]["backup"] is True
    assert status["servers"][2]["policy"] == {"countdown": 300, "backup": False, "dev_verified": True, "review": False,
                                              "maintenance": False, "releases_only": True}


def serve(path, controller, allowed):
    server = host.Server(str(path), host.Handler)
    server.controller, server.allowed_servers = controller, allowed
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def test_www_controls_every_server_and_dev_reads_all_but_controls_only_dev(controller, tmp_path, monkeypatch):
    www, dev = serve(tmp_path / "www.sock", controller, None), serve(tmp_path / "dev.sock", controller, {"dev"})
    try:
        monkeypatch.setenv("SERVER_CONTROL_SOCKET", str(tmp_path / "www.sock"))
        assert control.status()["allowed_servers"] == ["dev", "lobby", "main"]
        assert control.request("plan", server="lobby", mode="restart", releases=[])["server"] == "lobby"
        controller.jobs.clear()
        monkeypatch.setenv("SERVER_CONTROL_SOCKET", str(tmp_path / "dev.sock"))
        assert control.status()["allowed_servers"] == ["dev"]
        assert [r["key"] for r in control.request("inventory")["servers"]] == ["main", "dev", "lobby"]
        with pytest.raises(control.ControlError, match="server_not_allowed"):
            control.request("plan", server="lobby", mode="restart", releases=[])
    finally:
        for server in (www, dev):
            server.shutdown()
            server.server_close()


def test_amp_files_move_bytes_in_chunks_and_read_amp_times(monkeypatch):
    import base64
    monkeypatch.setattr(host, "CHUNK", 4)
    stored = {"plugins/a.jar": b"0123456789"}
    calls = []
    class Amp:
        def call(self, instance, method, **body):
            calls.append((instance, method))
            name = body.get("Filename")
            if method.endswith("GetFileChunk"):
                if name not in stored:
                    raise control.ControlError("amp_action_failed")
                data = stored[name][body["Position"]:body["Position"] + body["Length"]]
                return {"Base64Data": base64.b64encode(data).decode()}
            if method.endswith("WriteFileChunk"):
                stored[name] = stored.get(name, b"") + base64.b64decode(body["Data"])
                return {}
            if method.endswith("GetDirectoryListing"):
                return [{"Filename": "a.jar", "IsDirectory": False, "SizeBytes": 10,
                         "Modified": "2026-10-15T20:28:45.9320198Z", "Created": "/Date(1792302900857)/"}]
    files = host.AmpFiles(Amp(), "TFMCLobby01")
    assert files.read("plugins/a.jar") == b"0123456789" and files.read("plugins/a.jar", 8) == b"89"
    with pytest.raises(FileNotFoundError):
        files.read("plugins/gone.jar")
    files.write("plugins/b.jar", b"abcdefghi")
    assert stored["plugins/b.jar"] == b"abcdefghi"
    with pytest.raises(FileExistsError):
        files.write("plugins/a.jar", b"x")
    [item] = files.listing("plugins")
    assert item["Created"] == 1792302900.857 and item["Identity"] == item["Created"]
    assert item["Modified"] == pytest.approx(1792096125.932)
    assert {instance for instance, _ in calls} == {"TFMCLobby01"}
