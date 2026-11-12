-- Staff alt links: more Minecraft accounts a staff member plays on, tied to their own
-- Discord link. discord_links stays one Discord account to one Minecraft account; an alt
-- counts as linked only while its owner's link stands and the owner is still staff.
-- See src/skins/staff_alts.py and docs/docs/identity/tfmcweb.md#staff-alts.
CREATE TABLE staff_alt_links (
    -- Lowercase, as Minecraft writes UUIDs.
    player_uuid text COLLATE "C" PRIMARY KEY CHECK (player_uuid = lower(player_uuid)),
    discord_user_id text COLLATE "C" NOT NULL,
    minecraft_name text COLLATE "C",
    linked_at timestamptz NOT NULL
);

CREATE INDEX staff_alt_links_discord_idx ON staff_alt_links (discord_user_id);
