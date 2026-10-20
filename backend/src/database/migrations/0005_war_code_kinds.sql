-- War declare codes no longer pin a war goal: the leader picks goals in game.
-- A code may also gate a coalition offensive, where attacker_faction_id is the
-- coalition leader and defender_faction_id the coalition target. Existing rows
-- are war declarations and keep the goal they were minted with.
ALTER TABLE war_declaration_codes
    ADD COLUMN kind text COLLATE "C" NOT NULL DEFAULT 'war_declare',
    ALTER COLUMN goal DROP NOT NULL;

ALTER TABLE war_declaration_codes ADD CONSTRAINT war_declaration_codes_kind_check
    CHECK (kind IN ('war_declare', 'coalition_offensive'));
ALTER TABLE war_declaration_codes ADD CONSTRAINT war_declaration_codes_coalition_goal_check
    CHECK (kind <> 'coalition_offensive' OR goal IS NULL);
