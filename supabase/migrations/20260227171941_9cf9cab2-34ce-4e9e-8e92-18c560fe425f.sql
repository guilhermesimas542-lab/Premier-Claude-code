
ALTER TABLE cards ADD COLUMN button_bg_color TEXT;
ALTER TABLE cards ADD COLUMN button_font_color TEXT;
ALTER TABLE cards DROP COLUMN IF EXISTS icon;
