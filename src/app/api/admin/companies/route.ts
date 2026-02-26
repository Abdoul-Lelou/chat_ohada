import { NextRequest, NextResponse } from 'next/server';
import { authGuard } from '@/middleware/authGuard';
import { getSupabaseServerClient } from '@/lib/supabase-server-client';

// GET — Lister les entreprises (super_admin: toutes, admin: la sienne)
export async function GET(req: NextRequest) {
    return authGuard(req, async (req, { supabase, role, companyId }) => {
        if (role !== 'admin' && role !== 'super_admin') return NextResponse.json({ error: 'Accès Interdit' }, { status: 403 });

        let query = supabase.from('companies').select('*').order('created_at', { ascending: false });

        if (role === 'admin') {
            query = query.eq('id', companyId);
        }

        const { data: companies, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ companies });
    });
}

// POST — Créer une entreprise (super_admin only)
export async function POST(req: NextRequest) {
    return authGuard(req, async (req, { role }) => {
        if (role !== 'super_admin') return NextResponse.json({ error: 'Accès Interdit' }, { status: 403 });

        const body = await req.json();
        const { name, email, plan, requests_limit } = body;

        if (!name) {
            return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseServerClient();
        const { data: company, error } = await supabaseAdmin.from('companies').insert({
            name,
            email: email || null,
            plan: plan || 'basic',
            requests_limit: requests_limit || 50,
        }).select().single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ company }, { status: 201 });
    });
}

// PATCH — Modifier plan/quota/statut d'une entreprise
export async function PATCH(req: NextRequest) {
    return authGuard(req, async (req, { role, companyId }) => {
        if (role !== 'admin' && role !== 'super_admin') return NextResponse.json({ error: 'Accès Interdit' }, { status: 403 });

        const body = await req.json();
        const { company_id, plan, requests_limit, is_active } = body;

        const targetId = role === 'super_admin' ? company_id : companyId;

        if (!targetId) {
            return NextResponse.json({ error: 'ID entreprise requis' }, { status: 400 });
        }

        const updateData: any = {};
        if (plan) updateData.plan = plan;
        if (typeof requests_limit === 'number') updateData.requests_limit = requests_limit;
        if (typeof is_active === 'boolean') updateData.is_active = is_active;

        const supabaseAdmin = getSupabaseServerClient();
        const { error } = await supabaseAdmin
            .from('companies')
            .update(updateData)
            .eq('id', targetId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    });
}
