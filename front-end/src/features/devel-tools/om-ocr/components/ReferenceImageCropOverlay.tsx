/**
 * Interactive crop overlay — draggable/resizable selection with dimmed margins.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Typography,
} from '@mui/material';
import { IconCheck } from '@tabler/icons-react';

export type FractionRect = { x: number; y: number; w: number; h: number };

type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move';

interface ReferenceImageCropOverlayProps {
  displayWidth: number;
  displayHeight: number;
  naturalWidth: number;
  naturalHeight: number;
  initialRect: FractionRect;
  applying?: boolean;
  onApply: (rect: FractionRect) => void;
  onCancel: () => void;
}

const MIN_FRAC = 0.03;

function clampRect(rect: FractionRect): FractionRect {
  let { x, y, w, h } = rect;
  w = Math.max(MIN_FRAC, Math.min(1, w));
  h = Math.max(MIN_FRAC, Math.min(1, h));
  x = Math.max(0, Math.min(1 - w, x));
  y = Math.max(0, Math.min(1 - h, y));
  return { x, y, w, h };
}

function fracToPx(rect: FractionRect, dw: number, dh: number) {
  return {
    left: rect.x * dw,
    top: rect.y * dh,
    width: rect.w * dw,
    height: rect.h * dh,
  };
}

const HANDLES: HandleId[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

function handleCursor(handle: HandleId): string {
  switch (handle) {
    case 'nw':
    case 'se':
      return 'nwse-resize';
    case 'ne':
    case 'sw':
      return 'nesw-resize';
    case 'n':
    case 's':
      return 'ns-resize';
    case 'e':
    case 'w':
      return 'ew-resize';
    default:
      return 'move';
  }
}

function handlePosition(handle: HandleId, px: ReturnType<typeof fracToPx>) {
  const cx = px.left + px.width / 2;
  const cy = px.top + px.height / 2;
  switch (handle) {
    case 'nw': return { left: px.left, top: px.top };
    case 'n': return { left: cx, top: px.top };
    case 'ne': return { left: px.left + px.width, top: px.top };
    case 'e': return { left: px.left + px.width, top: cy };
    case 'se': return { left: px.left + px.width, top: px.top + px.height };
    case 's': return { left: cx, top: px.top + px.height };
    case 'sw': return { left: px.left, top: px.top + px.height };
    case 'w': return { left: px.left, top: cy };
    default: return { left: cx, top: cy };
  }
}

function applyDrag(
  startRect: FractionRect,
  handle: HandleId,
  dxFrac: number,
  dyFrac: number,
): FractionRect {
  let { x, y, w, h } = startRect;
  const right = x + w;
  const bottom = y + h;

  if (handle === 'move') {
    return clampRect({ x: x + dxFrac, y: y + dyFrac, w, h });
  }
  if (handle.includes('w')) {
    x = Math.min(x + dxFrac, right - MIN_FRAC);
    w = right - x;
  }
  if (handle.includes('e')) {
    w = Math.max(MIN_FRAC, w + dxFrac);
  }
  if (handle.includes('n')) {
    y = Math.min(y + dyFrac, bottom - MIN_FRAC);
    h = bottom - y;
  }
  if (handle.includes('s')) {
    h = Math.max(MIN_FRAC, h + dyFrac);
  }
  return clampRect({ x, y, w, h });
}

const ReferenceImageCropOverlay: React.FC<ReferenceImageCropOverlayProps> = ({
  displayWidth,
  displayHeight,
  naturalWidth,
  naturalHeight,
  initialRect,
  applying = false,
  onApply,
  onCancel,
}) => {
  const [rect, setRect] = useState<FractionRect>(() => clampRect(initialRect));
  const dragRef = useRef<{
    handle: HandleId;
    startX: number;
    startY: number;
    startRect: FractionRect;
  } | null>(null);

  useEffect(() => {
    setRect(clampRect(initialRect));
  }, [initialRect]);

  const px = fracToPx(rect, displayWidth, displayHeight);
  const cropPxW = Math.round(rect.w * naturalWidth);
  const cropPxH = Math.round(rect.h * naturalHeight);

  const onPointerDown = useCallback((handle: HandleId) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startRect: rect,
    };
  }, [rect]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || displayWidth <= 0 || displayHeight <= 0) return;
    const dxFrac = (e.clientX - drag.startX) / displayWidth;
    const dyFrac = (e.clientY - drag.startY) / displayHeight;
    setRect(applyDrag(drag.startRect, drag.handle, dxFrac, dyFrac));
  }, [displayWidth, displayHeight]);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  return (
    <Box
      sx={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: displayWidth,
        height: displayHeight,
        zIndex: 8,
        touchAction: 'none',
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* Dimmed mask */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: displayWidth,
          height: displayHeight,
          pointerEvents: 'none',
        }}
      >
        <Box sx={{ position: 'absolute', left: 0, top: 0, width: displayWidth, height: px.top, bgcolor: 'rgba(0,0,0,0.55)' }} />
        <Box sx={{ position: 'absolute', left: 0, top: px.top + px.height, width: displayWidth, height: displayHeight - px.top - px.height, bgcolor: 'rgba(0,0,0,0.55)' }} />
        <Box sx={{ position: 'absolute', left: 0, top: px.top, width: px.left, height: px.height, bgcolor: 'rgba(0,0,0,0.55)' }} />
        <Box sx={{ position: 'absolute', left: px.left + px.width, top: px.top, width: displayWidth - px.left - px.width, height: px.height, bgcolor: 'rgba(0,0,0,0.55)' }} />
      </Box>

      {/* Selection */}
      <Box
        onPointerDown={onPointerDown('move')}
        sx={{
          position: 'absolute',
          left: px.left,
          top: px.top,
          width: px.width,
          height: px.height,
          border: '2px solid',
          borderColor: 'primary.main',
          boxSizing: 'border-box',
          cursor: 'move',
          zIndex: 1,
        }}
      >
        <Chip
          size="small"
          label={`${cropPxW} × ${cropPxH}`}
          sx={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontWeight: 600,
            fontSize: '0.7rem',
            pointerEvents: 'none',
          }}
        />
      </Box>

      {/* Handles */}
      {HANDLES.map((handle) => {
        const pos = handlePosition(handle, px);
        return (
          <Box
            key={handle}
            onPointerDown={onPointerDown(handle)}
            sx={{
              position: 'absolute',
              left: pos.left - 6,
              top: pos.top - 6,
              width: 12,
              height: 12,
              bgcolor: 'primary.main',
              border: '2px solid #fff',
              borderRadius: 0.5,
              cursor: handleCursor(handle),
              zIndex: 2,
            }}
          />
        );
      })}

      {/* Toolbar */}
      <Paper
        elevation={6}
        sx={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 0.75,
          borderRadius: 2,
          bgcolor: 'grey.900',
          color: 'common.white',
        }}
      >
        <Typography variant="body2" fontWeight={600}>Crop</Typography>
        <Button
          size="small"
          color="inherit"
          onClick={onCancel}
          disabled={applying}
          sx={{ textTransform: 'none', color: 'grey.300' }}
        >
          Cancel
        </Button>
        <IconButton
          size="small"
          onClick={() => onApply(rect)}
          disabled={applying}
          sx={{
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': { bgcolor: 'primary.dark' },
          }}
        >
          {applying ? <CircularProgress size={18} color="inherit" /> : <IconCheck size={18} />}
        </IconButton>
      </Paper>
    </Box>
  );
};

export default ReferenceImageCropOverlay;
