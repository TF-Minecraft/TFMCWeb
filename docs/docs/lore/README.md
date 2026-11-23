# Lore panel

A workspace at `/lore` where the lore team keeps characters, organisations, storylines, events and lore locations, plans events against helper availability, and reaches places on the map. Everything is entered by hand. Pickers create a missing record inline, and every record links to the others and shows what mentions it.

**Status:** on for dev.tfminecraft.net only, for review by the lore team. Production keeps it off (see [Flag](#flag)).

## Access

| Who | Access |
|-----|--------|
| Website staff (`roles.is_staff`) | Full panel, including creating and editing lore |
| Discord Lore Helper | Full panel, including creating and editing lore |
| Discord Helper | Calendar, signing themselves up to help at scheduled events, personal availability and settings |
| Anyone else | No access |

- People with both Discord roles have full access. A Discord admin can change roles.
- Signed-out visitors get 401 and players without access get 403. The header's **Lore** link shows when `GET /lore/access` returns `access: true`. Its `level` is `full`, `calendar`, or null.
- Writes also need the site's `Origin`, and the view-as-player guard blocks them.
- The roster determines who can be assigned to events or notified. Lore Helpers and Helpers join when they sign in to the site. Other staff join when they save availability or settings or sign up to an event. Roster members who are website staff appear in the Staff group.
- Losing access leaves existing event assignments and activity history intact.

## Flag

`backend/src/lore/flag.py`: `LORE_PANEL=1|true|yes|on` turns it on and `0|false|no|off` turns it off. When unset, it is on unless `PS_PRODUCTION=1`.

When off, `GET /lore/access` reports `enabled: false` and `access: false`. The role snapshot endpoint still accepts updates. The other `/lore/*` endpoints return 404. The pages show that the lore panel is unavailable.

The lore migrations run in every environment.

## Pages

| Path | What it does |
|------|--------------|
| `/lore` | Upcoming events (14 days), ideas and "waiting on" events, recent edits, and a quick-set for my next 7 days |
| `/lore/characters`, `/[id]` | Lore characters first, then player characters (adopted from RPCharacters) in their own list below. Profiles: status, summary, notes, a face (uploaded skin, linked Minecraft name, or a player character's worn skin), affiliations, relations, storylines, events, backlinks and history |
| `/lore/organisations`, `/[id]` | Factions and organisations: kind, game faction, members with roles, relations, backlinks and history |
| `/lore/storylines`, `/[id]` | Status, involved characters, organisations and locations, and the ordered event list with inline "add event" |
| `/lore/events/[id]` | Date with each roster member's availability for that day, optional start time (in my time zone, with CET and EST shown), or "waiting on"; location, characters, helpers, outcome and history |
| `/lore/calendar` | Month grid with events and Full/Partial counts, a day panel, unscheduled events, my weekly defaults, day and week overrides, notification mode and time zone |
| `/lore/map` | Lore locations on the main map. Clicking a pin copies `/tp x y z` (`~` when y is unset). Locations are added by clicking the map. |
| `/lore/team` | Read-only roster grouped by Lore Helpers, Helpers and Staff, with the last sync time and number of role holders who have yet to sign in |
| `/lore/deleted` | Restore soft-deleted records |

Helpers opening `/lore` go straight to the calendar. Their calendar shows scheduled and completed events with the title, date, time, location name and assigned helpers. Availability summaries show statuses. Helpers can edit their own availability and settings.

### Signing up

Everyone with panel access can sign themselves up to help at a scheduled event from the calendar's day panel, and withdraw again. `PUT /lore/events/{id}/signup` signs up and `DELETE` withdraws; both return `{id, signed_up, helper_ids, helpers}` and repeating one changes nothing.

- Only `scheduled` events with a date take sign-ups (409 `not_open_for_signup`). Withdrawing from a `done` event is refused (409 `event_done`). A deleted event returns 409 `deleted`.
- Signing up queues the same `event_scheduled` DM as being assigned, unless notifications are off. History records `signed_up` or `withdrew`.
- Withdrawing also works for an assignment someone else made.

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

Migrations `backend/src/database/migrations/0012_lore_panel.sql`, `0013_lore_player_characters.sql` and `0014_lore_discord_roles.sql`.

| Table | Holds |
|-------|-------|
| `lore_discord_roles` | Discord user IDs and their synced `helper` or `lore_helper` roles |
| `lore_discord_role_sync` | Last successful snapshot timestamp. Empty before the first sync |
| `lore_members` | Unused since migration 0014. Kept for preview database restores until a later drop |
| `lore_profiles` | Per-user time zone and `notify_mode` (`off`, `assigned`, `available`, `all`) |
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

## Bot API

The bot routes use `X-Staff-Key`.

```
PUT /lore/staff/discord-roles  {"helper": ["123"], "lore_helper": ["456"]}
-> {"helper": 1, "lore_helper": 1, "added": 2, "removed": 0, "synced_at": "<ISO timestamp>"}
```

Send both lists in every request. Each list accepts up to 10,000 IDs as strings of 1–20 ASCII digits. Duplicates within a list count once. Empty lists are valid. Each request replaces the full snapshot in one transaction. The endpoint works while `LORE_PANEL` is off.

### DM delivery

The notification endpoints are gated by `LORE_PANEL`. Rows are queued with the event change.

| Mode | Which events trigger DMs |
|------|-------------------------|
| `off` | None |
| `assigned` | Events the recipient is assigned to. Default for calendar access |
| `available` | Assigned events and events on Full or Partial days. Default for full access |
| `all` | All scheduled events |

- **`event_scheduled`** is sent when an event gets a scheduled date or a new helper is assigned to it.
- **`event_rescheduled`** is sent when the date or start time changes. It goes to the new day's audience and eligible roster members who already heard about the event.
- **`event_cancelled`** is sent to eligible roster members who heard about the event when it is cancelled, goes back to idea or waiting, or is deleted. Marking it done sends nothing.

For calendar access, `storyline` is null, `location` carries only the name, and `url` opens the event day on the calendar.

```
GET  /lore/staff/notifications?limit=50   (1..200)
-> {"outbox_id": "<uuid>", "notifications": [
     {"id", "kind", "event_id", "discord_user_id", "event_day", "created_at",
      "payload": {"event_id", "title", "day", "starts_at", "storyline",
                  "location": {"name", "world"?, "x"?, "y"?, "z"?} | null,
                  "url", "kind", "recipient_status", "recipient_is_helper",
                  "previous_day"?, "previous_starts_at"?,   // rescheduled
                  "reason"?}}]}                             // cancelled: status or "deleted"

POST /lore/staff/notifications/ack  {"ids": [..]}  ->  {"acked": [ids that exist]}
```

- The outbox checks current roster access when the bot polls. Eligible rows come back oldest first. A row handed out but not acked is offered again after 10 minutes.
- Key delivered rows by `outbox_id` plus `id`, as the wars cog does, so a database restore can't cause repeat DMs.
- `starts_at` is ISO UTC; show it in the recipient's time zone, with CET and EST.
