/**
 * RecordPipelineStatus — Horizontal progress pipeline for record batches
 *
 * Shows lifecycle stages: Uploaded → Processing → Review → Ready
 * Users see simplified view (no "Admin Review" stage).
 * Admins/super_admins see full pipeline.
 */

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
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-['Inter'] font-semibold text-[15px] text-gray-900 dark:text-white">
            {t('portal.pipeline_title')}
          </h3>
          <p className="font-['Inter'] text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
            {t('portal.pipeline_subtitle')}
          </p>
        </div>
      </div>

      {/* Pipeline stages */}
      <div className="flex items-center gap-0">
        {stages.map((stage, idx) => {
          const isLast = idx === stages.length - 1;
          const isComplete = stage.key === 'approved' && stage.count > 0;
          const isActive = stage.active && !isComplete;

          return (
            <React.Fragment key={stage.key}>
              <div className="flex-1 text-center">
                {/* Icon */}
                <div className="flex justify-center mb-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isComplete
                        ? 'bg-emerald-100 dark:bg-emerald-900/30'
                        : isActive
                          ? 'bg-blue-100 dark:bg-blue-900/30'
                          : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={20} />
                    ) : isActive ? (
                      <Loader2 className="text-blue-600 dark:text-blue-400 animate-spin" size={20} />
                    ) : (
                      <Circle className="text-gray-400 dark:text-gray-500" size={20} />
                    )}
                  </div>
                </div>

                {/* Count */}
                <p
                  className={`font-['Inter'] text-2xl font-semibold mb-1 ${
                    isComplete
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {stage.count}
                </p>

                {/* Label */}
                <p
                  className={`font-['Inter'] text-[13px] font-medium ${
                    isComplete || isActive
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {stage.label}
                </p>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex-shrink-0 w-12 h-px bg-gray-200 dark:bg-gray-700 mt-[-24px]" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default RecordPipelineStatus;
