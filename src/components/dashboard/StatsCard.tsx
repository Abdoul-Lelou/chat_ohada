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
};

export function StatsCard({ title, value, icon, description, trend }: StatsCardProps) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-primary/10 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className="text-text-gray font-medium text-sm">{title}</div>
                <div className="text-primary/70 bg-primary/5 p-2 rounded-lg">
                    {icon}
                </div>
            </div>

            <div>
                <div className="text-3xl font-bold font-headline text-dark">{value}</div>

                {(description || trend) && (
                    <div className="mt-2 flex items-center text-xs">
                        {trend && (
                            <span className={`font-medium mr-2 ${trend.isPositive ? 'text-green-600' : 'text-red-500'}`}>
                                {trend.isPositive ? '+' : ''}{trend.value}%
                            </span>
                        )}
                        <span className="text-text-gray">{description}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
