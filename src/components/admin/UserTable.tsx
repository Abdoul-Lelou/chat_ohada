'use client';

import React from 'react';
import { UserProfile } from '@/types/admin';
import { useUpdateAdminUserStatus } from '@/hooks/useAdminUsers';
import { Loader2, UserX, UserCheck, Power, PowerOff, Edit2, Trash2 } from 'lucide-react';

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
                        <th className="p-4 font-semibold text-center w-64">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                    {users.map((u) => (
                        <tr key={u.id} className={`hover:bg-gray-50/50 transition-colors ${!u.is_active ? 'opacity-50 grayscale bg-gray-50/30 italic' : ''}`}>
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
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] uppercase tracking-wider rounded-full font-bold border ${u.is_active ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                    {u.is_active ? 'Actif' : 'Désactivé'}
                                </span>
                            </td>
                            <td className="p-4">
                                <div className="flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => toggleStatus(u)}
                                        disabled={togglingId === u.id || (u.role === 'super_admin' && u.id !== togglingId)}
                                        className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold relative ${u.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'} ${(u.role === 'super_admin') ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                                        title={u.is_active ? "Désactiver l'accès" : "Activer l'accès"}
                                    >
                                        {togglingId === u.id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : u.is_active ? (
                                            <PowerOff className="w-3.5 h-3.5" />
                                        ) : (
                                            <Power className="w-3.5 h-3.5" />
                                        )}
                                        <span>{u.is_active ? 'Désactiver' : 'Activer'}</span>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
