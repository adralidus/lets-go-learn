/*
  # Fix RLS policies for users table

  1. Security Changes
    - Drop existing problematic policies that cause infinite recursion
    - Create simplified policies that don't reference the users table within itself
    - Separate admin access from user self-access to avoid circular dependencies

  2. New Policies
    - Users can read their own data using auth.uid()
    - Admins get separate policy using a different approach
    - Simplified policy structure to prevent recursion
*/

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

-- Create new simplified policies
-- Policy for users to read their own data
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO public
  USING (auth.uid()::text = id::text);

-- Policy for users to update their own data
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO public
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- Policy for admin access - simplified to avoid recursion
-- This assumes we'll handle admin checks in the application layer
CREATE POLICY "Admin full access"
  ON users
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'admin@letsgolearn.com'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'admin@letsgolearn.com'
    )
  );

-- Policy for inserting new users (registration)
CREATE POLICY "Allow user registration"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (true);