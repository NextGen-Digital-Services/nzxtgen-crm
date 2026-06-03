-- NZXTGEN DIGITAL SERVICES CLIENT PORTAL & CRM DATABASE SCHEMA
-- Execute this SQL script in the Supabase SQL Editor

-- --------------------------------------------------
-- 1. CLEANUP (Optional - Use with caution)
-- --------------------------------------------------
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_new_user;
-- DROP TABLE IF EXISTS public.webhook_logs CASCADE;
-- DROP TABLE IF EXISTS public.reminder_templates CASCADE;
-- DROP TABLE IF EXISTS public.notifications CASCADE;
-- DROP TABLE IF EXISTS public.documents CASCADE;
-- DROP TABLE IF EXISTS public.reports CASCADE;
-- DROP TABLE IF EXISTS public.invoices CASCADE;
-- DROP TABLE IF EXISTS public.ad_budgets CASCADE;
-- DROP TABLE IF EXISTS public.payments CASCADE;
-- DROP TABLE IF EXISTS public.services CASCADE;
-- DROP TABLE IF EXISTS public.clients CASCADE;
-- DROP TABLE IF EXISTS public.users CASCADE;
-- DROP FUNCTION IF EXISTS public.is_admin CASCADE;

-- --------------------------------------------------
-- 2. CREATE TABLES
-- --------------------------------------------------

-- Table 1: users (Extends auth.users in public schema)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('super_admin', 'client')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 2: clients
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    business_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone_number TEXT,
    whatsapp_number TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 3: services
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    advance_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    remaining_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 4: payments
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 5: ad_budgets
CREATE TABLE public.ad_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    total_budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_budget >= 0),
    amount_spent NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount_spent >= 0),
    remaining_budget NUMERIC(12, 2) GENERATED ALWAYS AS (total_budget - amount_spent) STORED,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 6: invoices
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL UNIQUE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid', 'overdue')),
    file_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 7: reports
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 8: documents
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER, -- in bytes
    type TEXT NOT NULL CHECK (type IN ('invoice', 'contract', 'report', 'project_file')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 9: notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('welcome', 'payment_reminder', 'payment_confirmation', 'service_update', 'report_uploaded', 'invoice_uploaded')),
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 10: reminder_templates
CREATE TABLE public.reminder_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    email_subject TEXT NOT NULL,
    email_body TEXT NOT NULL,
    whatsapp_body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 11: webhook_logs
CREATE TABLE public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------
-- 3. INDEXING FOR PERFORMANCE
-- --------------------------------------------------
CREATE INDEX idx_clients_user_id ON public.clients(user_id);
CREATE INDEX idx_clients_status ON public.clients(status);
CREATE INDEX idx_services_client_id ON public.services(client_id);
CREATE INDEX idx_services_status ON public.services(status);
CREATE INDEX idx_payments_client_id ON public.payments(client_id);
CREATE INDEX idx_payments_payment_date ON public.payments(payment_date);
CREATE INDEX idx_ad_budgets_client_id ON public.ad_budgets(client_id);
CREATE INDEX idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX idx_reports_client_id ON public.reports(client_id);
CREATE INDEX idx_documents_client_id ON public.documents(client_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);

-- --------------------------------------------------
-- 4. TRIGGER FUNCTION FOR PUBLIC.USERS SYNC
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, email, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'client')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger to calculate remaining balance on service update
CREATE OR REPLACE FUNCTION public.calculate_remaining_balance()
RETURNS TRIGGER AS $$
BEGIN
    NEW.remaining_balance := NEW.total_cost - NEW.advance_paid;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_remaining_balance
    BEFORE INSERT OR UPDATE ON public.services
    FOR EACH ROW EXECUTE PROCEDURE public.calculate_remaining_balance();

-- Trigger to update timestamp
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_client_modified
    BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();

CREATE TRIGGER trigger_update_services_modified
    BEFORE UPDATE ON public.services
    FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();

CREATE TRIGGER trigger_update_ad_budgets_modified
    BEFORE UPDATE ON public.ad_budgets
    FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();

CREATE TRIGGER trigger_update_reminder_templates_modified
    BEFORE UPDATE ON public.reminder_templates
    FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();

-- --------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) & ACCESS CONTROL
-- --------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Helper Check Function for Role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- POLICIES: users
CREATE POLICY "Admins can view and edit all user profiles"
    ON public.users FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT TO authenticated USING (auth.uid() = id);

-- POLICIES: clients
CREATE POLICY "Admins can manage clients"
    ON public.clients FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Clients can view their own profile details"
    ON public.clients FOR SELECT TO authenticated USING (
        user_id = auth.uid()
    );

-- POLICIES: services
CREATE POLICY "Admins can manage services"
    ON public.services FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Clients can view their own purchased services"
    ON public.services FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = services.client_id AND c.user_id = auth.uid()
        )
    );

-- POLICIES: payments
CREATE POLICY "Admins can manage payments"
    ON public.payments FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Clients can view their own payments"
    ON public.payments FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = payments.client_id AND c.user_id = auth.uid()
        )
    );

-- POLICIES: ad_budgets
CREATE POLICY "Admins can manage ad budgets"
    ON public.ad_budgets FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Clients can view their own ad budgets"
    ON public.ad_budgets FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = ad_budgets.client_id AND c.user_id = auth.uid()
        )
    );

-- POLICIES: invoices
CREATE POLICY "Admins can manage invoices"
    ON public.invoices FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Clients can view their own invoices"
    ON public.invoices FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = invoices.client_id AND c.user_id = auth.uid()
        )
    );

-- POLICIES: reports
CREATE POLICY "Admins can manage reports"
    ON public.reports FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Clients can view their own reports"
    ON public.reports FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = reports.client_id AND c.user_id = auth.uid()
        )
    );

-- POLICIES: documents
CREATE POLICY "Admins can manage documents"
    ON public.documents FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Clients can view their own documents"
    ON public.documents FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = documents.client_id AND c.user_id = auth.uid()
        )
    );

-- POLICIES: notifications
CREATE POLICY "Admins can manage notifications"
    ON public.notifications FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Users can manage their own notifications"
    ON public.notifications FOR ALL TO authenticated USING (
        user_id = auth.uid()
    );

-- POLICIES: reminder_templates
CREATE POLICY "Admins can manage reminder templates"
    ON public.reminder_templates FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Authenticated users can read templates"
    ON public.reminder_templates FOR SELECT TO authenticated USING (true);

-- POLICIES: webhook_logs
CREATE POLICY "Admins can manage webhook logs"
    ON public.webhook_logs FOR ALL TO authenticated USING (public.is_admin());

-- --------------------------------------------------
-- 6. DEFAULT SEED DATA
-- --------------------------------------------------
INSERT INTO public.reminder_templates (name, email_subject, email_body, whatsapp_body)
VALUES
(
    'welcome',
    'Welcome to NzxtGen Digital Services client portal!',
    'Hello {{name}},\n\nWelcome to NzxtGen Digital Services. We are excited to work with you on growing your business and "Turning Clicks Into Customers".\n\nYour client portal account has been created. You can log in using your email ({{email}}) to track services, invoice payments, and project progress.\n\nBest regards,\nNzxtGen Team',
    'Hello {{name}}! Welcome to NzxtGen Digital Services. We are thrilled to partner with you to turn clicks into customers. Log in to your client portal here: {{portal_url}}'
),
(
    'payment_reminder',
    'Payment Due Reminder - NzxtGen Digital Services',
    'Hello {{name}},\n\nThis is a friendly reminder that a payment of {{amount}} is due on {{due_date}} for the service: {{service_name}}.\n\nPlease log in to your dashboard to review and submit payment.\n\nThank you,\nNzxtGen Team',
    'Hello {{name}}! A payment of {{amount}} is due on {{due_date}} for {{service_name}}. Review details on your portal: {{portal_url}}'
),
(
    'payment_confirmation',
    'Payment Confirmation - NzxtGen Digital Services',
    'Hello {{name}},\n\nWe have successfully received your payment of {{amount}} for {{service_name}}.\n\nYour account has been updated, and you can view your updated balance and invoice history in the portal.\n\nThank you for choosing NzxtGen Digital Services!\n\nBest regards,\nNzxtGen Team',
    'Hi {{name}}! We received your payment of {{amount}} for {{service_name}}. View your updated portal statement: {{portal_url}}'
);
