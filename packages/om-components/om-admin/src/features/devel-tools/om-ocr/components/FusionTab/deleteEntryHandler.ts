/**
 * deleteEntryHandler.ts — Entry deletion logic with reindexing for FusionTab.
 */

import { FusionEntry, FusionDraft, BBox } from '../../types/fusion';

interface DeleteEntryContext {
  entries: FusionEntry[];
  selectedEntryIndex: number | null;
  drafts: FusionDraft[];
  setEntries: React.Dispatch<React.SetStateAction<FusionEntry[]>>;
  setSelectedEntryIndex: (idx: number | null) => void;
  setEntryData: React.Dispatch<React.SetStateAction<Map<number, any>>>;
  setDirtyEntries: React.Dispatch<React.SetStateAction<Set<number>>>;
  setOriginalBboxes: React.Dispatch<React.SetStateAction<Map<number, BBox>>>;
  setManualEditMode: React.Dispatch<React.SetStateAction<Set<number>>>;
  setCompletedEntries: React.Dispatch<React.SetStateAction<Set<number>>>;
  setDrafts: React.Dispatch<React.SetStateAction<FusionDraft[]>>;
  setError: (err: string | null) => void;
}

function reindexSet(prev: Set<number>, deletedIndex: number): Set<number> {
  const reindexed = new Set<number>();
  prev.forEach(idx => {
    if (idx < deletedIndex) reindexed.add(idx);
    else if (idx > deletedIndex) reindexed.add(idx - 1);
  });
  return reindexed;
}

export function handleDeleteEntryLogic(entryIndex: number, ctx: DeleteEntryContext): void {
  if (ctx.entries.length <= 1) {
    ctx.setError('Cannot delete the last entry. At least one entry is required.');
    return;
  }

  ctx.setEntries(prev => prev.filter((_, idx) => idx !== entryIndex));

  if (ctx.selectedEntryIndex === entryIndex) {
    ctx.setSelectedEntryIndex(entryIndex > 0 ? entryIndex - 1 : 0);
  } else if (ctx.selectedEntryIndex !== null && ctx.selectedEntryIndex > entryIndex) {
    ctx.setSelectedEntryIndex(ctx.selectedEntryIndex - 1);
  }

  ctx.setEntryData(prev => {
    const newData = new Map<number, any>();
    prev.forEach((data, idx) => {
      if (idx < entryIndex) newData.set(idx, data);
      else if (idx > entryIndex) newData.set(idx - 1, data);
    });
    return newData;
  });

  ctx.setDirtyEntries(prev => {
    const next = new Set(prev);
    next.delete(entryIndex);
    return reindexSet(next, entryIndex);
  });

  ctx.setOriginalBboxes(prev => {
    const reindexed = new Map<number, BBox>();
    prev.forEach((bbox, idx) => {
      if (idx < entryIndex) reindexed.set(idx, bbox);
      else if (idx > entryIndex) reindexed.set(idx - 1, bbox);
    });
    return reindexed;
  });

  ctx.setManualEditMode(prev => {
    const next = new Set(prev);
    next.delete(entryIndex);
    return reindexSet(next, entryIndex);
  });

  ctx.setCompletedEntries(prev => {
    const next = new Set(prev);
    next.delete(entryIndex);
    return reindexSet(next, entryIndex);
  });

  const draft = ctx.drafts.find(d => d.entry_index === entryIndex);
  if (draft && draft.id) {
    ctx.setDrafts(prev => prev.filter(d => d.entry_index !== entryIndex));
  }
}
