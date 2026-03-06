import { NextRequest, NextResponse } from 'next/server';
import { authGuard } from '@/middleware/authGuard';

// GET — Stats du dashboard admin
export async function GET(req: NextRequest) {
    return authGuard(req, async (req, { supabase, role, companyId }) => {
        if (role !== 'admin' && role !== 'super_admin') return NextResponse.json({ error: 'Accès Interdit' }, { status: 403 });

        const isSuperAdmin = role === 'super_admin';

        // Total users
        let usersQuery = supabase.from('profiles').select('id', { count: 'exact', head: true });
        if (!isSuperAdmin) usersQuery = usersQuery.eq('company_id', companyId);
        const { count: totalUsers } = await usersQuery;

        // Active users
        let activeQuery = supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true);
        if (!isSuperAdmin) activeQuery = activeQuery.eq('company_id', companyId);
        const { count: activeUsers } = await activeQuery;

        // Companies (super_admin) or company info (admin)
        let companiesCount = 0;
        let companyInfo = null;
        if (isSuperAdmin) {
            const { count } = await supabase.from('companies').select('id', { count: 'exact', head: true });
            companiesCount = count || 0;
        } else {
            const { data } = await supabase.from('companies').select('*').eq('id', companyId).single();
            companyInfo = data;
        }

        // Recent queries
        let logsQuery = supabase
            .from('query_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (!isSuperAdmin) logsQuery = logsQuery.eq('company_id', companyId);

        const { data: _recentLogs, error: logsError } = await logsQuery;

        if (logsError) {
            console.error("Erreur de récupération des logs :", logsError);
        }

        let recentLogs = _recentLogs || [];

        // Fetch profiles manually to avoid PostgREST foreign key missing relation errors
        if (recentLogs.length > 0) {
            const userIds = [...new Set(recentLogs.map((l: any) => l.user_id).filter(Boolean))];
            if (userIds.length > 0) {
                const { data: profilesData } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name')
                    .in('id', userIds);

                const profileMap = (profilesData || []).reduce((acc: any, p: any) => {
                    acc[p.id] = p;
                    return acc;
                }, {});

                recentLogs = recentLogs.map((log: any) => ({
                    ...log,
                    profiles: profileMap[log.user_id] || { first_name: 'Utilisateur', last_name: 'Inconnu' }
                }));
            }
        }

        return NextResponse.json({
            totalUsers: totalUsers || 0,
            activeUsers: activeUsers || 0,
            companiesCount,
            companyInfo,
            recentLogs: recentLogs,
        });
    });
}
