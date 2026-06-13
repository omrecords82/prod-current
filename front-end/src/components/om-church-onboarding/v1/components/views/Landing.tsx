import { useEffect, useState } from "react";
import {
  ArrowRight,
  ClipboardCheck,
  Cpu,
  FileSignature,
  Lock,
  ShieldCheck,
  UploadCloud
} from "lucide-react";
import { Link } from "react-router-dom";
import { PUBLIC_ROUTES } from "@/config/publicRoutes";
import { useEnrollmentCopy } from "../../enrollmentCopy";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

type Props = {
  onStart: () => void;
};

const FLOW_ICONS = [FileSignature, UploadCloud, Cpu, ClipboardCheck] as const;

const SACRAMENT_ROTATE_MS = 5000;
const SACRAMENT_VIEWPORT_HEIGHT = 275;

function SacramentIllustrationRotator({
  sacraments,
  carouselLabel,
  slidesLabel,
  showingLabel,
  onSlideChange,
}: {
  sacraments: { key: string; label: string }[];
  carouselLabel: string;
  slidesLabel: string;
  showingLabel: (label: string) => string;
  onSlideChange?: (index: number) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    onSlideChange?.(activeIndex);
  }, [activeIndex, onSlideChange]);

  useEffect(() => {
    if (paused) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % sacraments.length);
    }, SACRAMENT_ROTATE_MS);

    return () => window.clearInterval(id);
  }, [paused, sacraments.length]);

  const active = sacraments[activeIndex];
  const widths: Record<string, number> = { baptism: 233, marriage: 233, funeral: 292 };

  return (
    <div
      className="relative mx-auto w-full max-w-[292px]"
      style={{ height: SACRAMENT_VIEWPORT_HEIGHT }}
      role="region"
      aria-roledescription="carousel"
      aria-label={carouselLabel}
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      {sacraments.map(({ key, label }, i) => {
        const isActive = i === activeIndex;
        const width = widths[key] ?? 233;
        return (
          <div
            key={key}
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ease-in-out ${
              isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
            aria-hidden={!isActive}
          >
            <img
              src={`/images/enroll/${key}-enroll-light.png`}
              alt={isActive ? label : ""}
              width={width}
              height={SACRAMENT_VIEWPORT_HEIGHT}
              className="max-h-full max-w-full w-auto object-contain object-center dark:hidden"
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
            />
            <img
              src={`/images/enroll/${key}-enroll-dark.png`}
              alt={isActive ? label : ""}
              width={width}
              height={SACRAMENT_VIEWPORT_HEIGHT}
              className="max-h-full max-w-full w-auto object-contain object-center hidden dark:block"
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
            />
          </div>
        );
      })}
      <p className="sr-only">{showingLabel(active.label)}</p>
      <div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-2" role="tablist" aria-label={slidesLabel}>
        {sacraments.map(({ label }, i) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={i === activeIndex}
            aria-label={label}
            onClick={() => setActiveIndex(i)}
            className={`h-2 rounded-full transition-all ${
              i === activeIndex
                ? "w-8 bg-[#2d1b4e] dark:bg-[#d4af37]"
                : "w-2 bg-[rgba(45,27,78,0.2)] dark:bg-white/25"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function Landing({ onStart }: Props) {
  const [activeSacrament, setActiveSacrament] = useState(0);
  const { landing, sacraments, stepLabel } = useEnrollmentCopy();

  return (
    <div className="flex-1 w-full bg-background text-foreground flex flex-col">
      <section className="relative overflow-hidden om-section-base">
        <div
          className="absolute inset-0 opacity-[0.06] dark:opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #2d1b4e 0, transparent 40%), radial-gradient(circle at 80% 30%, #d4af37 0, transparent 35%)",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
          <div className="space-y-7">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-[#d4af37]/40 text-[#2d1b4e] dark:text-[#d4af37]">
                {landing.badge}
              </Badge>
            </div>
            <h1 className="font-om-display text-4xl lg:text-5xl leading-[1.1] text-[var(--om-text-primary)]">
              {landing.headlinePrefix}{" "}
              <span className="text-[var(--om-gold)]">{landing.headlineAccent}</span>
            </h1>
            <p className="font-om-body text-lg text-muted-foreground max-w-xl">
              {landing.body}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={onStart}
                className="bg-[var(--om-gold)] hover:bg-[var(--om-gold-hover)] text-[var(--om-text-primary)] font-medium px-8 py-4 rounded-lg text-[16px]"
              >
                {landing.ctaStart} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" asChild className="px-8 py-4 rounded-lg text-[16px]">
                <Link to={PUBLIC_ROUTES.CONTACT}>{landing.ctaContact}</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground pt-2">
              <TrustItem icon={ShieldCheck} text={landing.trustReviewed} />
              <TrustItem icon={Lock} text={landing.trustEncrypted} />
            </div>
          </div>

          <Card className="border-[#d4af37]/30 shadow-xl">
            <CardContent className="p-6 space-y-5">
              <div className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
                {landing.onboardingTitle}
              </div>
              {landing.landingSteps.map((step, idx) => {
                const Icon = FLOW_ICONS[idx];
                return (
                  <div key={step.n} className="flex gap-4">
                    <div className="shrink-0 h-9 w-9 rounded-md bg-[rgba(212,175,55,0.12)] dark:bg-[#1e2a3a] text-[#2d1b4e] dark:text-[#d4af37] flex items-center justify-center">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">{stepLabel(step.n)}</div>
                      <div>{step.title}</div>
                      <div className="text-sm text-muted-foreground">{step.desc}</div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-t border-border om-section-base">
        <div className="max-w-6xl mx-auto px-6 py-16 pb-20 grid lg:grid-cols-[345px_1fr] gap-12 lg:gap-16 items-start">
          <SacramentIllustrationRotator
            sacraments={sacraments}
            carouselLabel={landing.carouselLabel}
            slidesLabel={landing.carouselSlidesLabel}
            showingLabel={landing.carouselShowing}
            onSlideChange={setActiveSacrament}
          />
          <div className="space-y-8 pt-4 lg:pt-8 min-h-[275px]">
            {sacraments.map((item, i) => (
              <div
                key={item.key}
                className={`transition-opacity duration-500 ${
                  i === activeSacrament ? "opacity-100" : "opacity-40"
                }`}
              >
                <h3 className="font-om-display text-xl text-[var(--om-text-primary)] mb-1">
                  {item.label}
                </h3>
                <p className="font-om-body text-[15px] text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function TrustItem({ icon: Icon, text }: { icon: typeof ShieldCheck; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-[#2d1b4e] dark:text-[#d4af37]" />
      <span>{text}</span>
    </div>
  );
}
