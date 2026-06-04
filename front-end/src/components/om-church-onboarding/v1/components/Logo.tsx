import {
  LOGO_SRC_DARK,
  LOGO_SRC_LIGHT,
  resolveBrandLogoSrc,
} from '@/layouts/full/shared/logo/Logo';

type LogoProps = {
  /** UI color scheme of the surrounding page (not the logo file name). */
  colorScheme?: 'light' | 'dark';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

const HEIGHTS = { sm: 36, md: 44, lg: 56 } as const;

export function Logo({ colorScheme, className = '', size = 'md' }: LogoProps) {
  const h = HEIGHTS[size];
  const src = resolveBrandLogoSrc({ colorScheme });

  return (
    <div className={`inline-flex items-center ${className}`} aria-label="Orthodox Metrics">
      <img
        src={src}
        alt="Orthodox Metrics"
        style={{ height: h, width: 'auto', objectFit: 'contain' }}
      />
    </div>
  );
}

export function LogoMark({
  colorScheme,
  className = '',
  size = 36,
}: {
  colorScheme?: 'light' | 'dark';
  className?: string;
  size?: number;
}) {
  const src = resolveBrandLogoSrc({ colorScheme });
  return (
    <div className={`inline-flex items-center ${className}`} aria-label="Orthodox Metrics">
      <img
        src={src}
        alt="Orthodox Metrics"
        style={{ height: size, width: 'auto', objectFit: 'contain' }}
      />
    </div>
  );
}

export { LOGO_SRC_DARK, LOGO_SRC_LIGHT };
