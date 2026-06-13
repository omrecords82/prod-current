import React from "react";

type StatusType =
  | "processing" | "queued" | "completed" | "failed" | "review"
  | "approved" | "draft" | "uploading" | "uploaded" | "warning"
  | "seeded" | "needs_correction" | "active" | "inactive" | "info";

const STATUS_CONFIG: Record<StatusType, { label: string; bg: string; text: string; dot: string }> = {
  processing: { label: "Processing", bg: "bg-blue-50 dark:bg-blue-950/50", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  queued:     { label: "Queued",     bg: "bg-slate-100 dark:bg-slate-700/60", text: "text-slate-600 dark:text-slate-300", dot: "bg-slate-400" },
  completed:  { label: "Completed",  bg: "bg-green-50 dark:bg-green-950/50", text: "text-green-700 dark:text-green-300", dot: "bg-green-500" },
  failed:     { label: "Failed",     bg: "bg-red-50 dark:bg-red-950/50", text: "text-red-700 dark:text-red-300", dot: "bg-red-500" },
  review:     { label: "Needs Review", bg: "bg-amber-50 dark:bg-amber-950/50", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  approved:   { label: "Approved",   bg: "bg-green-50 dark:bg-green-950/50", text: "text-green-700 dark:text-green-300", dot: "bg-green-500" },
  draft:      { label: "Draft",      bg: "bg-slate-100 dark:bg-slate-700/60", text: "text-slate-600 dark:text-slate-300", dot: "bg-slate-400" },
  uploading:  { label: "Uploading",  bg: "bg-blue-50 dark:bg-blue-950/50", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  uploaded:   { label: "Uploaded",   bg: "bg-green-50 dark:bg-green-950/50", text: "text-green-700 dark:text-green-300", dot: "bg-green-500" },
  warning:    { label: "Warning",    bg: "bg-amber-50 dark:bg-amber-950/50", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  seeded:     { label: "Seeded",     bg: "bg-purple-50 dark:bg-purple-950/50", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500" },
  needs_correction: { label: "Needs Correction", bg: "bg-amber-50 dark:bg-amber-950/50", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  active:     { label: "Active",     bg: "bg-green-50 dark:bg-green-950/50", text: "text-green-700 dark:text-green-300", dot: "bg-green-500" },
  inactive:   { label: "Inactive",   bg: "bg-slate-100 dark:bg-slate-700/60", text: "text-slate-600 dark:text-slate-300", dot: "bg-slate-400" },
  info:       { label: "Info",       bg: "bg-blue-50 dark:bg-blue-950/50", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
};

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, label, size = "sm" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const displayLabel = label ?? config.label;
  const sizeClasses = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.bg} ${config.text} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {displayLabel}
    </span>
  );
}

export function RecordTypeBadge({ type }: { type: "baptism" | "marriage" | "funeral" | "unknown" }) {
  const config = {
    baptism: { label: "Baptism", bg: "bg-blue-50 dark:bg-blue-950/50", text: "text-blue-700 dark:text-blue-300" },
    marriage: { label: "Marriage", bg: "bg-purple-50 dark:bg-purple-950/50", text: "text-purple-700 dark:text-purple-300" },
    funeral: { label: "Funeral", bg: "bg-slate-100 dark:bg-slate-700/60", text: "text-slate-600 dark:text-slate-300" },
    unknown: { label: "Auto-detect", bg: "bg-amber-50 dark:bg-amber-950/50", text: "text-amber-700 dark:text-amber-300" },
  }[type];
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

export function ConfidenceBadge({ value }: { value: number }) {
  const color = value >= 85
    ? "text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-950/50"
    : value >= 65
      ? "text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/50"
      : "text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950/50";
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold font-mono ${color}`}>
      {value}%
    </span>
  );
}
