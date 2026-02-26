'use client';

import React, { useState, useRef } from 'react';
import { X, Camera, Shield, Loader2, CheckCircle, AlertTriangle, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import ChangePasswordModal from './ChangePasswordModal';

interface ProfileSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
}

export default function ProfileSettingsModal({ isOpen, onClose, user }: ProfileSettingsModalProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const supabase = createClient();
    const queryClient = useQueryClient();

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setError("L'image est trop lourde (max 2MB)");
            return;
        }

        setIsUploading(true);
        setError(null);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `avatar.${fileExt}`;
            const filePath = `${user.company_id}/${user.id}/${fileName}`;

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Cache busting (very important for immediate refresh)
            const finalUrl = `${publicUrl}?t=${Date.now()}`;

            // 3. Update Profile via API (Double-layer security check on backend)
            const response = await fetch('/api/profile/update', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ avatar_url: finalUrl })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Erreur lors de la mise à jour du profil");
            }

            // 4. Invalidate Queries
            await queryClient.invalidateQueries({ queryKey: ['profile'] });
            // On rafraîchit aussi l'utilisateur global si besoin
            window.location.reload(); // Rechargement simple pour synchroniser partout

        } catch (err: any) {
            console.error("Upload Error:", err);
            setError(err.message || "Erreur lors du téléchargement");
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">

                {/* HEADER */}
                <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-primary/5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                            <User className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-xl text-primary">Mon Profil</h3>
                            <p className="text-xs text-text-gray uppercase tracking-widest font-bold opacity-70">Paramètres du compte</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all shadow-sm border border-transparent hover:border-gray-100">
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                <div className="p-8 space-y-8">

                    {/* AVATAR SECTION */}
                    <div className="flex flex-col items-center">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-3xl bg-primary/10 border-4 border-white shadow-xl flex items-center justify-center text-primary text-4xl font-bold overflow-hidden">
                                {user.avatar_url ? (
                                    <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span>{(user.first_name?.[0] || user.firstName?.[0] || '?') + (user.last_name?.[0] || user.lastName?.[0] || '')}</span>
                                )}

                                {isUploading && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={handleUploadClick}
                                disabled={isUploading}
                                className="absolute -bottom-2 -right-2 p-3 bg-primary text-white rounded-2xl shadow-lg hover:scale-110 transition-transform active:scale-95 border-4 border-white"
                            >
                                <Camera className="w-5 h-5" />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/*"
                            />
                        </div>
                        <p className="mt-4 text-xs font-bold text-text-gray uppercase tracking-widest">Photo de profil (JPG/PNG, max 2MB)</p>
                        {error && <p className="mt-2 text-xs text-error-red font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {error}</p>}
                    </div>

                    {/* USER INFO */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Prénom</label>
                            <p className="text-sm font-bold text-dark">{user.first_name || user.firstName}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nom</label>
                            <p className="text-sm font-bold text-dark">{user.last_name || user.lastName}</p>
                        </div>
                        <div className="col-span-2 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Email</label>
                            <p className="text-sm font-bold text-dark">{user.email}</p>
                        </div>
                    </div>

                    {/* SECURITY ACTIONS */}
                    <div className="pt-4 border-t border-gray-50">
                        <h4 className="text-xs font-bold text-text-gray uppercase tracking-widest mb-4">Sécurité</h4>
                        <button
                            onClick={() => setIsPasswordModalOpen(true)}
                            className="w-full flex items-center justify-between p-4 bg-primary/5 hover:bg-primary/10 rounded-2xl text-primary transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <Shield className="w-5 h-5" />
                                <span className="text-sm font-bold">Changer mon mot de passe</span>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center group-hover:translate-x-1 transition-transform">
                                →
                            </div>
                        </button>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-center">
                    <p className="text-[10px] text-text-gray font-medium uppercase">Protection des données multi-tenant active</p>
                </div>
            </div>

            {isPasswordModalOpen && (
                <ChangePasswordModal
                    isOpen={isPasswordModalOpen}
                    onClose={() => setIsPasswordModalOpen(false)}
                />
            )}
        </div>
    );
}
