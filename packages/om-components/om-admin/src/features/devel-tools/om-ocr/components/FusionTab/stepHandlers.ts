/**
 * stepHandlers.ts — Step 2 (Anchor Labels) and Step 3 (Map Fields) handlers.
 */

import { alpha } from '@mui/material';
import {
  FusionEntry,
  DetectedLabel,
  MappedField,
  BBox,
} from '../../types/fusion';
import { detectLabels, autoMapFields } from '../../utils/visionParser';

interface StepHandlerContext {
  selectedEntryIndex: number | null;
  entries: FusionEntry[];
  entryData: Map<number, { labels: DetectedLabel[]; fields: Record<string, MappedField>; recordType: 'baptism' | 'marriage' | 'funeral' }>;
  recordType: 'baptism' | 'marriage' | 'funeral';
  detectedLabels: DetectedLabel[];
  mappedFields: Record<string, MappedField>;
  hasVisionData: boolean;
  stickyDefaults: Record<string, boolean>;
  setIsProcessing: (v: boolean) => void;
  setError: (err: string | null) => void;
  setDetectedLabels: (labels: DetectedLabel[]) => void;
  setMappedFields: React.Dispatch<React.SetStateAction<Record<string, MappedField>>>;
  setEntryData: React.Dispatch<React.SetStateAction<Map<number, any>>>;
  onHighlightMultiple?: (boxes: any[]) => void;
  onHighlightBbox?: (bbox: BBox, color: string) => void;
}

export async function handleDetectLabelsLogic(ctx: StepHandlerContext): Promise<void> {
  const { selectedEntryIndex, entries, entryData, recordType } = ctx;
  if (selectedEntryIndex === null || !entries[selectedEntryIndex]) return;

  ctx.setIsProcessing(true);
  ctx.setError(null);

  try {
    await new Promise(resolve => setTimeout(resolve, 300));
    const entry = entries[selectedEntryIndex];
    const currentRecordType = entryData.get(selectedEntryIndex)?.recordType || recordType;
    const labels = detectLabels(entry, currentRecordType);
    ctx.setDetectedLabels(labels);

    ctx.setEntryData(prev => {
      const newData = new Map(prev);
      const existing = newData.get(selectedEntryIndex) || { labels: [], fields: {}, recordType };
      newData.set(selectedEntryIndex, { ...existing, labels });
      return newData;
    });

    if (ctx.onHighlightMultiple && ctx.hasVisionData) {
      const entryBox = entry?.bbox ? [{ bbox: entry.bbox, color: alpha('#4CAF50', 0.3), label: `Entry ${selectedEntryIndex + 1}` }] : [];
      const labelBoxes = labels.map(l => ({ bbox: l.bbox || { x: 0, y: 0, w: 0, h: 0 }, color: '#2196F3', label: l.label || l.text || '' }));
      ctx.onHighlightMultiple([...entryBox, ...labelBoxes]);
    }
  } catch (err: any) {
    console.error('[Fusion] Label detection error:', err);
    ctx.setError(err.message || 'Failed to detect labels');
  } finally {
    ctx.setIsProcessing(false);
  }
}

export async function handleAutoMapLogic(ctx: StepHandlerContext): Promise<void> {
  const { selectedEntryIndex, entries, entryData, recordType, detectedLabels, stickyDefaults } = ctx;
  if (selectedEntryIndex === null || !entries[selectedEntryIndex]) return;

  ctx.setIsProcessing(true);
  ctx.setError(null);

  try {
    await new Promise(resolve => setTimeout(resolve, 300));
    const entry = entries[selectedEntryIndex];
    const labels = entryData.get(selectedEntryIndex)?.labels || detectedLabels;
    const mapped = autoMapFields(entry, labels, recordType, stickyDefaults);

    const fields: Record<string, MappedField> = {};
    for (const [fieldName, data] of Object.entries(mapped)) {
      fields[fieldName] = {
        fieldName,
        label: fieldName,
        value: data.value,
        confidence: data.confidence,
        valueBbox: data.valueBbox,
        labelBbox: data.labelBbox,
      };
    }

    ctx.setMappedFields(fields);
    ctx.setEntryData(prev => {
      const newData = new Map(prev);
      const existing = newData.get(selectedEntryIndex) || { labels: [], fields: {}, recordType };
      newData.set(selectedEntryIndex, { ...existing, fields });
      return newData;
    });
  } catch (err: any) {
    console.error('[Fusion] Auto-map error:', err);
    ctx.setError(err.message || 'Failed to auto-map fields');
  } finally {
    ctx.setIsProcessing(false);
  }
}

export function handleFieldChangeLogic(
  fieldName: string,
  value: string,
  selectedEntryIndex: number | null,
  recordType: string,
  setMappedFields: React.Dispatch<React.SetStateAction<Record<string, MappedField>>>,
  setEntryData: React.Dispatch<React.SetStateAction<Map<number, any>>>,
): void {
  const newField = { fieldName, label: fieldName, confidence: 1, isManual: true, value };

  setMappedFields(prev => ({
    ...prev,
    [fieldName]: { ...(prev[fieldName] || newField), value, isManual: true },
  }));

  if (selectedEntryIndex !== null) {
    setEntryData(prev => {
      const newData = new Map(prev);
      const existing = newData.get(selectedEntryIndex) || { labels: [], fields: {}, recordType };
      const updatedFields = {
        ...existing.fields,
        [fieldName]: { ...(existing.fields[fieldName] || newField), value, isManual: true },
      };
      newData.set(selectedEntryIndex, { ...existing, fields: updatedFields });
      return newData;
    });
  }
}
