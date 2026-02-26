import { useQuery } from '@tanstack/react-query';
import { adminDashboardService } from '@/services/adminDashboardService';
import { createClient } from '@/lib/supabase/client';
import { DashboardStats } from '@/types/admin';

export function useDashboardStats(user: any) {
    const supabase = createClient();

    return useQuery<DashboardStats, Error>({
        queryKey: ['adminStats', user?.id],
        queryFn: () => adminDashboardService.getStats(supabase),
        enabled: !!user?.id,
    });
}
