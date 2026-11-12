-- Staff alt links: more Minecraft accounts a staff member plays on, tied to their own
-- Discord link. discord_links stays one Discord account to one Minecraft account; an alt
-- counts as linked only while its owner's link stands and the owner is still staff.
-- See src/skins/staff_alts.py and docs/docs/identity/tfmcweb.md#staff-alts.
-- No foreign key to the owner: the row outlives the owner's link and staff role on purpose.
CREATE TABLE staff_alt_links (
    -- Lowercase, as Minecraft writes UUIDs.
    player_uuid text COLLATE "C" PRIMARY KEY CHECK (player_uuid = lower(player_uuid)),
    discord_user_id text COLLATE "C" NOT NULL,
    minecraft_name text COLLATE "C",
    linked_at timestamptz NOT NULL
);

CREATE INDEX staff_alt_links_discord_idx ON staff_alt_links (discord_user_id);

-- Set on an alt's ban when it is a copy of its owner's ban (the owner's lowercase UUID), so
-- the owner's unban lifts only that copy, never a ban staff gave the alt itself.
ALTER TABLE player_bans ADD COLUMN copied_from text COLLATE "C";
CREATE INDEX player_bans_copied_from_idx ON player_bans (copied_from) WHERE copied_from IS NOT NULL;
