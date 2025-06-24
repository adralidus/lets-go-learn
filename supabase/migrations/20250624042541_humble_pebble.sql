/*
  # Add exam folders and enhance review capabilities

  1. New Tables
    - `exam_folders`
      - `id` (uuid, primary key)
      - `name` (text, folder name)
      - `description` (text, optional description)
      - `created_by` (uuid, foreign key to users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Schema Changes
    - Add `folder_id` to `examinations` table (nullable, foreign key to exam_folders)

  3. Security
    - Enable RLS on `exam_folders` table
    - Add policies for folder management
    - Update examination policies to include folder access
*/

-- Create exam_folders table
CREATE TABLE IF NOT EXISTS exam_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  created_by uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add folder_id to examinations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'examinations' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE examinations ADD COLUMN folder_id uuid REFERENCES exam_folders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS on exam_folders
ALTER TABLE exam_folders ENABLE ROW LEVEL SECURITY;

-- Create policies for exam_folders
CREATE POLICY "Allow anon exam_folders select"
  ON exam_folders
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon exam_folders insert"
  ON exam_folders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anon exam_folders update"
  ON exam_folders
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon exam_folders delete"
  ON exam_folders
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_exam_folders_created_by ON exam_folders(created_by);
CREATE INDEX IF NOT EXISTS idx_examinations_folder_id ON examinations(folder_id);

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_exam_folders_updated_at'
  ) THEN
    CREATE TRIGGER update_exam_folders_updated_at
      BEFORE UPDATE ON exam_folders
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;