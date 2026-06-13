type OmMarkLogoProps = {
  className?: string;
  height?: number;
  colorScheme: 'light' | 'dark';
};

/** Compact O+M Orthodox cross mark — theme-aware (navy/ivory letters, gold cross). */
export function OmMarkLogo({ className = '', height, colorScheme }: OmMarkLogoProps) {
  const letters = colorScheme === 'dark' ? '#F6F1E8' : '#1A2E52';
  const gold = colorScheme === 'dark' ? '#D4AF37' : '#B8892A';
  const goldHighlight = colorScheme === 'dark' ? '#E6C96A' : '#C9A44A';

  return (
    <svg
      viewBox="0 0 496 220"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Orthodox Metrics"
      className={className}
      style={height ? { height, width: 'auto', display: 'block' } : { display: 'block' }}
    >
      <text
        x="4"
        y="172"
        fill={letters}
        fontFamily="'Cinzel', 'Times New Roman', Georgia, serif"
        fontSize="172"
        fontWeight="600"
      >
        O
      </text>

      <g transform="translate(204 24)" fill="none" strokeLinecap="round">
        <line x1="44" y1="6" x2="44" y2="168" stroke={gold} strokeWidth="8" />
        <line x1="30" y1="26" x2="58" y2="26" stroke={goldHighlight} strokeWidth="5.5" />
        <line x1="12" y1="62" x2="76" y2="62" stroke={goldHighlight} strokeWidth="5.5" />
        <line x1="22" y1="124" x2="66" y2="140" stroke={goldHighlight} strokeWidth="5.5" />
      </g>

      <text
        x="286"
        y="172"
        fill={letters}
        fontFamily="'Cinzel', 'Times New Roman', Georgia, serif"
        fontSize="172"
        fontWeight="600"
      >
        M
      </text>
    </svg>
  );
}
