import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminDashboardService } from '@/services/adminDashboardService';
import { createClient } from '@/lib/supabase/client';
import { Building, Mail, CreditCard, Scale, X, Loader2, CheckCircle2 } from 'lucide-react';

interface CompanyFormProps {
    onClose: () => void;
}

export default function CompanyForm({ onClose }: CompanyFormProps) {
    const [name, setName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [plan, setPlan] = useState<'basic' | 'pro'>('basic');
    const [quota, setQuota] = useState(50);
    const [success, setSuccess] = useState(false);

    const supabase = createClient();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (data: any) => adminDashboardService.createCompany(supabase, data),
        onSuccess: () => {
            setSuccess(true);
            queryClient.invalidateQueries({ queryKey: ['adminCompanies'] });
            setTimeout(() => {
                onClose();
            }, 2000);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({
            name,
            admin_email: adminEmail,
            plan,
            requests_limit: quota
        });
    };

    if (success) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-10 max-w-sm w-full text-center space-y-4 animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-dark">Succès !</h3>
                    <p className="text-text-gray">Le cabinet et son administrateur ont été créés avec succès.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-primary/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl text-primary">
                            <Building className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-lg text-primary">Nouveau Cabinet</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {mutation.error && (
                        <div className="p-3 bg-red-50 text-error-red text-xs font-bold rounded-xl border border-red-100">
                            {(mutation.error as Error).message}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Building className="w-3 h-3" /> Nom du Cabinet
                        </label>
                        <input
                            required
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Cabinet Legal Advisor"
                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Mail className="w-3 h-3" /> Email Administrateur
                        </label>
                        <input
                            required
                            type="email"
                            value={adminEmail}
                            onChange={(e) => setAdminEmail(e.target.value)}
                            placeholder="admin@cabinet.com"
                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                        />
                        <p className="text-[10px] text-text-gray italic">Un compte 'Admin' sera créé automatiquement avec cet email.</p>
                    </div>

                    <div className="flex items-end gap-4">
                        <div className="space-y-2 flex-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <CreditCard className="w-3 h-3" /> Plan Select
                            </label>
                            <select
                                value={plan}
                                onChange={(e) => setPlan(e.target.value as any)}
                                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                            >
                                <option value="basic">Basic</option>
                                <option value="pro">Pro</option>
                            </select>
                        </div>
                        <div className="space-y-2 flex-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <Scale className="w-3 h-3" /> Quota (RAG)
                            </label>
                            <input
                                type="number"
                                value={quota}
                                onChange={(e) => setQuota(parseInt(e.target.value))}
                                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="bg-primary text-white px-8 py-3 h-[50px] rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 w-auto"
                        >
                            {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Créer"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
