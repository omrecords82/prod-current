import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Disable hover elevation lift */
  static?: boolean;
}

export function Card({ children, className = '', static: isStatic, ...props }: CardProps) {
  return (
    <div
      className={['om-ds-card', isStatic ? 'hover:shadow-[var(--om-shadow-card)]' : '', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
