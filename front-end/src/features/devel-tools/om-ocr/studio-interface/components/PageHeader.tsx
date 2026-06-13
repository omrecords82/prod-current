import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumb?: string[];
}

export function PageHeader({ title, subtitle, actions, breadcrumb }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        {breadcrumb && (
          <nav className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 mb-1.5">
            {breadcrumb.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span>/</span>}
                <span className={i === breadcrumb.length - 1 ? "text-slate-600 dark:text-slate-300" : ""}>{crumb}</span>
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 style={{ fontFamily: "var(--font-display)" }} className="text-2xl font-semibold text-[#1a2744] dark:text-slate-100 leading-tight">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0 ml-4">{actions}</div>}
    </div>
  );
}
