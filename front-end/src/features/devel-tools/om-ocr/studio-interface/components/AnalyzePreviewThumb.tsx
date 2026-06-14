import React, { useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { IconPhoto } from '@tabler/icons-react';
import { apiClient } from '@/shared/lib/axiosInstance';

export type AnalyzePreviewVariant = 'optimized' | 'original';

interface AnalyzePreviewThumbProps {
  churchId: number;
  sessionId: string;
  fileId: string;
  alt?: string;
  size?: number | 'fill';
  variant?: AnalyzePreviewVariant;
  onClick?: () => void;
}

export function AnalyzePreviewThumb({
  churchId,
  sessionId,
  fileId,
  alt = '',
  size = 56,
  variant = 'optimized',
  onClick,
}: AnalyzePreviewThumbProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    (async () => {
      setLoading(true);
      setFailed(false);
      setSrc(null);
      try {
        const blob = await apiClient.get<Blob>(
          `/api/church/${churchId}/ocr/analyze/${sessionId}/${fileId}/preview?variant=${variant}`,
          { responseType: 'blob', timeout: 60000 },
        );
        if (cancelled) return;
        if (!(blob instanceof Blob) || blob.size === 0) {
          setFailed(true);
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [churchId, sessionId, fileId, variant]);

  const dimensionSx = size === 'fill'
    ? { width: '100%', maxHeight: '70vh' }
    : { width: size, height: size };

  const boxSx = {
    ...dimensionSx,
    flexShrink: 0,
    borderRadius: 1,
    bgcolor: 'action.hover',
    border: '1px solid',
    borderColor: 'divider',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    cursor: onClick ? 'pointer' : 'default',
    '&:hover': onClick ? { boxShadow: 2, borderColor: 'primary.main' } : undefined,
  } as const;

  if (loading) {
    return (
      <Box sx={boxSx}>
        <CircularProgress size={size === 'fill' ? 32 : 20} />
      </Box>
    );
  }

  if (failed || !src) {
    return (
      <Box sx={{ ...boxSx, color: 'text.disabled' }} onClick={onClick} role={onClick ? 'button' : undefined}>
        <IconPhoto size={size === 'fill' ? 48 : 20} />
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      onClick={onClick}
      sx={{ ...boxSx, objectFit: 'contain', bgcolor: 'background.default' }}
    />
  );
}
