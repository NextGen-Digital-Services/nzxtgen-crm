-- NZXTGEN CRM - FIX SERVICES TABLE RLS POLICIES
-- This migration adds missing RLS policies for the global services table
-- Execute this in the Supabase SQL Editor

-- 1. Ensure services table has RLS enabled
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
DROP POLICY IF EXISTS "Authenticated users can read services" ON public.services;
DROP POLICY IF EXISTS "Clients can view services" ON public.services;

-- 3. Create policy for admins to manage all services
CREATE POLICY "Admins can manage services"
    ON public.services FOR ALL TO authenticated USING (public.is_admin());

-- 4. Create policy for authenticated users to read services (global lookup)
CREATE POLICY "Authenticated users can read services"
    ON public.services FOR SELECT TO authenticated USING (true);

-- 5. Verify services table data
SELECT COUNT(*) as service_count FROM public.services;
SELECT * FROM public.services ORDER BY name;
