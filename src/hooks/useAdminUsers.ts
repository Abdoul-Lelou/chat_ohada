import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminDashboardService } from '@/services/adminDashboardService';
import { createClient } from '@/lib/supabase/client';
import { UserProfile } from '@/types/admin';

export function useAdminUsers(user: any) {
    const supabase = createClient();

    return useQuery<{ users: UserProfile[] }, Error>({
        queryKey: ['adminUsers', user?.id],
        queryFn: () => adminDashboardService.getUsers(supabase),
        enabled: !!user?.id,
    });
}

export function useCreateAdminUser() {
    const supabase = createClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (userData: any) => adminDashboardService.createUser(supabase, userData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
            queryClient.invalidateQueries({ queryKey: ['adminStats'] });
        },
    });
}

export function useUpdateAdminUserStatus() {
    const supabase = createClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: { user_id: string, is_active: boolean }) => adminDashboardService.updateUserStatus(supabase, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
        },
    });
}
