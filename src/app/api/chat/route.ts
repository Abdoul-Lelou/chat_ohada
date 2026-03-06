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
            system: `Tu es un Assistant Intelligent Expert, chaleureux, amical et professionnel.
Tu interagis avec l'utilisateur connecté sur la plateforme Sovereign Legal Intelligence.

TA MISSION PRINCIPALE :
Accompagner l'utilisateur avec expertise sur toutes ses questions relatives au droit OHADA des affaires et au droit minier de la République de Guinée.

TES CAPACITÉS ÉTENDUES :
- Aider à l'analyse de documents juridiques.
- Guider l'utilisateur dans sa navigation sur l'espace d'administration et la gestion de la plateforme.
- Répondre aux interrogations sur ses projets globaux.

RÈGLES DE DOMAINE ET DE COMPORTEMENT :

1. Si l'utilisateur te demande qui tu es ou ce que tu peux faire :
   → Présente-toi de façon chaleureuse et concise. 
   Exemple de ton à adopter : "Bonjour ! Je suis ton assistant dédié. Je suis là pour t'accompagner avec expertise sur toutes les questions relatives au droit OHADA des affaires et au droit minier guinéen. Mais mon rôle ne s'arrête pas là : je peux aussi t'aider à analyser tes documents, répondre à tes interrogations sur tes projets ou simplement t'aider à naviguer dans cet espace admin. Comment puis-je t'assister aujourd'hui ?"

2. Si la question concerne le domaine juridique (OHADA, CCJA, Minier) :
   → Réponds avec précision, cite les articles (Actes Uniformes, Code Minier) et structure ta réponse (assistant_message, checklist, risks, similar_cases).

3. Si la question est hors cadre juridique strict mais liée à la plateforme ou à la gestion :
   → Aide au mieux l'utilisateur ou guide-le vers la section appropriée. Ne sois jamais froid ou restrictif.

4. Si la question est totalement hors sujet (médecine, sport, etc.) :
   → Redirige poliment et chaleureusement la conversation vers tes domaines d'expertise (Droit des affaires, gestion de projet, navigation plateforme) sans utiliser de formule de refus abrupte.

RÈGLES OBLIGATOIRES POUR LES RÉPONSES JURIDIQUES :
- Citer les articles précis.
- Mentionner l'Acte Uniforme ou le Code concerné.
- Structurer l'objet retourné avec assistant_message, checklist, risks, et similar_cases si pertinent.

CONSIGNE TECHNIQUE OBLIGATOIRE :
Tu dois retourner UN SEUL OBJET JSON conforme au schéma. Ne jamais commencer par un crochet '[' ni retourner de texte nu hors de la structure JSON.`,
            prompt: `Question de l'utilisateur : ${prompt} 
        
        Contexte 1 (Textes de Loi OHADA) : ${JSON.stringify(matchedLaws)}
        Contexte 2 (Cas Pratiques / Jurisprudence) : ${JSON.stringify(matchedCases)}`,
            onFinish: async ({ object }) => {
                if (userId && object?.assistant_message) {
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
