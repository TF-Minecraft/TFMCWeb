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
or `-`, `at` is not an ISO-8601 instant between 2020 and two days past the server's
clock, or `state`/`payload` is not an object. A record is refused if it has no
`endedAt` (epoch milliseconds), its fighters or sides are not lists of objects, or it
holds a non-finite number. Records outside a war (`warKey` null) are stored but never
shown.

Code: [`backend/src/wars/history_ingest.py`](../../../backend/src/wars/history_ingest.py),
routes in [`wars_routes.py`](../../../backend/src/api/wars_routes.py).

## Storage

| Table | Key | Holds |
| --- | --- | --- |
| `war_events` | `id` | Every event as sent: `realm_id`, `war_key`, `type`, `at`, `state`, `payload` |
| `war_battles` | `(realm_id, record_id)` | Every battle record as sent, with `war_key`, `battle_id`, `started_at`, `ended_at`, `raid` |
| `wars` | `(realm_id, war_key)` | Derived: the latest state, `status`, dates, `result` and the war list row (`summary`) |

`war_events` and `war_battles` are append-only. `wars` is recomputed from both whenever
one of its events or records arrives, under a row lock, so events and records may
arrive in any order and the row can always be rebuilt. Migration: `0006_war_history.sql`.

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
