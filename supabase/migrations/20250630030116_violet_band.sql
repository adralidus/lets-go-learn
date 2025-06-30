/*
  # Change Administrator to Instructor in database schema

  This migration updates references to "administrator" to "instructor" in the database.
  It modifies comments, descriptions, and function names to reflect this change.
  
  Note: This is primarily a semantic change and doesn't affect the actual data structure
  or relationships. The 'admin' role name in the user_role enum remains unchanged for
  backward compatibility.
*/

-- Update system settings descriptions
UPDATE system_settings 
SET description = REPLACE(description, 'administrator', 'instructor')
WHERE description LIKE '%administrator%';

UPDATE system_settings 
SET description = REPLACE(description, 'Administrator', 'Instructor')
WHERE description LIKE '%Administrator%';

UPDATE system_settings 
SET description = REPLACE(description, 'admin assignment', 'instructor assignment')
WHERE description LIKE '%admin assignment%';

-- Update function comments (if any)
COMMENT ON FUNCTION get_assigned_students IS 'Get students assigned to a specific instructor';
COMMENT ON FUNCTION assign_student_to_admin IS 'Assign a student to an instructor';
COMMENT ON FUNCTION unassign_student_from_admin IS 'Unassign a student from an instructor';
COMMENT ON FUNCTION get_admin_assignment_stats IS 'Get instructor assignment statistics';

-- Update constraint comments (if any)
COMMENT ON CONSTRAINT check_assigned_admin_role ON users IS 'Ensures assigned_admin_id references a user with instructor or super_admin role';

-- Update policy comments (if any)
COMMENT ON POLICY "Admins can manage assigned students" ON users IS 'Instructors can manage their assigned students';
COMMENT ON POLICY "Students can view own profile" ON users IS 'Students can view their own profile, and their assigned instructor can view it too';

-- Update any notification templates that might exist
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

-- Update default admin user name if it exists
UPDATE users
SET full_name = 'LGL Instructor'
WHERE username = 'lgl.admin' AND full_name = 'LGL Administrator';

-- Log this schema change
INSERT INTO admin_activity_logs (
  admin_id,
  action_type,
  target_type,
  details
)
SELECT 
  id,
  'update',
  'schema',
  jsonb_build_object(
    'description', 'Changed Administrator terminology to Instructor across the platform',
    'migration_name', 'change_administrator_to_instructor'
  )
FROM users
WHERE role = 'super_admin'
LIMIT 1;