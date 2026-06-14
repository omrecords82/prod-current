import { Card, CardContent, CardHeader, CardTitle } from '@/components/portal/ui';
import { CheckCircle2, Circle } from '@/ui/icons';
import React from 'react';
import {
  REVIEW_PIPELINE_STEPS,
  REVIEW_STATUS_CONFIG,
} from './uploadReviewConfig';

interface UploadWorkflowPipelineProps {
  counts: Record<string, number>;
  activeFilter?: string;
  onFilterChange?: (key: string) => void;
}

const UploadWorkflowPipeline: React.FC<UploadWorkflowPipelineProps> = ({
  counts,
  activeFilter = 'all',
  onFilterChange,
}) => {
  const stages = REVIEW_PIPELINE_STEPS.map((key) => {
    const cfg = REVIEW_STATUS_CONFIG[key];
    return {
      key,
      label: cfg.label,
      description: cfg.description,
      count: counts[key] || 0,
      color: cfg.color,
    };
  });

  const actionable = typeof onFilterChange === 'function';

  return (
    <Card className="gap-0 border-[var(--rm-border)] bg-[var(--rm-card)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-[15px] text-[var(--rm-fg)]">Processing Workflow</CardTitle>
        <p className="text-sm text-[var(--rm-muted-fg)]">
          Track each upload from image intake through OCR, field review, and seeding into records.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-0">
          {stages.map((stage, idx) => {
            const isLast = idx === stages.length - 1;
            const isActive = activeFilter === stage.key;
            const isComplete = stage.key === 'seeded' && stage.count > 0;
            const hasItems = stage.count > 0;

            const body = (
              <>
                <div className="mb-2 flex justify-center sm:mb-3">
                  <div
                    className="flex size-9 items-center justify-center rounded-full transition-colors sm:size-10"
                    style={{
                      backgroundColor: isComplete
                        ? 'color-mix(in srgb, var(--rm-accent) 18%, transparent)'
                        : hasItems
                          ? 'color-mix(in srgb, var(--rm-accent-soft) 80%, transparent)'
                          : 'var(--rm-muted)',
                    }}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="text-[var(--rm-accent)]" size={18} />
                    ) : (
                      <Circle
                        className={hasItems ? 'text-[var(--rm-accent)]' : 'text-[var(--rm-muted-fg)]'}
                        size={18}
                      />
                    )}
                  </div>
                </div>
                <p
                  className={`mb-0.5 text-xl font-semibold sm:text-2xl ${
                    hasItems ? 'text-[var(--rm-fg)]' : 'text-[var(--rm-muted-fg)]'
                  }`}
                >
                  {stage.count}
                </p>
                <p
                  className={`text-[12px] font-medium sm:text-[13px] ${
                    hasItems || isActive ? 'text-[var(--rm-fg)]' : 'text-[var(--rm-muted-fg)]'
                  }`}
                >
                  {stage.label}
                </p>
              </>
            );

            return (
              <React.Fragment key={stage.key}>
                {actionable ? (
                  <button
                    type="button"
                    title={stage.description}
                    onClick={() => onFilterChange(stage.key)}
                    className={`flex-1 rounded-lg border px-2 py-3 text-center transition-colors sm:rounded-none sm:border-0 sm:px-3 sm:py-0 ${
                      isActive
                        ? 'border-[var(--rm-accent)] bg-[var(--rm-accent-soft)]'
                        : 'border-transparent hover:bg-[var(--rm-muted)]'
                    }`}
                  >
                    {body}
                  </button>
                ) : (
                  <div className="flex-1 text-center" title={stage.description}>
                    {body}
                  </div>
                )}
                {!isLast && (
                  <div className="hidden h-px w-10 shrink-0 self-center bg-[var(--rm-border)] sm:block sm:mt-[-20px]" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadWorkflowPipeline;
