/**
 * War history API shapes, as `backend/src/wars/history_model.py` builds them.
 * Contract: `docs/docs/map/war-history.md`. `sampleWar.json` is the backend's own
 * output for the sample war, so the tests render exactly what the API returns.
 */

export type WarSide = "attacker" | "defender";

export type SidePair<T = number> = Record<WarSide, T>;

export type FactionRef = {
  id: string | null;
  founded_at: number | null;
  name: string;
  name_raw: string;
  rgb: string | null;
};

export type ParticipantRole = "leader" | "main" | "subject" | "ally" | "coalition" | "backer";

export type StateParticipant = FactionRef & {
  role: ParticipantRole | null;
  /** ISO instant; null means at declaration. */
  joined_at: string | null;
};

export type WarState = {
  name?: string;
  name_raw?: string;
  goal?: string | null;
  war_type?: string | null;
  civil_war?: boolean;
  status?: string | null;
  schedule_phase?: string | null;
  campaign_phase?: string | null;
  buildup?: boolean | null;
  day_vote_closes_at?: string | null;
  /** `YYYY-MM-DD`. */
  battle_day?: string | null;
  scheduled_at?: string | null;
  route_length?: number | null;
  objective_province_id?: number | null;
  objective_held_by?: string | null;
  occupied_by_attacker?: number;
  occupied_by_defender?: number;
  battles_fought?: number;
  initiative?: { attacker: number | null; defender: number | null; holder: WarSide | null };
  sides: SidePair<StateParticipant[]>;
};

export type WarStatus = "active" | "ended";

export type WarResult = {
  reason: string | null;
  winner: WarSide | null;
  truce_until: string | null;
};

export type WarScore = {
  battles_won: SidePair;
  occupation: { attacker: number; defender: number; route_length: number | null };
  deaths: SidePair;
  regiments_lost: SidePair;
};

export type Resolution = "fought" | "autoresolve" | "forfeit" | "naval_default" | "staff";

export type Lives = SidePair<{ left: number; max: number }>;

export type WarBattle = {
  battle_number: number | null;
  at: string | null;
  province_id: number | null;
  province_name: string | null;
  kind: string | null;
  leg: string | null;
  raid: boolean;
  name: string | null;
  winner: WarSide | null;
  resolution: Resolution;
  battle_id: string | null;
  record_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  deaths: SidePair;
  lives: Lives | null;
  /** Null when the battle is known only from its record. */
  regiments_lost: SidePair | null;
  /** Null when there was no live battle (no record). */
  fighters: SidePair | null;
};

export type WarParticipant = {
  faction: FactionRef;
  side: WarSide;
  role: ParticipantRole | "mercenary" | null;
  /** Fighters hired by `faction`, not its own members. */
  mercenary: boolean;
  joined_at: string | null;
  fighters: number;
  kills: number;
  deaths: number;
  damage: number;
  healing: number;
  regiments_lost: number;
  share_of_side_kills: number | null;
};

export type TopFighter = {
  name: string;
  faction: string | null;
  hired_by: string | null;
  side: WarSide;
  battles: number;
  kills: number;
  deaths: number;
  damage: number;
  healing: number;
};

export type TimelineEntry = {
  at: string | null;
  type: string;
  summary: string;
  payload: Record<string, unknown>;
};

export type WarPageModel = {
  map_id: string;
  war_key: string;
  name: string;
  name_raw: string;
  /** Null for a war known only from backfilled battle records. */
  state: WarState | null;
  status: WarStatus;
  started_at: string | null;
  ended_at: string | null;
  result: WarResult | null;
  objective_province_name: string | null;
  score: WarScore;
  timeline: TimelineEntry[];
  battles: WarBattle[];
  participants: WarParticipant[];
  fighter_stats_public: boolean;
  /** Omitted when `WAR_FIGHTER_STATS_PUBLIC=false`. */
  top_fighters?: TopFighter[];
};

export type WarSummary = {
  war_key: string;
  name: string;
  name_raw: string;
  goal: string | null;
  war_type: string | null;
  civil_war: boolean;
  status: WarStatus;
  known_from_records_only: boolean;
  sides: SidePair<{ leaders: FactionRef[]; count: number }>;
  started_at: string | null;
  ended_at: string | null;
  result: WarResult | null;
  battles_won: SidePair;
  deaths: SidePair;
  score: WarScore;
  battle_count: number;
  phase: {
    schedule_phase: string | null;
    campaign_phase: string | null;
    buildup: boolean | null;
    day_vote_closes_at: string | null;
    battle_day: string | null;
    scheduled_at: string | null;
  };
};

export type WarListResponse = { map_id: string; wars: WarSummary[] };

export type BattleFighter = {
  name: string;
  faction: string | null;
  faction_id: string | null;
  hired_by: string | null;
  side: WarSide;
  class_name: string | null;
  kills: number;
  deaths: number;
  assists: number;
  team_kills: number;
  damage: number;
  friendly_damage: number;
  damage_taken: number;
  healing: number;
  cc: number;
  friendly_cc: number;
};

export type BattleReport = {
  map_id: string;
  war_key: string;
  war_name: string;
  war_name_raw: string;
  war_status: WarStatus;
  record_id: string;
  name: string | null;
  type: string | null;
  naval: boolean;
  raid: boolean;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  winner: WarSide | null;
  end_reason: string | null;
  /** The war page's entry for this battle, with the event's numbers. */
  battle: WarBattle | null;
  leaders: SidePair<FactionRef | null>;
  sides: Lives | null;
  participants: WarParticipant[];
  fighter_stats_public: boolean;
  /** Omitted when `WAR_FIGHTER_STATS_PUBLIC=false`. */
  fighters?: BattleFighter[];
};
