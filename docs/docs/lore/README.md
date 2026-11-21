# Lore panel

A staff-only workspace at `/lore` where the lore team keeps characters, organisations, storylines, events and lore locations, plans events against helper availability, and reaches places on the map. Everything is entered by hand. Pickers create a missing record inline, and every record links to the others and shows what mentions it.

**Status:** on for dev.tfminecraft.net only, for the lore lead's review. Production keeps it off (see [Flag](#flag)).

## Access

| Who | Read | Add and edit | Manage the team |
|-----|------|--------------|-----------------|
| Website staff (`roles.is_staff`) | Yes | Yes | Yes |
| Lore team lead (`lore_members.is_lead`) | Yes | Yes | Yes, but not to remove or demote themself |
| Lore Helper (`lore_members`) | Yes | Yes | No (read-only team page) |
| Anyone else | No | No | No |

- The Lore Helper roster lives in `lore_members` and is managed on `/lore/team`. There is no LuckPerms lore group.
- Signed-out visitors get 401 and other players 403. The header's **Lore** link only shows when `GET /lore/access` returns `access: true`.
- Writes also need the site's `Origin`, and the view-as-player guard blocks them.
- Only the roster can be assigned to events or notified. The roster is the lore members plus staff who have saved their availability or settings once.

## Flag

`backend/src/lore/flag.py`: `LORE_PANEL=1|true|yes|on` turns it on and `0|false|no|off` turns it off. When unset, it is on unless `PS_PRODUCTION=1`.

When off, every `/lore/*` route returns 404 except `GET /lore/access`, which returns `{"enabled": false, "access": false}`. The pages then show "not available". The frontend has no build-time flag.

The `0012_lore_panel.sql` migration still runs everywhere, so production gets the empty tables at its next deploy.

## Pages

| Path | What it does |
|------|--------------|
| `/lore` | Upcoming events (14 days), ideas and "waiting on" events, recent edits, and a quick-set for my next 7 days |
| `/lore/characters`, `/[id]` | Profiles: status, summary, notes, a face (uploaded skin, linked Minecraft name, or a player character's worn skin), affiliations, relations, storylines, events, backlinks and history |
| `/lore/organisations`, `/[id]` | Factions and organisations: kind, game faction, members with roles, relations, backlinks and history |
| `/lore/storylines`, `/[id]` | Status, involved characters, organisations and locations, and the ordered event list with inline "add event" |
| `/lore/events/[id]` | Date with each roster member's availability for that day, optional start time (in my time zone, with CET and EST shown), or "waiting on"; location, characters, helpers, outcome and history |
| `/lore/calendar` | Month grid with events and Full/Partial counts, a day panel, unscheduled events, my weekly defaults, day and week overrides, notification mode and time zone |
| `/lore/map` | Lore locations on the main map. Clicking a pin copies `/tp x y z` (`~` when y is unset). Locations are added by clicking the map. |
| `/lore/team` | Roster, leads, add and remove |
| `/lore/deleted` | Restore soft-deleted records |

Character, organisation, storyline and event pages open to read. **Edit** in the header switches to the form, and **Done** saves and goes back to reading. Delete only shows while editing. A record made with a quick-create box opens in edit mode (`?edit=1`, dropped from the address once read).

Times are shown and entered in the time zone saved on the calendar page, else the browser's. The overview's "today" follows the same zone.

## Player characters

Pickers that link characters (storylines, events, affiliations, relations) also list players' RPCharacters characters from `character_roster`. The realm is the site's `PROFILE_REALM_ID` (`main` on www, `dev` on Dev). With nothing typed, living ones fill the list after the lore records; dead ones come last. They're tagged **Player** and come from `GET /lore/search?players=true`, with `id: 0` and `player: {uuid, character_id}`. Picking one calls `POST /lore/player-characters`, which creates the lore character linked to it (or reuses the existing one), so every link still points at a lore character.

- The new character takes the roster name, its status (`DEAD` → `dead`, else `active`) and the player. After that the lore team edits it like any other character; roster changes don't overwrite it.
- Its player can't be changed or unlinked (409 `player_character_linked`). Its page shows the roster's current name, race, class and status.
- Its face is an uploaded skin, else the skin the character wears in game, else the player's head.
- If its lore character was deleted, adopting returns 409 `player_character_deleted`; restore it from Deleted instead.
- Search hides roster characters that already have a live lore character, since that one shows as a normal result.

Long-text fields (`summary`, `notes`, `outcome`) can hold links written as `[[kind:id|Label]]`; typing `[[` opens the picker. Each save rebuilds `lore_mentions`, which feeds the "Mentioned in" lists.

## Data

Migrations `backend/src/database/migrations/0012_lore_panel.sql` and `0013_lore_player_characters.sql` (`rpc_realm_id`, `rpc_character_id` on `lore_characters`, unique per player and roster character).

| Table | Holds |
|-------|-------|
| `lore_members` | Lore Helper roster, `is_lead`, who added them |
| `lore_profiles` | Per-user time zone and `notify_mode` (`off`, `available`, `all`) |
| `lore_weekly_availability`, `lore_availability` | Weekly defaults and per-day overrides (`full`, `partial`, `none`; no row = not set) |
| `lore_characters`, `lore_organisations`, `lore_storylines`, `lore_locations`, `lore_events` | The records. Each has a `version` for edit conflicts and a `deleted_at` for soft delete |
| `lore_character_affiliations`, `lore_relations`, `lore_storyline_members`, `lore_event_helpers`, `lore_event_characters` | Links between records |
| `lore_mentions` | `[[…]]` links found in long text |
| `lore_history` | Every write, with actor and changes |
| `lore_notifications`, `lore_notification_outbox` | Discord DM queue for the bot |

Behaviour worth knowing:

- A stale `version` on save returns 409 `edited_elsewhere` along with the current record.
- Whole-list link saves keep links to soft-deleted records, so restoring a record brings its links back.
- A day's status is the day override, else the weekly default, else not set.

## Bot API (DM delivery: follow-up cog)

The website queues DMs now. tfmc_bot does not deliver them yet; the events page says so.

Rows are queued in the same transaction as the event change:

- **`event_scheduled`:** an event became `scheduled` with a date. Recipients are roster users with a linked Discord account whose `notify_mode` is `all`, or `available` (the default) and Full or Partial that day. Assigned helpers are included unless their mode is `off`, and helpers added later are told too.
- **`event_rescheduled`:** the date or start time changed. Sent to the new day's audience plus everyone already told.
- **`event_cancelled`:** cancelled, back to idea or waiting, or deleted. Sent to everyone who was told. Marking an event `done` sends nothing.

Both endpoints use the staff key (`X-Staff-Key`) and are flag-gated, like the wars notifications.

```
GET  /lore/staff/notifications?limit=50   (1..200)
-> {"outbox_id": "<uuid>", "notifications": [
     {"id", "kind", "event_id", "discord_user_id", "event_day", "created_at",
      "payload": {"event_id", "title", "day", "starts_at", "storyline",
                  "location": {"name", "world", "x", "y", "z"} | null,
                  "url", "kind", "recipient_status", "recipient_is_helper",
                  "previous_day"?, "previous_starts_at"?,   // rescheduled
                  "reason"?}}]}                             // cancelled: status or "deleted"

POST /lore/staff/notifications/ack  {"ids": [..]}  ->  {"acked": [ids that exist]}
```

- Rows come back oldest first. A row handed out but not acked is offered again after 10 minutes.
- Key delivered rows by `outbox_id` plus `id`, as the wars cog does, so a database restore can't cause repeat DMs.
- `starts_at` is ISO UTC; show it in the recipient's time zone, with CET and EST.
