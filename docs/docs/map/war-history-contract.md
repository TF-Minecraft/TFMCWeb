# War history data contract (SimpleFactions -> ProvinceSystem), v1

SimpleFactions (SF) sends war events and battle records to ProvinceSystem (PS). PS stores them and renders public war pages. Both sides must follow this file exactly.

## Transport

- SF -> PS through TFMCWeb's gateway (`GatewayClient.request(method, path, json)` in SF, `X-Plugin-Key` added by TFMCWeb). SF includes `realm_id` in each body, read by reflection from TFMCWeb (`TFMCWeb.getRealmId()`); PS also accepts a missing `realm_id` as `main`.
- **SF keeps an outbox**: append-only JSONL under `plugins/SimpleFactions/WarHistory/outbox.jsonl`. An async sender posts batches (max 50 items) every 10s and removes only acked items. Warn in the log past 10,000 pending lines. Never call the network on the main thread.
- **Idempotent**: every event has a UUID `id`; every battle has its `record.id`. PS ignores ids it already has but still acks them.

### Endpoints (PS, all `require_plugin_key`)

| Method | Path | Body | Reply |
| --- | --- | --- | --- |
| POST | `/wars/plugin/events` | `{"realm_id": "main", "events": [Event, ...]}` | `{"acked": ["<event id>", ...]}` |
| POST | `/wars/plugin/battles` | `{"realm_id": "main", "records": [BattleRecord, ...]}` | `{"acked": ["<record id>", ...]}` |

A malformed item is logged and acked so it cannot block the queue; the reply lists it under `"rejected": [{"id": ..., "reason": ...}]`.

Public reads (PS, `ensure_map_access` on the map; realm from `maps.yml`):

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/{map}/wars` | list of wars, newest first: key, name, goal, status, sides (leaders + counts), started_at, ended_at, result, battles won per side, total deaths per side |
| GET | `/{map}/wars/{war_key}` | the war page model (below) |
| GET | `/{map}/wars/{war_key}/battles/{record_id}` | one battle with fighters (fighters omitted when `WAR_FIGHTER_STATS_PUBLIC=false`) |

## Shared shapes

**FactionRef**
```json
{"id": "aureate", "founded_at": 1730000000, "name": "The Aureate Coterie", "name_raw": "#c9a227The Aureate Coterie", "rgb": "201,162,39"}
```
`name` has §/hex codes stripped; `name_raw` keeps them. `founded_at` is epoch seconds (FactionData "founded at"); `(id, founded_at)` is the stable identity (ids are reused). `rgb` may be null.

**Participant** = FactionRef + `"role"`: one of `leader` (side leader), `main` (extra civil-war main), `subject`, `ally`, `coalition`, `backer`; and `"joined_at"`: ISO instant or null (null = at declaration).

**WarState** (a snapshot of the war at the moment of the event; PS keeps the latest one per war)
```json
{
  "name": "War of the Aureate Succession", "name_raw": "...",
  "goal": "de_jure_annex", "war_type": "conquest", "civil_war": false,
  "status": "active",
  "schedule_phase": "buildup",
  "campaign_phase": "invasion",
  "buildup": true,
  "day_vote_closes_at": "2026-11-13T09:50:00Z",
  "battle_day": null,
  "scheduled_at": null,
  "route_length": 9,
  "objective_province_id": 1234,
  "objective_held_by": "defender",
  "occupied_by_attacker": 0,
  "occupied_by_defender": 0,
  "battles_fought": 0,
  "initiative": {"attacker": 6, "defender": 4, "holder": "attacker"},
  "sides": {"attacker": [Participant, ...], "defender": [Participant, ...]}
}
```
Enum values are the lower-case `toJson()` forms SF already uses (`BattleSchedulePhase`, `CampaignPhase`, `WarGoalType`, `WarType`); side/role values are lower-case. Leaders are listed first.

**Event**
```json
{"id": "uuid", "war_key": "w3-1762771200", "type": "war_declared", "at": "2026-11-10T09:50:00Z", "state": WarState, "payload": {...}}
```
`war_key` = `"w" + warId + "-" + startedAt.getEpochSecond()`, the same as `BattleRecord.warKey`.

| type | sent when (SF) | payload |
| --- | --- | --- |
| `war_declared` | `WarManager.announceAndPersist` (declared and civil wars) | `{}` |
| `participant_joined` | call to arms accepted (`CallToArmsService.accept`) | `{"faction": FactionRef, "side": "attacker", "role": "ally"}` |
| `day_vote_closed` | `BuildupService.setFirstBattleDay` | `{"battle_day": "2026-11-19", "quorum": true}` |
| `battle_scheduled` | `BattleScheduleService.scheduleBattleAtProvince` / `markScheduledAtProvince` | `{"scheduled_at": "...", "province_id": 77, "kind": "field"}` |
| `battle_postponed` | `BattleScheduleService.postpone` and `skipBattleDay` | `{"battle_day": "2026-11-20"}` |
| `battle_resolved` | `CampaignBattleOutcomeService.applyCampaignBattleOutcome` after casualties are applied | see below |
| `next_battle_day` | `BattleScheduleService.openVote` (the hour vote opens on a battle day) and `catchUpStaleBattleDay` | `{"battle_day": "2026-11-19"}`. Added in v1.1: keeps the latest state's battle day current between battles. No timeline entry. |
| `war_ended` | `WarManager.endWar`, before the war file is deleted | `{"reason": "attacker_victory", "winner": "attacker", "truce_until": "..."}` (winner null for white peace/admin end) |

`battle_resolved` payload:
```json
{
  "battle_number": 3,
  "province_id": 77, "kind": "field", "leg": "invasion",
  "winner": "attacker",
  "resolution": "fought",
  "battle_id": "w3-field-77", "record_id": "w3-field-77-1763588400000",
  "deaths": {"attacker": 23, "defender": 31},
  "lives": {"attacker": {"left": 12, "max": 40}, "defender": {"left": 0, "max": 45}},
  "regiments_lost": [
    {"faction": FactionRef, "side": "defender", "regiment": "pikemen", "regiment_name": "Pikemen", "count": 2}
  ]
}
```
- `resolution`: `fought` (a live battle ended), `autoresolve`, `forfeit` (offensive could not attack), `naval_default` (attacker had no berthed navy), `staff` (`/war admin schedule winbattle`).
- `record_id`/`battle_id`/`lives` are null when there was no live battle. `deaths` comes from the battle's side casualty ledger (fought) or the autoresolve result; `{"attacker":0,"defender":0}` otherwise.
- `regiments_lost` is gathered in `BattleCasualtyService` at every real debit (own regiments and levy sources), summed per (faction, regiment).

Raids produce battle records (`raid: true`) but no `battle_resolved` event.

**BattleRecord** (POST `/wars/plugin/battles`): exactly SF's existing `war/stats/BattleRecord` Gson JSON (camelCase field names as SF writes them), with these additions:
- `FighterStats.factionId` and `FighterStats.factionFoundedAt` (the fighter's own faction at first sight, null if none), `FighterStats.hirerFactionId` (set when the fighter served as a hired mercenary, else null).
- `BattleRecord.provinceId` (null if unknown).
Records are sent when saved (`BattleStatsArchive.save`), and `/war admin history upload-battles` queues every archived record (backfill; records from before the additions simply lack them).

## PS war page model (`GET /{map}/wars/{war_key}`)

```json
{
  "war_key": "...", "state": WarState, "status": "active|ended",
  "started_at": "...", "ended_at": null, "result": {"reason": "...", "winner": "attacker"} | null,
  "score": {"battles_won": {"attacker": 2, "defender": 1}, "occupation": {"attacker": 3, "defender": 0, "route_length": 9}, "deaths": {"attacker": 80, "defender": 112}, "regiments_lost": {"attacker": 9, "defender": 14}},
  "timeline": [{"at": "...", "type": "...", "summary": "plain-text line", "payload": {...}}],
  "battles": [{"battle_number": 1, "at": "...", "province_id": 77, "province_name": "Ashford", "kind": "field", "winner": "attacker", "resolution": "fought", "record_id": "...", "deaths": {...}, "lives": {...}, "regiments_lost": {"attacker": 3, "defender": 5}, "fighters": {"attacker": 18, "defender": 21}}],
  "participants": [{"faction": FactionRef, "side": "attacker", "role": "leader", "joined_at": null,
                    "fighters": 12, "kills": 40, "deaths": 31, "damage": 1234.5, "healing": 320.0, "regiments_lost": 6,
                    "share_of_side_kills": 0.42}],
  "top_fighters": [{"name": "...", "faction": "...", "side": "...", "kills": 9, "deaths": 2, "damage": 400.0, "healing": 0.0}]
}
```
`province_name` is resolved by PS from its map data (null if unknown). Per-participant fighter numbers group fighters by `factionId`, or by `hirerFactionId` for mercenaries (shown as "Mercenaries of <faction>" in the participant row). Battle records without `factionId` (backfill) group by the fighter's `faction` display name. `top_fighters` and per-fighter tables are omitted when `WAR_FIGHTER_STATS_PUBLIC=false`.

Wars known only from backfilled battle records (no events) appear with `state: null`, `status: "ended"`, name from `warName`, and the battle tables.

## Never published
Regiment counts or pools, committed regiments, vehicle pools, levies, treasuries, upkeep, raid musters/warbands before a raid starts, individual votes, unanswered/declined calls to arms. Account UUIDs never appear in public replies (fighter `key` is a character id; omit it from public replies too).

## SF deviations

Written by the SimpleFactions side (branch `feat/war-history`). Everything not listed here is implemented as written above.

1. **Battle records outside a war are not sent.** A `BattleRecord` with `warKey: null` (a battle not tied to a war, such as a staff or practice battle) stays local; only records with a `warKey` go to `POST /wars/plugin/battles`, both on save and in `/war admin history upload-battles`. Raid records of a war are sent (`raid: true`), as written.
2. **Null fields in battle records are omitted, not written as `null`.** Records are the exact Gson JSON SF saves under `BattleStats/`, and that Gson skips nulls. So `factionId`, `factionFoundedAt`, `hirerFactionId`, `provinceId`, `warKey`, `winner` and the like are absent when unknown. Read a missing field as null. Events (and their `state`/`payload`) do write explicit `null`s.
3. **Battle record batches hold at most 10 records** (events: at most 50). This stays within "max 50 items" but keeps a post with many fighters small.

Clarifications (no change to the contract, but worth knowing):

- `at` on events is SF's campaign clock (`CampaignClock.now()`), truncated to whole milliseconds (for example `2026-11-10T09:50:00.123Z`). On Main it is real time; on Dev staff can move it forward with `/war admin time`, so Dev timestamps may be in the future. Other instants (`day_vote_closes_at`, `scheduled_at`, `joined_at`, `truce_until`) are plain ISO instants and may have no fraction.
- `founded_at` is `null` for a faction that never got a founding stamp (stored as 0).
- `battle_resolved.kind` is the active schedule slot's kind (`field`, `siege`, `naval`, `naval_invasion`); it falls back to `field` when no slot matches. `battle_scheduled.kind` works the same. `battle_scheduled.scheduled_at` can be `null` when staff put a war into the scheduled phase without a start time.
- `battle_resolved.battle_number` is `battles_fought` before the battle plus one; a battle with no winner does not advance `battles_fought`, so the next battle can repeat the number.
- `battle_resolved.regiments_lost[].regiment_name` has its colour codes stripped. A regiment counts once per (faction, side, regiment); levied regiments count against the faction that lent them.
- `battle_resolved.lives` is keyed by war side (`attacker`/`defender`), mapped from the battle's sides; the battle's attacking side can be the war's defenders in a counter-push. `deaths` is mapped the same way.
- `war_ended` is sent after the war is marked ended, so its `state.status` is `"ended"`. For a civil war, `truce_until` is the host's civil war cooldown (the rebels are a temporary faction). `civil_war` stays `true` in that snapshot.
- `participant_joined` comes only from an accepted call to arms; its `role` is `ally` or `coalition`. Factions present at declaration (including civil war backers and extra mains) have `joined_at: null`.
- `hirerFactionId` is taken when the battle record is saved, from the contracts active at that moment.
- `realm_id` is left out of the body when TFMCWeb reports no realm (the post itself then fails, since it goes through TFMCWeb).

## PS deviations

Written by the ProvinceSystem side (branch `feat/war-history`). The ingest replies, event types, payloads and record fields are implemented as written above; everything here is either an addition to the public read shapes or a stated PS rule. Nothing here asks SF to change.

1. **Raids are battles in the page model.** A record with `raid: true` (no `battle_resolved` event) appears in `battles` with `kind: "raid"`, `battle_number: null`, `resolution: "fought"`, `regiments_lost: null`. Raids add to `score.deaths` but not to `score.battles_won`. Any other record no event names (a backfill) becomes a battle the same way, with `kind` = the record's `type` in lower case.
2. **Battle entries carry more fields**: `leg`, `raid`, `name` (the record's battle name), `battle_id`, `started_at`, `ended_at`. `fighters` is `null` when there was no live battle (no record), and `regiments_lost` is `null` when it is known only from a record. In a war with no `battle_resolved` events, record battles are numbered 1..n in time order, raids excluded.
3. **Mercenary rows use `role: "mercenary"`** (a value the Participant enum lacks) and `mercenary: true`. `faction` is the hirer's FactionRef. A faction that fought without being a listed participant gets a row with `role: null`. A backfilled row grouped by display name has `faction.id: null` unless the name matches a state participant on that side.
4. **Page model additions**: `map_id`, `name`, `name_raw` (from the state, or else the record's `warName`), `objective_province_name`, `fighter_stats_public`. `top_fighters` entries add `hired_by` (the hirer's name or null) and `battles`, and the list holds the 10 with the most kills plus the 5 with the most damage and the 5 with the most healing.
5. **Timeline**: a battle known only from its record adds an entry of type `battle_recorded`. Each `payload` is cleaned per event type: only the contract's fields, with FactionRefs normalised and `regiments_lost` rows kept.
6. **Public state is whitelisted.** Only the WarState fields in this contract are returned, so a field SF adds later stays private until PS lists it. `occupied_by_*` sent as lists are returned as counts.
7. **List rows** (`GET /{map}/wars` → `{"map_id", "wars": [...]}`) add `name_raw`, `war_type`, `civil_war`, `known_from_records_only`, `score`, `battle_count` and `phase` (`schedule_phase`, `campaign_phase`, `buildup`, `day_vote_closes_at`, `battle_day`, `scheduled_at`). `sides.<side>` is `{"leaders": [FactionRef], "count": n}`. A war known only from records names each side after its faction with the most fighters.
8. **`WAR_FIGHTER_STATS_PUBLIC=false`** removes the `top_fighters` and `fighters` keys (it does not set them to null). Per-faction totals stay.
9. **Ingest limits**: at most 200 items per request and 8 MiB per body; past either the request is refused (400 / 413). An event `at`, or a record `startedAt`/`endedAt`, outside 2020-01-01 to 2100-01-01 is rejected. Later times are accepted for Dev's campaign clock. An item with no usable id string is listed in `rejected` with `"id": null` and cannot be acked. A malformed id that is still a string (up to 1024 chars) is acked as sent.
10. **Event ids are unique across realms.** `war_events.id` is the primary key, so an event id resent under another realm is ignored as already stored. Battle records are keyed by `(realm_id, record id)`.
