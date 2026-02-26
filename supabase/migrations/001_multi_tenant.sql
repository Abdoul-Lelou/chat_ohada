-- ============================================================================
-- OHADA Legal Advisor — Migration 001 : Multi-Tenant Architecture
-- À exécuter dans le SQL Editor de Supabase (https://supabase.com/dashboard)
-- ============================================================================

-- 0. Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. TABLE COMPANIES (Multi-Tenant)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    plan TEXT NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'pro')),
    requests_limit INTEGER NOT NULL DEFAULT 50,
    requests_used INTEGER NOT NULL DEFAULT 0,
    billing_cycle_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. EXTENSION TABLE PROFILES
-- ============================================================================
-- Ajouter les colonnes manquantes
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS first_name TEXT,
    ADD COLUMN IF NOT EXISTS last_name TEXT,
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Mettre à jour le rôle pour supporter super_admin
-- (le check sera fait au niveau applicatif, pas de ALTER sur la colonne role)

-- ============================================================================
-- 3. EXTENSION TABLE CHAT_HISTORY
-- ============================================================================
ALTER TABLE public.chat_history
    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- ============================================================================
-- 4. TABLE QUERY_LOGS (Journalisation IA)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.query_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    response_preview TEXT,
    sources_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Supprimer les anciennes fonctions si elles existent
DROP FUNCTION IF EXISTS public.match_case_embeddings(vector, double precision, integer) CASCADE;
DROP FUNCTION IF EXISTS public.match_cases(vector, double precision, integer) CASCADE;


-- ============================================================================
-- 5. FONCTIONS RPC — Recherche Vectorielle
-- ============================================================================

-- 5a. match_case_embeddings : recherche dans case_embeddings
CREATE OR REPLACE FUNCTION public.match_case_embeddings(
    query_embedding vector(3072),
    match_threshold float DEFAULT 0.3,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id bigint,
    case_id uuid,
    content text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ce.id,
        ce.case_id,
        ce.content,
        ce.metadata,
        1 - (ce.embedding <=> query_embedding) AS similarity
    FROM public.case_embeddings ce
    WHERE 1 - (ce.embedding <=> query_embedding) > match_threshold
    ORDER BY ce.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 5b. match_cases : recherche dans case_chunks
CREATE OR REPLACE FUNCTION public.match_cases(
    query_embedding vector(3072),
    match_threshold float DEFAULT 0.3,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id uuid,
    case_id uuid,
    content text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cc.id,
        cc.case_id,
        cc.content,
        1 - (cc.embedding <=> query_embedding) AS similarity
    FROM public.case_chunks cc
    WHERE 1 - (cc.embedding <=> query_embedding) > match_threshold
    ORDER BY cc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================================================
-- 6. FONCTION HELPER — Récupérer le company_id de l'utilisateur courant
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Fonction helper pour vérifier le rôle
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ============================================================================
-- 7. RLS POLICIES — Isolation Multi-Tenant
-- ============================================================================

-- 7a. PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
    FOR SELECT USING (
        id = auth.uid()
        OR public.get_user_role() = 'super_admin'
        OR (public.get_user_role() = 'admin' AND company_id = public.get_user_company_id())
    );

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
    FOR UPDATE USING (
        id = auth.uid()
        OR public.get_user_role() = 'super_admin'
        OR (public.get_user_role() = 'admin' AND company_id = public.get_user_company_id())
    );

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles
    FOR INSERT WITH CHECK (
        public.get_user_role() IN ('super_admin', 'admin')
    );

-- 7b. COMPANIES
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_select" ON public.companies;
CREATE POLICY "companies_select" ON public.companies
    FOR SELECT USING (
        public.get_user_role() = 'super_admin'
        OR id = public.get_user_company_id()
    );

DROP POLICY IF EXISTS "companies_update" ON public.companies;
CREATE POLICY "companies_update" ON public.companies
    FOR UPDATE USING (
        public.get_user_role() = 'super_admin'
        OR (public.get_user_role() = 'admin' AND id = public.get_user_company_id())
    );

DROP POLICY IF EXISTS "companies_insert" ON public.companies;
CREATE POLICY "companies_insert" ON public.companies
    FOR INSERT WITH CHECK (
        public.get_user_role() = 'super_admin'
    );

DROP POLICY IF EXISTS "companies_delete" ON public.companies;
CREATE POLICY "companies_delete" ON public.companies
    FOR DELETE USING (
        public.get_user_role() = 'super_admin'
    );

-- 7c. CHAT_HISTORY (remplacer les anciennes policies)
DROP POLICY IF EXISTS "Users can insert their own history" ON public.chat_history;
DROP POLICY IF EXISTS "Users can update their own history" ON public.chat_history;
DROP POLICY IF EXISTS "Users can view their own history" ON public.chat_history;

CREATE POLICY "chat_history_select" ON public.chat_history
    FOR SELECT USING (
        user_id = auth.uid()
        OR public.get_user_role() = 'super_admin'
    );

CREATE POLICY "chat_history_insert" ON public.chat_history
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
    );

CREATE POLICY "chat_history_update" ON public.chat_history
    FOR UPDATE USING (
        user_id = auth.uid()
    );

CREATE POLICY "chat_history_delete" ON public.chat_history
    FOR DELETE USING (
        user_id = auth.uid()
    );

-- 7d. CASES & CASE_EMBEDDINGS (textes de loi = lecture publique pour tous les users authentifiés)
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cases_select" ON public.cases;
CREATE POLICY "cases_select" ON public.cases
    FOR SELECT USING (auth.uid() IS NOT NULL);

ALTER TABLE public.case_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "case_embeddings_select" ON public.case_embeddings;
CREATE POLICY "case_embeddings_select" ON public.case_embeddings
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admin peut insérer/modifier les textes de loi
DROP POLICY IF EXISTS "cases_admin_insert" ON public.cases;
CREATE POLICY "cases_admin_insert" ON public.cases
    FOR INSERT WITH CHECK (
        public.get_user_role() IN ('super_admin', 'admin')
    );

DROP POLICY IF EXISTS "case_embeddings_admin_insert" ON public.case_embeddings;
CREATE POLICY "case_embeddings_admin_insert" ON public.case_embeddings
    FOR INSERT WITH CHECK (
        public.get_user_role() IN ('super_admin', 'admin')
    );

-- 7e. CASE_CHUNKS
ALTER TABLE public.case_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "case_chunks_select" ON public.case_chunks;
CREATE POLICY "case_chunks_select" ON public.case_chunks
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "case_chunks_admin_insert" ON public.case_chunks;
CREATE POLICY "case_chunks_admin_insert" ON public.case_chunks
    FOR INSERT WITH CHECK (
        public.get_user_role() IN ('super_admin', 'admin')
    );

-- 7f. QUERY_LOGS
ALTER TABLE public.query_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "query_logs_insert" ON public.query_logs;
CREATE POLICY "query_logs_insert" ON public.query_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "query_logs_select" ON public.query_logs;
CREATE POLICY "query_logs_select" ON public.query_logs
    FOR SELECT USING (
        user_id = auth.uid()
        OR public.get_user_role() = 'super_admin'
        OR (public.get_user_role() = 'admin' AND company_id = public.get_user_company_id())
    );

-- ============================================================================
-- 8. FONCTION — Décrémentation des quotas
-- ============================================================================
CREATE OR REPLACE FUNCTION public.decrement_quota(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_limit INTEGER;
    v_used INTEGER;
    v_plan TEXT;
    v_cycle_start TIMESTAMPTZ;
BEGIN
    SELECT requests_limit, requests_used, plan, billing_cycle_start
    INTO v_limit, v_used, v_plan, v_cycle_start
    FROM public.companies
    WHERE id = p_company_id AND is_active = true;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Reset automatique si le cycle mensuel est dépassé
    IF v_cycle_start + INTERVAL '1 month' < NOW() THEN
        UPDATE public.companies
        SET requests_used = 0,
            billing_cycle_start = NOW()
        WHERE id = p_company_id;
        v_used := 0;
    END IF;

    -- Plan pro = pas de limite
    IF v_plan = 'pro' THEN
        UPDATE public.companies
        SET requests_used = requests_used + 1
        WHERE id = p_company_id;
        RETURN true;
    END IF;

    -- Vérification quota basic
    IF v_used >= v_limit THEN
        RETURN false;
    END IF;

    UPDATE public.companies
    SET requests_used = requests_used + 1
    WHERE id = p_company_id;

    RETURN true;
END;
$$;

-- ============================================================================
-- 9. TRIGGER — Créer un profil automatiquement à l'inscription
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.profiles (id, role, first_name, last_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        NEW.email
    );
    RETURN NEW;
END;
$$;

-- Créer le trigger s'il n'existe pas
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
