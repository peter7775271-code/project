-- Add image URL columns for MCQ options (each option can be text OR image).
-- Run this in the Supabase SQL editor if your hsc_questions table doesn't have these yet.

ALTER TABLE hsc_questions
  ADD COLUMN IF NOT EXISTS mcq_option_a_image text,
  ADD COLUMN IF NOT EXISTS mcq_option_b_image text,
  ADD COLUMN IF NOT EXISTS mcq_option_c_image text,
  ADD COLUMN IF NOT EXISTS mcq_option_d_image text;
