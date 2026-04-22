import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  trend?: string;
  trendLabel?: string;
}

export function StatCard({ title, value, icon, iconColor, iconBg, trend, trendLabel }: StatCardProps) {
  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100 pointer-events-none" />
      <div className="relative bg-white dark:bg-gradient-to-br dark:from-white/5 dark:to-white/[0.02] dark:backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-6 hover:border-gray-300 dark:hover:border-white/20 transition-all shadow-sm dark:shadow-none">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center ${iconColor}`}>
            {icon}
          </div>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{title}</p>
          <p className="text-gray-900 dark:text-white text-3xl font-bold">{value}</p>
          {trend && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-gray-500 dark:text-gray-400 font-medium">{trend}</span>
              {trendLabel && <span className="text-gray-400 dark:text-gray-500">{trendLabel}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
