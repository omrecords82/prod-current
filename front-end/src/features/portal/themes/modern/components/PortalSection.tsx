import type { ReactNode } from 'react';
import { cn } from '@/components/portal/ui';

interface PortalSectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PortalSection({ title, description, action, children, className }: PortalSectionProps) {
  return (
    <section className={cn('rounded-xl border border-border bg-card shadow-sm', className)}>
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
