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
('test@example.com', 'Information Request', 'I would like to learn more about your learning management system.', 'new', now()),
('student@school.edu', 'Pricing Inquiry', 'Can you provide information about pricing for our school?', 'new', now()),
('teacher@academy.org', 'Demo Request', 'I am interested in scheduling a demo of your platform for our teachers.', 'new', now());