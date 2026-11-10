# War history

SimpleFactions sends war events and battle records. The website stores them and shows a
report for every war at `/wars`, as a grand strategy game would show it: the two sides,
the score, the front, every battle and its losses, each faction's share, the heroes and a
chronicle.

**See also:** [wars-on-map.md](wars-on-map.md) (live war layers on the map) ·
[integrations/simplefactions.md](../integrations/simplefactions.md) (map uploads)

The data contract with SimpleFactions is the war history contract, v1: event types and
their payloads, `WarState`, `FactionRef` and the battle record fields. This page covers
the website side.

## Ingest

| Route | Body | Reply |
| --- | --- | --- |
| `POST /wars/plugin/events` | `{"realm_id": "main", "events": [Event, ...]}` | `{"acked": [id, ...]}` |
| `POST /wars/plugin/battles` | `{"realm_id": "main", "records": [BattleRecord, ...]}` | `{"acked": [id, ...]}` |

Both need the plugin key (`X-Plugin-Key`, added by TFMCWeb's gateway). A missing
`realm_id` means `main`. SimpleFactions keeps an outbox and resends until an item is
acked, so:

- an id already stored is ignored and acked again, even if the body changed;
- a malformed item is logged, acked and listed under `"rejected": [{"id", "reason"}]`,
  so one bad line cannot block the queue (an item with no usable id is listed with
  `"id": null`);
- only an unusable request is refused (400): no list, an invalid `realm_id`, more than
  200 items, or a body over 8 MiB.

An event is refused if its `type` is unknown, `war_key` is not 1-64 letters, digits, `_`
or `-`, `at` is not an ISO-8601 instant from 2020 to before 2100, or `state`/`payload` is
not an object. `at` may be ahead of real time: events carry SimpleFactions' campaign
clock, which staff on Dev can move forward. A record is refused if it has no
`endedAt` (epoch milliseconds), its fighters or sides are not lists of objects, or it
holds a non-finite number. A field SimpleFactions leaves out (its Gson skips nulls) reads
as null. Records outside a war (`warKey` null) are stored but never shown.

Code: [`backend/src/wars/history_ingest.py`](../../../backend/src/wars/history_ingest.py),
routes in [`wars_routes.py`](../../../backend/src/api/wars_routes.py).

## Storage

| Table | Key | Holds |
| --- | --- | --- |
| `war_events` | `id` | Every event as sent: `realm_id`, `war_key`, `type`, `at`, `state`, `payload` |
| `war_battles` | `(realm_id, record_id)` | Every battle record as sent, with `war_key`, `battle_id`, `started_at`, `ended_at`, `raid` |
| `wars` | `(realm_id, war_key)` | Derived: the latest state, `status`, dates, `result` and the war list row (`summary`) |
| `war_notifications` | `id` | The Discord bot's outbox; see [Discord notifications](#discord-notifications) |
| `war_actions` | `id` | Votes and call to arms answers waiting for SimpleFactions; see [War actions](#war-actions) |

`war_events` and `war_battles` are append-only. `wars` is recomputed from both whenever
one of its events or records arrives, under a row lock, so events and records may
arrive in any order and the row can always be rebuilt. Migration: `0006_war_history.sql`.

`war_events.notify` (migration `0007_war_notifications.sql`) keeps the private `notify`
object of a `war_declared` event: `{"defender_accounts": [account uuid, ...]}`, the
accounts that play a member of a defending faction. No read returns it; it only turns
into Discord DMs. An event whose `notify` is not an object is rejected.

`war_events.private` (migration `0008_war_actions.sql`, contract v1.3) keeps any event's
private `private` object: `voting` (the open vote, the eligible accounts, everyone's
votes and the tally) and, on `call_to_arms_sent`, `notify.leader_account`. `wars.private`
holds the newest `voting` block of the war (by event `at`) with the time PS received it.
No public read returns either. `private` may be up to 512 KiB per event; the 8 MiB body
limit still applies to the whole batch.

## Public reads

| Route | Returns |
| --- | --- |
| `GET /{map}/wars` | `{"map_id", "wars": [...]}`, newest first |
| `GET /{map}/wars/{war_key}` | The war page model |
| `GET /{map}/wars/{war_key}/battles/{record_id}` | One battle report |

All three follow the map's access rules (`ensure_map_access`): the dev map is
staff-only. The realm comes from the map registry. Code:
[`war_history_routes.py`](../../../backend/src/api/war_history_routes.py),
[`history_reads.py`](../../../backend/src/wars/history_reads.py) and the pure model in
[`history_model.py`](../../../backend/src/wars/history_model.py).

### How the page model is built

- **State** is the `WarState` of the latest event. Only the contract's fields are
  published. Anything else SimpleFactions sends is dropped.
- **Battles.** A `battle_resolved` event becomes a battle, and the battle record it
  names (`record_id`) adds the battle's name, times, lives and fighters per side. The
  event's deaths and regiments win. A record no event names becomes a battle of its own:
  raids (`kind: "raid"`, no number) and backfilled battles.
- **Score.** Battles won counts every battle except raids. Deaths and regiments lost sum
  every battle. Occupation and route length come from the state.
- **Participants.** There is one row per faction per side. Rows start from the state's
  sides, and calls to arms from `participant_joined` are added. Fighters are grouped by
  `factionId`. Fighters with `hirerFactionId` form a separate row with
  `role: "mercenary"` and `mercenary: true` under their hirer ("Mercenaries of …").
  Records from before `factionId` existed group by the faction's display name and join
  the state's row of that name. Regiments lost come from the `battle_resolved` events.
- **Top fighters** are summed across the war's records by character. The list keeps the
  ten with the most kills and the five with the most damage and healing.
- **Timeline** has one plain sentence per event, in server time (dd/mm/yyyy, CET/CEST).
  A battle known only from its record adds a `battle_recorded` entry.
- **Province names** come from the map's settlement and installation markers, the names
  its war pins use. The name is `null` when no marker names the province.
- **Wars with no events** (backfilled with `/war admin history upload-battles`) read as
  `status: "ended"`, `state: null`, named after the record's `warName`, and numbered by
  battle order.

Fighter `key`s are character ids that embed the account UUID. They are used only to sum a
character across battles and never appear in a reply.

### `WAR_FIGHTER_STATS_PUBLIC`

Backend env, default on. Set it to `false` (or `0`, `no`, `off`) to omit `top_fighters`
from the war page and `fighters` from battle reports. The per-faction totals stay. The
replies carry `fighter_stats_public` so the pages can say why the tables are missing.

## Discord notifications

The tfmc_bot `geopolitics` cog posts each war in the geopolitics channel, keeps one
thread per war for its updates and DMs the defenders. The ingest writes the rows it
polls, in the same transaction as the event and only for a newly stored event, so a
resent event never posts twice. Code:
[`notifications.py`](../../../backend/src/wars/notifications.py).

| Kind | From event | Payload (besides `war_key`, `war_name`, `at`, `url`, `summary`) |
| --- | --- | --- |
| `war_declared` | `war_declared` | `goal`, `goal_label`, `war_type`, `civil_war`, `attacker`/`defender` (`name`, `rgb` of the side leader), `sides` (`name`, `role`, `role_label`, `rgb` per member), `buildup`, `day_vote_closes_at` |
| `ally_joined` | `participant_joined` | `faction`, `faction_rgb`, `side`, `side_name`, `role`, `role_label` |
| `battle_day_set` | `day_vote_closed` | `battle_day`, `quorum` |
| `battle_scheduled` | `battle_scheduled` | `scheduled_at`, `province_id`, `province_name`, `kind`, `kind_label` |
| `battle_postponed` | `battle_postponed` | `battle_day` |
| `battle_result` | `battle_resolved` | `battle_number`, `province_id`, `province_name`, `kind`, `kind_label`, `resolution`, `resolution_label`, `winner`, `winner_name`, `winner_rgb`, `loser_name`, `attacker`, `defender`, `deaths`, `regiments_lost` (per side), `lives`, `top_fighters`, `record_id`, `report_url` |
| `war_ended` | `war_ended` | `reason`, `reason_label`, `winner`, `winner_name`, `winner_rgb`, `truce_until` |
| `defender_dm` | `war_declared` | One row per Discord user: `discord_user_id`, `war_key`, `war_name`, `attacker_name`, `defender_name`, `goal_label`, `day_vote_closes_at`, `url` |
| `call_to_arms_dm` | `call_to_arms_sent` | `discord_user_id`, `war_key`, `war_name`, `at`, `caller_name`, `caller_rgb`, `target_faction_id`, `target_name`, `side`, `enemy_name` (the other side's leader), `coalition`, `url`. No `summary`. |

- `next_battle_day`, `votes_changed` and `call_to_arms_closed` give no notification.
- **Call to arms DMs** (v1.3) go to the Discord user linked to `private.notify.leader_account`
  of a `call_to_arms_sent` event, only in `WAR_NOTIFY_DM_REALMS`. The bot's Accept and
  Decline buttons queue a [war action](#war-actions).
- **DMs** go to the Discord users linked (`discord_links`) to the event's
  `notify.defender_accounts`. Accounts with no link, and links whose user left the
  guild (`left_guild_at` set), are skipped.
- **Top fighters** are the battle record's three fighters with the most kills
  (`name`, `side`, `faction`, `kills`, `deaths`). They are `null` when
  `WAR_FIGHTER_STATS_PUBLIC` is off or the record has not arrived yet; the row is not held
  back for it.
- **Links**: `url` is the war page and `report_url` the battle report (null with no
  record). The site is `PUBLIC_SITE_URL`, else `SITE_PUBLIC_URL`, else
  `https://www.tfminecraft.net`. `?map=<map>` is added when the realm's map is not the
  site's default map, so Dev wars link to `?map=dev` on www.
- Instants are ISO-8601 UTC; the bot renders them as Discord timestamps.
- A failure while building a realm's notifications is logged and skipped (a savepoint),
  never losing the event.

### Settings

| Env | Default | Meaning |
| --- | --- | --- |
| `WAR_NOTIFY_REALMS` | `main,dev` | Realms that get rows, comma separated. Set it empty to write none. |
| `WAR_NOTIFY_DM_REALMS` | `main` | Realms whose defenders get a `defender_dm` and whose called leaders get a `call_to_arms_dm`. Dev is left out, so test wars never message real players. |
| `PUBLIC_SITE_URL` | `SITE_PUBLIC_URL` | Base of the links in the posts |

### Routes

Both need the staff key (`X-Staff-Key`).

| Route | Body | Reply |
| --- | --- | --- |
| `GET /wars/staff/notifications?limit=50&realm=main` | | `{"notifications": [{"id", "realm_id", "war_key", "event_id", "kind", "created_at", "payload"}]}` |
| `POST /wars/staff/notifications/ack` | `{"ids": [1, 2]}` | `{"acked": [ids that exist]}` |

The poll returns undelivered rows oldest first (`limit` 1-200, default 50) and stamps
`dispatched_at`. A row handed out but not acked within 10 minutes is offered again. The
optional, repeatable `realm` keeps the poll to those realms. The bot acks a row once
Discord accepted the post, or after a permanent failure, so one bad row cannot block the
queue.

## War actions

Contract v1.3. Players vote on the first battle day and the battle hour on the war page,
and leaders answer a call to arms on the war page or from the bot's DM. Every action is
queued in `war_actions` for the Minecraft account it is made for; SimpleFactions polls the
queue, applies each action with exactly the in-game rules, and reports `applied` or
`rejected` with a player-facing reason. Code:
[`actions.py`](../../../backend/src/wars/actions.py).

- **Accounts.** The website maps the signed-in Discord user, and the bot the clicking
  Discord user, to a Minecraft account through `discord_links`.
- **Kinds and payloads:** `call_to_arms_answer` `{"target_faction_id", "accept": bool}`,
  `day_vote` `{"picks": ["2026-11-17", ...]}`, `hour_vote` `{"picks": [21, 22]}`. Picks are
  stored as a set in the vote's option order; `[]` clears the account's picks.
- **Statuses:** `pending`, then `applied` or `rejected` (with `reason`) from the plugin, or
  `expired` when still pending 10 minutes after creation. A new vote of the same account,
  war and kind expires its still-pending one (`reason` "Replaced by a newer vote.").
- **Up-front refusals.** The website refuses what PS's latest private state already shows:
  a closed vote (`kind` null, `closes_at` passed, or the war ended), an account not in
  `eligible`, a pick that is not an option, or no open call to that faction. The plugin
  checks everything again. The bot's route does not check the call; the plugin's reason is
  what the DM shows.
- **Open calls** come from the war's events: `call_to_arms_sent` opens a call per target
  faction; `call_to_arms_closed`, the target's `participant_joined` or `war_ended` closes it.
  `/me` lists the open calls whose `leader_account` is the user's account.
- **Rate limit:** 30 actions per account per 10 minutes (429).

### Website routes

Session cookie (Discord sign-in) and the map's access rules. Writes need the site's own
`Origin` (`require_same_origin`) and are refused while staff view the site as a player.

| Route | Body | Reply |
| --- | --- | --- |
| `GET /{map}/wars/{war_key}/me` | | See below; `Cache-Control: no-store` |
| `POST /{map}/wars/{war_key}/vote` | `{"kind": "day" \| "hour", "picks": [...]}` | `{"action": Action}` |
| `POST /{map}/wars/{war_key}/call-to-arms` | `{"target_faction_id", "accept": bool}` | `{"action": Action}` |

`Action` is `{"id", "kind", "status", "reason", "source", "payload", "created_at", "applied_at"}`.
Errors: 401 `not_signed_in`, 409 `minecraft_not_linked`, 403 "Only members of the warring
factions vote.", 409 "This vote is closed.", 400 for a bad pick, 409 "Your faction has no
call to arms in that war.", 429.

`/me` (signed out it still answers, with `signed_in: false`):

```json
{
  "signed_in": true, "linked": true, "eligible": true, "side": "attacker",
  "vote": {"kind": "day", "options": ["2026-11-17", ...], "option_labels": ["Tue 17/11", ...], "closes_at": "..."},
  "picks": ["2026-11-18"],
  "tally": [{"option": "2026-11-17", "attacker": 2, "defender": 1}, ...],
  "actions": {"day_vote": Action | null, "hour_vote": Action | null, "call_to_arms_answer": Action | null},
  "calls_to_arms": [{"caller": FactionRef, "target": FactionRef, "side": "attacker", "coalition": false, "action": Action | null}]
}
```

- `vote` is null when no vote is open. Signed-out, unlinked and ineligible users get only
  `{"kind", "closes_at"}`, and `picks` and `tally` null.
- `picks` are the account's own: from the latest private state, or from its newest applied
  vote when that was applied after the state arrived (the plugin's next `votes_changed`
  is still on its way).
- A call's `action` is the newest answer to that call; an answer from before the call was
  sent is left out.

### Plugin routes

Plugin key (`X-Plugin-Key`).

| Route | Body | Reply |
| --- | --- | --- |
| `GET /wars/plugin/actions/pending?realm=main&limit=50` | | `{"actions": [{"id", "war_key", "kind", "account_uuid", "source", "payload", "created_at"}]}` |
| `POST /wars/plugin/actions/applied` | `{"results": [{"id", "status": "applied" \| "rejected", "reason"}], "realm_id"?}` | `{"acked": [ids], "rejected"?: [{"id", "reason"}]}` |

The poll returns pending rows oldest first (`limit` 1-200) and stamps `delivered_at`. A
row handed out is offered again 30 seconds later until a result arrives or it expires,
so a lost `/applied` is retried; the plugin answers a repeat from its applied cache. The
first result for a row wins. An expired row still takes a result. Unknown ids and malformed
results are listed under `rejected`; the rest are stored.

### Bot routes

Staff key (`X-Staff-Key`).

| Route | Body | Reply |
| --- | --- | --- |
| `POST /wars/staff/actions` | `{"realm", "discord_user_id", "war_key", "kind": "call_to_arms_answer", "payload": {"target_faction_id", "accept"}}` | `{"id", "status": "pending"}` |
| `GET /wars/staff/actions/{id}` | | `{"id", "realm_id", "war_key", "kind", "status", "reason", "created_at", "applied_at"}` |

409 `discord_not_linked` when the Discord user has no link, 404 for an unknown war or
action, 400 for another kind or a bad payload.

## Pages

| Path | Shows |
| --- | --- |
| `/wars` | Wars in progress and concluded wars, as cards: sides, status, score strip, dates |
| `/wars/{warKey}` | Banner header, momentum and score, the front, battle ledger, casualty charts, participants, heroes, chronicle |
| `/wars/{warKey}/battles/{recordId}` | Battle report: lives left, per-faction breakdown, sortable fighter table |

The pages read `main` by default, and `?map=` picks another map. The charts are hand-drawn
SVG, and their maths is in
[`frontend/lib/wars/`](../../../frontend/lib/wars) with Vitest tests.

**Momentum** is 50% from the share of battles won, 30% from the ground taken along the
route (the attacker's provinces taken less the defender's, over the route length) and 20%
from the share of the enemy's deaths in all deaths. A part with nothing to compare counts
as even.

## Local preview

`backend/scripts/seed_war_history.py` posts the sample war batches
(`backend/src/wars/history_sample.py`) to a running backend. The sample holds a war in
progress, an ended war and a war known only from battle records:

```sh
python backend/scripts/seed_war_history.py --api http://127.0.0.1:8000 --plugin-key dev-plugin-key
```

The frontend test `frontend/app/wars/WarPages.test.tsx` renders all three pages from the
same sample model (`frontend/lib/wars/sampleWar.json`).
