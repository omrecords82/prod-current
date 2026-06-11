/**
 * Orthodox Metrics design tokens (TypeScript mirror of design-tokens.css).
 * Use for programmatic styling, charts, and MUI theme bridges.
 */

export const omTokens = {
  gold: {
    DEFAULT: '#D4AF37',
    hover: '#E3C35A',
    pressed: '#B88E1D',
  },
  light: {
    bg: '#F7F3E8',
    surface: '#FFFDF8',
    surfaceElevated: '#FFFFFF',
    border: 'rgba(27, 20, 100, 0.08)',
    textPrimary: '#1A1730',
    textSecondary: '#57546A',
    inputBg: 'rgba(0, 0, 0, 0.03)',
  },
  dark: {
    bg: '#120A2A',
    surface: '#1A1038',
    surfaceElevated: '#24154A',
    border: 'rgba(212, 175, 55, 0.15)',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.70)',
    inputBg: 'rgba(255, 255, 255, 0.05)',
  },
  font: {
    heading: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  typeScale: {
    h1: '3.5rem',
    h2: '2.625rem',
    h3: '2rem',
    h4: '1.5rem',
    bodyLg: '1.125rem',
    body: '1rem',
    small: '0.875rem',
    caption: '0.75rem',
  },
  radius: {
    card: '16px',
    button: '8px',
    input: '8px',
    pill: '9999px',
  },
  shadow: {
    card: '0 1px 3px rgba(26, 23, 48, 0.06), 0 4px 12px rgba(26, 23, 48, 0.04)',
    cardHover: '0 4px 16px rgba(26, 23, 48, 0.1)',
    elevated: '0 8px 24px rgba(26, 23, 48, 0.12)',
  },
  spacing: {
    sectionY: '5rem',
    card: '1.5rem',
    stack: '1rem',
  },
  transition: {
    DEFAULT: '150ms ease',
    slow: '250ms ease',
  },
} as const;

export type OmButtonVariant = 'primary' | 'secondary' | 'tertiary';
