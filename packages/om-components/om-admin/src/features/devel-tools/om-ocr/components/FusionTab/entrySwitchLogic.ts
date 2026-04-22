/**
 * entrySwitchLogic.ts — Logic for handling entry switching with auto-detect and auto-map.
 */

import {
  FusionEntry,
  DetectedLabel,
  MappedField,
} from '../../types/fusion';
import { detectLabels, autoMapFields } from '../../utils/visionParser';

interface EntrySwitchParams {
  activeStep: number;
  selectedEntryIndex: number | null;
  entries: FusionEntry[];
  entryData: Map<number, { labels: DetectedLabel[]; fields: Record<string, MappedField>; recordType: 'baptism' | 'marriage' | 'funeral' }>;
  initialRecordType: 'baptism' | 'marriage' | 'funeral';
  stickyDefaults: Record<string, boolean>;
  setDetectedLabels: (labels: DetectedLabel[]) => void;
  setMappedFields: React.Dispatch<React.SetStateAction<Record<string, MappedField>>>;
  setRecordType: (type: 'baptism' | 'marriage' | 'funeral') => void;
  setActiveStep: (step: number) => void;
  setEntryData: React.Dispatch<React.SetStateAction<Map<number, any>>>;
}

export function handleEntrySwitch(params: EntrySwitchParams): void {
  const {
    activeStep, selectedEntryIndex, entries, entryData, initialRecordType, stickyDefaults,
    setDetectedLabels, setMappedFields, setRecordType, setActiveStep, setEntryData,
  } = params;

  // Don't auto-advance if we're on step 0 (Detect Entries)
  if (activeStep === 0) return;

  if (selectedEntryIndex !== null && entryData.has(selectedEntryIndex)) {
    const data = entryData.get(selectedEntryIndex)!;
    setDetectedLabels(data.labels || []);
    setMappedFields(data.fields || {});
    setRecordType(data.recordType || initialRecordType);

    if (data.labels && data.labels.length > 0) {
      setActiveStep(2); // Map Fields
    } else {
      setActiveStep(1); // Anchor Labels
    }
  } else if (selectedEntryIndex !== null && entries[selectedEntryIndex]) {
    setDetectedLabels([]);
    setMappedFields({});

    const entry = entries[selectedEntryIndex];
    const currentRecordType = initialRecordType;
    const labels = detectLabels(entry, currentRecordType);

    if (labels.length > 0) {
      setDetectedLabels(labels);
      setEntryData(prev => {
        const newData = new Map(prev);
        newData.set(selectedEntryIndex!, { labels, fields: {}, recordType: currentRecordType });
        return newData;
      });

      const fields = autoMapFields(entry, labels, currentRecordType, stickyDefaults);
      setMappedFields(fields);
      setEntryData(prev => {
        const newData = new Map(prev);
        const existing = newData.get(selectedEntryIndex!) || { labels: [], fields: {}, recordType: currentRecordType };
        newData.set(selectedEntryIndex!, { ...existing, fields });
        return newData;
      });

      setActiveStep(2); // Map Fields
    } else {
      setActiveStep(1); // Anchor Labels
    }
  }
}
