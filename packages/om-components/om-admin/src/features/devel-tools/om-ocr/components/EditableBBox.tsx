/**
 * EditableBBox - Editable bounding box component with drag and resize handles
 * Supports dragging, resizing, and drawing new boxes
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Box, useTheme } from '@mui/material';
import { BBox } from '../types/fusion';
import { getImageViewportMetrics, screenToVision, visionBboxToScreen } from '../utils/imageViewportMetrics';

interface EditableBBoxProps {
  bbox: BBox;
  onBboxChange: (bbox: BBox) => void;
  onBboxChangeEnd?: (bbox: BBox) => void;
  imageElement: HTMLImageElement | null; // Actual image element for coordinate space
  visionWidth: number;
  visionHeight: number;
  minWidth?: number;
  minHeight?: number;
  disabled?: boolean;
  color?: string;
  label?: string;
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null;
type InteractionMode = 'none' | 'drag' | 'resize' | 'draw';

// Pure function - can be defined outside component
function getHandlePosition(handle: ResizeHandle, bbox: { x: number; y: number; w: number; h: number }) {
  switch (handle) {
    case 'nw':
      return { x: bbox.x, y: bbox.y };
    case 'ne':
      return { x: bbox.x + bbox.w, y: bbox.y };
    case 'sw':
      return { x: bbox.x, y: bbox.y + bbox.h };
    case 'se':
      return { x: bbox.x + bbox.w, y: bbox.y + bbox.h };
    case 'n':
      return { x: bbox.x + bbox.w / 2, y: bbox.y };
    case 's':
      return { x: bbox.x + bbox.w / 2, y: bbox.y + bbox.h };
    case 'e':
      return { x: bbox.x + bbox.w, y: bbox.y + bbox.h / 2 };
    case 'w':
      return { x: bbox.x, y: bbox.y + bbox.h / 2 };
    default:
      return { x: 0, y: 0 };
  }
}

function getResizeCursor(handle: ResizeHandle | null): string {
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
      return 'grab';
  }
}

function EditableBBox({
  bbox,
  onBboxChange,
  onBboxChangeEnd,
  imageElement,
  visionWidth,
  visionHeight,
  minWidth = 20,
  minHeight = 20,
  disabled = false,
  color = '#4CAF50',
  label,
}: EditableBBoxProps): React.ReactElement {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [bboxAtStart, setBboxAtStart] = useState<BBox | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [metrics, setMetrics] = useState<ReturnType<typeof getImageViewportMetrics> | null>(null);
  
  const handleSize = 10; // Size of resize handles in pixels (increased for better hit area)

  // Update metrics when image element changes
  useEffect(() => {
    if (!imageElement) {
      setMetrics(null);
      return;
    }

    const updateMetrics = () => {
      const newMetrics = getImageViewportMetrics(imageElement);
      setMetrics(newMetrics);
    };

    updateMetrics();
    imageElement.addEventListener('load', updateMetrics);
    
    const resizeObserver = new ResizeObserver(() => {
      updateMetrics();
    });
    const container = imageElement.parentElement;
    if (container) {
      resizeObserver.observe(container);
    }
    resizeObserver.observe(imageElement);

    const mutationObserver = new MutationObserver(() => {
      updateMetrics();
    });
    mutationObserver.observe(imageElement, {
      attributes: true,
      attributeFilter: ['style'],
    });

    return () => {
      imageElement.removeEventListener('load', updateMetrics);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [imageElement]);

  // Convert vision-space bbox to screen-space
  const screenBbox = useMemo(() => {
    if (!metrics) {
      return { x: 0, y: 0, w: 0, h: 0 };
    }
    const screen = visionBboxToScreen(bbox, metrics);
    // Adjust relative to overlay container
    const containerRect = containerRef.current?.parentElement?.getBoundingClientRect();
    if (!containerRect) return screen;
    return {
      x: screen.x - (metrics.left - containerRect.left),
      y: screen.y - (metrics.top - containerRect.top),
      w: screen.w,
      h: screen.h,
    };
  }, [bbox, metrics]);

  // Clamp bbox to image bounds
  const clampBbox = useCallback((bbox: BBox): BBox => {
    const maxX = visionWidth;
    const maxY = visionHeight;
    
    let x = Math.max(0, Math.min(bbox.x, maxX - minWidth));
    let y = Math.max(0, Math.min(bbox.y, maxY - minHeight));
    let w = Math.max(minWidth, Math.min(bbox.w, maxX - x));
    let h = Math.max(minHeight, Math.min(bbox.h, maxY - y));

    return { x, y, w, h };
  }, [visionWidth, visionHeight, minWidth, minHeight]);

  // Convert screen/client coords to vision coords using metrics
  const screenToVisionCoords = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    if (!metrics) return null;
    return screenToVision(clientX, clientY, metrics);
  }, [metrics]);

  // Handle pointer down for drag/resize with pointer capture
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled || !metrics) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Capture pointer to ensure we receive all events
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    // Get container rect for coordinate calculation
    const containerRect = containerRef.current?.parentElement?.getBoundingClientRect();
    if (!containerRect) return;

    // Convert to container-relative coordinates
    const containerX = e.clientX - containerRect.left;
    const containerY = e.clientY - containerRect.top;
    
    // Adjust for overlay offset
    const overlayX = containerX - (metrics.left - containerRect.left);
    const overlayY = containerY - (metrics.top - containerRect.top);

    // Check if clicking on a resize handle
    const handles: ResizeHandle[] = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];
    
    for (const handle of handles) {
      const handlePos = getHandlePosition(handle, screenBbox);
      const dist = Math.sqrt(
        Math.pow(overlayX - handlePos.x, 2) + Math.pow(overlayY - handlePos.y, 2)
      );
      if (dist < handleSize) {
        setResizeHandle(handle);
        setIsResizing(true);
        setBboxAtStart(bbox);
        const visionCoords = screenToVisionCoords(e.clientX, e.clientY);
        if (visionCoords) {
          setDragStart(visionCoords);
        }
        return;
      }
    }

    // Otherwise, start dragging
    setIsDragging(true);
    setBboxAtStart(bbox);
    const visionCoords = screenToVisionCoords(e.clientX, e.clientY);
    if (visionCoords) {
      setDragStart(visionCoords);
    }
  }, [disabled, screenBbox, bbox, screenToVisionCoords, handleSize, metrics]);

  // Handle pointer move with pointer capture
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (disabled || !metrics) return;

    if (isDrawing && drawStart) {
      const visionCoords = screenToVisionCoords(e.clientX, e.clientY);
      if (!visionCoords) return;

      const newBbox = {
        x: Math.min(drawStart.x, visionCoords.x),
        y: Math.min(drawStart.y, visionCoords.y),
        w: Math.abs(visionCoords.x - drawStart.x),
        h: Math.abs(visionCoords.y - drawStart.y),
      };

      onBboxChange(clampBbox(newBbox));
    } else if (isDragging && dragStart && bboxAtStart) {
      const visionCoords = screenToVisionCoords(e.clientX, e.clientY);
      if (!visionCoords) return;

      const deltaX = visionCoords.x - dragStart.x;
      const deltaY = visionCoords.y - dragStart.y;

      const newBbox = clampBbox({
        x: bboxAtStart.x + deltaX,
        y: bboxAtStart.y + deltaY,
        w: bboxAtStart.w,
        h: bboxAtStart.h,
      });

      onBboxChange(newBbox);
    } else if (isResizing && resizeHandle && dragStart && bboxAtStart) {
      const visionCoords = screenToVisionCoords(e.clientX, e.clientY);
      if (!visionCoords) return;

      const deltaX = visionCoords.x - dragStart.x;
      const deltaY = visionCoords.y - dragStart.y;

      let newBbox = { ...bboxAtStart };

      // Resize based on handle
      switch (resizeHandle) {
        case 'nw':
          newBbox.x = bboxAtStart.x + deltaX;
          newBbox.y = bboxAtStart.y + deltaY;
          newBbox.w = bboxAtStart.w - deltaX;
          newBbox.h = bboxAtStart.h - deltaY;
          break;
        case 'ne':
          newBbox.y = bboxAtStart.y + deltaY;
          newBbox.w = bboxAtStart.w + deltaX;
          newBbox.h = bboxAtStart.h - deltaY;
          break;
        case 'sw':
          newBbox.x = bboxAtStart.x + deltaX;
          newBbox.w = bboxAtStart.w - deltaX;
          newBbox.h = bboxAtStart.h + deltaY;
          break;
        case 'se':
          newBbox.w = bboxAtStart.w + deltaX;
          newBbox.h = bboxAtStart.h + deltaY;
          break;
        case 'n':
          newBbox.y = bboxAtStart.y + deltaY;
          newBbox.h = bboxAtStart.h - deltaY;
          break;
        case 's':
          newBbox.h = bboxAtStart.h + deltaY;
          break;
        case 'e':
          newBbox.w = bboxAtStart.w + deltaX;
          break;
        case 'w':
          newBbox.x = bboxAtStart.x + deltaX;
          newBbox.w = bboxAtStart.w - deltaX;
          break;
      }

      // Ensure minimum size
      if (newBbox.w < minWidth) {
        if (resizeHandle?.includes('w')) {
          newBbox.x = bboxAtStart.x + bboxAtStart.w - minWidth;
        }
        newBbox.w = minWidth;
      }
      if (newBbox.h < minHeight) {
        if (resizeHandle?.includes('n')) {
          newBbox.y = bboxAtStart.y + bboxAtStart.h - minHeight;
        }
        newBbox.h = minHeight;
      }

      onBboxChange(clampBbox(newBbox));
    }
  }, [disabled, isDragging, isResizing, isDrawing, dragStart, drawStart, bboxAtStart, resizeHandle, onBboxChange, clampBbox, minWidth, minHeight, metrics, screenToVisionCoords]);

  // Handle pointer up and release capture
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.releasePointerCapture(e.pointerId);

    if (isDragging || isResizing || isDrawing) {
      if (onBboxChangeEnd && bbox) {
        onBboxChangeEnd(bbox);
      }
    }
    setIsDragging(false);
    setIsResizing(false);
    setIsDrawing(false);
    setResizeHandle(null);
    setDragStart(null);
    setDrawStart(null);
    setBboxAtStart(null);
  }, [isDragging, isResizing, isDrawing, bbox, onBboxChangeEnd]);

  // Start drawing mode (using pointer events)
  const startDrawing = useCallback((e: React.PointerEvent) => {
    if (disabled || !metrics) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    const visionCoords = screenToVisionCoords(e.clientX, e.clientY);
    if (!visionCoords) return;

    setIsDrawing(true);
    setDrawStart(visionCoords);
  }, [disabled, metrics, screenToVisionCoords]);

  const cursor = isDragging ? 'grabbing' : isResizing ? getResizeCursor(resizeHandle) : disabled ? 'default' : 'grab';

  return (
    <Box
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      sx={{
        position: 'absolute',
        left: screenBbox.x,
        top: screenBbox.y,
        width: screenBbox.w,
        height: screenBbox.h,
        border: `2px solid ${color}`,
        bgcolor: disabled ? 'transparent' : `${color}20`,
        cursor,
        pointerEvents: disabled ? 'none' : 'auto',
        zIndex: isDragging || isResizing ? 100 : 10,
        '&:hover': {
          borderColor: disabled ? color : theme.palette.primary.main,
        },
      }}
    >
      {/* Label */}
      {label && (
        <Box
          sx={{
            position: 'absolute',
            top: -24,
            left: 0,
            bgcolor: color,
            color: 'white',
            px: 0.5,
            py: 0.25,
            fontSize: 10,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {label}
        </Box>
      )}

      {/* Resize handles */}
      {!disabled && (
        <>
          {(['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'] as ResizeHandle[]).map((handle) => {
            const pos = getHandlePosition(handle, screenBbox);
            return (
              <Box
                key={handle}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const target = e.currentTarget as HTMLElement;
                  target.setPointerCapture(e.pointerId);
                  setResizeHandle(handle);
                  setIsResizing(true);
                  setBboxAtStart(bbox);
                  const visionCoords = screenToVisionCoords(e.clientX, e.clientY);
                  if (visionCoords) {
                    setDragStart(visionCoords);
                  }
                }}
                sx={{
                  position: 'absolute',
                  left: pos.x - handleSize / 2,
                  top: pos.y - handleSize / 2,
                  width: handleSize,
                  height: handleSize,
                  bgcolor: color,
                  border: `1px solid white`,
                  borderRadius: '50%',
                  cursor: getResizeCursor(handle),
                  zIndex: 101,
                  pointerEvents: 'all', // Ensure handles are always interactive
                  '&:hover': {
                    bgcolor: theme.palette.primary.main,
                    transform: 'scale(1.2)',
                  },
                }}
              />
            );
          })}
        </>
      )}
    </Box>
  );
}

export default EditableBBox;

