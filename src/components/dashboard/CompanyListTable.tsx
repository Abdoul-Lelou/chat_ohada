import React from 'react';
import { Company } from '@/types/admin';
import { TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

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
                            <th className="p-4 font-semibold text-center">Statut</th>
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
                                <tr key={company.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4 font-medium text-dark">{company.name}</td>
                                    <td className="p-4">
                                        <span className="bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-semibold uppercase">
                                            {company.plan}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${usagePercent > 90 ? 'bg-red-500' : 'bg-primary'}`}
                                                    style={{ width: `${usagePercent}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium min-w-[60px] text-right">
                                                {company.requests_used} / {company.requests_limit}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className={`inline-flex items-center justify-center p-1.5 rounded-full ${statusColor}`} title={`${usagePercent}% utilisé`}>
                                            <StatusIcon className="w-4 h-4" />
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
