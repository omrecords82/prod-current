import type { ReactNode } from 'react';
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
 * Used on Homepage (features grid), About (platform highlights), Tour (additional features).
 */
const FeatureCard = ({ icon, title, description, layout = 'vertical', editKeyPrefix }: FeatureCardProps) => {
  if (layout === 'horizontal') {
    return (
      <div className="om-card p-8">
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0 w-16 h-16 bg-[#2d1b4e] dark:bg-[#d4af37] rounded-xl flex items-center justify-center">
            {icon}
          </div>
          <div className="flex-1">
            {editKeyPrefix ? (
              <EditableText contentKey={`${editKeyPrefix}.title`} as="h3" className="font-['Inter'] font-medium text-xl text-[#2d1b4e] dark:text-white mb-3">
                {title}
              </EditableText>
            ) : (
              <h3 className="font-['Inter'] font-medium text-xl text-[#2d1b4e] dark:text-white mb-3">{title}</h3>
            )}
            {editKeyPrefix ? (
              <EditableText contentKey={`${editKeyPrefix}.description`} as="p" className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400 leading-relaxed">
                {description}
              </EditableText>
            ) : (
              <p className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400 leading-relaxed">{description}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="om-card-compact p-6 hover:shadow-md transition-shadow">
      <div className="om-icon-container-small mb-4">
        {icon}
      </div>
      {editKeyPrefix ? (
        <EditableText contentKey={`${editKeyPrefix}.title`} as="h3" className="font-['Inter'] font-medium text-xl text-[#2d1b4e] dark:text-white mb-2">
          {title}
        </EditableText>
      ) : (
        <h3 className="font-['Inter'] font-medium text-xl text-[#2d1b4e] dark:text-white mb-2">{title}</h3>
      )}
      {editKeyPrefix ? (
        <EditableText contentKey={`${editKeyPrefix}.description`} as="p" className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400 leading-relaxed">
          {description}
        </EditableText>
      ) : (
        <p className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400 leading-relaxed">{description}</p>
      )}
    </div>
  );
};

export default FeatureCard;
