import { useState, useEffect, useCallback, useContext } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PUBLIC_ROUTES } from "@/config/publicRoutes";
import { CustomizerContext } from "@/context/CustomizerContext";
import { ProductEcosystem } from "./ProductEcosystem";

export interface HeroCarouselProps {
  /** When true, omits duplicate site chrome (HpHeader already renders above). */
  embedded?: boolean;
}

const G  = "#D4AF37";
const GS = "#E6C96A";
const IV = "#F6F1E8";
const PD = "#2D1B69";
const PK = "#14093A";

// Slide-specific focus description (left side sub-content)
const SLIDE_FOCUS = [
  {
    badge: "COMPLETE PLATFORM",
    desc: "From historic sacramental books to digital certificates — one connected Orthodox parish records system.",
  },
  {
    badge: "OCR & DIGITIZATION",
    desc: "Convert handwritten baptism, marriage, and funeral registers into searchable, structured digital records with intelligent field extraction.",
  },
  {
    badge: "RECORD MANAGEMENT",
    desc: "Search, filter, review, and audit every sacramental record across all your parishes with full permission controls.",
  },
  {
    badge: "CERTIFICATES & REPORTS",
    desc: "Generate official Orthodox parish certificates and documentation directly from verified sacramental records.",
  },
  {
    badge: "PARISH OPERATIONS",
    desc: "Onboard parishes, manage users and roles, view analytics, and oversee multi-parish record operations from one dashboard.",
  },
];

// Small three-bar Orthodox cross SVG
function OrthodoxCross({ px = 14, color = G, opacity = 1 }: { px?: number; color?: string; opacity?: number }) {
  return (
    <svg width={Math.round(px * 0.7)} height={px} viewBox="0 0 12 20" fill="none" style={{ opacity, flexShrink: 0 }}>
      <line x1="3"   y1="4"  x2="9"   y2="4"  stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6"   y1="1"  x2="6"   y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="0"   y1="9"  x2="12"  y2="9"  stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2.5" y1="14" x2="9.5" y2="17" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Parchment texture overlay SVG (subtle crosshatch/grain)
function ParchmentTexture({ isDark }: { isDark: boolean }) {
  if (!isDark) return null; // Light mode relies on the warm gradient already
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.025 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="parchment" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          {/* Diagonal grain lines */}
          <line x1="0" y1="10" x2="10" y2="0"   stroke={IV} strokeWidth="0.4" />
          <line x1="0" y1="30" x2="30" y2="0"   stroke={IV} strokeWidth="0.4" />
          <line x1="10" y1="40" x2="40" y2="10" stroke={IV} strokeWidth="0.4" />
          <line x1="30" y1="40" x2="40" y2="30" stroke={IV} strokeWidth="0.4" />
          {/* Horizontal micro lines */}
          <line x1="0" y1="20" x2="40" y2="20"  stroke={IV} strokeWidth="0.2" opacity="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#parchment)" />
    </svg>
  );
}

// Byzantine decorative border detail (top and bottom)
function ByzantineBorder({ isDark, position }: { isDark: boolean; position: "top" | "bottom" }) {
  const col = isDark ? G : PD;
  return (
    <div style={{
      position: "absolute", left: 0, right: 0,
      [position]: 0,
      height: "6px",
      overflow: "hidden",
    }}>
      <svg width="100%" height="6" viewBox="0 0 800 6" preserveAspectRatio="xMidYMid slice">
        {/* Main gold line */}
        <line x1="0" y1="3" x2="800" y2="3" stroke={col} strokeWidth={position === "bottom" ? 1.5 : 1} opacity="0.5" />
        {/* Repeating diamond ornaments */}
        {Array.from({ length: 40 }).map((_, i) => (
          <g key={i} transform={`translate(${i * 20}, 3)`}>
            <polygon points="0,-2 3,0 0,2 -3,0" fill={col} opacity="0.3" />
          </g>
        ))}
      </svg>
    </div>
  );
}

// Flow steps indicator (left side bottom)
const FLOW_STEPS = [
  { label: "Records",     short: "1" },
  { label: "Digitization", short: "2" },
  { label: "Management", short: "3" },
  { label: "Certificates", short: "4" },
  { label: "Operations", short: "5" },
];

export function HeroCarousel({ embedded = false }: HeroCarouselProps) {
  const { activeMode } = useContext(CustomizerContext);
  const isDark = activeMode === "dark";
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const advance = useCallback(() => setActiveSlide(s => (s + 1) % SLIDE_FOCUS.length), []);

  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(advance, 6000);
    return () => clearInterval(id);
  }, [advance, isPaused]);

  const bg = "var(--om-bg)";

  const textPrimary  = isDark ? IV : PK;
  const textMuted    = isDark ? "rgba(246,241,232,0.5)" : "rgba(14,6,37,0.5)";
  const textAccent   = isDark ? GS : PD;
  const panelBg      = isDark ? "rgba(45,27,105,0.35)" : "rgba(246,241,232,0.7)";
  const panelBorder  = isDark ? "rgba(212,175,55,0.18)" : "rgba(45,27,105,0.12)";

  const focus = SLIDE_FOCUS[activeSlide];

  return (
    <div
      style={{
        width: "100%", minHeight: embedded ? "min(920px, calc(100vh - 72px))" : "100vh",
        background: bg,
        fontFamily: "var(--om-font-body)",
        position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Parchment grain texture */}
      <ParchmentTexture isDark={isDark} />

      {/* Byzantine borders */}
      <ByzantineBorder isDark={isDark} position="top" />
      <ByzantineBorder isDark={isDark} position="bottom" />

      {/* Background ambient glows */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{
          position: "absolute", top: "10%", left: "5%",
          width: "500px", height: "500px", borderRadius: "50%",
          background: `radial-gradient(circle, ${isDark ? "rgba(212,175,55,0.05)" : "rgba(212,175,55,0.08)"} 0%, transparent 70%)`,
        }} />
        <div style={{
          position: "absolute", bottom: "5%", right: "5%",
          width: "600px", height: "600px", borderRadius: "50%",
          background: `radial-gradient(circle, ${isDark ? "rgba(62,35,125,0.45)" : "rgba(45,27,105,0.04)"} 0%, transparent 70%)`,
        }} />
        {/* Large faint Orthodox cross watermark */}
        <svg style={{ position: "absolute", bottom: "10%", left: "2%", opacity: isDark ? 0.018 : 0.025 }} width="300" height="500" viewBox="0 0 24 40" fill="none">
          <line x1="6"  y1="8"  x2="18" y2="8"  stroke={IV}  strokeWidth="1.5" />
          <line x1="12" y1="2"  x2="12" y2="38" stroke={IV}  strokeWidth="1.5" />
          <line x1="0"  y1="18" x2="24" y2="18" stroke={IV}  strokeWidth="1.5" />
          <line x1="4"  y1="29" x2="20" y2="33" stroke={IV}  strokeWidth="1.5" />
        </svg>
      </div>

      {/* Standalone chrome (non-embedded demos only; production uses HpHeader theme toggle) */}
      {!embedded && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 48px",
          borderBottom: `1px solid rgba(212,175,55,${isDark ? 0.1 : 0.12})`,
          zIndex: 10, position: "relative",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <OrthodoxCross px={20} color={G} />
            <span style={{ fontFamily: "Cinzel, serif", fontSize: "13px", letterSpacing: "3px", color: G, fontWeight: 600 }}>ORTHODOX METRICS</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
            {[
              { label: "Platform", to: PUBLIC_ROUTES.TOUR },
              { label: "Parishes", to: PUBLIC_ROUTES.SAMPLES },
              { label: "Security", to: PUBLIC_ROUTES.SECURITY },
              { label: "About", to: PUBLIC_ROUTES.ABOUT },
            ].map(l => (
              <Link key={l.label} to={l.to} style={{ fontFamily: "Cinzel, serif", fontSize: "9.5px", letterSpacing: "1.5px", color: textMuted, textDecoration: "none" }}>{l.label}</Link>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link to={PUBLIC_ROUTES.ENROLL} style={{
              background: `linear-gradient(135deg, ${G}, ${GS})`, borderRadius: "5px", padding: "7px 16px",
              fontFamily: "Cinzel, serif", fontSize: "9px", letterSpacing: "1.5px", color: PK, fontWeight: 700, textDecoration: "none",
            }}>ENROLL YOUR PARISH</Link>
          </div>
        </div>
      )}

      {/* Main layout — 2 columns on lg+; inline gridTemplateColumns was overriding CSS */}
      <div
        className={`om-figma-hero-grid flex-1 grid w-full max-w-[1440px] mx-auto box-border items-start grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-8 lg:gap-10 ${embedded ? 'px-4 sm:px-8 lg:px-12 pb-6' : 'px-12 pb-8'}`}
      >

        {/* ── LEFT PANEL ─────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-col gap-6 pt-6 pb-4 lg:pt-8">

          {/* Secondary brand line */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <OrthodoxCross px={12} color={G} opacity={0.7} />
            <span style={{
              fontFamily: "Cinzel, serif", fontSize: "10px", letterSpacing: "2.5px",
              color: isDark ? "rgba(212,175,55,0.65)" : "rgba(45,27,105,0.55)",
            }}>WELCOME TO ORTHODOX METRICS</span>
          </div>

          {/* Main headline — STATIC */}
          <div>
            <h1 style={{
              fontFamily: "Cinzel, serif",
              fontSize: "clamp(1.8rem, 3vw, 2.9rem)",
              fontWeight: 700, lineHeight: 1.15, margin: 0,
              color: textPrimary,
            }}>
              The Complete Parish<br />
              Records Platform
            </h1>
            <h2 style={{
              fontFamily: "Cinzel, serif",
              fontSize: "clamp(1.1rem, 1.8vw, 1.7rem)",
              fontWeight: 400, lineHeight: 1.4, margin: "8px 0 0",
              color: G,
              letterSpacing: "1px",
            }}>
              for Orthodox Churches
            </h2>
          </div>

          {/* Gold rule */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "1px", background: G, opacity: 0.5 }} />
            <OrthodoxCross px={16} color={G} opacity={0.7} />
            <div style={{ flex: 1, height: "1px", background: `linear-gradient(90deg, rgba(212,175,55,0.5), transparent)` }} />
          </div>

          {/* Supporting text — STATIC */}
          <p style={{
            fontFamily: "var(--om-font-body)",
            fontSize: "clamp(1rem, 1.3vw, 1.15rem)",
            lineHeight: 1.75, margin: 0,
            color: textMuted,
            maxWidth: "500px",
          }}>
            Digitize, preserve, search, manage, and generate official documents
            from baptism, marriage, and funeral records through one secure
            Orthodox parish platform.
          </p>

          {/* Slide-specific focus chip — ANIMATES */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSlide}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
              style={{
                display: "inline-flex", alignItems: "flex-start", gap: "10px",
                background: isDark ? "rgba(45,27,105,0.4)" : "rgba(246,241,232,0.7)",
                border: `1px solid rgba(212,175,55,${isDark ? 0.25 : 0.3})`,
                borderRadius: "8px", padding: "12px 14px",
                maxWidth: "500px",
                backdropFilter: "blur(8px)",
              }}
            >
              <div style={{
                background: `rgba(212,175,55,0.15)`,
                border: `1px solid rgba(212,175,55,0.4)`,
                borderRadius: "4px", padding: "3px 8px",
                fontFamily: "Cinzel, serif", fontSize: "8px",
                letterSpacing: "1.5px", color: G, flexShrink: 0,
                alignSelf: "flex-start", marginTop: "1px",
              }}>{focus.badge}</div>
              <p style={{
                fontFamily: "var(--om-font-body)", fontSize: "13px",
                lineHeight: 1.6, margin: 0, color: textMuted, fontStyle: "italic",
              }}>{focus.desc}</p>
            </motion.div>
          </AnimatePresence>

          {/* CTAs */}
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <Link
              to={PUBLIC_ROUTES.ENROLL}
              style={{
                background: `linear-gradient(135deg, ${G} 0%, ${GS} 100%)`,
                border: "none", borderRadius: "6px",
                color: PK, fontFamily: "Cinzel, serif",
                fontSize: "10.5px", fontWeight: 700, letterSpacing: "1.5px",
                padding: "13px 28px", cursor: "pointer",
                boxShadow: "0 4px 20px rgba(212,175,55,0.4)",
                textDecoration: "none", display: "inline-block",
              }}
            >
              ENROLL YOUR PARISH
            </Link>
            <Link
              to={PUBLIC_ROUTES.TOUR}
              style={{
                background: "transparent",
                border: `1px solid rgba(212,175,55,${isDark ? 0.4 : 0.45})`,
                borderRadius: "6px", color: G,
                fontFamily: "Cinzel, serif",
                fontSize: "10.5px", letterSpacing: "1.5px",
                padding: "13px 28px", cursor: "pointer",
                backdropFilter: "blur(6px)",
                textDecoration: "none", display: "inline-block",
              }}
            >
              EXPLORE THE PLATFORM
            </Link>
          </div>

          {/* Trust indicators */}
          <div style={{
            display: "flex", flexDirection: "column", gap: "6px",
            paddingTop: "4px",
          }}>
            {[
              { icon: "✦", text: "Baptism • Marriage • Funeral Records" },
              { icon: "✦", text: "Secure Parish Record Preservation" },
              { icon: "✦", text: "Built for Orthodox Churches" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "7px", color: G, opacity: 0.7 }}>{item.icon}</span>
                <span style={{
                  fontFamily: "var(--om-font-body)", fontSize: "11px",
                  color: textMuted, letterSpacing: "0.2px",
                }}>{item.text}</span>
              </div>
            ))}
          </div>

          {/* Slide dots + progress */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingTop: "4px" }}>
            {FLOW_STEPS.map((step, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                title={step.label}
                style={{
                  width: i === activeSlide ? "28px" : "7px",
                  height: "7px",
                  borderRadius: "4px",
                  background: i === activeSlide ? G : `rgba(212,175,55,${isDark ? 0.3 : 0.35})`,
                  border: "none", cursor: "pointer", padding: 0,
                  transition: "width 0.35s, background 0.35s",
                }}
              />
            ))}
            <span style={{
              fontFamily: "Cinzel, serif", fontSize: "9px",
              color: textMuted, letterSpacing: "1px", marginLeft: "4px",
            }}>
              {String(activeSlide + 1).padStart(2, "0")} / {String(SLIDE_FOCUS.length).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* ── RIGHT PANEL ────────────────────────────────────────────── */}
        <div className="relative min-w-0 w-full pt-4 pb-4 lg:pt-6">
          {/* Panel label */}
          <div style={{
            position: "absolute", top: "28px", right: "0px",
            background: isDark ? "rgba(20,9,58,0.75)" : "rgba(246,241,232,0.85)",
            border: `1px solid rgba(212,175,55,${isDark ? 0.25 : 0.3})`,
            borderRadius: "6px", padding: "5px 12px",
            backdropFilter: "blur(12px)",
            zIndex: 5,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <OrthodoxCross px={10} color={G} opacity={0.7} />
              <span style={{
                fontFamily: "Cinzel, serif", fontSize: "8px",
                letterSpacing: "1.8px", color: G,
              }}>PLATFORM ECOSYSTEM</span>
            </div>
          </div>

          {/* The ecosystem — scales to fit column width */}
          <div
            className="om-figma-ecosystem-frame overflow-hidden rounded-xl"
            style={{
              boxShadow: isDark
                ? "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,175,55,0.1)"
                : "0 32px 80px rgba(45,27,105,0.18), 0 0 0 1px rgba(212,175,55,0.2)",
            }}
          >
            <div className="om-figma-ecosystem-scaler">
              <ProductEcosystem activeSlide={activeSlide} isDark={isDark} />
            </div>
          </div>

          {/* Bottom gold line accent */}
          <div style={{
            height: "2px", marginTop: "6px",
            background: `linear-gradient(90deg, transparent, ${G}, ${GS}, ${G}, transparent)`,
            opacity: 0.5, borderRadius: "1px",
          }} />
        </div>
      </div>

      {/* Bottom progress bar */}
      <motion.div
        key={activeSlide}
        style={{
          position: "absolute", bottom: "6px", left: "48px",
          height: "2px", background: G, borderRadius: "1px",
          transformOrigin: "left center",
        }}
        initial={{ width: "0%" }}
        animate={{ width: "calc(100% - 96px)" }}
        transition={{ duration: 6, ease: "linear" }}
      />
    </div>
  );
}
