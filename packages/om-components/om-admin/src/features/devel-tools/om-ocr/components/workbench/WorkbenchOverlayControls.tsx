/**
 * WorkbenchOverlayControls — Edit mode toggle and crop re-OCR results panel.
 * Extracted from OcrWorkbench.tsx
 */

import React from 'react';
import {
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  IconHighlight,
  IconHandClick,
  IconMarquee2,
  IconSquarePlus,
} from '@tabler/icons-react';

interface CropReOcrResult {
  text: string;
  fields: Record<string, string>;
  bbox: any;
  tokenCount: number;
}

interface WorkbenchOverlayControlsProps {
  editMode: 'highlight' | 'click-select' | 'drag-select' | 'draw-record';
  onEditModeChange: (mode: 'highlight' | 'click-select' | 'drag-select' | 'draw-record') => void;
  focusedField: string | null;
  hasBboxData: boolean;
  rightTab: number;
  cropReOcrLoading: boolean;
  cropReOcrResult: CropReOcrResult | null;
  onClearCropResult: () => void;
}

const WorkbenchOverlayControls: React.FC<WorkbenchOverlayControlsProps> = ({
  editMode,
  onEditModeChange,
  focusedField,
  hasBboxData,
  rightTab,
  cropReOcrLoading,
  cropReOcrResult,
  onClearCropResult,
}) => {
  return (
    <>
      {/* Mode Toggle - shown when Field Mapping tab is active and we have bbox data */}
      {rightTab === 1 && hasBboxData && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            left: '25%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 4,
            p: 0.5,
          }}
        >
          <ToggleButtonGroup
            value={editMode}
            exclusive
            onChange={(_, val) => val && onEditModeChange(val)}
            size="small"
          >
            <ToggleButton value="highlight">
              <Tooltip title="Highlight Only">
                <IconHighlight size={18} />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="click-select" disabled={!focusedField}>
              <Tooltip title="Click tokens to append to focused field">
                <IconHandClick size={18} />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="drag-select" disabled={!focusedField}>
              <Tooltip title="Draw rectangle to select tokens">
                <IconMarquee2 size={18} />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="draw-record">
              <Tooltip title="Draw record box for crop + re-OCR">
                <IconSquarePlus size={18} />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}
      {/* Crop Re-OCR Results Panel */}
      {(cropReOcrLoading || cropReOcrResult) && (
        <Paper
          elevation={4}
          sx={{
            position: 'absolute',
            bottom: 60,
            left: 16,
            zIndex: 25,
            maxWidth: '45%',
            maxHeight: 300,
            overflow: 'auto',
            p: 1.5,
            bgcolor: 'background.paper',
            borderLeft: '3px solid',
            borderColor: 'warning.main',
          }}
        >
          {cropReOcrLoading ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={16} />
              <Typography variant="body2">Running crop OCR...</Typography>
            </Stack>
          ) : cropReOcrResult ? (
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="subtitle2" fontWeight={700} fontSize="0.75rem">
                  Crop OCR Result ({cropReOcrResult.tokenCount} tokens)
                </Typography>
                <IconButton size="small" onClick={onClearCropResult} sx={{ p: 0.25 }}>
                  <Typography variant="caption" color="text.secondary">×</Typography>
                </IconButton>
              </Stack>
              {cropReOcrResult.text && (
                <Typography variant="body2" fontSize="0.7rem" sx={{ mb: 0.5, whiteSpace: 'pre-wrap', bgcolor: 'action.hover', p: 0.5, borderRadius: 0.5 }}>
                  {cropReOcrResult.text}
                </Typography>
              )}
              {Object.keys(cropReOcrResult.fields).length > 0 && (
                <Box>
                  <Typography variant="caption" fontWeight={600} color="text.secondary">Fields:</Typography>
                  {Object.entries(cropReOcrResult.fields).map(([key, val]) => (
                    <Typography key={key} variant="body2" fontSize="0.65rem">
                      <strong>{key}:</strong> {val}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          ) : null}
        </Paper>
      )}
    </>
  );
};

export default WorkbenchOverlayControls;
