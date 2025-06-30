-- Add assigned_admin_id column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'assigned_admin_id'
  ) THEN
    ALTER TABLE users ADD COLUMN assigned_admin_id uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_assigned_admin ON users(assigned_admin_id);

-- Create trigger function to validate admin assignment
CREATE OR REPLACE FUNCTION validate_assigned_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- If assigned_admin_id is not null, verify it's a valid admin
  IF NEW.assigned_admin_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM users 
      WHERE id = NEW.assigned_admin_id 
      AND role IN ('admin', 'super_admin')
    ) THEN
      RAISE EXCEPTION 'assigned_admin_id must reference a user with admin or super_admin role';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce admin assignment validation
DROP TRIGGER IF EXISTS trigger_validate_assigned_admin ON users;
CREATE TRIGGER trigger_validate_assigned_admin
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION validate_assigned_admin();

-- Update existing RLS policies for users table to include admin assignment logic
DROP POLICY IF EXISTS "Allow anon user creation" ON users;
DROP POLICY IF EXISTS "Allow anon user deletion" ON users;
DROP POLICY IF EXISTS "Allow anon user updates" ON users;
DROP POLICY IF EXISTS "Allow anon login verification" ON users;

-- Create new comprehensive RLS policies for users table
CREATE POLICY "Super admins can manage all users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text 
      AND u.role = 'super_admin'
    )
  );

CREATE POLICY "Admins can manage assigned students"
  ON users
  FOR ALL
  TO authenticated
  USING (
    -- Allow access to own record
    id::text = auth.uid()::text
    OR
    -- Allow super admins full access
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text 
      AND u.role = 'super_admin'
    )
    OR
    -- Allow admins to access their assigned students
    (
      role = 'student' 
      AND assigned_admin_id::text = auth.uid()::text
      AND EXISTS (
        SELECT 1 FROM users u
        WHERE u.id::text = auth.uid()::text 
        AND u.role IN ('admin', 'super_admin')
      )
    )
  );

CREATE POLICY "Students can view own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id::text = auth.uid()::text
    OR
    -- Allow super admins and assigned admins to view
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text 
      AND (
        u.role = 'super_admin'
        OR (
          u.role = 'admin' 
          AND u.id = assigned_admin_id
        )
      )
    )
  );

CREATE POLICY "Allow authentication queries"
  ON users
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow user registration"
  ON users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Function to get students assigned to an admin
CREATE OR REPLACE FUNCTION get_assigned_students(admin_user_id uuid)
RETURNS TABLE (
  id uuid,
  username text,
  email text,
  full_name text,
  role user_role,
  last_login timestamptz,
  created_at timestamptz,
  assigned_admin_id uuid
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    u.email,
    u.full_name,
    u.role,
    u.last_login,
    u.created_at,
    u.assigned_admin_id
  FROM users u
  WHERE u.role = 'student' 
  AND u.assigned_admin_id = admin_user_id
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign student to admin
CREATE OR REPLACE FUNCTION assign_student_to_admin(
  student_user_id uuid,
  admin_user_id uuid,
  assigned_by_user_id uuid
)
RETURNS boolean AS $$
DECLARE
  admin_exists boolean;
  student_exists boolean;
BEGIN
  -- Verify admin exists and has correct role
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = admin_user_id 
    AND role IN ('admin', 'super_admin')
  ) INTO admin_exists;
  
  -- Verify student exists and has correct role
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = student_user_id 
    AND role = 'student'
  ) INTO student_exists;
  
  IF NOT admin_exists THEN
    RAISE EXCEPTION 'Invalid admin user ID or user is not an admin';
  END IF;
  
  IF NOT student_exists THEN
    RAISE EXCEPTION 'Invalid student user ID or user is not a student';
  END IF;
  
  -- Update student assignment
  UPDATE users 
  SET assigned_admin_id = admin_user_id,
      updated_at = now()
  WHERE id = student_user_id;
  
  -- Log the assignment activity (only if admin_activity_logs table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_activity_logs') THEN
    INSERT INTO admin_activity_logs (
      admin_id,
      action_type,
      target_type,
      target_id,
      details
    ) VALUES (
      assigned_by_user_id,
      'assign',
      'student',
      student_user_id,
      jsonb_build_object(
        'assigned_to_admin', admin_user_id,
        'action', 'student_assignment'
      )
    );
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unassign student from admin
CREATE OR REPLACE FUNCTION unassign_student_from_admin(
  student_user_id uuid,
  unassigned_by_user_id uuid
)
RETURNS boolean AS $$
DECLARE
  student_exists boolean;
  old_admin_id uuid;
BEGIN
  -- Verify student exists and has correct role
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = student_user_id 
    AND role = 'student'
  ) INTO student_exists;
  
  IF NOT student_exists THEN
    RAISE EXCEPTION 'Invalid student user ID or user is not a student';
  END IF;
  
  -- Get current admin assignment
  SELECT assigned_admin_id INTO old_admin_id
  FROM users 
  WHERE id = student_user_id;
  
  -- Update student assignment to null
  UPDATE users 
  SET assigned_admin_id = NULL,
      updated_at = now()
  WHERE id = student_user_id;
  
  -- Log the unassignment activity (only if admin_activity_logs table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_activity_logs') THEN
    INSERT INTO admin_activity_logs (
      admin_id,
      action_type,
      target_type,
      target_id,
      details
    ) VALUES (
      unassigned_by_user_id,
      'unassign',
      'student',
      student_user_id,
      jsonb_build_object(
        'previous_admin', old_admin_id,
        'action', 'student_unassignment'
      )
    );
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get admin assignment statistics
CREATE OR REPLACE FUNCTION get_admin_assignment_stats()
RETURNS TABLE (
  admin_id uuid,
  admin_name text,
  admin_username text,
  assigned_students_count bigint,
  total_students bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH admin_stats AS (
    SELECT 
      a.id as admin_id,
      a.full_name as admin_name,
      a.username as admin_username,
      COUNT(s.id) as assigned_students_count
    FROM users a
    LEFT JOIN users s ON s.assigned_admin_id = a.id AND s.role = 'student'
    WHERE a.role IN ('admin', 'super_admin')
    GROUP BY a.id, a.full_name, a.username
  ),
  total_count AS (
    SELECT COUNT(*) as total_students
    FROM users 
    WHERE role = 'student'
  )
  SELECT 
    admin_stats.admin_id,
    admin_stats.admin_name,
    admin_stats.admin_username,
    admin_stats.assigned_students_count,
    total_count.total_students
  FROM admin_stats
  CROSS JOIN total_count
  ORDER BY admin_stats.assigned_students_count DESC, admin_stats.admin_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unassigned students
CREATE OR REPLACE FUNCTION get_unassigned_students()
RETURNS TABLE (
  id uuid,
  username text,
  email text,
  full_name text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    u.email,
    u.full_name,
    u.created_at
  FROM users u
  WHERE u.role = 'student' 
  AND u.assigned_admin_id IS NULL
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert initial system setting for requiring admin assignment (only if system_settings table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_settings') THEN
    INSERT INTO system_settings (setting_key, setting_value, description, category, is_public) VALUES
    ('require_admin_assignment', 'true', 'Require admin assignment when creating students', 'user_management', false)
    ON CONFLICT (setting_key) DO NOTHING;
  END IF;
END $$;