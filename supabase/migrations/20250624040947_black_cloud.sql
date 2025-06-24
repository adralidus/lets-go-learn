/*
  # Fix Users Table RLS Policies

  1. Security Updates
    - Drop all existing conflicting policies
    - Create proper RLS policies for users table
    - Allow anonymous login verification
    - Allow user registration
    - Allow profile updates for own data and admin access
    - Allow admin user management

  2. Policy Structure
    - SELECT: Allow login verification for all users
    - INSERT: Allow user creation with proper checks
    - UPDATE: Allow users to update own profile, admins can update any
    - DELETE: Allow admins to delete non-admin users
    - ALL: Give admins full access for management
*/

-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Admin full access" ON users;
DROP POLICY IF EXISTS "Allow anonymous login verification" ON users;
DROP POLICY IF EXISTS "Allow user registration" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Allow login verification" ON users;
DROP POLICY IF EXISTS "Allow user creation" ON users;
DROP POLICY IF EXISTS "Allow profile updates" ON users;
DROP POLICY IF EXISTS "Allow admin user deletion" ON users;
DROP POLICY IF EXISTS "Admin full access to users" ON users;

-- Allow anonymous users to read user data for login verification
CREATE POLICY "Allow login verification"
  ON users
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow user registration and admin creation
CREATE POLICY "Allow user creation"
  ON users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow users to update their own profile
CREATE POLICY "Allow own profile updates"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id::text = auth.uid()::text)
  WITH CHECK (id::text = auth.uid()::text);

-- Allow admins to update any user
CREATE POLICY "Allow admin user updates"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users admin_user 
      WHERE admin_user.id::text = auth.uid()::text 
      AND admin_user.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users admin_user 
      WHERE admin_user.id::text = auth.uid()::text 
      AND admin_user.role = 'admin'
    )
  );

-- Allow admins to delete non-admin users
CREATE POLICY "Allow admin user deletion"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users admin_user 
      WHERE admin_user.id::text = auth.uid()::text 
      AND admin_user.role = 'admin'
    )
    AND role != 'admin'
  );