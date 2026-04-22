/**
 * PortalSettingsPage.tsx
 *
 * Parish Settings page within the portal layout.
 * Three tabs: Church Identity & Contact, Configuration, Database Mapping.
 * Adapted from ChurchForm (admin) for portal users.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useChurch } from '@/context/ChurchContext';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  Building2,
  ChevronDown,
  Database,
  Eye,
  EyeOff,
  Loader2,
  Save,
  Settings,
  ArrowUpDown,
  RefreshCw,
  Church,
  Globe,
  Mail,
  MapPin,
  Phone,
} from '@/ui/icons';
import { Alert, Snackbar } from '@mui/material';
import { useLanguage } from '@/context/LanguageContext';

/* ─── Types ─── */

interface ChurchData {
  name: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  description_multilang: string;
  preferred_language: string;
  timezone: string;
  currency: string;
  calendar_type: string;
  tax_id: string;
  database_name: string;
  // default_landing_page removed — column does not exist in churches table
  is_active: boolean;
  has_baptism_records: boolean;
  has_marriage_records: boolean;
  has_funeral_records: boolean;
  setup_complete: boolean;
}

interface ColumnRow {
  column_name: string;
  ordinal_position: number;
  new_name: string;
  is_visible: boolean;
  is_sortable: boolean;
}

const EMPTY_CHURCH: ChurchData = {
  name: '', email: '', phone: '', website: '', address: '',
  city: '', state_province: '', postal_code: '', country: '',
  description_multilang: '', preferred_language: 'en',
  timezone: 'America/New_York', currency: 'USD',
  calendar_type: 'Revised Julian', tax_id: '', database_name: '',
  is_active: true,
  has_baptism_records: true, has_marriage_records: true,
  has_funeral_records: true, setup_complete: false,
};

const TAB_KEYS = [
  { labelKey: 'portal.settings_tab_identity', icon: Church },
  { labelKey: 'portal.settings_tab_config', icon: Settings },
  { labelKey: 'portal.settings_tab_dbmap', icon: Database },
] as const;

/* ─── Reusable sub-components ─── */

function FormField({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block font-['Inter'] text-[13px] font-medium om-text-secondary mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text', disabled = false }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-gray-600 bg-white dark:bg-gray-800 om-text-primary font-['Inter'] text-[14px] focus:ring-2 focus:ring-[#d4af37]/40 focus:border-[#d4af37] outline-none transition-colors disabled:opacity-50"
    />
  );
}

function SelectInput({ value, onChange, options, disabled = false }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-gray-600 bg-white dark:bg-gray-800 om-text-primary font-['Inter'] text-[14px] focus:ring-2 focus:ring-[#d4af37]/40 focus:border-[#d4af37] outline-none appearance-none pr-8 transition-colors disabled:opacity-50"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 om-text-tertiary pointer-events-none" />
    </div>
  );
}

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 cursor-pointer"
    >
      <div className={`w-9 h-5 rounded-full transition-colors relative ${checked ? 'bg-[#d4af37]' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
      <span className="font-['Inter'] text-[13px] om-text-primary">{label}</span>
    </button>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, color = '#2d1b4e' }: {
  icon: React.ElementType; title: string; subtitle: string; color?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-6 pb-4 border-b-2" style={{ borderColor: color }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: color }}>
        <Icon size={20} />
      </div>
      <div>
        <h3 className="font-['Georgia'] text-lg om-text-primary">{title}</h3>
        <p className="font-['Inter'] text-[13px] om-text-tertiary">{subtitle}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════ */

const PortalSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { activeChurchId } = useChurch();
  const { t } = useLanguage();
  const churchId = activeChurchId || user?.church_id;

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [church, setChurch] = useState<ChurchData>(EMPTY_CHURCH);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  // Database Mapping state
  const [dbTableName, setDbTableName] = useState('baptism_records');
  const [columns, setColumns] = useState<ColumnRow[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbSaving, setDbSaving] = useState(false);
  const [defaultSortField, setDefaultSortField] = useState('');
  const [defaultSortDirection, setDefaultSortDirection] = useState<'asc' | 'desc'>('asc');
  const [rowCount, setRowCount] = useState<number | null>(null);

  /* ── Load church data ── */
  useEffect(() => {
    if (!churchId) return;
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/my/church-settings');
        const raw = response.data ?? response;
        const data = raw.data ?? raw;
        const c = data.church || data;
        if (!cancelled) {
          setChurch({
            name: c.name || '',
            email: c.email || '',
            phone: c.phone || '',
            website: c.website || '',
            address: c.address || '',
            city: c.city || '',
            state_province: c.state_province || '',
            postal_code: c.postal_code || '',
            country: c.country || '',
            description_multilang: c.description_multilang || '',
            preferred_language: c.preferred_language || 'en',
            timezone: c.timezone || 'America/New_York',
            currency: c.currency || 'USD',
            calendar_type: c.calendar_type || 'Revised Julian',
            tax_id: c.tax_id || '',
            database_name: c.database_name || '',
            is_active: c.is_active ?? true,
            has_baptism_records: c.has_baptism_records ?? true,
            has_marriage_records: c.has_marriage_records ?? true,
            has_funeral_records: c.has_funeral_records ?? true,
            setup_complete: c.setup_complete ?? false,
          });
        }
      } catch (err: any) {
        if (!cancelled) setToast({ open: true, message: err.message || 'Failed to load', severity: 'error' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [churchId]);

  /* ── Save church data ── */
  const handleSaveChurch = async () => {
    if (!churchId) return;
    try {
      setSaving(true);
      await apiClient.put('/my/church-settings', church);
      setToast({ open: true, message: t('portal.settings_save_success'), severity: 'success' });
    } catch (err: any) {
      setToast({ open: true, message: err.message, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  /* ── Load columns for Database Mapping ── */
  const loadColumns = useCallback(async () => {
    if (!churchId) return;
    try {
      setDbLoading(true);
      const response = await apiClient.get(`/admin/churches/${churchId}/field-mapper`, {
        params: { table: dbTableName },
      });
      const data = response.data?.data ?? response.data;

      const mapped: ColumnRow[] = (data.columns || []).map((col: any, idx: number) => ({
        column_name: col.column_name ?? col.name ?? col.Field ?? `col_${idx + 1}`,
        ordinal_position: col.ordinal_position ?? idx + 1,
        new_name: data.mappings?.[col.column_name] || '',
        is_visible: data.field_settings?.visibility?.[col.column_name] ?? true,
        is_sortable: data.field_settings?.sortable?.[col.column_name] ?? true,
      }));
      setColumns(mapped);
      setDefaultSortField(data.field_settings?.default_sort_field || '');
      setDefaultSortDirection(data.field_settings?.default_sort_direction || 'asc');

      // Row count (admin endpoint, may fail for non-admin users — non-fatal)
      try {
        const cRes = await apiClient.get(`/admin/church-database/${churchId}/record-counts`);
        const cData = cRes.data?.data ?? cRes.data;
        const counts = cData?.record_counts || cData?.counts || cData;
        setRowCount(counts[dbTableName] ?? null);
      } catch { /* non-fatal */ }
    } catch (err: any) {
      setToast({ open: true, message: err.message, severity: 'error' });
    } finally {
      setDbLoading(false);
    }
  }, [churchId, dbTableName]);

  // Auto-load columns when switching to DB Mapping tab or changing table
  useEffect(() => {
    if (activeTab === 2) loadColumns();
  }, [activeTab, dbTableName, loadColumns]);

  /* ── Save column mapping ── */
  const handleSaveMapping = async () => {
    if (!churchId) return;
    try {
      setDbSaving(true);
      const mappings: Record<string, string> = {};
      const visibility: Record<string, boolean> = {};
      const sortable: Record<string, boolean> = {};
      columns.forEach(row => {
        if (row.new_name.trim()) mappings[row.column_name] = row.new_name.trim();
        visibility[row.column_name] = row.is_visible;
        sortable[row.column_name] = row.is_sortable;
      });

      await apiClient.post(`/admin/churches/${churchId}/field-mapper`, {
        table: dbTableName,
        mappings,
        field_settings: { visibility, sortable, default_sort_field: defaultSortField, default_sort_direction: defaultSortDirection },
      });
      setToast({ open: true, message: t('portal.settings_dbmap_save_success'), severity: 'success' });
    } catch (err: any) {
      setToast({ open: true, message: err.message, severity: 'error' });
    } finally {
      setDbSaving(false);
    }
  };

  const updateChurch = (field: keyof ChurchData, value: any) => setChurch(prev => ({ ...prev, [field]: value }));
  const updateColumn = (idx: number, field: keyof ColumnRow, value: any) => {
    setColumns(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  /* ═══════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════ */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-[#d4af37]" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="font-['Georgia'] text-3xl om-text-primary mb-1">{t('portal.settings_title')}</h1>
        <p className="font-['Inter'] text-[14px] om-text-secondary">
          {t('portal.settings_desc')}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-[#f3f4f6] dark:bg-gray-800 rounded-xl p-1">
        {TAB_KEYS.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = activeTab === idx;
          return (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-['Inter'] text-[14px] font-medium transition-all ${
                isActive
                  ? 'bg-white dark:bg-gray-700 om-text-primary shadow-sm'
                  : 'om-text-tertiary hover:om-text-secondary'
              }`}
            >
              <Icon size={16} />
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      {/* ─── Tab 0: Church Identity & Contact ─── */}
      {activeTab === 0 && (
        <div className="om-card p-6">
          <SectionHeader icon={Building2} title={t('portal.settings_identity_title')} subtitle={t('portal.settings_identity_subtitle')} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label={t('portal.settings_label_church_name')} className="md:col-span-2">
              <div className="relative">
                <Church size={16} className="absolute left-3 top-1/2 -translate-y-1/2 om-text-tertiary" />
                <input
                  value={church.name}
                  onChange={e => updateChurch('name', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-gray-600 bg-white dark:bg-gray-800 om-text-primary font-['Inter'] text-[14px] focus:ring-2 focus:ring-[#d4af37]/40 focus:border-[#d4af37] outline-none"
                />
              </div>
            </FormField>

            <FormField label={t('portal.settings_label_email')}>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 om-text-tertiary" />
                <input
                  type="email"
                  value={church.email}
                  onChange={e => updateChurch('email', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-gray-600 bg-white dark:bg-gray-800 om-text-primary font-['Inter'] text-[14px] focus:ring-2 focus:ring-[#d4af37]/40 focus:border-[#d4af37] outline-none"
                />
              </div>
            </FormField>

            <FormField label={t('portal.settings_label_phone')}>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 om-text-tertiary" />
                <input
                  value={church.phone}
                  onChange={e => updateChurch('phone', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-gray-600 bg-white dark:bg-gray-800 om-text-primary font-['Inter'] text-[14px] focus:ring-2 focus:ring-[#d4af37]/40 focus:border-[#d4af37] outline-none"
                />
              </div>
            </FormField>

            <FormField label={t('portal.settings_label_website')}>
              <div className="relative">
                <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 om-text-tertiary" />
                <input
                  value={church.website}
                  onChange={e => updateChurch('website', e.target.value)}
                  placeholder="https://example.com"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-gray-600 bg-white dark:bg-gray-800 om-text-primary font-['Inter'] text-[14px] focus:ring-2 focus:ring-[#d4af37]/40 focus:border-[#d4af37] outline-none"
                />
              </div>
            </FormField>

            <FormField label={t('portal.settings_label_address')} className="md:col-span-2">
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-3 om-text-tertiary" />
                <textarea
                  value={church.address}
                  onChange={e => updateChurch('address', e.target.value)}
                  rows={2}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-gray-600 bg-white dark:bg-gray-800 om-text-primary font-['Inter'] text-[14px] focus:ring-2 focus:ring-[#d4af37]/40 focus:border-[#d4af37] outline-none resize-none"
                />
              </div>
            </FormField>

            <FormField label={t('portal.settings_label_city')}>
              <TextInput value={church.city} onChange={v => updateChurch('city', v)} />
            </FormField>
            <FormField label={t('portal.settings_label_state')}>
              <TextInput value={church.state_province} onChange={v => updateChurch('state_province', v)} />
            </FormField>
            <FormField label={t('portal.settings_label_postal_code')}>
              <TextInput value={church.postal_code} onChange={v => updateChurch('postal_code', v)} />
            </FormField>
            <FormField label={t('portal.settings_label_country')}>
              <SelectInput
                value={church.country}
                onChange={v => updateChurch('country', v)}
                options={[
                  { value: '', label: 'Select...' },
                  { value: 'United States', label: 'United States' },
                  { value: 'Canada', label: 'Canada' },
                  { value: 'Greece', label: 'Greece' },
                  { value: 'Romania', label: 'Romania' },
                  { value: 'Russia', label: 'Russia' },
                  { value: 'Serbia', label: 'Serbia' },
                  { value: 'Bulgaria', label: 'Bulgaria' },
                  { value: 'Other', label: 'Other' },
                ]}
              />
            </FormField>

            <FormField label={t('portal.settings_label_description')} className="md:col-span-2">
              <textarea
                value={church.description_multilang}
                onChange={e => updateChurch('description_multilang', e.target.value)}
                rows={3}
                placeholder={t('portal.settings_placeholder_desc')}
                className="w-full px-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-gray-600 bg-white dark:bg-gray-800 om-text-primary font-['Inter'] text-[14px] focus:ring-2 focus:ring-[#d4af37]/40 focus:border-[#d4af37] outline-none resize-none"
              />
            </FormField>
          </div>

          {/* Save */}
          <div className="flex justify-end mt-6 pt-4 border-t border-[#f3f4f6] dark:border-gray-700">
            <button
              onClick={handleSaveChurch}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#2d1b4e] dark:bg-[#d4af37] text-white dark:text-[#2d1b4e] rounded-lg font-['Inter'] font-medium text-[14px] hover:bg-[#1f1236] dark:hover:bg-[#c29d2f] transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? t('common.saving') : t('common.save_changes')}
            </button>
          </div>
        </div>
      )}

      {/* ─── Tab 1: Configuration ─── */}
      {activeTab === 1 && (
        <div className="om-card p-6">
          <SectionHeader icon={Settings} title={t('portal.settings_config_title')} subtitle={t('portal.settings_config_subtitle')} color="#16a34a" />

          {/* Status */}
          <div className={`p-4 rounded-xl mb-6 border ${church.is_active ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
            <ToggleSwitch checked={church.is_active} onChange={v => updateChurch('is_active', v)} label={church.is_active ? t('portal.settings_parish_active') : t('portal.settings_parish_inactive')} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField label={t('portal.settings_label_language')}>
              <SelectInput value={church.preferred_language} onChange={v => updateChurch('preferred_language', v)} options={[
                { value: 'en', label: 'English' }, { value: 'el', label: 'Greek' },
                { value: 'ru', label: 'Russian' }, { value: 'ro', label: 'Romanian' },
                { value: 'serbian', label: 'Serbian' }, { value: 'bulgarian', label: 'Bulgarian' },
                { value: 'arabic', label: 'Arabic' },
              ]} />
            </FormField>

            <FormField label={t('portal.settings_label_timezone')}>
              <SelectInput value={church.timezone} onChange={v => updateChurch('timezone', v)} options={[
                { value: 'America/New_York', label: 'Eastern (ET)' },
                { value: 'America/Chicago', label: 'Central (CT)' },
                { value: 'America/Denver', label: 'Mountain (MT)' },
                { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
                { value: 'Europe/London', label: 'GMT' },
                { value: 'Europe/Athens', label: 'Eastern European (EET)' },
                { value: 'Europe/Moscow', label: 'Moscow (MSK)' },
                { value: 'UTC', label: 'UTC' },
              ]} />
            </FormField>

            <FormField label={t('portal.settings_label_currency')}>
              <SelectInput value={church.currency} onChange={v => updateChurch('currency', v)} options={[
                { value: 'USD', label: 'USD ($)' }, { value: 'EUR', label: 'EUR' },
                { value: 'GBP', label: 'GBP' }, { value: 'CAD', label: 'CAD' },
                { value: 'RON', label: 'RON' }, { value: 'RUB', label: 'RUB' },
              ]} />
            </FormField>

            <FormField label={t('portal.settings_label_calendar')}>
              <SelectInput value={church.calendar_type} onChange={v => updateChurch('calendar_type', v)} options={[
                { value: 'Revised Julian', label: 'New Calendar (Revised Julian)' },
                { value: 'Julian', label: 'Old Calendar (Julian)' },
              ]} />
            </FormField>

            <FormField label={t('portal.settings_label_tax_id')}>
              <TextInput value={church.tax_id} onChange={v => updateChurch('tax_id', v)} />
            </FormField>

          </div>

          {/* Record Types */}
          <div className="mt-6">
            <p className="font-['Inter'] text-[13px] font-medium om-text-secondary mb-3">{t('portal.settings_record_types')}</p>
            <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
              <ToggleSwitch checked={church.has_baptism_records} onChange={v => updateChurch('has_baptism_records', v)} label={t('common.record_baptism')} />
              <ToggleSwitch checked={church.has_marriage_records} onChange={v => updateChurch('has_marriage_records', v)} label={t('common.record_marriage')} />
              <ToggleSwitch checked={church.has_funeral_records} onChange={v => updateChurch('has_funeral_records', v)} label={t('common.record_funeral')} />
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end mt-6 pt-4 border-t border-[#f3f4f6] dark:border-gray-700">
            <button
              onClick={handleSaveChurch}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#2d1b4e] dark:bg-[#d4af37] text-white dark:text-[#2d1b4e] rounded-lg font-['Inter'] font-medium text-[14px] hover:bg-[#1f1236] dark:hover:bg-[#c29d2f] transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? t('common.saving') : t('common.save_changes')}
            </button>
          </div>
        </div>
      )}

      {/* ─── Tab 2: Database Mapping ─── */}
      {activeTab === 2 && (
        <div className="om-card p-6">
          <SectionHeader icon={Database} title={t('portal.settings_dbmap_title')} subtitle={t('portal.settings_dbmap_subtitle')} color="#7c3aed" />

          {/* Table Selector + Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1">
              <label className="block font-['Inter'] text-[12px] font-medium om-text-tertiary uppercase tracking-wide mb-1.5">{t('portal.settings_dbmap_select_table')}</label>
              <SelectInput
                value={dbTableName}
                onChange={v => setDbTableName(v)}
                disabled={dbLoading || dbSaving}
                options={[
                  { value: 'baptism_records', label: 'Baptism Records' },
                  { value: 'marriage_records', label: 'Marriage Records' },
                  { value: 'funeral_records', label: 'Funeral Records' },
                  { value: 'members', label: 'Members' },
                  { value: 'families', label: 'Families' },
                  { value: 'donations', label: 'Donations' },
                ]}
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={loadColumns}
                disabled={dbLoading}
                className="flex items-center gap-1.5 px-4 py-2 border border-[#e5e7eb] dark:border-gray-600 rounded-lg font-['Inter'] text-[13px] om-text-primary hover:bg-[#f9fafb] dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {dbLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {t('common.reload')}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-3 rounded-lg bg-[#f9fafb] dark:bg-gray-800 border border-[#e5e7eb] dark:border-gray-700 text-center">
              <p className="font-['Inter'] text-[11px] om-text-tertiary uppercase tracking-wide">{t('portal.settings_dbmap_stat_columns')}</p>
              <p className="font-['Georgia'] text-xl om-text-primary mt-1">{columns.length || '—'}</p>
            </div>
            <div className="p-3 rounded-lg bg-[#f9fafb] dark:bg-gray-800 border border-[#e5e7eb] dark:border-gray-700 text-center">
              <p className="font-['Inter'] text-[11px] om-text-tertiary uppercase tracking-wide">{t('portal.settings_dbmap_stat_visible')}</p>
              <p className="font-['Georgia'] text-xl om-text-primary mt-1">{columns.filter(c => c.is_visible).length || '—'}</p>
            </div>
            <div className="p-3 rounded-lg bg-[#f9fafb] dark:bg-gray-800 border border-[#e5e7eb] dark:border-gray-700 text-center">
              <p className="font-['Inter'] text-[11px] om-text-tertiary uppercase tracking-wide">{t('portal.settings_dbmap_stat_records')}</p>
              <p className="font-['Georgia'] text-xl om-text-primary mt-1">{rowCount !== null ? rowCount.toLocaleString() : '—'}</p>
            </div>
          </div>

          {/* Default Sort */}
          {columns.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 mb-6 p-4 rounded-xl bg-[#f9fafb] dark:bg-gray-800 border border-[#e5e7eb] dark:border-gray-700">
              <div className="flex items-center gap-2 om-text-secondary">
                <ArrowUpDown size={16} />
                <span className="font-['Inter'] text-[13px] font-medium">{t('portal.settings_dbmap_default_sort')}</span>
              </div>
              <div className="flex-1">
                <SelectInput
                  value={defaultSortField}
                  onChange={v => setDefaultSortField(v)}
                  options={[
                    { value: '', label: t('portal.settings_dbmap_no_sort') },
                    ...columns.filter(c => c.is_visible && c.is_sortable).map(c => ({
                      value: c.column_name,
                      label: c.new_name || c.column_name,
                    })),
                  ]}
                />
              </div>
              {defaultSortField && (
                <div className="flex gap-1">
                  <button
                    onClick={() => setDefaultSortDirection('asc')}
                    className={`px-3 py-1.5 rounded-lg font-['Inter'] text-[12px] transition-colors ${defaultSortDirection === 'asc' ? 'bg-[#2d1b4e] dark:bg-[#d4af37] text-white dark:text-[#2d1b4e]' : 'border border-[#e5e7eb] dark:border-gray-600 om-text-secondary'}`}
                  >
                    ASC
                  </button>
                  <button
                    onClick={() => setDefaultSortDirection('desc')}
                    className={`px-3 py-1.5 rounded-lg font-['Inter'] text-[12px] transition-colors ${defaultSortDirection === 'desc' ? 'bg-[#2d1b4e] dark:bg-[#d4af37] text-white dark:text-[#2d1b4e]' : 'border border-[#e5e7eb] dark:border-gray-600 om-text-secondary'}`}
                  >
                    DESC
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Column Table */}
          {dbLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-[#d4af37]" />
              <span className="ml-2 font-['Inter'] text-[14px] om-text-secondary">{t('portal.settings_dbmap_loading')}</span>
            </div>
          ) : columns.length === 0 ? (
            <div className="text-center py-12">
              <Database size={32} className="mx-auto om-text-tertiary mb-2" />
              <p className="font-['Inter'] text-[14px] om-text-secondary">{t('portal.settings_dbmap_empty')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#e5e7eb] dark:border-gray-700">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#f9fafb] dark:bg-gray-800">
                    <th className="px-4 py-3 text-left font-['Inter'] text-[12px] font-semibold om-text-tertiary uppercase tracking-wide">{t('portal.settings_dbmap_col_number')}</th>
                    <th className="px-4 py-3 text-left font-['Inter'] text-[12px] font-semibold om-text-tertiary uppercase tracking-wide">{t('portal.settings_dbmap_col_column')}</th>
                    <th className="px-4 py-3 text-left font-['Inter'] text-[12px] font-semibold om-text-tertiary uppercase tracking-wide">{t('portal.settings_dbmap_col_display')}</th>
                    <th className="px-4 py-3 text-center font-['Inter'] text-[12px] font-semibold om-text-tertiary uppercase tracking-wide">{t('portal.settings_dbmap_col_visible')}</th>
                    <th className="px-4 py-3 text-center font-['Inter'] text-[12px] font-semibold om-text-tertiary uppercase tracking-wide">{t('portal.settings_dbmap_col_sortable')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3f4f6] dark:divide-gray-700">
                  {columns.map((col, idx) => (
                    <tr key={col.column_name} className="hover:bg-[#f9fafb] dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-2.5 font-['Inter'] text-[12px] om-text-tertiary">{idx + 1}</td>
                      <td className="px-4 py-2.5">
                        <code className="font-mono text-[13px] om-text-primary bg-[#f3f4f6] dark:bg-gray-700 px-1.5 py-0.5 rounded">
                          {col.column_name}
                        </code>
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          value={col.new_name}
                          onChange={e => updateColumn(idx, 'new_name', e.target.value)}
                          placeholder={col.column_name}
                          className="w-full px-2.5 py-1.5 rounded-md border border-[#e5e7eb] dark:border-gray-600 bg-white dark:bg-gray-800 om-text-primary font-['Inter'] text-[13px] focus:ring-2 focus:ring-[#d4af37]/40 focus:border-[#d4af37] outline-none"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => updateColumn(idx, 'is_visible', !col.is_visible)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            col.is_visible
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          {col.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => updateColumn(idx, 'is_sortable', !col.is_sortable)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            col.is_sortable
                              ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          <ArrowUpDown size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Save */}
          {columns.length > 0 && (
            <div className="flex justify-end mt-6 pt-4 border-t border-[#f3f4f6] dark:border-gray-700">
              <button
                onClick={handleSaveMapping}
                disabled={dbSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#2d1b4e] dark:bg-[#d4af37] text-white dark:text-[#2d1b4e] rounded-lg font-['Inter'] font-medium text-[14px] hover:bg-[#1f1236] dark:hover:bg-[#c29d2f] transition-colors disabled:opacity-50"
              >
                {dbSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {dbSaving ? t('common.saving') : t('portal.settings_dbmap_save_btn')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(t => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} variant="filled" onClose={() => setToast(t => ({ ...t, open: false }))} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default PortalSettingsPage;
