'use client';

import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { processPdfToEmbeddings } from '@/ai/process-pdf';

export default function PdfUploader() {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [fileName, setFileName] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Seuls les fichiers PDF sont acceptés');
      return;
    }

    setFileName(file.name);
    setStatus('uploading');

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64String = reader.result as string;
        await processPdfToEmbeddings(base64String, "dossier-ohada-001");
        setStatus('success');
      };
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  return (
    <div className="upload-compact flex items-center gap-3 w-full">
      <label className="upload-dropzone-compact flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-off-white transition-all w-full border border-dashed border-border-light">
        <div className="flex items-center gap-3 flex-1">
          {status === 'idle' && (
            <>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Upload className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-text-gray">Ajouter un document PDF au dossier</span>
            </>
          )}

          {status === 'uploading' && (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
              <span className="text-sm font-medium text-primary truncate">Analyse de {fileName}...</span>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-5 h-5 text-success-green" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-success-green">Document intégré !</span>
                <span className="text-[10px] text-text-light">Prêt pour l'analyse</span>
              </div>
              <button
                onClick={(e) => { e.preventDefault(); setStatus('idle'); }}
                className="ml-auto text-xs text-primary underline px-2"
              >
                + Nouveau
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <Upload className="w-5 h-5 text-error-red" />
              <span className="text-sm text-error-red">Erreur d'intégration</span>
              <button
                onClick={(e) => { e.preventDefault(); setStatus('idle'); }}
                className="ml-auto text-xs text-text-light underline"
              >
                Réessayer
              </button>
            </>
          )}
        </div>
        <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} disabled={status === 'uploading'} />
      </label>
    </div>
  );
}