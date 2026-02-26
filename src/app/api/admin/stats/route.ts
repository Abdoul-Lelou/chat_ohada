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
            .select('*, profiles(first_name, last_name)')
            .order('created_at', { ascending: false })
            .limit(10);
        if (!isSuperAdmin) logsQuery = logsQuery.eq('company_id', companyId);
        const { data: recentLogs } = await logsQuery;

        return NextResponse.json({
            totalUsers: totalUsers || 0,
            activeUsers: activeUsers || 0,
            companiesCount,
            companyInfo,
            recentLogs: recentLogs || [],
        });
    });
}
