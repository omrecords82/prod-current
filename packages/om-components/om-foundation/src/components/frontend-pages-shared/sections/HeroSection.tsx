import type { ReactNode } from 'react';
import EditableText from '../EditableText';

interface HeroSectionProps {
  badge?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  editKeyPrefix?: string;
}

/**
 * Purple gradient hero banner used at the top of every public page.
 * Supports an optional gold badge pill, title, subtitle, and arbitrary children (e.g. CTA buttons).
 */
const HeroSection = ({ badge, title, subtitle, children, editKeyPrefix }: HeroSectionProps) => (
  <section className="om-hero-gradient py-20 md:py-24">
    <div className="max-w-7xl mx-auto px-6 text-center">
      {badge && (
        <div className="om-hero-badge mb-6">
          {editKeyPrefix ? (
            <EditableText contentKey={`${editKeyPrefix}.badge`} as="span" className="om-hero-badge-text">
              {badge}
            </EditableText>
          ) : (
            <span className="om-hero-badge-text">{badge}</span>
          )}
        </div>
      )}
      {editKeyPrefix ? (
        <EditableText contentKey={`${editKeyPrefix}.title`} as="h1" className="font-['Georgia'] text-5xl md:text-6xl leading-tight mb-6">
          {title}
        </EditableText>
      ) : (
        <h1 className="font-['Georgia'] text-5xl md:text-6xl leading-tight mb-6">{title}</h1>
      )}
      {subtitle && (
        editKeyPrefix ? (
          <EditableText contentKey={`${editKeyPrefix}.subtitle`} as="p" className="font-['Inter'] text-xl text-[rgba(255,255,255,0.9)] max-w-3xl mx-auto mb-8">
            {subtitle}
          </EditableText>
        ) : (
          <p className="font-['Inter'] text-xl text-[rgba(255,255,255,0.9)] max-w-3xl mx-auto mb-8">
            {subtitle}
          </p>
        )
      )}
      {children}
    </div>
  </section>
);

export default HeroSection;
