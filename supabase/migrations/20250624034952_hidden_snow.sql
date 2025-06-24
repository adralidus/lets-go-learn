/*
  # LetsGoLearn (LGL) Database Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `username` (text, unique)
      - `email` (text, unique)
      - `full_name` (text)
      - `role` (text, enum: 'admin', 'student')
      - `password_hash` (text)
      - `last_login` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `examinations`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `scheduled_start` (timestamp)
      - `scheduled_end` (timestamp)
      - `duration_minutes` (integer)
      - `is_active` (boolean)
      - `created_by` (uuid, foreign key to users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `exam_questions`
      - `id` (uuid, primary key)
      - `exam_id` (uuid, foreign key to examinations)
      - `question_text` (text)
      - `question_type` (text, enum: 'multiple_choice', 'essay')
      - `options` (jsonb, for multiple choice options)
      - `correct_answer` (text, for multiple choice)
      - `points` (integer)
      - `is_required` (boolean)
      - `order_index` (integer)
      - `created_at` (timestamp)
    
    - `exam_submissions`
      - `id` (uuid, primary key)
      - `exam_id` (uuid, foreign key to examinations)
      - `student_id` (uuid, foreign key to users)
      - `started_at` (timestamp)
      - `submitted_at` (timestamp)
      - `total_score` (integer)
      - `max_score` (integer)
      - `status` (text, enum: 'in_progress', 'submitted', 'graded')
      - `created_at` (timestamp)
    
    - `exam_answers`
      - `id` (uuid, primary key)
      - `submission_id` (uuid, foreign key to exam_submissions)
      - `question_id` (uuid, foreign key to exam_questions)
      - `answer_text` (text)
      - `points_earned` (integer)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Students can only see their own data
    - Admins can manage all data

  3. Initial Data
    - Create default admin user
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'student');
CREATE TYPE question_type AS ENUM ('multiple_choice', 'essay');
CREATE TYPE submission_status AS ENUM ('in_progress', 'submitted', 'graded');

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  password_hash text NOT NULL,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Examinations table
CREATE TABLE IF NOT EXISTS examinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Exam questions table
CREATE TABLE IF NOT EXISTS exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid REFERENCES examinations(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type question_type NOT NULL,
  options jsonb DEFAULT '[]',
  correct_answer text,
  points integer NOT NULL DEFAULT 1,
  is_required boolean DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Exam submissions table
CREATE TABLE IF NOT EXISTS exam_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid REFERENCES examinations(id) ON DELETE CASCADE,
  student_id uuid REFERENCES users(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  submitted_at timestamptz,
  total_score integer DEFAULT 0,
  max_score integer DEFAULT 0,
  status submission_status DEFAULT 'in_progress',
  created_at timestamptz DEFAULT now(),
  UNIQUE(exam_id, student_id)
);

-- Exam answers table
CREATE TABLE IF NOT EXISTS exam_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES exam_submissions(id) ON DELETE CASCADE,
  question_id uuid REFERENCES exam_questions(id) ON DELETE CASCADE,
  answer_text text,
  points_earned integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(submission_id, question_id)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE examinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  USING (auth.uid()::text = id::text OR EXISTS (
    SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
  ));

CREATE POLICY "Admins can manage all users"
  ON users
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
  ));

-- RLS Policies for examinations table
CREATE POLICY "Students can read active exams"
  ON examinations
  FOR SELECT
  USING (
    is_active = true OR 
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
  );

CREATE POLICY "Admins can manage examinations"
  ON examinations
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
  ));

-- RLS Policies for exam_questions table
CREATE POLICY "Students can read questions for active exams"
  ON exam_questions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM examinations e 
    WHERE e.id = exam_id AND (
      e.is_active = true OR 
      EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
    )
  ));

CREATE POLICY "Admins can manage exam questions"
  ON exam_questions
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
  ));

-- RLS Policies for exam_submissions table
CREATE POLICY "Students can manage own submissions"
  ON exam_submissions
  FOR ALL
  USING (
    student_id::text = auth.uid()::text OR 
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
  );

-- RLS Policies for exam_answers table
CREATE POLICY "Students can manage own answers"
  ON exam_answers
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM exam_submissions es 
    WHERE es.id = submission_id AND (
      es.student_id::text = auth.uid()::text OR 
      EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
    )
  ));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_examinations_active ON examinations(is_active);
CREATE INDEX IF NOT EXISTS idx_examinations_schedule ON examinations(scheduled_start, scheduled_end);
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_id ON exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_order ON exam_questions(exam_id, order_index);
CREATE INDEX IF NOT EXISTS idx_exam_submissions_student ON exam_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_submissions_exam ON exam_submissions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_submission ON exam_answers(submission_id);

-- Insert default admin user (password: lgladmin2025!)
-- Note: In a real application, you would hash the password properly
INSERT INTO users (username, email, full_name, role, password_hash) 
VALUES (
  'lgl.admin', 
  'admin@letsgolearn.com', 
  'LGL Administrator', 
  'admin', 
  '$2b$10$rQZ8kHWxvkxGxH8YqKqOHOxGxH8YqKqOHOxGxH8YqKqOHOxGxH8YqK'
) ON CONFLICT (username) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_examinations_updated_at BEFORE UPDATE ON examinations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();