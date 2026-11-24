# Patch note host jobs

Three systemd units on the TF server feed the patch notes on `www.tfminecraft.net`. They call www's API on
`127.0.0.1:8000` with the staff key from `/etc/tfmc/patchnotes.env` (root, mode 600, `STAFF_KEY` and
`API_BASE_URL`), and run a root-owned copy of
[`backend/src/patchnotes`](../../../backend/src/patchnotes), never the
site checkout.

| Unit | Runs | As | Sees |
| --- | --- | --- | --- |
| `tfmc-patchnotes-watch.timer` | `patchnotes.watch_plugins --once` every ten minutes | throwaway user (`DynamicUser`) | Main's `plugins` folder, read-only; state in `/var/lib/tfmc-patchnotes/` |
| `tfmc-patchnotes-weekly.timer` | `patchnotes.weekly_run` every ten minutes, offset by five | throwaway user | Main's `Backups` folder, read-only |
| `tfmc-patchnotes-rewrite.service` | `patchnotes.rewrite_worker`, always on | root | the Claude and Codex CLIs, the Codex login and Main's `Backups` (read-only) in `/root`; no `/home`, no Docker. Claude itself runs as `tfmc-patchnotes`, which cannot enter `/root` |

The watcher holds `CAP_DAC_READ_SEARCH` because some plugin files are `amp`'s and mode 600, so it can read any file
it can see. Its `/home` holds only the plugin folders and its `/var/lib` only its own state; the rest of the system is
read-only, with `/etc/shadow`, `/etc/ssh`, `/etc/ssl/private`, `/etc/tfmc`, the Docker socket and the logs hidden. The
weekly job has no extra rights: the backup zips are world-readable. Both time out after 30 minutes. The rewrite worker
stays root because the Codex login it uses belongs to root.

## Writers

The rewrite worker tries the writers in `PATCHNOTES_WRITERS` in order and uses the first that returns a usable answer.
The default is `claude:claude-opus-5-5,claude:claude-sonnet-5-5,codex:gpt-6.1-sol`. A writer that is not installed, not
signed in, out of usage or too slow is skipped, so the post is still written when one subscription ends. The journal
names the writer of each job and why earlier ones failed.

The weekly post is written in three passes by the same writer: a draft, a better version (what is missing, the reasons,
how it reads) and a check of every line. `number_check.py` gives the check each `Old --> New` that no change in the facts
or notes shows; those still there at the end are listed for staff in the review. In the check Claude may also
read Main's gameplay configs from the backup the facts end with. The weekly job keeps
them in `/var/lib/private/tfmc-patchnotes-configs/<week>`, so neither the worker nor Codex sees the backups.
`config_pack.py` lists which plugin folders, and leaves out discoveries, lore, player data and logins. If a later pass
fails or time is short, the version before it is used. The Friday run has 45 minutes, a run from Discord 14. The facts include the descriptions of the commits behind each plugin update,
without review rounds, hidden features or staff work.

- **Claude:** `npm install -g --prefix /usr/local @anthropic-ai/claude-code@<version>` as root, and `/etc/tfmc/patchnotes-claude.env`
  (root, mode 600) with `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token`, which lasts a year, or
  `PATCHNOTES_ANTHROPIC_API_KEY` from the Console. Remove the file and restart the worker to stop using it. It runs
  with no tools and an empty home.
- **Who Claude answers:** it runs on one person's own login, so it only writes the Friday post and answers
  `PATCHNOTES_CLAUDE_OWNER`, that person's Discord id, in the same file. The bot sends the id of whoever pressed Deny
  or ran a command. Everyone else's rewrites, and those from the website, go to Codex.
- **Out of usage on Friday:** when Claude hits its limit, the post waits and is tried again every hour until 15:15.
  After that Codex writes it. Staff can stop waiting with `/patchnotes write-post`. The review says who wrote the post.
- **Codex:** root's Codex login.

`PATCHNOTES_HIDDEN_WORDS` in `/etc/tfmc/patchnotes.env` is a comma-separated list of names players must not learn, kept
on the host because this repository is public. Files, entries and commits named after one are left out of the facts, and
any line of a post or rewrite that still names one is dropped. Commit descriptions and configs that contain one are left
out too, and without the list neither is used at all.

Staff notes are lines written for players when a change ships. The writer puts every one in the post. When the configs
end the week on another number, that final number is used and the note only gives the reason. Staff add them with
`/patchnotes note` in Discord, or on the host:

```bash
ps-compose main exec -T backend python -m src.patchnotes.player_note add --author staff "Horses run faster."
ps-compose main exec -T backend python -m src.patchnotes.player_note list
```

`PATCHNOTES_CLAUDE_EFFORT` (default `high`) and `PATCHNOTES_CODEX_EFFORT` (default `low`) set how hard they think.

## Updating the code

The copies live in `/usr/local/lib/tfmc-patchnotes/<commit>/patchnotes/`, and `current` points at the one in use.
`site-deploy` installs a new copy after a www deploy that changes `backend/src/patchnotes/`. By hand:

```bash
sudo tfmc-patchnotes-update <full commit on main>
```

[`tfmc-patchnotes-update`](../../../scripts/patchnotes-update.py)
refuses commits that are not on `main` or have no passing **Build**, and commits that change the updater or any of
the five unit files: install those by hand as below. It downloads the package's modules from GitHub (tests are left
out; any other file or folder in the package is refused), restarts the rewrite worker and needs it to stay up with the
same process for 20 seconds. Otherwise it puts the previous copy back, or stops the worker if there was none. The
timers pick up the new copy on their next run. It keeps the five newest copies and logs to
`/var/log/tfmc-patchnotes-update.log`; `site-deploy` also records a failed update in its own log.

## Installing

From a TFMCWeb checkout, as root:

```bash
install -m 600 /dev/null /etc/tfmc/patchnotes.env   # then set STAFF_KEY=..., API_BASE_URL=... and PATCHNOTES_HIDDEN_WORDS=...
useradd --system --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin tfmc-patchnotes
install -m 600 /dev/null /etc/tfmc/patchnotes-claude.env   # then set CLAUDE_CODE_OAUTH_TOKEN=... and PATCHNOTES_CLAUDE_OWNER=...
npm install -g --prefix /usr/local @anthropic-ai/claude-code@<version>
install -m 755 scripts/patchnotes-update.py /usr/local/sbin/tfmc-patchnotes-update
cp scripts/tfmc-patchnotes-*.service scripts/tfmc-patchnotes-*.timer /etc/systemd/system/
systemctl daemon-reload
tfmc-patchnotes-update <full commit on main>
systemctl enable --now tfmc-patchnotes-rewrite tfmc-patchnotes-watch.timer tfmc-patchnotes-weekly.timer
systemctl start tfmc-patchnotes-watch tfmc-patchnotes-weekly   # one run of each, to check
```

The account that runs `site-deploy` needs `NOPASSWD` sudo for `/usr/local/sbin/tfmc-patchnotes-update`. After a
change to the updater or a unit, repeat the `install`/`cp` lines and `systemctl daemon-reload` before updating.

Check them with `systemctl list-timers 'tfmc-patchnotes-*'` and `journalctl -u 'tfmc-patchnotes-*'`.
