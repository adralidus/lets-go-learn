/*
  # Fix User Assignment Foreign Key Constraint

  1. Database Changes
    - Add missing foreign key constraint for assigned_admin_id
    - Ensure proper relationship between users table (self-referencing)
    
  2. Security
    - Maintain existing RLS policies
    - No changes to security model
*/

-- First, let's check if the constraint already exists and drop it if it does
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_assigned_admin_id_fkey' 
    AND table_name = 'users'
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT users_assigned_admin_id_fkey;
  END IF;
END $$;

-- Add the foreign key constraint
ALTER TABLE public.users
ADD CONSTRAINT users_assigned_admin_id_fkey
FOREIGN KEY (assigned_admin_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Create index for better performance on the foreign key
CREATE INDEX IF NOT EXISTS idx_users_assigned_admin_id 
ON public.users(assigned_admin_id);