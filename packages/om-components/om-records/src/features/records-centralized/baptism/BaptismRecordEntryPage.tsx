/**
 * BaptismRecordEntryPage — Create / Edit Baptism Record
 *
 * Enterprise-grade form using shared SacramentalFormShell components.
 * Dynamic clergy dropdown via shared ClergySelector.
 * Supports both create (/portal/records/baptism/new) and edit modes.
 *
 * Field mapping (frontend → backend):
 *   first_name    → first_name
 *   last_name     → last_name
 *   birth_date    → birth_date
 *   reception_date→ reception_date
 *   clergy        → clergy
 *   birthplace    → birthplace
 *   parents       → parents
 *   sponsors      → sponsors
 *   entry_type    → entry_type
 *   notes         → notes
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Users } from '@/ui/icons';
import { useAuth } from '../../../context/AuthContext';
import { useChurch } from '../../../context/ChurchContext';
import { getBaptismDateRestriction } from '../../../shared/lib/sacramentalDateRestrictions';
import {
  inputClass,
  textareaClass,
  FormSection,
  FormField,
  FormDivider,
  SelectField,
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

interface BaptismRecordFormData {
  first_name: string;
  last_name: string;
  birth_date: string;
  reception_date: string;
  clergy: string;
  birthplace: string;
  parents: string;
  sponsors: string;
  entry_type: string;
  notes: string;
}

const REQUIRED_FIELDS: (keyof BaptismRecordFormData)[] = [
  'first_name', 'last_name', 'birth_date', 'reception_date', 'clergy', 'entry_type',
];

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

const BaptismRecordEntryPage: React.FC = () => {
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
    { label: 'Record Details', description: 'Primary information about the baptism.' },
    { label: 'Family & Context', description: 'Family and parish context information.' },
    { label: 'Notes', description: 'Additional information.' },
  ];

  const [formData, setFormData] = useState<BaptismRecordFormData>({
    first_name: '',
    last_name: '',
    birth_date: '',
    reception_date: '',
    clergy: '',
    birthplace: '',
    parents: '',
    sponsors: '',
    entry_type: 'Baptism',
    notes: '',
  });

  // Load record data for edit mode
  useEffect(() => {
    if (isEditMode && id && churchId) {
      const loadRecord = async () => {
        try {
          setLoading(true);
          setError(null);
          const params = new URLSearchParams({ church_id: churchId });
          const data = await apiClient.get<any>(`/baptism-records/${id}?${params.toString()}`);
          if (data.success && data.record) {
            const r = data.record;
            setFormData({
              first_name: r.first_name || '',
              last_name: r.last_name || '',
              birth_date: r.birth_date || '',
              reception_date: r.reception_date || '',
              clergy: r.clergy || '',
              birthplace: r.birthplace || '',
              parents: r.parents || '',
              sponsors: r.sponsors || '',
              entry_type: r.entry_type || 'Baptism',
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

  // Validation
  const dateRestriction = useMemo(() => {
    const r = getBaptismDateRestriction(formData.reception_date);
    return r ? r.message : null;
  }, [formData.reception_date]);

  const dateBeforeBirth = useMemo(() => {
    if (!formData.birth_date || !formData.reception_date) return false;
    return formData.reception_date < formData.birth_date;
  }, [formData.birth_date, formData.reception_date]);

  const isFieldError = (field: keyof BaptismRecordFormData) => {
    if (!REQUIRED_FIELDS.includes(field)) return false;
    const show = submitAttempted || touched.has(field);
    return show && !formData[field].trim();
  };

  const handleChange = (field: keyof BaptismRecordFormData) => (
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
    if (dateBeforeBirth) { setError('Reception date cannot be before birth date.'); return; }
    if (!isEditMode && dateRestriction) { setError(dateRestriction); return; }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const url = isEditMode ? `/api/baptism-records/${id}` : '/api/baptism-records';
      const method = isEditMode ? 'PUT' : 'POST';
      const params = new URLSearchParams({ church_id: churchId });

      const apiUrl = url.replace(/^\/api/, '');
      const data = isEditMode
        ? await apiClient.put<any>(`${apiUrl}?${params.toString()}`, { ...formData, church_id: parseInt(churchId) })
        : await apiClient.post<any>(`${apiUrl}?${params.toString()}`, { ...formData, church_id: parseInt(churchId) });
      if (data.success) {
        setSuccess(true);
        if (createAnotherRef.current) {
          createAnotherRef.current = false;
          setTimeout(() => {
            setFormData({
              first_name: '', last_name: '', birth_date: '', reception_date: '',
              clergy: '', birthplace: '', parents: '', sponsors: '',
              entry_type: 'Baptism', notes: '',
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

  const sectionBasicDetails = (
    <FormSection title="Basic Record Details" description="Primary information about the baptism.">
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

      <FormField label="Entry Type" required error={isFieldError('entry_type')}
        helperText={isFieldError('entry_type') ? 'Entry type is required' : undefined}>
        <SelectField
          value={formData.entry_type}
          onChange={handleChange('entry_type') as any}
          onBlur={handleBlur('entry_type')}
          error={isFieldError('entry_type')}
          options={[
            { value: 'Baptism', label: 'Baptism' },
            { value: 'Chrismation', label: 'Chrismation' },
          ]}
        />
      </FormField>

      <FormField label="Birth Date" required error={isFieldError('birth_date')}
        helperText={isFieldError('birth_date') ? 'Birth date is required' : undefined}>
        <input type="date" value={formData.birth_date}
          onChange={handleChange('birth_date')} onBlur={handleBlur('birth_date')}
          className={inputClass(isFieldError('birth_date'))} />
      </FormField>

      <FormField label="Reception Date (Baptism Date)" required
        error={isFieldError('reception_date') || dateBeforeBirth || (!isEditMode && !!dateRestriction)}
        helperText={isFieldError('reception_date') ? 'Reception date is required'
          : dateBeforeBirth ? 'Baptism date cannot be before birth date' : undefined}>
        <input type="date" value={formData.reception_date}
          onChange={handleChange('reception_date')} onBlur={handleBlur('reception_date')}
          className={inputClass(isFieldError('reception_date') || dateBeforeBirth || (!isEditMode && !!dateRestriction))} />
        {dateRestriction && (
          <DateRestrictionAlert message={dateRestriction} isEditMode={isEditMode} />
        )}
      </FormField>

      <FormField label="Clergy" required error={isFieldError('clergy')}
        helperText={isFieldError('clergy') ? 'Clergy is required' : 'Select from list or type a name'}>
        <ClergySelector
          churchId={churchId}
          recordType="baptism"
          value={formData.clergy}
          onChange={(v) => { setFormData(p => ({ ...p, clergy: v })); setError(null); setSuccess(false); }}
          onBlur={handleBlur('clergy')}
          error={isFieldError('clergy')}
        />
      </FormField>
    </FormSection>
  );

  const sectionFamily = (
    <FormSection title="Family & Context" description="Family and parish context information.">
      <FormField label="Birthplace">
        <input type="text" value={formData.birthplace}
          onChange={handleChange('birthplace')} placeholder="City, State or Country"
          className={inputClass()} />
      </FormField>

      <FormField label="Parents">
        <textarea value={formData.parents} onChange={handleChange('parents')}
          placeholder="Names of parents" rows={2} className={textareaClass()} />
      </FormField>

      <FormField label="Sponsors (Godparents)" fullWidth>
        <textarea value={formData.sponsors} onChange={handleChange('sponsors')}
          placeholder="Names of godparents / sponsors" rows={2} className={textareaClass()} />
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

  const wizardSections = [sectionBasicDetails, sectionFamily, sectionNotes];

  if (loading) return <FormLoadingSkeleton />;

  return (
    <div className="max-w-[820px] mx-auto py-6 px-4">
      <div className="flex items-start justify-between">
        <FormPageHeader
          backLabel="Back to Portal"
          backTo={handleCancel}
          icon={Users}
          iconColor="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
          title={isEditMode ? 'Edit Baptism Record' : 'New Baptism Record'}
          subtitle={isEditMode
            ? 'Update the details for this baptism record.'
            : 'Enter the details for a new baptism or chrismation record.'}
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
                {sectionBasicDetails}
                <FormDivider />
                {sectionFamily}
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

export default BaptismRecordEntryPage;
