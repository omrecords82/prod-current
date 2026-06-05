import SiteFooter from '@/components/frontend-pages/shared/footer/SiteFooter';
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
import { Logo } from "../Logo";
import { ThemeToggle } from "../ThemeToggle";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

type Props = {
  onStart: () => void;
  onAdmin: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
};

/** Figma: baptism-small-footer 1 (node 65:24) — sacrament illustrations */
const SACRAMENT_ILLUSTRATIONS = [
  { key: "baptism", label: "Baptism Records", width: 233 },
  { key: "marriage", label: "Marriage Records", width: 233 },
  { key: "funeral", label: "Funeral Records", width: 292 },
] as const;

const SACRAMENT_ROTATE_MS = 5000;
const SACRAMENT_VIEWPORT_HEIGHT = 275;

function SacramentIllustrationRotator({
  onSlideChange,
}: {
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
      setActiveIndex((i) => (i + 1) % SACRAMENT_ILLUSTRATIONS.length);
    }, SACRAMENT_ROTATE_MS);

    return () => window.clearInterval(id);
  }, [paused]);

  const active = SACRAMENT_ILLUSTRATIONS[activeIndex];

  return (
    <div
      className="relative mx-auto w-full max-w-[292px]"
      style={{ height: SACRAMENT_VIEWPORT_HEIGHT }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Sacramental record illustrations"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      {SACRAMENT_ILLUSTRATIONS.map(({ key, label, width }, i) => {
        const isActive = i === activeIndex;
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
      <p className="sr-only">Now showing: {active.label}</p>
      <div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-2" role="tablist" aria-label="Sacrament slides">
        {SACRAMENT_ILLUSTRATIONS.map(({ label }, i) => (
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

export function Landing({ onStart, onAdmin, theme, onToggleTheme }: Props) {
  const [activeSacrament, setActiveSacrament] = useState(0);

  return (
    <div className="flex-1 w-full bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center no-underline">
            <Logo colorScheme={theme} size="md" />
          </a>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => { window.location.href = '/auth/login'; }}>Sign In</Button>
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
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
                For Orthodox Parishes
              </Badge>
            </div>
            <h1 className="font-['Georgia'] text-4xl lg:text-5xl leading-[1.1]" style={{ fontWeight: 400 }}>
              Digitize and manage your{" "}
              <span className="text-[#2d1b4e] dark:text-[#d4af37]">Orthodox church records.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              Orthodox Metrics helps parishes safely organize baptism, marriage, and funeral
              records — preserving the work of generations in a calm, secure workspace built for
              the Church.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={onStart}
                className="bg-[#d4af37] hover:bg-[#c29d2f] text-[#2d1b4e] font-medium px-8 py-4 rounded-lg text-[16px]"
              >
                Start Church Setup <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => { window.location.href = '/contact'; }} className="px-8 py-4 rounded-lg text-[16px]">
                Contact Orthodox Metrics
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground pt-2">
              <TrustItem icon={ShieldCheck} text="Reviewed by Orthodox Metrics staff" />
              <TrustItem icon={Lock} text="Encrypted records storage" />
            </div>
          </div>

          <Card className="border-[#d4af37]/30 shadow-xl">
            <CardContent className="p-6 space-y-5">
              <div className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
                How onboarding works
              </div>
              {[
                {
                  n: 1,
                  icon: FileSignature,
                  t: "Sign up your parish",
                  d: "Tell us about your church, jurisdiction, and contact.",
                },
                {
                  n: 2,
                  icon: UploadCloud,
                  t: "Upload your records",
                  d: "Scanned books, PDFs, or images — in batches.",
                },
                {
                  n: 3,
                  icon: Cpu,
                  t: "We process them",
                  d: "Orthodox Metrics staff review and structure each batch.",
                },
                {
                  n: 4,
                  icon: ClipboardCheck,
                  t: "Review results",
                  d: "Search, export, or request corrections from your dashboard.",
                },
              ].map((step) => (
                <div key={step.n} className="flex gap-4">
                  <div className="shrink-0 h-9 w-9 rounded-md bg-[rgba(212,175,55,0.12)] dark:bg-[#1e2a3a] text-[#2d1b4e] dark:text-[#d4af37] flex items-center justify-center">
                    <step.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Step {step.n}</div>
                    <div>{step.t}</div>
                    <div className="text-sm text-muted-foreground">{step.d}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-t border-border bg-white dark:bg-[#0d1117]">
        <div className="max-w-6xl mx-auto px-6 py-16 pb-20 grid lg:grid-cols-[345px_1fr] gap-12 lg:gap-16 items-start">
          <SacramentIllustrationRotator onSlideChange={setActiveSacrament} />
          <div className="space-y-8 pt-4 lg:pt-8 min-h-[275px]">
            {SACRAMENT_ILLUSTRATIONS.map(({ key, label }, i) => (
              <div
                key={key}
                className={`transition-opacity duration-500 ${
                  i === activeSacrament ? "opacity-100" : "opacity-40"
                }`}
              >
                <h3 className="font-['Georgia'] text-xl text-[#2d1b4e] dark:text-[#d4af37] mb-1">
                  {label}
                </h3>
                <p className="font-['Inter'] text-[15px] text-muted-foreground leading-relaxed">
                  {key === "baptism" &&
                    "Digitize baptism registers with sponsors, clergy, dates, and full search across your parish history."}
                  {key === "marriage" &&
                    "Preserve marriage records including witnesses, dispensations, and crowning details in one secure workspace."}
                  {key === "funeral" &&
                    "Organize funeral and memorial registers with clergy, burial details, and decades of parish history."}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function TrustItem({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-[#2d1b4e] dark:text-[#d4af37]" />
      <span>{text}</span>
    </div>
  );
}

