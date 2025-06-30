/*
  # Fix Inquiry System

  1. Changes
    - Fix the create_inquiry function to properly insert inquiries
    - Add notification creation for new inquiries
    - Add test data to verify the system works correctly
*/

-- First, let's fix the create_inquiry function
CREATE OR REPLACE FUNCTION create_inquiry(
  p_email TEXT,
  p_subject TEXT,
  p_message TEXT
) RETURNS UUID AS $$
DECLARE
  v_inquiry_id UUID;
  v_super_admin_id UUID;
BEGIN
  -- Insert the inquiry
  INSERT INTO inquiries (
    email,
    subject,
    message,
    status,
    is_read
  ) VALUES (
    p_email,
    p_subject,
    p_message,
    'new',
    false
  ) RETURNING id INTO v_inquiry_id;
  
  -- Get a super admin to notify
  SELECT id INTO v_super_admin_id FROM users WHERE role = 'super_admin' LIMIT 1;
  
  -- Create a notification for super admins
  IF v_super_admin_id IS NOT NULL THEN
    INSERT INTO system_notifications (
      title,
      message,
      notification_type,
      target_role,
      is_read,
      is_system_wide
    ) VALUES (
      'New Inquiry: ' || p_subject,
      'Email: ' || p_email || E'\n\n' || p_message,
      'info',
      'super_admin',
      false,
      false
    );
  END IF;
  
  RETURN v_inquiry_id;
END;
$$ LANGUAGE plpgsql;

-- Add some test inquiries to verify the system works
INSERT INTO inquiries (
  email,
  subject,
  message,
  status,
  is_read,
  created_at
) VALUES 
(
  'test@example.com',
  'Information Request',
  'I would like to learn more about your learning management system. Can you provide more details about pricing?',
  'new',
  false,
  NOW() - INTERVAL '2 days'
),
(
  'student@school.edu',
  'Student Account Question',
  'Hello, I am a student at Springfield High School. Our teacher mentioned we would be using your platform. How do I create an account?',
  'new',
  false,
  NOW() - INTERVAL '1 day'
),
(
  'principal@academy.org',
  'School-wide Implementation',
  'Our school is interested in implementing your LMS for all classes. Could someone contact me to discuss enterprise pricing and features?',
  'new',
  false,
  NOW() - INTERVAL '3 hours'
);

-- Create notifications for the test inquiries
INSERT INTO system_notifications (
  title,
  message,
  notification_type,
  target_role,
  is_read,
  is_system_wide,
  created_at
) VALUES 
(
  'New Inquiry: Information Request',
  'Email: test@example.com

I would like to learn more about your learning management system. Can you provide more details about pricing?',
  'info',
  'super_admin',
  false,
  false,
  NOW() - INTERVAL '2 days'
),
(
  'New Inquiry: Student Account Question',
  'Email: student@school.edu

Hello, I am a student at Springfield High School. Our teacher mentioned we would be using your platform. How do I create an account?',
  'info',
  'super_admin',
  false,
  false,
  NOW() - INTERVAL '1 day'
),
(
  'New Inquiry: School-wide Implementation',
  'Email: principal@academy.org

Our school is interested in implementing your LMS for all classes. Could someone contact me to discuss enterprise pricing and features?',
  'info',
  'super_admin',
  false,
  false,
  NOW() - INTERVAL '3 hours'
);