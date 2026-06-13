import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { ImageComparisonPanel } from './ImageComparisonPanel';
import type { ViewerMode } from './recordsTransformDemoData';

interface EnhancedRecordViewerProps {
  label: string;
  year: string;
  count: number;
  badge?: string;
  imageSrc: string;
  variant: ViewerMode;
  children: ReactNode;
}

export function EnhancedRecordViewer({
  label, year, count, badge, imageSrc, variant, children,
}: EnhancedRecordViewerProps) {
  const { t } = useLanguage();
  const isDifficult = variant === 'difficult';

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <motion.div
        className="flex items-center gap-3 mb-5 flex-wrap"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="w-2 h-2 rounded-full bg-[#2d1b4e] dark:bg-[#d4af37]" />
        <span className="text-gray-900 dark:text-gray-100 text-sm font-om-body">
          {label} — {year}
        </span>
        {badge && (
          <span className="text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700">
            {badge}
          </span>
        )}
        <span className="text-gray-400 dark:text-gray-500 text-xs ml-auto font-om-body">
          {t('home.records_extracted_count').replace('{count}', String(count))}
        </span>
      </motion.div>

      {isDifficult ? (
        <>
          <ImageComparisonPanel imageSrc={imageSrc} variant="primary" delay={0.1} />
          {children}
        </>
      ) : (
        <>
          <ImageComparisonPanel imageSrc={imageSrc} variant="secondary" delay={0.1} />
          {children}
        </>
      )}

      <motion.p
        className="text-center text-gray-400 dark:text-gray-500 text-xs mt-4 font-om-body"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        {t('home.records_extracted_footer')}
      </motion.p>
    </div>
  );
}
