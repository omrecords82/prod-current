/**
 * FusionOverlay - Overlay component for highlighting bounding boxes on OCR images
 * Uses exact coordinate space matching the underlying image element
 */

import React, { useMemo, useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import { BBox } from '../types/fusion';
import EditableBBox from './EditableBBox';
import { getImageViewportMetrics, visionBboxToScreen } from '../utils/imageViewportMetrics';

// ============================================================================
// Types
// ============================================================================

export interface OverlayBox {
  bbox: BBox;
  color: string;
  label?: string;
  emphasized?: boolean;
  completed?: boolean;
  selected?: boolean;
  entryIndex?: number;
  onClick?: () => void;
  editable?: boolean;
  onBboxChange?: (bbox: BBox) => void;
  onBboxChangeEnd?: (bbox: BBox) => void;
}

interface FusionOverlayProps {
  boxes: OverlayBox[];
  imageElement: HTMLImageElement | null; // Actual image element for coordinate space
  visionWidth: number; // Original Vision page width (from Vision API)
  visionHeight: number; // Original Vision page height (from Vision API)
  showLabels?: boolean;
  hideCompleted?: boolean; // Extra dark mask for completed entries
  onTokenClick?: (tokenId: string, bbox: BBox, text: string) => void;
  onTokenDoubleClick?: (tokenId: string, bbox: BBox, text: string) => void;
  ocrTokens?: Array<{ id: string; text: string; bbox: BBox; confidence?: number }>; // OCR tokens for interaction
  editMode?: boolean; // When true, overlay becomes interactive for bbox editing; when false, overlay is pass-through
}

// ============================================================================
// Component
// ============================================================================

export const FusionOverlay: React.FC<FusionOverlayProps> = ({
  boxes = [], // Default to empty array to ensure stable prop
  imageElement,
  visionWidth = 0, // Vision API page width
  visionHeight = 0, // Vision API page height
  showLabels = true,
  hideCompleted = false,
  onTokenClick,
  onTokenDoubleClick,
  ocrTokens = [],
  editMode = false, // Default to non-interactive
}) => {
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY - no early returns before hooks
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const containerOffsetRef = useRef({ x: 0, y: 0 });
  const [metrics, setMetrics] = useState<ReturnType<typeof getImageViewportMetrics> | null>(null);
  
  // Debug helper: log pointer target on mousemove (dev mode only)
  useEffect(() => {
    if (!containerRef.current || process.env.NODE_ENV === 'production') return;
    
    const debugEnabled = localStorage.getItem('om.ocr.debugPointerEvents') === 'true';
    if (!debugEnabled) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (containerRef.current?.contains(target)) {
        console.log('[FusionOverlay Debug] Pointer target:', {
          tagName: target.tagName,
          className: target.className,
          editMode,
          pointerEvents: window.getComputedStyle(target).pointerEvents,
        });
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [editMode]);

  // Normalize boxes to always be an array - MUST be called before any conditional returns
  const normalizedBoxes = useMemo(() => {
    if (!boxes || !Array.isArray(boxes)) {
      return [];
    }
    return boxes;
  }, [boxes]);

  // Normalize ocrTokens to always be an array - MUST be called before any conditional returns
  const normalizedOcrTokens = useMemo(() => {
    if (!ocrTokens || !Array.isArray(ocrTokens)) {
      return [];
    }
    return ocrTokens;
  }, [ocrTokens]);

  // Update metrics when image element changes or resizes
  useEffect(() => {
    if (!imageElement) {
      setMetrics(null);
      return;
    }

    const updateMetrics = () => {
      const newMetrics = getImageViewportMetrics(imageElement);
      setMetrics(newMetrics);
    };

    // Initial measurement
    updateMetrics();

    // Watch for image load/resize
    imageElement.addEventListener('load', updateMetrics);
    
    // Use ResizeObserver for container changes
    const resizeObserver = new ResizeObserver(() => {
      updateMetrics();
    });

    // Observe the image element's parent container if available
    const container = imageElement.parentElement;
    if (container) {
      resizeObserver.observe(container);
    }
    resizeObserver.observe(imageElement);

    // Also watch for zoom changes (CSS transform changes)
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

  // Convert vision-space bbox to screen-space using metrics
  // Vision coordinates are in Vision page space, need to scale to actual image space first
  const toScreenBBox = useCallback((bbox: BBox) => {
    if (!metrics) {
      return { x: 0, y: 0, w: 0, h: 0 };
    }
    return visionBboxToScreen(bbox, metrics, visionWidth, visionHeight);
  }, [metrics, visionWidth, visionHeight]);

  // Calculate container offset - use useLayoutEffect to sync with DOM without causing render loops
  useLayoutEffect(() => {
    if (!metrics || !containerRef.current) {
      const zeroOffset = { x: 0, y: 0 };
      containerOffsetRef.current = zeroOffset;
      return;
    }
    
    const containerRect = containerRef.current.parentElement?.getBoundingClientRect();
    if (!containerRect) {
      const zeroOffset = { x: 0, y: 0 };
      containerOffsetRef.current = zeroOffset;
      return;
    }
    
    const newOffset = {
      x: metrics.left - containerRect.left,
      y: metrics.top - containerRect.top,
    };
    
    // Only update if changed to avoid unnecessary work
    if (containerOffsetRef.current.x !== newOffset.x || containerOffsetRef.current.y !== newOffset.y) {
      containerOffsetRef.current = newOffset;
    }
  }, [metrics]);

  // Calculate overlay position - MUST be called before conditional return
  const overlayStyle = useMemo(() => {
    if (!metrics) {
      return { position: 'absolute' as const, top: 0, left: 0, width: 0, height: 0 };
    }

    // Guard against undefined ref values
    const offsetX = containerOffsetRef.current?.x ?? 0;
    const offsetY = containerOffsetRef.current?.y ?? 0;
    const width = metrics.width ?? 0;
    const height = metrics.height ?? 0;

    return {
      position: 'absolute' as const,
      left: offsetX,
      top: offsetY,
      width: width,
      height: height,
    };
  }, [metrics]);

  // NOW safe to do conditional return - all hooks have been called
  // Early return if no metrics, no boxes, or invalid dimensions
  if (!metrics || normalizedBoxes.length === 0 || metrics.width === 0 || metrics.height === 0) {
    // Return empty state instead of null for better UX
    return (
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 5,
          pointerEvents: 'none',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontSize: '0.75rem',
            opacity: 0.6,
          }}
        >
          No entries detected
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        ...overlayStyle,
        // Root overlay is non-interactive by default - only children become interactive in edit mode
        pointerEvents: 'none', // Pass-through by default, children selectively enable pointer events
        zIndex: 5, // Only above image, not above side panel
      }}
    >
      {normalizedBoxes.map((box, idx) => {
        // Guard against undefined box properties
        if (!box || !box.bbox) {
          console.warn(`[FusionOverlay] Invalid box at index ${idx}:`, box);
          return null;
        }

        const screenBbox = toScreenBBox(box.bbox);
        const isCompleted = box.completed ?? false;
        const isSelected = (box.selected ?? false) || (box.emphasized ?? false);
        const borderWidth = isSelected ? 3 : 2;
        
        // Determine styling based on state - default color if missing
        const boxColor = box.color || theme.palette.primary.main;
        const borderColor = isCompleted 
          ? theme.palette.success.main 
          : isSelected 
            ? theme.palette.primary.main 
            : boxColor;
        
        const bgOpacity = isCompleted 
          ? (hideCompleted ? 0.85 : 0.45) 
          : isSelected 
            ? 0.15 
            : 0.1;
        
        const bgColor = isCompleted 
          ? `rgba(0,0,0,${bgOpacity})` 
          : alpha(boxColor, bgOpacity);

        // Use EditableBBox if editable, otherwise use regular box
        if (box.editable && box.onBboxChange && metrics) {
          // EditableBBox handles its own positioning and pointer events
          // It will respect the disabled prop which we set based on editMode
          return (
            <EditableBBox
              key={idx}
              bbox={box.bbox}
              onBboxChange={box.onBboxChange}
              onBboxChangeEnd={box.onBboxChangeEnd}
              imageElement={imageElement}
              visionWidth={visionWidth}
              visionHeight={visionHeight}
              color={borderColor}
              label={box.label}
              disabled={!editMode} // Disable when not in edit mode (pointerEvents: 'none' in EditableBBox)
            />
          );
        }

        // Convert viewport-space screenBbox to overlay-container-relative coordinates.
        // The overlay container is positioned at (offsetX, offsetY) from its parent,
        // giving it a viewport position of (containerParent.left + offsetX, containerParent.top + offsetY)
        // = (metrics.left, metrics.top). So to get container-relative coords, subtract metrics.left/top.
        const adjustedBbox = {
          x: screenBbox.x - (metrics?.left ?? 0),
          y: screenBbox.y - (metrics?.top ?? 0),
          w: screenBbox.w,
          h: screenBbox.h,
        };

        return (
          <Box
            key={idx}
            onClick={box.onClick}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (box.onClick) box.onClick();
            }}
            sx={{
              position: 'absolute',
              left: adjustedBbox.x,
              top: adjustedBbox.y,
              width: adjustedBbox.w,
              height: adjustedBbox.h,
              border: `${borderWidth}px solid ${borderColor}`,
              bgcolor: bgColor,
              borderRadius: 0.5,
              transition: 'background-color 300ms ease, border-color 300ms ease, opacity 300ms ease',
              // Only enable pointer events when in edit mode AND box has onClick handler
              pointerEvents: (editMode && box.onClick) ? 'auto' : 'none',
              cursor: (editMode && box.onClick) ? 'pointer' : 'default',
              boxShadow: isSelected ? `0 0 12px ${alpha(borderColor, 0.5)}` : 'none',
              '&:hover': (editMode && box.onClick) ? {
                borderColor: theme.palette.primary.light,
              } : {},
            }}
          >
            {/* Completed badge */}
            {isCompleted && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 4,
                  left: 4,
                  bgcolor: theme.palette.success.main,
                  color: 'white',
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 0.5,
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  boxShadow: theme.shadows[2],
                }}
              >
                ✓ Completed
              </Box>
            )}
            
            {/* Entry number label */}
            {showLabels && box.label && (
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  top: isCompleted ? 28 : -20,
                  left: 0,
                  bgcolor: borderColor,
                  color: 'white',
                  px: 0.5,
                  py: 0.25,
                  borderRadius: 0.5,
                  fontSize: 10,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2,
                  boxShadow: theme.shadows[2],
                }}
              >
                {box.label}
              </Typography>
            )}
          </Box>
        );
      })}

      {/* OCR Token Overlays - Interactive */}
      {normalizedOcrTokens.map((token) => {
        // Guard against undefined token properties
        if (!token || !token.bbox) {
          return null;
        }

        const screenBbox = toScreenBBox(token.bbox);
        const offsetX = containerOffsetRef.current?.x ?? 0;
        const offsetY = containerOffsetRef.current?.y ?? 0;
        const adjustedBbox = {
          x: screenBbox.x - offsetX,
          y: screenBbox.y - offsetY,
          w: screenBbox.w,
          h: screenBbox.h,
        };

        return (
          <Box
            key={token.id}
            onClick={(e) => {
              e.stopPropagation();
              if (onTokenClick) {
                onTokenClick(token.id, token.bbox, token.text);
              }
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (onTokenDoubleClick) {
                onTokenDoubleClick(token.id, token.bbox, token.text);
              }
            }}
            sx={{
              position: 'absolute',
              left: adjustedBbox.x,
              top: adjustedBbox.y,
              width: Math.max(adjustedBbox.w, 10), // Minimum hit area
              height: Math.max(adjustedBbox.h, 10),
              bgcolor: alpha(theme.palette.info.main, 0.2),
              border: `1px solid ${alpha(theme.palette.info.main, 0.5)}`,
              borderRadius: 0.5,
              // OCR tokens are interactive only when in edit mode OR when they have click handlers
              // In non-edit mode, tokens should be pass-through to allow text selection
              pointerEvents: (editMode || onTokenClick || onTokenDoubleClick) ? 'auto' : 'none',
              cursor: (editMode || onTokenClick || onTokenDoubleClick) ? 'pointer' : 'default',
              zIndex: 3,
              '&:hover': (editMode || onTokenClick || onTokenDoubleClick) ? {
                bgcolor: alpha(theme.palette.info.main, 0.4),
                borderColor: theme.palette.info.main,
                borderWidth: 2,
              } : {},
            }}
            title={`${token.text}${token.confidence ? ` (${Math.round(token.confidence * 100)}%)` : ''}`}
          />
        );
      })}
    </Box>
  );
};

export default FusionOverlay;

