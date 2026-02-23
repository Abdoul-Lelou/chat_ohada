'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {supabaseAdminClient} from '@/lib/supabase-admin-client';

const IndexNewCasesInputSchema = z.object({
  caseId: z.string().describe('L\'identifiant unique du cas.'),
});
export type IndexNewCasesInput = z.infer<typeof IndexNewCasesInputSchema>;

const IndexNewCasesOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type IndexNewCasesOutput = z.infer<typeof IndexNewCasesOutputSchema>;

export async function indexNewCases(input: IndexNewCasesInput): Promise<IndexNewCasesOutput> {
  return indexNewCasesFlow(input);
}

/**
 * Ce flux ne génère plus d'embeddings. 
 * Il vérifie simplement que le cas est présent dans la table 'cases' 
 * pour qu'il soit trouvable par recherche textuelle.
 */
const indexNewCasesFlow = ai.defineFlow(
  {
    name: 'indexNewCasesFlow',
    inputSchema: IndexNewCasesInputSchema,
    outputSchema: IndexNewCasesOutputSchema,
  },
  async input => {
    try {
      if (!supabaseAdminClient) {
        return { success: false, message: "Configuration Supabase Admin manquante." };
      }

      const { data, error } = await supabaseAdminClient
        .from('cases')
        .select('case_id')
        .eq('case_id', input.caseId)
        .single();

      if (error || !data) {
        return { success: false, message: "Cas non trouvé dans la base de données." };
      }

      return { success: true, message: "Le cas est correctement enregistré et disponible pour la recherche textuelle." };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
);
