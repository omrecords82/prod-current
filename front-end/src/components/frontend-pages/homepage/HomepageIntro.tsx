import type { ReactNode } from 'react';
import { BookOpen, Search, Shield } from 'lucide-react';
import EditableText from '@/components/frontend-pages/shared/EditableText';
import { useLanguage } from '@/context/LanguageContext';

/** "What We Do" panel — used in homepage highlight carousel */
export function WhatWeDoPanel() {
  const { t } = useLanguage();

  return (
    <>
      <div className="text-center mb-10 md:mb-12">
        <div className="inline-flex items-center gap-2 om-badge-primary mb-4">
          <EditableText contentKey="intro.badge" as="span" className="font-om-body om-text-small text-[var(--om-text-primary)]">
            {t('home.intro_badge')}
          </EditableText>
        </div>
        <EditableText contentKey="intro.title" as="h2" className="font-om-display om-text-h2 text-[var(--om-text-primary)] mb-3">
          {t('home.intro_title')}
        </EditableText>
        <EditableText contentKey="intro.subtitle" as="p" className="font-om-body om-text-body-lg text-[var(--om-text-secondary)] max-w-2xl mx-auto" multiline>
          {t('home.intro_subtitle')}
        </EditableText>
      </div>

      <div className="grid md:grid-cols-3 gap-6 md:gap-8">
        <IntroCard
          icon={<BookOpen size={28} aria-hidden />}
          titleKey="intro.card1.title"
          descKey="intro.card1.desc"
          title={t('home.intro_card1_title')}
          description={t('home.intro_card1_desc')}
          accent="gold"
        />
        <IntroCard
          icon={<Search size={28} aria-hidden />}
          titleKey="intro.card2.title"
          descKey="intro.card2.desc"
          title={t('home.intro_card2_title')}
          description={t('home.intro_card2_desc')}
          accent="surface"
        />
        <IntroCard
          icon={<Shield size={28} aria-hidden />}
          titleKey="intro.card3.title"
          descKey="intro.card3.desc"
          title={t('home.intro_card3_title')}
          description={t('home.intro_card3_desc')}
          accent="gold"
        />
      </div>
    </>
  );
}

function IntroCard({
  icon,
  titleKey,
  descKey,
  title,
  description,
  accent,
}: {
  icon: ReactNode;
  titleKey: string;
  descKey: string;
  title: string;
  description: string;
  accent: 'gold' | 'surface';
}) {
  const iconWrap =
    accent === 'gold'
      ? 'bg-[var(--om-gold)] text-[var(--om-text-primary)] border-[var(--om-gold)]'
      : 'bg-[var(--om-input-bg)] text-[var(--om-gold)] border-[var(--om-border)]';

  return (
    <div className="om-ds-card !p-8">
      <div className={`w-14 h-14 rounded-xl border flex items-center justify-center mb-6 ${iconWrap}`}>
        {icon}
      </div>
      <EditableText contentKey={titleKey} as="h3" className="font-om-display om-text-h4 text-[var(--om-text-primary)] mb-3">
        {title}
      </EditableText>
      <EditableText contentKey={descKey} as="p" className="font-om-body om-text-body text-[var(--om-text-secondary)] leading-relaxed" multiline>
        {description}
      </EditableText>
    </div>
  );
}

export default WhatWeDoPanel;
