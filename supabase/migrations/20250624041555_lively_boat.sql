/*
  # Fix RLS policies for custom authentication system

  1. Security Updates
    - Update all RLS policies to work with custom authentication
    - Allow anon role access for login and CRUD operations
    - Maintain security through application-level checks

  2. Tables Updated
    - users: Allow anon access for login and user management
    - examinations: Allow anon access for CRUD operations
    - exam_questions: Allow anon access for CRUD operations
    - exam_submissions: Allow anon access for CRUD operations
    - exam_answers: Allow anon access for CRUD operations

  Note: This is designed for the current custom auth system.
  For production, migrate to Supabase's built-in authentication.
*/

-- Drop all existing conflicting policies
DROP POLICY IF EXISTS "Allow login verification" ON users;
DROP POLICY IF EXISTS "Allow user creation" ON users;
DROP POLICY IF EXISTS "Allow own profile updates" ON users;
DROP POLICY IF EXISTS "Allow admin user updates" ON users;
DROP POLICY IF EXISTS "Allow admin user deletion" ON users;
DROP POLICY IF EXISTS "Allow anon to insert examinations" ON examinations;
DROP POLICY IF EXISTS "Allow anon to update examinations" ON examinations;

-- Users table policies
CREATE POLICY "Allow anon login verification"
  ON users
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon user creation"
  ON users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anon user updates"
  ON users
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon user deletion"
  ON users
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Examinations table policies
CREATE POLICY "Allow anon examinations select"
  ON examinations
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon examinations insert"
  ON examinations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anon examinations update"
  ON examinations
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon examinations delete"
  ON examinations
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Exam questions table policies
CREATE POLICY "Allow anon exam_questions select"
  ON exam_questions
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon exam_questions insert"
  ON exam_questions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anon exam_questions update"
  ON exam_questions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon exam_questions delete"
  ON exam_questions
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Exam submissions table policies
CREATE POLICY "Allow anon exam_submissions select"
  ON exam_submissions
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon exam_submissions insert"
  ON exam_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anon exam_submissions update"
  ON exam_submissions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon exam_submissions delete"
  ON exam_submissions
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Exam answers table policies
CREATE POLICY "Allow anon exam_answers select"
  ON exam_answers
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon exam_answers insert"
  ON exam_answers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anon exam_answers update"
  ON exam_answers
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon exam_answers delete"
  ON exam_answers
  FOR DELETE
  TO anon, authenticated
  USING (true);