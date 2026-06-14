/**
 * HomepageRecordsTransformSection — Homepage church records transformation demo.
 *
 * Shows the title/subtitle and a video walkthrough of handwritten → digital records.
 */

import EditableText from '@/components/frontend-pages/shared/EditableText';
import { useLanguage } from '@/context/LanguageContext';

const RECORDS_TRANSFORM_VIDEO_SRC = '/videos/old-to-new.mp4';

export default function HomepageRecordsTransformSection() {
  const { t } = useLanguage();

  return (
    <section className="py-16 md:py-20 om-section-base">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="text-center mb-10 md:mb-12">
          <EditableText contentKey="records.title" as="h2" className="font-om-display text-3xl md:text-4xl lg:text-5xl mb-3">
            {t('home.records_title')}
          </EditableText>
          <EditableText contentKey="records.subtitle" as="p" className="font-om-body om-public-text-muted max-w-2xl mx-auto text-base md:text-lg" multiline>
            {t('home.records_subtitle')}
          </EditableText>
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-purple-900/30 bg-black/20 backdrop-blur w-full">
          <video
            className="w-full h-auto block bg-black"
            src={RECORDS_TRANSFORM_VIDEO_SRC}
            controls
            playsInline
            autoPlay
            muted
            loop
            preload="metadata"
            aria-label="Parish records transformation from handwritten ledgers to structured digital data"
          >
            <track kind="captions" />
          </video>
        </div>
      </div>
    </section>
  );
}
