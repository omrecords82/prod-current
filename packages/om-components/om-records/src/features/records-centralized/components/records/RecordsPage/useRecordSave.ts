/**
 * useRecordSave.ts — Record save (create/update) logic for RecordsPage.
 */

import { useCallback } from 'react';
import { recordsEvents } from '@/events/recordsEvents';
import { createRecordsApiService } from '@/features/records-centralized/components/records/RecordsApiService';
import { Church } from '@/shared/lib/churchService';
import type { BaptismRecord } from './types';

interface UseRecordSaveOptions {
  selectedRecordType: string;
  selectedChurch: number | null;
  churches: Church[];
  editingRecord: BaptismRecord | null;
  formData: Partial<BaptismRecord> & { customPriest?: boolean; [key: string]: any };
  viewDialogOpen: boolean;
  viewEditMode: string;
  setLoading: (v: boolean) => void;
  setRecords: React.Dispatch<React.SetStateAction<BaptismRecord[]>>;
  setDialogOpen: (v: boolean) => void;
  setViewingRecord: (r: BaptismRecord | null) => void;
  setViewEditMode: (m: string) => void;
  showToast: (msg: string, severity: 'success' | 'error' | 'info') => void;
  handleRowSelect: (id: any) => void;
}

export function useRecordSave({
  selectedRecordType, selectedChurch, churches, editingRecord, formData,
  viewDialogOpen, viewEditMode,
  setLoading, setRecords, setDialogOpen, setViewingRecord, setViewEditMode,
  showToast, handleRowSelect,
}: UseRecordSaveOptions) {
  return useCallback(async () => {
    try {
      setLoading(true);

      let validationError = '';
      if (selectedRecordType === 'marriage') {
        if (!formData.groomFirstName || !formData.groomLastName ||
            !formData.brideFirstName || !formData.brideLastName ||
            !formData.marriageDate) {
          validationError = 'Please fill in groom names, bride names, and marriage date';
        }
      } else if (selectedRecordType === 'funeral') {
        if (!(formData.deceasedFirstName || formData.firstName) ||
            !(formData.deceasedLastName || formData.lastName) ||
            !(formData.deathDate || formData.dateOfDeath)) {
          validationError = 'Please fill in deceased name and death date';
        }
      } else {
        if (!formData.firstName || !formData.lastName || !formData.dateOfBaptism) {
          validationError = 'Please fill in first name, last name, and baptism date';
        }
      }

      if (validationError) {
        showToast(validationError, 'error');
        return;
      }

      const churchId = selectedChurch ? selectedChurch.toString() : '';
      const churchName = churches.find(c => c.id === selectedChurch)?.church_name || '';

      if (!churchId || churchId === '0' || churchId === '') {
        showToast('Please select a church before saving records', 'error');
        setLoading(false);
        return;
      }

      const apiService = createRecordsApiService(churchId);

      if (editingRecord) {
        const updatedRecord: BaptismRecord = {
          ...editingRecord,
          ...formData,
          churchName,
          updatedAt: new Date().toISOString(),
        } as BaptismRecord;

        const response = await apiService.updateRecord(selectedRecordType, editingRecord.id, updatedRecord);

        if (response.success && response.data) {
          setRecords(prev => prev.map(r => r.id === editingRecord.id ? response.data as BaptismRecord : r));
          showToast('Record updated successfully', 'success');

          if (viewDialogOpen && viewEditMode === 'edit') {
            setViewingRecord(response.data as BaptismRecord);
            setViewEditMode('view');
          } else {
            setDialogOpen(false);
          }

          recordsEvents.emit({
            churchId: selectedChurch,
            recordType: selectedRecordType as any,
            mutationType: 'update',
            recordId: editingRecord.id,
          });
        } else {
          showToast(response.error || 'Failed to update record', 'error');
        }
      } else {
        let newRecord: any = {
          ...formData,
          churchName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (selectedRecordType === 'funeral') {
          newRecord = {
            firstName: formData.deceasedFirstName || formData.firstName,
            lastName: formData.deceasedLastName || formData.lastName,
            dateOfDeath: formData.deathDate || formData.dateOfDeath,
            burialDate: formData.burialDate,
            age: formData.age,
            priest: formData.priest,
            burialLocation: formData.burialLocation,
            church_id: churchId,
          };
        }

        const response = await apiService.createRecord(selectedRecordType, newRecord);

        if (response.success && response.data) {
          setRecords(prev => [...prev, response.data as BaptismRecord]);
          showToast('Record created successfully', 'success');
          setDialogOpen(false);
          handleRowSelect(response.data.id);

          recordsEvents.emit({
            churchId: selectedChurch,
            recordType: selectedRecordType as any,
            mutationType: 'create',
            recordId: response.data.id,
          });
        } else {
          showToast(response.error || 'Failed to create record', 'error');
        }
      }
    } catch (err) {
      console.error('Save error:', err);
      showToast('Failed to save record', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedRecordType, selectedChurch, churches, editingRecord, formData, viewDialogOpen, viewEditMode, setLoading, setRecords, setDialogOpen, setViewingRecord, setViewEditMode, showToast, handleRowSelect]);
}
