/**
 * TranscriptionPanel - Clean, readable OCR text output
 * Matches handwritingocr.com transcription display
 */

import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  IconButton,
  Tooltip,
  Divider,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  IconCopy,
  IconDownload,
  IconWand,
  IconRefresh,
} from '@tabler/icons-react';
import { normalizeOcrText, enhanceOcrTextStructure } from '../utils/displayNormalizer';
import { isServerNormalizationEnabled } from '../utils/useServerNormalization';

interface TranscriptionPanelProps {
  ocrText: string | null;
  serverNormalizedText?: string | null; // Server-normalized text (when flag enabled)
  loading?: boolean;
  normalizing?: boolean; // Server normalization in progress
  onCopy?: () => void;
  onDownload?: () => void;
  onNormalize?: () => void; // Callback for normalize button
  onRerunOcr?: () => void; // Re-run OCR on source image
  rerunning?: boolean; // Re-run in progress
  onDownloadArtifact?: () => void; // Download from feeder artifact
}

const TranscriptionPanel: React.FC<TranscriptionPanelProps> = ({
  ocrText,
  serverNormalizedText,
  loading = false,
  normalizing = false,
  onCopy,
  onDownload,
  onNormalize,
  onRerunOcr,
  rerunning = false,
  onDownloadArtifact,
}) => {
  const serverNormalizationEnabled = isServerNormalizationEnabled();
  
  // Use server-normalized text if available and flag is enabled, otherwise use client normalization
  const normalizedText = useMemo(() => {
    if (serverNormalizationEnabled && serverNormalizedText) {
      return serverNormalizedText;
    }
    
    // Fallback to client-side normalization
    if (!ocrText) return '';
    
    try {
      const normalized = normalizeOcrText(ocrText);
      return enhanceOcrTextStructure(normalized);
    } catch (error) {
      console.error('[TranscriptionPanel] Error normalizing text:', error);
      return ocrText;
    }
  }, [ocrText, serverNormalizedText, serverNormalizationEnabled]);

  const handleCopy = () => {
    if (normalizedText) {
      navigator.clipboard.writeText(normalizedText);
      if (onCopy) onCopy();
    }
  };

  const handleDownload = () => {
    if (normalizedText) {
      const blob = new Blob([normalizedText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'transcription.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (onDownload) onDownload();
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          Transcription
        </Typography>
        <Stack direction="row" spacing={0.5} alignItems="center">
          {onRerunOcr && (
            <Tooltip title="Re-run OCR on source image (no re-upload needed)">
              <IconButton
                size="small"
                onClick={onRerunOcr}
                disabled={loading || rerunning}
                color="primary"
              >
                {rerunning ? <CircularProgress size={18} /> : <IconRefresh size={18} />}
              </IconButton>
            </Tooltip>
          )}
          {serverNormalizationEnabled && onNormalize && (
            <Tooltip title="Normalize transcription (server-side)">
              <Button
                size="small"
                variant="outlined"
                startIcon={normalizing ? <CircularProgress size={14} /> : <IconWand size={16} />}
                onClick={onNormalize}
                disabled={!ocrText || loading || normalizing}
                sx={{ mr: 1 }}
              >
                {normalizing ? 'Normalizing...' : 'Normalize'}
              </Button>
            </Tooltip>
          )}
          <Tooltip title="Copy transcription">
            <IconButton
              size="small"
              onClick={handleCopy}
              disabled={!normalizedText || loading}
            >
              <IconCopy size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title={onDownloadArtifact ? "Download OCR text (artifact)" : "Download transcription"}>
            <IconButton
              size="small"
              onClick={onDownloadArtifact || handleDownload}
              disabled={!normalizedText || loading}
            >
              <IconDownload size={18} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Text Content */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 3,
          bgcolor: 'background.default',
        }}
      >
        {loading ? (
          <Typography variant="body2" color="text.secondary">
            Processing...
          </Typography>
        ) : !normalizedText ? (
          <Typography variant="body2" color="text.secondary">
            No transcription available. Process a document to see OCR text.
          </Typography>
        ) : (
          <Typography
            variant="body1"
            component="pre"
            sx={{
              fontFamily: 'inherit',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: 1.6,
              color: 'text.primary',
              margin: 0,
            }}
          >
            {normalizedText}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default TranscriptionPanel;

