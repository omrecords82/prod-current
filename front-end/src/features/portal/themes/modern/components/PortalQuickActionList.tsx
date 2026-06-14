import type { LucideIcon } from '@/ui/icons';
import { ChevronRight } from '@/ui/icons';
import { cn } from '@/components/portal/ui';

export interface PortalQuickAction {
  icon: LucideIcon;
  label: string;
  description?: string;
  onClick: () => void;
}

interface PortalQuickActionListProps {
  actions: PortalQuickAction[];
  className?: string;
}

export function PortalQuickActionList({ actions, className }: PortalQuickActionListProps) {
  return (
    <div className={cn('divide-y divide-border', className)}>
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="group flex w-full items-center gap-3 px-1 py-3 text-left transition-colors hover:text-primary"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
              <Icon size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{action.label}</p>
              {action.description ? (
                <p className="truncate text-xs text-muted-foreground">{action.description}</p>
              ) : null}
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        );
      })}
    </div>
  );
}
