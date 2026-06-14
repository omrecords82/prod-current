/**
 * RecordPipelineStatus — Horizontal progress pipeline for record batches
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/portal/ui';
import { CheckCircle2, Circle, Loader2 } from '@/ui/icons';
import { useLanguage } from '@/context/LanguageContext';
import React from 'react';

export interface PipelineStageCounts {
  uploaded: number;
  processing: number;
  admin_review: number;
  approved: number;
  published: number;
}

interface PipelineStage {
  key: string;
  label: string;
  count: number;
  active: boolean;
}

interface RecordPipelineStatusProps {
  counts: PipelineStageCounts;
  isAdmin: boolean;
}

const RecordPipelineStatus: React.FC<RecordPipelineStatusProps> = ({ counts, isAdmin }) => {
  const { t } = useLanguage();

  const stages: PipelineStage[] = isAdmin
    ? [
        { key: 'uploaded', label: t('portal.pipeline_uploaded'), count: counts.uploaded, active: counts.uploaded > 0 },
        { key: 'processing', label: t('portal.pipeline_processing'), count: counts.processing, active: counts.processing > 0 },
        { key: 'admin_review', label: t('portal.pipeline_admin_review'), count: counts.admin_review, active: counts.admin_review > 0 },
        { key: 'approved', label: t('portal.pipeline_ready'), count: counts.approved + counts.published, active: (counts.approved + counts.published) > 0 },
      ]
    : [
        { key: 'uploaded', label: t('portal.pipeline_uploaded'), count: counts.uploaded, active: counts.uploaded > 0 },
        { key: 'processing', label: t('portal.pipeline_processing'), count: counts.processing + counts.admin_review, active: (counts.processing + counts.admin_review) > 0 },
        { key: 'approved', label: t('portal.pipeline_ready'), count: counts.approved + counts.published, active: (counts.approved + counts.published) > 0 },
      ];

  return (
    <Card className="gap-0">
      <CardHeader className="pb-4">
        <CardTitle className="text-[15px]">{t('portal.pipeline_title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('portal.pipeline_subtitle')}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-0">
          {stages.map((stage, idx) => {
            const isLast = idx === stages.length - 1;
            const isComplete = stage.key === 'approved' && stage.count > 0;
            const isActive = stage.active && !isComplete;

            return (
              <React.Fragment key={stage.key}>
                <div className="flex-1 text-center">
                  <div className="mb-3 flex justify-center">
                    <div
                      className={`flex size-10 items-center justify-center rounded-full transition-colors ${
                        isComplete
                          ? 'bg-emerald-100 dark:bg-emerald-900/30'
                          : isActive
                            ? 'bg-accent'
                            : 'bg-muted'
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={20} />
                      ) : isActive ? (
                        <Loader2 className="animate-spin text-primary" size={20} />
                      ) : (
                        <Circle className="text-muted-foreground" size={20} />
                      )}
                    </div>
                  </div>

                  <p
                    className={`mb-1 text-2xl font-semibold ${
                      isComplete
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : isActive
                          ? 'text-primary'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {stage.count}
                  </p>

                  <p
                    className={`text-[13px] font-medium ${
                      isComplete || isActive ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {stage.label}
                  </p>
                </div>

                {!isLast && (
                  <div className="mt-[-24px] h-px w-12 shrink-0 bg-border" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecordPipelineStatus;
