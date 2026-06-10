-- Scene intro: a short, immersive Korean line Wavi reads to set the scene before a
-- scenario's conversation begins (e.g. "잠시 호텔에 도착했다고 상상해 보세요..."). Optional;
-- empty = open straight into the conversation. Apply in the Supabase SQL editor.
-- The scenarios table is already granted to anon.
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS intro text;
