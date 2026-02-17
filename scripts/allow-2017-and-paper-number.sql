-- Run in Supabase SQL editor.
-- Expands supported exam years to include 2017-2019 and adds paper numbering
-- so multiple papers can exist for the same school + year.

ALTER TABLE hsc_questions
ADD COLUMN IF NOT EXISTS paper_number INTEGER;

ALTER TABLE hsc_questions
ADD COLUMN IF NOT EXISTS paper_label TEXT;

UPDATE hsc_questions
SET paper_number = 1
WHERE paper_number IS NULL;

UPDATE hsc_questions
SET paper_label = CONCAT(COALESCE(school_name, 'HSC'), ' ', year::text, ' Paper ', paper_number::text)
WHERE paper_label IS NULL;

ALTER TABLE hsc_questions
ALTER COLUMN paper_number SET NOT NULL;

DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'hsc_questions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%year%'
      AND pg_get_constraintdef(oid) ILIKE '%2020%'
  LOOP
    EXECUTE format('ALTER TABLE hsc_questions DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE hsc_questions
ADD CONSTRAINT hsc_questions_year_check
CHECK (year >= 2017 AND year <= 2035);

CREATE INDEX IF NOT EXISTS idx_hsc_questions_school_year_paper
ON hsc_questions(school_name, year, paper_number);
