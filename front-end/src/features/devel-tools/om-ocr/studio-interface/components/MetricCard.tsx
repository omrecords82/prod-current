import React from "react";
import { LucideIcon } from '@/ui/icons';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: "default" | "blue" | "green" | "amber" | "red" | "purple" | "gold";
  onClick?: () => void;
}

const colorMap = {
  default: {
    icon: "text-slate-400 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-700/60",
    border: "border-slate-200 dark:border-slate-600",
  },
  blue: {
    icon: "text-blue-500 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/50",
    border: "border-blue-100 dark:border-blue-800/60",
  },
  green: {
    icon: "text-green-500 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/50",
    border: "border-green-100 dark:border-green-800/60",
  },
  amber: {
    icon: "text-amber-500 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/50",
    border: "border-amber-100 dark:border-amber-800/60",
  },
  red: {
    icon: "text-red-500 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/50",
    border: "border-red-100 dark:border-red-800/60",
  },
  purple: {
    icon: "text-purple-500 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/50",
    border: "border-purple-100 dark:border-purple-800/60",
  },
  gold: {
    icon: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-950/40",
    border: "border-yellow-100 dark:border-yellow-800/60",
  },
};

export function MetricCard({ label, value, icon: Icon, trend, trendUp, color = "default", onClick }: MetricCardProps) {
  const c = colorMap[color];
  return (
    <div
      className={`bg-white dark:bg-slate-800/90 rounded-lg border ${c.border} p-4 flex flex-col gap-2 ${onClick ? "cursor-pointer hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/20 transition-shadow" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
        {Icon && (
          <span className={`w-8 h-8 rounded-md ${c.bg} flex items-center justify-center`}>
            <Icon size={16} className={c.icon} />
          </span>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-semibold text-[#1a2744] dark:text-slate-100">{value}</span>
        {trend && (
          <span className={`text-xs pb-0.5 font-medium ${trendUp ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>{trend}</span>
        )}
      </div>
    </div>
  );
}
