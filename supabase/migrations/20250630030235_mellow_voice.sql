/*
  # Change Administrator terminology to Instructor

  1. Updates
    - Update system settings descriptions to use "instructor" instead of "administrator"
    - Update notification messages and titles
    - Update default admin user name
    - Log the schema change

  2. Safety
    - Only updates existing data
    - Avoids referencing potentially non-existent database objects
    - Uses conditional checks where appropriate
*/

-- Update system settings descriptions (only if the table exists and has data)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_settings') THEN
    UPDATE system_settings 
    SET description = REPLACE(description, 'administrator', 'instructor')
    WHERE description LIKE '%administrator%';

    UPDATE system_settings 
    SET description = REPLACE(description, 'Administrator', 'Instructor')
    WHERE description LIKE '%Administrator%';

    UPDATE system_settings 
    SET description = REPLACE(description, 'admin assignment', 'instructor assignment')
    WHERE description LIKE '%admin assignment%';
  END IF;
END $$;

-- Update notification messages (only if the table exists and has data)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_notifications') THEN
    UPDATE system_notifications
    SET message = REPLACE(message, 'administrator', 'instructor')
    WHERE message LIKE '%administrator%';

    UPDATE system_notifications
    SET message = REPLACE(message, 'Administrator', 'Instructor')
    WHERE message LIKE '%Administrator%';

    UPDATE system_notifications
    SET title = REPLACE(title, 'administrator', 'instructor')
    WHERE title LIKE '%administrator%';

    UPDATE system_notifications
    SET title = REPLACE(title, 'Administrator', 'Instructor')
    WHERE title LIKE '%Administrator%';
  END IF;
END $$;

-- Update default admin user name if it exists
UPDATE users
SET full_name = 'LGL Instructor'
WHERE username = 'lgl.admin' AND full_name = 'LGL Administrator';

-- Update any activity log entries that reference administrators
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_activity_logs') THEN
    UPDATE admin_activity_logs
    SET details = jsonb_set(
      details,
      '{description}',
      to_jsonb(REPLACE(details->>'description', 'administrator', 'instructor'))
    )
    WHERE details->>'description' LIKE '%administrator%';

    UPDATE admin_activity_logs
    SET details = jsonb_set(
      details,
      '{description}',
      to_jsonb(REPLACE(details->>'description', 'Administrator', 'Instructor'))
    )
    WHERE details->>'description' LIKE '%Administrator%';
  END IF;
END $$;

-- Add function comments only if the functions exist
DO $$
BEGIN
  -- Check and comment on get_assigned_students function
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_assigned_students') THEN
    COMMENT ON FUNCTION get_assigned_students IS 'Get students assigned to a specific instructor';
  END IF;

  -- Check and comment on assign_student_to_admin function
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'assign_student_to_admin') THEN
    COMMENT ON FUNCTION assign_student_to_admin IS 'Assign a student to an instructor';
  END IF;

  -- Check and comment on get_admin_assignment_stats function
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_admin_assignment_stats') THEN
    COMMENT ON FUNCTION get_admin_assignment_stats IS 'Get instructor assignment statistics';
  END IF;
END $$;

-- Update policy comments only if they exist
DO $$
BEGIN
  -- Update policy comment for "Admins can manage assigned students" if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_type = 'ROW LEVEL SECURITY' 
    AND table_name = 'users'
  ) THEN
    -- Note: PostgreSQL doesn't have a direct way to check if a specific policy exists
    -- So we'll attempt to comment and ignore errors
    BEGIN
      EXECUTE 'COMMENT ON POLICY "Admins can manage assigned students" ON users IS ''Instructors can manage their assigned students''';
    EXCEPTION WHEN OTHERS THEN
      -- Policy doesn't exist, ignore the error
      NULL;
    END;

    BEGIN
      EXECUTE 'COMMENT ON POLICY "Students can view own profile" ON users IS ''Students can view their own profile, and their assigned instructor can view it too''';
    EXCEPTION WHEN OTHERS THEN
      -- Policy doesn't exist, ignore the error
      NULL;
    END;
  END IF;
END $$;

-- Log this schema change (only if we have a super admin user)
DO $$
DECLARE
  super_admin_id uuid;
BEGIN
  -- Find a super admin user to log this change
  SELECT id INTO super_admin_id
  FROM users
  WHERE role = 'super_admin'
  LIMIT 1;

  -- Only log if we found a super admin and the activity logs table exists
  IF super_admin_id IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_activity_logs') THEN
    INSERT INTO admin_activity_logs (
      admin_id,
      action_type,
      target_type,
      details
    ) VALUES (
      super_admin_id,
      'update',
      'schema',
      jsonb_build_object(
        'description', 'Changed Administrator terminology to Instructor across the platform',
        'migration_name', 'change_administrator_to_instructor',
        'timestamp', now()
      )
    );
  END IF;
END $$;