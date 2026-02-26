import { DashboardStats, Company, UserProfile } from '@/types/admin';

export const adminDashboardService = {
    async fetchWithAuth(url: string, supabaseClient: any, options: RequestInit = {}) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) throw new Error("Non authentifié");

        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || `Erreur: ${response.status}`);
        }

        return response.json();
    },

    async getStats(supabaseClient: any): Promise<DashboardStats> {
        return this.fetchWithAuth('/api/admin/stats', supabaseClient);
    },

    async getUsers(supabaseClient: any): Promise<{ users: UserProfile[] }> {
        return this.fetchWithAuth('/api/admin/users', supabaseClient);
    },

    async getCompanies(supabaseClient: any): Promise<{ companies: Company[] }> {
        return this.fetchWithAuth('/api/admin/companies', supabaseClient);
    },

    async createUser(supabaseClient: any, userData: any): Promise<any> {
        return this.fetchWithAuth('/api/admin/users', supabaseClient, {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },

    async updateUserStatus(supabaseClient: any, payload: { user_id: string, is_active: boolean }): Promise<any> {
        return this.fetchWithAuth('/api/admin/users', supabaseClient, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });
    }
};
