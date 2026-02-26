'use client';

import React from 'react';
import { UserProfile } from '@/types/admin';
import { useUpdateAdminUserStatus } from '@/hooks/useAdminUsers';
import { Loader2, UserX, UserCheck } from 'lucide-react';

interface UserTableProps {
    users: UserProfile[];
    isLoading: boolean;
}

export default function UserTable({ users, isLoading }: UserTableProps) {
    const { mutate: updateStatus } = useUpdateAdminUserStatus();
    const [togglingId, setTogglingId] = React.useState<string | null>(null);

    const toggleStatus = (user: UserProfile) => {
        setTogglingId(user.id);
        updateStatus(
            { user_id: user.id, is_active: !user.is_active },
            { onSettled: () => setTogglingId(null) }
        );
    };

    if (isLoading) {
        return <div className="py-12 text-center text-text-gray flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    if (!users || users.length === 0) {
        return (
            <div className="text-center py-12 border border-dashed rounded-xl bg-gray-50 text-text-gray">
                Aucun utilisateur trouvé.
            </div>
        );
    }

    return (
        <div className="table-container border rounded-xl overflow-hidden shadow-sm bg-white">
            <table className="data-table w-full text-left">
                <thead className="bg-off-white border-b text-text-light text-sm uppercase tracking-wider">
                    <tr>
                        <th className="p-4 font-semibold">Utilisateur</th>
                        <th className="p-4 font-semibold">Rôle</th>
                        <th className="p-4 font-semibold">Statut</th>
                        <th className="p-4 font-semibold text-right">Modifier Accès</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                    {users.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shadow-sm">
                                        {(u.first_name?.[0] || '?') + (u.last_name?.[0] || '?')}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-text-dark">{u.first_name} {u.last_name}</h4>
                                        <p className="text-xs text-text-gray">{u.email}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="p-4">
                                <span className={`inline-block px-2 py-1 text-[11px] uppercase tracking-wider rounded-full font-bold ${u.role === 'admin' ? 'bg-accent/10 text-accent' : 'bg-gray-100 text-gray-500'}`}>
                                    {u.role}
                                </span>
                            </td>
                            <td className="p-4">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] uppercase tracking-wider rounded-full font-bold border ${u.is_active ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                    {u.is_active ? 'Actif' : 'Désactivé'}
                                </span>
                            </td>
                            <td className="p-4 text-right">
                                <button
                                    onClick={() => toggleStatus(u)}
                                    // Admins shouldn't lock themselves or other admins unless they are super admins.
                                    disabled={togglingId === u.id || (u.role === 'super_admin' && u.id !== togglingId)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${(u.role === 'super_admin') ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'} ${u.is_active ? 'bg-primary' : 'bg-gray-200'}`}
                                    title={u.is_active ? "Désactiver l'accès" : "Réactiver l'accès"}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${u.is_active ? 'translate-x-6' : 'translate-x-1'}`}
                                    />
                                    {togglingId === u.id && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-full">
                                            <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                        </div>
                                    )}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
