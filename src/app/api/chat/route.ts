import { streamObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/supabase-server-client';
import { embed } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
    const { prompt } = await req.json();

    const supabase = getSupabaseServerClient();

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
    // Nous présumons que la fonction RPC match_cases existe pour la table `case`
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
        system: `Tu es un expert en droit OHADA. Analyse les Actes Uniformes ET les cas pratiques fournis pour donner une réponse argumentée et concrète.
    CONSIGNE CRITIQUE : Tu dois impérativement retourner UN SEUL OBJET JSON. 
    Ne commence JAMAIS ta réponse par un crochet '['. 
    Utilise le contexte fourni pour étayer ta réponse.`,
        prompt: `Question de l'utilisateur : ${prompt} 
    
    Contexte 1 (Textes de Loi OHADA) : ${JSON.stringify(matchedLaws)}
    Contexte 2 (Cas Pratiques / Jurisprudence) : ${JSON.stringify(matchedCases)}`,
    });

    return result.toTextStreamResponse();
}
