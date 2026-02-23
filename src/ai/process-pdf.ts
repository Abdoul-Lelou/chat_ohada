'use server';

import { embed } from 'ai';
import { google } from '@ai-sdk/google';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { getSupabaseServerClient } from '@/lib/supabase-server-client';
import PDFParser from 'pdf2json';

// Fonction utilitaire pour transformer pdf2json en Promise
function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, 1); // 1 = Texte brut

    pdfParser.on("pdfParser_dataError", (errData: any) => {
      console.error(errData.parserError);
      reject(errData.parserError);
    });

    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      // Extraction du texte brut
      const text = (pdfParser as any).getRawTextContent();
      resolve(text);
    });

    pdfParser.parseBuffer(buffer);
  });
}


// ... (imports et extractTextFromPDF restent identiques)

export async function processPdfToEmbeddings(base64String: string, caseId: string) {
  const supabase = getSupabaseServerClient();

  try {
    const base64Data = base64String.split(',')[1];
    const fileBuffer = Buffer.from(base64Data, 'base64');
    const fullText = await extractTextFromPDF(fileBuffer);

    if (!fullText || fullText.length < 10) throw new Error("PDF illisible");

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const chunks = await splitter.splitText(fullText);

    console.log(`🚀 Début insertion de ${chunks.length} segments...`);

    for (const chunk of chunks) {
      const cleanChunk = chunk.replace(/\n+/g, ' ').trim();

      const { embedding } = await embed({
        model: google.textEmbeddingModel('gemini-embedding-001'), 
        value: cleanChunk,
      });

      // MODIFICATION ICI : On capture l'erreur de Supabase
      const { error: dbError } = await supabase.from('case_embeddings').insert({
        // STRATÉGIE DÉMO : Si caseId n'est pas un UUID valide, mets null 
        // ou assure-toi que l'ID existe dans la table 'cases'
        case_id: null, 
        content: cleanChunk,
        embedding: embedding,
        metadata: { source: 'pdf_upload', date: new Date().toISOString() }
      });

      if (dbError) {
        console.error("❌ Erreur d'insertion Supabase:", dbError.message);
        // On throw pour arrêter le processus et voir l'erreur exacte dans la console
        throw new Error(`DB Error: ${dbError.message}`);
      }
    }

    console.log("✅ Tout a été enregistré dans Supabase !");
    return { success: true, chunks: chunks.length };

  } catch (error) {
    console.error("ERREUR CRITIQUE:", error);
    throw error;
  }
}