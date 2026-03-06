'use client';

import React, { useState, useRef, useEffect } from 'react';
import { User, Shield, LogOut, ChevronDown, Check, AlertCircle, Settings, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ProfileSettingsModal from './ProfileSettingsModal';

interface ProfileMenuProps {
    user: any;
    onLogout: () => void;
    onUpdateUser?: (updatedData: any) => void;
}

export default function ProfileMenu({ user, onLogout, onUpdateUser }: ProfileMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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

    const fn = user?.first_name || user?.firstName;
    const ln = user?.last_name || user?.lastName;
    const isLoadingName = !fn || !ln;
    const initials = !isLoadingName ? (fn[0] + ln[0]).toUpperCase() : '';

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-white/10 transition-colors"
            >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                    {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : isLoadingName ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <span>{initials}</span>
                    )}
                </div>
                <ChevronDown className={`w-4 h-4 text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-[9999] animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-3 border-b border-gray-100 mb-1 bg-gray-50/50 text-left">
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#4B5563' }}>Connecté en tant que</p>
                        <p className="text-base font-headline font-bold truncate flex items-center" style={{ color: '#111827' }}>
                            {isLoadingName ? (
                                <span className="flex items-center gap-2 text-sm italic" style={{ color: '#4B5563' }}><Loader2 className="w-3 h-3 animate-spin flex-shrink-0" /> Synchronisation...</span>
                            ) : (
                                <span>{fn} {ln}</span>
                            )}
                        </p>
                        <p className="text-xs font-bold uppercase mt-0.5" style={{ color: '#111827' }}>
                            {user?.role === 'super_admin' ? 'SUPER ADMIN' : user?.role === 'admin' ? 'ADMIN' : 'USER'}
                        </p>
                    </div>

                    <button
                        onClick={() => { setIsOpen(false); setIsSettingsOpen(true); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <Settings className="w-4 h-4 text-primary" />
                        <span>Paramètres du Profil</span>
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

            {isSettingsOpen && (
                <ProfileSettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    user={user}
                    onUpdateUser={onUpdateUser}
                />
            )}
        </div>
    );
}
