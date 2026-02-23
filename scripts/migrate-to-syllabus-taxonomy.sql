-- Run in Supabase SQL editor.
-- Migrates from hsc_syllabus_dot_points (flat) to syllabus_taxonomy (hierarchical)
-- and adds subtopic column to hsc_questions.

-- 1. Add subtopic column to hsc_questions
ALTER TABLE hsc_questions
ADD COLUMN IF NOT EXISTS subtopic TEXT;

CREATE INDEX IF NOT EXISTS idx_hsc_questions_subtopic
ON hsc_questions(subtopic);

-- 2. Create syllabus_taxonomy table (Topic > Subtopic > Dot Point)
CREATE TABLE IF NOT EXISTS syllabus_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  subtopic TEXT NOT NULL,
  dot_point_text TEXT NOT NULL,
  dot_point_code TEXT,
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_syllabus_taxonomy_unique
ON syllabus_taxonomy(grade, subject, topic, subtopic, dot_point_text);

CREATE INDEX IF NOT EXISTS idx_syllabus_taxonomy_lookup
ON syllabus_taxonomy(grade, subject, topic, sort_order);

-- 3. Enable RLS on syllabus_taxonomy (public read)
ALTER TABLE syllabus_taxonomy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read taxonomy" ON syllabus_taxonomy
  FOR SELECT USING (true);

-- 4. (Optional) Migrate data from the old table if it exists.
--    This will set subtopic = 'General' for all existing rows
--    since the old table did not have subtopic information.
--
-- INSERT INTO syllabus_taxonomy (grade, subject, topic, subtopic, dot_point_text, dot_point_code, sort_order)
-- SELECT grade, subject, topic, 'General', dot_point, dot_point_code, sort_order
-- FROM hsc_syllabus_dot_points
-- ON CONFLICT (grade, subject, topic, subtopic, dot_point_text) DO NOTHING;

-- 5. Add syllabus_dot_point column if not yet present
ALTER TABLE hsc_questions
ADD COLUMN IF NOT EXISTS syllabus_dot_point TEXT;

CREATE INDEX IF NOT EXISTS idx_hsc_questions_syllabus_dot_point
ON hsc_questions(syllabus_dot_point);
