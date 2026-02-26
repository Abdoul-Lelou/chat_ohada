import { streamObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { getSupabaseAuthClient } from '@/lib/supabase-auth-client';
import { embed } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
    const { prompt } = await req.json();

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Non autorisé ou entreprise introuvable' }), { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    // Instantiation du client Supabase sécurisé (contexte utilisateur propagé pour le RLS)
    const supabase = getSupabaseAuthClient(token);

    let userId = null;
    let companyId = null;
    let userRole = null;
    let isActive = true;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        userId = user.id;
        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id, role, is_active')
            .eq('id', user.id)
            .single();

        if (profile) {
            companyId = profile.company_id;
            userRole = profile.role;
            // Handle null gracefully, assume active if null (unless explicitely false)
            isActive = profile.is_active !== false;
        }
    }

    if (!userId) {
        return new Response(JSON.stringify({ error: 'Non autorisé.' }), { status: 401 });
    }

    if (!isActive) {
        return new Response(JSON.stringify({ error: 'Compte inactif. Action non autorisée.' }), { status: 403 });
    }

    if (userRole !== 'super_admin' && !companyId) {
        return new Response(JSON.stringify({ error: 'Compte non rattaché à une entreprise. Action non autorisée.' }), { status: 403 });
    }

    // Décrémentation du quota (sauf pour super_admin)
    if (userRole !== 'super_admin') {
        const { data: quotaOk } = await supabase.rpc('decrement_quota', { p_company_id: companyId });
        if (!quotaOk) {
            return new Response(JSON.stringify({ error: 'La limite de génération de réponses a été atteinte temporairement.\nVeuillez attendre quelques instants avant de réessayer ou contacter l’administrateur du service.' }), { status: 429 });
        }
    }

    try {
        // 1. Vecteur pour la question
        const { embedding } = await embed({
            model: google.textEmbeddingModel('gemini-embedding-001'),
            value: prompt,
        });

        // 2. Recherche vectorielle (Loi brute)
        const { data: matchedLaws } = await supabase.rpc('match_case_embeddings', {
            query_embedding: embedding,
            match_threshold: 0.3,
            match_count: 3,
        });

        // 3. Recherche vectorielle (Cas pratiques)
        const { data: matchedCases } = await supabase.rpc('match_cases', {
            query_embedding: embedding,
            match_threshold: 0.3,
            match_count: 3,
        });

        // 4. Génération de la réponse en streaming
        const result = streamObject({
            model: google('gemini-3-flash-preview'),
            schema: z.object({
                assistant_message: z.string().describe("La réponse principale en texte"),
                data: z.object({
                    similar_cases: z.array(z.object({
                        case_id: z.string(),
                        title: z.string(),
                        reason: z.string()
                    })).optional(),
                    checklist: z.array(z.string()).optional(),
                    risks: z.array(z.string()).optional(),
                    directions: z.array(z.string()).optional()
                }).optional()
            }),
            system: `Tu es un expert juridique spécialisé EXCLUSIVEMENT en Droit des affaires OHADA et en Code Minier de la République de Guinée.

RÈGLE DE DOMAINE :

1. Si la question concerne clairement :
   - Les Actes Uniformes OHADA
   - La jurisprudence CCJA
   - Le droit des sociétés OHADA
   - Les sûretés, recouvrement, procédures collectives OHADA
   - Le Code Minier Guinéen

   → Réponds normalement selon les instructions.

2. Si la question est clairement hors domaine (ex: médecine, sport, politique internationale, programmation, etc.) :

   → Réponds EXACTEMENT :
   "Désolé, je suis spécialisé uniquement en droit OHADA des affaires et en droit minier guinéen."
   → Puis termine la réponse.
   → Laisse l'objet data vide.

3. Si la question est ambiguë, mal formulée, incomplète ou contient une faute d’orthographe mais semble liée à OHADA :

   → Demande une clarification polie.
   → Ne refuse PAS immédiatement.
   → Exemple :
     "Pouvez-vous préciser votre question en lien avec le droit OHADA ?"

RÈGLES OBLIGATOIRES POUR LES RÉPONSES JURIDIQUES :

- Citer les articles précis.
- Mentionner l’Acte Uniforme concerné.
- Structurer avec :
  - assistant_message
  - checklist
  - risks
  - similar_cases si disponible.

CONSIGNE TECHNIQUE :
Tu dois retourner UN SEUL OBJET JSON conforme au schéma.
Ne jamais commencer par un crochet '['.
Ne jamais retourner du texte hors JSON.
`,
            prompt: `Question de l'utilisateur : ${prompt} 
        
        Contexte 1 (Textes de Loi OHADA) : ${JSON.stringify(matchedLaws)}
        Contexte 2 (Cas Pratiques / Jurisprudence) : ${JSON.stringify(matchedCases)}`,
            onFinish: async ({ object }) => {
                if (object?.assistant_message) {
                    const sourcesCount = (matchedLaws?.length ?? 0) + (matchedCases?.length ?? 0);
                    // Nettoyage minimal pour le preview (300 chars)
                    const previewText = object.assistant_message
                        .replace(/[#*`]/g, '') // Enlever markdown simple
                        .replace(/\s+/g, ' ')  // Normaliser espaces
                        .trim()
                        .slice(0, 300);

                    await supabase.from('query_logs').insert({
                        user_id: userId,
                        company_id: companyId,
                        prompt: prompt,
                        response_preview: previewText,
                        sources_count: sourcesCount
                    });
                }
            }
        });

        return result.toTextStreamResponse();
    } catch (error: any) {
        // Log interne sécurisé (non retourné au client)
        console.error("API Chat Error:", error.message || error);

        const isQuotaError = error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED') || error.status === 429;
        if (isQuotaError) {
            return new Response(JSON.stringify({ error: 'La limite de génération de réponses a été atteinte temporairement.\nVeuillez attendre quelques instants avant de réessayer ou contacter l’administrateur du service.' }), { status: 429 });
        }

        return new Response(JSON.stringify({ error: 'Une erreur technique interne est survenue.' }), { status: 500 });
    }
}
