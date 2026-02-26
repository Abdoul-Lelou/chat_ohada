import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { currentPassword, newPassword } = await req.json();

        // On a besoin du client admin ou d'un client temporaire pour vérifier le mot de passe actuel
        // Supabase ne permet pas de vérifier le password actuel sans tenter une authentification.

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');

        // 1. Obtenir l'utilisateur via le token
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        });

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Session expirée. Veuillez vous reconnecter.' }, { status: 401 });
        }

        // 2. Vérifier le mot de passe actuel en tentant un sign-in
        const { error: signInError } = await supabaseClient.auth.signInWithPassword({
            email: user.email!,
            password: currentPassword,
        });

        if (signInError) {
            return NextResponse.json({ error: 'Mot de passe actuel incorrect.' }, { status: 400 });
        }

        // 3. Mettre à jour avec le nouveau mot de passe
        const { error: updateError } = await supabaseClient.auth.updateUser({
            password: newPassword
        });

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Change Password Error:', error);
        return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
    }
}
