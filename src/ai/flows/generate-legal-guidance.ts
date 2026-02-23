'use server';

/**
 * @fileOverview Agent AI expert en droit OHADA (Guinée).
 * 
 * PARCOURS DU MESSAGE :
 * 1. Reçoit les messages du chat.
 * 2. Extrait le dernier message de l'utilisateur.
 * 3. Interroge Supabase pour trouver des cas juridiques par mots-clés.
 * 4. Combine la question et les cas trouvés dans un prompt envoyé à Gemini.
 * 5. Retourne une réponse structurée (Synthèse, Checklist, Risques).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '@/lib/supabase-server-client';

// Définition de la structure des données entrantes (ce que le chat envoie)
const ChatCaseAssistantInputSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ),
  topK: z.number().default(5),
});
export type ChatCaseAssistantInput = z.infer<typeof ChatCaseAssistantInputSchema>;

// Définition de la structure des données sortantes (ce que l'IA répond)
const ChatCaseAssistantOutputSchema = z.object({
  assistant_message: z.string().describe('Texte de synthèse affiché dans le chat'),
  data: z
    .object({
      similar_cases: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          relevance_score: z.string().optional(),
          reason: z.string(),
        })
      ),
      directions: z.array(z.string()).describe('Pistes de recherche'),
      checklist: z.array(z.string()).describe('Actions à entreprendre'),
      risks: z.array(z.string()).describe('Risques identifiés'),
      citations: z.array(
        z.object({
          id: z.string(),
          evidence: z.string().max(300),
        })
      ),
    })
    .nullable()
    .optional(),
});
export type ChatCaseAssistantOutput = z.infer<typeof ChatCaseAssistantOutputSchema>;

// Fonction exportée appelée par le frontend (React)
export async function chatCaseAssistant(input: ChatCaseAssistantInput): Promise<ChatCaseAssistantOutput> {
  return chatCaseAssistantFlow(input);
}

/**
 * RECHERCHE DANS LA BASE DE DONNÉES
 * Cherche des correspondances dans la table 'cases' via des mots-clés simples.
 */
const searchCasesByKeywords = async (
  supabase: SupabaseClient,
  query: string,
  limit: number
) => {
  try {
    const searchTerms = query.split(' ').filter(word => word.length > 3);
    if (searchTerms.length === 0) return [];

    // Utilise l'opérateur "ilike" de PostgreSQL pour une recherche insensible à la casse
    const { data, error } = await supabase
      .from('cases')
      .select('id, title, summary, full_text')
      .or(`title.ilike.%${searchTerms[0]}%,summary.ilike.%${searchTerms[0]}%`)
      .limit(limit);

    if (error) {
      console.error('Erreur Supabase:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Exception recherche:', err);
    return [];
  }
};

/**
 * LE FLUX PRINCIPAL (FLOW)
 * C'est ici que l'intelligence métier est orchestrée.
 */
const chatCaseAssistantFlow = ai.defineFlow(
  {
    name: 'chatCaseAssistantFlow',
    inputSchema: ChatCaseAssistantInputSchema,
    outputSchema: ChatCaseAssistantOutputSchema,
  },
  async input => {
    try {
      // 1. On récupère la dernière question de l'utilisateur
      const lastUserMessage = input.messages.filter(message => message.role === 'user').pop()?.content;
      if (!lastUserMessage) {
        return { assistant_message: 'Comment puis-je vous aider sur le plan juridique aujourd\'hui ?' };
      }

      // 2. ÉTAPE DE RÉCUPÉRATION (Retrieval)
      // On cherche des documents pertinents dans Supabase
      let caseDetails = [];
      try {
        const supabase = getSupabaseServerClient();
        const matchedCases = await searchCasesByKeywords(supabase, lastUserMessage, input.topK);
        caseDetails = matchedCases.map(d => ({
          id: d.id,
          title: d.title || 'Sans titre',
          summary: d.summary || 'Résumé indisponible',
          full_text: d.full_text || 'Texte absent',
        }));
      } catch (dbError) {
        console.warn('Base de données inaccessible, mode connaissances générales activé.');
      }

      // 3. ÉTAPE DE GÉNÉRATION (Generation)
      // On envoie tout à Gemini pour obtenir une réponse intelligente et structurée
      const promptResult = await legalGuidancePrompt({
        query: lastUserMessage,
        caseDetails: caseDetails,
      });

      if (!promptResult || !promptResult.output) {
        throw new Error("L'IA n'a pas pu générer de réponse.");
      }

      return promptResult.output;
    } catch (error: any) {
      console.error('Erreur Flow:', error);
      return {
        assistant_message: `Erreur technique : ${error.message}. Vérifiez votre configuration.`,
      };
    }
  }
);

/**
 * LE PROMPT (CONSIGNE POUR L'IA)
 * On définit ici comment l'IA doit se comporter et quel format de sortie respecter.
 */
const legalGuidancePrompt = ai.definePrompt({
  name: 'legalGuidancePrompt',
  input: {
    schema: z.object({
      query: z.string(),
      caseDetails: z.array(z.any()),
    }),
  },
  output: { schema: ChatCaseAssistantOutputSchema },
  prompt: `Vous êtes l'expert juridique OHADA n°1 en Guinée. 
  
  CONTEXTE FOURNI :
  {{#if caseDetails}}
  Voici des documents issus de notre base de données :
  {{#each caseDetails}}
  - ID: {{id}}, TITRE: {{title}}, RÉSUMÉ: {{summary}}
  {{/each}}
  {{else}}
  Aucun document spécifique trouvé. Répondez sur la base des principes généraux du droit OHADA.
  {{/if}}

  QUESTION DE L'UTILISATEUR : 
  {{{query}}}

  VOTRE MISSION :
  1. Analyser la situation.
  2. Fournir une synthèse claire.
  3. Proposer une checklist concrète d'actions.
  4. Alerter sur les risques juridiques.
  
  Répondez OBLIGATOIREMENT au format JSON structuré.`,
});
