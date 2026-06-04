import {
  LOGO_TOP_SVG_DARK,
  LOGO_TOP_SVG_LIGHT,
  resolveBrandColorScheme,
} from '@/layouts/full/shared/logo/Logo';

type LogoProps = {
  /** Page color scheme (light background vs dark background). */
  colorScheme?: 'light' | 'dark';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

const HEIGHTS = { sm: 36, md: 40, lg: 48 } as const;

export function Logo({ colorScheme, className = '', size = 'md' }: LogoProps) {
  const h = HEIGHTS[size];
  const scheme = resolveBrandColorScheme({ colorScheme });
  const src = scheme === 'dark' ? LOGO_TOP_SVG_DARK : LOGO_TOP_SVG_LIGHT;

  return (
    <div className={`inline-flex items-center ${className}`} aria-label="Orthodox Metrics">
      <img
        src={src}
        alt="Orthodox Metrics"
        className="w-auto max-w-[min(100%,300px)] object-contain object-left"
        style={{ height: h }}
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
  const scheme = resolveBrandColorScheme({ colorScheme });
  const src = scheme === 'dark' ? LOGO_TOP_SVG_DARK : LOGO_TOP_SVG_LIGHT;

  return (
    <div className={`inline-flex items-center ${className}`} aria-label="Orthodox Metrics">
      <img
        src={src}
        alt="Orthodox Metrics"
        style={{ height: size, width: 'auto', maxWidth: 220, objectFit: 'contain' }}
      />
    </div>
  );
}
