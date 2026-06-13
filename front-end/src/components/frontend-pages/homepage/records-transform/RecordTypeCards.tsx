import { motion } from 'framer-motion';
import { Cross, Heart, Church } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { recordCards, type RecordType } from './recordsTransformDemoData';

const LABEL_KEYS: Record<RecordType, string> = {
  baptisms: 'home.records_type1_name',
  marriages: 'home.records_type2_name',
  funerals: 'home.records_type3_name',
  custom: 'home.records_type4_card_label',
};

function OrthodoxCross({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className={className}>
      <line x1="12" y1="2" x2="12" y2="30" />
      <line x1="7" y1="7" x2="17" y2="7" />
      <line x1="5" y1="14" x2="19" y2="14" />
      <line x1="7" y1="24" x2="17" y2="20" />
    </svg>
  );
}

function CardIcon({ type, className }: { type: RecordType; className?: string }) {
  if (type === 'baptisms') return <Cross className={className} />;
  if (type === 'marriages') return <Heart className={className} />;
  if (type === 'funerals') return <Church className={className} />;
  return <OrthodoxCross className={className} />;
}

interface RecordTypeCardsProps {
  activeType: RecordType;
  onSelect: (type: RecordType) => void;
  onHover: (type: RecordType) => void;
}

export function RecordTypeCards({ activeType, onSelect, onHover }: RecordTypeCardsProps) {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto mb-8 md:mb-10">
      {recordCards.map((card) => {
        const isActive = activeType === card.type;
        const isCustom = card.type === 'custom';

        return (
          <motion.button
            key={card.type}
            type="button"
            onClick={() => onSelect(card.type)}
            onMouseEnter={() => onHover(card.type)}
            whileHover={{ y: -2 }}
            className={`
              relative rounded-2xl p-4 md:p-5 text-left transition-all duration-200 cursor-pointer
              border bg-[var(--om-surface-elevated)] shadow-[var(--om-shadow-card)]
              ${isActive
                ? 'border-[var(--om-gold)] ring-2 ring-[var(--om-gold)]/25 shadow-[var(--om-shadow-card-hover)]'
                : 'border-[var(--om-border)] hover:border-[var(--om-gold)]/45 hover:shadow-[var(--om-shadow-card-hover)]'}
              ${isCustom && !isActive ? 'border-dashed' : ''}
            `}
          >
            {card.badge && (
              <span className="absolute top-2.5 right-2.5 md:top-3 md:right-3 text-[9px] md:text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full bg-[var(--om-surface)] text-[var(--om-gold)] border border-[var(--om-border)] font-om-body font-semibold">
                {t('home.records_ai_badge')}
              </span>
            )}

            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 border ${
                isActive
                  ? 'bg-[var(--om-gold)] border-[var(--om-gold)] text-[var(--om-text-primary)]'
                  : 'bg-[var(--om-input-bg)] border-[var(--om-border)] text-[var(--om-gold)]'
              }`}
            >
              <CardIcon type={card.type} className="w-5 h-5" />
            </div>

            <div className={`text-sm mb-1 font-om-body font-semibold ${isActive ? 'text-[var(--om-text-primary)]' : 'text-[var(--om-text-primary)]'}`}>
              {t(LABEL_KEYS[card.type])}
            </div>
            <div className="text-xs text-[var(--om-text-secondary)] font-om-body">
              {card.year} &middot; {card.count} {t('home.records_count_suffix')}
            </div>

            {isActive && (
              <motion.div
                layoutId="activeIndicator"
                className="absolute bottom-0 left-4 right-4 h-0.5 bg-[var(--om-gold)] rounded-full"
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
