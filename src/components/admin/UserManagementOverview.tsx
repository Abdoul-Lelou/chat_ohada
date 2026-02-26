'use client';

import React from 'react';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import UserForm from './UserForm';
import UserTable from './UserTable';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export function UserManagementOverview({ user }: { user: any }) {
    const { data, isLoading, error } = useAdminUsers(user);

    return (
        <div className="max-w-7xl mx-auto">
            <div className="section-header mb-8 flex flex-col md:flex-row md:items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold font-headline tracking-tight text-primary">Gestion des Utilisateurs</h2>
                    <p className="text-text-gray mt-2 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-success-green" />
                        Gérez les accès de vos collaborateurs sécuritairement.
                    </p>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-error-red border border-red-200 rounded-xl flex items-center gap-3 mb-6">
                    <AlertTriangle className="w-6 h-6 shrink-0" />
                    <p className="text-sm font-medium">Erreur lors du chargement des utilisateurs: {error.message}</p>
                </div>
            )}

            <div className="space-y-6">
                <UserForm />
                <UserTable users={data?.users || []} isLoading={isLoading} />
            </div>
        </div>
    );
}
