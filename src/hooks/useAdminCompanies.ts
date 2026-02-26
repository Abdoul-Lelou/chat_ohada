import { useQuery } from '@tanstack/react-query';
import { adminDashboardService } from '@/services/adminDashboardService';
import { createClient } from '@/lib/supabase/client';
import { Company } from '@/types/admin';

export function useAdminCompanies(user: any) {
    const supabase = createClient();

    return useQuery<{ companies: Company[] }, Error>({
        queryKey: ['adminCompanies', user?.id],
        queryFn: () => adminDashboardService.getCompanies(supabase),
        enabled: !!user?.id,
    });
}
