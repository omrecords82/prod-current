import { Badge } from "./ui/badge";

type Priority = "P0" | "P1" | "P2";
const labels: Record<Priority, string> = {
  P0: "P0 · Priority",
  P1: "P1 · Launch Support",
  P2: "P2 · Later CMS",
};
const colors: Record<Priority, string> = {
  P0: "bg-[#2d1b4e] text-[#d4af37] border-transparent",
  P1: "bg-[#d4af37]/20 text-[#2d1b4e] dark:text-[#d4af37] border-[#d4af37]/40",
  P2: "bg-muted text-muted-foreground border-transparent",
};

export function PriorityBadge({ p }: { p: Priority }) {
  return <Badge className={`${colors[p]} rounded-md`}>{labels[p]}</Badge>;
}

export function FrameHeader({
  number,
  title,
  description,
  priority,
  actions,
}: {
  number: number;
  title: string;
  description?: string;
  priority: Priority;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5 mb-6">
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Step {number}
        </div>
        <h1 className="text-2xl">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <PriorityBadge p={priority} />
        {actions}
      </div>
    </div>
  );
}
