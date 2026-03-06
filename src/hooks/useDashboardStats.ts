import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminDashboardService } from '@/services/adminDashboardService';
import { createClient } from '@/lib/supabase/client';
import { DashboardStats } from '@/types/admin';
import { useEffect } from 'react';

export function useDashboardStats(user: any) {
    const supabase = createClient();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel('query-logs-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'query_logs',
                    filter: user.role !== 'super_admin' ? `company_id=eq.${user.company_id}` : undefined,
                },
                () => {
                    // Invalidate and refetch stats when a new log matches the filter
                    queryClient.invalidateQueries({ queryKey: ['adminStats', user.id] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, user?.company_id, user?.role, queryClient, supabase]);

    return useQuery<DashboardStats, Error>({
        queryKey: ['adminStats', user?.id],
        queryFn: () => adminDashboardService.getStats(supabase),
        enabled: !!user?.id,
    });
}
