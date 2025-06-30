/*
# Super Admin User Creation - Part 2

This migration creates the super admin user after the enum value has been committed.
This is a separate migration to avoid the PostgreSQL enum transaction limitation.

## What this migration does:
1. Creates the super admin user with credentials sa.lgl.admin / 0p9o*i7U
2. Cleans up temporary setup table
3. Verifies the super admin system is ready

## Credentials:
- Username: sa.lgl.admin
- Password: 0p9o*i7U
- Role: super_admin
*/

-- Step 1: Create the super admin user now that enum is committed
DO $$
BEGIN
  -- Check if super admin already exists
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE username = 'sa.lgl.admin'
  ) THEN
    -- Insert the super admin user
    INSERT INTO users (
      username,
      email,
      full_name,
      role,
      password_hash,
      created_at,
      updated_at
    ) VALUES (
      'sa.lgl.admin',
      'superadmin@letsgolearn.com',
      'Super Administrator',
      'super_admin',
      '0p9o*i7U',
      now(),
      now()
    );
    
    RAISE NOTICE 'Super admin user created successfully with username: sa.lgl.admin';
  ELSE
    RAISE NOTICE 'Super admin user already exists';
  END IF;
END $$;

-- Step 2: Clean up temporary setup table
DROP TABLE IF EXISTS _temp_super_admin_setup;

-- Step 3: Drop the temporary function as it's no longer needed
DROP FUNCTION IF EXISTS create_super_admin_user();

-- Step 4: Verify super admin system is ready
DO $$
DECLARE
  super_admin_count integer;
  tables_count integer;
BEGIN
  -- Count super admin users
  SELECT COUNT(*) INTO super_admin_count
  FROM users 
  WHERE role = 'super_admin';
  
  -- Count super admin tables
  SELECT COUNT(*) INTO tables_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN (
    'admin_activity_logs',
    'system_settings', 
    'user_sessions',
    'admin_permissions',
    'system_notifications'
  );
  
  -- Report status
  RAISE NOTICE 'Super Admin System Status:';
  RAISE NOTICE '- Super admin users: %', super_admin_count;
  RAISE NOTICE '- Super admin tables: %', tables_count;
  RAISE NOTICE '- System ready: %', CASE WHEN super_admin_count > 0 AND tables_count = 5 THEN 'YES' ELSE 'NO' END;
  
  IF super_admin_count > 0 AND tables_count = 5 THEN
    RAISE NOTICE 'Super Admin system is fully operational!';
    RAISE NOTICE 'Login with: sa.lgl.admin / 0p9o*i7U';
  END IF;
END $$;