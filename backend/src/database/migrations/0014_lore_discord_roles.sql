CREATE TABLE lore_discord_roles (
    discord_user_id text COLLATE "C" NOT NULL CHECK (discord_user_id ~ '^[0-9]{1,20}$'),
    role text COLLATE "C" NOT NULL CHECK (role IN ('helper', 'lore_helper')),
    PRIMARY KEY (discord_user_id, role)
);

CREATE TABLE lore_discord_role_sync (
    id boolean PRIMARY KEY DEFAULT true CHECK (id),
    synced_at timestamptz NOT NULL
);

ALTER TABLE lore_profiles
    DROP CONSTRAINT lore_profiles_notify_mode_check,
    ADD CONSTRAINT lore_profiles_notify_mode_check
        CHECK (notify_mode IN ('off', 'assigned', 'available', 'all'));

COMMENT ON TABLE lore_members IS 'Unused since 0014: access comes from lore_discord_roles. Drop in a later migration.';
