'use client';

import React, { useState, useRef, useEffect } from 'react';
import { User, Shield, LogOut, ChevronDown, Check, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ChangePasswordModal from './ChangePasswordModal';

interface ProfileMenuProps {
    user: any;
    onLogout: () => void;
}

export default function ProfileMenu({ user, onLogout }: ProfileMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const initials = ((user?.first_name?.[0] || user?.firstName?.[0] || '') +
        (user?.last_name?.[0] || user?.lastName?.[0] || '')).toUpperCase() || '?';

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-white/10 transition-colors border border-white/20"
            >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-primary flex items-center justify-center text-white text-xs font-bold shadow-inner">
                    {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <span>{initials}</span>
                    )}
                </div>
                <ChevronDown className={`w-4 h-4 text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-[100] animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2 border-b border-gray-50 mb-1">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Connecté en tant que</p>
                        <p className="text-sm font-bold text-gray-900 truncate">
                            {user?.first_name || user?.firstName} {user?.last_name || user?.lastName}
                        </p>
                        <p className="text-[10px] text-primary font-bold uppercase">{user?.role || 'Utilisateur'}</p>
                    </div>

                    <button
                        onClick={() => { setIsOpen(false); setIsPasswordModalOpen(true); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <Shield className="w-4 h-4 text-primary" />
                        <span>Sécurité & Mot de passe</span>
                    </button>

                    <div className="border-t border-gray-100 my-1"></div>

                    <button
                        onClick={() => { setIsOpen(false); onLogout(); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-error-red hover:bg-red-50 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Déconnexion</span>
                    </button>
                </div>
            )}

            {isPasswordModalOpen && (
                <ChangePasswordModal
                    isOpen={isPasswordModalOpen}
                    onClose={() => setIsPasswordModalOpen(false)}
                />
            )}
        </div>
    );
}
