-- A lore character can stand for a player's character from RPCharacters' roster
-- (character_roster). Picking a roster character in the lore panel creates (or
-- reuses) the lore character linked to it, so storylines, events, relations and
-- affiliations treat both alike. The player is fixed by the link.
ALTER TABLE lore_characters
    ADD COLUMN rpc_realm_id text COLLATE "C",
    ADD COLUMN rpc_character_id text COLLATE "C",
    ADD CONSTRAINT lore_characters_rpc_pair
        CHECK ((rpc_realm_id IS NULL) = (rpc_character_id IS NULL)),
    ADD CONSTRAINT lore_characters_rpc_player
        CHECK (rpc_character_id IS NULL OR player_uuid IS NOT NULL);

-- One lore character per roster character, deleted ones included: restore it instead.
CREATE UNIQUE INDEX lore_characters_rpc
    ON lore_characters (player_uuid, rpc_realm_id, rpc_character_id)
    WHERE rpc_character_id IS NOT NULL;
