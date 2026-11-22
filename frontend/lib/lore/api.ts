import { AccountApiError } from "../account/api";
import { getApiBase, parseJson, VIEW_ONLY_MESSAGE } from "../site/api";

// --------------------
// Shapes
// --------------------

export type EntityKind = "character" | "organisation" | "storyline" | "location" | "event";
export type CharacterStatus = "active" | "inactive" | "missing" | "dead";
export type StorylineStatus = "planning" | "active" | "concluded" | "abandoned";
export type EventStatus = "idea" | "waiting" | "scheduled" | "done" | "cancelled";
export type LocationKind = "settlement" | "landmark" | "camp" | "ruin" | "event" | "other";
export type RelationType = "ally" | "friendly" | "neutral" | "unfriendly" | "hostile" | "rival" | "family";
export type Availability = "full" | "partial" | "none";
export type NotifyMode = "off" | "assigned" | "available" | "all";

export const ENTITY_KINDS: EntityKind[] = ["character", "organisation", "storyline", "location", "event"];
export const CHARACTER_STATUSES: CharacterStatus[] = ["active", "inactive", "missing", "dead"];
export const STORYLINE_STATUSES: StorylineStatus[] = ["planning", "active", "concluded", "abandoned"];
export const EVENT_STATUSES: EventStatus[] = ["idea", "waiting", "scheduled", "done", "cancelled"];
export const LOCATION_KINDS: LocationKind[] = ["settlement", "landmark", "camp", "ruin", "event", "other"];
export const RELATION_TYPES: RelationType[] = [
  "ally",
  "friendly",
  "neutral",
  "unfriendly",
  "hostile",
  "rival",
  "family",
];
export const AVAILABILITY: Availability[] = ["full", "partial", "none"];

export const PLURAL: Record<EntityKind, string> = {
  character: "characters",
  organisation: "organisations",
  storyline: "storylines",
  location: "locations",
  event: "events",
};

export const KIND_LABEL: Record<EntityKind, string> = {
  character: "Character",
  organisation: "Faction / org",
  storyline: "Storyline",
  location: "Location",
  event: "Event",
};

export function entityHref(kind: string, id: number): string {
  if (kind === "location") return `/lore/map?location=${id}`;
  if (kind === "team") return "/lore/team";
  const plural = PLURAL[kind as EntityKind];
  return plural ? `/lore/${plural}/${id}` : "/lore";
}

export type LoreLevel = "full" | "calendar";

export type LoreUser = {
  user_id: number;
  name: string;
  is_staff: boolean;
  is_lore_helper: boolean;
  is_helper: boolean;
};

export type LoreAccess = {
  enabled: boolean;
  /** False also when the flag is off; check `enabled` first. */
  signed_in: boolean;
  access: boolean;
  level: LoreLevel | null;
  user: LoreUser | null;
};

/** A link to another record, with its label as it is now. */
export type Ref = {
  kind: EntityKind;
  id: number;
  label: string;
  status?: string | null;
  deleted?: boolean;
};

export type EventBrief = Ref & {
  kind: "event";
  status: EventStatus;
  scheduled_on: string | null;
  starts_at: string | null;
  waiting_on: string;
  storyline_position?: number | null;
  location_id?: number | null;
};

export type Relation = { id: number; type: RelationType; note: string; other: Ref };

type Common = {
  id: number;
  version: number;
  summary: string;
  notes: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: number | null;
  updated_by: number | null;
  created_by_name: string | null;
  updated_by_name: string | null;
  kind_name: EntityKind;
  backlinks: Ref[];
};

export type CharacterDetail = Common & {
  name: string;
  status: CharacterStatus;
  player_name: string | null;
  player_uuid: string | null;
  has_face: boolean;
  /** An uploaded skin, as opposed to only a linked player's head. */
  has_skin: boolean;
  /** Set when the character was adopted from a player's RPCharacters character; the player is then fixed. */
  rpc_realm_id: string | null;
  rpc_character_id: string | null;
  /** The roster's current view of that character; null if not linked or gone from the roster. */
  player_character: PlayerCharacter | null;
  affiliations: (Ref & { role: string })[];
  relations: { outgoing: Relation[]; incoming: Relation[] };
  storylines: Ref[];
  events: EventBrief[];
};

export type OrganisationDetail = Common & {
  name: string;
  kind: string;
  game_faction: string;
  members: (Ref & { role: string })[];
  relations: { outgoing: Relation[]; incoming: Relation[] };
  storylines: Ref[];
};

export type StorylineDetail = Common & {
  title: string;
  status: StorylineStatus;
  members: Ref[];
  events: EventBrief[];
};

export type LocationDetail = Common & {
  name: string;
  world: string;
  x: number;
  y: number | null;
  z: number;
  kind: LocationKind;
  storylines: Ref[];
  events: EventBrief[];
};

export type EventDetail = Common & {
  title: string;
  status: EventStatus;
  storyline_id: number | null;
  storyline_position: number | null;
  scheduled_on: string | null;
  starts_at: string | null;
  waiting_on: string;
  location_id: number | null;
  outcome: string;
  storyline: Ref | null;
  location: {
    id: number;
    label: string;
    world: string;
    x: number;
    y: number | null;
    z: number;
    kind: LocationKind;
    deleted: boolean;
  } | null;
  characters: Ref[];
  helpers: { user_id: number; name: string }[];
};

export type DetailOf = {
  character: CharacterDetail;
  organisation: OrganisationDetail;
  storyline: StorylineDetail;
  location: LocationDetail;
  event: EventDetail;
};

type ListCommon = { id: number; summary: string; updated_at: string; deleted_at: string | null };

export type CharacterRow = ListCommon & {
  name: string;
  status: CharacterStatus;
  player_name: string | null;
  version: number;
  has_face: boolean;
  organisations: string[];
};
export type OrganisationRow = ListCommon & { name: string; kind: string; game_faction: string; member_count: number };
export type StorylineRow = ListCommon & {
  title: string;
  status: StorylineStatus;
  event_count: number;
  next_event_on: string | null;
};
export type LocationRow = ListCommon & {
  name: string;
  world: string;
  x: number;
  y: number | null;
  z: number;
  kind: LocationKind;
};
export type EventRow = ListCommon & {
  title: string;
  status: EventStatus;
  scheduled_on: string | null;
  starts_at: string | null;
  waiting_on: string;
  storyline_id: number | null;
  storyline_title: string | null;
  storyline_position: number | null;
  location_id: number | null;
  location_name: string | null;
};

export type RowOf = {
  character: CharacterRow;
  organisation: OrganisationRow;
  storyline: StorylineRow;
  location: LocationRow;
  event: EventRow;
};

export type HistoryEntry = {
  id: number;
  action: string;
  actor_user_id: number | null;
  actor_name: string | null;
  at: string;
  changes: Record<string, [unknown, unknown]>;
};

export type PlayerCharacter = {
  name: string;
  status: string;
  race: string | null;
  class: string | null;
  died_at: string | null;
};

/** A roster character from RPCharacters with no lore character yet; picking it adopts it. */
export type PlayerCharacterRef = { uuid: string; character_id: string };

/** `player` is set (and `id` is 0) for a player's character not yet in the lore records. */
export type SearchResult = {
  kind: EntityKind;
  id: number;
  label: string;
  sublabel: string;
  status: string | null;
  player?: PlayerCharacterRef;
};

export type DayStatus = { status: Availability | null; note: string; source: "override" | "weekly" | null };

export type LoreSettings = { timezone: string | null; notify_mode: NotifyMode; on_roster: boolean };

export type MyAvailability = {
  from: string;
  to: string;
  weekly: { weekday: number; status: Availability | null; note: string }[];
  days: (DayStatus & { day: string })[];
  settings: LoreSettings;
};

export type RosterPerson = {
  user_id: number;
  name: string;
  level: LoreLevel;
  lore_role: "staff" | "lore_helper" | "helper";
  timezone: string | null;
  notify_mode: NotifyMode;
  has_head: boolean;
};

export type AvailabilityGrid = {
  from: string;
  to: string;
  days: string[];
  people: (RosterPerson & { days: Record<string, DayStatus> })[];
};

export type CalendarEvent = {
  id: number;
  title: string;
  status: EventStatus;
  scheduled_on: string;
  starts_at: string | null;
  helper_ids: number[];
  helpers: { user_id: number; name: string }[];
  storyline: { id: number; label: string } | null;
  location: ({ label: string } & Partial<{ id: number; world: string; x: number; y: number | null; z: number }>) | null;
};

export type UnscheduledEvent = {
  id: number;
  title: string;
  status: EventStatus;
  waiting_on: string;
  storyline_id: number | null;
  storyline_title: string | null;
  updated_at: string;
};

export type Calendar = {
  from: string;
  to: string;
  events: CalendarEvent[];
  unscheduled: UnscheduledEvent[];
  availability: AvailabilityGrid;
};

export type RecentEdit = HistoryEntry & {
  entity_kind: string;
  entity_id: number;
  target: { kind: string; id: number; label: string; deleted: boolean; status: string | null } | null;
};

export type Overview = {
  today: string;
  upcoming: CalendarEvent[];
  unscheduled: UnscheduledEvent[];
  unscheduled_total: number;
  recent: RecentEdit[];
  my_week: (DayStatus & { day: string })[];
  settings: LoreSettings;
};

export type Team = {
  lore_helpers: RosterPerson[];
  helpers: RosterPerson[];
  staff: RosterPerson[];
  synced_at: string | null;
  unlinked: number;
};

export type DeletedItem = {
  kind: EntityKind;
  id: number;
  label: string;
  deleted_at: string;
};

// --------------------
// Requests
// --------------------

/** A refused request; `code` is the server's error code and `detail` any extra it sent. */
export class LoreApiError extends AccountApiError {
  code: string;
  detail: Record<string, unknown>;

  constructor(code: string, status: number, detail: Record<string, unknown> = {}) {
    super(code, status);
    this.name = "LoreApiError";
    this.code = code;
    this.detail = detail;
  }
}

function errorFrom(data: unknown, status: number): LoreApiError {
  const detail = data && typeof data === "object" && "detail" in data ? (data as { detail: unknown }).detail : null;
  if (typeof detail === "string") return new LoreApiError(detail, status);
  if (detail && typeof detail === "object" && !Array.isArray(detail) && "code" in detail) {
    const extra = detail as Record<string, unknown>;
    return new LoreApiError(String(extra.code), status, extra);
  }
  if (Array.isArray(detail)) return new LoreApiError("bad_body", status);
  return new LoreApiError(`http_${status}`, status);
}

export async function loreRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const isForm = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const res = await fetch(`${getApiBase()}/lore${path}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init?.body && !isForm ? { "Content-Type": "application/json" } : {}),
    },
  });
  const data = await parseJson(res);
  if (!res.ok) throw errorFrom(data, res.status);
  return data as T;
}

function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  return loreRequest<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
}

const ERROR_MESSAGES: Record<string, string> = {
  not_signed_in: "Your session has ended. Sign in again.",
  no_access: "The lore panel is for Discord Helpers, Lore Helpers and website staff.",
  lore_helpers_only: "This part of the lore panel is for Lore Helpers. Helpers can use the calendar.",
  bad_origin: "That request was blocked. Reload the page and try again.",
  viewing_as_player: VIEW_ONLY_MESSAGE,
  not_found: "That record no longer exists.",
  deleted: "This was deleted. Restore it from Deleted before editing.",
  edited_elsewhere: "Someone else saved this while you were editing.",
  version_required: "Reload the page and try again.",
  bad_body: "That couldn’t be saved. Check the form and try again.",
  bad_kind: "That kind of record isn’t supported.",
  bad_status: "Pick one of the listed statuses.",
  date_required: "Pick a date to mark the event as scheduled.",
  waiting_on_required: "Say what the event is waiting on.",
  range_too_long: "Show up to 62 days at a time.",
  bad_range: "That date range isn’t valid.",
  bad_day: "That isn’t a valid date.",
  bad_timezone: "That time zone isn’t recognised.",
  bad_notify_mode: "Pick one of the notification options.",
  unknown_player: "No Minecraft player with that name has been seen on the server.",
  bad_member: "One of those links no longer exists.",
  bad_order: "The event list changed. Reload and try again.",
  not_on_roster: "Helpers must be staff or on the Lore team.",
  bad_skin: "Upload a 64×64 or 64×32 Minecraft skin PNG.",
  bad_type: "Pick one of the listed relation types.",
  bad_player: "Enter a Minecraft player name.",
  bad_user: "That account can’t be added.",
  self_relation: "A record can’t be related to itself.",
  relation_exists: "That relation already exists.",
  bad_starts_at: "That start time isn’t valid.",
  bad_scheduled_on: "That date isn’t valid.",
  bad_weekly: "Set all seven days of the week.",
  bad_days: "Those days couldn’t be saved.",
  bad_x: "X must be a whole number within the world.",
  bad_y: "Y must be a whole number between -2048 and 2048, or empty.",
  bad_z: "Z must be a whole number within the world.",
  bad_player_character: "That player character couldn’t be found.",
  unknown_player_character: "That player character no longer exists in RPCharacters.",
  player_character_deleted: "That player character’s lore record was deleted. Restore it from Deleted first.",
  player_character_linked: "This character comes from a player’s RPCharacters character, so its player can’t change.",
};

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  title: "Title",
  summary: "Summary",
  notes: "Notes",
  outcome: "Outcome",
  waiting_on: "Waiting on",
  role: "Role",
  note: "Note",
  world: "World",
  kind: "Kind",
  game_faction: "Game faction",
};

/** Friendly text for a failed lore request. */
export function loreErrorMessage(err: unknown): string {
  if (!(err instanceof AccountApiError)) return "Something went wrong. Please try again.";
  const code = err instanceof LoreApiError ? err.code : err.message;
  if (ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  const tooLong = /^too_long_(.+)$/.exec(code);
  if (tooLong) return `${FIELD_LABELS[tooLong[1]] ?? tooLong[1]} is too long.`;
  const required = /^(.+)_required$/.exec(code);
  if (required) return `${FIELD_LABELS[required[1]] ?? required[1]} is required.`;
  const badField = /^bad_(.+)$/.exec(code);
  if (badField) return `${FIELD_LABELS[badField[1]] ?? badField[1].replace(/_/g, " ")} isn’t valid.`;
  if (err.status === 404) return ERROR_MESSAGES.not_found;
  if (err.status >= 500) return "The server had a problem. Please try again.";
  return "Something went wrong. Please try again.";
}

/** The newer copy the server sent with an edited_elsewhere conflict, if any. */
export function conflictCurrent<T>(err: unknown): T | null {
  if (err instanceof LoreApiError && err.code === "edited_elsewhere" && err.detail.current) {
    return err.detail.current as T;
  }
  return null;
}

function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "" && value !== false) search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

// Access, overview, search
export function getLoreAccess(): Promise<LoreAccess> {
  return loreRequest("/access");
}
/** `today` is the browser's day; the server prefers the viewer's saved time zone. */
export function getOverview(today?: string): Promise<Overview> {
  return loreRequest(`/overview${qs({ today })}`);
}
/** With `players`, a query also finds players' RPCharacters characters not yet in the lore records. */
export async function searchLore(
  q: string,
  kinds: EntityKind[] = [],
  limit = 12,
  players = false,
): Promise<SearchResult[]> {
  const data = await loreRequest<{ results: SearchResult[] }>(
    `/search${qs({ q, kinds: kinds.join(","), limit, players })}`,
  );
  return data.results;
}
/** The lore character for a player's RPCharacters character, created on first use. */
export function adoptPlayerCharacter(player: PlayerCharacterRef): Promise<SearchResult & { created: boolean }> {
  return send("POST", "/player-characters", { player_uuid: player.uuid, character_id: player.character_id });
}
export async function getDeleted(): Promise<DeletedItem[]> {
  return (await loreRequest<{ items: DeletedItem[] }>("/deleted")).items;
}

// Entities
export async function listEntities<K extends EntityKind>(
  kind: K,
  params: { q?: string; status?: string; include_deleted?: boolean } = {},
): Promise<RowOf[K][]> {
  return (await loreRequest<{ items: RowOf[K][] }>(`/${PLURAL[kind]}${qs(params)}`)).items;
}
export function getEntity<K extends EntityKind>(kind: K, id: number): Promise<DetailOf[K]> {
  return loreRequest(`/${PLURAL[kind]}/${id}`);
}
export function createEntity<K extends EntityKind>(kind: K, values: Record<string, unknown>): Promise<DetailOf[K]> {
  return send("POST", `/${PLURAL[kind]}`, values);
}
export function updateEntity<K extends EntityKind>(
  kind: K,
  id: number,
  version: number,
  values: Record<string, unknown>,
): Promise<DetailOf[K]> {
  return send("PATCH", `/${PLURAL[kind]}/${id}`, { ...values, version });
}
export function deleteEntity(kind: EntityKind, id: number): Promise<{ ok: true }> {
  return send("DELETE", `/${PLURAL[kind]}/${id}`);
}
export function restoreEntity<K extends EntityKind>(kind: K, id: number): Promise<DetailOf[K]> {
  return send("POST", `/${PLURAL[kind]}/${id}/restore`);
}
export async function getHistory(kind: EntityKind, id: number): Promise<HistoryEntry[]> {
  return (await loreRequest<{ history: HistoryEntry[] }>(`/${PLURAL[kind]}/${id}/history`)).history;
}

// Links (each returns the updated detail)
export function setAffiliations(id: number, affiliations: { organisation_id: number; role: string }[]) {
  return send<CharacterDetail>("PUT", `/characters/${id}/affiliations`, { affiliations });
}
export function setPlayer(id: number, name: string | null) {
  return send<CharacterDetail>("PUT", `/characters/${id}/player`, { name });
}
export function setOrganisationMembers(id: number, members: { character_id: number; role: string }[]) {
  return send<OrganisationDetail>("PUT", `/organisations/${id}/members`, { members });
}
export function setStorylineMembers(id: number, members: { kind: EntityKind; id: number }[]) {
  return send<StorylineDetail>("PUT", `/storylines/${id}/members`, { members });
}
export function setStorylineOrder(id: number, eventIds: number[]) {
  return send<StorylineDetail>("PUT", `/storylines/${id}/order`, { event_ids: eventIds });
}
export function setEventHelpers(id: number, userIds: number[]) {
  return send<EventDetail>("PUT", `/events/${id}/helpers`, { user_ids: userIds });
}
export function setEventCharacters(id: number, characterIds: number[]) {
  return send<EventDetail>("PUT", `/events/${id}/characters`, { character_ids: characterIds });
}
export function uploadSkin(id: number, file: Blob) {
  const form = new FormData();
  form.append("skin", file);
  return loreRequest<CharacterDetail>(`/characters/${id}/skin`, { method: "POST", body: form });
}
export function clearSkin(id: number) {
  return send<CharacterDetail>("DELETE", `/characters/${id}/skin`);
}
export function faceUrl(id: number, cacheKey?: string): string {
  return `${getApiBase()}/lore/characters/${id}/face.png${cacheKey ? `?v=${encodeURIComponent(cacheKey)}` : ""}`;
}
export function headUrl(userId: number): string {
  return `${getApiBase()}/lore/team/${userId}/head.png`;
}

// Relations
/** What the relation endpoints return. */
export type RelationRecord = { id: number; type: RelationType; note: string; source: Ref; target: Ref };

export function createRelation(body: {
  source_kind: EntityKind;
  source_id: number;
  target_kind: EntityKind;
  target_id: number;
  type: RelationType;
  note?: string;
}) {
  return send<RelationRecord>("POST", "/relations", body);
}
export function updateRelation(id: number, body: { type?: RelationType; note?: string }) {
  return send<RelationRecord>("PATCH", `/relations/${id}`, body);
}
export function deleteRelation(id: number) {
  return send<{ ok: true }>("DELETE", `/relations/${id}`);
}

// Availability and calendar
export function getMyAvailability(from: string, to: string): Promise<MyAvailability> {
  return loreRequest(`/availability/me${qs({ from, to })}`);
}
export function setMyWeekly(weekly: { status: Availability | null; note: string }[]): Promise<MyAvailability> {
  return send("PUT", "/availability/me/weekly", { weekly });
}
export function setMyDays(
  days: { day: string; status: Availability | null; note?: string }[],
): Promise<MyAvailability> {
  return send("PUT", "/availability/me/days", { days });
}
export function setMySettings(settings: { timezone?: string | null; notify_mode?: NotifyMode }): Promise<LoreSettings> {
  return send("PUT", "/me/settings", settings);
}
export function getAvailability(from: string, to: string): Promise<AvailabilityGrid> {
  return loreRequest(`/availability${qs({ from, to })}`);
}
export function getAvailabilityDay(day: string): Promise<{ day: string; people: (RosterPerson & DayStatus)[] }> {
  return loreRequest(`/availability/day/${day}`);
}
export function getCalendar(from: string, to: string): Promise<Calendar> {
  return loreRequest(`/calendar${qs({ from, to })}`);
}

// Team
export function getTeam(): Promise<Team> {
  return loreRequest("/team");
}
