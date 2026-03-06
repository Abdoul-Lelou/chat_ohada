'use client';

import React, { useState } from 'react';
import { useCreateAdminUser } from '@/hooks/useAdminUsers';
import { Loader2, Plus, UserPlus } from 'lucide-react';

export default function UserForm() {
    const [isOpen, setIsOpen] = useState(false);
    const { mutate: createUser, isPending, error } = useCreateAdminUser();

    // form state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        createUser({
            first_name: firstName,
            last_name: lastName,
            email,
            password,
        }, {
            onSuccess: () => {
                setIsOpen(false);
                setFirstName('');
                setLastName('');
                setEmail('');
                setPassword('');
            }
        });
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Nouveau</span>
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white p-6 border rounded-xl shadow-xl w-full max-w-lg mb-6 animate-in fade-in zoom-in-95">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" /> Créer un collaborateur</h3>
                {error && <div className="p-3 bg-red-50 text-error-red text-sm rounded mb-4">{error.message}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-gray mb-1">Prénom</label>
                            <input required type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full border border-gray-200 p-2 rounded-md focus:border-primary outline-none transition-colors" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-gray mb-1">Nom</label>
                            <input required type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full border border-gray-200 p-2 rounded-md focus:border-primary outline-none transition-colors" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-gray mb-1">Email professionnel</label>
                            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-gray-200 p-2 rounded-md focus:border-primary outline-none transition-colors" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-gray mb-1">Mot de passe temporaire</label>
                            <input required minLength={6} type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border border-gray-200 p-2 rounded-md focus:border-primary outline-none transition-colors" />
                        </div>
                    </div>
                    <div className="flex gap-3 justify-end mt-6">
                        <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 border rounded-md text-text-gray hover:bg-gray-50 font-medium transition-colors">Annuler</button>
                        <button type="submit" disabled={isPending} className="btn btn-auth-primary flex items-center gap-2">
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            {isPending ? 'Création en cours...' : 'Créer l\'utilisateur'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
