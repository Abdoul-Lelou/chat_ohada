import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server-client';
import { getSupabaseAuthClient } from '@/lib/supabase-auth-client';

export type AuthGuardContext = {
    userId: string;
    role: 'user' | 'admin' | 'super_admin';
    companyId: string | null;
    supabase: any; // authenticated client
};

export async function authGuard(
    req: NextRequest,
    handler: (req: NextRequest, context: AuthGuardContext) => Promise<NextResponse>
) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    // Instanciation de l'Admin via Service Role SEULEMENT pour valider l'identité de base sans être bloqué par le RLS
    const supabaseAdmin = getSupabaseServerClient();

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
        return NextResponse.json({ error: 'Token invalide ou session expirée' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role, company_id, is_active')
        .eq('id', user.id)
        .single();

    if (!profile) {
        return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
    }

    if (profile.is_active === false) {
        return NextResponse.json({ error: 'Compte inactif. Action non autorisée.' }, { status: 403 });
    }

    // Validation stricte Rôle / Company (Isolation Multi-Tenant)
    if (profile.role !== 'super_admin' && !profile.company_id) {
        return NextResponse.json({ error: 'Accès Interdit : Votre compte n\'est associé à aucune entreprise.' }, { status: 403 });
    }

    // Le client authentifié qui sera passé au handler, pour que les requêtes DB propagent le JWT (respecte le RLS !)
    const supabaseAuthClient = getSupabaseAuthClient(token);

    return handler(req, {
        userId: user.id,
        role: profile.role as 'user' | 'admin' | 'super_admin',
        companyId: profile.company_id,
        supabase: supabaseAuthClient
    });
}
