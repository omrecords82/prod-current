import EditableText from '../EditableText';

interface SectionHeaderProps {
  badge?: string;
  /** Badge variant: 'primary' uses purple tint, 'secondary' uses white with shadow */
  badgeVariant?: 'primary' | 'secondary';
  title: string;
  subtitle?: string;
  editKeyPrefix?: string;
}

/**
 * Centred section header with optional badge pill, heading, and subtitle.
 * Used to introduce content sections throughout public pages.
 */
const SectionHeader = ({ badge, badgeVariant = 'primary', title, subtitle, editKeyPrefix }: SectionHeaderProps) => (
  <div className="text-center mb-16">
    {badge && (
      <div className={badgeVariant === 'secondary' ? 'om-badge-secondary mb-4 inline-flex' : 'om-badge-primary mb-4 inline-flex'}>
        {editKeyPrefix ? (
          <EditableText contentKey={`${editKeyPrefix}.badge`} as="span" className="om-text-primary text-[14px]">
            {badge}
          </EditableText>
        ) : (
          <span className="om-text-primary text-[14px]">{badge}</span>
        )}
      </div>
    )}
    {editKeyPrefix ? (
      <EditableText contentKey={`${editKeyPrefix}.title`} as="h2" className="om-heading-primary mb-4">
        {title}
      </EditableText>
    ) : (
      <h2 className="om-heading-primary mb-4">{title}</h2>
    )}
    {subtitle && (
      editKeyPrefix ? (
        <EditableText contentKey={`${editKeyPrefix}.subtitle`} as="p" className="font-['Inter'] text-xl text-[#4a5565] dark:text-gray-400 max-w-2xl mx-auto">
          {subtitle}
        </EditableText>
      ) : (
        <p className="font-['Inter'] text-xl text-[#4a5565] dark:text-gray-400 max-w-2xl mx-auto">
          {subtitle}
        </p>
      )
    )}
  </div>
);

export default SectionHeader;
