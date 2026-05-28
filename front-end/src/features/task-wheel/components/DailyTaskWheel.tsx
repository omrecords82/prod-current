import { useEffect, useMemo, useRef, useState } from 'react';
import type { DayCapacity, DifficultyMix, Task } from './OMDailyTaskWheelPlanner';
import {
  Play,
  Shuffle,
  ListChecks,
  CheckCircle2,
  AlertTriangle,
  Layers,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

interface DailyTaskWheelProps {
  currentStep: 1 | 2 | 3;
  capacity: DayCapacity;
  selectedDay: string;
  taskCount: number | null;
  difficultyMix: DifficultyMix | null;
  availableTasks: Task[];
  assignedTaskCount: number;
  isSpinning: boolean;
  setIsSpinning: (spinning: boolean) => void;
  onTaskCountSpin: (count: number) => void;
  onDifficultyMixSpin: (mix: DifficultyMix) => void;
  onTaskAssignment: (tasks: Task[]) => void;
}

const DIFFICULTY_COLORS = {
  Difficult: '#dc2626',
  Medium: '#ea580c',
  Easy: '#16a34a',
};

const AUTO_ADVANCE_SECONDS = 3;
const SPIN_DURATION_MS = 2500;

interface MixOption {
  difficult: number;
  medium: number;
  easy: number;
  label: string;
}

function generateDifficultyMixes(count: number, capacity: DayCapacity): MixOption[] {
  const mixes: MixOption[] = [];
  for (let d = 0; d <= Math.min(count, capacity.difficultCap); d++) {
    for (let m = 0; m <= Math.min(count - d, capacity.mediumCap); m++) {
      const e = count - d - m;
      if (e >= 0 && e <= capacity.easyCap) {
        mixes.push({
          difficult: d,
          medium: m,
          easy: e,
          label: `${d}D · ${m}M · ${e}E`,
        });
      }
    }
  }
  return mixes;
}

// Curate down to a small, balanced, readable set of options (max 6).
// Strategy: always include the most-difficult, most-medium, most-easy, and a
// balanced mid-mix; then sample evenly across remaining options.
function curateDifficultyMixes(all: MixOption[], maxOptions = 6): MixOption[] {
  if (all.length <= maxOptions) return all;

  const sorted = [...all].sort((a, b) => {
    if (b.difficult !== a.difficult) return b.difficult - a.difficult;
    if (b.medium !== a.medium) return b.medium - a.medium;
    return b.easy - a.easy;
  });

  const picked: MixOption[] = [];
  const seen = new Set<string>();
  const add = (m: MixOption | undefined) => {
    if (!m) return;
    const k = `${m.difficult}-${m.medium}-${m.easy}`;
    if (seen.has(k)) return;
    seen.add(k);
    picked.push(m);
  };

  // Anchors
  add(sorted.find((m) => m.difficult === Math.max(...sorted.map((x) => x.difficult))));
  add(sorted.find((m) => m.easy === Math.max(...sorted.map((x) => x.easy))));
  add(sorted.find((m) => m.medium === Math.max(...sorted.map((x) => x.medium))));
  // Balanced: minimum variance between D/M/E
  const balanced = [...sorted].sort((a, b) => {
    const va = Math.max(a.difficult, a.medium, a.easy) - Math.min(a.difficult, a.medium, a.easy);
    const vb = Math.max(b.difficult, b.medium, b.easy) - Math.min(b.difficult, b.medium, b.easy);
    return va - vb;
  })[0];
  add(balanced);

  // Fill remaining by evenly sampling across the sorted list
  const remaining = sorted.filter((m) => !seen.has(`${m.difficult}-${m.medium}-${m.easy}`));
  const needed = maxOptions - picked.length;
  if (needed > 0 && remaining.length > 0) {
    const step = Math.max(1, Math.floor(remaining.length / needed));
    for (let i = 0; i < remaining.length && picked.length < maxOptions; i += step) {
      add(remaining[i]);
    }
  }

  // Final sort for visual order: by difficult desc, then medium desc
  return picked
    .slice(0, maxOptions)
    .sort((a, b) => b.difficult - a.difficult || b.medium - a.medium || b.easy - a.easy);
}

function filterEligible(tasks: Task[], difficulty: 'Difficult' | 'Medium' | 'Easy') {
  return tasks.filter(
    (t) => t.difficulty === difficulty && t.status !== 'Blocked',
  );
}

function priorityRank(p: Task['priority']) {
  return p === 'High' ? 0 : p === 'Medium' ? 1 : 2;
}

function pickTasks(pool: Task[], n: number): Task[] {
  if (n <= 0) return [];
  const sorted = [...pool].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
  return sorted.slice(0, n);
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function DailyTaskWheel({
  currentStep,
  capacity,
  selectedDay,
  taskCount,
  difficultyMix,
  availableTasks,
  assignedTaskCount,
  isSpinning,
  setIsSpinning,
  onTaskCountSpin,
  onDifficultyMixSpin,
  onTaskAssignment,
}: DailyTaskWheelProps) {
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Pending result — set when the wheel stops, cleared on advance/respin
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [pendingMix, setPendingMix] = useState<MixOption | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Step-3 assignment confirmation
  const [assignmentConfirmed, setAssignmentConfirmed] = useState(false);

  useEffect(() => {
    setRotation(0);
    setPendingCount(null);
    setPendingMix(null);
    setSelectedIndex(null);
    setCountdown(null);
    setAssignmentConfirmed(false);
  }, [currentStep]);

  // Auto-advance countdown for steps 1 and 2
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      commitPending();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  const countSegments = useMemo(() => {
    const arr: number[] = [];
    for (let i = 1; i <= capacity.maxTasks; i++) arr.push(i);
    return arr;
  }, [capacity.maxTasks]);

  const mixSegments = useMemo(() => {
    if (currentStep !== 2 || !taskCount) return [] as MixOption[];
    return curateDifficultyMixes(generateDifficultyMixes(taskCount, capacity), 6);
  }, [currentStep, taskCount, capacity]);

  const eligiblePool = useMemo(
    () => ({
      Difficult: filterEligible(availableTasks, 'Difficult'),
      Medium: filterEligible(availableTasks, 'Medium'),
      Easy: filterEligible(availableTasks, 'Easy'),
    }),
    [availableTasks],
  );

  const [suggested, setSuggested] = useState<{
    Difficult: Task[];
    Medium: Task[];
    Easy: Task[];
  }>({ Difficult: [], Medium: [], Easy: [] });

  useEffect(() => {
    if (currentStep === 3 && difficultyMix) {
      setSuggested({
        Difficult: pickTasks(eligiblePool.Difficult, difficultyMix.difficult),
        Medium: pickTasks(eligiblePool.Medium, difficultyMix.medium),
        Easy: pickTasks(eligiblePool.Easy, difficultyMix.easy),
      });
    }
  }, [currentStep, difficultyMix]); // eslint-disable-line react-hooks/exhaustive-deps

  // Draw wheel
  useEffect(() => {
    if (currentStep === 3) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 12;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const count = currentStep === 1 ? countSegments.length : mixSegments.length;
    if (count === 0) {
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#64748b';
      ctx.font = '14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('No valid options', centerX, centerY);
      return;
    }
    const anglePerSegment = (2 * Math.PI) / count;

    for (let i = 0; i < count; i++) {
      const startAngle = i * anglePerSegment;
      const endAngle = startAngle + anglePerSegment;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      if (currentStep === 1) {
        ctx.fillStyle = i % 2 === 0 ? '#1e293b' : '#334155';
        ctx.fill();
      } else {
        const mix = mixSegments[i];
        const total = mix.difficult + mix.medium + mix.easy || 1;
        const subAngles = [
          { color: DIFFICULTY_COLORS.Difficult, frac: mix.difficult / total },
          { color: DIFFICULTY_COLORS.Medium, frac: mix.medium / total },
          { color: DIFFICULTY_COLORS.Easy, frac: mix.easy / total },
        ];
        let cur = startAngle;
        for (const s of subAngles) {
          if (s.frac <= 0) continue;
          const next = cur + s.frac * anglePerSegment;
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.arc(centerX, centerY, radius, cur, next);
          ctx.closePath();
          ctx.fillStyle = s.color;
          ctx.fill();
          cur = next;
        }
      }

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.stroke();
    }

    // Highlight selected slice with a glowing outline
    if (selectedIndex !== null) {
      const startAngle = selectedIndex * anglePerSegment;
      const endAngle = startAngle + anglePerSegment;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }

    // Labels — upright, horizontal, inside a pill for readability
    for (let i = 0; i < count; i++) {
      const midAngle = i * anglePerSegment + anglePerSegment / 2;
      const labelRadius = currentStep === 1 ? radius * 0.72 : radius * 0.68;
      const x = centerX + Math.cos(midAngle) * labelRadius;
      const y = centerY + Math.sin(midAngle) * labelRadius;

      ctx.save();

      if (currentStep === 1) {
        // Step 1 numbers are rendered as DOM badges over the canvas so they
        // always stay upright. Nothing is drawn on the canvas for these labels.
        ctx.restore();
        continue;
      } else {
        // Step 2: draw a horizontal pill badge with the mix label
        const label = mixSegments[i].label;
        ctx.font = '600 13px system-ui';
        const metrics = ctx.measureText(label);
        const padX = 10;
        const padY = 6;
        const w = metrics.width + padX * 2;
        const h = 24;
        const rx = h / 2;
        const bx = x - w / 2;
        const by = y - h / 2;

        // Pill background
        ctx.beginPath();
        ctx.moveTo(bx + rx, by);
        ctx.lineTo(bx + w - rx, by);
        ctx.arcTo(bx + w, by, bx + w, by + rx, rx);
        ctx.lineTo(bx + w, by + h - rx);
        ctx.arcTo(bx + w, by + h, bx + w - rx, by + h, rx);
        ctx.lineTo(bx + rx, by + h);
        ctx.arcTo(bx, by + h, bx, by + h - rx, rx);
        ctx.lineTo(bx, by + rx);
        ctx.arcTo(bx, by, bx + rx, by, rx);
        ctx.closePath();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y + 0.5);
        padY; // referenced
      }
      ctx.restore();
    }

    // Center hub
    ctx.beginPath();
    ctx.arc(centerX, centerY, 38, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [currentStep, countSegments, mixSegments, selectedIndex]);

  const handleSpin = () => {
    if (isSpinning || pendingCount !== null || pendingMix !== null) return;
    const segCount = currentStep === 1 ? countSegments.length : mixSegments.length;
    if (segCount === 0) return;

    setIsSpinning(true);
    setSelectedIndex(null);

    const spins = 4 + Math.random() * 2;
    const finalRotation = rotation + spins * 360 + Math.random() * 360;
    setRotation(finalRotation);

    setTimeout(() => {
      const anglePerSegment = 360 / segCount;
      const normalized = ((finalRotation % 360) + 360) % 360;
      const pointerAngle = (270 - normalized + 360) % 360;
      const idx = Math.floor(pointerAngle / anglePerSegment) % segCount;

      setIsSpinning(false);
      setSelectedIndex(idx);

      if (currentStep === 1) {
        setPendingCount(countSegments[idx]);
      } else {
        setPendingMix(mixSegments[idx]);
      }
      setCountdown(AUTO_ADVANCE_SECONDS);
    }, SPIN_DURATION_MS);
  };

  const commitPending = () => {
    setCountdown(null);
    if (currentStep === 1 && pendingCount !== null) {
      onTaskCountSpin(pendingCount);
    } else if (currentStep === 2 && pendingMix) {
      onDifficultyMixSpin({
        difficult: pendingMix.difficult,
        medium: pendingMix.medium,
        easy: pendingMix.easy,
      });
    }
  };

  const handleRespin = () => {
    setPendingCount(null);
    setPendingMix(null);
    setSelectedIndex(null);
    setCountdown(null);
  };

  const handleReshuffle = () => {
    if (!difficultyMix) return;
    setSuggested({
      Difficult: pickTasks(shuffleArray(eligiblePool.Difficult), difficultyMix.difficult),
      Medium: pickTasks(shuffleArray(eligiblePool.Medium), difficultyMix.medium),
      Easy: pickTasks(shuffleArray(eligiblePool.Easy), difficultyMix.easy),
    });
  };

  const handleAssign = () => {
    const all = [...suggested.Difficult, ...suggested.Medium, ...suggested.Easy];
    onTaskAssignment(all);
    setAssignmentConfirmed(true);
  };

  const eligibleCount =
    eligiblePool.Difficult.length + eligiblePool.Medium.length + eligiblePool.Easy.length;

  const suggestedCount =
    suggested.Difficult.length + suggested.Medium.length + suggested.Easy.length;

  const canAssign =
    !!difficultyMix &&
    suggested.Difficult.length === difficultyMix.difficult &&
    suggested.Medium.length === difficultyMix.medium &&
    suggested.Easy.length === difficultyMix.easy;

  const stepLabels = ['Task Count', 'Difficulty Mix', 'Assign Tasks'];

  // Trail values — what's been decided so far
  const trail = {
    1: taskCount !== null ? `${taskCount} tasks` : null,
    2: difficultyMix ? `${difficultyMix.difficult}D · ${difficultyMix.medium}M · ${difficultyMix.easy}E` : null,
    3: assignmentConfirmed || assignedTaskCount > 0 ? 'Assigned' : null,
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      {/* Stepper with trail */}
      <div className="flex items-start justify-center gap-3 mb-6">
        {[1, 2, 3].map((step, idx) => {
          const trailValue = trail[step as 1 | 2 | 3];
          return (
            <div key={step} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      currentStep > step || (step === 3 && assignmentConfirmed)
                        ? 'bg-emerald-600 text-white'
                        : currentStep === step
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {(currentStep > step || (step === 3 && assignmentConfirmed)) ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      step
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      currentStep >= step ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    {stepLabels[idx]}
                  </span>
                </div>
                {trailValue && (
                  <span className="mt-1 text-xs text-slate-500 font-medium">{trailValue}</span>
                )}
              </div>
              {idx < 2 && <div className="w-8 h-px bg-slate-300 mt-3.5" />}
            </div>
          );
        })}
      </div>

      {currentStep === 1 && (
        <StepHeader
          title="Step 1 — Task Count"
          description={`How many tasks for today? Showing valid counts 1–${capacity.maxTasks} for ${selectedDay}.`}
        />
      )}
      {currentStep === 2 && (
        <StepHeader
          title="Step 2 — Difficulty Mix"
          description="Spin to choose a valid Difficult / Medium / Easy split that respects today's caps."
        />
      )}
      {currentStep === 3 && (
        <StepHeader
          title="Step 3 — Assign Tasks"
          description="Tasks are assigned only from eligible items that fit today's capacity and difficulty limits."
        />
      )}

      {/* Steps 1 & 2: Wheel + Result */}
      {currentStep !== 3 && (
        <>
          {currentStep === 2 && taskCount && (
            <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white text-xs font-semibold">
                Task Count: {taskCount}
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
                {selectedDay} Rules: max {capacity.difficultCap} Difficult · {capacity.mediumCap} Medium · {capacity.easyCap} Easy
              </span>
              <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                {mixSegments.length} valid mix {mixSegments.length === 1 ? 'option' : 'options'}
              </span>
            </div>
          )}
          <div className="relative flex justify-center mb-4">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
              <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-red-600 drop-shadow" />
            </div>
            <div className="relative" style={{ width: 400, height: 400 }}>
              <canvas
                ref={canvasRef}
                width={400}
                height={400}
                style={{
                  transition: isSpinning
                    ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)`
                    : 'none',
                  transform: `rotate(${rotation}deg)`,
                }}
              />

              {currentStep === 1 && (
                <div className="absolute inset-0 pointer-events-none">
                  {countSegments.map((n, i) => {
                    const segs = countSegments.length;
                    const angle = (360 / segs) * i + 360 / segs / 2;
                    const totalRot = rotation + angle;
                    const radius = 140;
                    const isSelected = selectedIndex === i;
                    return (
                      <div
                        key={n}
                        className="absolute top-1/2 left-1/2"
                        style={{
                          transform: `translate(-50%, -50%) rotate(${totalRot}deg) translate(0, -${radius}px) rotate(${-totalRot}deg)`,
                          transition: isSpinning
                            ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)`
                            : 'none',
                        }}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                            isSelected
                              ? 'bg-amber-300 border-amber-500 text-slate-900 shadow-lg ring-4 ring-amber-200/60 scale-110'
                              : 'bg-white border-slate-300 text-slate-900 shadow-md'
                          }`}
                          style={{
                            fontSize: 20,
                            fontWeight: 600,
                            lineHeight: 1,
                          }}
                        >
                          {n}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {currentStep === 2 && (
            <div className="flex items-center justify-center gap-4 mb-4 text-xs text-slate-600">
              <LegendDot color={DIFFICULTY_COLORS.Difficult} label="Difficult" />
              <LegendDot color={DIFFICULTY_COLORS.Medium} label="Medium" />
              <LegendDot color={DIFFICULTY_COLORS.Easy} label="Easy" />
            </div>
          )}

          {/* Spin button — hidden once a pending result exists */}
          {pendingCount === null && pendingMix === null && (
            <button
              onClick={handleSpin}
              disabled={isSpinning || (currentStep === 2 && mixSegments.length === 0)}
              className="w-full py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Play className="w-4 h-4" />
              {isSpinning
                ? 'Spinning...'
                : currentStep === 1
                ? 'Spin for Task Count'
                : 'Spin for Difficulty Mix'}
            </button>
          )}

          {/* Result card — animated in */}
          {currentStep === 1 && pendingCount !== null && (
            <ResultCard
              countdown={countdown}
              onContinue={commitPending}
              onRespin={handleRespin}
              continueLabel="Continue to Difficulty Mix"
            >
              <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold mb-2">
                <CheckCircle2 className="w-4 h-4" /> SPIN RESULT
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-1">
                Today's task count: {pendingCount}
              </div>
              <div className="text-sm text-slate-600">
                You'll be assigned up to {pendingCount} {pendingCount === 1 ? 'task' : 'tasks'} today.
              </div>
            </ResultCard>
          )}

          {currentStep === 2 && pendingMix && (
            <ResultCard
              countdown={countdown}
              onContinue={commitPending}
              onRespin={handleRespin}
              continueLabel="Continue to Assign Tasks"
            >
              <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold mb-2">
                <CheckCircle2 className="w-4 h-4" /> DIFFICULTY MIX SELECTED
              </div>
              <div className="flex items-center gap-2 mb-2">
                <ColoredChip color={DIFFICULTY_COLORS.Difficult}>
                  {pendingMix.difficult} Difficult
                </ColoredChip>
                <span className="text-slate-400">·</span>
                <ColoredChip color={DIFFICULTY_COLORS.Medium}>
                  {pendingMix.medium} Medium
                </ColoredChip>
                <span className="text-slate-400">·</span>
                <ColoredChip color={DIFFICULTY_COLORS.Easy}>
                  {pendingMix.easy} Easy
                </ColoredChip>
              </div>
              <div className="text-sm text-slate-600">
                This mix fits {selectedDay}'s capacity rules.
              </div>
            </ResultCard>
          )}
        </>
      )}

      {/* Step 3: Assignment Review or Confirmation */}
      {currentStep === 3 && difficultyMix && (
        <div className="space-y-5">
          {assignmentConfirmed ? (
            <div className="animate-result-in p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-600 rounded-full mb-3 animate-pulse-once">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <div className="text-xl font-bold text-slate-900 mb-1">Tasks assigned</div>
              <div className="text-sm text-slate-600 mb-4">
                {suggestedCount} {suggestedCount === 1 ? 'task' : 'tasks'} assigned from{' '}
                {eligibleCount} eligible {eligibleCount === 1 ? 'task' : 'tasks'}.
              </div>
              <div className="flex items-center justify-center gap-2">
                <ColoredChip color={DIFFICULTY_COLORS.Difficult}>
                  {suggested.Difficult.length} Difficult
                </ColoredChip>
                <ColoredChip color={DIFFICULTY_COLORS.Medium}>
                  {suggested.Medium.length} Medium
                </ColoredChip>
                <ColoredChip color={DIFFICULTY_COLORS.Easy}>
                  {suggested.Easy.length} Easy
                </ColoredChip>
              </div>
              <div className="mt-4 text-xs text-slate-500 flex items-center justify-center gap-1.5">
                <ArrowRight className="w-3 h-3" />
                Today's Assigned Tasks panel has been updated.
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <SummaryCard
                  icon={<ListChecks className="w-4 h-4" />}
                  label="Today's count"
                  value={`${taskCount ?? 0} tasks`}
                />
                <SummaryCard
                  icon={<Layers className="w-4 h-4" />}
                  label="Difficulty mix"
                  value={
                    <span className="flex items-center gap-1.5 text-sm">
                      <Pill color={DIFFICULTY_COLORS.Difficult}>{difficultyMix.difficult}D</Pill>
                      <Pill color={DIFFICULTY_COLORS.Medium}>{difficultyMix.medium}M</Pill>
                      <Pill color={DIFFICULTY_COLORS.Easy}>{difficultyMix.easy}E</Pill>
                    </span>
                  }
                />
                <SummaryCard
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  label="Eligible pool"
                  value={`${eligibleCount} tasks`}
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                Tasks are assigned only from eligible items that fit today's capacity and
                difficulty limits.
              </div>

              <div className="space-y-4">
                <SuggestionGroup
                  title="Difficult Tasks"
                  color={DIFFICULTY_COLORS.Difficult}
                  expected={difficultyMix.difficult}
                  tasks={suggested.Difficult}
                  eligibleTotal={eligiblePool.Difficult.length}
                />
                <SuggestionGroup
                  title="Medium Tasks"
                  color={DIFFICULTY_COLORS.Medium}
                  expected={difficultyMix.medium}
                  tasks={suggested.Medium}
                  eligibleTotal={eligiblePool.Medium.length}
                />
                <SuggestionGroup
                  title="Easy Tasks"
                  color={DIFFICULTY_COLORS.Easy}
                  expected={difficultyMix.easy}
                  tasks={suggested.Easy}
                  eligibleTotal={eligiblePool.Easy.length}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleAssign}
                  disabled={!canAssign || suggestedCount === 0}
                  className="flex-1 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Assign Tasks
                </button>
                <button
                  onClick={handleReshuffle}
                  className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Shuffle className="w-4 h-4" />
                  Reshuffle Eligible Tasks
                </button>
              </div>

              {!canAssign && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Not enough eligible tasks to satisfy the selected mix. Reshuffle or expand the
                  pool.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Local animations */}
      <style>{`
        @keyframes resultIn {
          0% { opacity: 0; transform: scale(0.96) translateY(6px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-result-in { animation: resultIn 360ms cubic-bezier(0.22, 1, 0.36, 1); }
        @keyframes pulseOnce {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.55); }
          70% { box-shadow: 0 0 0 14px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .animate-pulse-once { animation: pulseOnce 1.1s ease-out; }
      `}</style>
    </div>
  );
}

function ResultCard({
  children,
  countdown,
  onContinue,
  onRespin,
  continueLabel,
}: {
  children: React.ReactNode;
  countdown: number | null;
  onContinue: () => void;
  onRespin: () => void;
  continueLabel: string;
}) {
  return (
    <div className="mt-4 p-4 bg-white border-2 border-emerald-300 rounded-xl shadow-sm animate-result-in">
      {children}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={onRespin}
          className="px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Respin
        </button>
        <button
          onClick={onContinue}
          className="flex-1 px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
        >
          <span>{continueLabel}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
      {countdown !== null && countdown > 0 && (
        <div className="mt-2 text-center text-xs text-slate-500">
          Next step starts in {countdown}s
        </div>
      )}

      <style>{`
        @keyframes resultIn {
          0% { opacity: 0; transform: scale(0.96) translateY(6px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-result-in { animation: resultIn 360ms cubic-bezier(0.22, 1, 0.36, 1); }
      `}</style>
    </div>
  );
}

function StepHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center mb-5">
      <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-600 max-w-md mx-auto">{description}</p>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}

function ColoredChip({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="px-2 py-0.5 rounded-md text-white text-xs font-semibold"
      style={{ backgroundColor: color }}
    >
      {children}
    </span>
  );
}

function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="px-1.5 py-0.5 rounded text-white font-semibold text-xs"
      style={{ backgroundColor: color }}
    >
      {children}
    </span>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function SuggestionGroup({
  title,
  color,
  expected,
  tasks,
  eligibleTotal,
}: {
  title: string;
  color: string;
  expected: number;
  tasks: Task[];
  eligibleTotal: number;
}) {
  if (expected === 0) {
    return (
      <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-sm font-semibold text-slate-700">{title}</span>
          </div>
          <span className="text-xs text-slate-500">0 selected for today</span>
        </div>
      </div>
    );
  }

  const short = tasks.length < expected;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-slate-200"
        style={{ backgroundColor: `${color}10` }}
      >
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-semibold text-slate-900">{title}</span>
          <span className="text-xs text-slate-500">
            {tasks.length} / {expected} selected · {eligibleTotal} eligible
          </span>
        </div>
        {short && <span className="text-xs font-medium text-amber-700">Insufficient eligible</span>}
      </div>
      <div className="divide-y divide-slate-100">
        {tasks.map((task) => (
          <div key={task.id} className="px-3 py-2.5 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-900 truncate">{task.title}</div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                <span
                  className="px-1.5 py-0.5 rounded text-white font-medium"
                  style={{ backgroundColor: color }}
                >
                  {task.difficulty}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded font-medium ${
                    task.priority === 'High'
                      ? 'bg-rose-100 text-rose-700'
                      : task.priority === 'Medium'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {task.priority}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                  {task.status}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                  {task.system}
                </span>
                <span className="text-slate-500">· {task.effort}</span>
              </div>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="px-3 py-4 text-xs text-slate-500 text-center">
            No eligible tasks available for this difficulty.
          </div>
        )}
      </div>
    </div>
  );
}
