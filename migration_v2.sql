-- NZXTGEN CRM DATABASE MODERNIZATION MIGRATION
-- Execute this SQL script in the Supabase SQL Editor

-- 1. Create global services lookup table
CREATE TABLE IF NOT EXISTS public.services_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Populate standard services
INSERT INTO public.services_new (name) VALUES
('Paid Advertising'),
('AI Chatbot Automation'),
('WhatsApp Automation'),
('Website Development'),
('Web Application Development'),
('SEO Services'),
('Social Media Management'),
('Content Creation'),
('Funnel Development'),
('Lead Generation'),
('CRM Setup'),
('Digital Marketing'),
('Custom Service')
ON CONFLICT (name) DO NOTHING;

-- 3. Rename existing services table to client_services
DROP TRIGGER IF EXISTS trigger_calculate_remaining_balance ON public.services;
DROP TRIGGER IF EXISTS trigger_update_services_modified ON public.services;

-- Rename services table
ALTER TABLE public.services RENAME TO client_services;

-- Rename services_new to services
ALTER TABLE public.services_new RENAME TO services;

-- 4. Add service_id foreign key column to client_services
ALTER TABLE public.client_services ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id) ON DELETE RESTRICT;

-- 5. Migrate old service rows
-- Match old text names to services lookup table
UPDATE public.client_services cs
SET service_id = s.id
FROM public.services s
WHERE LOWER(TRIM(cs.name)) = LOWER(TRIM(s.name));

-- Map non-matching names to Custom Service
UPDATE public.client_services
SET service_id = (SELECT id FROM public.services WHERE name = 'Custom Service')
WHERE service_id IS NULL;

-- Now that every client_service has a service_id, make it NOT NULL
ALTER TABLE public.client_services ALTER COLUMN service_id SET NOT NULL;

-- Add custom_name for non-standard services mapped to Custom Service
ALTER TABLE public.client_services ADD COLUMN IF NOT EXISTS custom_name TEXT;

-- Populate custom_name where applicable (if custom mapping was done)
-- We can set it to the original name if we want, but since name was dropped, let's keep name until here
-- Drop original name column
ALTER TABLE public.client_services DROP COLUMN IF EXISTS name;

-- 6. Re-create triggers for client_services
CREATE OR REPLACE FUNCTION public.calculate_remaining_balance()
RETURNS TRIGGER AS $$
BEGIN
    NEW.remaining_balance := NEW.total_cost - NEW.advance_paid;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_remaining_balance
    BEFORE INSERT OR UPDATE ON public.client_services
    FOR EACH ROW EXECUTE PROCEDURE public.calculate_remaining_balance();

CREATE TRIGGER trigger_update_client_services_modified
    BEFORE UPDATE ON public.client_services
    FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();

-- 7. Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    due_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 8. Add triggers for tasks
CREATE TRIGGER trigger_update_tasks_modified
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();

-- 9. Add RLS Policies for tasks
DROP POLICY IF EXISTS "Admins can manage tasks" ON public.tasks;
CREATE POLICY "Admins can manage tasks"
    ON public.tasks FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Clients can view their own tasks" ON public.tasks;
CREATE POLICY "Clients can view their own tasks"
    ON public.tasks FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = tasks.client_id AND c.user_id = auth.uid()
        )
    );

-- 10. Clean up ad_budgets table
DROP TABLE IF EXISTS public.ad_budgets CASCADE;

-- 11. Add index on tasks
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON public.tasks(client_id);

-- 12. Update permissions and check RLS for client_services
ALTER TABLE public.client_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage client services" ON public.client_services;
CREATE POLICY "Admins can manage client services"
    ON public.client_services FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Clients can view their own client services" ON public.client_services;
CREATE POLICY "Clients can view their own client services"
    ON public.client_services FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = client_services.client_id AND c.user_id = auth.uid()
        )
    );

-- 13. Ensure index exists for client_services
CREATE INDEX IF NOT EXISTS idx_client_services_client_id ON public.client_services(client_id);
CREATE INDEX IF NOT EXISTS idx_client_services_service_id ON public.client_services(service_id);
