export interface Company {
    id: string;
    name: string;
    plan: 'free' | 'pro' | 'enterprise';
    requests_used: number;
    requests_limit: number;
    is_active: boolean;
    created_at: string;
}

export interface UserProfile {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: 'user' | 'admin' | 'super_admin';
    company_id: string;
    is_active: boolean;
    created_at: string;
}

export interface QueryLog {
    id: string;
    user_id: string;
    company_id: string;
    prompt: string;
    created_at: string;
    profiles?: {
        first_name: string;
        last_name: string;
    };
}

export interface DashboardStats {
    totalUsers: number;
    activeUsers: number;
    companiesCount: number;
    companyInfo?: Company;
    recentLogs: QueryLog[];
}
