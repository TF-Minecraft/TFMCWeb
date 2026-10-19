-- The ban each player last had, as the servers reported it. One row per
-- player lets several servers report the same ban with one Discord message,
-- and lets every server apply a ban made on another.
CREATE TABLE player_bans (
    player_uuid text COLLATE "C" PRIMARY KEY,
    minecraft_name text COLLATE "C",
    banned boolean NOT NULL,
    reason text COLLATE "C",
    staff_name text COLLATE "C",
    -- When the ban was made. NULL when the server did not say, and such a
    -- ban is not handed to other servers.
    banned_at timestamptz,
    -- When the ban ends; NULL for a permanent ban.
    expires_at timestamptz,
    updated_at timestamptz NOT NULL
);
