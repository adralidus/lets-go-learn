/*
# Super Admin System Setup

This migration adds comprehensive Super Admin functionality to the LetsGoLearn system.

## New Features Added:
1. Super Admin role with enhanced permissions
2. Admin activity logging system
3. System settings management
4. User session tracking
5. Admin permissions framework
6. System-wide notifications
7. Comprehensive security policies

## Tables Created:
- admin_activity_logs: Track all admin actions
- system_settings: Configurable system parameters
- user_sessions: Active user session management
- admin_permissions: Granular admin permissions
- system_notifications: System-wide messaging

## Security:
- Row Level Security enabled on all tables
- Proper access controls for different user roles
- Audit trail for all administrative actions
*/

-- Step 1: Add super_admin to user_role enum
DO $$
BEGIN
  -- Check if super_admin value already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'super_admin' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    ALTER TYPE user_role ADD VALUE 'super_admin';
  END IF;
END $$;

-- Step 2: Create admin activity logs table
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Step 3: Create system settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  description text,
  category text DEFAULT 'general',
  is_public boolean DEFAULT false,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 4: Create user sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  ip_address inet,
  user_agent text,
  is_active boolean DEFAULT true,
  last_activity timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Step 5: Create admin permissions table
CREATE TABLE IF NOT EXISTS admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES users(id) ON DELETE CASCADE,
  permission_type text NOT NULL,
  resource_type text NOT NULL,
  can_create boolean DEFAULT false,
  can_read boolean DEFAULT true,
  can_update boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  granted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(admin_id, permission_type, resource_type)
);

-- Step 6: Create system notifications table
CREATE TABLE IF NOT EXISTS system_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  notification_type text DEFAULT 'info',
  target_role text,
  target_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  is_system_wide boolean DEFAULT false,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  CONSTRAINT check_notification_type CHECK (notification_type IN ('info', 'warning', 'error', 'success')),
  CONSTRAINT check_target_role CHECK (target_role IS NULL OR target_role IN ('super_admin', 'admin', 'student'))
);

-- Step 7: Enable RLS on all new tables
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;

-- Step 8: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id ON admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at ON admin_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_action_type ON admin_activity_logs(action_type);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active, last_activity);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);

CREATE INDEX IF NOT EXISTS idx_admin_permissions_admin_id ON admin_permissions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_resource ON admin_permissions(resource_type);

CREATE INDEX IF NOT EXISTS idx_system_notifications_target ON system_notifications(target_role, target_user_id);
CREATE INDEX IF NOT EXISTS idx_system_notifications_created_at ON system_notifications(created_at DESC);

-- Step 9: Create utility functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 10: Create triggers
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 11: Create admin activity logging function
CREATE OR REPLACE FUNCTION log_admin_activity(
  p_admin_id uuid,
  p_action_type text,
  p_target_type text,
  p_target_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}',
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO admin_activity_logs (
    admin_id,
    action_type,
    target_type,
    target_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_admin_id,
    p_action_type,
    p_target_type,
    p_target_id,
    p_details,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 12: Create system notification function
CREATE OR REPLACE FUNCTION create_system_notification(
  p_title text,
  p_message text,
  p_notification_type text DEFAULT 'info',
  p_target_role text DEFAULT NULL,
  p_target_user_id uuid DEFAULT NULL,
  p_is_system_wide boolean DEFAULT false,
  p_created_by uuid DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO system_notifications (
    title,
    message,
    notification_type,
    target_role,
    target_user_id,
    is_system_wide,
    created_by,
    expires_at
  ) VALUES (
    p_title,
    p_message,
    p_notification_type,
    p_target_role,
    p_target_user_id,
    p_is_system_wide,
    p_created_by,
    p_expires_at
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 13: Create system settings functions
CREATE OR REPLACE FUNCTION get_system_setting(p_setting_key text)
RETURNS jsonb AS $$
DECLARE
  setting_value jsonb;
BEGIN
  SELECT system_settings.setting_value INTO setting_value
  FROM system_settings
  WHERE setting_key = p_setting_key;
  
  RETURN setting_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_system_setting(
  p_setting_key text,
  p_setting_value jsonb,
  p_updated_by uuid
)
RETURNS boolean AS $$
BEGIN
  UPDATE system_settings
  SET setting_value = p_setting_value,
      updated_by = p_updated_by,
      updated_at = now()
  WHERE setting_key = p_setting_key;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 14: Create RLS policies for admin_activity_logs
CREATE POLICY "Super admins can view all activity logs"
  ON admin_activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role::text = 'super_admin'
    )
  );

CREATE POLICY "Admins can view own activity logs"
  ON admin_activity_logs
  FOR SELECT
  TO authenticated
  USING (
    admin_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role::text = 'super_admin'
    )
  );

CREATE POLICY "System can insert activity logs"
  ON admin_activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Step 15: Create RLS policies for system_settings
CREATE POLICY "Super admins can manage system settings"
  ON system_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role::text = 'super_admin'
    )
  );

CREATE POLICY "Users can read public settings"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (is_public = true);

-- Step 16: Create RLS policies for user_sessions
CREATE POLICY "Super admins can view all sessions"
  ON user_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role::text = 'super_admin'
    )
  );

CREATE POLICY "Users can view own sessions"
  ON user_sessions
  FOR SELECT
  TO authenticated
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "System can manage sessions"
  ON user_sessions
  FOR ALL
  TO authenticated
  USING (true);

-- Step 17: Create RLS policies for admin_permissions
CREATE POLICY "Super admins can manage admin permissions"
  ON admin_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role::text = 'super_admin'
    )
  );

CREATE POLICY "Admins can view own permissions"
  ON admin_permissions
  FOR SELECT
  TO authenticated
  USING (
    admin_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role::text = 'super_admin'
    )
  );

-- Step 18: Create RLS policies for system_notifications
CREATE POLICY "Users can view targeted notifications"
  ON system_notifications
  FOR SELECT
  TO authenticated
  USING (
    is_system_wide = true
    OR target_user_id::text = auth.uid()::text
    OR (target_role IS NOT NULL AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role::text = target_role
    ))
  );

CREATE POLICY "Super admins can manage notifications"
  ON system_notifications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role::text = 'super_admin'
    )
  );

-- Step 19: Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description, category, is_public) VALUES
('app_name', '"LetsGoLearn"', 'Application name', 'general', true),
('app_version', '"1.0.0"', 'Application version', 'general', true),
('maintenance_mode', 'false', 'Enable maintenance mode', 'system', false),
('max_login_attempts', '5', 'Maximum login attempts before lockout', 'security', false),
('session_timeout_minutes', '30', 'Session timeout in minutes', 'security', false),
('allow_student_registration', 'false', 'Allow students to self-register', 'registration', false),
('default_exam_duration', '60', 'Default exam duration in minutes', 'exams', false),
('max_file_upload_size', '10485760', 'Maximum file upload size in bytes (10MB)', 'files', false),
('email_notifications_enabled', 'true', 'Enable email notifications', 'notifications', false),
('backup_retention_days', '30', 'Number of days to retain backups', 'system', false)
ON CONFLICT (setting_key) DO NOTHING;

-- Step 20: Create super admin user using direct INSERT without enum casting
INSERT INTO users (
  id,
  username,
  email,
  full_name,
  role,
  password_hash,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  'sa.lgl.admin',
  'superadmin@letsgolearn.com',
  'Super Administrator',
  'super_admin',
  '0p9o*i7U',
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE username = 'sa.lgl.admin'
);