import type { LucideIcon } from '@/ui/icons';
import { cn } from '@/components/portal/ui';

interface PortalStatTileProps {
  label: string;
  value: number;
  icon: LucideIcon;
  accentClass: string;
  loading?: boolean;
  onClick?: () => void;
}

export function PortalStatTile({
  label,
  value,
  icon: Icon,
  accentClass,
  loading,
  onClick,
}: PortalStatTileProps) {
  const Comp = onClick ? 'button' : 'div';

  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors',
        onClick && 'cursor-pointer hover:border-primary/40 hover:bg-accent/40',
      )}
    >
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {loading ? (
          <div className="mt-2 h-8 w-16 animate-pulse rounded bg-muted" />
        ) : (
          <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
            {value.toLocaleString()}
          </p>
        )}
      </div>
      <div className={cn('flex size-11 items-center justify-center rounded-xl', accentClass)}>
        <Icon size={20} />
      </div>
    </Comp>
  );
}
