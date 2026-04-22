/**
 * MarriageRecordEntryPage — Create / Edit Marriage Record
 *
 * Enterprise-grade form using shared SacramentalFormShell components.
 * Dynamic clergy dropdown via shared ClergySelector.
 * Supports both create (/portal/records/marriage/new) and edit modes.
 *
 * Field mapping (frontend → backend):
 *   groom_first_name → fname_groom
 *   groom_last_name  → lname_groom
 *   bride_first_name → fname_bride
 *   bride_last_name  → lname_bride
 *   marriage_date    → mdate
 *   clergy           → clergy
 *   witnesses        → witness
 *   marriage_place   → mlicense
 *   notes            → notes
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Heart } from '@/ui/icons';
import { useAuth } from '../../../context/AuthContext';
import { useChurch } from '../../../context/ChurchContext';
import { getMarriageDateRestriction } from '../../../shared/lib/sacramentalDateRestrictions';
import {
  inputClass,
  textareaClass,
  FormSection,
  FormField,
  FormDivider,
  ErrorAlert,
  SuccessAlert,
  DateRestrictionAlert,
  FormPageHeader,
  FormActionBar,
  FormLoadingSkeleton,
  FormModeToggle,
  WizardStepIndicator,
  WizardNavBar,
  type FormMode,
  type WizardStep,
} from '../shared/SacramentalFormShell';
import { ClergySelector } from '../shared/ClergySelector';

/* ─── Types ─── */

interface MarriageRecordFormData {
  groom_first_name: string;
  groom_last_name: string;
  bride_first_name: string;
  bride_last_name: string;
  marriage_date: string;
  clergy: string;
  witnesses: string;
  marriage_place: string;
  notes: string;
}

const REQUIRED_FIELDS: (keyof MarriageRecordFormData)[] = [
  'groom_first_name', 'groom_last_name', 'bride_first_name', 'bride_last_name',
  'marriage_date', 'clergy',
];

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

const MarriageRecordEntryPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { churchMetadata } = useChurch();

  const isEditMode = !!id;
  const churchId = searchParams.get('church_id') || user?.church_id?.toString() || '';
  const createAnotherRef = useRef(false);

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('form');
  const [wizardStep, setWizardStep] = useState(0);

  const WIZARD_STEPS: WizardStep[] = [
    { label: 'Groom', description: 'Full legal name of the groom.' },
    { label: 'Bride', description: 'Full legal name of the bride.' },
    { label: 'Ceremony', description: 'Date, location, and ceremony information.' },
    { label: 'Notes', description: 'Additional information.' },
  ];

  const [formData, setFormData] = useState<MarriageRecordFormData>({
    groom_first_name: '',
    groom_last_name: '',
    bride_first_name: '',
    bride_last_name: '',
    marriage_date: '',
    clergy: '',
    witnesses: '',
    marriage_place: '',
    notes: '',
  });

  // Date restriction check
  const dateRestriction = useMemo(
    () => getMarriageDateRestriction(formData.marriage_date),
    [formData.marriage_date],
  );

  // Load record data for edit mode
  useEffect(() => {
    if (isEditMode && id && churchId) {
      const loadRecord = async () => {
        try {
          setLoading(true);
          setError(null);
          const params = new URLSearchParams({ church_id: churchId });
          const data = await apiClient.get<any>(`/marriage-records/${id}?${params.toString()}`);
          if (data.success && data.record) {
            const r = data.record;
            setFormData({
              groom_first_name: r.fname_groom || '',
              groom_last_name: r.lname_groom || '',
              bride_first_name: r.fname_bride || '',
              bride_last_name: r.lname_bride || '',
              marriage_date: r.mdate || '',
              clergy: r.clergy || '',
              witnesses: r.witness || '',
              marriage_place: r.mlicense || '',
              notes: r.notes || '',
            });
          }
        } catch (err: any) {
          setError(err.message || 'Failed to load record');
        } finally {
          setLoading(false);
        }
      };
      loadRecord();
    }
  }, [isEditMode, id, churchId]);

  const isFieldError = (field: keyof MarriageRecordFormData) => {
    if (!REQUIRED_FIELDS.includes(field)) return false;
    const show = submitAttempted || touched.has(field);
    return show && !formData[field].trim();
  };

  const handleChange = (field: keyof MarriageRecordFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    setError(null);
    setSuccess(false);
  };

  const handleBlur = (field: string) => () => {
    setTouched((prev) => new Set(prev).add(field));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (!churchId) { setError('Church ID is required'); return; }

    const missingFields = REQUIRED_FIELDS.filter((f) => !formData[f].trim());
    if (missingFields.length > 0) { setError('Please fill in all required fields.'); return; }

    if (!isEditMode && dateRestriction?.severity === 'error') {
      setError(dateRestriction.message);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const url = isEditMode ? `/api/marriage-records/${id}` : '/api/marriage-records';
      const method = isEditMode ? 'PUT' : 'POST';
      const params = new URLSearchParams({ church_id: churchId });

      const backendData = {
        fname_groom: formData.groom_first_name,
        lname_groom: formData.groom_last_name,
        fname_bride: formData.bride_first_name,
        lname_bride: formData.bride_last_name,
        mdate: formData.marriage_date,
        witness: formData.witnesses,
        mlicense: formData.marriage_place,
        clergy: formData.clergy,
        church_id: parseInt(churchId),
      };

      const apiUrl = url.replace(/^\/api/, '');
      const data = isEditMode
        ? await apiClient.put<any>(`${apiUrl}?${params.toString()}`, backendData)
        : await apiClient.post<any>(`${apiUrl}?${params.toString()}`, backendData);
      if (data.success) {
        setSuccess(true);
        if (createAnotherRef.current) {
          createAnotherRef.current = false;
          setTimeout(() => {
            setFormData({
              groom_first_name: '', groom_last_name: '', bride_first_name: '', bride_last_name: '',
              marriage_date: '', clergy: '', witnesses: '', marriage_place: '', notes: '',
            });
            setSuccess(false);
            setTouched(new Set());
            setSubmitAttempted(false);
          }, 1000);
        } else {
          setTimeout(() => navigate('/portal'), 1500);
        }
      } else {
        throw new Error(data.error || 'Failed to save record');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save record');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => navigate('/portal');
  const formRef = useRef<HTMLFormElement>(null);

  const handleCreateAnother = () => {
    createAnotherRef.current = true;
    formRef.current?.requestSubmit();
  };

  /* ── Shared section renderers ── */

  const sectionGroom = (
    <FormSection title="Groom Information" description="Full legal name of the groom.">
      <FormField label="Groom First Name" required error={isFieldError('groom_first_name')}
        helperText={isFieldError('groom_first_name') ? 'First name is required' : undefined}>
        <input type="text" value={formData.groom_first_name}
          onChange={(e) => { setFormData(p => ({ ...p, groom_first_name: e.target.value })); setError(null); }}
          onBlur={handleBlur('groom_first_name')} placeholder="e.g. Alexander"
          className={inputClass(isFieldError('groom_first_name'))} />
      </FormField>
      <FormField label="Groom Last Name" required error={isFieldError('groom_last_name')}
        helperText={isFieldError('groom_last_name') ? 'Last name is required' : undefined}>
        <input type="text" value={formData.groom_last_name}
          onChange={(e) => { setFormData(p => ({ ...p, groom_last_name: e.target.value })); setError(null); }}
          onBlur={handleBlur('groom_last_name')} placeholder="e.g. Petrov"
          className={inputClass(isFieldError('groom_last_name'))} />
      </FormField>
    </FormSection>
  );

  const sectionBride = (
    <FormSection title="Bride Information" description="Full legal name of the bride.">
      <FormField label="Bride First Name" required error={isFieldError('bride_first_name')}
        helperText={isFieldError('bride_first_name') ? 'First name is required' : undefined}>
        <input type="text" value={formData.bride_first_name}
          onChange={(e) => { setFormData(p => ({ ...p, bride_first_name: e.target.value })); setError(null); }}
          onBlur={handleBlur('bride_first_name')} placeholder="e.g. Maria"
          className={inputClass(isFieldError('bride_first_name'))} />
      </FormField>
      <FormField label="Bride Last Name" required error={isFieldError('bride_last_name')}
        helperText={isFieldError('bride_last_name') ? 'Last name is required' : undefined}>
        <input type="text" value={formData.bride_last_name}
          onChange={(e) => { setFormData(p => ({ ...p, bride_last_name: e.target.value })); setError(null); }}
          onBlur={handleBlur('bride_last_name')} placeholder="e.g. Ivanova"
          className={inputClass(isFieldError('bride_last_name'))} />
      </FormField>
    </FormSection>
  );

  const sectionDetails = (
    <FormSection title="Marriage Details" description="Date, location, and ceremony information.">
      <FormField label="Marriage Date" required
        error={isFieldError('marriage_date') || (!isEditMode && dateRestriction?.severity === 'error')}
        helperText={isFieldError('marriage_date') ? 'Marriage date is required' : undefined}>
        <input type="date" value={formData.marriage_date}
          onChange={handleChange('marriage_date')} onBlur={handleBlur('marriage_date')}
          className={inputClass(isFieldError('marriage_date') || (!isEditMode && dateRestriction?.severity === 'error'))} />
        {dateRestriction && (
          <DateRestrictionAlert message={dateRestriction.message} isEditMode={isEditMode} />
        )}
      </FormField>
      <FormField label="Marriage Place">
        <input type="text" value={formData.marriage_place}
          onChange={handleChange('marriage_place')} placeholder="Church or location name"
          className={inputClass()} />
      </FormField>
      <FormField label="Clergy" required error={isFieldError('clergy')}
        helperText={isFieldError('clergy') ? 'Clergy is required' : 'Select from list or type a name'}>
        <ClergySelector
          churchId={churchId}
          recordType="marriage"
          value={formData.clergy}
          onChange={(v) => { setFormData(p => ({ ...p, clergy: v })); setError(null); setSuccess(false); }}
          onBlur={handleBlur('clergy')}
          error={isFieldError('clergy')}
        />
      </FormField>
      <FormField label="Witnesses">
        <textarea value={formData.witnesses} onChange={handleChange('witnesses')}
          placeholder="Names of witnesses" rows={2} className={textareaClass()} />
      </FormField>
    </FormSection>
  );

  const sectionNotes = (
    <FormSection title="Additional Information">
      <FormField label="Notes" fullWidth>
        <textarea value={formData.notes} onChange={handleChange('notes')}
          placeholder="Any additional notes about this record..." rows={4}
          className={textareaClass()} />
      </FormField>
    </FormSection>
  );

  const wizardSections = [sectionGroom, sectionBride, sectionDetails, sectionNotes];

  if (loading) return <FormLoadingSkeleton />;

  return (
    <div className="max-w-[820px] mx-auto py-6 px-4">
      <div className="flex items-start justify-between">
        <FormPageHeader
          backLabel="Back to Portal"
          backTo={handleCancel}
          icon={Heart}
          iconColor="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
          title={isEditMode ? 'Edit Marriage Record' : 'New Marriage Record'}
          subtitle={isEditMode
            ? 'Update the details for this marriage record.'
            : 'Enter the details for a new marriage record.'}
          parishName={churchMetadata?.church_name_display || undefined}
        />
        {!isEditMode && (
          <div className="flex-shrink-0 pt-8">
            <FormModeToggle mode={formMode} onChange={(m) => { setFormMode(m); setWizardStep(0); }} />
          </div>
        )}
      </div>

      {error && <ErrorAlert message={error} onClose={() => setError(null)} />}
      {success && <SuccessAlert message={`Record ${isEditMode ? 'updated' : 'created'} successfully. Redirecting...`} />}

      <form ref={formRef} onSubmit={handleSubmit}>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 md:p-8">
            {formMode === 'wizard' && (
              <WizardStepIndicator steps={WIZARD_STEPS} current={wizardStep} />
            )}

            {formMode === 'form' ? (
              <>
                {sectionGroom}
                <FormDivider />
                {sectionBride}
                <FormDivider />
                {sectionDetails}
                <FormDivider />
                {sectionNotes}
              </>
            ) : (
              wizardSections[wizardStep]
            )}
          </div>

          {formMode === 'form' ? (
            <FormActionBar saving={saving} isEditMode={isEditMode} onCancel={handleCancel} onCreateAnother={handleCreateAnother} />
          ) : (
            <WizardNavBar
              step={wizardStep}
              totalSteps={WIZARD_STEPS.length}
              onPrev={() => setWizardStep(s => Math.max(0, s - 1))}
              onNext={() => setWizardStep(s => Math.min(WIZARD_STEPS.length - 1, s + 1))}
              saving={saving}
              isEditMode={isEditMode}
              onCancel={handleCancel}
              onCreateAnother={handleCreateAnother}
            />
          )}
        </div>
      </form>
    </div>
  );
};

export default MarriageRecordEntryPage;
