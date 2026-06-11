import type { ReactNode } from 'react';
import { Card } from '@/design-system';
import EditableText from '../EditableText';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  /** 'vertical' stacks icon above text (default), 'horizontal' places icon beside text */
  layout?: 'vertical' | 'horizontal';
  editKeyPrefix?: string;
}

/**
 * Reusable card showing an icon, title, and description.
 * Uses the unified OM design-system Card.
 */
const FeatureCard = ({ icon, title, description, layout = 'vertical', editKeyPrefix }: FeatureCardProps) => {
  if (layout === 'horizontal') {
    return (
      <Card className="!p-8">
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0 w-16 h-16 rounded-xl border border-[var(--om-border)] bg-[var(--om-input-bg)] flex items-center justify-center text-[var(--om-gold)]">
            {icon}
          </div>
          <div className="flex-1">
            {editKeyPrefix ? (
              <EditableText contentKey={`${editKeyPrefix}.title`} as="h3" className="font-om-display om-text-h4 mb-3">
                {title}
              </EditableText>
            ) : (
              <h3 className="font-om-display om-text-h4 mb-3">{title}</h3>
            )}
            {editKeyPrefix ? (
              <EditableText contentKey={`${editKeyPrefix}.description`} as="p" className="font-om-body om-text-small om-text-secondary leading-relaxed">
                {description}
              </EditableText>
            ) : (
              <p className="font-om-body om-text-small om-text-secondary leading-relaxed">{description}</p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card static className="!p-6 hover:!shadow-[var(--om-shadow-card-hover)]">
      <div className="om-icon-container-small mb-4 text-[var(--om-gold)]">{icon}</div>
      {editKeyPrefix ? (
        <EditableText contentKey={`${editKeyPrefix}.title`} as="h3" className="font-om-display om-text-h4 mb-2">
          {title}
        </EditableText>
      ) : (
        <h3 className="font-om-display om-text-h4 mb-2">{title}</h3>
      )}
      {editKeyPrefix ? (
        <EditableText contentKey={`${editKeyPrefix}.description`} as="p" className="font-om-body om-text-small om-text-secondary leading-relaxed">
          {description}
        </EditableText>
      ) : (
        <p className="font-om-body om-text-small om-text-secondary leading-relaxed">{description}</p>
      )}
    </Card>
  );
};

export default FeatureCard;
