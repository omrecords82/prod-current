/**
 * WorkbenchViewer - Image viewer with overlays for OCR workbench
 * Extracted from InspectionPanel for cleaner separation
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Stack,
  Slider,
  TextField,
  InputAdornment,
  alpha,
  useTheme,
} from '@mui/material';
import {
  IconZoomIn,
  IconZoomOut,
  IconMaximize,
  IconCopy,
  IconSearch,
} from '@tabler/icons-react';
import FusionOverlay, { OverlayBox } from '../FusionOverlay';
import { getVisionPageSize, parseVisionResponse } from '../../utils/visionParser';
import { useWorkbench } from '../../context/WorkbenchContext';
import type { BBox, VisionResponse } from '../../types/fusion';

interface WorkbenchViewerProps {
  onTokenClick?: (tokenId: string, bbox: BBox, text: string) => void;
  onTokenDoubleClick?: (tokenId: string, bbox: BBox, text: string) => void;
  /** Record highlight boxes from table extraction (computed in OcrWorkbench) */
  recordHighlightBoxes?: OverlayBox[];
  /** Current interaction mode */
  interactionMode?: 'highlight' | 'click-select' | 'drag-select' | 'draw-record';
  /** Callback when user clicks a token in click-select mode */
  onTokenSelect?: (text: string, bbox: BBox) => void;
  /** Callback when user drag-selects tokens */
  onDragSelect?: (text: string, bbox: BBox) => void;
  /** Callback when user draws a record bounding box (fractional 0..1 coords) */
  onDrawRecord?: (bbox: { x_min: number; y_min: number; x_max: number; y_max: number }) => void;
  /** Page dimensions from table extraction (fallback for Vision page dims) */
  tablePageDims?: { width: number; height: number } | null;
}

const WorkbenchViewer: React.FC<WorkbenchViewerProps> = ({
  onTokenClick,
  onTokenDoubleClick,
  recordHighlightBoxes = [],
  interactionMode = 'highlight',
  onTokenSelect,
  onDragSelect,
  onDrawRecord,
  tablePageDims,
}) => {
  const theme = useTheme();
  const workbench = useWorkbench();
  const imageRef = useRef<HTMLImageElement>(null);
  const [zoom, setZoom] = useState(100);
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
    naturalWidth: 0,
    naturalHeight: 0,
  });
  
  const jobOcrResult = workbench.state.ocrResult;
  const imageUrl = workbench.state.imageUrl;
  const editMode = workbench.state.bboxEditMode;
  
  // Get Vision page dimensions (safe with null)
  const visionPageSize = useMemo(() => {
    if (!jobOcrResult) return { width: 0, height: 0 };
    return getVisionPageSize(jobOcrResult);
  }, [jobOcrResult]);
  
  // Parse OCR tokens for overlay (safe with null, optimized to prevent memory issues)
  const ocrTokens = useMemo(() => {
    if (!jobOcrResult) return [];
    try {
      // Limit processing to prevent browser crashes on very large OCR results
      const lines = parseVisionResponse(jobOcrResult);
      const tokens: Array<{ id: string; text: string; bbox: BBox; confidence?: number }> = [];
      const MAX_TOKENS = 10000; // Limit to prevent memory issues
      
      for (const line of lines) {
        if (tokens.length >= MAX_TOKENS) {
          console.warn('[WorkbenchViewer] Token limit reached, truncating overlay');
          break;
        }
        if (line.tokens) {
          for (const token of line.tokens) {
            if (tokens.length >= MAX_TOKENS) break;
            if (token.id && token.bbox && token.bbox.w > 0 && token.bbox.h > 0) {
              tokens.push({
                id: token.id,
                text: token.text,
                bbox: token.bbox,
                confidence: token.confidence,
              });
            }
          }
        }
      }
      return tokens;
    } catch (error) {
      console.error('[WorkbenchViewer] Error parsing OCR tokens:', error);
      return [];
    }
  }, [jobOcrResult]);
  
  // Merge record highlight boxes with existing entry area boxes
  const mergedBoxes = useMemo(() => {
    const entryBoxes: OverlayBox[] = workbench.state.entryAreas.map((area, idx) => {
      const entryIdx = workbench.state.entries.findIndex(e => e.id === area.entryId);
      const isSelected = entryIdx === workbench.state.selectedEntryIndex;
      return {
        bbox: area.bbox,
        label: area.label || `Entry ${idx + 1}`,
        color: `hsl(${(idx * 60) % 360}, 70%, 50%)`,
        selected: isSelected,
        editable: editMode && isSelected,
        onBboxChange: editMode && isSelected
          ? (newBbox: BBox) => workbench.updateEntryArea(area.entryId, newBbox)
          : undefined,
        onBboxChangeEnd: editMode && isSelected
          ? () => {
              console.log('[WorkbenchViewer] Bbox change ended for', area.entryId);
            }
          : undefined,
      };
    });
    // Record highlight boxes go first (behind entry area boxes)
    return [...recordHighlightBoxes, ...entryBoxes];
  }, [recordHighlightBoxes, workbench.state.entryAreas, workbench.state.entries, workbench.state.selectedEntryIndex, editMode, workbench]);

  // Token click handler — routes to onTokenSelect in click-select mode
  const handleTokenClickInternal = useCallback(
    (tokenId: string, bbox: BBox, text: string) => {
      if (interactionMode === 'click-select' && onTokenSelect) {
        onTokenSelect(text, bbox);
      }
      onTokenClick?.(tokenId, bbox, text);
    },
    [interactionMode, onTokenSelect, onTokenClick],
  );

  // Drag selection state
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null);
  const isDragging = (interactionMode === 'drag-select' || interactionMode === 'draw-record') && dragStart !== null;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (interactionMode !== 'drag-select' && interactionMode !== 'draw-record') return;
      const rect = e.currentTarget.getBoundingClientRect();
      setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setDragEnd(null);
    },
    [interactionMode],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const rect = e.currentTarget.getBoundingClientRect();
      setDragEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging || !dragStart || !dragEnd) {
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    // draw-record mode: convert screen rect to fractional image coords
    if (interactionMode === 'draw-record' && onDrawRecord) {
      const img = imageRef.current;
      if (img) {
        const scaledW = img.clientWidth * (zoom / 100);
        const scaledH = img.clientHeight * (zoom / 100);
        if (scaledW > 0 && scaledH > 0) {
          const x_min = Math.max(0, Math.min(dragStart.x, dragEnd.x) / scaledW);
          const y_min = Math.max(0, Math.min(dragStart.y, dragEnd.y) / scaledH);
          const x_max = Math.min(1, Math.max(dragStart.x, dragEnd.x) / scaledW);
          const y_max = Math.min(1, Math.max(dragStart.y, dragEnd.y) / scaledH);
          if (x_max - x_min > 0.01 && y_max - y_min > 0.01) {
            onDrawRecord({ x_min, y_min, x_max, y_max });
          }
        }
      }
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    if (!onDragSelect) {
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    // Convert screen drag rect to vision-space and find intersecting tokens
    const screenRect = {
      left: Math.min(dragStart.x, dragEnd.x),
      top: Math.min(dragStart.y, dragEnd.y),
      right: Math.max(dragStart.x, dragEnd.x),
      bottom: Math.max(dragStart.y, dragEnd.y),
    };

    // Filter tokens whose screen bboxes intersect the drag rect
    // We need to approximate — use the image scale factor
    const img = imageRef.current;
    if (img && visionPageSize.width > 0 && visionPageSize.height > 0) {
      const imgRect = img.getBoundingClientRect();
      const scaleX = (img.clientWidth * (zoom / 100)) / visionPageSize.width;
      const scaleY = (img.clientHeight * (zoom / 100)) / visionPageSize.height;

      const selectedTexts: string[] = [];
      let unionBbox: BBox | null = null;

      for (const token of ocrTokens) {
        const tokenScreenLeft = token.bbox.x * scaleX;
        const tokenScreenTop = token.bbox.y * scaleY;
        const tokenScreenRight = (token.bbox.x + token.bbox.w) * scaleX;
        const tokenScreenBottom = (token.bbox.y + token.bbox.h) * scaleY;

        // Check intersection
        if (
          tokenScreenLeft < screenRect.right &&
          tokenScreenRight > screenRect.left &&
          tokenScreenTop < screenRect.bottom &&
          tokenScreenBottom > screenRect.top
        ) {
          selectedTexts.push(token.text);
          if (!unionBbox) {
            unionBbox = { ...token.bbox };
          } else {
            const newX = Math.min(unionBbox.x, token.bbox.x);
            const newY = Math.min(unionBbox.y, token.bbox.y);
            unionBbox = {
              x: newX,
              y: newY,
              w: Math.max(unionBbox.x + unionBbox.w, token.bbox.x + token.bbox.w) - newX,
              h: Math.max(unionBbox.y + unionBbox.h, token.bbox.y + token.bbox.h) - newY,
            };
          }
        }
      }

      if (selectedTexts.length > 0 && unionBbox) {
        onDragSelect(selectedTexts.join(' '), unionBbox);
      }
    }

    setDragStart(null);
    setDragEnd(null);
  }, [isDragging, dragStart, dragEnd, interactionMode, onDrawRecord, onDragSelect, ocrTokens, visionPageSize, zoom]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 25, 300));
  }, []);
  
  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 25, 25));
  }, []);
  
  const handleZoomFit = useCallback(() => {
    setZoom(100);
  }, []);
  
  const handleZoomChange = useCallback((event: Event, value: number | number[]) => {
    setZoom(value as number);
  }, []);
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Zoom Controls */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: 'background.paper',
          borderRadius: 1,
          boxShadow: 2,
          p: 1,
        }}
      >
        <Tooltip title="Zoom Out">
          <IconButton size="small" onClick={handleZoomOut}>
            <IconZoomOut size={18} />
          </IconButton>
        </Tooltip>
        <Slider
          value={zoom}
          onChange={handleZoomChange}
          min={25}
          max={300}
          step={5}
          sx={{ width: 100 }}
          size="small"
        />
        <Tooltip title="Zoom In">
          <IconButton size="small" onClick={handleZoomIn}>
            <IconZoomIn size={18} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Fit to View">
          <IconButton size="small" onClick={handleZoomFit}>
            <IconMaximize size={18} />
          </IconButton>
        </Tooltip>
        <TextField
          size="small"
          value={zoom}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= 25 && val <= 300) {
              setZoom(val);
            }
          }}
          InputProps={{
            endAdornment: <InputAdornment position="end">%</InputAdornment>,
          }}
          sx={{ width: 70 }}
        />
      </Box>
      
      {/* Image Container */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          p: 2,
          ...(editMode && {
            overflow: 'hidden',
            touchAction: 'none',
            userSelect: 'none',
          }),
        }}
      >
        {imageUrl && (
          <Box
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            sx={{
              position: 'relative',
              display: 'inline-block',
              overflow: 'hidden',
              cursor: (interactionMode === 'drag-select' || interactionMode === 'draw-record') ? 'crosshair' : undefined,
            }}
          >
            <img
              ref={imageRef}
              src={imageUrl || ''}
              alt={workbench.state.jobMetadata?.filename || 'OCR Image'}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              style={{
                maxWidth: '100%',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                display: 'block',
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left',
                pointerEvents: 'auto',
                userSelect: 'none',
              }}
              onLoad={(e) => {
                const img = e.currentTarget;
                setImageDimensions({
                  width: img.clientWidth,
                  height: img.clientHeight,
                  naturalWidth: img.naturalWidth,
                  naturalHeight: img.naturalHeight,
                });
              }}
              onError={(e) => {
                console.error('[WorkbenchViewer] Failed to load image:', imageUrl);
                console.error('[WorkbenchViewer] Image error:', e);
              }}
            />
            {imageRef.current && (
              <FusionOverlay
                boxes={mergedBoxes}
                imageElement={imageRef.current}
                visionWidth={visionPageSize.width || tablePageDims?.width || imageDimensions.naturalWidth || 0}
                visionHeight={visionPageSize.height || tablePageDims?.height || imageDimensions.naturalHeight || 0}
                showLabels={true}
                ocrTokens={ocrTokens}
                onTokenClick={handleTokenClickInternal}
                onTokenDoubleClick={onTokenDoubleClick}
                editMode={editMode || interactionMode === 'click-select'}
              />
            )}
            {/* Drag selection rectangle */}
            {isDragging && dragStart && dragEnd && (
              <Box
                sx={{
                  position: 'absolute',
                  left: Math.min(dragStart.x, dragEnd.x),
                  top: Math.min(dragStart.y, dragEnd.y),
                  width: Math.abs(dragEnd.x - dragStart.x),
                  height: Math.abs(dragEnd.y - dragStart.y),
                  border: interactionMode === 'draw-record' ? '2px solid' : '2px dashed',
                  borderColor: interactionMode === 'draw-record' ? 'warning.main' : 'primary.main',
                  bgcolor: (t) => alpha(
                    interactionMode === 'draw-record' ? t.palette.warning.main : t.palette.primary.main,
                    0.1,
                  ),
                  pointerEvents: 'none',
                  zIndex: 15,
                }}
              />
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default WorkbenchViewer;

