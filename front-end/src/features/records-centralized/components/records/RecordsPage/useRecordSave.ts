/**
 * useRecordSave.ts — Record save (create/update) logic for RecordsPage.
 */

import { useCallback } from 'react';
import { recordsEvents } from '@/events/recordsEvents';
import { createRecordsApiService } from '@/features/records-centralized/components/records/RecordsApiService';
import { Church } from '@/shared/lib/churchService';
import type { BaptismRecord } from './types';
import { validateRecord, type FieldErrors } from './validation';

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
  // Field-level validation surface — the dialog shows error+helperText
  // per field and we publish the latest error map here whether the
  // submit attempt was blocked or accepted.
  setFieldErrors: (errors: FieldErrors) => void;
}

export function useRecordSave({
  selectedRecordType, selectedChurch, churches, editingRecord, formData,
  viewDialogOpen, viewEditMode,
  setLoading, setRecords, setDialogOpen, setViewingRecord, setViewEditMode,
  showToast, handleRowSelect, setFieldErrors,
}: UseRecordSaveOptions) {
  return useCallback(async () => {
    try {
      setLoading(true);

      // Field-level validation. The dialog renders these inline; we
      // also raise a summary toast so users who don't notice the
      // helperText still get clear feedback.
      const v = validateRecord(selectedRecordType, formData);
      if (!v.ok) {
        setFieldErrors(v.fieldErrors);
        const count = Object.keys(v.fieldErrors).length;
        showToast(
          count === 1
            ? `Please fix the highlighted field.`
            : `Please fix the ${count} highlighted fields.`,
          'error',
        );
        return;
      }
      // Cleared state — no errors going into save.
      setFieldErrors({});

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
          // Merge: prefer the server's freshly-SELECT'd row but fall
          // back to what we just sent so the grid never shows a blank
          // row even if a backend variant returns a stub payload.
          const merged = {
            ...editingRecord,
            ...updatedRecord,
            ...(response.data as object),
          } as BaptismRecord;
          setRecords(prev => prev.map(r => r.id === editingRecord.id ? merged : r));
          showToast('Record updated successfully', 'success');

          if (viewDialogOpen && viewEditMode === 'edit') {
            setViewingRecord(merged);
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
          // If the backend returned structured fieldErrors (400 from the
          // controller's own validation pass), surface them inline.
          const apiFieldErrors = (response as any)?.fieldErrors;
          if (apiFieldErrors && typeof apiFieldErrors === 'object') {
            setFieldErrors(apiFieldErrors);
          }
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
          const apiFieldErrors = (response as any)?.fieldErrors;
          if (apiFieldErrors && typeof apiFieldErrors === 'object') {
            setFieldErrors(apiFieldErrors);
          }
          showToast(response.error || 'Failed to create record', 'error');
        }
      }
    } catch (err: any) {
      // Some apiService variants throw on non-2xx instead of returning
      // {success: false}. Pull fieldErrors out of the rejection envelope
      // either way so inline errors stay accurate.
      const apiFieldErrors = err?.response?.data?.fieldErrors ?? err?.fieldErrors;
      if (apiFieldErrors && typeof apiFieldErrors === 'object') {
        setFieldErrors(apiFieldErrors);
      }
      console.error('Save error:', err);
      showToast(
        err?.response?.data?.error ||
        err?.message ||
        'Failed to save record',
        'error',
      );
    } finally {
      setLoading(false);
    }
  }, [selectedRecordType, selectedChurch, churches, editingRecord, formData, viewDialogOpen, viewEditMode, setLoading, setRecords, setDialogOpen, setViewingRecord, setViewEditMode, showToast, handleRowSelect, setFieldErrors]);
}
