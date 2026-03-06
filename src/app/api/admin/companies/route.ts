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
        const { name, admin_email, plan, requests_limit } = body;

        if (!name || !admin_email) {
            return NextResponse.json({ error: 'Le nom et l\'email de l\'administrateur sont requis' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseServerClient();

        // 1. Créer l'entreprise
        const { data: company, error: companyError } = await supabaseAdmin.from('companies').insert({
            name,
            email: admin_email,
            plan: plan || 'basic',
            requests_limit: requests_limit || 50,
        }).select().single();

        if (companyError) {
            return NextResponse.json({ error: companyError.message }, { status: 500 });
        }

        // 2. Créer l'utilisateur Administrateur via Auth Admin API
        // On utilise un mot de passe temporaire ou on envoie un email d'invitation
        // Pour cet exemple, on génère un mot de passe et on pourrait envoyer un lien de reset.
        const tempPassword = Math.random().toString(36).slice(-12);

        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: admin_email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
                role: 'admin',
                company_id: company.id,
                first_name: 'Admin',
                last_name: name
            }
        });

        if (authError) {
            // Rollback company creation if auth fails to maintain consistency
            await supabaseAdmin.from('companies').delete().eq('id', company.id);
            return NextResponse.json({ error: `Erreur création Auth: ${authError.message}` }, { status: 500 });
        }

        // 3. Forcer la mise à jour du profil (le trigger handle_new_user l'a déjà créé mais peut-être sans company_id/role correct)
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
                role: 'admin',
                company_id: company.id
            })
            .eq('id', authUser.user.id);

        if (profileError) {
            console.error("Erreur lors de la mise à jour du profil admin:", profileError);
            // On ne rollback pas ici car l'utilisateur est déjà créé, mais on log l'erreur
        }

        return NextResponse.json({
            company,
            message: "Entreprise et compte administrateur créés avec succès."
        }, { status: 201 });
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
