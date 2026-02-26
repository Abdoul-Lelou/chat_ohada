'use client';

import React, { useState } from 'react';
import { X, Shield, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setErrorMessage("Les nouveaux mots de passe ne correspondent pas.");
            setStatus('error');
            return;
        }

        if (newPassword.length < 6) {
            setErrorMessage("Le nouveau mot de passe doit faire au moins 6 caractères.");
            setStatus('error');
            return;
        }

        setIsLoading(true);
        setStatus('idle');
        setErrorMessage('');

        try {
            // Pour vérifier le mot de passe actuel, on tente une ré-authentification
            // Note: Supabase ne permet pas de vérifier le mot de passe sans se reconnecter
            // ou passer par une API route qui le fait coté serveur.

            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) throw new Error("Utilisateur non trouvé");

            // Appel à notre API route sécurisée pour la validation du password actuel
            const response = await fetch('/api/profile/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Erreur lors de la mise à jour");
            }

            setStatus('success');
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (error: any) {
            setErrorMessage(error.message);
            setStatus('error');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-primary/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Shield className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-lg text-primary">Sécurité du compte</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="p-6">
                    {status === 'success' ? (
                        <div className="text-center py-8 animate-in slide-in-from-bottom-4">
                            <div className="w-16 h-16 bg-success-green/10 text-success-green rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-10 h-10" />
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 mb-2">Mot de passe mis à jour !</h4>
                            <p className="text-sm text-gray-500">Votre compte est désormais sécurisé avec votre nouveau mot de passe.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {status === 'error' && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-error-red animate-shake">
                                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                                    <p className="text-xs font-medium">{errorMessage}</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Mot de passe actuel</label>
                                <input
                                    required
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="border-t border-gray-50 pt-2"></div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nouveau mot de passe</label>
                                <input
                                    required
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                                    placeholder="Minimum 6 caractères"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Confirmer le nouveau mot de passe</label>
                                <input
                                    required
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                                    placeholder="Réécrivez-le ici"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-[2] btn btn-auth-primary flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    {isLoading ? 'Mise à jour...' : 'Enregistrer les modifications'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
