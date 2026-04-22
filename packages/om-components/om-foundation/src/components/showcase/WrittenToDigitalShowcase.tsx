/**
 * WrittenToDigitalShowcase — Reusable interactive OCR transformation demo.
 *
 * Shows a handwritten parish ledger image morphing through a 4-state animation
 * (idle → scanning → structuring → digital) into a structured data table.
 *
 * Usage:
 *   <WrittenToDigitalShowcase />                          // full variant, all record types
 *   <WrittenToDigitalShowcase variant="compact" />        // smaller, no instruction text
 *   <WrittenToDigitalShowcase recordType="baptism" />     // locked to one type (no cards)
 *   <WrittenToDigitalShowcase animated={false} />         // starts in digital state
 */

import { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RecordTypeCards } from '@/components/frontend-pages/homepage/records-transform/RecordTypeCards';
import { EnhancedRecordViewer } from '@/components/frontend-pages/homepage/records-transform/EnhancedRecordViewer';
import { RecordsDataTable, type Column } from '@/components/frontend-pages/homepage/records-transform/RecordsDataTable';
import { ConfidenceBadge } from '@/components/frontend-pages/homepage/records-transform/ConfidenceBadge';
import {
  recordCards,
  baptismData, marriageData, funeralData, customData,
  type RecordType, type BaptismRow, type MarriageRow, type FuneralRow, type CustomRow,
} from '@/components/frontend-pages/homepage/records-transform/recordsTransformDemoData';

// ── Props ───────────────────────────────────────────────────────

type SingleRecordType = 'baptism' | 'marriage' | 'funeral';

const singleToMulti: Record<SingleRecordType, RecordType> = {
  baptism: 'baptisms',
  marriage: 'marriages',
  funeral: 'funerals',
};

export interface WrittenToDigitalShowcaseProps {
  /** "full" shows cards + instruction text. "compact" is panel-only. Default: "full" */
  variant?: 'full' | 'compact';
  /** Lock to a single record type (hides type-selector cards). */
  recordType?: SingleRecordType;
  /** Enable the scanning/structuring animation. Default: true */
  animated?: boolean;
  /** Extra CSS class on the outermost wrapper (the panel area, not any section). */
  className?: string;
}

// ── Date formatting ──
function fmtDate(d: string) {
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Column definitions ──
const baptismColumns: Column<BaptismRow>[] = [
  { key: 'firstName', label: 'First Name', render: r => <span className="text-gray-900 dark:text-gray-100">{r.firstName}</span> },
  { key: 'lastName', label: 'Last Name', render: r => <span className="text-gray-900 dark:text-gray-100">{r.lastName}</span> },
  { key: 'birthDate', label: 'Birth Date', render: r => <span className="text-gray-600 dark:text-gray-400">{fmtDate(r.birthDate)}</span> },
  { key: 'baptismDate', label: 'Baptism Date', render: r => <span className="text-gray-600 dark:text-gray-400">{fmtDate(r.baptismDate)}</span> },
  { key: 'birthplace', label: 'Birthplace', render: r => <span className="text-gray-600 dark:text-gray-400">{r.birthplace}</span> },
  { key: 'godparents', label: 'Godparents', render: r => <span className="text-gray-500 dark:text-gray-400">{r.godparents}</span> },
];

const marriageColumns: Column<MarriageRow>[] = [
  { key: 'groom', label: 'Groom', render: r => <span className="text-gray-900 dark:text-gray-100">{r.groomName}</span> },
  { key: 'bride', label: 'Bride', render: r => <span className="text-gray-900 dark:text-gray-100">{r.brideName}</span> },
  { key: 'date', label: 'Date', render: r => <span className="text-gray-600 dark:text-gray-400">{fmtDate(r.marriageDate)}</span> },
  { key: 'location', label: 'Location', render: r => <span className="text-gray-600 dark:text-gray-400">{r.location}</span> },
  { key: 'witnesses', label: 'Witnesses', render: r => <span className="text-gray-500 dark:text-gray-400">{r.witnesses}</span> },
];

const funeralColumns: Column<FuneralRow>[] = [
  { key: 'name', label: 'Full Name', render: r => <span className="text-gray-900 dark:text-gray-100">{r.fullName}</span> },
  { key: 'death', label: 'Death Date', render: r => <span className="text-gray-600 dark:text-gray-400">{fmtDate(r.deathDate)}</span> },
  { key: 'burial', label: 'Burial Date', render: r => <span className="text-gray-600 dark:text-gray-400">{fmtDate(r.burialDate)}</span> },
  { key: 'age', label: 'Age', render: r => <span className="text-gray-600 dark:text-gray-400">{r.age}</span> },
  { key: 'cause', label: 'Cause of Death', render: r => <span className="text-gray-500 dark:text-gray-400">{r.causeOfDeath}</span> },
];

const customColumns: Column<CustomRow>[] = [
  { key: 'name', label: 'Name', render: r => <span className="text-gray-900 dark:text-gray-100">{r.name}</span> },
  { key: 'born', label: 'Born', render: r => <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">{r.birthDate}</span> },
  { key: 'baptized', label: 'Baptized', render: r => <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">{r.baptismDate}</span> },
  { key: 'parents', label: 'Parents', render: r => <span className="text-gray-600 dark:text-gray-400">{r.parents}</span> },
  { key: 'origin', label: 'Origin', render: r => <span className="text-gray-500 dark:text-gray-400">{r.location}</span> },
  { key: 'sponsors', label: 'Sponsors', render: r => <span className="text-gray-500 dark:text-gray-400">{r.sponsors}</span> },
  { key: 'confidence', label: 'Confidence', render: r => <ConfidenceBadge level={r.confidence} /> },
];

// ── Digital content for each record type ──
function DigitalContent({ type }: { type: RecordType }) {
  const card = recordCards.find(c => c.type === type)!;
  const isDifficult = type === 'custom';
  const tableDelay = isDifficult ? 0.25 : 0.15;

  return (
    <EnhancedRecordViewer
      label={card.label}
      year={card.year}
      count={card.count}
      badge={isDifficult ? card.badge : undefined}
      imageSrc={card.image}
      variant={card.mode}
    >
      {type === 'baptisms' && <RecordsDataTable columns={baptismColumns} data={baptismData} rowKey={(r, i) => r.lastName + i} delay={tableDelay} />}
      {type === 'marriages' && <RecordsDataTable columns={marriageColumns} data={marriageData} rowKey={r => r.groomName} delay={tableDelay} />}
      {type === 'funerals' && <RecordsDataTable columns={funeralColumns} data={funeralData} rowKey={r => r.fullName} delay={tableDelay} />}
      {type === 'custom' && <RecordsDataTable columns={customColumns} data={customData} rowKey={r => r.name} delay={tableDelay} />}
    </EnhancedRecordViewer>
  );
}

// ── Row highlight positions for scan animation ──
const rowPositions = [18, 28, 38, 48, 58, 68, 78];

type TransformState = 'idle' | 'scanning' | 'structuring' | 'digital';

// ═══════════════════════════════════════════════
// ── Main Component ──
// ═══════════════════════════════════════════════

export default function WrittenToDigitalShowcase({
  variant = 'full',
  recordType,
  animated = true,
  className,
}: WrittenToDigitalShowcaseProps) {
  const lockedType: RecordType | null = recordType ? singleToMulti[recordType] : null;
  const initialType: RecordType = lockedType || 'baptisms';

  const [activeType, setActiveType] = useState<RecordType>(initialType);
  const [state, setState] = useState<TransformState>(animated ? 'idle' : 'digital');
  const [scanLineY, setScanLineY] = useState(0);
  const [highlightedRows, setHighlightedRows] = useState<number[]>([]);
  const [imageOpacity, setImageOpacity] = useState(animated ? 1 : 0);
  const [gridOpacity, setGridOpacity] = useState(0);
  const [tableOpacity, setTableOpacity] = useState(animated ? 0 : 1);
  const isAnimatingRef = useRef(false);
  const timeoutsRef = useRef<number[]>([]);

  const clearTimeouts = () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; };
  const addTimeout = (fn: () => void, ms: number) => { const id = window.setTimeout(fn, ms); timeoutsRef.current.push(id); return id; };

  useEffect(() => () => clearTimeouts(), []);

  const runAnimation = useCallback((type: RecordType) => {
    if (!animated || isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    clearTimeouts();
    setActiveType(type);
    setState('idle');
    setHighlightedRows([]);
    setImageOpacity(1);
    setGridOpacity(0);
    setTableOpacity(0);
    setScanLineY(0);

    addTimeout(() => setState('scanning'), 300);
    rowPositions.forEach((_, idx) => {
      addTimeout(() => setHighlightedRows(prev => [...prev, idx]), 500 + idx * 120);
    });
    addTimeout(() => { setState('structuring'); setImageOpacity(0.15); setGridOpacity(1); }, 1400);
    addTimeout(() => { setImageOpacity(0); setGridOpacity(0); setTableOpacity(1); setState('digital'); setHighlightedRows([]); isAnimatingRef.current = false; }, 2400);
  }, [animated]);

  // Scan line animation
  useEffect(() => {
    if (state !== 'scanning') { setScanLineY(0); return; }
    let frame: number;
    let start: number | null = null;
    const duration = 1000;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setScanLineY(p * 100);
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [state]);

  const handleCardSelect = (type: RecordType) => {
    if (type === activeType && state === 'digital') {
      clearTimeouts();
      isAnimatingRef.current = false;
      setState('idle');
      setHighlightedRows([]);
      setImageOpacity(1);
      setGridOpacity(0);
      setTableOpacity(0);
      return;
    }
    if (isAnimatingRef.current) return;
    runAnimation(type);
  };

  const handleCardHover = (type: RecordType) => {
    if (type !== activeType && state === 'idle' && !isAnimatingRef.current) {
      runAnimation(type);
    }
  };

  const activeCard = recordCards.find(c => c.type === activeType)!;
  const isCompact = variant === 'compact';
  const showCards = !lockedType;

  return (
    <div className={className}>
      {/* Record Type Cards (hidden when locked to a single type or compact with locked type) */}
      {showCards && (
        <RecordTypeCards
          activeType={activeType}
          onSelect={handleCardSelect}
          onHover={handleCardHover}
        />
      )}

      {/* Transformation Display Panel */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-purple-900/30 bg-black/20 backdrop-blur" style={{ aspectRatio: '16/10' }}>
        {/* LAYER 1: Ledger Image */}
        <motion.div className="absolute inset-0" animate={{ opacity: imageOpacity }} transition={{ duration: 0.6, ease: 'easeInOut' }}>
          <AnimatePresence mode="wait">
            <motion.img
              key={activeType}
              src={activeCard.image}
              alt={`${activeType} ledger`}
              className="w-full h-full object-contain"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{
                opacity: 1,
                scale: state === 'idle' ? 1.02 : 1,
                filter: state === 'scanning' ? 'brightness(1.08)' : state === 'structuring' ? 'brightness(1.3) contrast(0.5) blur(1.5px)' : 'none',
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          </AnimatePresence>
          {/* Page edge shadow */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ opacity: state === 'idle' ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.15) 0%, transparent 8%, transparent 48%, rgba(0,0,0,0.06) 50%, transparent 52%, transparent 92%, rgba(0,0,0,0.15) 100%)' }}
          />
        </motion.div>

        {/* LAYER 2: Scanning effects */}
        <AnimatePresence>
          {state === 'scanning' && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 120% 20% at 50% ${scanLineY}%, rgba(168,85,247,0.08) 0%, transparent 70%)` }} />
              <motion.div className="absolute left-0 right-0 h-[2px]" style={{ top: `${scanLineY}%` }}>
                <div className="w-full h-full bg-purple-400/90" />
                <div className="absolute inset-x-0 -top-3 h-8 bg-gradient-to-b from-purple-400/20 via-purple-400/10 to-transparent" />
                <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-transparent via-purple-400/10 to-purple-400/5" />
              </motion.div>
              {rowPositions.map((y, idx) => (
                <motion.div
                  key={y}
                  className="absolute left-[6%] right-[6%] h-[5%] rounded-sm"
                  style={{ top: `${y}%` }}
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: highlightedRows.includes(idx) ? 1 : 0,
                    backgroundColor: highlightedRows.includes(idx) ? 'rgba(168,85,247,0.12)' : 'rgba(168,85,247,0)',
                  }}
                  transition={{ duration: 0.2 }}
                />
              ))}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-5 py-2.5 rounded-full border border-purple-500/20"
              >
                <div className="flex items-center gap-2">
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-purple-400"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  />
                  <span className="text-purple-100 text-sm font-['Inter']">Extracting records&hellip;</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LAYER 3: Grid structure overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: gridOpacity }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        >
          <div className="absolute inset-[6%] border border-purple-300/40 rounded-lg" />
          {[0.16, 0.26, 0.36, 0.46, 0.56, 0.66, 0.76, 0.86].map((y, i) => (
            <motion.div
              key={`h-${y}`}
              className="absolute left-[6%] right-[6%] h-px bg-purple-300/30"
              style={{ top: `${y * 100}%` }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: gridOpacity > 0 ? 1 : 0 }}
              transition={{ duration: 0.35, delay: i * 0.04, ease: 'easeOut' }}
            />
          ))}
          {[0.18, 0.32, 0.48, 0.64, 0.80].map((x, i) => (
            <motion.div
              key={`v-${x}`}
              className="absolute top-[6%] bottom-[6%] w-px bg-purple-300/25"
              style={{ left: `${x * 100}%` }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: gridOpacity > 0 ? 1 : 0 }}
              transition={{ duration: 0.35, delay: 0.15 + i * 0.04, ease: 'easeOut' }}
            />
          ))}
          <motion.div
            className="absolute inset-[6%] bg-white dark:bg-gray-900 rounded-lg -z-[1]"
            animate={{ opacity: state === 'structuring' ? 0.6 : state === 'digital' ? 1 : 0 }}
            transition={{ duration: 0.6 }}
          />
          {state === 'structuring' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-5 py-2.5 rounded-full border border-purple-500/20 z-10"
            >
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-purple-400"
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                />
                <span className="text-purple-100 text-sm font-['Inter']">Structuring data&hellip;</span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* LAYER 4: Enhanced Record Viewer */}
        <motion.div
          className="absolute inset-0 bg-white dark:bg-gray-900 overflow-auto"
          animate={{ opacity: tableOpacity }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          style={{ pointerEvents: state === 'digital' ? 'auto' : 'none' }}
        >
          {(state === 'digital' || !animated) && <DigitalContent type={activeType} />}
        </motion.div>

        {/* State indicator dots */}
        {animated && (
          <div className="absolute top-4 right-4 flex gap-1.5 z-10">
            {(['idle', 'scanning', 'structuring', 'digital'] as TransformState[]).map((s) => {
              const order: TransformState[] = ['idle', 'scanning', 'structuring', 'digital'];
              const cur = order.indexOf(state);
              const idx = order.indexOf(s);
              return (
                <div
                  key={s}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    idx === cur ? 'bg-purple-400 scale-125' : idx < cur ? 'bg-purple-400/50' : 'bg-white/20'
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Instruction text (full variant only) */}
      {!isCompact && animated && showCards && (
        <p className="text-center text-purple-300/40 text-xs mt-4 font-['Inter']">
          Hover or click a record type to see the transformation &middot; Click again to reset
        </p>
      )}
    </div>
  );
}
