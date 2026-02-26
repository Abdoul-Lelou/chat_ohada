-- Migration 003: Admin Audit Logs
CREATE TABLE IF NOT EXISTS public.admin_actions_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- RLS
ALTER TABLE public.admin_actions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_read_all" ON public.admin_actions_log
    FOR SELECT USING (public.get_user_role() = 'super_admin');

CREATE POLICY "admin_read_own_company" ON public.admin_actions_log
    FOR SELECT USING (
        company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND public.get_user_role() = 'admin'
    );
