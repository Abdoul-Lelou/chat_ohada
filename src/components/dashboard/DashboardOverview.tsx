'use client';

import React from 'react';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useAdminCompanies } from '@/hooks/useAdminCompanies';
import { StatsCard } from './StatsCard';
import { CompanyListTable } from './CompanyListTable';
import { Users, Building, Cpu, AlertCircle, Scale } from 'lucide-react';

export function DashboardOverview({ user }: { user: any }) {
    const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats(user);

    // Initialize companies hook lazily (can be optimized further to be completely conditional, but React Query dedupes cache)
    const { data: companiesData, isLoading: compLoading } = useAdminCompanies(user);

    if (statsLoading) {
        return (
            <div className="flex justify-center p-12">
                <div className="loading-spinner"><span></span><span></span><span></span></div>
            </div>
        );
    }

    if (statsError || !stats) {
        return (
            <div className="p-6 bg-red-50 text-red-600 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-6 h-6" /> Impossible de charger les statistiques. ({statsError?.message})
            </div>
        );
    }

    const isSuperAdmin = user?.role === 'super_admin';

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {isSuperAdmin && (
                    <StatsCard
                        title="Cabinets Inscrits"
                        value={stats.companiesCount}
                        icon={<Building className="w-6 h-6" />}
                    />
                )}
                <StatsCard
                    title="Utilisateurs Actifs"
                    value={stats.activeUsers}
                    description={`Sur ${stats.totalUsers} au total`}
                    icon={<Users className="w-6 h-6" />}
                />
                {isSuperAdmin ? (
                    <StatsCard
                        title="Trafic RAG Global"
                        value={stats.recentLogs?.length || 0}
                        description="Interactions IA récentes (10 max affichées)"
                        icon={<Cpu className="w-6 h-6" />}
                    />
                ) : (
                    <StatsCard
                        title="Quota Consommé"
                        value={`${stats.companyInfo?.requests_used || 0} / ${stats.companyInfo?.requests_limit || 0}`}
                        description="Requêtes mensuelles"
                        icon={<Scale className="w-6 h-6" />}
                        trend={{
                            value: Math.round(((stats.companyInfo?.requests_used || 0) / (stats.companyInfo?.requests_limit || 1)) * 100),
                            isPositive: false
                        }}
                    />
                )}
            </div>

            {isSuperAdmin && (
                <div className="mt-8">
                    <h3 className="text-xl font-bold font-headline text-primary mb-4">Suivi des Quotas par Cabinet</h3>
                    {compLoading ? (
                        <div className="animate-pulse bg-primary/5 h-64 rounded-2xl border border-primary/10"></div>
                    ) : (
                        <CompanyListTable companies={companiesData?.companies || []} />
                    )}
                </div>
            )}

            {/* Récents Logs (Pour Admin et Super Admin) */}
            <div className="mt-8">
                <h3 className="text-xl font-bold font-headline text-primary mb-4">Dernières requêtes d'analyse</h3>
                <div className="bg-white rounded-2xl border border-primary/10 overflow-hidden shadow-sm">
                    {stats.recentLogs && stats.recentLogs.length > 0 ? (
                        <div className="divide-y divide-primary/5">
                            {stats.recentLogs.map((log) => (
                                <div key={log.id} className="p-4 hover:bg-gray-50 flex items-start gap-4 transition-colors">
                                    <div className="mt-1 p-2 bg-primary/5 text-primary rounded-lg shrink-0">
                                        <Scale className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-dark font-medium line-clamp-2">{log.prompt}</p>
                                        <p className="text-xs text-text-gray mt-1">
                                            {log.profiles?.first_name} {log.profiles?.last_name} • {new Date(log.created_at).toLocaleString('fr-FR')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-text-gray">Aucune requête récente.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
