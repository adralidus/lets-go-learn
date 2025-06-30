/*
  # Fix update_inquiry_status function

  1. Changes
    - Drop existing function before recreating it
    - Recreate the function with the same functionality
*/

-- First drop the existing function
DROP FUNCTION IF EXISTS update_inquiry_status(UUID, TEXT, BOOLEAN, TEXT, UUID);

-- Create a function to update inquiry status
CREATE OR REPLACE FUNCTION update_inquiry_status(
  p_inquiry_id UUID,
  p_status TEXT,
  p_is_read BOOLEAN DEFAULT TRUE,
  p_response_message TEXT DEFAULT NULL,
  p_responded_by UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Validate status
  IF p_status NOT IN ('new', 'read', 'responded', 'archived') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;
  
  -- Update the inquiry
  UPDATE inquiries
  SET 
    status = p_status,
    is_read = p_is_read,
    updated_at = v_now
  WHERE id = p_inquiry_id;
  
  -- If status is 'responded', update response fields
  IF p_status = 'responded' AND p_response_message IS NOT NULL THEN
    UPDATE inquiries
    SET 
      response_message = p_response_message,
      responded_at = v_now,
      responded_by = p_responded_by
    WHERE id = p_inquiry_id;
  END IF;
END;
$$ LANGUAGE plpgsql;