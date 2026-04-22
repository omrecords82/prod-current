import type { ReactNode } from 'react';
import EditableText from '../EditableText';

interface CTASectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  editKeyPrefix?: string;
}

/**
 * Purple-gradient call-to-action banner used at the bottom of public pages.
 * Pass CTA buttons / links as children.
 */
const CTASection = ({ title, subtitle, children, editKeyPrefix }: CTASectionProps) => (
  <section className="py-20 om-hero-gradient">
    <div className="max-w-4xl mx-auto px-6 text-center">
      {editKeyPrefix ? (
        <EditableText contentKey={`${editKeyPrefix}.title`} as="h2" className="font-['Georgia'] text-4xl md:text-5xl mb-6">
          {title}
        </EditableText>
      ) : (
        <h2 className="font-['Georgia'] text-4xl md:text-5xl mb-6">{title}</h2>
      )}
      {subtitle && (
        editKeyPrefix ? (
          <EditableText contentKey={`${editKeyPrefix}.subtitle`} as="p" className="font-['Inter'] text-xl text-[rgba(255,255,255,0.9)] mb-8">
            {subtitle}
          </EditableText>
        ) : (
          <p className="font-['Inter'] text-xl text-[rgba(255,255,255,0.9)] mb-8">{subtitle}</p>
        )
      )}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">{children}</div>
    </div>
  </section>
);

export default CTASection;
