/**
 * SacramentalFormShell — Shared page shell, sections, fields, alerts, and action bar
 * for all sacramental record entry pages (Baptism, Marriage, Funeral).
 *
 * This is the single source of truth for form layout and styling across the
 * records-centralized module. Individual pages compose their fields inside
 * this shell rather than owning their own layout primitives.
 */

import React from 'react';
import { Skeleton } from '@mui/material';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardList,
  Loader2,
  Plus,
  Save,
  TableProperties,
  X,
} from '@/ui/icons';

/* ══════════════════════════════════════════════════════════
   Style utilities — shared input/textarea classes
   ══════════════════════════════════════════════════════════ */

export const inputClass = (error?: boolean) =>
  `w-full px-3 py-2.5 rounded-lg border font-['Inter'] text-[14px] text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 transition-colors outline-none ${
    error
      ? 'border-red-300 dark:border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/30'
      : 'border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500 focus:ring-2 focus:ring-gray-100 dark:focus:ring-gray-700/30'
  }`;

export const textareaClass = (error?: boolean) =>
  `${inputClass(error)} resize-none`;

export const selectClass = (error?: boolean) =>
  `${inputClass(error)} appearance-none pr-10`;

/* ══════════════════════════════════════════════════════════
   FormSection — Groups related fields with heading
   ══════════════════════════════════════════════════════════ */

export function FormSection({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="mb-8 last:mb-0">
      <div className="mb-4">
        <h3 className="font-['Inter'] font-semibold text-[15px] text-gray-900 dark:text-white">
          {title}
        </h3>
        {description && (
          <p className="font-['Inter'] text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
            {description}
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
        {children}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   FormField — Label + input wrapper with error display
   ══════════════════════════════════════════════════════════ */

export function FormField({ label, required, error, helperText, fullWidth, children }: {
  label: string; required?: boolean; error?: boolean; helperText?: string;
  fullWidth?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
      <label className="block font-['Inter'] text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {helperText && (
        <p className={`font-['Inter'] text-[12px] mt-1 ${error ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
          {helperText}
        </p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   FormDivider — Section separator
   ══════════════════════════════════════════════════════════ */

export function FormDivider() {
  return <div className="border-t border-gray-100 dark:border-gray-700 my-6" />;
}

/* ══════════════════════════════════════════════════════════
   SelectField — Native <select> with chevron icon
   ══════════════════════════════════════════════════════════ */

export function SelectField({ value, onChange, onBlur, error, options, placeholder }: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: () => void;
  error?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={selectClass(error)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ErrorAlert / SuccessAlert — Top-of-form banners
   ══════════════════════════════════════════════════════════ */

export function ErrorAlert({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="mb-5 flex items-start gap-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
      <AlertCircle className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" size={16} />
      <div className="flex-1">
        <p className="font-['Inter'] text-[13px] font-medium text-red-800 dark:text-red-300">{message}</p>
      </div>
      <button onClick={onClose} className="text-red-400 hover:text-red-600 dark:hover:text-red-300">
        <X size={14} />
      </button>
    </div>
  );
}

export function SuccessAlert({ message }: { message: string }) {
  return (
    <div className="mb-5 flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-3">
      <Check className="text-emerald-600 dark:text-emerald-400" size={16} />
      <p className="font-['Inter'] text-[13px] font-medium text-emerald-800 dark:text-emerald-300">
        {message}
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   DateRestrictionAlert — Inline date restriction warning
   ══════════════════════════════════════════════════════════ */

export function DateRestrictionAlert({ message, isEditMode }: { message: string; isEditMode: boolean }) {
  return (
    <div className={`mt-2 flex items-start gap-2 px-3 py-2 rounded-md text-[12px] font-['Inter'] ${
      isEditMode
        ? 'bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400'
        : 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400'
    }`}>
      <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
      <span>
        {message}
        {isEditMode && ' Allowed in edit mode for historical records.'}
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   FormPageHeader — Back link + icon + title + subtitle
   ══════════════════════════════════════════════════════════ */

export function FormPageHeader({ backLabel, backTo, icon: Icon, iconColor, title, subtitle, parishName }: {
  backLabel: string;
  backTo: () => void;
  icon: React.ElementType;
  iconColor: string;
  title: string;
  subtitle: string;
  parishName?: string;
}) {
  return (
    <div className="mb-5">
      <button
        onClick={backTo}
        className="inline-flex items-center gap-1.5 font-['Inter'] text-[13px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-3"
      >
        <ArrowLeft size={15} /> {backLabel}
      </button>
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconColor}`}>
          <Icon size={16} />
        </div>
        <h1 className="font-['Inter'] text-[15px] font-semibold text-gray-900 dark:text-white">
          {title}
        </h1>
      </div>
      {parishName && (
        <p className="font-['Inter'] text-[13px] font-medium text-gray-600 dark:text-gray-300 mt-1 ml-[42px]">
          {parishName}
        </p>
      )}
      <p className="font-['Inter'] text-[12.5px] text-gray-400 dark:text-gray-500 mt-0.5 ml-[42px]">
        {subtitle}
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   FormActionBar — Footer with Cancel + Submit
   ══════════════════════════════════════════════════════════ */

export function FormActionBar({ saving, isEditMode, onCancel, onCreateAnother }: {
  saving: boolean; isEditMode: boolean; onCancel: () => void; onCreateAnother?: () => void;
}) {
  return (
    <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-6 md:px-8 py-4 flex items-center justify-between">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="px-4 py-2.5 font-['Inter'] text-[13px] font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
      >
        Cancel
      </button>
      <div className="flex items-center gap-3">
        {!isEditMode && onCreateAnother && (
          <button
            type="button"
            onClick={onCreateAnother}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-['Inter'] text-[13px] font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Plus size={15} />
                Create &amp; Add Another
              </>
            )}
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-['Inter'] text-[13px] font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={15} />
              {isEditMode ? 'Update Record' : 'Create Record'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   FormModeToggle — Switch between Form and Wizard views
   ══════════════════════════════════════════════════════════ */

export type FormMode = 'form' | 'wizard';

export function FormModeToggle({ mode, onChange }: {
  mode: FormMode; onChange: (m: FormMode) => void;
}) {
  return (
    <div className="inline-flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
      <button
        type="button"
        onClick={() => onChange('form')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-['Inter'] text-[12px] font-medium transition-colors ${
          mode === 'form'
            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
        }`}
      >
        <TableProperties size={13} /> Form
      </button>
      <button
        type="button"
        onClick={() => onChange('wizard')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-['Inter'] text-[12px] font-medium transition-colors ${
          mode === 'wizard'
            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
        }`}
      >
        <ClipboardList size={13} /> Wizard
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   WizardStepIndicator — Horizontal step dots with labels
   ══════════════════════════════════════════════════════════ */

export interface WizardStep {
  label: string;
  description?: string;
}

export function WizardStepIndicator({ steps, current }: {
  steps: WizardStep[]; current: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <div className={`h-px w-8 transition-colors ${
              i <= current ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'
            }`} />
          )}
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-['Inter'] text-[12px] font-semibold transition-colors ${
              i < current
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : i === current
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
            }`}>
              {i < current ? <Check size={14} /> : i + 1}
            </div>
            <span className={`font-['Inter'] text-[12px] font-medium hidden sm:inline ${
              i === current
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-400 dark:text-gray-500'
            }`}>
              {step.label}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   WizardNavBar — Bottom bar with Back / Next / Submit
   ══════════════════════════════════════════════════════════ */

export function WizardNavBar({ step, totalSteps, onPrev, onNext, saving, isEditMode, onCancel, onCreateAnother }: {
  step: number; totalSteps: number;
  onPrev: () => void; onNext: () => void;
  saving: boolean; isEditMode: boolean; onCancel: () => void; onCreateAnother?: () => void;
}) {
  const isLast = step === totalSteps - 1;

  return (
    <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-6 md:px-8 py-4 flex items-center justify-between">
      <div>
        {step === 0 ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2.5 font-['Inter'] text-[13px] font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={onPrev}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2.5 font-['Inter'] text-[13px] font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
          >
            <ArrowLeft size={15} /> Back
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        {isLast ? (
          <>
            {!isEditMode && onCreateAnother && (
              <button
                type="button"
                onClick={onCreateAnother}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-['Inter'] text-[13px] font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <><Loader2 size={15} className="animate-spin" /> Saving...</>
                ) : (
                  <><Plus size={15} /> Create &amp; Add Another</>
                )}
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-['Inter'] text-[13px] font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm disabled:opacity-50"
            >
              {saving ? (
                <><Loader2 size={15} className="animate-spin" /> Saving...</>
              ) : (
                <><Save size={15} /> {isEditMode ? 'Update Record' : 'Create Record'}</>
              )}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-['Inter'] text-[13px] font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm"
          >
            Next <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   FormLoadingSkeleton — Consistent loading state
   ══════════════════════════════════════════════════════════ */

export function FormLoadingSkeleton() {
  return (
    <div className="max-w-[820px] mx-auto py-8 px-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 shadow-sm">
        <Skeleton height={32} width={240} sx={{ mb: 2 }} />
        <Skeleton height={20} width={180} sx={{ mb: 4 }} />
        <div className="grid grid-cols-2 gap-4">
          {[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} height={56} />)}
        </div>
      </div>
    </div>
  );
}
