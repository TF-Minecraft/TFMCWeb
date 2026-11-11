-- War battle availability (contract addendum v1.4): players mark every date and start
-- time they could fight, and the plugin turns the marks into battle days. See
-- docs/docs/map/war-history.md#battle-availability.

-- One account's marks on one date (`{"date", "hours"}`) or "none of these days work"
-- (`{"none": true}`), applied by SimpleFactions like the votes of v1.3.
ALTER TABLE war_actions DROP CONSTRAINT war_actions_kind_check;
ALTER TABLE war_actions ADD CONSTRAINT war_actions_kind_check CHECK (kind IN (
    'call_to_arms_answer', 'day_vote', 'hour_vote', 'availability'));

-- A date became a battle day (timeline entry and thread post), and a silent reminder
-- to mark availability (DMs only).
ALTER TABLE war_events DROP CONSTRAINT war_events_type_check;
ALTER TABLE war_events ADD CONSTRAINT war_events_type_check CHECK (type IN (
    'war_declared', 'participant_joined', 'day_vote_closed', 'battle_scheduled',
    'battle_postponed', 'battle_resolved', 'war_ended', 'next_battle_day',
    'votes_changed', 'call_to_arms_sent', 'call_to_arms_closed',
    'battle_day_locked', 'vote_reminder'));

ALTER TABLE war_notifications DROP CONSTRAINT war_notifications_kind_check;
ALTER TABLE war_notifications ADD CONSTRAINT war_notifications_kind_check CHECK (kind IN (
    'war_declared', 'ally_joined', 'battle_day_set', 'battle_scheduled',
    'battle_postponed', 'battle_result', 'war_ended', 'defender_dm', 'call_to_arms_dm',
    'battle_day_locked', 'vote_reminder_dm'));

-- At most one reminder DM per Discord user per war per UTC day: the reminders sent today.
CREATE INDEX war_notifications_reminders_idx ON war_notifications (realm_id, war_key, created_at)
    WHERE kind = 'vote_reminder_dm';

-- Discord users who pressed "Mute this war" on a reminder DM: no more reminders for that war.
CREATE TABLE war_dm_mutes (
    realm_id text COLLATE "C" NOT NULL,
    war_key text COLLATE "C" NOT NULL,
    discord_user_id text COLLATE "C" NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (realm_id, war_key, discord_user_id)
);
