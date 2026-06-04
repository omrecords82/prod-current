import { FC, useContext } from 'react';

import config from '@/context/config';
import { CustomizerContext } from '@/context/CustomizerContext';
import { styled, useTheme } from '@mui/material';
import { Link } from 'react-router-dom';

/** App shell / sidebar PNG marks */
export const LOGO_SRC_LIGHT = '/images/logos/om-logo-light.png';
export const LOGO_SRC_DARK = '/images/logos/om-logo-dark.png';

/** Public marketing header SVG wordmarks */
export const LOGO_TOP_SVG_LIGHT = '/images/logos/logo-top.svg';
export const LOGO_TOP_SVG_DARK = '/images/logos/logo-top-dark.svg';

export type BrandLogoProps = {
  className?: string;
  height?: number;
  href?: string;
  /** When set, overrides theme/customizer (use for scoped pages like enrollment). */
  colorScheme?: 'light' | 'dark';
  /** `header-svg` = public site top bar; `png` = app sidebar / auth shells */
  variant?: 'header-svg' | 'png';
  /** @deprecated Footer uses wordmark text; kept for compatibility */
  onDarkSurface?: boolean;
};

export function resolveBrandColorScheme(opts: {
  colorScheme?: 'light' | 'dark';
  onDarkSurface?: boolean;
  muiMode?: 'light' | 'dark';
  customizerMode?: string;
}): 'light' | 'dark' {
  const isDark =
    opts.onDarkSurface ||
    opts.colorScheme === 'dark' ||
    (opts.colorScheme !== 'light' &&
      (opts.muiMode === 'dark' || opts.customizerMode === 'dark'));
  return isDark ? 'dark' : 'light';
}

export function resolveBrandLogoSrc(opts: {
  colorScheme?: 'light' | 'dark';
  onDarkSurface?: boolean;
  muiMode?: 'light' | 'dark';
  customizerMode?: string;
  variant?: 'header-svg' | 'png';
}): string {
  const scheme = resolveBrandColorScheme(opts);
  if (opts.variant === 'header-svg') {
    return scheme === 'dark' ? LOGO_TOP_SVG_DARK : LOGO_TOP_SVG_LIGHT;
  }
  return scheme === 'dark' ? LOGO_SRC_DARK : LOGO_SRC_LIGHT;
}

export function BrandLogo({
  className = 'h-10 w-auto max-w-[min(100%,280px)] object-contain object-left',
  height,
  href,
  colorScheme,
  variant = 'png',
  onDarkSurface,
}: BrandLogoProps) {
  const { activeMode } = useContext(CustomizerContext);
  const theme = useTheme();
  const src = resolveBrandLogoSrc({
    colorScheme,
    onDarkSurface,
    muiMode: theme.palette.mode,
    customizerMode: activeMode,
    variant,
  });

  const img = (
    <img
      src={src}
      alt="Orthodox Metrics"
      className={className}
      style={
        height
          ? { height, width: 'auto', objectFit: 'contain' }
          : undefined
      }
    />
  );

  if (href) {
    return (
      <a href={href} className="flex items-center no-underline">
        {img}
      </a>
    );
  }
  return img;
}

const Logo: FC = () => {
  const { isCollapse, isSidebarHover } = useContext(CustomizerContext);
  const TopbarHeight = config.topbarHeight;
  const theme = useTheme();
  const isMini = isCollapse == "mini-sidebar" && !isSidebarHover;

  const LinkStyled = styled(Link)(() => ({
    height: TopbarHeight,
    width: isMini ? '40px' : '220px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
  }));

  const logoSrc = resolveBrandLogoSrc({ muiMode: theme.palette.mode });

  return (
    <LinkStyled to="/">
      <img
        src={logoSrc}
        alt="Orthodox Metrics"
        style={{
          height: isMini ? '32px' : '48px',
          width: 'auto',
          objectFit: 'contain',
        }}
      />
    </LinkStyled>
  );
};

export default Logo;
