import { useEffect, useMemo, useState } from 'react';
import { Box } from '@mui/material';

/* ── Tunable Constants ─────────────────────────────────────────────── */
const EFFECT_COUNT = 5;                // Number of concurrent ambient elements
const GOLD_RGB = '185, 155, 50';       // Warm liturgical gold
const AMBER_RGB = '210, 170, 60';      // Slightly brighter amber variant
const IVORY_RGB = '240, 225, 180';     // Pale ivory for light streaks

/* ── Effect Types ─────────────────────────────────────────────────── */
// Each effect is randomly assigned one of these visual styles:
//   'orb'     — small soft radial glow that drifts across the header
//   'streak'  — thin elongated gradient that sweeps horizontally
//   'mote'    — tiny particle that floats with slight vertical wobble
//   'wave'    — wide, very faint wash of warmth that pulses across
type EffectType = 'orb' | 'streak' | 'mote' | 'wave';
const EFFECT_TYPES: EffectType[] = ['orb', 'streak', 'mote', 'wave'];

interface AmbientEffect {
  id: number;
  type: EffectType;
  duration: number;    // seconds
  delay: number;       // seconds
  startY: number;      // % from top
  height: number;      // px or %
  opacity: number;     // peak opacity
  color: string;       // RGB string
  scaleY: number;      // vertical stretch factor for variety
}

/** Picks a random item from an array */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Generates randomized ambient effects with varied styles */
function generateEffects(): AmbientEffect[] {
  return Array.from({ length: EFFECT_COUNT }, (_, i) => {
    const type = pick(EFFECT_TYPES);
    const color = pick([GOLD_RGB, AMBER_RGB, IVORY_RGB]);

    // Per-type tuning ranges
    const config: Record<EffectType, { dur: [number, number]; opacity: [number, number]; h: [number, number] }> = {
      orb:    { dur: [12, 22], opacity: [0.04, 0.09], h: [30, 60] },
      streak: { dur: [10, 18], opacity: [0.03, 0.06], h: [2, 6] },
      mote:   { dur: [14, 24], opacity: [0.06, 0.12], h: [2, 4] },
      wave:   { dur: [18, 30], opacity: [0.02, 0.04], h: [40, 80] },
    };
    const c = config[type];

    return {
      id: i,
      type,
      duration: c.dur[0] + Math.random() * (c.dur[1] - c.dur[0]),
      delay: Math.random() * 15,         // Stagger across 15s window
      startY: 10 + Math.random() * 70,   // Stay within header bounds
      height: c.h[0] + Math.random() * (c.h[1] - c.h[0]),
      opacity: c.opacity[0] + Math.random() * (c.opacity[1] - c.opacity[0]),
      color,
      scaleY: 0.6 + Math.random() * 0.8,
    };
  });
}

/**
 * <HeaderAmbience />
 *
 * Subtle randomized ambient animations that originate near the OM logo
 * (left side) and travel across the header. Each render picks a random
 * mix of orbs, streaks, motes, and waves for an organic, never-identical feel.
 *
 * Respects prefers-reduced-motion: disables everything.
 */
const HeaderAmbience = () => {
  const [reducedMotion, setReducedMotion] = useState(false);
  const effects = useMemo(() => generateEffects(), []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (reducedMotion) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,

        /* ── Keyframes ── */
        '@keyframes ambience-drift': {
          '0%':   { transform: 'translateX(-5%) translateY(0)', opacity: 0 },
          '8%':   { opacity: 'var(--fx-opacity)' },
          '85%':  { opacity: 'var(--fx-opacity)' },
          '100%': { transform: 'translateX(105vw) translateY(var(--fx-drift-y))', opacity: 0 },
        },
        '@keyframes ambience-mote': {
          '0%':   { transform: 'translateX(-2%) translateY(0)', opacity: 0 },
          '10%':  { opacity: 'var(--fx-opacity)' },
          '50%':  { transform: 'translateX(50vw) translateY(var(--fx-drift-y))', opacity: 'var(--fx-opacity)' },
          '90%':  { opacity: 'var(--fx-opacity)' },
          '100%': { transform: 'translateX(100vw) translateY(calc(var(--fx-drift-y) * -0.5))', opacity: 0 },
        },
        '@keyframes ambience-wave': {
          '0%':   { transform: 'translateX(-30%) scaleX(0.5)', opacity: 0 },
          '15%':  { opacity: 'var(--fx-opacity)' },
          '80%':  { opacity: 'var(--fx-opacity)' },
          '100%': { transform: 'translateX(100%) scaleX(1.2)', opacity: 0 },
        },
      }}
    >
      {effects.map((fx) => {
        // Choose animation name per effect type
        const animName = fx.type === 'mote' ? 'ambience-mote'
          : fx.type === 'wave' ? 'ambience-wave'
          : 'ambience-drift';

        // Per-type visual styling
        const typeStyles: Record<EffectType, object> = {
          orb: {
            width: `${fx.height}px`,
            height: `${fx.height}px`,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(${fx.color}, 0.4) 0%, transparent 70%)`,
            filter: `blur(${fx.height * 0.3}px)`,
          },
          streak: {
            width: '120px',
            height: `${fx.height}px`,
            borderRadius: '4px',
            background: `linear-gradient(90deg, transparent 0%, rgba(${fx.color}, 0.5) 30%, rgba(${fx.color}, 0.5) 70%, transparent 100%)`,
            filter: 'blur(1.5px)',
          },
          mote: {
            width: `${fx.height}px`,
            height: `${fx.height}px`,
            borderRadius: '50%',
            backgroundColor: `rgba(${fx.color}, 0.5)`,
            boxShadow: `0 0 ${fx.height + 2}px rgba(${fx.color}, 0.3)`,
          },
          wave: {
            width: '30%',
            height: `${fx.height}%`,
            borderRadius: '50%',
            background: `radial-gradient(ellipse at center, rgba(${fx.color}, 0.3) 0%, transparent 70%)`,
            filter: 'blur(8px)',
          },
        };

        // Small random vertical drift for organic feel (-15 to +15 px)
        const driftY = -15 + Math.random() * 30;

        return (
          <Box
            key={fx.id}
            sx={{
              position: 'absolute',
              left: 0,
              top: `${fx.startY}%`,
              transform: 'translateX(-5%)',
              opacity: 0,
              willChange: 'transform, opacity',
              '--fx-opacity': fx.opacity,
              '--fx-drift-y': `${driftY}px`,
              animation: `${animName} ${fx.duration}s ${fx.delay}s ease-in-out infinite`,
              ...typeStyles[fx.type],
            } as any}
          />
        );
      })}
    </Box>
  );
};

export default HeaderAmbience;
