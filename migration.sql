-- SQL SEED / MIGRATION COMMANDS FOR ROLE MANAGEMENT
-- Execute these in the Supabase SQL Editor if you need to manually change roles.

-- --------------------------------------------------
-- 1. ELEVATE A USER TO SUPER_ADMIN
-- --------------------------------------------------
-- Run this after registering an admin user in your Supabase Auth panel
-- or via the signup endpoints to make them an administrator.
UPDATE public.users 
SET role = 'super_admin' 
WHERE email = 'admin@nzxtgen.com'; -- Replace with the actual admin email address

-- --------------------------------------------------
-- 2. LIST ALL REGISTERED USERS AND THEIR ROLES
-- --------------------------------------------------
SELECT u.id, u.email, u.role, u.created_at
FROM public.users u;

-- --------------------------------------------------
-- 3. ENSURE ROW LEVEL SECURITY IS ACTIVE
-- --------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------
-- 4. VERIFY SYSTEM POLICIES
-- --------------------------------------------------
-- Check if public.users is readable by owner/admin and matching users
-- If you need to refresh policies:
DROP POLICY IF EXISTS "Admins can view and edit all user profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

CREATE POLICY "Admins can view and edit all user profiles"
    ON public.users FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT TO authenticated USING (auth.uid() = id);
