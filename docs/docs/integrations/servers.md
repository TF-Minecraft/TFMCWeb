# Servers

[Project index](../../README.md) · [Source module](../../../backend/src/servers)

The staff panel's Servers tab compares every TFMC plugin's latest GitHub
release with the jar each Minecraft server has installed and the version it is
running. `GET /admin/servers` serves it to admins and the owner
(`view_servers`). Every server reaches the site the same way: the host's
[control helper](#host-connection-setup) finds each Minecraft instance in AMP,
reads its files through the AMP API as the `TFWeb` service account, and also
installs released jars and restarts servers.

## What the tab shows

Each server has a card showing whether it is running, its Paper version and
how many plugins have each kind of problem. When Paper is not simply running,
the card shows AMP's state instead, such as Stopped. Instances switched off in
AMP are listed on one line under the cards. Below them,
**Needs a look** lists the plugins with a problem, worst first; **TFMC
plugins** lists every plugin, and **Other plugins** compares third-party jars
between the servers by version. Each row shows the plugin's latest release
beside the version each server runs, dimmed when it matches that release.
Hovering a version shows the jar's file name. With more servers than fit, the
table scrolls sideways.

Under each latest release, a mark compares it with the repository's default
branch (`main`, or `master` for CoreProtect) and links to GitHub's comparison:

| Mark | Meaning |
| --- | --- |
| `= main` | The release is the branch's latest commit. |
| `main +3` | The branch has 3 commits since the release: merged work that is not released yet. Commits that only change docs or CI count too. |
| `Off main` | The release has commits that aren't on the branch, such as a tag on a feature branch. |
| No mark | There is no GitHub token, or GitHub couldn't compare them. |

A plugin is any active repository in the organisation whose published
releases carry a jar. The latest is GitHub’s designated Latest release; if it
has no eligible jar, the newest eligible release found in release history is
used. Drafts and pre-releases are ignored. A later maintenance release does
not displace a newer major unless GitHub marks it Latest. Each server copy
gets these labels:

| Label | Meaning |
| --- | --- |
| No label | The jar is the latest release's file and the server is running it. |
| Not a release (every server but Dev) | The jar's SHA-256 matches no published release, whatever its name. |
| Test build (Dev) | The same on Dev, where test builds are allowed. |
| Unverified | GitHub or the check deadline prevented complete checksum verification. This is not proof of a test build. |
| Older release | The jar is an earlier release's file. |
| Needs restart | The server enabled a different version at its last startup, or a jar waits in `plugins/update/`. The cell shows the running version, then the version on disk. |
| Didn't start | The last startup finished without enabling the plugin. |
| Two jars | Two jars of the plugin sit in `plugins/`. |
| Not installed | No jar. Not counted as a problem. |

Jars are matched to plugins by SHA-256 first, using the digests GitHub reports
for release assets, then by the release file's name before its version (for
example `tfmccore-`) or the stable Bukkit plugin identifier. A filename or
embedded version only selects a lookup candidate; a matching published asset
checksum is required to identify a release. This also recognizes renamed
older jars with their original plugin identifier. The running version comes from the
`Enabling <name> v<version>` lines of the most recent startup in `logs/`;
plugins that then report an enable failure or disable before startup finishes
are excluded from the running versions.
Paper also starts a new log at midnight, so up to twelve rotated logs are read
until one holds a startup. A jar replaced with another of the same version
since the last startup is not detected.

## Settings

| Variable | Meaning |
| --- | --- |
| `SERVER_CONTROL_SOCKET` | The control helper's socket (see [Host connection setup](#host-connection-setup)). Without it the tab lists no servers and says the helper didn't answer. |
| `SERVERS_GITHUB_TOKEN` | A read-only GitHub token, falling back to `PATCHNOTES_GITHUB_TOKEN`. Each check discovers active repositories afresh, then reads current releases in groups of eight with at most six queries concurrently. Without a token, fresh REST reads remain available but can quickly reach GitHub’s unauthenticated limit. |
| `SERVERS_GITHUB_ORG` | The organisation to read. Defaults to `TF-Minecraft`. |

Main loads its token from `backend/.env`. Configure Dev's administrator-managed
Compose override to load a token-only project-root `.env` with `env_file`, using
the same read-only `SERVERS_GITHUB_TOKEN`. The host's `environment: !override`
can discard entries from the base Compose file; an environment file avoids that.
Keep secret files outside Git and recreate the backend after configuration changes.

Every page load and **Check again** waits for a fresh check. There is no
release-response cache, background refresh or reuse of an earlier check. The
helper's inventory read runs alongside the GitHub queries. For the tab, the
helper keeps each jar's hash while the jar's size and times are unchanged, so
only new or changed jars are read again; it fills this cache when it starts.
Plans and restarts always read fresh bytes.
Equal release/default-branch commit hashes avoid a comparison request;
unequal hashes request the commit count. Missing commit information leaves
the branch mark unknown.

Older installed versions first try their exact release tags and verify the
asset checksum. Only unmatched jars need their candidate repository’s release
history. Release and asset pagination must finish or find the matching bytes;
an interrupted search is Unverified, never proof that a jar is unreleased.

A check has a 20-second GitHub deadline. At most two checks per backend
process use GitHub concurrently; extra checks report busy rather than sharing
results. Local inventory remains visible when GitHub is unavailable. Partial
repository failures show unknown releases. A failed browser request keeps the
previous result’s own timestamp and shows **Check failed**; an older response
cannot replace a later successful check.

## Restart and release controls

Admins and the owner (`manage_servers`) can review and start a restart,
cancel a countdown before installation starts, and recheck a failed restart
before reopening. Each server's card holds its buttons and shows the restart's
progress; the review opens as a dialog. The www website can control every
server; the Dev website can control Dev only, and shows the other servers
read-only. Every action requires the site's own origin, a current signed-in
session and a reason, and is recorded in the staff audit. View-as sessions
cannot issue these actions. One restart runs at a time across all servers.

`POLICIES` in `host.py` holds the rules that differ between servers. Every
Minecraft instance not listed there gets the default rules:

| Rule | Main | Dev | Every other server |
| --- | --- | --- | --- |
| Countdown | Five minutes of in-game warnings | None; restarts on confirm | Five minutes |
| Fresh AMP backup during the countdown | Yes | No | No |
| Updates need the release to have run on Dev | Yes | No | Yes |
| Stays in maintenance for a feature review | Yes | No | No |
| Maintenance plugin | Required | Required | Used when installed |
| Test builds | Flagged, ticked for replacement | Allowed, unticked | Flagged, ticked for replacement |

Servers with a countdown offer an unchecked **Emergency: skip the countdown**
option, recording the flag, actor and reason. It skips the fresh AMP backup but
still saves and runs release/file verification and startup checks. Instant
restarts begin installation immediately and cannot be cancelled. The status
reply (`GET /admin/servers/control`) lists each server's key, label and rules,
and the panel words its dialogs from them.

**Restart** activates the jars already on disk. **Update and restart**
upgrades installed TFMC plugins whose hashes identify known older published
releases. Non-increasing versions and plugins not installed on the target are
skipped; the review shows those skips.

A jar whose hash matches no published release is a test build. The review
lists each one with a checkbox to replace it with the latest release, and
warns when the test build reports a higher version than the release. They are
ticked by default everywhere except Dev, where a test build is often someone's
work in progress. The start request names the chosen plugins in
`replace_test_builds`; the helper rejects names that are not test builds in
the plan, and the audit records the list. Unchosen test builds are left on
disk, are not checked as changes, and are recorded in the plan as
`test_build_kept`. Servers that need Dev evidence still require the release
to have run on Dev.

A release plan performs its own fresh GitHub and target-server check.
Unavailable or unverified release information prevents the plan. It passes
the exact installed filenames and SHA-256 values to the helper, which rejects
a changed inventory before preparing a plan. The helper still rechecks the
approved baseline before installation. The stored plan pins the artifacts
staff approved; it is not a cache for later panel checks.

Upgrades on servers that need Dev evidence also require the target release's exact bytes to be on Dev,
with its version enabled without a subsequent enable failure or disable at
Dev's last completed startup. A jar changed after
that startup is not proof and is skipped. AMP reports a file's modification
time, not its change time, so a jar copied in with its old time kept (`cp -p`,
`rsync -t`) after the startup still counts. This check proves that the release
was loaded; staff must still verify its changed features and dependencies.
Related migrations must be deployed as a reviewed set with a recovery plan.
Use the manual deployment procedure when the proposed set needs offline work.
The bulk button does not publish releases or replace unreleased fixes.

For servers whose rules take a backup (Main), the helper asks AMP for one as
the countdown starts and records it on the job as `backup`. When the countdown
ends it waits up to twenty minutes for AMP to finish, broadcasting
`Finishing a backup before the restart.` while it waits. A failed or overdue
backup calls the restart off before maintenance; nothing is installed. Other
servers and emergency restarts take no fresh backup. The review says which
applies and shows the latest AMP backup time. AMP backs up the
instance folder, not external databases, so prepare those and any migration
recovery separately. Each backup takes one of Main's nine AMP backup slots,
so the next scheduled backup deletes the oldest. The helper also keeps the
jars it replaces.

After the countdown, or immediately when there is none, the helper enables
maintenance and confirms it (servers without the Maintenance plugin skip this),
sends `save-all flush` and waits for its save confirmation. It rechecks the
files against the reviewed plan and copies each jar it will replace into its own
state folder. It writes each verified jar through AMP under a hidden name
Paper ignores, checks AMP's MD5 of it, renames it into place and moves the old
jar to the instance's `.trash`; Java keeps its open copy until it stops. It
then reads every jar again and checks the files and hashes against the plan
before it sends console `stop`, and AMP relaunches Paper. The helper never uses AMP
instance `stop` or `restart`, kills Java, or runs reload commands.

A new completed startup must load every changed plugin and every previously
working plugin at its expected version, with the planned hashes on disk and
no new startup error messages. An unchanged plugin with an explicitly recorded
enable failure may retain that same failure at the same version. It is not
shown as a staged activation and never counts as a verified Dev release.
Existing errors are recorded in the plan and compared as distinct messages,
preserving severity and normalizing worker thread numbers in log headers.
Repeated copies of the same known error do not prevent reopening; a new
message still fails the check. Older saved plans use the same comparison.
Plans expire after ten
minutes. A changed file invalidates the plan even when its size and
modification time are unchanged.

On servers with a feature review (Main), release upgrades and restarts that
activate staged plugin versions leave maintenance on after a successful
startup, with **Startup passed**. Check the changed features, then use
**Recheck and reopen** with a reason. This also applies to emergency restarts.
Everything else reopens after the automatic checks pass. Cancellation,
reopening and failure resolution also require reasons.

## Host connection setup

Control uses the `tfmc-server-control` system service, running as the locked
`tfmc-server-control` account: `/usr/sbin/nologin`, a locked password, and no
AMP, Docker or sudo groups. The unit sets `NoNewPrivileges=true`, so the helper
cannot gain privileges through sudo or setuid programs, and `ProtectHome=true`,
so it sees no home directories: it reaches Minecraft only through the AMP API.
The service starts at boot, independently of user login sessions.

At start, and again at most once a minute, the helper asks AMP's ADS for its
instances and treats every one whose module is Minecraft as a server. Its key
and label come from the instance name, dropping a `TFMC` or `TF` prefix and the
two-digit number: `TFMCLobby01` is `lobby`, Lobby, and `TFMCS601` is `s6`, S6.
A new instance in AMP appears on the tab within a minute, with the default
rules; give it other rules in `POLICIES`. An instance switched off in AMP
is listed as off, since its files can't be reached. Instances in `HIDDEN`
are left out altogether, with no inventory and no controls; Season 6
(`TFMCS601`) is there while it is being set up.

The administrator installs the service from a reviewed commit on TFMCWeb
`main`. This needs Python 3.10+ and systemd 249 or later, then the account
below, the [AMP login](#amp-login), and finally the unit and modules.

### Account

Create the website backends' socket group and the locked service account:

```sh
sudo groupadd --system --gid 996 tfmc-control
sudo useradd --system --user-group --home-dir /var/lib/tfmc-server-control \
  --no-create-home --shell /usr/sbin/nologin tfmc-server-control
sudo passwd -l tfmc-server-control
```

The account needs no access to the instance folders.

### Installing the service

From a checkout of the commit:

```sh
sudo install -d -m 755 -o root -g root /usr/local/lib/tfmc-server-control/backend/src/servers
sudo install -m 644 -o root -g root backend/src/servers/{__init__,control,host,inventory}.py \
  /usr/local/lib/tfmc-server-control/backend/src/servers/
sudo install -m 755 -o root -g root scripts/server-control-update.py /usr/local/sbin/tfmc-server-control-update
sudo install -m 644 -o root -g root scripts/tfmc-server-control.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now tfmc-server-control.service
sudo /usr/local/sbin/tfmc-server-control-update <full commit>
```

Skip the module copy when the helper is already installed: the updater
replaces the modules itself and records the commit. When the modules change it
restarts the service, which then runs under the new unit; when they don't,
restart the service yourself. After a change to the unit or the updater,
install the updater, then install the unit, run `daemon-reload` and run the
updater with the new commit back to back, with no active restart. The updater
refuses a commit whose unit differs from the installed one, so the unit must
go in first, and a service restart in between would run the old modules under
the new unit.

### AMP login

The helper does all its server work through the AMP API as the `TFWeb`
service account: finding instances, reading and writing files, schedules,
console commands and backups. Its login is a root-owned JSON file
that systemd passes to the service as the `amp-login` credential:

```sh
login=$(mktemp)
python3 -c 'import json, sys; print(json.dumps({"username": "TFWeb", "password": open(sys.argv[1]).read().strip()}))' \
  ~/.config/amp-tfweb > "$login"
sudo mkdir -p -m 700 /etc/tfmc
sudo install -m 600 -o root -g root "$login" /etc/tfmc/server-control-amp-login
rm "$login"
sudo systemctl restart tfmc-server-control.service
```

Run this as `ryan`, whose `~/.config/amp-tfweb` holds the `TFWeb` password,
with no active restart. Rotate the password the same way. The helper reads the
file only at start, so restart the service after every change. It never writes
the login to its state files. The websites send no AMP login and need no
`SERVER_CONTROL_AMP_*` settings in `backend/.env`.

The file holds a JSON object with exactly `username` and `password`. A missing
file makes the unit pass an empty credential instead, and an empty credential
means no login: the helper starts and answers status requests, but it finds
no servers, so the tab lists none. Any other
content, such as invalid JSON or extra keys, stops the helper at start. It
never falls back to another way of reaching the console.

The service runs with root-owned code and private state, and every home
directory is hidden from it. `RuntimeDirectoryPreserve=yes`
keeps socket directories intact across service restarts, so existing container
bind mounts follow the replacement socket inode. See the
[systemd execution settings](https://github.com/systemd/systemd/blob/v249/man/systemd.exec.xml).

The administrator appends the following entries to the **production backend's
existing override lists**, preserving its `!override` volumes and environment
values:

```yaml
services:
  backend:
    volumes:
      - /run/tfmc-server-control/www:/server-control:ro
    environment:
      - SERVER_CONTROL_SOCKET=/server-control/control.sock
```

For the Dev website, use the separate **Dev-only** directory instead:

```yaml
services:
  backend:
    volumes:
      - /run/tfmc-server-control/dev:/server-control:ro
    environment:
      - SERVER_CONTROL_SOCKET=/server-control/control.sock
```

Mount the directory, not the individual socket. Both sockets have mode
`0660`, owned by `tfmc-server-control` with group `tfmc-control` (gid 996):
the unit adds the helper to that group and sets
`SERVER_CONTROL_SOCKET_GROUP=tfmc-control`. Create the group before installing the
unit (see [Account](#account)); the helper exits at start if it is missing. The website backends run as
`tfmc` and get the group through `group_add` (see
[Host Compose overrides](../../DEPLOY.md#host-compose-overrides)). Without
`SERVER_CONTROL_SOCKET_GROUP` the sockets are `0600`. A read-only
mount prevents replacing the socket; it still allows connections. Never mount
these sockets into branch previews or expose them through a public proxy.

Recreate the affected website backend through the administrator's Compose
workflow. Website code deploys still use GitHub Actions as described in
[Previews and deploys](../../DEPLOY.md). While signed in as an admin or owner,
verify `GET /admin/servers/control` reports `available` and the expected
`allowed_servers`. This check does not restart Minecraft.

`SERVER_CONTROL_LOG_TIMEZONE` in the system unit must match the JVMs' log
clock and AMP's schedule clock; the current host uses `Etc/UTC`. The Dev
verification check handles a startup before midnight whose log continues into
the next day.

## Updating the helper

Once the administrator has installed `scripts/server-control-update.py` as
`/usr/local/sbin/tfmc-server-control-update` and allowed the deployment
account to run it with sudo, helper code changes no longer need root:

```sh
sudo /usr/local/sbin/tfmc-server-control-update <full commit on main>
```

It updates only the four modules under
`/usr/local/lib/tfmc-server-control/backend/src/servers/`, which run as the
service account. The commit must be on the TFMCWeb `main` branch with a
successful push Build run. The updater compiles the modules as root but never
imports or runs them as root. It refuses a commit that changes the service
unit or the updater itself; the administrator installs those as described in
[Host connection setup](#host-connection-setup). It also refuses while a
restart is running; a Main feature review waiting for staff does not block it.

When deploying a website that sends the fresh-check baseline, update the
helper to the same merged, Build-passing commit as part of the rollout. The
new helper accepts older website requests too. A new website talking to an
older helper refuses the update plan until the helper is updated; restart-only
plans continue to use the existing protocol. No Minecraft restart is required
to update the helper.

The updater backs up the old modules under
`/var/backups/tfmc-server-control/update-*` (the last ten are kept), restarts
the service and checks that both sockets answer with their scopes. If they
don't, or the update is interrupted, it puts the old modules back.
`/usr/local/lib/tfmc-server-control/SOURCE.json` records the installed commit,
and `/var/log/tfmc-server-control-update.log` records each attempt. Running it
with the commit that is already installed only records that commit.

## Scheduled restarts and recovery

The helper reads each server's schedule from AMP (`Core/GetScheduleData`, then
`Core/GetTimeIntervalTrigger` for each enabled time trigger that runs an
enabled task) and keeps it for five minutes. It rejects a start when the
restart would come within fifteen minutes of any of those tasks. A restart
reserves its countdown plus fifteen minutes: twenty for a normal Main restart,
fifteen for Dev or an emergency restart. Main's 05:30 and 05:55 warnings,
06:00 Stop, 06:02 backup and 06:10 Start block 05:15–06:25, and its 07:00
console task blocks 06:45–07:15. A schedule AMP can't return, or returns in
an unexpected shape, stops the restart with `schedule_unavailable`; so does an
empty schedule on Main or Dev (`scheduled` in their rules), which always have
timed tasks. Recheck other backup jobs and offline work before
confirming a restart.

Control state is under `/var/lib/tfmc-server-control/state/`.
Each plan has its immutable inventory, staged jars, `job.json` events and a
`backup/` folder holding displaced jars. `jobs.json` records the latest job
per server. Accepted plan IDs are never reused for another countdown, even
when a later job has completed. Expired unaccepted plans are removed when a
new plan is prepared; accepted job evidence/backups remain until an operator
archives them.

If a swap fails, the helper restores every changed plugin from what is on disk
then, since AMP can act on a call and still fail to answer: it moves any new
jar to AMP's trash and writes the original back from its backup unless the
original is still in place. It tries every plugin, each twice if needed, then
checks the folder against the original files. Maintenance stays enabled. If
that check fails, the job fails with `install_rollback_failed` and the plugins
folder needs fixing in AMP before the next restart; otherwise the job reports
the error that stopped the install. If the helper crashes or
the host reboots, active jobs are marked failed and never replayed. A
countdown interrupted by a helper restart announces cancellation when the
console is reachable. A crash during installation may require manual recovery.

Keep maintenance enabled while diagnosing. For a partial installation or a
data migration rollback, use Minecraft application Stop in AMP, confirm saves
and Java exit, restore the recorded old jars and consistent data backups as
needed, and use application Start. Do not stop/restart the AMP instance.
**Recheck and reopen** accepts either the complete planned set or the complete
recorded original set, provided the current server loaded it and startup
checks pass. A mixture never passes. A recheck after midnight reads that
startup from Paper's rotated log. If a countdown fails before maintenance
starts, players are told the restart is cancelled.

If new startup errors persist, **Recheck and reopen** continues to refuse.
The website does not offer an override for those errors. A deployment owner
with console access must investigate and verify the running plugins, changed
features and data before deciding whether to send `maintenance off` manually.
Then use **Mark failure handled** with the findings and reason. Resolving the
job alone leaves maintenance enabled and prevents a new plan until the server
is ready. Reopen requests allow up to two minutes for file checks and console
confirmation; a disconnected client should refresh job status before retrying.

**Mark failure handled** records a staff reason and releases the job lock. It
issues no console commands, restores no files and does not disable maintenance.
Use it only after manually handling the failure. A failed job on one server
does not block work on another, but active operations remain serialized. The helper's
journal is available with:

```sh
sudo systemctl status tfmc-server-control.service
sudo journalctl -u tfmc-server-control.service
```
