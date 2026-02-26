import { NextRequest, NextResponse } from 'next/server';
import { authGuard } from '@/middleware/authGuard';
import { getSupabaseServerClient } from '@/lib/supabase-server-client';

// GET — Lister les utilisateurs (admin: sa company, super_admin: tous)
export async function GET(req: NextRequest) {
    return authGuard(req, async (req, { supabase, role, companyId }) => {
        if (role !== 'admin' && role !== 'super_admin') return NextResponse.json({ error: 'Accès Interdit' }, { status: 403 });

        let query = supabase
            .from('profiles')
            .select('*, companies(name)')
            .order('created_at', { ascending: false });

        if (role === 'admin') {
            query = query.eq('company_id', companyId);
        }

        const { data: users, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ users });
    });
}

// POST — Créer un utilisateur
export async function POST(req: NextRequest) {
    return authGuard(req, async (req, { role, companyId }) => {
        if (role !== 'admin' && role !== 'super_admin') return NextResponse.json({ error: 'Accès Interdit' }, { status: 403 });

        const body = await req.json();
        const { email, password, first_name, last_name, role: newRole, company_id: selectedCompanyId } = body;

        if (!email || !password || !first_name || !last_name) {
            return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
        }

        // Admin ne peut créer que des users dans sa company, super_admin choisit
        const targetCompanyId = role === 'super_admin' ? (selectedCompanyId || companyId) : companyId;
        // Admin ne peut pas créer de super_admin
        const targetRole = (role === 'admin' && newRole === 'super_admin') ? 'user' : (newRole || 'user');

        // Création de l'utilisateur avec la clé Service Role
        const supabaseAdmin = getSupabaseServerClient();
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                first_name,
                last_name,
                role: targetRole,
            },
        });

        if (createError) {
            return NextResponse.json({ error: createError.message }, { status: 500 });
        }

        // Mettre à jour le profil avec company_id (automatiquement créé via le trigger PostgreSQL lors du createUser)
        if (newUser.user) {
            await supabaseAdmin.from('profiles').update({
                company_id: targetCompanyId,
                first_name,
                last_name,
                email,
                role: targetRole,
                is_active: true,
            }).eq('id', newUser.user.id);
        }

        return NextResponse.json({ user: newUser.user }, { status: 201 });
    });
}

// PATCH — Activer/Désactiver un utilisateur
export async function PATCH(req: NextRequest) {
    return authGuard(req, async (req, { supabase, role, companyId }) => {
        if (role !== 'admin' && role !== 'super_admin') return NextResponse.json({ error: 'Accès Interdit' }, { status: 403 });

        const body = await req.json();
        const { user_id, is_active } = body;

        if (!user_id || typeof is_active !== 'boolean') {
            return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
        }

        // Vérifier que l'admin manipule bien un utilisateur de son entreprise
        if (role === 'admin') {
            const { data: targetUser } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user_id)
                .single();

            if (!targetUser || targetUser.company_id !== companyId) {
                return NextResponse.json({ error: 'Accès refusé. L\'utilisateur n\'appartient pas à votre entreprise.' }, { status: 403 });
            }
        }

        const supabaseAdmin = getSupabaseServerClient();
        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ is_active })
            .eq('id', user_id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    });
}
