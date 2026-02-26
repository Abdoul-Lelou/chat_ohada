import React from 'react';

type StatsCardProps = {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    description?: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
};

export function StatsCard({ title, value, icon, description, trend, variant = 'neutral' }: StatsCardProps) {
    const variantStyles = {
        primary: {
            container: "bg-blue-50 border-blue-100",
            iconBg: "bg-blue-500 text-white shadow-blue-200",
            title: "text-blue-600",
            trend: "text-blue-600"
        },
        success: {
            container: "bg-green-50 border-green-100",
            iconBg: "bg-green-500 text-white shadow-green-200",
            title: "text-green-600",
            trend: "text-green-600"
        },
        warning: {
            container: "bg-orange-50 border-orange-100",
            iconBg: "bg-orange-500 text-white shadow-orange-200",
            title: "text-orange-600",
            trend: "text-orange-600"
        },
        error: {
            container: "bg-red-50 border-red-100",
            iconBg: "bg-red-500 text-white shadow-red-200",
            title: "text-red-600",
            trend: "text-red-600"
        },
        info: {
            container: "bg-indigo-50 border-indigo-100",
            iconBg: "bg-indigo-500 text-white shadow-indigo-200",
            title: "text-indigo-600",
            trend: "text-indigo-600"
        },
        neutral: {
            container: "bg-white border-primary/10",
            iconBg: "bg-primary/5 text-primary",
            title: "text-text-gray",
            trend: "text-primary"
        }
    };

    const style = variantStyles[variant];

    return (
        <div className={`p-6 rounded-2xl border shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 ${style.container}`}>
            <div className="flex justify-between items-start mb-4">
                <div className={`font-bold text-xs uppercase tracking-wider ${style.title}`}>{title}</div>
                <div className={`p-2.5 rounded-xl shadow-lg transition-transform hover:scale-110 ${style.iconBg}`}>
                    {icon}
                </div>
            </div>

            <div>
                <div className="text-3xl font-bold font-headline text-dark mb-1">{value}</div>

                {(description || trend) && (
                    <div className="flex items-center text-xs">
                        {trend && (
                            <span className={`font-bold mr-2 flex items-center gap-0.5 ${trend.isPositive ? 'text-green-600' : 'text-red-500'}`}>
                                {trend.isPositive ? '↑' : '↓'} {trend.value}%
                            </span>
                        )}
                        <span className="text-text-gray font-medium">{description}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
