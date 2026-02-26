import { NextRequest, NextResponse } from 'next/server';
import { authGuard } from '@/middleware/authGuard';
import { getSupabaseServerClient } from '@/lib/supabase-server-client';

export async function PATCH(req: NextRequest) {
    return authGuard(req, async (req, { supabase, userId }) => {
        const body = await req.json();
        const { avatar_url, first_name, last_name } = body;

        // DOUBLE-LAYER SECURITY: L'ID de l'utilisateur dans la session DOIT correspondre à l'ID du profil mis à jour
        // L'authGuard fournit déjà userId validé via le token.

        const updateData: any = {};
        if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
        if (first_name !== undefined) updateData.first_name = first_name;
        if (last_name !== undefined) updateData.last_name = last_name;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseServerClient();
        const { error } = await supabaseAdmin
            .from('profiles')
            .update(updateData)
            .eq('id', userId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    });
}
