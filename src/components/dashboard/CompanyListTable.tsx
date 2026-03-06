import React from 'react';
import { Company } from '@/types/admin';
import { TrendingUp, AlertTriangle, CheckCircle2, Power, PowerOff, Edit2, Trash2 } from 'lucide-react';

export function CompanyListTable({ companies }: { companies: Company[] }) {
    if (!companies || companies.length === 0) {
        return <div className="text-center p-8 text-text-gray bg-white rounded-2xl border border-primary/10">Aucun cabinet structuré.</div>;
    }

    return (
        <div className="bg-white rounded-2xl border border-primary/10 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-primary/5 text-primary text-xs uppercase tracking-wider">
                            <th className="p-4 font-semibold">Nom du Cabinet</th>
                            <th className="p-4 font-semibold">Plan</th>
                            <th className="p-4 font-semibold">Consommation IA (RAG)</th>
                            <th className="p-4 font-semibold text-center">Statut IA</th>
                            <th className="p-4 font-semibold text-center w-40">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/5 text-sm">
                        {companies.map((company) => {
                            const usagePercent = company.requests_limit > 0
                                ? Math.min(100, Math.round((company.requests_used / company.requests_limit) * 100))
                                : 0;

                            let statusColor = "bg-green-100 text-green-700";
                            let StatusIcon = CheckCircle2;

                            if (usagePercent > 90) {
                                statusColor = "bg-red-100 text-red-700";
                                StatusIcon = AlertTriangle;
                            } else if (usagePercent > 70) {
                                statusColor = "bg-yellow-100 text-yellow-700";
                                StatusIcon = TrendingUp;
                            }

                            return (
                                <tr key={company.id} className={`hover:bg-gray-50/50 transition-colors ${company.is_active === false ? 'opacity-50 grayscale border-gray-300' : ''}`}>
                                    <td className="p-4 font-medium text-dark">{company.name}</td>
                                    <td className="p-4">
                                        <span className={`bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-semibold uppercase ${company.is_active === false ? 'bg-gray-200 text-gray-600' : ''}`}>
                                            {company.plan}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${usagePercent > 90 ? 'bg-red-500' : company.is_active === false ? 'bg-gray-400' : 'bg-primary'}`}
                                                    style={{ width: `${usagePercent}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium min-w-[60px] text-right">
                                                {company.requests_used} / {company.requests_limit}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className={`inline-flex items-center justify-center p-1.5 rounded-full ${company.is_active === false ? 'bg-gray-200 text-gray-500' : statusColor}`} title={`${usagePercent}% utilisé`}>
                                            <StatusIcon className="w-4 h-4" />
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold ${company.is_active === false ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}
                                                title={company.is_active === false ? "Activer" : "Désactiver"}
                                            >
                                                {company.is_active === false ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                                            </button>
                                            <button
                                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                                title="Modifier"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                                title="Supprimer"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
