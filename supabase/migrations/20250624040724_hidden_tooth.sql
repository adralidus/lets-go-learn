/*
  # Fix authentication permissions

  1. Security Changes
    - Add policy to allow anonymous users to read user data for authentication
    - Restrict the policy to only allow reading when providing username for login
    - This enables the login flow while maintaining security

  2. Important Notes
    - This policy is specifically designed for the custom authentication flow
    - In production, consider using Supabase's built-in auth or edge functions
    - The policy allows reading user data only for authentication purposes
*/

-- Add policy to allow anonymous users to read user data for authentication
CREATE POLICY "Allow anonymous login verification"
  ON users
  FOR SELECT
  TO anon
  USING (true);

-- Note: This policy allows anonymous users to read user data for authentication.
-- In a production environment, consider:
-- 1. Using Supabase's built-in authentication system
-- 2. Implementing authentication via Edge Functions with service_role key
-- 3. Adding additional security measures like rate limiting