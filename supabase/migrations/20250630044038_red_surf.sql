/*
  # Fix Inquiry System

  1. Updates
    - Fix the create_inquiry function to properly create notifications
    - Add test data to verify the system works
*/

-- Fix the create_inquiry function to properly create notifications
CREATE OR REPLACE FUNCTION create_inquiry(
  p_email text,
  p_subject text,
  p_message text
)
RETURNS uuid AS $$
DECLARE
  inquiry_id uuid;
  super_admin_id uuid;
BEGIN
  -- Insert the inquiry
  INSERT INTO inquiries (
    email,
    subject,
    message,
    status
  ) VALUES (
    p_email,
    p_subject,
    p_message,
    'new'
  ) RETURNING id INTO inquiry_id;
  
  -- Find a super admin to notify
  SELECT id INTO super_admin_id
  FROM users
  WHERE role = 'super_admin'
  LIMIT 1;
  
  -- Create a system notification for the super admin
  IF super_admin_id IS NOT NULL THEN
    INSERT INTO system_notifications (
      title,
      message,
      notification_type,
      target_role,
      is_system_wide,
      is_read,
      created_at
    ) VALUES (
      'New Inquiry: ' || p_subject,
      'Email: ' || p_email || E'\n\nMessage: ' || p_message,
      'info',
      'super_admin',
      false,
      false,
      now()
    );
  END IF;
  
  RETURN inquiry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add some test data to verify the system works
INSERT INTO inquiries (email, subject, message, status, created_at)
VALUES 
('john.doe@example.com', 'Pricing Information Request', 'Hello, I would like to know more about your pricing plans for educational institutions. We have approximately 500 students and 50 teachers. Could you provide a quote for our school?', 'new', now() - interval '2 days'),
('sarah.smith@university.edu', 'Integration with Canvas LMS', 'We are currently using Canvas LMS at our university. Is it possible to integrate your system with Canvas? What would be the process and timeline for such integration?', 'new', now() - interval '1 day'),
('director@academy.org', 'Demo Request for Board Meeting', 'We have an upcoming board meeting next month and would like to showcase your platform. Is it possible to schedule a comprehensive demo for our administrative team?', 'new', now() - interval '3 hours'),
('tech.lead@school.net', 'Technical Requirements Question', 'What are the minimum technical requirements for implementing your system? We have concerns about our current infrastructure and would like to know if any upgrades would be necessary.', 'new', now() - interval '5 hours'),
('parent.association@district.edu', 'Parent Access Features', 'Our parent association is interested in learning more about the parent access features of your platform. Do parents have their own login? What kind of information can they access about their children?', 'new', now());