/*
  # Fix inquiry submission RLS policy and create_inquiry function

  1. Add RLS policy for anonymous inquiry submission
  2. Create a secure create_inquiry function with SECURITY DEFINER
  3. Grant execute permissions to anonymous users
*/

-- Create RLS policy to allow anonymous users to insert inquiries
CREATE POLICY IF NOT EXISTS "Allow anonymous inquiry submission"
  ON inquiries
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create function to handle inquiry creation with SECURITY DEFINER
-- This allows the function to bypass RLS and insert records even for anonymous users
CREATE OR REPLACE FUNCTION create_inquiry(
  p_email text,
  p_subject text,
  p_message text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inquiry_id uuid;
  v_super_admin_id uuid;
BEGIN
  -- Validate input parameters
  IF p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;
  
  IF p_subject IS NULL OR p_subject = '' THEN
    RAISE EXCEPTION 'Subject is required';
  END IF;
  
  IF p_message IS NULL OR p_message = '' THEN
    RAISE EXCEPTION 'Message is required';
  END IF;
  
  -- Insert the inquiry
  INSERT INTO inquiries (email, subject, message, status, is_read)
  VALUES (p_email, p_subject, p_message, 'new', false)
  RETURNING id INTO inquiry_id;
  
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
  
  RETURN inquiry_id;
END;
$$;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION create_inquiry(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION create_inquiry(text, text, text) TO authenticated;