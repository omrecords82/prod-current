/**
 * detectEntriesHandler.ts — Step 1 handler: Detect entries from OCR result.
 */

import {
  FusionEntry,
  FusionDraft,
  EntryArea,
  FieldExtraction,
  BBox,
} from '../../types/fusion';
import {
  detectEntries,
  getVisionPageSize,
} from '../../utils/visionParser';
import { apiClient } from '@/shared/lib/axiosInstance';
import { getEntryColor } from './fusionConstants';

interface DetectEntriesParams {
  ocrResult: any;
  ocrText: string | undefined;
  recordType: 'baptism' | 'marriage' | 'funeral';
  initialRecordType: 'baptism' | 'marriage' | 'funeral';
  hasVisionData: boolean;
  churchId: number;
  jobId: number;
  completionState: Set<number>;
  selectedEntryIndex: number | null;
  normalizeDraftsResponse: (response: any) => FusionDraft[];
}

interface DetectEntriesCallbacks {
  setEntries: React.Dispatch<React.SetStateAction<FusionEntry[]>>;
  setSelectedEntryIndex: (idx: number | null) => void;
  setEntryAreas: React.Dispatch<React.SetStateAction<EntryArea[]>>;
  setOriginalBboxes: React.Dispatch<React.SetStateAction<Map<number, BBox>>>;
  setFieldExtractions: React.Dispatch<React.SetStateAction<Record<string, Record<string, FieldExtraction>>>>;
  setEntryData: React.Dispatch<React.SetStateAction<Map<number, any>>>;
  setIsProcessing: (v: boolean) => void;
  setError: (err: string | null) => void;
  onHighlightMultiple?: (boxes: any[]) => void;
}

export async function handleDetectEntriesLogic(
  params: DetectEntriesParams,
  cb: DetectEntriesCallbacks,
): Promise<void> {
  const {
    ocrResult, ocrText, recordType, initialRecordType, hasVisionData,
    churchId, jobId, completionState, selectedEntryIndex, normalizeDraftsResponse,
  } = params;

  cb.setIsProcessing(true);
  cb.setError(null);

  try {
    await new Promise(resolve => setTimeout(resolve, 500));
    const detected = detectEntries(ocrResult, ocrText || undefined);
    if (detected.length === 0) {
      cb.setError('No entries detected. Try uploading a clearer image.');
      cb.setIsProcessing(false);
      return;
    }

    const entriesWithRecordType = detected.map(entry => ({
      ...entry,
      recordType: entry.recordType || recordType,
    }));
    cb.setEntries(entriesWithRecordType);
    cb.setSelectedEntryIndex(0);

    const newEntryAreas: EntryArea[] = entriesWithRecordType.map((entry, idx) => ({
      entryId: entry.id,
      label: entry.displayName || `Entry ${idx + 1}${entry.recordNumber ? ` (#${entry.recordNumber})` : ''}`,
      bbox: entry.bbox,
      source: 'auto' as const,
    }));

    let finalEntryAreas = newEntryAreas;

    const newOriginalBboxes = new Map<number, BBox>();
    detected.forEach((entry, idx) => { newOriginalBboxes.set(idx, entry.bbox); });
    cb.setOriginalBboxes(newOriginalBboxes);

    // Load persisted entryAreas from drafts
    try {
      const draftsResponse = await apiClient.get(
        `/api/church/${churchId}/ocr/jobs/${jobId}/fusion/drafts`
      );
      const loadedDrafts = normalizeDraftsResponse(draftsResponse);

      if (loadedDrafts.length > 0) {
        const draftWithEntryAreas = loadedDrafts.find((d: FusionDraft) =>
          d.bbox_json?.entryAreas && Array.isArray(d.bbox_json.entryAreas) && d.bbox_json.entryAreas.length > 0
        );

        if (draftWithEntryAreas?.bbox_json?.entryAreas) {
          const persistedEntryAreas = draftWithEntryAreas.bbox_json.entryAreas;
          const updatedEntries = [...entriesWithRecordType];

          persistedEntryAreas.forEach((area: EntryArea) => {
            const entryIdx = entriesWithRecordType.findIndex(e => e.id === area.entryId);
            if (entryIdx >= 0 && entryIdx < updatedEntries.length) {
              updatedEntries[entryIdx] = {
                ...updatedEntries[entryIdx],
                bbox: area.bbox,
                displayName: area.label || updatedEntries[entryIdx].displayName,
              };
            }
          });
          cb.setEntries(updatedEntries);

          finalEntryAreas = newEntryAreas.map(area => {
            const persisted = persistedEntryAreas.find((a: EntryArea) => a.entryId === area.entryId);
            return persisted || area;
          });
        } else {
          const updatedEntries = [...entriesWithRecordType];
          loadedDrafts.forEach((draft: FusionDraft) => {
            const entryIdx = draft.entry_index;
            if (entryIdx >= 0 && entryIdx < updatedEntries.length && draft.bbox_json?.entryBbox) {
              updatedEntries[entryIdx] = {
                ...updatedEntries[entryIdx],
                bbox: draft.bbox_json.entryBbox,
                displayName: draft.payload_json?.displayName || updatedEntries[entryIdx].displayName,
                mapTargetTable: draft.payload_json?.mapTargetTable || updatedEntries[entryIdx].mapTargetTable,
              };
              if (finalEntryAreas[entryIdx]) {
                finalEntryAreas[entryIdx] = { ...finalEntryAreas[entryIdx], bbox: draft.bbox_json.entryBbox, source: 'manual' };
              }
            }
          });
          cb.setEntries(updatedEntries);
        }
      }
    } catch (err) {
      console.warn('[Fusion] Could not load persisted bboxes:', err);
    }

    cb.setEntryAreas(finalEntryAreas);

    // Extract fields using layout extractor
    const extractResults: Record<string, Record<string, FieldExtraction>> = {};
    if (ocrResult && hasVisionData) {
      try {
        const pageSize = getVisionPageSize(ocrResult);
        if (pageSize && finalEntryAreas.length > 0) {
          try {
            const response = await apiClient.post(
              `/api/church/${churchId}/ocr/jobs/${jobId}/fusion/extract-layout`,
              {
                visionResponse: ocrResult,
                imageWidth: pageSize.width,
                imageHeight: pageSize.height,
                recordType,
                confidenceThreshold: 0.60,
                entryAreas: finalEntryAreas.map(area => ({ entryId: area.entryId, bbox: area.bbox })),
                debug: new URLSearchParams(window.location.search).get('debugLayout') === '1',
              }
            );
            const result = (response as any).data;
            if (result.fields) {
              for (const [fieldKeyWithEntry, fieldExtraction] of Object.entries(result.fields)) {
                const match = fieldKeyWithEntry.match(/^(.+?)_(.+)$/);
                if (match) {
                  const [, entryId, fieldKey] = match;
                  if (!extractResults[entryId]) extractResults[entryId] = {};
                  extractResults[entryId][fieldKey] = fieldExtraction as FieldExtraction;
                }
              }
            }
          } catch (err) {
            console.warn('[FusionTab] Layout extraction failed:', err);
          }
          cb.setFieldExtractions(extractResults);
        }
      } catch (err) {
        console.warn('[FusionTab] Layout extraction error:', err);
      }
    }

    // Persist entryAreas + field extractions
    try {
      await apiClient.post(
        `/api/church/${churchId}/ocr/jobs/${jobId}/fusion/drafts`,
        {
          entries: [{
            entry_index: 0,
            record_type: initialRecordType,
            payload_json: {},
            bbox_json: {
              entryAreas: finalEntryAreas,
              entries: Object.keys(extractResults).length > 0 ? extractResults : undefined,
              selections: {},
            },
          }],
        }
      );
    } catch (err) {
      console.warn('[Fusion] Could not persist entryAreas:', err);
    }

    // Initialize entry data
    const newEntryData = new Map<number, any>();
    detected.forEach((_, idx) => {
      newEntryData.set(idx, { labels: [], fields: {}, recordType: initialRecordType });
    });
    cb.setEntryData(newEntryData);

    // Highlight all entry bboxes
    if (cb.onHighlightMultiple && hasVisionData) {
      const boxes = entriesWithRecordType.map((entry, idx) => ({
        bbox: entry.bbox || { x: 0, y: 0, w: 0, h: 0 },
        color: getEntryColor(idx),
        label: entry.displayName || `Entry ${idx + 1}${entry.recordNumber ? ` (#${entry.recordNumber})` : ''}`,
        completed: completionState.has(idx),
        selected: selectedEntryIndex === idx,
        entryIndex: idx,
      }));
      cb.onHighlightMultiple(boxes);
    }
  } catch (err: any) {
    console.error('[Fusion] Entry detection error:', err);
    cb.setError(err.message || 'Failed to detect entries');
  } finally {
    cb.setIsProcessing(false);
  }
}
