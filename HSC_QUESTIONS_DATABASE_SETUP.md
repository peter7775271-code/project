# HSC Questions Database Setup

This guide will help you set up the database for storing HSC practice questions and student saved attempts.

## 🚀 Setup Instructions

### Step 1: Create Tables in Supabase

Go to your Supabase project dashboard → **SQL Editor** → **New Query** and run this SQL:

```sql
-- Create hsc_questions table
CREATE TABLE hsc_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade TEXT NOT NULL CHECK (grade IN ('Year 11', 'Year 12')),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2030),
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  marks INTEGER NOT NULL,
  question_number TEXT,
  question_text TEXT NOT NULL,
  graph_image_data TEXT,
  graph_image_size TEXT DEFAULT 'medium',
  marking_criteria TEXT,
  sample_answer TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Create indexes for fast queries
CREATE INDEX idx_hsc_questions_grade ON hsc_questions(grade);
CREATE INDEX idx_hsc_questions_year ON hsc_questions(year);
CREATE INDEX idx_hsc_questions_subject ON hsc_questions(subject);
CREATE INDEX idx_hsc_questions_topic ON hsc_questions(topic);
CREATE INDEX idx_hsc_questions_filters ON hsc_questions(grade, year, subject, topic);

-- Create student_saved_attempts table
CREATE TABLE student_saved_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES hsc_questions(id) ON DELETE CASCADE,
  canvas_image_url TEXT,
  feedback_json JSONB,
  submitted_at TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now()
);

-- Create indexes for student attempts
CREATE INDEX idx_attempts_user_id ON student_saved_attempts(user_id);
CREATE INDEX idx_attempts_question_id ON student_saved_attempts(question_id);
CREATE INDEX idx_attempts_user_submitted ON student_saved_attempts(user_id, submitted_at DESC);

-- Enable Row Level Security
ALTER TABLE hsc_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_saved_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hsc_questions (public read)
CREATE POLICY "Anyone can read questions" ON hsc_questions
  FOR SELECT USING (true);

-- RLS Policies for student_saved_attempts (private to user)
CREATE POLICY "Users can read their own attempts" ON student_saved_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attempts" ON student_saved_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attempts" ON student_saved_attempts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own attempts" ON student_saved_attempts
  FOR DELETE USING (auth.uid() = user_id);
```

If you already created the table, run:

```sql
ALTER TABLE hsc_questions ALTER COLUMN marking_criteria DROP NOT NULL;
ALTER TABLE hsc_questions ALTER COLUMN sample_answer DROP NOT NULL;
```

### Step 2: Configure Supabase Storage

1. Go to **Storage** in your Supabase dashboard
2. Create a new bucket called `hsc-answers`
3. Set it as **Public** (or configure CORS as needed)
4. Make sure the bucket allows image uploads

### Step 3: Verify Setup

Your tables should now be created. You'll see:
-- ✅ `hsc_questions` table with 11 columns
- ✅ `student_saved_attempts` table with 5 columns
- ✅ Indexes for fast filtering
- ✅ RLS policies enabled

## 📋 Schema Details

### hsc_questions Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| grade | TEXT | 'Year 11' or 'Year 12' |
| year | INTEGER | HSC exam year (e.g., 2024) |
| subject | TEXT | Subject name (e.g., 'Mathematics Advanced') |
| topic | TEXT | Topic name (e.g., 'Complex Numbers') |
| marks | INTEGER | Total marks for question |
| question_number | TEXT | Optional question number (e.g., 11 or 11a)) |
| question_text | TEXT | Full question in LaTeX format |
| graph_image_data | TEXT | Optional data URL for pre-rendered graph (e.g., PNG) |
| graph_image_size | TEXT | Optional size: small, medium, large (default: medium) |
| marking_criteria | TEXT | Marking criteria in LaTeX format (optional) |
| sample_answer | TEXT | Sample solution in LaTeX format (optional) |
| created_at | TIMESTAMP | When question was added |

### student_saved_attempts Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Links to users table |
| question_id | UUID | Links to hsc_questions |
| canvas_image_url | TEXT | Supabase Storage path to canvas image |
| feedback_json | JSONB | Stored feedback object (score, band, breakdown) |
| submitted_at | TIMESTAMP | When answer was submitted |
| created_at | TIMESTAMP | When record was created |

## 🚀 Don't Forget Vercel!

If deploying to production, make sure your Supabase credentials are in your Vercel environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Next Steps

1. Run the SQL above in Supabase
2. Run the data population script: `node scripts/populate-hsc-questions.js`
3. Restart your development server: `npm run dev`
4. Test the HSC Generator with filters and saving
