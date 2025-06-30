/*
  # Fix inquiry submission for anonymous users

  1. Security Changes
    - Add RLS policy to allow anonymous users to insert inquiries
    - Create RPC function for secure inquiry creation
  
  2. New Functions
    - `create_inquiry` - Allows anonymous users to submit inquiries safely
*/

-- Create RLS policy to allow anonymous users to insert inquiries
CREATE POLICY "Allow anonymous inquiry submission"
  ON inquiries
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create function to handle inquiry creation
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
  
  RETURN inquiry_id;
END;
$$;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION create_inquiry(text, text, text) TO anon;