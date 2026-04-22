/**
 * loadExistingData.ts — Mount effect to load existing drafts/mappings for FusionTab.
 */

import { FusionDraft, MappedField } from '../../types/fusion';
import { apiClient } from '@/shared/lib/axiosInstance';

interface LoadExistingDataParams {
  churchId: number;
  jobId: number;
  initialRecordType: 'baptism' | 'marriage' | 'funeral';
  normalizeDraftsResponse: (response: any) => FusionDraft[];
  setDrafts: React.Dispatch<React.SetStateAction<FusionDraft[]>>;
  setEntryData: React.Dispatch<React.SetStateAction<Map<number, any>>>;
}

export async function loadExistingData(params: LoadExistingDataParams): Promise<void> {
  const { churchId, jobId, initialRecordType, normalizeDraftsResponse, setDrafts, setEntryData } = params;

  try {
    const draftsResponse = await apiClient.get(
      `/api/church/${churchId}/ocr/jobs/${jobId}/fusion/drafts`
    );

    const loadedDrafts = normalizeDraftsResponse(draftsResponse);

    console.log('[FusionTab] Loaded drafts on mount:', {
      draftsCount: loadedDrafts.length,
    });

    setDrafts(loadedDrafts);

    if (loadedDrafts.length > 0) {
      setEntryData(prev => {
        const newData = new Map(prev);
        for (const draft of loadedDrafts) {
          const payload = typeof draft.payload_json === 'string'
            ? JSON.parse(draft.payload_json)
            : draft.payload_json || {};

          const fields: Record<string, MappedField> = {};
          for (const [key, value] of Object.entries(payload)) {
            if (value) {
              fields[key] = {
                value: String(value),
                confidence: 0.9,
              };
            }
          }

          newData.set(draft.entry_index, {
            labels: [],
            fields,
            recordType: draft.record_type || initialRecordType,
          });
        }
        return newData;
      });
    }

    // Backwards-compatible mapping endpoint
    try {
      const mappingResponse = await apiClient.get(
        `/api/church/${churchId}/ocr/jobs/${jobId}/mapping`
      );
      const existingMapping = (mappingResponse as any).data;

      if (existingMapping?.mapping_json && Object.keys(existingMapping.mapping_json).length > 0) {
        setEntryData(prev => {
          if (prev.size === 0 || !prev.has(0)) {
            const newData = new Map(prev);
            const fields: Record<string, MappedField> = {};

            for (const [key, val] of Object.entries(existingMapping.mapping_json)) {
              const mappingVal = val as { value?: string; confidence?: number };
              if (mappingVal?.value) {
                fields[key] = {
                  value: mappingVal.value,
                  confidence: mappingVal.confidence || 0.8,
                };
              }
            }

            newData.set(0, {
              labels: [],
              fields,
              recordType: existingMapping.record_type || initialRecordType,
            });
            return newData;
          }
          return prev;
        });
      }
    } catch (mappingErr) {
      console.debug('[Fusion] No existing mapping found');
    }
  } catch (err) {
    console.warn('[Fusion] Could not load existing data:', err);
  }
}
