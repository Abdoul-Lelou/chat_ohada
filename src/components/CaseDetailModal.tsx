'use client';

import React, { useState, useEffect } from 'react';
import { X, FileText, Loader2, AlertCircle, Scale, BookOpen, Gavel } from 'lucide-react';
import { getCaseDetail } from '@/ai/legal-engine';

interface CaseDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    caseId: string | null;
}

export default function CaseDetailModal({ isOpen, onClose, caseId }: CaseDetailModalProps) {
    const [caseData, setCaseData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && caseId) {
            fetchDetails(caseId);
        } else if (!isOpen) {
            setCaseData(null);
            setError(null);
        }
    }, [isOpen, caseId]);

    const fetchDetails = async (id: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getCaseDetail(id);
            if (data) {
                setCaseData(data);
            } else {
                setError("Contenu indisponible — Désolé, le contenu détaillé n'est pas disponible pour ce cas.");
            }
        } catch (err: any) {
            console.error('Error in fetchDetails:', err);
            // If it's a UUID error, it's essentially "not found" or "invalid"
            setError("Contenu indisponible — Désolé, le contenu détaillé n'est pas disponible pour ce cas.");
        } finally {
            setIsLoading(false);
        }
    };

    const renderField = (label: string, value: any) => (
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <label className="text-[10px] font-black text-primary/60 uppercase tracking-widest mb-1 block">{label}</label>
            <p className="text-sm text-gray-800 font-bold">
                {value || "Information non disponible"}
            </p>
        </div>
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col border border-white/20">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <Scale className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-primary">Fiche de Jurisprudence</h3>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Consultation Table Case</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50/30">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <Loader2 className="w-10 h-10 text-primary animate-spin opacity-40" />
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Récupération des données...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center gap-4 animate-in fade-in zoom-in duration-300">
                            <div className="w-16 h-16 bg-red-50 text-error-red rounded-full flex items-center justify-center border border-red-100">
                                <AlertCircle className="w-8 h-8" />
                            </div>
                            <div className="max-w-md px-6">
                                <h4 className="font-bold text-gray-900 mb-2">Données manquantes</h4>
                                <p className="text-sm text-gray-600 leading-relaxed font-medium">{error}</p>
                                {/* For debugging purposes if needed by admin */}
                                <p className="text-[8px] text-gray-300 mt-6 select-none">ID: {caseId}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="mt-6 px-8 py-2 bg-primary text-white hover:bg-primary-dark rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                            >
                                Retour au chat
                            </button>
                        </div>
                    ) : caseData ? (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                            {/* Main Title Card */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                <h2 className="text-xl font-black text-gray-900 leading-tight">
                                    {caseData.title || "Information non disponible"}
                                </h2>
                            </div>

                            {/* Data Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {renderField("Acte Uniforme", caseData.ohada_act)}
                                {renderField("Type d'affaire", caseData.case_type)}
                                {renderField("Juridiction", caseData.court)}
                                {renderField("Pays", caseData.country)}
                                {renderField("Date de décision", caseData.decision_date)}
                                {renderField("Procédure", caseData.procedure)}
                            </div>

                            {/* SUMMARY SECTION */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                                <div className="flex items-center gap-2 text-primary">
                                    <BookOpen className="w-4 h-4" />
                                    <h4 className="font-black uppercase text-[10px] tracking-widest">Résumé</h4>
                                </div>
                                <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 text-sm text-gray-700 leading-relaxed font-medium">
                                    {caseData.summary || "Information non disponible"}
                                </div>
                            </div>

                            {/* FULL TEXT / FTS SECTION */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                                <div className="flex items-center gap-2 text-gray-900">
                                    <FileText className="w-4 h-4" />
                                    <h4 className="font-black uppercase text-[10px] tracking-widest">Contenu Détaillé</h4>
                                </div>
                                <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-100 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap font-medium">
                                    {caseData.full_text || caseData.fts || "Information non disponible"}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-gray-500 hover:text-gray-800 text-xs font-bold uppercase tracking-widest"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
}
