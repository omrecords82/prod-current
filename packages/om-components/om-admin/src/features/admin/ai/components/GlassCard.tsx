import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  noPadding?: boolean;
}

export function GlassCard({ children, className = '', hover = true, noPadding = false }: GlassCardProps) {
  return (
    <div className={`relative group ${className}`}>
      {hover && (
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100 pointer-events-none" />
      )}
      <div
        className={`relative bg-white dark:bg-gradient-to-br dark:from-white/5 dark:to-white/[0.02] dark:backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl hover:border-gray-300 dark:hover:border-white/20 transition-all shadow-sm dark:shadow-none ${
          noPadding ? '' : 'p-6'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
