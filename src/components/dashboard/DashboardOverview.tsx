'use client';

import React from 'react';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useAdminCompanies } from '@/hooks/useAdminCompanies';
import { StatsCard } from './StatsCard';
import { CompanyListTable } from './CompanyListTable';
import CompanyForm from './CompanyForm';
import { Users, Building, Cpu, AlertCircle, Scale, Plus } from 'lucide-react';

export function DashboardOverview({ user }: { user: any }) {
    const [isAddingCompany, setIsAddingCompany] = React.useState(false);
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

    const timeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return "À l'instant";
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `Il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `Il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
        const diffInDays = Math.floor(diffInHours / 24);
        return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
    };

    const handleExportCSV = () => {
        if (!stats?.recentLogs || stats.recentLogs.length === 0) return;
        const csvContent = "prompt,user,date\n" + stats.recentLogs.map(log =>
            `"${log.prompt.replace(/"/g, '""')}","${log.profiles?.first_name} ${log.profiles?.last_name}","${new Date(log.created_at).toLocaleString('fr-FR')}"`
        ).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `rapport-logs-${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const isSuperAdmin = user?.role === 'super_admin';

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {isSuperAdmin && (
                    <StatsCard
                        title="Cabinets Inscrits"
                        value={stats.companiesCount}
                        icon={<Building className="w-6 h-6" />}
                        variant="primary"
                    />
                )}
                <StatsCard
                    title="Utilisateurs Actifs"
                    value={Math.max(0, (stats.activeUsers || 0) - 1)}
                    description={`Sur ${Math.max(0, (stats.totalUsers || 0) - 1)} au total`}
                    icon={<Users className="w-6 h-6" />}
                    variant="success"
                />
                {isSuperAdmin ? (
                    <StatsCard
                        title="Trafic RAG Global"
                        value={stats.recentLogs?.length || 0}
                        description="Interactions IA récentes"
                        icon={<Cpu className="w-6 h-6" />}
                        variant="info"
                    />
                ) : (
                    <StatsCard
                        title="Quota Consommé"
                        value={`${stats.companyInfo?.requests_used || 0} / ${stats.companyInfo?.requests_limit || 0}`}
                        description="Requêtes mensuelles"
                        icon={<Scale className="w-6 h-6" />}
                        variant={((stats.companyInfo?.requests_used || 0) / (stats.companyInfo?.requests_limit || 1)) > 0.8 ? 'error' : 'warning'}
                        trend={{
                            value: Math.round(((stats.companyInfo?.requests_used || 0) / (stats.companyInfo?.requests_limit || 1)) * 100),
                            isPositive: false
                        }}
                    />
                )}
            </div>

            {isSuperAdmin && (
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold font-headline text-primary">Suivi des Quotas par Cabinet</h3>
                        <button
                            onClick={() => setIsAddingCompany(true)}
                            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
                        >
                            <Plus className="w-4 h-4" /> Ajouter un Cabinet
                        </button>
                    </div>
                    {compLoading ? (
                        <div className="animate-pulse bg-primary/5 h-64 rounded-2xl border border-primary/10"></div>
                    ) : (
                        <CompanyListTable companies={companiesData?.companies || []} />
                    )}
                </div>
            )}

            {isAddingCompany && <CompanyForm onClose={() => setIsAddingCompany(false)} />}

            {/* Récents Logs (Pour Admin et Super Admin) */}
            <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold font-headline text-primary">Dernières requêtes d'analyse</h3>
                    <button
                        onClick={handleExportCSV}
                        className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm active:scale-95"
                    >
                        Exporter l'activité
                    </button>
                </div>
                <div className="bg-white rounded-2xl border border-primary/10 overflow-hidden shadow-sm">
                    {stats.recentLogs && stats.recentLogs.length > 0 ? (
                        <div className="divide-y divide-primary/5">
                            {stats.recentLogs.map((log) => (
                                <div key={log.id} className="p-4 hover:bg-gray-50 flex items-start justify-between gap-4 transition-colors">
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1 p-2 bg-primary/5 text-primary rounded-lg shrink-0">
                                            <Scale className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-dark font-medium line-clamp-2">{log.prompt}</p>
                                            <p className="text-xs text-text-gray mt-1 flex items-center gap-2">
                                                <span className="font-semibold text-gray-700">{log.profiles?.first_name} {log.profiles?.last_name}</span>
                                                <span>•</span>
                                                <span>{timeAgo(log.created_at)}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="shrink-0">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-full font-bold bg-green-50 text-green-700 border border-green-100">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                            Succès
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-text-gray">Aucune analyse récente pour votre entreprise.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
