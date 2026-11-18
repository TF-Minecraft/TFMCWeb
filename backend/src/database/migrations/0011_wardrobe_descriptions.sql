-- Wardrobe outfit descriptions: what other players read while the character wears that
-- skin, in place of the character description. NULL uses the character description.
-- The Base skin never has one (it is the character description). The text belongs to the
-- skin, so it moves with it when the open slots are packed after a clear.
-- See src/characters/wardrobe.py and docs/docs/characters/creator.md#wardrobe-summary.
ALTER TABLE character_wardrobe_slots ADD COLUMN description text COLLATE "C";
