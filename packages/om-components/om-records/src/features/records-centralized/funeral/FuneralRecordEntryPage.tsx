/**
 * FuneralRecordEntryPage — Create / Edit Funeral Record
 *
 * Enterprise-grade form using shared SacramentalFormShell components.
 * Dynamic clergy dropdown via shared ClergySelector.
 * Supports both create (/portal/records/funeral/new) and edit modes.
 *
 * Field mapping (frontend → backend):
 *   first_name      → name
 *   last_name       → lastname
 *   death_date      → deceased_date
 *   burial_date     → burial_date
 *   burial_location → burial_location
 *   age_at_death    → age (parseInt)
 *   clergy          → clergy
 *   notes           → notes
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Cross } from '@/ui/icons';
import { useAuth } from '../../../context/AuthContext';
import { useChurch } from '../../../context/ChurchContext';
import { getFuneralDateRestriction } from '../../../shared/lib/sacramentalDateRestrictions';
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

interface FuneralRecordFormData {
  first_name: string;
  last_name: string;
  death_date: string;
  burial_date: string;
  burial_location: string;
  age_at_death: string;
  clergy: string;
  notes: string;
}

const REQUIRED_FIELDS: (keyof FuneralRecordFormData)[] = [
  'first_name', 'last_name', 'death_date', 'clergy',
];

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

const FuneralRecordEntryPage: React.FC = () => {
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
    { label: 'Deceased', description: 'Identity and vital details of the deceased.' },
    { label: 'Burial', description: 'Dates and location of death and burial.' },
    { label: 'Clergy & Notes', description: 'Officiating clergy and additional information.' },
  ];

  const [formData, setFormData] = useState<FuneralRecordFormData>({
    first_name: '',
    last_name: '',
    death_date: '',
    burial_date: '',
    burial_location: '',
    age_at_death: '',
    clergy: '',
    notes: '',
  });

  // Date restriction check
  const dateRestriction = useMemo(
    () => getFuneralDateRestriction(formData.death_date, formData.burial_date),
    [formData.death_date, formData.burial_date],
  );

  // Load record data for edit mode
  useEffect(() => {
    if (isEditMode && id && churchId) {
      const loadRecord = async () => {
        try {
          setLoading(true);
          setError(null);
          const params = new URLSearchParams({ church_id: churchId });
          const data = await apiClient.get<any>(`/funeral-records/${id}?${params.toString()}`);
          if (data.success && data.record) {
            const r = data.record;
            setFormData({
              first_name: r.name || '',
              last_name: r.lastname || '',
              death_date: r.deceased_date || '',
              burial_date: r.burial_date || '',
              burial_location: r.burial_location || '',
              age_at_death: r.age?.toString() || '',
              clergy: r.clergy || '',
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

  const isFieldError = (field: keyof FuneralRecordFormData) => {
    if (!REQUIRED_FIELDS.includes(field)) return false;
    const show = submitAttempted || touched.has(field);
    return show && !formData[field].trim();
  };

  const handleChange = (field: keyof FuneralRecordFormData) => (
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

    if (dateRestriction?.severity === 'error') {
      setError(dateRestriction.message);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const url = isEditMode ? `/api/funeral-records/${id}` : '/api/funeral-records';
      const method = isEditMode ? 'PUT' : 'POST';
      const params = new URLSearchParams({ church_id: churchId });

      const backendData = {
        name: formData.first_name,
        lastname: formData.last_name,
        deceased_date: formData.death_date,
        burial_date: formData.burial_date,
        burial_location: formData.burial_location,
        age: formData.age_at_death ? parseInt(formData.age_at_death) : null,
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
              first_name: '', last_name: '', death_date: '', burial_date: '',
              burial_location: '', age_at_death: '', clergy: '', notes: '',
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

  const sectionDeceased = (
    <FormSection title="Deceased Information" description="Identity and vital details of the deceased.">
      <FormField label="First Name" required error={isFieldError('first_name')}
        helperText={isFieldError('first_name') ? 'First name is required' : undefined}>
        <input type="text" value={formData.first_name}
          onChange={(e) => { setFormData(p => ({ ...p, first_name: e.target.value })); setError(null); }}
          onBlur={handleBlur('first_name')} placeholder="e.g. Alexander"
          className={inputClass(isFieldError('first_name'))} />
      </FormField>
      <FormField label="Last Name" required error={isFieldError('last_name')}
        helperText={isFieldError('last_name') ? 'Last name is required' : undefined}>
        <input type="text" value={formData.last_name}
          onChange={(e) => { setFormData(p => ({ ...p, last_name: e.target.value })); setError(null); }}
          onBlur={handleBlur('last_name')} placeholder="e.g. Petrov"
          className={inputClass(isFieldError('last_name'))} />
      </FormField>
      <FormField label="Age at Death">
        <input type="number" value={formData.age_at_death}
          onChange={handleChange('age_at_death')} placeholder="e.g. 78"
          min={0} className={inputClass()} />
      </FormField>
    </FormSection>
  );

  const sectionBurial = (
    <FormSection title="Death & Burial Details" description="Dates and location of death and burial.">
      <FormField label="Death Date" required error={isFieldError('death_date')}
        helperText={isFieldError('death_date') ? 'Death date is required' : undefined}>
        <input type="date" value={formData.death_date}
          onChange={handleChange('death_date')} onBlur={handleBlur('death_date')}
          className={inputClass(isFieldError('death_date'))} />
      </FormField>
      <FormField label="Burial Date"
        error={dateRestriction?.severity === 'error'}>
        <input type="date" value={formData.burial_date}
          onChange={handleChange('burial_date')}
          className={inputClass(dateRestriction?.severity === 'error')} />
        {dateRestriction && (
          <DateRestrictionAlert message={dateRestriction.message} isEditMode={isEditMode} />
        )}
      </FormField>
      <FormField label="Burial Location">
        <input type="text" value={formData.burial_location}
          onChange={handleChange('burial_location')} placeholder="Cemetery or location name"
          className={inputClass()} />
      </FormField>
    </FormSection>
  );

  const sectionClergyNotes = (
    <FormSection title="Clergy & Notes" description="Officiating clergy and additional information.">
      <FormField label="Clergy" required error={isFieldError('clergy')}
        helperText={isFieldError('clergy') ? 'Clergy is required' : 'Select from list or type a name'}>
        <ClergySelector
          churchId={churchId}
          recordType="funeral"
          value={formData.clergy}
          onChange={(v) => { setFormData(p => ({ ...p, clergy: v })); setError(null); setSuccess(false); }}
          onBlur={handleBlur('clergy')}
          error={isFieldError('clergy')}
        />
      </FormField>
      <FormField label="Notes" fullWidth>
        <textarea value={formData.notes} onChange={handleChange('notes')}
          placeholder="Any additional notes about this record..." rows={4}
          className={textareaClass()} />
      </FormField>
    </FormSection>
  );

  const wizardSections = [sectionDeceased, sectionBurial, sectionClergyNotes];

  if (loading) return <FormLoadingSkeleton />;

  return (
    <div className="max-w-[820px] mx-auto py-6 px-4">
      <div className="flex items-start justify-between">
        <FormPageHeader
          backLabel="Back to Portal"
          backTo={handleCancel}
          icon={Cross}
          iconColor="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
          title={isEditMode ? 'Edit Funeral Record' : 'New Funeral Record'}
          subtitle={isEditMode
            ? 'Update the details for this funeral record.'
            : 'Enter the details for a new funeral or memorial record.'}
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
                {sectionDeceased}
                <FormDivider />
                {sectionBurial}
                <FormDivider />
                {sectionClergyNotes}
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

export default FuneralRecordEntryPage;
