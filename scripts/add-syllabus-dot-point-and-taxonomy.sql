-- Run in Supabase SQL editor.
-- Adds per-question syllabus dot-point mapping and a taxonomy table
-- used to constrain GPT selection by grade/subject/topic.

ALTER TABLE hsc_questions
ADD COLUMN IF NOT EXISTS syllabus_dot_point TEXT;

CREATE INDEX IF NOT EXISTS idx_hsc_questions_syllabus_dot_point
ON hsc_questions(syllabus_dot_point);

CREATE TABLE IF NOT EXISTS hsc_syllabus_dot_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  dot_point TEXT NOT NULL,
  dot_point_code TEXT,
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hsc_syllabus_dot_points_unique
ON hsc_syllabus_dot_points(grade, subject, topic, dot_point);

CREATE INDEX IF NOT EXISTS idx_hsc_syllabus_dot_points_lookup
ON hsc_syllabus_dot_points(grade, subject, topic, sort_order);
