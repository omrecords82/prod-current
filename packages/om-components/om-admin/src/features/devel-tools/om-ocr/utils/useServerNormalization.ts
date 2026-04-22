/**
 * Hook for server-side transcription normalization (feature-flagged)
 * Falls back to client-side display normalization if flag is off or API fails
 */

import { useState, useCallback } from 'react';
import { apiClient } from '@/shared/lib/axiosInstance';
import { normalizeOcrText, enhanceOcrTextStructure } from './displayNormalizer';

interface NormalizationSettings {
  transcriptionMode?: 'exact' | 'fix-spelling';
  textExtractionScope?: 'all' | 'handwritten-only';
  formattingMode?: 'improve-formatting';
  confidenceThreshold?: number;
}

interface NormalizationResult {
  text: string;
  paragraphs: string[];
  diagnostics: {
    droppedTokenCount: number;
    lineCount: number;
    paragraphCount: number;
    scriptsPresent: string[];
    warnings: string[];
  };
}

/**
 * Check if server normalization feature flag is enabled
 * This function is called on every render to ensure reactivity
 */
export function isServerNormalizationEnabled(): boolean {
  // Check localStorage first (runtime flag)
  if (typeof window !== 'undefined') {
    const flag = localStorage.getItem('OCR_NORMALIZE_SERVER');
    if (flag !== null) {
      return flag === '1' || flag === 'true';
    }
  }
  // Check env var (for build-time)
  return import.meta.env.VITE_OCR_NORMALIZE_SERVER === '1' || 
         import.meta.env.OCR_NORMALIZE_SERVER === '1';
}

/**
 * Call server normalization API
 */
export async function normalizeTranscriptionOnServer(
  churchId: number,
  jobId: number,
  settings: NormalizationSettings = {}
): Promise<NormalizationResult | null> {
  try {
    const response = await apiClient.post(
      `/api/church/${churchId}/ocr/jobs/${jobId}/normalize`,
      { settings }
    );
    
    const data = (response as any)?.data ?? response;
    return data.transcription || null;
  } catch (error: any) {
    console.warn('[useServerNormalization] Server normalization failed:', error);
    return null;
  }
}

/**
 * Fallback to client-side display normalization
 */
export function normalizeTranscriptionClient(rawText: string | null): string {
  if (!rawText) return '';
  
  try {
    const normalized = normalizeOcrText(rawText);
    return enhanceOcrTextStructure(normalized);
  } catch (error) {
    console.error('[useServerNormalization] Client normalization failed:', error);
    return rawText || '';
  }
}

/**
 * Hook for transcription normalization with automatic fallback
 */
export function useServerNormalization() {
  const [normalizing, setNormalizing] = useState(false);
  const [serverNormalized, setServerNormalized] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalize = useCallback(async (
    churchId: number,
    jobId: number,
    rawText: string | null,
    settings: NormalizationSettings = {}
  ): Promise<string> => {
    // Always fall back to client if flag is off
    if (!isServerNormalizationEnabled()) {
      return normalizeTranscriptionClient(rawText);
    }

    // If no raw text, use client fallback
    if (!rawText) {
      return '';
    }

    setNormalizing(true);
    setError(null);

    try {
      const result = await normalizeTranscriptionOnServer(churchId, jobId, settings);
      
      if (result && result.text) {
        setServerNormalized(result.text);
        return result.text;
      } else {
        // Server returned null/empty, fall back to client
        console.warn('[useServerNormalization] Server returned empty result, using client fallback');
        const clientResult = normalizeTranscriptionClient(rawText);
        setServerNormalized(null);
        return clientResult;
      }
    } catch (err: any) {
      console.error('[useServerNormalization] Normalization error:', err);
      setError(err.message || 'Normalization failed');
      // Fall back to client normalization
      const clientResult = normalizeTranscriptionClient(rawText);
      setServerNormalized(null);
      return clientResult;
    } finally {
      setNormalizing(false);
    }
  }, []);

  return {
    normalize,
    normalizing,
    serverNormalized,
    error,
    isEnabled: isServerNormalizationEnabled(),
  };
}

