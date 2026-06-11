import type { HTMLAttributes, ReactNode } from 'react';

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  /** Tighter vertical padding */
  compact?: boolean;
}

export function Section({ children, className = '', compact, ...props }: SectionProps) {
  return (
    <section
      className={[
        'om-ds-section',
        compact ? '!py-12 md:!py-16' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </section>
  );
}
