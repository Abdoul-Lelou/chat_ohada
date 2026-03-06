'use server';

import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/supabase-server-client';
import { embed } from 'ai';




export async function generateLegalGuidanceOld(prompt: string) {
  const supabase = getSupabaseServerClient();

  // Recherche textuelle sur la colonne 'id' (vu sur ta capture)
  const { data: matchedCases } = await supabase
    .from('cases')
    .select('id, title, procedure')
    .or(`title.ilike.%${prompt}%,procedure.ilike.%${prompt}%`)
    .limit(3);

  const { object } = await generateObject({
    model: google('gemini-3-flash-preview'), // Pas de préfixe complexe ici
    schema: z.object({
      assistant_message: z.string(),
      data: z.object({
        similar_cases: z.array(z.object({
          case_id: z.string(), // On garde case_id pour ton UI
          title: z.string(),
          reason: z.string()
        })),
        checklist: z.array(z.string()),
        risks: z.array(z.string()),
        directions: z.array(z.string())
      })
    }),
    system: `Expert juridique OHADA Guinée. Analyser la question avec précision.`,
    prompt: `Question: ${prompt} \n\n Contexte: ${JSON.stringify(matchedCases)}`,
  });

  return object;
}

export async function generateLegalGuidance(prompt: string) {
  const supabase = getSupabaseServerClient();

  // 1. Vecteur pour la question (Assure-toi que c'est le même modèle que pour l'upload !)
  const { embedding } = await embed({
    model: google.textEmbeddingModel('gemini-embedding-001'),
    value: prompt,
  });

  // 2. Recherche vectorielle
  const { data: matchedCases } = await supabase.rpc('match_case_embeddings', {
    query_embedding: embedding,
    match_threshold: 0.3, // On baisse un peu pour avoir plus de contexte
    match_count: 5,
  });

  // 3. Génération de la réponse
  const { object } = await generateObject({
    model: google('gemini-3-flash-preview'), // Revert to the identifier that seemed to work previously
    // ON UTILISE LE SCHÉMA PRÉCIS ATTENDU PAR TON UI
    schema: z.object({
      assistant_message: z.string().describe("La réponse principale en texte"),
      data: z.object({
        similar_cases: z.array(z.object({
          case_id: z.string(),
          title: z.string(),
          reason: z.string()
        })),
        checklist: z.array(z.string()),
        risks: z.array(z.string()),
        directions: z.array(z.string())
      })
    }),
    system: `Tu es l'expert juridique OHADA n°1. 
    CONSIGNE CRITIQUE : Tu dois impérativement retourner UN SEUL OBJET JSON. 
    Ne commence JAMAIS ta réponse par un crochet '['. 
    Utilise le contexte fourni pour étayer ta réponse.`,
    prompt: `Question de l'utilisateur : ${prompt} 
    
    Contexte extrait des PDF OHADA : ${JSON.stringify(matchedCases)}`,
  });

  return object;
}

export async function getCaseDetail(caseId: string) {
  const supabase = getSupabaseServerClient();

  console.log('Fetching details for caseIdentifier:', caseId);

  // 1. Try fetching by exact UUID if it looks like one
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(caseId);

  if (isUUID) {
    const { data, error } = await supabase
      .from('cases')
      .select('id, title, ohada_act, case_type, procedure, court, country, decision_date, summary, full_text, fts')
      .eq('id', caseId)
      .single();

    if (!error && data) return data;
  }

  // 2. Fallback: Search by title match if it's a human-readable ID
  console.log('UUID fetch failed or not a UUID, trying title search for:', caseId);

  const { data: searchData, error: searchError } = await supabase
    .from('cases')
    .select('id, title, ohada_act, case_type, procedure, court, country, decision_date, summary, full_text, fts')
    .ilike('title', `%${caseId}%`)
    .limit(1)
    .maybeSingle();

  if (searchError) {
    console.error('Search by title failed:', searchError);
  }

  if (searchData) return searchData;

  // 3. One more attempt: Search in fts or other text fields if needed
  // But searching title is usually enough for IDs like "CCJA-2018-154" if they are in the title

  return null;
}
