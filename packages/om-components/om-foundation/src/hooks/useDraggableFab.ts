import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { loadUiPreferences, saveUiPreferences } from '@/api/uiPreferences';
import type { FabPosition } from '@/api/uiPreferences';

const DRAG_THRESHOLD = 5; // px — below this is a click, not a drag
const LS_PREFIX = 'orthodoxmetrics-fab-pos-';

interface UseDraggableFabOptions {
  fabId: string;
  defaultRight: number;
  defaultBottom: number;
}

interface UseDraggableFabReturn {
  /** Spread onto the draggable element */
  dragProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    ref: React.RefObject<HTMLElement | null>;
  };
  /** sx/style values to apply for positioning */
  positionSx: {
    position: 'fixed';
    right: number;
    bottom: number;
    cursor: 'grab' | 'grabbing';
    touchAction: 'none';
    userSelect: 'none';
  };
  /** Wraps an onClick handler to suppress it if a drag just occurred */
  wrapClick: <T extends (...args: any[]) => void>(handler: T) => T;
  isDragging: boolean;
}

export function useDraggableFab({
  fabId,
  defaultRight,
  defaultBottom,
}: UseDraggableFabOptions): UseDraggableFabReturn {
  const { user } = useAuth();
  const elRef = useRef<HTMLElement | null>(null);

  // Position state
  const [position, setPosition] = useState<FabPosition>(() => {
    // Try localStorage for instant restore
    try {
      const stored = localStorage.getItem(`${LS_PREFIX}${fabId}`);
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return { right: defaultRight, bottom: defaultBottom };
  });

  const [isDragging, setIsDragging] = useState(false);
  const hadDragRef = useRef(false);
  const dragStartRef = useRef({ clientX: 0, clientY: 0 });
  const offsetRef = useRef({ fromRight: 0, fromBottom: 0 });

  // Load from API on mount (if authenticated), overriding localStorage
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    loadUiPreferences()
      .then((prefs) => {
        if (cancelled) return;
        const saved = prefs.fabPositions?.[fabId];
        if (saved && typeof saved.right === 'number' && typeof saved.bottom === 'number') {
          setPosition(saved);
          localStorage.setItem(`${LS_PREFIX}${fabId}`, JSON.stringify(saved));
        }
      })
      .catch(() => { /* localStorage fallback already applied */ });
    return () => { cancelled = true; };
  }, [user?.id, fabId]);

  // Persist to both localStorage and API
  const persistPosition = useCallback((pos: FabPosition) => {
    localStorage.setItem(`${LS_PREFIX}${fabId}`, JSON.stringify(pos));
    if (!user?.id) return;

    // Merge with existing preferences so we don't clobber other FAB positions
    loadUiPreferences()
      .then((prefs) => {
        const merged = {
          ...prefs,
          fabPositions: {
            ...prefs.fabPositions,
            [fabId]: pos,
          },
        };
        return saveUiPreferences(merged);
      })
      .catch((err) => console.warn('[useDraggableFab] save failed:', err));
  }, [fabId, user?.id]);

  // Clamp position to viewport
  const clamp = useCallback((right: number, bottom: number): FabPosition => {
    const el = elRef.current;
    const w = el?.offsetWidth ?? 56;
    const h = el?.offsetHeight ?? 56;
    return {
      right: Math.max(0, Math.min(right, window.innerWidth - w)),
      bottom: Math.max(0, Math.min(bottom, window.innerHeight - h)),
    };
  }, []);

  // --- Drag handlers ---

  const handleMove = useCallback((clientX: number, clientY: number) => {
    const dx = clientX - dragStartRef.current.clientX;
    const dy = clientY - dragStartRef.current.clientY;
    if (!hadDragRef.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      hadDragRef.current = true;
    }
    if (!hadDragRef.current) return;

    // Convert client coords to right/bottom
    const el = elRef.current;
    const w = el?.offsetWidth ?? 56;
    const h = el?.offsetHeight ?? 56;
    const newRight = window.innerWidth - clientX - offsetRef.current.fromRight;
    const newBottom = window.innerHeight - clientY - offsetRef.current.fromBottom;
    setPosition(clamp(newRight, newBottom));
  }, [clamp]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    if (hadDragRef.current) {
      // Persist after drag
      setPosition((pos) => {
        persistPosition(pos);
        return pos;
      });
    }
    // Reset hadDragRef after a microtask so wrapClick can read it
    setTimeout(() => { hadDragRef.current = false; }, 0);
  }, [persistPosition]);

  // Attach/detach global listeners
  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onMouseUp = () => handleEnd();
    const onTouchEnd = () => handleEnd();

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, handleMove, handleEnd]);

  // Re-clamp on resize
  useEffect(() => {
    const onResize = () => setPosition((p) => clamp(p.right, p.bottom));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clamp]);

  const startDrag = useCallback((clientX: number, clientY: number) => {
    const el = elRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // How far from the pointer to the right/bottom edges of the element
    offsetRef.current = {
      fromRight: rect.right - clientX,
      fromBottom: rect.bottom - clientY,
    };
    dragStartRef.current = { clientX, clientY };
    hadDragRef.current = false;
    setIsDragging(true);
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // left-click only
    startDrag(e.clientX, e.clientY);
  }, [startDrag]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    startDrag(e.touches[0].clientX, e.touches[0].clientY);
  }, [startDrag]);

  const wrapClick = useCallback(<T extends (...args: any[]) => void>(handler: T): T => {
    return ((...args: any[]) => {
      if (hadDragRef.current) return;
      handler(...args);
    }) as T;
  }, []);

  return {
    dragProps: {
      onMouseDown,
      onTouchStart,
      ref: elRef,
    },
    positionSx: {
      position: 'fixed' as const,
      right: position.right,
      bottom: position.bottom,
      cursor: isDragging ? 'grabbing' : 'grab',
      touchAction: 'none' as const,
      userSelect: 'none' as const,
    },
    wrapClick,
    isDragging,
  };
}
