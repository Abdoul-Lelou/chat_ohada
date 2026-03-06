'use client';

import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
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

    // 10 MB limit
    if (file.size > 10 * 1024 * 1024) {
      alert('Le document dépasse la taille maximale autorisée (10 Mo).');
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
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm w-full">
      <h3 className="text-lg font-bold text-primary mb-4">Ajouter un document à la Base de Connaissances</h3>
      <label className="flex flex-col justify-center items-center gap-4 bg-gray-50 border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors rounded-xl w-full h-32 cursor-pointer relative overflow-hidden group">
        <div className="flex flex-col items-center justify-center text-center p-4">
          {status === 'idle' && (
            <>
              <div className="w-12 h-12 rounded-full bg-blue-100/50 group-hover:bg-blue-200/50 flex items-center justify-center text-blue-600 mb-2 transition-colors">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-gray-700">Cliquez ou glissez un fichier PDF ici</span>
              <span className="text-xs text-gray-500 mt-1">Maximum 10 Mo</span>
            </>
          )}

          {status === 'uploading' && (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <span className="text-sm font-bold text-blue-700">Analyse et intégration en cours...</span>
              <span className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">{fileName}</span>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-2">
                <CheckCircle className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-green-700">Document intégré avec succès !</span>
              <button
                onClick={(e) => { e.preventDefault(); setStatus('idle'); }}
                className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800 underline transition-colors"
              >
                Intégrer un autre document
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-2">
                <AlertCircle className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-red-700">Erreur lors de l'intégration</span>
              <button
                onClick={(e) => { e.preventDefault(); setStatus('idle'); }}
                className="mt-2 text-xs font-semibold text-gray-600 hover:text-gray-800 underline transition-colors"
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