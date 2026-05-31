/**
 * HomepageRecordsTransformSection — Homepage wrapper for WrittenToDigitalShowcase.
 *
 * Adds the homepage-specific section shell (background, title, subtitle)
 * around the reusable showcase component.
 */

import EditableText from '@/components/frontend-pages/shared/EditableText';
import WrittenToDigitalShowcase from '@/components/showcase/WrittenToDigitalShowcase';
import { useLanguage } from '@/context/LanguageContext';

export default function HomepageRecordsTransformSection() {
  const { t } = useLanguage();

  return (
    <section className="py-16 md:py-20 bg-[#2d1b4e] dark:bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        {/* Title */}
        <div className="text-center mb-10 md:mb-12">
          <EditableText contentKey="records.title" as="h2" className="font-['Georgia'] text-3xl md:text-4xl lg:text-5xl mb-3">
            {t('home.records_title')}
          </EditableText>
          <EditableText contentKey="records.subtitle" as="p" className="font-['Inter'] text-white/70 dark:text-white/55 max-w-2xl mx-auto text-base md:text-lg" multiline>
            {t('home.records_subtitle')}
          </EditableText>
        </div>

        <WrittenToDigitalShowcase variant="full" />
      </div>
    </section>
  );
}
