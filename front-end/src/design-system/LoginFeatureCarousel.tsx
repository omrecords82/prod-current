import { useEffect, useState } from 'react';
import { Archive, Award, Building2, ScanLine } from 'lucide-react';
import { Card } from './Card';

const SLIDES = [
  {
    title: 'Record Preservation',
    description:
      'Secure baptism, marriage, and funeral registers with canonical custody — decades of parish history in one trusted system.',
    icon: Archive,
    accent: 'Secure archival storage',
  },
  {
    title: 'OCR Processing',
    description:
      'Digitize handwritten ledgers with intelligent field extraction. Turn fragile books into searchable, structured records.',
    icon: ScanLine,
    accent: 'Handwriting → structured data',
  },
  {
    title: 'Certificate Generation',
    description:
      'Issue official Orthodox certificates directly from verified sacramental records — consistent, dignified, and audit-ready.',
    icon: Award,
    accent: 'Print-ready parish certificates',
  },
  {
    title: 'Parish Management',
    description:
      'Onboard parishes, manage roles, and oversee multi-site operations from a single enterprise dashboard.',
    icon: Building2,
    accent: 'Multi-parish operations',
  },
] as const;

const SLIDE_MS = 7000;

/**
 * Login left panel — product feature carousel aligned with homepage messaging.
 */
export function LoginFeatureCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % SLIDES.length), SLIDE_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  const slide = SLIDES[active];
  const Icon = slide.icon;

  return (
    <div
      className="h-full min-h-[480px] flex flex-col"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Orthodox Metrics product features"
    >
      <Card className="flex-1 flex flex-col justify-between !p-8 md:!p-10 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, var(--om-gold) 0, var(--om-gold) 1px, transparent 0, transparent 50%)',
            backgroundSize: '12px 12px',
          }}
          aria-hidden
        />

        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 om-text-caption font-semibold uppercase tracking-[0.14em] text-[var(--om-gold)] mb-4">
            <span className="w-6 h-px bg-[var(--om-gold)]" aria-hidden />
            {slide.accent}
          </span>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-xl border border-[var(--om-border)] bg-[var(--om-input-bg)] flex items-center justify-center text-[var(--om-gold)]">
              <Icon size={28} strokeWidth={1.5} aria-hidden />
            </div>
            <h2 className="om-text-h3 !mb-0">{slide.title}</h2>
          </div>
          <p className="om-text-body-lg om-text-secondary max-w-lg">{slide.description}</p>
        </div>

        {/* Visual preview panel — stylized product surface */}
        <div
          className="relative z-10 mt-8 rounded-xl border border-[var(--om-border)] bg-[var(--om-surface)] p-5 min-h-[160px]"
          aria-hidden
        >
          <div className="flex gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--om-gold)] opacity-60" />
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--om-border)]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--om-border)]" />
          </div>
          <div className="space-y-2">
            <div className="h-2.5 rounded bg-[var(--om-input-bg)] w-[92%]" />
            <div className="h-2.5 rounded bg-[var(--om-input-bg)] w-[78%]" />
            <div className="h-2.5 rounded bg-[var(--om-input-bg)] w-[85%]" />
            <div className="h-8 rounded-lg border border-[var(--om-border)] bg-[var(--om-surface-elevated)] mt-4 flex items-center px-3">
              <span className="om-text-caption om-text-secondary">{slide.title} — preview</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex gap-2 justify-center mt-6">
          {SLIDES.map((_, i) => (
            <button
              key={SLIDES[i].title}
              type="button"
              aria-label={`Show ${SLIDES[i].title}`}
              onClick={() => setActive(i)}
              className={`h-2 rounded-full transition-all border-0 cursor-pointer ${
                active === i ? 'w-7 bg-[var(--om-gold)]' : 'w-2 bg-[var(--om-border)] hover:opacity-80'
              }`}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
