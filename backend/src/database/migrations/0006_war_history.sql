-- War history from SimpleFactions: war events, the latest state of each war and
-- battle records. The data contract is docs/docs/map/war-history.md.
--
-- war_events and war_battles are append-only: SimpleFactions resends from its
-- outbox until acked, and an id already stored is ignored. wars is derived from
-- both and recomputed whenever one of its events or battles arrives, so it can
-- always be rebuilt from the other two.

CREATE TABLE war_events (
    id text COLLATE "C" PRIMARY KEY,
    realm_id text COLLATE "C" NOT NULL,
    war_key text COLLATE "C" NOT NULL,
    type text COLLATE "C" NOT NULL,
    at timestamptz NOT NULL,
    state jsonb,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    received_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT war_events_type_check CHECK (type IN (
        'war_declared', 'participant_joined', 'day_vote_closed', 'battle_scheduled',
        'battle_postponed', 'battle_resolved', 'war_ended'))
);

-- The war page reads one war's events in order.
CREATE INDEX war_events_war_idx ON war_events (realm_id, war_key, at, received_at);

CREATE TABLE war_battles (
    realm_id text COLLATE "C" NOT NULL,
    record_id text COLLATE "C" NOT NULL,
    -- Null for a battle fought outside a war; such records are stored but never shown.
    war_key text COLLATE "C",
    battle_id text COLLATE "C",
    started_at timestamptz,
    ended_at timestamptz,
    raid boolean NOT NULL DEFAULT false,
    record jsonb NOT NULL,
    received_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (realm_id, record_id)
);

-- The war page reads one war's battles in order.
CREATE INDEX war_battles_war_idx ON war_battles (realm_id, war_key, ended_at)
    WHERE war_key IS NOT NULL;

CREATE TABLE wars (
    realm_id text COLLATE "C" NOT NULL,
    war_key text COLLATE "C" NOT NULL,
    name text COLLATE "C",
    -- The WarState of the latest event, null for a war known only from battle records.
    state jsonb,
    status text COLLATE "C" NOT NULL,
    started_at timestamptz,
    ended_at timestamptz,
    result jsonb,
    -- The war list row (score, sides, phase), so the list is one read.
    summary jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (realm_id, war_key),
    CONSTRAINT wars_status_check CHECK (status IN ('active', 'ended'))
);

-- The war list, newest first.
CREATE INDEX wars_list_idx ON wars (realm_id, started_at DESC NULLS LAST, war_key);
