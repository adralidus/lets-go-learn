/*
  # Inquiry System Implementation

  1. New Tables
    - `inquiries` - Stores user inquiries from the landing page
      - `id` (uuid, primary key)
      - `email` (text, not null)
      - `subject` (text, not null)
      - `message` (text, not null)
      - `status` (text, not null) - 'new', 'read', 'responded', 'archived'
      - `is_read` (boolean, default false)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
      - `responded_at` (timestamptz)
      - `responded_by` (uuid, references users)
      - `response_message` (text)

  2. Security
    - Enable RLS on `inquiries` table
    - Add policy for super admins to manage inquiries
    - Add policy for admins to view inquiries

  3. Functions
    - `create_inquiry` - Function to create a new inquiry
    - `update_inquiry_status` - Function to update inquiry status
*/

-- Create inquiries table
CREATE TABLE IF NOT EXISTS inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  responded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  response_message text,
  CONSTRAINT check_status CHECK (status IN ('new', 'read', 'responded', 'archived'))
);

-- Enable RLS
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inquiries_email ON inquiries(email);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_is_read ON inquiries(is_read);

-- Create trigger for updated_at
CREATE TRIGGER update_inquiries_updated_at
  BEFORE UPDATE ON inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
CREATE POLICY "Super admins can manage inquiries"
  ON inquiries
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Admins can view inquiries"
  ON inquiries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Create function to create a new inquiry
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
    PERFORM create_system_notification(
      'New Inquiry: ' || p_subject,
      'Email: ' || p_email || E'\n\nMessage: ' || p_message,
      'info',
      'super_admin',
      NULL,
      false,
      NULL,
      NULL
    );
  END IF;
  
  RETURN inquiry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update inquiry status
CREATE OR REPLACE FUNCTION update_inquiry_status(
  p_inquiry_id uuid,
  p_status text,
  p_is_read boolean DEFAULT true,
  p_response_message text DEFAULT NULL,
  p_responded_by uuid DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  valid_status boolean;
BEGIN
  -- Validate status
  SELECT p_status IN ('new', 'read', 'responded', 'archived') INTO valid_status;
  
  IF NOT valid_status THEN
    RAISE EXCEPTION 'Invalid status: %. Must be one of: new, read, responded, archived', p_status;
  END IF;
  
  -- Update the inquiry
  UPDATE inquiries
  SET 
    status = p_status,
    is_read = p_is_read,
    updated_at = now(),
    responded_at = CASE WHEN p_status = 'responded' THEN now() ELSE responded_at END,
    responded_by = CASE WHEN p_status = 'responded' THEN p_responded_by ELSE responded_by END,
    response_message = CASE WHEN p_response_message IS NOT NULL THEN p_response_message ELSE response_message END
  WHERE id = p_inquiry_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;