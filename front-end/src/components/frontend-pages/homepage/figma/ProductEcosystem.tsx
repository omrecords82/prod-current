import { motion } from "framer-motion";
import type { Locale } from "./heroCarouselLocales";

interface Props {
  activeSlide: number;
  isDark: boolean;
  locale: Locale;
}

type PanelId = "parish" | "certs" | "records" | "ocr" | "book";
const PANEL_ORDER: PanelId[] = ["parish", "certs", "records", "ocr", "book"];

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

const G  = "#D4AF37";
const GS = "#E6C96A";
const IV = "#F6F1E8";
const PD = "#2D1B69";
const PK = "#14093A";

// ─── Orthodox cross ────────────────────────────────────────────────────────────
function Cross({ px = 14, color = G, opacity = 1 }: { px?: number; color?: string; opacity?: number }) {
  return (
    <svg width={Math.round(px * 0.7)} height={px} viewBox="0 0 12 20" fill="none" style={{ opacity, flexShrink: 0 }}>
      <line x1="3"   y1="4"  x2="9"   y2="4"  stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="6"   y1="1"  x2="6"   y2="18" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="0"   y1="9"  x2="12"  y2="9"  stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="2.5" y1="14" x2="9.5" y2="17" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// ─── Cathedral silhouette ──────────────────────────────────────────────────────
function CathedralSilhouette({ isDark }: { isDark: boolean }) {
  const col = isDark ? IV : PD;
  return (
    <svg width="100%" height="100%" viewBox="0 0 560 685"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      preserveAspectRatio="xMidYMid slice">
      <ellipse cx="280" cy="200" rx="80" ry="95" fill={col} opacity="0.025" />
      <rect x="220" y="285" width="120" height="60" fill={col} opacity="0.025" />
      <g opacity="0.04" stroke={col} strokeWidth="3" strokeLinecap="round">
        <line x1="265" y1="105" x2="295" y2="105" />
        <line x1="280" y1="88"  x2="280" y2="128" />
        <line x1="258" y1="115" x2="302" y2="115" />
        <line x1="263" y1="122" x2="297" y2="127" />
      </g>
      <ellipse cx="160" cy="310" rx="48" ry="58" fill={col} opacity="0.02" />
      <rect x="126" y="360" width="68" height="40" fill={col} opacity="0.02" />
      <ellipse cx="400" cy="310" rx="48" ry="58" fill={col} opacity="0.02" />
      <rect x="366" y="360" width="68" height="40" fill={col} opacity="0.02" />
      {[230, 265, 295, 330].map((x, i) => (
        <g key={i} opacity="0.025">
          <path d={`M ${x} 370 Q ${x+15} 340 ${x+30} 370 L ${x+30} 400 L ${x} 400 Z`} fill={col} />
        </g>
      ))}
      <line x1="60" y1="680" x2="500" y2="680" stroke={col} strokeWidth="1" opacity="0.06" />
      <rect x="60" y="430" width="55" height="250" fill={col} opacity="0.015" />
      <rect x="445" y="430" width="55" height="250" fill={col} opacity="0.015" />
      <path d="M 60 430 Q 87 390 115 430" fill="none" stroke={col} strokeWidth="1.5" opacity="0.025" />
      <path d="M 445 430 Q 472 390 500 430" fill="none" stroke={col} strokeWidth="1.5" opacity="0.025" />
    </svg>
  );
}

// ─── Gold stream ───────────────────────────────────────────────────────────────
function GoldStream({ panelHeights, activePanel }: {
  panelHeights: Record<PanelId, number>;
  activePanel: PanelId | null;
}) {
  const tops: Record<PanelId, number> = {} as Record<PanelId, number>;
  let acc = 0;
  for (const id of PANEL_ORDER) {
    tops[id] = acc + panelHeights[id] / 2;
    acc += panelHeights[id] + 4;
  }
  return (
    <svg width="26" height="685" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="sGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%"   stopColor={G}  stopOpacity="0.15" />
          <stop offset="30%"  stopColor={G}  stopOpacity="0.7" />
          <stop offset="70%"  stopColor={GS} stopOpacity="0.8" />
          <stop offset="100%" stopColor={GS} stopOpacity="0.35" />
        </linearGradient>
        <filter id="dGlow">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <motion.line x1="13" y1="680" x2="13" y2="5"
        stroke="url(#sGrad)" strokeWidth="2" strokeDasharray="8 5"
        animate={{ strokeDashoffset: [91, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />
      {[0,1,2,3,4].map(i => (
        <motion.circle key={i} cx="13" r={i%2?2.5:2} fill={G} opacity={0}
          animate={{ cy: [680, 5], opacity: [0, 0.95, 0.95, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, delay: i*0.64, ease: "linear" }}
        />
      ))}
      {PANEL_ORDER.map(id => {
        const isActive = activePanel === id;
        return (
          <motion.g key={id}>
            {isActive && (
              <motion.circle cx="13" cy={tops[id]} r="6" fill="none" stroke={G} strokeWidth="1"
                animate={{ r:[6,11,6], opacity:[0.8,0,0.8] }}
                transition={{ duration:1.8, repeat:Infinity, ease:"easeOut" }}
              />
            )}
            <motion.circle cx="13" cy={tops[id]} fill={G}
              filter={isActive?"url(#dGlow)":undefined}
              animate={{ r: isActive?[4.5,6,4.5]:[3,3,3] }}
              transition={{ duration:2, repeat:Infinity, ease:"easeInOut" }}
            />
            <line x1="13" y1={tops[id]} x2="26" y2={tops[id]}
              stroke={G} strokeWidth={isActive?1.5:0.8}
              opacity={isActive?0.8:0.35}
              strokeDasharray={isActive?undefined:"3 2"}
            />
          </motion.g>
        );
      })}
      <motion.ellipse cx="13" cy="680" rx="10" ry="6" fill={G} opacity={0.2}
        animate={{ opacity:[0.2,0.55,0.2] }}
        transition={{ duration:2.2, repeat:Infinity, ease:"easeInOut" }}
      />
    </svg>
  );
}

// ─── Shared panel shell ────────────────────────────────────────────────────────
function PanelShell({ isActive, height, isDark, locale, label, meta, children }: {
  isActive: boolean; height: number; isDark: boolean; locale: Locale;
  label: string; meta: string; children: React.ReactNode;
}) {
  const df = locale.displayFont;
  const bg = isDark
    ? (isActive ? "rgba(45,27,105,0.75)" : "rgba(20,9,58,0.6)")
    : (isActive ? "rgba(246,241,232,0.88)" : "rgba(246,241,232,0.55)");
  const border = isActive
    ? `1.5px solid rgba(212,175,55,${isDark?0.55:0.6})`
    : `1px solid rgba(212,175,55,${isDark?0.15:0.2})`;
  const labelCol = isDark ? (isActive?GS:"rgba(230,201,106,0.4)") : (isActive?PD:"rgba(45,27,105,0.45)");
  const metaCol  = isDark ? (isActive?"rgba(246,241,232,0.55)":"rgba(246,241,232,0.2)") : (isActive?"rgba(45,27,105,0.6)":"rgba(45,27,105,0.3)");
  const ls = `${locale.letterSpacingScale * 1.8}px`;

  return (
    <motion.div
      animate={{ height }}
      transition={{ duration: 0.95, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ borderRadius:"10px", overflow:"hidden", background:bg, border,
        boxShadow: isActive
          ? "0 0 0 1px rgba(212,175,55,0.12), 0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(212,175,55,0.15)"
          : "0 2px 8px rgba(0,0,0,0.2)",
        backdropFilter:"blur(12px)", position:"relative", flexShrink:0 }}
    >
      {/* Header */}
      <div style={{ height:"36px", display:"flex", alignItems:"center", gap:"8px", padding:"0 12px",
        borderBottom:`1px solid rgba(212,175,55,${isActive?0.2:0.08})`,
        background: isDark ? `rgba(20,9,58,${isActive?0.4:0.3})` : `rgba(246,241,232,${isActive?0.6:0.4})`,
        flexShrink:0 }}>
        <Cross px={isActive?13:10} color={isActive?G:(isDark?"rgba(212,175,55,0.4)":"rgba(45,27,105,0.3)")} />
        <span style={{ fontFamily:df, fontSize:"9.5px", letterSpacing:ls, color:labelCol,
          fontWeight:isActive?700:400, transition:"color 0.4s" }}>{label}</span>
        <span style={{ flex:1 }} />
        <span style={{ fontFamily:locale.bodyFont, fontSize:"9px", color:metaCol }}>{meta}</span>
        {isActive && (
          <motion.div style={{ width:"6px", height:"6px", borderRadius:"50%", background:G, flexShrink:0 }}
            animate={{ opacity:[1,0.3,1] }} transition={{ duration:1.5, repeat:Infinity }} />
        )}
      </div>
      {/* Left accent */}
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:"3px",
        background: isActive?`linear-gradient(180deg,${G},${GS},${G})`:"rgba(212,175,55,0.15)",
        transition:"background 0.5s" }} />
      {/* Content */}
      <motion.div
        animate={{ opacity: height > 80 ? 1 : 0 }}
        transition={{ duration:0.35, delay: height > 80 ? 0.25 : 0 }}
        style={{ height:"calc(100% - 36px)", overflow:"hidden" }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

// ─── Book panel ────────────────────────────────────────────────────────────────
function BookPanel({ height, isActive, isDark, locale }: { height:number; isActive:boolean; isDark:boolean; locale:Locale }) {
  const df = locale.displayFont;
  const bf = locale.bodyFont;
  const textLight = isDark ? IV : PD;
  const textDim   = isDark ? "rgba(246,241,232,0.5)" : "rgba(45,27,105,0.5)";
  const rowBorder = isDark ? "rgba(212,175,55,0.1)" : "rgba(45,27,105,0.1)";
  const cellBg    = isDark ? "rgba(246,241,232,0.04)" : "rgba(45,27,105,0.04)";
  const cols = locale.bookCols;

  const records = [
    ["001", "Papadopoulos, Nikolaos", locale.bookSacrament, "12 Jan 1985"],
    ["002", "Stavros, Maria",          locale.bookSacrament, "03 Feb 1985"],
    ["003", "Nikolaou, Alexandros",    locale.bookSacrament, "17 Mar 1985"],
    ["004", "Christodoulou, Eleni",    locale.bookSacrament, "29 Apr 1985"],
  ];

  return (
    <PanelShell isActive={isActive} height={height} isDark={isDark} locale={locale}
      label={locale.panelBook} meta={`${locale.bookPageTitle} · 1920–2024`}>
      <div style={{ display:"flex", height:"100%", padding:"10px 12px", gap:"10px" }}>
        {/* Book cover */}
        <div style={{ width:"80px", flexShrink:0,
          background: isDark?"rgba(20,9,58,0.8)":"rgba(45,27,105,0.12)",
          border:`1px solid rgba(212,175,55,0.4)`, borderRadius:"6px",
          display:"flex", flexDirection:"column", alignItems:"center",
          justifyContent:"center", gap:"6px", padding:"8px 6px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", inset:"4px", border:"1px solid rgba(212,175,55,0.3)", borderRadius:"3px", pointerEvents:"none" }} />
          <Cross px={24} color={G} opacity={0.9} />
          <div style={{ fontFamily:df, fontSize:"6.5px", letterSpacing:`${locale.letterSpacingScale}px`,
            color: isActive?G:"rgba(212,175,55,0.5)", textAlign:"center", lineHeight:1.5 }}>
            {locale.bookPageTitle}
          </div>
          <div style={{ fontFamily:bf, fontSize:"7px", color:textDim, textAlign:"center" }}>1920–2024</div>
          <div style={{ position:"absolute", left:0, top:0, bottom:0, width:"5px",
            background:"linear-gradient(180deg,rgba(212,175,55,0.5),rgba(212,175,55,0.8),rgba(212,175,55,0.5))" }} />
          <div style={{ position:"absolute", right:0, top:"6px", bottom:"6px", width:"4px",
            background: isDark?"rgba(246,241,232,0.3)":"rgba(45,27,105,0.1)" }} />
        </div>
        {/* Open page */}
        <div style={{ flex:1,
          background: isDark?"rgba(246,241,232,0.04)":"rgba(255,255,255,0.5)",
          border:`1px solid rgba(212,175,55,0.2)`, borderRadius:"4px", overflow:"hidden", fontFamily:bf }}>
          <div style={{ padding:"5px 8px 4px", borderBottom:`1px solid rgba(212,175,55,0.15)`,
            display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontFamily:df, fontSize:"7.5px", letterSpacing:`${locale.letterSpacingScale * 0.5}px`,
              color: isActive?G:"rgba(212,175,55,0.5)" }}>{locale.bookPageTitle}</span>
            <span style={{ fontFamily:df, fontSize:"6.5px", color:textDim }}>{locale.bookChurchName}</span>
          </div>
          {/* Column headers */}
          <div style={{ display:"grid", gridTemplateColumns:"28px 1fr 60px 60px",
            padding:"3px 8px", background:"rgba(212,175,55,0.08)", borderBottom:`1px solid ${rowBorder}` }}>
            {cols.map(h => (
              <span key={h} style={{ fontFamily:df, fontSize:"6.5px", color:G, letterSpacing:`${locale.letterSpacingScale*0.5}px` }}>{h}</span>
            ))}
          </div>
          {records.map((r, i) => (
            <div key={i} style={{ display:"grid", gridTemplateColumns:"28px 1fr 60px 60px",
              padding:"3px 8px", borderBottom:`1px solid ${rowBorder}`,
              background: i%2 ? cellBg : "transparent" }}>
              <span style={{ fontSize:"7px", color:textDim }}>{r[0]}</span>
              <span style={{ fontSize:"7.5px", color:textLight, fontStyle:"italic" }}>{r[1]}</span>
              <span style={{ fontSize:"7px", color: isActive?G:textDim }}>{r[2]}</span>
              <span style={{ fontSize:"7px", color:textDim }}>{r[3]}</span>
            </div>
          ))}
          <div style={{ padding:"4px 8px", display:"flex", justifyContent:"flex-end" }}>
            <span style={{ fontSize:"6.5px", color:textDim, fontStyle:"italic" }}>→</span>
          </div>
        </div>
      </div>
    </PanelShell>
  );
}

// ─── OCR panel ─────────────────────────────────────────────────────────────────
const OCR_CONF = [98, 97, 95, 89, 92];
const OCR_COLORS = [
  "rgba(88,180,255,0.8)", "rgba(88,200,100,0.8)", "rgba(212,175,55,0.8)",
  "rgba(200,130,255,0.8)", "rgba(255,160,80,0.8)",
];
const OCR_VALUES = ["Nikolaou, Alexandros", "17 March 1985", "St. George Orth. Ch.", "Stavros, Michael", "Fr. Konstantinos D."];

function OcrPanel({ height, isActive, isDark, locale }: { height:number; isActive:boolean; isDark:boolean; locale:Locale }) {
  const df = locale.displayFont;
  const bf = locale.bodyFont;
  const textLight = isDark ? IV : PD;
  const textDim   = isDark ? "rgba(246,241,232,0.45)" : "rgba(45,27,105,0.45)";
  const ls = `${locale.letterSpacingScale * 0.8}px`;
  const tabs = locale.ocrTabs;

  return (
    <PanelShell isActive={isActive} height={height} isDark={isDark} locale={locale}
      label={locale.panelOcr} meta={`${locale.ocrDocName} · ${locale.ocrAccuracy}`}>
      <div style={{ padding:"8px 12px", height:"100%", display:"flex", flexDirection:"column", gap:"8px" }}>
        {/* Tabs */}
        <div style={{ display:"flex", gap:"6px" }}>
          {tabs.map((t, i) => (
            <div key={t} style={{ fontFamily:df, fontSize:"8px", letterSpacing:ls, padding:"3px 8px",
              borderRadius:"4px", cursor:"default",
              background: i===1?(isDark?"rgba(212,175,55,0.2)":"rgba(212,175,55,0.15)"):"transparent",
              color: i===1?G:textDim,
              border: i===1?`1px solid rgba(212,175,55,0.35)`:"1px solid transparent" }}>{t}</div>
          ))}
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:"4px" }}>
            <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"rgba(88,200,100,0.8)" }} />
            <span style={{ fontFamily:df, fontSize:"8px", color:"rgba(88,200,100,0.9)", letterSpacing:ls }}>{locale.ocrAccuracy}</span>
          </div>
        </div>
        {/* Main area */}
        <div style={{ flex:1, display:"flex", gap:"8px", overflow:"hidden" }}>
          {/* Scanned page */}
          <div style={{ flex:"0 0 52%",
            background: isDark?"rgba(246,241,232,0.06)":"rgba(255,255,252,0.7)",
            border:`1px solid rgba(212,175,55,0.2)`, borderRadius:"6px", overflow:"hidden", position:"relative" }}>
            {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => (
              <div key={i} style={{ position:"absolute", left:"8px", right:"8px", top:`${14+i*14}px`,
                height:"1px", background: isDark?"rgba(246,241,232,0.12)":"rgba(45,27,105,0.08)" }} />
            ))}
            {[
              {top:12,  left:8, width:"75%", height:12, color:"rgba(88,180,255,0.25)"},
              {top:40,  left:8, width:"45%", height:12, color:"rgba(88,200,100,0.25)"},
              {top:68,  left:8, width:"65%", height:12, color:"rgba(212,175,55,0.22)"},
              {top:96,  left:8, width:"55%", height:12, color:"rgba(200,130,255,0.22)"},
              {top:124, left:8, width:"60%", height:12, color:"rgba(255,160,80,0.22)"},
            ].map((box, i) => (
              <motion.div key={i} style={{ position:"absolute", top:box.top, left:box.left,
                width:box.width, height:box.height, background:box.color,
                border:`1px solid ${box.color.replace(/0\.\d+\)$/,"0.7)")}`, borderRadius:"2px" }}
                animate={isActive?{opacity:[0.6,1,0.6]}:{}}
                transition={{duration:2, repeat:Infinity, delay:i*0.3, ease:"easeInOut"}}
              />
            ))}
            {isActive && (
              <motion.div style={{ position:"absolute", left:0, right:0, height:"3px",
                background:"linear-gradient(90deg,transparent,rgba(212,175,55,0.8),transparent)",
                boxShadow:"0 0 8px rgba(212,175,55,0.6)" }}
                animate={{ top:["8px","155px","8px"] }}
                transition={{ duration:2.8, repeat:Infinity, ease:"easeInOut" }}
              />
            )}
            <div style={{ position:"absolute", bottom:"5px", left:"50%", transform:"translateX(-50%)",
              fontFamily:df, fontSize:"6.5px", color:textDim, whiteSpace:"nowrap", letterSpacing:ls }}>
              Page 14 of 47
            </div>
          </div>
          {/* Extracted fields */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:"4px", overflow:"hidden" }}>
            <div style={{ fontFamily:df, fontSize:"7.5px", letterSpacing:ls, color:G,
              paddingBottom:"4px", borderBottom:"1px solid rgba(212,175,55,0.2)" }}>
              {locale.ocrExtraction}
            </div>
            {locale.ocrFields.map((f, i) => (
              <motion.div key={i}
                style={{ background: isDark?"rgba(20,9,58,0.5)":"rgba(246,241,232,0.6)",
                  border:`1px solid ${OCR_COLORS[i].replace("0.8","0.3")}`,
                  borderRadius:"4px", padding:"4px 6px" }}
                initial={isActive?{opacity:0,x:10}:{}}
                animate={isActive?{opacity:1,x:0}:{opacity:0.6}}
                transition={{duration:0.4, delay: isActive ? 0.2+i*0.1 : 0}}
              >
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontFamily:df, fontSize:"7px", color:OCR_COLORS[i], letterSpacing:ls }}>{f.label}</span>
                  <span style={{ fontFamily:df, fontSize:"7px", color:OCR_COLORS[i] }}>{OCR_CONF[i]}%</span>
                </div>
                <div style={{ fontFamily:bf, fontSize:"9px", color:textLight, marginTop:"1px" }}>{OCR_VALUES[i]}</div>
                <div style={{ height:"2px", background:"rgba(212,175,55,0.15)", borderRadius:"1px", marginTop:"3px", overflow:"hidden" }}>
                  <motion.div style={{ height:"100%", background:OCR_COLORS[i], borderRadius:"1px" }}
                    initial={{ width:"0%" }}
                    animate={{ width: isActive?`${OCR_CONF[i]}%`:"0%" }}
                    transition={{ duration:0.6, delay:0.4+i*0.1 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        {/* Progress */}
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"3px" }}>
            <span style={{ fontFamily:df, fontSize:"7.5px", color:textDim, letterSpacing:ls }}>{locale.ocrProgress}</span>
            <span style={{ fontFamily:df, fontSize:"7.5px", color:G }}>23 {locale.ocrProgressOf} 47</span>
          </div>
          <div style={{ height:"4px", background:"rgba(212,175,55,0.15)", borderRadius:"2px", overflow:"hidden" }}>
            <motion.div style={{ height:"100%", background:`linear-gradient(90deg,${G},${GS})`, borderRadius:"2px" }}
              animate={{ width: isActive?"49%":"0%" }} transition={{ duration:0.8, delay:0.3 }} />
          </div>
        </div>
      </div>
    </PanelShell>
  );
}

// ─── Records panel ─────────────────────────────────────────────────────────────
const REC_DATA = [
  { id:"OMR-24-00847", name:"Papadopoulos, N.", date:"12 Jan 1985", parish:"St. George",   si:0 },
  { id:"OMR-24-00848", name:"Stavros, Maria",    date:"28 Jun 1991", parish:"Holy Trinity", si:1 },
  { id:"OMR-24-00849", name:"Nikolaou, A.",      date:"17 Mar 1985", parish:"St. George",   si:2 },
  { id:"OMR-24-00850", name:"Christodoulou, E.", date:"03 Dec 2003", parish:"St. Nicholas", si:0 },
  { id:"OMR-24-00851", name:"Georgiou, D.",       date:"22 Aug 1978", parish:"Holy Trinity", si:1 },
];
const STATUS_COLORS = ["rgba(88,200,100,0.85)", "rgba(212,175,55,0.85)", "rgba(88,160,255,0.85)"];
const REC_TYPES_EN = ["Baptism", "Marriage", "Funeral", "Baptism", "Baptism"];

function RecordsPanel({ height, isActive, isDark, locale }: { height:number; isActive:boolean; isDark:boolean; locale:Locale }) {
  const df = locale.displayFont;
  const bf = locale.bodyFont;
  const textLight = isDark ? IV : PD;
  const textDim   = isDark ? "rgba(246,241,232,0.45)" : "rgba(45,27,105,0.45)";
  const rowBorder = isDark ? "rgba(212,175,55,0.08)" : "rgba(45,27,105,0.08)";
  const ls = `${locale.letterSpacingScale * 0.6}px`;
  const recTypes = [locale.recFilters[1], locale.recFilters[2], locale.recFilters[1], locale.recFilters[3], locale.recFilters[1]];

  return (
    <PanelShell isActive={isActive} height={height} isDark={isDark} locale={locale}
      label={locale.panelRecords} meta="12,847">
      <div style={{ padding:"8px 12px", height:"100%", display:"flex", flexDirection:"column", gap:"6px" }}>
        {/* Search + filters */}
        <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
          <div style={{ flex:1, height:"26px",
            background: isDark?"rgba(20,9,58,0.5)":"rgba(246,241,232,0.6)",
            border:`1px solid rgba(212,175,55,${isActive?0.3:0.15})`, borderRadius:"5px",
            display:"flex", alignItems:"center", padding:"0 8px", gap:"6px" }}>
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
              <circle cx="5" cy="5" r="4" stroke={G} strokeWidth="1.2" opacity="0.7"/>
              <line x1="8" y1="8" x2="11" y2="11" stroke={G} strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
            </svg>
            <span style={{ fontFamily:bf, fontSize:"9px", color:textDim }}>{locale.recSearch}</span>
            {isActive && (
              <motion.span style={{ width:"1px", height:"12px", background:G, marginLeft:"1px" }}
                animate={{ opacity:[1,0,1] }} transition={{ duration:1, repeat:Infinity }} />
            )}
          </div>
          {locale.recFilters.map((f, i) => (
            <div key={f} style={{ fontFamily:df, fontSize:"7px", letterSpacing:ls,
              padding:"4px 7px", borderRadius:"4px", cursor:"default", whiteSpace:"nowrap",
              background: i===0?(isDark?"rgba(212,175,55,0.18)":"rgba(212,175,55,0.15)"):"transparent",
              color: i===0?G:textDim,
              border: i===0?`1px solid rgba(212,175,55,0.35)`:`1px solid rgba(212,175,55,0.1)` }}>{f}</div>
          ))}
        </div>
        {/* Table */}
        <div style={{ flex:1, overflow:"hidden", borderRadius:"6px", border:`1px solid rgba(212,175,55,0.12)` }}>
          <div style={{ display:"grid", gridTemplateColumns:"90px 1fr 60px 65px 70px 58px",
            padding:"4px 8px", background:"rgba(212,175,55,0.1)", borderBottom:`1px solid rgba(212,175,55,0.15)` }}>
            {locale.recCols.map(h => (
              <span key={h} style={{ fontFamily:df, fontSize:"7px", color:G, letterSpacing:ls }}>{h}</span>
            ))}
          </div>
          {REC_DATA.map((r, i) => (
            <motion.div key={i}
              style={{ display:"grid", gridTemplateColumns:"90px 1fr 60px 65px 70px 58px",
                padding:"5px 8px", borderBottom:`1px solid ${rowBorder}`,
                background: isActive && i===2?(isDark?"rgba(88,160,255,0.06)":"rgba(88,160,255,0.04)"):"transparent" }}
              animate={isActive?{opacity:1}:{opacity:0.6}}
              transition={{ duration:0.3, delay:i*0.06 }}
            >
              <span style={{ fontFamily:bf, fontSize:"8px", color:G, opacity:0.8 }}>{r.id}</span>
              <span style={{ fontFamily:bf, fontSize:"9px", color:textLight }}>{r.name}</span>
              <span style={{ fontFamily:bf, fontSize:"8px", color:textDim }}>{recTypes[i]}</span>
              <span style={{ fontFamily:bf, fontSize:"8px", color:textDim }}>{r.date}</span>
              <span style={{ fontFamily:bf, fontSize:"8px", color:textDim, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.parish}</span>
              <div style={{ display:"flex", alignItems:"center", gap:"4px" }}>
                <motion.div style={{ width:"5px", height:"5px", borderRadius:"50%", background:STATUS_COLORS[r.si], flexShrink:0 }}
                  animate={isActive && r.si===2?{opacity:[1,0.3,1]}:{}}
                  transition={{ duration:1.2, repeat:Infinity }} />
                <span style={{ fontFamily:df, fontSize:"7px", color:STATUS_COLORS[r.si] }}>{locale.recStatuses[r.si]}</span>
              </div>
            </motion.div>
          ))}
        </div>
        {/* Footer */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          borderTop:`1px solid rgba(212,175,55,0.1)`, paddingTop:"5px" }}>
          <span style={{ fontFamily:bf, fontSize:"8px", color:textDim, fontStyle:"italic" }}>{locale.recShowing}</span>
          <div style={{ display:"flex", gap:"4px" }}>
            {["←","1","2","3","→"].map((p, i) => (
              <div key={i} style={{ width:"18px", height:"18px", borderRadius:"3px", display:"flex",
                alignItems:"center", justifyContent:"center",
                background: i===1?"rgba(212,175,55,0.2)":"transparent",
                border:`1px solid rgba(212,175,55,${i===1?0.4:0.15})`,
                fontFamily:df, fontSize:"8px", color: i===1?G:textDim }}>{p}</div>
            ))}
          </div>
        </div>
      </div>
    </PanelShell>
  );
}

// ─── Certs panel ───────────────────────────────────────────────────────────────
function CertsPanel({ height, isActive, isDark, locale }: { height:number; isActive:boolean; isDark:boolean; locale:Locale }) {
  const df = locale.displayFont;
  const bf = locale.bodyFont;
  const textLight = isDark ? IV : PD;
  const textDim   = isDark ? "rgba(246,241,232,0.5)" : "rgba(45,27,105,0.5)";
  const ls = `${locale.letterSpacingScale * 1.5}px`;

  return (
    <PanelShell isActive={isActive} height={height} isDark={isDark} locale={locale}
      label={locale.panelCerts} meta={locale.certTypes.join(" · ")}>
      <div style={{ padding:"8px 12px", height:"100%", display:"flex", gap:"10px", overflow:"hidden" }}>
        {/* Certificate preview */}
        <div style={{ flex:"0 0 58%",
          background: isDark?"rgba(246,241,232,0.06)":"rgba(255,255,252,0.75)",
          border:`1.5px solid rgba(212,175,55,0.35)`, borderRadius:"6px",
          padding:"12px 14px", display:"flex", flexDirection:"column",
          alignItems:"center", gap:"7px", position:"relative", overflow:"hidden" }}>
          {[{top:4,left:4},{top:4,right:4},{bottom:4,left:4},{bottom:4,right:4}].map((pos, i) => (
            <svg key={i} width="12" height="12" viewBox="0 0 12 12"
              style={{ position:"absolute", ...pos as any, opacity:0.5 }}>
              <path d="M 0 0 L 6 0 Q 12 0 12 6" fill="none" stroke={G} strokeWidth="1" />
            </svg>
          ))}
          <div style={{ position:"absolute", inset:"7px", border:"0.5px solid rgba(212,175,55,0.25)", borderRadius:"3px", pointerEvents:"none" }} />
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"4px" }}>
            <Cross px={22} color={G} opacity={0.9} />
            <div style={{ fontFamily:df, fontSize:"7px", color:textDim, letterSpacing:ls, textAlign:"center" }}>{locale.certChurch}</div>
          </div>
          <div style={{ fontFamily:df, fontSize:"10px", fontWeight:700, color: isActive?G:"rgba(212,175,55,0.6)",
            letterSpacing:ls, textAlign:"center", lineHeight:1.3 }}>
            {locale.certTitle}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"6px", width:"100%" }}>
            <div style={{ flex:1, height:"0.5px", background:G, opacity:0.4 }} />
            <div style={{ width:"4px", height:"4px", borderRadius:"50%", background:G, opacity:0.6 }} />
            <div style={{ flex:1, height:"0.5px", background:G, opacity:0.4 }} />
          </div>
          <div style={{ textAlign:"center", fontFamily:bf }}>
            <div style={{ fontSize:"8px", color:textDim, fontStyle:"italic", lineHeight:1.6 }}>{locale.certBody}</div>
            <div style={{ fontSize:"11px", fontWeight:600, color:textLight, lineHeight:1.4, fontStyle:"italic" }}>Nikolaou, Alexandros</div>
            <div style={{ fontSize:"8px", color:textDim, fontStyle:"italic", lineHeight:1.6 }}>{locale.certOn}</div>
            <div style={{ fontSize:"8px", color:textLight, fontWeight:600 }}>17 March 1985</div>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", width:"100%", alignItems:"flex-end", marginTop:"auto" }}>
            <motion.div style={{ width:"36px", height:"36px", borderRadius:"50%",
              border:`1.5px solid rgba(212,175,55,0.6)`, display:"flex", alignItems:"center", justifyContent:"center",
              background: isDark?"rgba(20,9,58,0.5)":"rgba(246,241,232,0.8)", position:"relative" }}
              animate={isActive?{boxShadow:["0 0 0px rgba(212,175,55,0)","0 0 10px rgba(212,175,55,0.4)","0 0 0px rgba(212,175,55,0)"]}:{}}
              transition={{duration:2.5, repeat:Infinity}}>
              <Cross px={14} color={G} opacity={0.8} />
              <div style={{ position:"absolute", inset:"3px", borderRadius:"50%", border:"0.5px solid rgba(212,175,55,0.3)" }} />
            </motion.div>
            <div style={{ textAlign:"right" }}>
              <div style={{ width:"70px", height:"0.5px", background:"rgba(212,175,55,0.4)", marginBottom:"3px" }} />
              <div style={{ fontFamily:bf, fontSize:"7.5px", color:textDim, fontStyle:"italic" }}>Fr. Konstantinos D.</div>
              <div style={{ fontFamily:bf, fontSize:"7px", color:textDim, opacity:0.7 }}>{locale.certPriest}</div>
            </div>
          </div>
        </div>
        {/* Options */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:"6px" }}>
          <div>
            <div style={{ fontFamily:df, fontSize:"7.5px", color:G, letterSpacing:ls, marginBottom:"5px" }}>{locale.certDocTypeLabel}</div>
            {locale.certTypes.map((t, i) => (
              <div key={t} style={{ display:"flex", alignItems:"center", gap:"6px",
                padding:"5px 8px", marginBottom:"3px",
                background: i===0?(isDark?"rgba(212,175,55,0.15)":"rgba(212,175,55,0.12)"):"transparent",
                border:`1px solid rgba(212,175,55,${i===0?0.35:0.1})`, borderRadius:"4px" }}>
                <div style={{ width:"10px", height:"10px", borderRadius:"50%",
                  border:`1.5px solid rgba(212,175,55,${i===0?0.8:0.3})`,
                  background: i===0?G:"transparent",
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {i===0 && <div style={{ width:"4px", height:"4px", borderRadius:"50%", background:PK }} />}
                </div>
                <span style={{ fontFamily:bf, fontSize:"9px", color: i===0?textLight:"rgba(212,175,55,0.4)" }}>{t}</span>
              </div>
            ))}
          </div>
          <div style={{ padding:"6px 8px", background:"rgba(88,200,100,0.1)", border:"1px solid rgba(88,200,100,0.3)", borderRadius:"4px",
            display:"flex", alignItems:"center", gap:"5px" }}>
            <motion.div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"rgba(88,200,100,0.9)", flexShrink:0 }}
              animate={isActive?{opacity:[1,0.3,1]}:{}} transition={{duration:1.5, repeat:Infinity}} />
            <span style={{ fontFamily:df, fontSize:"7.5px", color:"rgba(88,200,100,0.9)", letterSpacing:ls }}>{locale.certVerified}</span>
          </div>
          <motion.div style={{ marginTop:"auto",
            background:`linear-gradient(135deg,${G},${GS})`, borderRadius:"5px", padding:"8px 10px",
            textAlign:"center", cursor:"default",
            boxShadow: isActive?"0 4px 16px rgba(212,175,55,0.35)":"none" }}
            animate={isActive?{boxShadow:["0 4px 16px rgba(212,175,55,0.25)","0 4px 24px rgba(212,175,55,0.5)","0 4px 16px rgba(212,175,55,0.25)"]}:{}}
            transition={{duration:2.5, repeat:Infinity}}>
            <span style={{ fontFamily:df, fontSize:"8.5px", fontWeight:700, letterSpacing:ls, color:PK }}>{locale.certGenerate}</span>
          </motion.div>
          <div style={{ display:"flex", gap:"4px" }}>
            {locale.certFormats.map((f, i) => (
              <div key={f} style={{ flex:1, padding:"4px 0", textAlign:"center",
                border:`1px solid rgba(212,175,55,${i===0?0.4:0.15})`, borderRadius:"3px",
                fontFamily:df, fontSize:"7px", letterSpacing:ls,
                color: i===0?G:"rgba(212,175,55,0.35)",
                background: i===0?"rgba(212,175,55,0.1)":"transparent" }}>{f}</div>
            ))}
          </div>
        </div>
      </div>
    </PanelShell>
  );
}

// ─── Parish ops panel ──────────────────────────────────────────────────────────
const BAR_DATA   = [52, 38, 65, 43, 70, 58];
const BAR_MONTHS = ["Aug","Sep","Oct","Nov","Dec","Jan"];
const METRIC_VALS = ["48", "12,847", "1,203", "214"];

function ParishPanel({ height, isActive, isDark, locale }: { height:number; isActive:boolean; isDark:boolean; locale:Locale }) {
  const df = locale.displayFont;
  const bf = locale.bodyFont;
  const textLight = isDark ? IV : PD;
  const textDim   = isDark ? "rgba(246,241,232,0.45)" : "rgba(45,27,105,0.45)";
  const cardBg    = isDark ? "rgba(20,9,58,0.55)" : "rgba(255,255,255,0.5)";
  const ls = `${locale.letterSpacingScale * 0.5}px`;
  const maxBar = Math.max(...BAR_DATA);

  return (
    <PanelShell isActive={isActive} height={height} isDark={isDark} locale={locale}
      label={locale.panelParish} meta={locale.viewingAll}>
      <div style={{ padding:"8px 12px", height:"100%", display:"flex", flexDirection:"column", gap:"8px", overflow:"hidden" }}>
        {/* Metric cards */}
        <div style={{ display:"flex", gap:"6px" }}>
          {locale.metricLabels.map((m, i) => (
            <motion.div key={i} style={{ flex:1, background:cardBg,
              border:`1px solid rgba(212,175,55,${i===0&&isActive?0.4:0.12})`,
              borderRadius:"6px", padding:"7px 8px", overflow:"hidden" }}
              initial={isActive?{opacity:0,y:8}:{}}
              animate={isActive?{opacity:1,y:0}:{opacity:0.7}}
              transition={{duration:0.4, delay:0.1+i*0.08}}>
              <div style={{ fontFamily:df, fontSize:"7px", color:G, letterSpacing:ls, marginBottom:"3px" }}>{m}</div>
              <div style={{ fontFamily:df, fontSize:"13px", fontWeight:700, color:textLight, lineHeight:1 }}>{METRIC_VALS[i]}</div>
              <div style={{ fontFamily:bf, fontSize:"7.5px", color:textDim, marginTop:"2px" }}>{locale.metricSubs[i]}</div>
            </motion.div>
          ))}
        </div>
        {/* Chart + activity */}
        <div style={{ flex:1, display:"flex", gap:"8px", overflow:"hidden" }}>
          {/* Bar chart */}
          <div style={{ flex:"0 0 45%", background:cardBg, border:`1px solid rgba(212,175,55,0.12)`,
            borderRadius:"6px", padding:"8px 8px 6px", display:"flex", flexDirection:"column" }}>
            <div style={{ fontFamily:df, fontSize:"7.5px", color:G, letterSpacing:ls, marginBottom:"6px" }}>{locale.chartLabel}</div>
            <div style={{ flex:1, display:"flex", alignItems:"flex-end", gap:"4px", padding:"0 2px" }}>
              {BAR_DATA.map((val, i) => {
                const isMax = val === maxBar;
                const barH = Math.round((val/maxBar)*80);
                return (
                  <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"3px" }}>
                    <motion.div style={{ width:"100%", borderRadius:"3px 3px 0 0",
                      background: isMax?`linear-gradient(180deg,${GS},${G})`:(isDark?"rgba(62,35,125,0.9)":"rgba(45,27,105,0.2)"),
                      border: isMax?`1px solid rgba(212,175,55,0.5)`:"none", position:"relative" }}
                      initial={{ height:0 }}
                      animate={{ height: isActive?barH:Math.round(barH*0.3) }}
                      transition={{duration:0.6, delay:0.15+i*0.07, ease:[0.34,1.4,0.64,1]}}>
                      {isMax && isActive && (
                        <motion.div style={{ position:"absolute", top:0, left:0, right:0, height:"3px",
                          background:GS, borderRadius:"3px 3px 0 0" }}
                          animate={{opacity:[0.7,1,0.7]}} transition={{duration:1.5, repeat:Infinity}} />
                      )}
                    </motion.div>
                    <span style={{ fontFamily:df, fontSize:"6px", color: isMax&&isActive?G:textDim }}>{BAR_MONTHS[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Activity */}
          <div style={{ flex:1, background:cardBg, border:`1px solid rgba(212,175,55,0.12)`,
            borderRadius:"6px", padding:"8px", overflow:"hidden" }}>
            <div style={{ fontFamily:df, fontSize:"7.5px", color:G, letterSpacing:ls, marginBottom:"6px" }}>{locale.activityLabel}</div>
            <div style={{ display:"flex", flexDirection:"column", gap:"5px" }}>
              {locale.activityItems.map((a, i) => (
                <motion.div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"6px" }}
                  initial={isActive?{opacity:0,x:8}:{}}
                  animate={isActive?{opacity:1,x:0}:{opacity:0.6}}
                  transition={{duration:0.35, delay:0.3+i*0.08}}>
                  <motion.div style={{ width:"6px", height:"6px", borderRadius:"50%",
                    background:["#D4AF37","rgba(88,200,100,0.8)","rgba(88,160,255,0.8)","rgba(200,130,255,0.8)"][i],
                    marginTop:"2px", flexShrink:0 }}
                    animate={isActive&&i===0?{opacity:[1,0.3,1]}:{}} transition={{duration:1.5, repeat:Infinity}} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:bf, fontSize:"8.5px", color:textLight, lineHeight:1.3 }}>{a.action}</div>
                    <div style={{ fontFamily:bf, fontSize:"7.5px", color:textDim }}>{a.who}</div>
                  </div>
                </motion.div>
              ))}
            </div>
            <div style={{ marginTop:"8px", paddingTop:"6px", borderTop:`1px solid rgba(212,175,55,0.1)`,
              display:"flex", alignItems:"center", gap:"5px" }}>
              <span style={{ fontFamily:df, fontSize:"7px", color:G, letterSpacing:ls }}>
                {locale.code === "en" ? "VIEWING:" : ""}
              </span>
              <span style={{ fontFamily:bf, fontSize:"8px", color:textLight,
                background: isDark?"rgba(212,175,55,0.12)":"rgba(212,175,55,0.1)",
                border:"1px solid rgba(212,175,55,0.25)", borderRadius:"3px", padding:"2px 6px" }}>
                {locale.viewingAll}
              </span>
            </div>
          </div>
        </div>
        {/* User strip */}
        <div style={{ display:"flex", alignItems:"center", gap:"8px",
          background: isDark?"rgba(20,9,58,0.4)":"rgba(246,241,232,0.5)",
          border:`1px solid rgba(212,175,55,0.1)`, borderRadius:"5px", padding:"5px 10px" }}>
          <span style={{ fontFamily:df, fontSize:"7.5px", color:G, letterSpacing:ls }}>
            {locale.code === "en" ? "USERS" : locale.metricLabels[3]}
          </span>
          <div style={{ display:"flex" }}>
            {["rgba(212,175,55,0.8)","rgba(88,200,100,0.7)","rgba(88,160,255,0.7)","rgba(200,130,255,0.7)","rgba(255,160,80,0.7)"].map((c, i) => (
              <div key={i} style={{ width:"18px", height:"18px", borderRadius:"50%",
                background:c, border:`1.5px solid ${isDark?PK:IV}`,
                marginLeft: i>0?"-6px":0, display:"flex", alignItems:"center", justifyContent:"center",
                fontFamily:df, fontSize:"7px", color:PK, fontWeight:700 }}>
                {["A","B","C","D","+"][i]}
              </div>
            ))}
          </div>
          <span style={{ fontFamily:bf, fontSize:"8px", color:textDim }}>{locale.usersLabel}</span>
          <div style={{ marginLeft:"auto" }}>
            <div style={{ fontFamily:df, fontSize:"7.5px", color:G,
              background:"rgba(212,175,55,0.1)", border:"1px solid rgba(212,175,55,0.3)",
              borderRadius:"3px", padding:"3px 8px", cursor:"default", letterSpacing:ls }}>{locale.manageUsersBtn}</div>
          </div>
        </div>
      </div>
    </PanelShell>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────
export function ProductEcosystem({ activeSlide, isDark, locale }: Props) {
  const heights    = HEIGHTS[activeSlide] ?? HEIGHTS[0];
  const activePanel = ACTIVE[activeSlide] ?? null;

  return (
    <div style={{ position:"relative", width:"100%", height:"685px", display:"flex", gap:"6px" }}>
      <CathedralSilhouette isDark={isDark} />
      <GoldStream panelHeights={heights} activePanel={activePanel} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:"4px", overflow:"hidden" }}>
        <ParishPanel  height={heights.parish}  isActive={activePanel==="parish"  || activePanel===null} isDark={isDark} locale={locale} />
        <CertsPanel   height={heights.certs}   isActive={activePanel==="certs"   || activePanel===null} isDark={isDark} locale={locale} />
        <RecordsPanel height={heights.records} isActive={activePanel==="records" || activePanel===null} isDark={isDark} locale={locale} />
        <OcrPanel     height={heights.ocr}     isActive={activePanel==="ocr"     || activePanel===null} isDark={isDark} locale={locale} />
        <BookPanel    height={heights.book}    isActive={activePanel==="book"    || activePanel===null} isDark={isDark} locale={locale} />
      </div>
    </div>
  );
}
