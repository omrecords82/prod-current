import { motion, AnimatePresence } from "framer-motion";

interface Props {
  activeSlide: number;
  isDark: boolean;
}

type PanelId = "parish" | "certs" | "records" | "ocr" | "book";
const PANEL_ORDER: PanelId[] = ["parish", "certs", "records", "ocr", "book"];

// Heights per slide. Container = 685px, 4 gaps × 4px = 16px → panels sum to 669px.
const HEIGHTS: Record<number, Record<PanelId, number>> = {
  0: { parish: 134, certs: 134, records: 133, ocr: 134, book: 134 },
  1: { parish: 74,  certs: 78,  records: 84,  ocr: 359, book: 74  },
  2: { parish: 68,  certs: 74,  records: 399, ocr: 78,  book: 50  },
  3: { parish: 68,  certs: 399, records: 80,  ocr: 72,  book: 50  },
  4: { parish: 409, certs: 72,  records: 68,  ocr: 70,  book: 50  },
};

const ACTIVE: Record<number, PanelId | null> = {
  0: null, 1: "ocr", 2: "records", 3: "certs", 4: "parish",
};

const G = "#D4AF37";
const GS = "#E6C96A";
const IV = "#F6F1E8";
const PD = "#2D1B69";
const PK = "#14093A";
const PM = "#3E237D";

// ─── Orthodox three-bar cross ──────────────────────────────────────────────────
function Cross({ px = 14, color = G, opacity = 1 }: { px?: number; color?: string; opacity?: number }) {
  return (
    <svg width={Math.round(px * 0.7)} height={px} viewBox="0 0 12 20" fill="none" style={{ opacity, flexShrink: 0 }}>
      <line x1="3"  y1="4"  x2="9"  y2="4"  stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="6"  y1="1"  x2="6"  y2="18" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="0"  y1="9"  x2="12" y2="9"  stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="2.5" y1="14" x2="9.5" y2="17" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// ─── Cathedral silhouette background ──────────────────────────────────────────
function CathedralSilhouette({ isDark }: { isDark: boolean }) {
  const col = isDark ? IV : PD;
  return (
    <svg width="100%" height="100%" viewBox="0 0 560 685" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} preserveAspectRatio="xMidYMid slice">
      {/* Main central dome */}
      <ellipse cx="280" cy="200" rx="80" ry="95" fill={col} opacity="0.025" />
      {/* Drum below dome */}
      <rect x="220" y="285" width="120" height="60" fill={col} opacity="0.025" />
      {/* Central cross on main dome */}
      <g opacity="0.04" stroke={col} strokeWidth="3" strokeLinecap="round">
        <line x1="265" y1="105" x2="295" y2="105" />
        <line x1="280" y1="88" x2="280" y2="128" />
        <line x1="258" y1="115" x2="302" y2="115" />
        <line x1="263" y1="122" x2="297" y2="127" />
      </g>
      {/* Left small dome */}
      <ellipse cx="160" cy="310" rx="48" ry="58" fill={col} opacity="0.02" />
      <rect x="126" y="360" width="68" height="40" fill={col} opacity="0.02" />
      {/* Right small dome */}
      <ellipse cx="400" cy="310" rx="48" ry="58" fill={col} opacity="0.02" />
      <rect x="366" y="360" width="68" height="40" fill={col} opacity="0.02" />
      {/* Arched windows — central facade */}
      {[230, 265, 295, 330].map((x, i) => (
        <g key={i} opacity="0.025">
          <path d={`M ${x} 370 Q ${x + 15} 340 ${x + 30} 370 L ${x + 30} 400 L ${x} 400 Z`} fill={col} />
        </g>
      ))}
      {/* Ground line */}
      <line x1="60" y1="680" x2="500" y2="680" stroke={col} strokeWidth="1" opacity="0.06" />
      {/* Towers far left/right */}
      <rect x="60" y="430" width="55" height="250" fill={col} opacity="0.015" />
      <rect x="445" y="430" width="55" height="250" fill={col} opacity="0.015" />
      {/* Byzantine arch details */}
      <path d="M 60 430 Q 87 390 115 430" fill="none" stroke={col} strokeWidth="1.5" opacity="0.025" />
      <path d="M 445 430 Q 472 390 500 430" fill="none" stroke={col} strokeWidth="1.5" opacity="0.025" />
    </svg>
  );
}

// ─── Gold stream sidebar ───────────────────────────────────────────────────────
function GoldStream({ panelHeights, activePanel, isDark }: {
  panelHeights: Record<PanelId, number>;
  activePanel: PanelId | null;
  isDark: boolean;
}) {
  // Compute cumulative top positions for connector dots
  const tops: Record<PanelId, number> = {} as Record<PanelId, number>;
  let acc = 0;
  for (const id of PANEL_ORDER) {
    tops[id] = acc + panelHeights[id] / 2;
    acc += panelHeights[id] + 4;
  }

  return (
    <svg width="26" height="685" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="streamGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={G} stopOpacity="0.15" />
          <stop offset="30%" stopColor={G} stopOpacity="0.7" />
          <stop offset="70%" stopColor={GS} stopOpacity="0.8" />
          <stop offset="100%" stopColor={GS} stopOpacity="0.35" />
        </linearGradient>
        <filter id="dotGlow">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Main stream line */}
      <motion.line
        x1="13" y1="680" x2="13" y2="5"
        stroke="url(#streamGrad)" strokeWidth="2"
        strokeDasharray="8 5"
        animate={{ strokeDashoffset: [91, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />

      {/* Rising particles */}
      {[0, 1, 2, 3, 4].map(i => (
        <motion.circle
          key={i} cx="13" r={i % 2 ? 2.5 : 2}
          fill={G} opacity={0}
          animate={{ cy: [680, 5], opacity: [0, 0.95, 0.95, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, delay: i * 0.64, ease: "linear" }}
        />
      ))}

      {/* Connector dots per panel */}
      {PANEL_ORDER.map(id => {
        const isActive = activePanel === id;
        return (
          <motion.g key={id} animate={{ opacity: 1 }}>
            {isActive && (
              <motion.circle
                cx="13" cy={tops[id]} r="6"
                fill="none" stroke={G} strokeWidth="1"
                animate={{ r: [6, 11, 6], opacity: [0.8, 0, 0.8] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              />
            )}
            <motion.circle
              cx="13" cy={tops[id]}
              fill={G}
              filter={isActive ? "url(#dotGlow)" : undefined}
              animate={{ r: isActive ? [4.5, 6, 4.5] : [3, 3, 3] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Horizontal connector to panel */}
            <line x1="13" y1={tops[id]} x2="26" y2={tops[id]}
              stroke={G} strokeWidth={isActive ? 1.5 : 0.8}
              opacity={isActive ? 0.8 : 0.35}
              strokeDasharray={isActive ? undefined : "3 2"}
            />
          </motion.g>
        );
      })}

      {/* Source glow */}
      <motion.ellipse cx="13" cy="680" rx="10" ry="6"
        fill={G} opacity={0.2}
        animate={{ opacity: [0.2, 0.55, 0.2] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

// ─── Shared panel chrome ──────────────────────────────────────────────────────
function PanelShell({
  id, isActive, height, isDark, label, meta, accentColor, children,
}: {
  id: PanelId; isActive: boolean; height: number; isDark: boolean;
  label: string; meta: string; accentColor: string; children: React.ReactNode;
}) {
  const bg = isDark
    ? (isActive ? `rgba(45,27,105,0.75)` : `rgba(20,9,58,0.6)`)
    : (isActive ? `rgba(246,241,232,0.88)` : `rgba(246,241,232,0.55)`);
  const border = isActive ? `1.5px solid rgba(212,175,55,${isDark ? 0.55 : 0.6})`
    : `1px solid rgba(212,175,55,${isDark ? 0.15 : 0.2})`;
  const labelCol = isDark ? (isActive ? GS : "rgba(230,201,106,0.4)") : (isActive ? PD : "rgba(45,27,105,0.45)");
  const metaCol  = isDark ? (isActive ? "rgba(246,241,232,0.55)" : "rgba(246,241,232,0.2)") : (isActive ? "rgba(45,27,105,0.6)" : "rgba(45,27,105,0.3)");

  return (
    <motion.div
      animate={{ height }}
      transition={{ duration: 0.95, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        borderRadius: "10px",
        overflow: "hidden",
        background: bg,
        border,
        boxShadow: isActive
          ? `0 0 0 1px rgba(212,175,55,0.12), 0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(212,175,55,0.15)`
          : `0 2px 8px rgba(0,0,0,0.2)`,
        backdropFilter: "blur(12px)",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {/* Header strip — always visible */}
      <div style={{
        height: "36px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "0 12px",
        borderBottom: `1px solid rgba(212,175,55,${isActive ? 0.2 : 0.08})`,
        background: isDark
          ? `rgba(20,9,58,${isActive ? 0.4 : 0.3})`
          : `rgba(246,241,232,${isActive ? 0.6 : 0.4})`,
        flexShrink: 0,
      }}>
        <Cross px={isActive ? 13 : 10} color={isActive ? G : (isDark ? "rgba(212,175,55,0.4)" : "rgba(45,27,105,0.3)")} />
        <span style={{
          fontFamily: "Cinzel, serif",
          fontSize: "9.5px",
          letterSpacing: "1.8px",
          color: labelCol,
          fontWeight: isActive ? 700 : 400,
          transition: "color 0.4s",
        }}>{label}</span>
        <span style={{ flex: 1 }} />
        <span style={{
          fontFamily: "Crimson Pro, serif",
          fontSize: "9px",
          color: metaCol,
          letterSpacing: "0.3px",
          transition: "color 0.4s",
        }}>{meta}</span>
        {/* Active indicator */}
        {isActive && (
          <motion.div
            style={{ width: "6px", height: "6px", borderRadius: "50%", background: G, flexShrink: 0 }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>

      {/* Left accent bar */}
      <div style={{
        position: "absolute",
        left: 0, top: 0, bottom: 0, width: "3px",
        background: isActive ? `linear-gradient(180deg, ${G}, ${GS}, ${G})` : `rgba(212,175,55,0.15)`,
        transition: "background 0.5s",
      }} />

      {/* Content area */}
      <motion.div
        animate={{ opacity: height > 80 ? 1 : 0 }}
        transition={{ duration: 0.35, delay: height > 80 ? 0.25 : 0 }}
        style={{ height: "calc(100% - 36px)", overflow: "hidden" }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

// ─── Book Panel ───────────────────────────────────────────────────────────────
function BookPanel({ height, isActive, isDark }: { height: number; isActive: boolean; isDark: boolean }) {
  const expanded = height > 90;
  const textLight = isDark ? IV : PD;
  const textDim   = isDark ? "rgba(246,241,232,0.5)" : "rgba(45,27,105,0.5)";
  const cellBg    = isDark ? "rgba(246,241,232,0.04)" : "rgba(45,27,105,0.04)";
  const rowBorder = isDark ? "rgba(212,175,55,0.1)" : "rgba(45,27,105,0.1)";

  const records = [
    { no: "001", name: "Papadopoulos, Nikolaos", type: "Baptism", date: "12 Jan 1985" },
    { no: "002", name: "Stavros, Maria",          type: "Baptism", date: "03 Feb 1985" },
    { no: "003", name: "Nikolaou, Alexandros",    type: "Baptism", date: "17 Mar 1985" },
    { no: "004", name: "Christodoulou, Eleni",    type: "Baptism", date: "29 Apr 1985" },
  ];

  return (
    <PanelShell id="book" isActive={isActive} height={height} isDark={isDark}
      label="HISTORIC RECORDS" meta="Parish Register · 1920–2024" accentColor={G}>
      <div style={{ display: "flex", height: "100%", padding: "10px 12px", gap: "10px" }}>
        {/* Book cover */}
        <div style={{
          width: "80px", flexShrink: 0,
          background: isDark ? "rgba(20,9,58,0.8)" : "rgba(45,27,105,0.12)",
          border: `1px solid rgba(212,175,55,0.4)`,
          borderRadius: "6px",
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", gap: "6px", padding: "8px 6px",
          position: "relative", overflow: "hidden",
        }}>
          {/* Gold border inset */}
          <div style={{
            position: "absolute", inset: "4px",
            border: "1px solid rgba(212,175,55,0.3)", borderRadius: "3px", pointerEvents: "none",
          }} />
          <Cross px={24} color={G} opacity={0.9} />
          <div style={{
            fontFamily: "Cinzel, serif", fontSize: "6.5px", letterSpacing: "1px",
            color: isActive ? G : "rgba(212,175,55,0.5)",
            textAlign: "center", lineHeight: 1.5,
          }}>
            PARISH<br />REGISTER
          </div>
          <div style={{ fontFamily: "Crimson Pro, serif", fontSize: "7px", color: textDim, textAlign: "center" }}>
            1920–2024
          </div>
          {/* Spine */}
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: "5px",
            background: `linear-gradient(180deg, rgba(212,175,55,0.5), rgba(212,175,55,0.8), rgba(212,175,55,0.5))`,
          }} />
          {/* Page edges */}
          <div style={{
            position: "absolute", right: 0, top: "6px", bottom: "6px", width: "4px",
            background: isDark ? "rgba(246,241,232,0.3)" : "rgba(45,27,105,0.1)",
          }} />
        </div>

        {/* Open page */}
        <div style={{
          flex: 1,
          background: isDark ? "rgba(246,241,232,0.04)" : "rgba(255,255,255,0.5)",
          border: `1px solid rgba(212,175,55,0.2)`,
          borderRadius: "4px",
          overflow: "hidden",
          fontFamily: "Crimson Pro, serif",
        }}>
          {/* Page header */}
          <div style={{
            padding: "5px 8px 4px",
            borderBottom: `1px solid rgba(212,175,55,0.15)`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontFamily: "Cinzel, serif", fontSize: "7.5px", color: isActive ? G : "rgba(212,175,55,0.5)", letterSpacing: "1px" }}>
              BOOK OF BAPTISMS
            </span>
            <span style={{ fontFamily: "Cinzel, serif", fontSize: "7px", color: textDim }}>
              ST. GEORGE ORTHODOX CHURCH
            </span>
          </div>
          {/* Column headers */}
          <div style={{
            display: "grid", gridTemplateColumns: "28px 1fr 60px 60px",
            padding: "3px 8px",
            background: isDark ? "rgba(212,175,55,0.08)" : "rgba(212,175,55,0.08)",
            borderBottom: `1px solid ${rowBorder}`,
          }}>
            {["No.", "Full Name", "Sacrament", "Date"].map(h => (
              <span key={h} style={{ fontFamily: "Cinzel, serif", fontSize: "6.5px", color: G, letterSpacing: "0.8px" }}>{h}</span>
            ))}
          </div>
          {/* Rows */}
          {records.map((r, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "28px 1fr 60px 60px",
              padding: "3px 8px",
              borderBottom: `1px solid ${rowBorder}`,
              background: i % 2 ? cellBg : "transparent",
            }}>
              <span style={{ fontSize: "7px", color: textDim }}>{r.no}</span>
              <span style={{ fontSize: "7.5px", color: textLight, fontStyle: "italic" }}>{r.name}</span>
              <span style={{ fontSize: "7px", color: isActive ? G : textDim }}>{r.type}</span>
              <span style={{ fontSize: "7px", color: textDim }}>{r.date}</span>
            </div>
          ))}
          {/* Decorative footer */}
          <div style={{ padding: "4px 8px", display: "flex", justifyContent: "flex-end" }}>
            <span style={{ fontSize: "6.5px", color: textDim, fontStyle: "italic" }}>Continued overleaf →</span>
          </div>
        </div>
      </div>
    </PanelShell>
  );
}

// ─── OCR Panel ────────────────────────────────────────────────────────────────
const OCR_FIELDS = [
  { label: "Full Name",  value: "Nikolaou, Alexandros", conf: 98, color: "rgba(88,180,255,0.8)" },
  { label: "Date",       value: "17 March 1985",         conf: 97, color: "rgba(88,200,100,0.8)" },
  { label: "Parish",     value: "St. George Orth. Ch.",  conf: 95, color: "rgba(212,175,55,0.8)" },
  { label: "Godparent",  value: "Stavros, Michael",      conf: 89, color: "rgba(200,130,255,0.8)" },
  { label: "Priest",     value: "Fr. Konstantinos D.",   conf: 92, color: "rgba(255,160,80,0.8)"  },
];

function OcrPanel({ height, isActive, isDark }: { height: number; isActive: boolean; isDark: boolean }) {
  const textLight = isDark ? IV : PD;
  const textDim   = isDark ? "rgba(246,241,232,0.45)" : "rgba(45,27,105,0.45)";
  const surfaceBg = isDark ? "rgba(20,9,58,0.5)" : "rgba(255,255,255,0.45)";

  return (
    <PanelShell id="ocr" isActive={isActive} height={height} isDark={isDark}
      label="OCR STUDIO" meta="Baptism_Register_1985.pdf · 94% Accuracy" accentColor={G}>
      <div style={{ padding: "8px 12px", height: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: "6px" }}>
          {["Source", "Fields", "Review", "History"].map((t, i) => (
            <div key={t} style={{
              fontFamily: "Cinzel, serif", fontSize: "8px", letterSpacing: "0.8px",
              padding: "3px 8px", borderRadius: "4px",
              background: i === 1
                ? (isDark ? "rgba(212,175,55,0.2)" : "rgba(212,175,55,0.15)")
                : "transparent",
              color: i === 1 ? G : textDim,
              border: i === 1 ? `1px solid rgba(212,175,55,0.35)` : "1px solid transparent",
              cursor: "default",
            }}>{t}</div>
          ))}
          {/* Accuracy badge */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "rgba(88,200,100,0.8)" }} />
            <span style={{ fontFamily: "Cinzel, serif", fontSize: "8px", color: "rgba(88,200,100,0.9)", letterSpacing: "0.5px" }}>94% ACCURACY</span>
          </div>
        </div>

        {/* Main area */}
        <div style={{ flex: 1, display: "flex", gap: "8px", overflow: "hidden" }}>
          {/* Scanned page mock */}
          <div style={{
            flex: "0 0 52%",
            background: isDark ? "rgba(246,241,232,0.06)" : "rgba(255,255,252,0.7)",
            border: `1px solid rgba(212,175,55,0.2)`,
            borderRadius: "6px",
            overflow: "hidden",
            position: "relative",
          }}>
            {/* Page texture lines */}
            {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => (
              <div key={i} style={{
                position: "absolute", left: "8px", right: "8px",
                top: `${14 + i * 14}px`, height: "1px",
                background: isDark ? "rgba(246,241,232,0.12)" : "rgba(45,27,105,0.08)",
              }} />
            ))}
            {/* Field highlight boxes */}
            {[
              { top: 12,  left: 8,  width: "75%", height: 12, color: "rgba(88,180,255,0.25)"  },
              { top: 40,  left: 8,  width: "45%", height: 12, color: "rgba(88,200,100,0.25)"  },
              { top: 68,  left: 8,  width: "65%", height: 12, color: "rgba(212,175,55,0.22)"  },
              { top: 96,  left: 8,  width: "55%", height: 12, color: "rgba(200,130,255,0.22)" },
              { top: 124, left: 8,  width: "60%", height: 12, color: "rgba(255,160,80,0.22)"  },
            ].map((box, i) => (
              <motion.div
                key={i}
                style={{
                  position: "absolute",
                  top: box.top, left: box.left, width: box.width, height: box.height,
                  background: box.color,
                  border: `1px solid ${box.color.replace("0.2", "0.7").replace("0.25", "0.7").replace("0.22", "0.7")}`,
                  borderRadius: "2px",
                }}
                animate={isActive ? { opacity: [0.6, 1, 0.6] } : {}}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
              />
            ))}
            {/* Scan beam */}
            {isActive && (
              <motion.div
                style={{
                  position: "absolute", left: 0, right: 0, height: "3px",
                  background: `linear-gradient(90deg, transparent, rgba(212,175,55,0.8), transparent)`,
                  boxShadow: "0 0 8px rgba(212,175,55,0.6)",
                }}
                animate={{ top: ["8px", "155px", "8px"] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
            {/* Page label */}
            <div style={{
              position: "absolute", bottom: "5px", left: "50%", transform: "translateX(-50%)",
              fontFamily: "Cinzel, serif", fontSize: "6.5px", color: textDim, letterSpacing: "0.5px",
              whiteSpace: "nowrap",
            }}>Page 14 of 47</div>
          </div>

          {/* Extracted fields sidebar */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px", overflow: "hidden" }}>
            <div style={{
              fontFamily: "Cinzel, serif", fontSize: "7.5px", letterSpacing: "1px",
              color: G, paddingBottom: "4px",
              borderBottom: "1px solid rgba(212,175,55,0.2)",
            }}>FIELD EXTRACTION</div>
            {OCR_FIELDS.map((f, i) => (
              <motion.div
                key={i}
                style={{
                  background: isDark ? "rgba(20,9,58,0.5)" : "rgba(246,241,232,0.6)",
                  border: `1px solid ${f.color.replace("0.8", "0.3")}`,
                  borderRadius: "4px",
                  padding: "4px 6px",
                }}
                initial={isActive ? { opacity: 0, x: 10 } : {}}
                animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0.6 }}
                transition={{ duration: 0.4, delay: isActive ? 0.2 + i * 0.1 : 0 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "Cinzel, serif", fontSize: "7px", color: f.color, letterSpacing: "0.5px" }}>{f.label}</span>
                  <span style={{ fontFamily: "Cinzel, serif", fontSize: "7px", color: f.color }}>{f.conf}%</span>
                </div>
                <div style={{ fontFamily: "Crimson Pro, serif", fontSize: "9px", color: textLight, marginTop: "1px" }}>{f.value}</div>
                {/* Confidence bar */}
                <div style={{ height: "2px", background: "rgba(212,175,55,0.15)", borderRadius: "1px", marginTop: "3px", overflow: "hidden" }}>
                  <motion.div
                    style={{ height: "100%", background: f.color, borderRadius: "1px" }}
                    initial={{ width: "0%" }}
                    animate={{ width: isActive ? `${f.conf}%` : "0%" }}
                    transition={{ duration: 0.6, delay: 0.4 + i * 0.1 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
            <span style={{ fontFamily: "Cinzel, serif", fontSize: "7.5px", color: textDim, letterSpacing: "0.5px" }}>PROCESSING</span>
            <span style={{ fontFamily: "Cinzel, serif", fontSize: "7.5px", color: G }}>23 of 47 records</span>
          </div>
          <div style={{ height: "4px", background: "rgba(212,175,55,0.15)", borderRadius: "2px", overflow: "hidden" }}>
            <motion.div
              style={{ height: "100%", background: `linear-gradient(90deg, ${G}, ${GS})`, borderRadius: "2px" }}
              animate={{ width: isActive ? "49%" : "0%" }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
          </div>
        </div>
      </div>
    </PanelShell>
  );
}

// ─── Records Panel ────────────────────────────────────────────────────────────
const REC_ROWS = [
  { id: "OMR-24-00847", name: "Papadopoulos, Nikolaos", type: "Baptism",  date: "12 Jan 1985", parish: "St. George",  status: "Verified" },
  { id: "OMR-24-00848", name: "Stavros, Maria",          type: "Marriage", date: "28 Jun 1991", parish: "Holy Trinity", status: "Verified" },
  { id: "OMR-24-00849", name: "Nikolaou, Alexandros",    type: "Baptism",  date: "17 Mar 1985", parish: "St. George",  status: "Review"   },
  { id: "OMR-24-00850", name: "Christodoulou, Eleni",    type: "Funeral",  date: "03 Dec 2003", parish: "St. Nicholas", status: "Verified" },
  { id: "OMR-24-00851", name: "Georgiou, Dimitrios",     type: "Baptism",  date: "22 Aug 1978", parish: "Holy Trinity", status: "Pending"  },
];
const STATUS_COLORS: Record<string, string> = {
  Verified: "rgba(88,200,100,0.85)", Pending: "rgba(212,175,55,0.85)", Review: "rgba(88,160,255,0.85)",
};

function RecordsPanel({ height, isActive, isDark }: { height: number; isActive: boolean; isDark: boolean }) {
  const textLight = isDark ? IV : PD;
  const textDim   = isDark ? "rgba(246,241,232,0.45)" : "rgba(45,27,105,0.45)";
  const rowBorder = isDark ? "rgba(212,175,55,0.08)" : "rgba(45,27,105,0.08)";
  const headerBg  = isDark ? "rgba(212,175,55,0.1)" : "rgba(212,175,55,0.1)";
  const rowHover  = isDark ? "rgba(246,241,232,0.04)" : "rgba(45,27,105,0.03)";

  return (
    <PanelShell id="records" isActive={isActive} height={height} isDark={isDark}
      label="RECORD MANAGEMENT" meta="12,847 records" accentColor={G}>
      <div style={{ padding: "8px 12px", height: "100%", display: "flex", flexDirection: "column", gap: "6px" }}>
        {/* Search bar + filter row */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <div style={{
            flex: 1, height: "26px",
            background: isDark ? "rgba(20,9,58,0.5)" : "rgba(246,241,232,0.6)",
            border: `1px solid rgba(212,175,55,${isActive ? 0.3 : 0.15})`,
            borderRadius: "5px", display: "flex", alignItems: "center", padding: "0 8px", gap: "6px",
          }}>
            {/* Search icon */}
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
              <circle cx="5" cy="5" r="4" stroke={G} strokeWidth="1.2" opacity="0.7" />
              <line x1="8" y1="8" x2="11" y2="11" stroke={G} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
            </svg>
            <span style={{ fontFamily: "Crimson Pro, serif", fontSize: "9px", color: textDim }}>Search records…</span>
            {isActive && (
              <motion.span
                style={{ width: "1px", height: "12px", background: G, marginLeft: "1px" }}
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </div>
          {/* Filter chips */}
          {["All", "Baptism", "Marriage", "Funeral", "Pending"].map((f, i) => (
            <div key={f} style={{
              fontFamily: "Cinzel, serif", fontSize: "7px", letterSpacing: "0.5px",
              padding: "4px 7px", borderRadius: "4px",
              background: i === 0 ? (isDark ? "rgba(212,175,55,0.18)" : "rgba(212,175,55,0.15)") : "transparent",
              color: i === 0 ? G : textDim,
              border: i === 0 ? `1px solid rgba(212,175,55,0.35)` : `1px solid rgba(212,175,55,0.1)`,
              cursor: "default", whiteSpace: "nowrap",
            }}>{f}</div>
          ))}
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflow: "hidden", borderRadius: "6px", border: `1px solid rgba(212,175,55,0.12)` }}>
          {/* Header */}
          <div style={{
            display: "grid", gridTemplateColumns: "90px 1fr 60px 70px 72px 56px",
            padding: "4px 8px", background: headerBg,
            borderBottom: `1px solid rgba(212,175,55,0.15)`,
          }}>
            {["Record ID", "Name", "Type", "Date", "Parish", "Status"].map(h => (
              <span key={h} style={{ fontFamily: "Cinzel, serif", fontSize: "7px", color: G, letterSpacing: "0.6px" }}>{h}</span>
            ))}
          </div>
          {/* Rows */}
          {REC_ROWS.map((r, i) => (
            <motion.div
              key={i}
              style={{
                display: "grid", gridTemplateColumns: "90px 1fr 60px 70px 72px 56px",
                padding: "5px 8px",
                borderBottom: `1px solid ${rowBorder}`,
                background: isActive && i === 2 ? (isDark ? "rgba(88,160,255,0.06)" : "rgba(88,160,255,0.04)") : "transparent",
              }}
              animate={isActive ? { opacity: 1 } : { opacity: 0.6 }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
            >
              <span style={{ fontFamily: "Crimson Pro, serif", fontSize: "8px", color: G, opacity: 0.8 }}>{r.id}</span>
              <span style={{ fontFamily: "Crimson Pro, serif", fontSize: "9px", color: textLight }}>{r.name}</span>
              <span style={{ fontFamily: "Crimson Pro, serif", fontSize: "8px", color: textDim }}>{r.type}</span>
              <span style={{ fontFamily: "Crimson Pro, serif", fontSize: "8px", color: textDim }}>{r.date}</span>
              <span style={{ fontFamily: "Crimson Pro, serif", fontSize: "8px", color: textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.parish}</span>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <motion.div
                  style={{ width: "5px", height: "5px", borderRadius: "50%", background: STATUS_COLORS[r.status], flexShrink: 0 }}
                  animate={isActive && r.status === "Review" ? { opacity: [1, 0.3, 1] } : {}}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
                <span style={{ fontFamily: "Cinzel, serif", fontSize: "7px", color: STATUS_COLORS[r.status] }}>{r.status}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderTop: `1px solid rgba(212,175,55,0.1)`, paddingTop: "5px",
        }}>
          <span style={{ fontFamily: "Crimson Pro, serif", fontSize: "8px", color: textDim, fontStyle: "italic" }}>
            Showing 1–25 of 12,847 records
          </span>
          <div style={{ display: "flex", gap: "4px" }}>
            {["←", "1", "2", "3", "→"].map((p, i) => (
              <div key={i} style={{
                width: "18px", height: "18px", borderRadius: "3px",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: i === 1 ? "rgba(212,175,55,0.2)" : "transparent",
                border: `1px solid rgba(212,175,55,${i === 1 ? 0.4 : 0.15})`,
                fontFamily: "Cinzel, serif", fontSize: "8px",
                color: i === 1 ? G : textDim,
              }}>{p}</div>
            ))}
          </div>
        </div>
      </div>
    </PanelShell>
  );
}

// ─── Certificate Panel ────────────────────────────────────────────────────────
function CertsPanel({ height, isActive, isDark }: { height: number; isActive: boolean; isDark: boolean }) {
  const textLight = isDark ? IV : PD;
  const textDim   = isDark ? "rgba(246,241,232,0.5)" : "rgba(45,27,105,0.5)";

  return (
    <PanelShell id="certs" isActive={isActive} height={height} isDark={isDark}
      label="CERTIFICATES & REPORTS" meta="Baptism · Marriage · Funeral" accentColor={G}>
      <div style={{ padding: "8px 12px", height: "100%", display: "flex", gap: "10px", overflow: "hidden" }}>
        {/* Certificate preview */}
        <div style={{
          flex: "0 0 58%",
          background: isDark ? "rgba(246,241,232,0.06)" : "rgba(255,255,252,0.75)",
          border: `1.5px solid rgba(212,175,55,0.35)`,
          borderRadius: "6px",
          padding: "12px 14px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "7px",
          position: "relative", overflow: "hidden",
        }}>
          {/* Decorative corner ornaments */}
          {[
            { top: 4, left: 4, rotate: 0 }, { top: 4, right: 4, rotate: 90 },
            { bottom: 4, left: 4, rotate: 270 }, { bottom: 4, right: 4, rotate: 180 },
          ].map((pos, i) => (
            <svg key={i} width="12" height="12" viewBox="0 0 12 12" style={{ position: "absolute", ...pos as any, opacity: 0.5 }}>
              <path d="M 0 0 L 6 0 Q 12 0 12 6" fill="none" stroke={G} strokeWidth="1" />
            </svg>
          ))}

          {/* Outer border */}
          <div style={{
            position: "absolute", inset: "7px",
            border: `0.5px solid rgba(212,175,55,0.25)`,
            borderRadius: "3px", pointerEvents: "none",
          }} />

          {/* Church + cross header */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <Cross px={22} color={G} opacity={0.9} />
            <div style={{ fontFamily: "Cinzel, serif", fontSize: "7.5px", color: textDim, letterSpacing: "1.5px", textAlign: "center" }}>
              ST. GEORGE ORTHODOX CHURCH
            </div>
          </div>

          {/* Title */}
          <div style={{
            fontFamily: "Cinzel, serif", fontSize: "11px", fontWeight: 700,
            color: isActive ? G : "rgba(212,175,55,0.6)",
            letterSpacing: "1.5px", textAlign: "center", lineHeight: 1.3,
          }}>
            CERTIFICATE<br />OF BAPTISM
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%" }}>
            <div style={{ flex: 1, height: "0.5px", background: G, opacity: 0.4 }} />
            <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: G, opacity: 0.6 }} />
            <div style={{ flex: 1, height: "0.5px", background: G, opacity: 0.4 }} />
          </div>

          {/* Body text */}
          <div style={{ textAlign: "center", fontFamily: "Crimson Pro, serif" }}>
            <div style={{ fontSize: "8px", color: textDim, fontStyle: "italic", lineHeight: 1.6 }}>
              This is to certify that
            </div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: textLight, lineHeight: 1.4, fontStyle: "italic" }}>
              Nikolaou, Alexandros
            </div>
            <div style={{ fontSize: "8px", color: textDim, fontStyle: "italic", lineHeight: 1.6 }}>
              was received into the Holy Orthodox Church<br />
              through the Sacred Sacrament of Baptism<br />
              on the <strong style={{ color: textLight }}>17th day of March, 1985</strong>
            </div>
          </div>

          {/* Seal + signature row */}
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "flex-end", marginTop: "auto" }}>
            {/* Church seal */}
            <motion.div
              style={{
                width: "36px", height: "36px", borderRadius: "50%",
                border: `1.5px solid rgba(212,175,55,0.6)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isDark ? "rgba(20,9,58,0.5)" : "rgba(246,241,232,0.8)",
                position: "relative",
              }}
              animate={isActive ? { boxShadow: ["0 0 0px rgba(212,175,55,0)", "0 0 10px rgba(212,175,55,0.4)", "0 0 0px rgba(212,175,55,0)"] } : {}}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <Cross px={14} color={G} opacity={0.8} />
              <div style={{
                position: "absolute", inset: "3px", borderRadius: "50%",
                border: "0.5px solid rgba(212,175,55,0.3)",
              }} />
            </motion.div>
            {/* Signature area */}
            <div style={{ textAlign: "right" }}>
              <div style={{ width: "70px", height: "0.5px", background: "rgba(212,175,55,0.4)", marginBottom: "3px" }} />
              <div style={{ fontFamily: "Crimson Pro, serif", fontSize: "7.5px", color: textDim, fontStyle: "italic" }}>Fr. Konstantinos D.</div>
              <div style={{ fontFamily: "Crimson Pro, serif", fontSize: "7px", color: textDim, opacity: 0.7 }}>Presiding Priest</div>
            </div>
          </div>
        </div>

        {/* Right: options panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
          {/* Template selector */}
          <div>
            <div style={{ fontFamily: "Cinzel, serif", fontSize: "7.5px", color: G, letterSpacing: "1px", marginBottom: "5px" }}>
              DOCUMENT TYPE
            </div>
            {["Baptism", "Marriage", "Funeral"].map((t, i) => (
              <div key={t} style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "5px 8px", marginBottom: "3px",
                background: i === 0 ? (isDark ? "rgba(212,175,55,0.15)" : "rgba(212,175,55,0.12)") : "transparent",
                border: `1px solid rgba(212,175,55,${i === 0 ? 0.35 : 0.1})`,
                borderRadius: "4px",
              }}>
                <div style={{
                  width: "10px", height: "10px", borderRadius: "50%",
                  border: `1.5px solid rgba(212,175,55,${i === 0 ? 0.8 : 0.3})`,
                  background: i === 0 ? G : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {i === 0 && <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: PK }} />}
                </div>
                <span style={{ fontFamily: "Crimson Pro, serif", fontSize: "9px", color: i === 0 ? textLight : "rgba(212,175,55,0.4)" }}>{t}</span>
              </div>
            ))}
          </div>

          {/* Verified badge */}
          <div style={{
            padding: "6px 8px",
            background: "rgba(88,200,100,0.1)",
            border: "1px solid rgba(88,200,100,0.3)",
            borderRadius: "4px",
            display: "flex", alignItems: "center", gap: "5px",
          }}>
            <motion.div
              style={{ width: "6px", height: "6px", borderRadius: "50%", background: "rgba(88,200,100,0.9)", flexShrink: 0 }}
              animate={isActive ? { opacity: [1, 0.3, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span style={{ fontFamily: "Cinzel, serif", fontSize: "7.5px", color: "rgba(88,200,100,0.9)", letterSpacing: "0.5px" }}>
              VERIFIED SOURCE RECORD
            </span>
          </div>

          {/* Generate button */}
          <motion.div
            style={{
              marginTop: "auto",
              background: `linear-gradient(135deg, ${G}, ${GS})`,
              borderRadius: "5px",
              padding: "8px 10px",
              textAlign: "center",
              cursor: "default",
              boxShadow: isActive ? "0 4px 16px rgba(212,175,55,0.35)" : "none",
            }}
            animate={isActive ? { boxShadow: ["0 4px 16px rgba(212,175,55,0.25)", "0 4px 24px rgba(212,175,55,0.5)", "0 4px 16px rgba(212,175,55,0.25)"] } : {}}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            <span style={{ fontFamily: "Cinzel, serif", fontSize: "8.5px", fontWeight: 700, letterSpacing: "1px", color: PK }}>
              GENERATE DOCUMENT
            </span>
          </motion.div>

          {/* Format options */}
          <div style={{ display: "flex", gap: "4px" }}>
            {["PDF", "Print", "Archive"].map((f, i) => (
              <div key={f} style={{
                flex: 1, padding: "4px 0", textAlign: "center",
                border: `1px solid rgba(212,175,55,${i === 0 ? 0.4 : 0.15})`,
                borderRadius: "3px",
                fontFamily: "Cinzel, serif", fontSize: "7px", letterSpacing: "0.5px",
                color: i === 0 ? G : "rgba(212,175,55,0.35)",
                background: i === 0 ? "rgba(212,175,55,0.1)" : "transparent",
              }}>{f}</div>
            ))}
          </div>
        </div>
      </div>
    </PanelShell>
  );
}

// ─── Parish Operations Panel ──────────────────────────────────────────────────
const METRICS = [
  { label: "PARISHES",    value: "48",    sub: "+3 this year" },
  { label: "RECORDS",     value: "12,847", sub: "All sacraments" },
  { label: "CERTIFICATES", value: "1,203",  sub: "Issued 2024" },
  { label: "USERS",       value: "214",    sub: "Staff & clergy" },
];
const BAR_DATA = [52, 38, 65, 43, 70, 58];
const BAR_MONTHS = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"];

const ACTIVITY = [
  { action: "Certificate issued",       who: "St. George",   time: "2m ago",  type: "cert"    },
  { action: "New parish enrolled",      who: "St. Nicholas", time: "1h ago",  type: "parish"  },
  { action: "Records digitization done",who: "Holy Trinity", time: "3h ago",  type: "ocr"     },
  { action: "User role updated",         who: "Admin",        time: "5h ago",  type: "user"    },
];
const ACTIVITY_COLORS: Record<string, string> = {
  cert: G, parish: "rgba(88,200,100,0.8)", ocr: "rgba(88,160,255,0.8)", user: "rgba(200,130,255,0.8)",
};

function ParishPanel({ height, isActive, isDark }: { height: number; isActive: boolean; isDark: boolean }) {
  const textLight = isDark ? IV : PD;
  const textDim   = isDark ? "rgba(246,241,232,0.45)" : "rgba(45,27,105,0.45)";
  const cardBg    = isDark ? "rgba(20,9,58,0.55)" : "rgba(255,255,255,0.5)";
  const maxBar    = Math.max(...BAR_DATA);

  return (
    <PanelShell id="parish" isActive={isActive} height={height} isDark={isDark}
      label="PARISH OPERATIONS" meta="48 parishes active" accentColor={G}>
      <div style={{ padding: "8px 12px", height: "100%", display: "flex", flexDirection: "column", gap: "8px", overflow: "hidden" }}>

        {/* Metrics row */}
        <div style={{ display: "flex", gap: "6px" }}>
          {METRICS.map((m, i) => (
            <motion.div
              key={i}
              style={{
                flex: 1,
                background: cardBg,
                border: `1px solid rgba(212,175,55,${i === 0 && isActive ? 0.4 : 0.12})`,
                borderRadius: "6px",
                padding: "7px 8px",
                overflow: "hidden",
              }}
              initial={isActive ? { opacity: 0, y: 8 } : {}}
              animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0.7 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
            >
              <div style={{ fontFamily: "Cinzel, serif", fontSize: "7px", color: G, letterSpacing: "0.5px", marginBottom: "3px" }}>
                {m.label}
              </div>
              <div style={{ fontFamily: "Cinzel, serif", fontSize: "13px", fontWeight: 700, color: textLight, lineHeight: 1 }}>
                {m.value}
              </div>
              <div style={{ fontFamily: "Crimson Pro, serif", fontSize: "7.5px", color: textDim, marginTop: "2px" }}>
                {m.sub}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Chart + activity row */}
        <div style={{ flex: 1, display: "flex", gap: "8px", overflow: "hidden" }}>
          {/* Bar chart */}
          <div style={{
            flex: "0 0 45%",
            background: cardBg,
            border: `1px solid rgba(212,175,55,0.12)`,
            borderRadius: "6px",
            padding: "8px 8px 6px",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{ fontFamily: "Cinzel, serif", fontSize: "7.5px", color: G, letterSpacing: "0.8px", marginBottom: "6px" }}>
              RECORD ACTIVITY
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: "4px", padding: "0 2px" }}>
              {BAR_DATA.map((val, i) => {
                const isMax = val === maxBar;
                const barH = Math.round((val / maxBar) * 80);
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                    <motion.div
                      style={{
                        width: "100%",
                        background: isMax
                          ? `linear-gradient(180deg, ${GS}, ${G})`
                          : (isDark ? "rgba(62,35,125,0.9)" : "rgba(45,27,105,0.2)"),
                        borderRadius: "3px 3px 0 0",
                        border: isMax ? `1px solid rgba(212,175,55,0.5)` : "none",
                        position: "relative",
                      }}
                      initial={{ height: 0 }}
                      animate={{ height: isActive ? barH : Math.round(barH * 0.3) }}
                      transition={{ duration: 0.6, delay: 0.15 + i * 0.07, ease: [0.34, 1.4, 0.64, 1] }}
                    >
                      {isMax && isActive && (
                        <motion.div
                          style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: GS, borderRadius: "3px 3px 0 0" }}
                          animate={{ opacity: [0.7, 1, 0.7] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      )}
                    </motion.div>
                    <span style={{ fontFamily: "Cinzel, serif", fontSize: "6px", color: isMax && isActive ? G : textDim }}>
                      {BAR_MONTHS[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity feed */}
          <div style={{
            flex: 1,
            background: cardBg,
            border: `1px solid rgba(212,175,55,0.12)`,
            borderRadius: "6px",
            padding: "8px",
            overflow: "hidden",
          }}>
            <div style={{ fontFamily: "Cinzel, serif", fontSize: "7.5px", color: G, letterSpacing: "0.8px", marginBottom: "6px" }}>
              RECENT ACTIVITY
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {ACTIVITY.map((a, i) => (
                <motion.div
                  key={i}
                  style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}
                  initial={isActive ? { opacity: 0, x: 8 } : {}}
                  animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0.6 }}
                  transition={{ duration: 0.35, delay: 0.3 + i * 0.08 }}
                >
                  <motion.div
                    style={{ width: "6px", height: "6px", borderRadius: "50%", background: ACTIVITY_COLORS[a.type], marginTop: "2px", flexShrink: 0 }}
                    animate={isActive && i === 0 ? { opacity: [1, 0.3, 1] } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "Crimson Pro, serif", fontSize: "8.5px", color: textLight, lineHeight: 1.3 }}>{a.action}</div>
                    <div style={{ fontFamily: "Crimson Pro, serif", fontSize: "7.5px", color: textDim }}>{a.who} · {a.time}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Multi-parish selector */}
            <div style={{
              marginTop: "8px", paddingTop: "6px",
              borderTop: `1px solid rgba(212,175,55,0.1)`,
              display: "flex", alignItems: "center", gap: "5px",
            }}>
              <span style={{ fontFamily: "Cinzel, serif", fontSize: "7px", color: G, letterSpacing: "0.5px" }}>VIEWING:</span>
              <span style={{
                fontFamily: "Crimson Pro, serif", fontSize: "8px", color: textLight,
                background: isDark ? "rgba(212,175,55,0.12)" : "rgba(212,175,55,0.1)",
                border: "1px solid rgba(212,175,55,0.25)",
                borderRadius: "3px", padding: "2px 6px",
              }}>All 48 Parishes ▾</span>
            </div>
          </div>
        </div>

        {/* User management strip */}
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          background: isDark ? "rgba(20,9,58,0.4)" : "rgba(246,241,232,0.5)",
          border: `1px solid rgba(212,175,55,0.1)`,
          borderRadius: "5px", padding: "5px 10px",
        }}>
          <span style={{ fontFamily: "Cinzel, serif", fontSize: "7.5px", color: G, letterSpacing: "0.5px" }}>USERS</span>
          <div style={{ display: "flex", gap: "-4px" }}>
            {["rgba(212,175,55,0.8)", "rgba(88,200,100,0.7)", "rgba(88,160,255,0.7)", "rgba(200,130,255,0.7)", "rgba(255,160,80,0.7)"].map((c, i) => (
              <div key={i} style={{
                width: "18px", height: "18px", borderRadius: "50%",
                background: c, border: `1.5px solid ${isDark ? PK : IV}`,
                marginLeft: i > 0 ? "-6px" : 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "Cinzel, serif", fontSize: "7px", color: PK, fontWeight: 700,
              }}>
                {["A", "B", "C", "D", "+"][i]}
              </div>
            ))}
          </div>
          <span style={{ fontFamily: "Crimson Pro, serif", fontSize: "8px", color: textDim }}>214 active · 18 roles</span>
          <div style={{ marginLeft: "auto" }}>
            <div style={{
              fontFamily: "Cinzel, serif", fontSize: "7.5px", color: G,
              background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)",
              borderRadius: "3px", padding: "3px 8px", cursor: "default",
            }}>MANAGE USERS</div>
          </div>
        </div>
      </div>
    </PanelShell>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function ProductEcosystem({ activeSlide, isDark }: Props) {
  const heights = HEIGHTS[activeSlide] ?? HEIGHTS[0];
  const activePanel = ACTIVE[activeSlide] ?? null;

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "560px", height: "685px", display: "flex", gap: "6px" }}>
      {/* Cathedral background */}
      <CathedralSilhouette isDark={isDark} />

      {/* Gold stream */}
      <GoldStream panelHeights={heights} activePanel={activePanel} isDark={isDark} />

      {/* Stacked panels */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px", overflow: "hidden" }}>
        <ParishPanel height={heights.parish} isActive={activePanel === "parish" || activePanel === null} isDark={isDark} />
        <CertsPanel  height={heights.certs}  isActive={activePanel === "certs"  || activePanel === null} isDark={isDark} />
        <RecordsPanel height={heights.records} isActive={activePanel === "records" || activePanel === null} isDark={isDark} />
        <OcrPanel    height={heights.ocr}    isActive={activePanel === "ocr"    || activePanel === null} isDark={isDark} />
        <BookPanel   height={heights.book}   isActive={activePanel === "book"   || activePanel === null} isDark={isDark} />
      </div>
    </div>
  );
}
