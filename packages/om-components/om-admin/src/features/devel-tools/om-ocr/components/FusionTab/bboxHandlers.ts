/**
 * bboxHandlers.ts — Bbox update and save logic for FusionTab entries.
 */

import {
  FusionEntry,
  FusionDraft,
  BBox,
  EntryArea,
} from '../../types/fusion';
import { filterEntryByBbox } from '../../utils/visionParser';
import { apiClient } from '@/shared/lib/axiosInstance';
import { getEntryColor } from './fusionConstants';

interface BboxUpdateContext {
  entries: FusionEntry[];
  entryAreas: EntryArea[];
  completionState: Set<number>;
  selectedEntryIndex: number | null;
  hasVisionData: boolean;
  setEntries: React.Dispatch<React.SetStateAction<FusionEntry[]>>;
  setEntryAreas: React.Dispatch<React.SetStateAction<EntryArea[]>>;
  setDirtyEntries: React.Dispatch<React.SetStateAction<Set<number>>>;
  setEntryData: React.Dispatch<React.SetStateAction<Map<number, any>>>;
  onHighlightMultiple?: (boxes: any[]) => void;
}

export function handleBboxUpdateLogic(
  entryIndex: number,
  newBbox: BBox,
  ctx: BboxUpdateContext,
): void {
  const entry = ctx.entries[entryIndex];
  if (!entry) return;

  ctx.setEntries(prev => {
    const updated = [...prev];
    if (updated[entryIndex]) {
      const entryWithNewBbox = { ...updated[entryIndex], bbox: newBbox };
      const filteredEntry = filterEntryByBbox(entryWithNewBbox);
      updated[entryIndex] = filteredEntry;
    }
    return updated;
  });

  ctx.setEntryAreas(prev => {
    const updated = [...prev];
    const areaIdx = updated.findIndex(a => a.entryId === entry.id);
    if (areaIdx >= 0) {
      updated[areaIdx] = { ...updated[areaIdx], bbox: newBbox, source: 'manual' };
    } else {
      updated.push({
        entryId: entry.id,
        label: entry.displayName || `Entry ${entryIndex + 1}`,
        bbox: newBbox,
        source: 'manual',
      });
    }
    return updated;
  });

  ctx.setDirtyEntries(prev => new Set(prev).add(entryIndex));

  ctx.setEntryData(prev => {
    const newData = new Map(prev);
    const existing = newData.get(entryIndex);
    if (existing) {
      newData.set(entryIndex, { ...existing, labels: [], fields: {} });
    }
    return newData;
  });

  if (ctx.onHighlightMultiple && ctx.hasVisionData) {
    const boxes = ctx.entryAreas.length > 0
      ? ctx.entryAreas.map((area, idx) => {
          const entryIdx = ctx.entries.findIndex(e => e.id === area.entryId);
          const isUpdated = entryIdx === entryIndex;
          return {
            bbox: isUpdated ? newBbox : area.bbox,
            color: getEntryColor(entryIdx >= 0 ? entryIdx : idx),
            label: area.label,
            completed: entryIdx >= 0 ? ctx.completionState.has(entryIdx) : false,
            selected: entryIdx === ctx.selectedEntryIndex,
            entryIndex: entryIdx >= 0 ? entryIdx : idx,
          };
        })
      : ctx.entries.map((e, idx) => ({
          bbox: idx === entryIndex ? newBbox : (e.bbox || { x: 0, y: 0, w: 0, h: 0 }),
          color: getEntryColor(idx),
          label: e.displayName || `Entry ${idx + 1}${e.recordNumber ? ` (#${e.recordNumber})` : ''}`,
          completed: ctx.completionState.has(idx),
          selected: ctx.selectedEntryIndex === idx,
          entryIndex: idx,
        }));
    ctx.onHighlightMultiple(boxes);
  }
}

interface BboxSaveContext {
  entries: FusionEntry[];
  entryAreas: EntryArea[];
  drafts: FusionDraft[];
  churchId: number;
  jobId: number;
  recordType: 'baptism' | 'marriage' | 'funeral';
  setIsProcessing: (v: boolean) => void;
  setError: (err: string | null) => void;
  setDrafts: React.Dispatch<React.SetStateAction<FusionDraft[]>>;
  setEntryAreas: React.Dispatch<React.SetStateAction<EntryArea[]>>;
  setDirtyEntries: React.Dispatch<React.SetStateAction<Set<number>>>;
  setOriginalBboxes: React.Dispatch<React.SetStateAction<Map<number, BBox>>>;
  normalizeDraftsResponse: (response: any) => FusionDraft[];
}

export async function handleSaveBboxLogic(
  entryIndex: number,
  ctx: BboxSaveContext,
): Promise<void> {
  const entry = ctx.entries[entryIndex];
  if (!entry) return;

  const entryArea = ctx.entryAreas.find(a => a.entryId === entry.id);
  if (!entryArea) {
    console.warn(`[FusionTab] No entryArea found for entry ${entry.id}`);
    return;
  }

  ctx.setIsProcessing(true);
  try {
    let draft = ctx.drafts.find(d => d.entry_index === 0) || ctx.drafts[0];

    if (draft && draft.id) {
      const currentEntryArea = ctx.entryAreas.find(a => a.entryId === entry.id);
      if (!currentEntryArea) {
        console.warn(`[FusionTab] No entryArea found for entry ${entry.id}, cannot save`);
        return;
      }

      const updatedEntryAreas = ctx.entryAreas.map(a =>
        a.entryId === entry.id ? currentEntryArea : a
      );

      const response = await apiClient.patch(
        `/api/church/${ctx.churchId}/ocr/jobs/${ctx.jobId}/fusion/drafts/${draft.id}/entry-bbox`,
        {
          entryBbox: entry.bbox,
          entryAreas: updatedEntryAreas,
        }
      );

      const updatedDraft = (response as any).data?.draft;
      if (updatedDraft) {
        ctx.setDrafts(prev => {
          const updated = [...prev];
          const idx = updated.findIndex(d => d.id === draft!.id);
          if (idx >= 0) {
            updated[idx] = updatedDraft;
          }
          return updated;
        });

        if (updatedDraft.bbox_json?.entryAreas) {
          ctx.setEntryAreas(updatedDraft.bbox_json.entryAreas);
        }
      }
    } else {
      const response = await apiClient.post(
        `/api/church/${ctx.churchId}/ocr/jobs/${ctx.jobId}/fusion/drafts`,
        {
          entries: [{
            entry_index: entryIndex,
            record_type: ctx.recordType,
            payload_json: {},
            bbox_json: {
              entryBbox: entry.bbox,
              entryAreas: ctx.entryAreas,
              selections: {},
            },
          }],
        }
      );

      const savedDrafts = ctx.normalizeDraftsResponse(response);
      if (savedDrafts.length > 0) {
        ctx.setDrafts(prev => {
          const updated = [...prev];
          const newDraft = savedDrafts[0];
          const existingIdx = updated.findIndex(d => d.entry_index === entryIndex);
          if (existingIdx >= 0) {
            updated[existingIdx] = newDraft;
          } else {
            updated.push(newDraft);
          }
          return updated;
        });

        if (savedDrafts[0].bbox_json?.entryAreas) {
          ctx.setEntryAreas(savedDrafts[0].bbox_json.entryAreas);
        }
      }
    }

    ctx.setDirtyEntries(prev => {
      const next = new Set(prev);
      next.delete(entryIndex);
      return next;
    });

    ctx.setOriginalBboxes(prev => {
      const next = new Map(prev);
      next.set(entryIndex, entry.bbox);
      return next;
    });

    ctx.setError(null);
  } catch (err: any) {
    console.error('[Fusion] Save bbox error:', err);
    ctx.setError(err.message || 'Failed to save bbox');
  } finally {
    ctx.setIsProcessing(false);
  }
}
