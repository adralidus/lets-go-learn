/*
  # Fix Inquiry RLS Policies

  1. New Policies
    - Add policy to allow super admins to view all inquiries
    - Add policy to allow admins to view inquiries
  
  2. Security
    - Ensure proper access control for inquiries table
*/

-- Add policy to allow super admins to view all inquiries
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'inquiries' AND policyname = 'Super admins can manage inquiries'
  ) THEN
    EXECUTE 'CREATE POLICY "Super admins can manage inquiries" ON inquiries FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE (users.id)::text = (uid())::text AND users.role = ''super_admin''::user_role))';
  END IF;
END $$;

-- Add policy to allow admins to view inquiries
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'inquiries' AND policyname = 'Admins can view inquiries'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can view inquiries" ON inquiries FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE (users.id)::text = (uid())::text AND users.role = ANY (ARRAY[''admin''::user_role, ''super_admin''::user_role])))';
  END IF;
END $$;

-- Ensure RLS is enabled on the inquiries table
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- Add a test inquiry to verify the system works
INSERT INTO inquiries (
  email,
  subject,
  message,
  status,
  is_read,
  created_at
) VALUES (
  'test.policy@example.com',
  'Test Policy Inquiry',
  'This is a test inquiry to verify that the RLS policies are working correctly.',
  'new',
  false,
  NOW()
);

-- Create notification for the test inquiry
INSERT INTO system_notifications (
  title,
  message,
  notification_type,
  target_role,
  is_read,
  is_system_wide
) VALUES (
  'New Inquiry: Test Policy Inquiry',
  'Email: test.policy@example.com

This is a test inquiry to verify that the RLS policies are working correctly.',
  'info',
  'super_admin',
  false,
  false
);