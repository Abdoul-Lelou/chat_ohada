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
                                <span className={`inline-block px-2 py-1 text-[11px] uppercase tracking-wider rounded-full font-bold ${u.is_active ? 'bg-success-green/10 text-success-green' : 'bg-error-red/10 text-error-red'}`}>
                                    {u.is_active ? 'Actif' : 'Désactivé'}
                                </span>
                            </td>
                            <td className="p-4 text-right">
                                <button
                                    onClick={() => toggleStatus(u)}
                                    // Admins shouldn't casually lock themselves out or lock other super admins out from here.
                                    disabled={togglingId === u.id || u.role === 'admin' || u.role === 'super_admin'}
                                    className={`inline-flex items-center justify-center p-2 rounded-lg transition-all border ${(u.role === 'admin' || u.role === 'super_admin') ? 'opacity-30 border-transparent cursor-not-allowed' :
                                            u.is_active ? 'text-error-red border-error-red hover:bg-error-red hover:text-white' : 'text-success-green border-success-green hover:bg-success-green hover:text-white'
                                        }`}
                                    title={u.is_active ? "Désactiver l'accès" : "Réactiver l'accès"}
                                >
                                    {togglingId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> :
                                        u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
