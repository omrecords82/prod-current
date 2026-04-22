/**
 * RecordEditForm — Edit form content for baptism, marriage, and funeral records.
 * Shared between standalone edit dialog and view modal edit mode.
 * Extracted from RecordsPage.tsx
 */
import React from 'react';
import {
  Autocomplete,
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { useLanguage } from '@/context/LanguageContext';
import RecordSection from '../../../common/RecordSection';
import type { BaptismRecord } from './types';
import type { Church } from '@/shared/lib/churchService';

interface RecordEditFormProps {
  selectedRecordType: string;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  priestOptions: string[];
  churches: Church[];
  selectedChurch: number;
  acLoading: Record<string, boolean>;
  fetchAutocompleteSuggestions: (formFieldKey: string, inputValue: string) => void;
  getAcOptions: (formFieldKey: string, currentValue: string) => string[];
  getAcSuggestionsWithCount: (formFieldKey: string, currentValue: string) => { value: string; count: number }[];
}

const RecordEditForm: React.FC<RecordEditFormProps> = ({
  selectedRecordType,
  formData,
  setFormData,
  priestOptions,
  churches,
  selectedChurch,
  acLoading,
  fetchAutocompleteSuggestions,
  getAcOptions,
  getAcSuggestionsWithCount,
}) => {
  const { t } = useLanguage();

  return (
    <Stack spacing={4}>
      {selectedRecordType === 'baptism' && (
        <>
          <RecordSection title={t('records.section_personal')}>
            <Stack spacing={2.5} sx={{ mt: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('firstName', formData.firstName || '')} loading={acLoading['firstName']} inputValue={formData.firstName || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData((prev: any) => ({ ...prev, firstName: val })); fetchAutocompleteSuggestions('firstName', val); } }} onChange={(_e, val) => { if (val) setFormData((prev: any) => ({ ...prev, firstName: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('firstName', formData.firstName || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label={t('common.first_name')} required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
                <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('lastName', formData.lastName || '')} loading={acLoading['lastName']} inputValue={formData.lastName || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData((prev: any) => ({ ...prev, lastName: val })); fetchAutocompleteSuggestions('lastName', val); } }} onChange={(_e, val) => { if (val) setFormData((prev: any) => ({ ...prev, lastName: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('lastName', formData.lastName || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label={t('common.last_name')} required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label={t('records.label_date_of_birth')} type="date" value={formData.dateOfBirth || ''} onChange={(e) => setFormData((prev: any) => ({ ...prev, dateOfBirth: e.target.value }))} InputLabelProps={{ shrink: true }} sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('placeOfBirth', formData.placeOfBirth || '')} loading={acLoading['placeOfBirth']} inputValue={formData.placeOfBirth || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData((prev: any) => ({ ...prev, placeOfBirth: val })); fetchAutocompleteSuggestions('placeOfBirth', val); } }} onChange={(_e, val) => { if (val) setFormData((prev: any) => ({ ...prev, placeOfBirth: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('placeOfBirth', formData.placeOfBirth || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label={t('records.label_place_of_birth')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('fatherName', formData.fatherName || '')} loading={acLoading['fatherName']} inputValue={formData.fatherName || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData((prev: any) => ({ ...prev, fatherName: val })); fetchAutocompleteSuggestions('fatherName', val); } }} onChange={(_e, val) => { if (val) setFormData((prev: any) => ({ ...prev, fatherName: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('fatherName', formData.fatherName || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label={t('records.label_father_name')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
                <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('motherName', formData.motherName || '')} loading={acLoading['motherName']} inputValue={formData.motherName || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData((prev: any) => ({ ...prev, motherName: val })); fetchAutocompleteSuggestions('motherName', val); } }} onChange={(_e, val) => { if (val) setFormData((prev: any) => ({ ...prev, motherName: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('motherName', formData.motherName || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label={t('records.label_mother_name')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
              </Stack>
            </Stack>
          </RecordSection>
          <RecordSection title={t('records.section_baptism')}>
            <Stack spacing={2.5} sx={{ mt: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label={t('records.label_date_of_baptism')} type="date" value={formData.dateOfBaptism || ''} onChange={(e) => setFormData((prev: any) => ({ ...prev, dateOfBaptism: e.target.value }))} InputLabelProps={{ shrink: true }} required sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                <FormControl sx={{ flex: 1 }}>
                  <InputLabel>{t('records.label_received_by')}</InputLabel>
                  <Select label={t('records.label_received_by')} value={formData.entryType || ''} onChange={(e) => setFormData((prev: any) => ({ ...prev, entryType: e.target.value }))} sx={{ borderRadius: 2 }}>
                    <MenuItem value="Baptism">Baptism</MenuItem>
                    <MenuItem value="Chrismation">Chrismation</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
              <Autocomplete freeSolo disableClearable options={getAcOptions('godparentNames', formData.godparentNames || '')} loading={acLoading['godparentNames']} inputValue={formData.godparentNames || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData((prev: any) => ({ ...prev, godparentNames: val })); fetchAutocompleteSuggestions('godparentNames', val); } }} onChange={(_e, val) => { if (val) setFormData((prev: any) => ({ ...prev, godparentNames: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('godparentNames', formData.godparentNames || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label={t('records.label_godparents')} placeholder={t('records.placeholder_godparents')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
            </Stack>
          </RecordSection>
          <RecordSection title={t('records.section_church_registry')}>
            <Stack spacing={2.5} sx={{ mt: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl sx={{ flex: 1 }}>
                  <InputLabel>{t('records.label_priest_select')}</InputLabel>
                  <Select label={t('records.label_priest_select')} value={formData.priest || ''} onChange={(e) => { const value = e.target.value; if (value === 'custom') { setFormData((prev: any) => ({ ...prev, priest: '', customPriest: true })); } else { setFormData((prev: any) => ({ ...prev, priest: value, customPriest: false })); } }} sx={{ borderRadius: 2 }}>
                    <MenuItem value=""><em>{t('records.placeholder_select_priest')}</em></MenuItem>
                    {priestOptions.map((priest) => (<MenuItem key={priest} value={priest}>{priest}</MenuItem>))}
                    <MenuItem value="custom"><em>{t('records.option_other_priest')}</em></MenuItem>
                  </Select>
                </FormControl>
                <TextField label={t('records.label_church')} value={churches.find(c => c.id === selectedChurch)?.church_name || t('records.label_no_church')} InputProps={{ readOnly: true }} sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 }, '& .MuiInputBase-input': { color: 'text.secondary' } }} />
              </Stack>
              {formData.customPriest && (
                <TextField label={t('records.label_priest')} value={formData.priest || ''} onChange={(e) => setFormData((prev: any) => ({ ...prev, priest: e.target.value }))} fullWidth placeholder={t('records.placeholder_priest_name')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              )}
              <TextField label={t('records.label_registry_number')} value={formData.registryNumber || ''} onChange={(e) => setFormData((prev: any) => ({ ...prev, registryNumber: e.target.value }))} placeholder={t('records.placeholder_registry')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </Stack>
          </RecordSection>
          <RecordSection title={t('records.section_notes')}>
            <TextField label={t('records.label_notes')} multiline rows={4} value={formData.notes || ''} onChange={(e) => setFormData((prev: any) => ({ ...prev, notes: e.target.value }))} placeholder={t('records.placeholder_notes')} fullWidth sx={{ mt: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          </RecordSection>
        </>
      )}

      {selectedRecordType === 'marriage' && (
        <>
          <RecordSection title={t('records.section_groom')}>
            <Stack spacing={2.5} sx={{ mt: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('groomFirstName', formData.groomFirstName || '')} loading={acLoading['groomFirstName']} inputValue={formData.groomFirstName || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData((prev: any) => ({ ...prev, groomFirstName: val })); fetchAutocompleteSuggestions('groomFirstName', val); } }} onChange={(_e, val) => { if (val) setFormData((prev: any) => ({ ...prev, groomFirstName: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('groomFirstName', formData.groomFirstName || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label={t('common.first_name')} required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
                <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('groomLastName', formData.groomLastName || '')} loading={acLoading['groomLastName']} inputValue={formData.groomLastName || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData((prev: any) => ({ ...prev, groomLastName: val })); fetchAutocompleteSuggestions('groomLastName', val); } }} onChange={(_e, val) => { if (val) setFormData((prev: any) => ({ ...prev, groomLastName: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('groomLastName', formData.groomLastName || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label={t('common.last_name')} required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
              </Stack>
              <TextField label={t('records.label_groom_parents')} value={formData.groomParents || ''} onChange={(e) => setFormData((prev: any) => ({ ...prev, groomParents: e.target.value }))} placeholder={t('records.placeholder_groom_parents')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </Stack>
          </RecordSection>
          <RecordSection title={t('records.section_bride')}>
            <Stack spacing={2.5} sx={{ mt: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('brideFirstName', formData.brideFirstName || '')} loading={acLoading['brideFirstName']} inputValue={formData.brideFirstName || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData((prev: any) => ({ ...prev, brideFirstName: val })); fetchAutocompleteSuggestions('brideFirstName', val); } }} onChange={(_e, val) => { if (val) setFormData((prev: any) => ({ ...prev, brideFirstName: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('brideFirstName', formData.brideFirstName || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label={t('common.first_name')} required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
                <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('brideLastName', formData.brideLastName || '')} loading={acLoading['brideLastName']} inputValue={formData.brideLastName || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData((prev: any) => ({ ...prev, brideLastName: val })); fetchAutocompleteSuggestions('brideLastName', val); } }} onChange={(_e, val) => { if (val) setFormData((prev: any) => ({ ...prev, brideLastName: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('brideLastName', formData.brideLastName || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label={t('common.last_name')} required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
              </Stack>
              <TextField label={t('records.label_bride_parents')} value={formData.brideParents || ''} onChange={(e) => setFormData((prev: any) => ({ ...prev, brideParents: e.target.value }))} placeholder={t('records.placeholder_bride_parents')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </Stack>
          </RecordSection>
          <RecordSection title={t('records.section_marriage')}>
            <Stack spacing={2.5} sx={{ mt: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label={t('records.label_marriage_date')} type="date" value={formData.marriageDate || ''} onChange={(e) => setFormData((prev: any) => ({ ...prev, marriageDate: e.target.value }))} InputLabelProps={{ shrink: true }} required sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('marriageLocation', formData.marriageLocation || '')} loading={acLoading['marriageLocation']} inputValue={formData.marriageLocation || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData((prev: any) => ({ ...prev, marriageLocation: val })); fetchAutocompleteSuggestions('marriageLocation', val); } }} onChange={(_e, val) => { if (val) setFormData((prev: any) => ({ ...prev, marriageLocation: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('marriageLocation', formData.marriageLocation || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label={t('records.label_marriage_location')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('witness1', formData.witness1 || '')} loading={acLoading['witness1']} inputValue={formData.witness1 || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData((prev: any) => ({ ...prev, witness1: val })); fetchAutocompleteSuggestions('witness1', val); } }} onChange={(_e, val) => { if (val) setFormData((prev: any) => ({ ...prev, witness1: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('witness1', formData.witness1 || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label={t('records.label_witness_1')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
                <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('witness2', formData.witness2 || '')} loading={acLoading['witness2']} inputValue={formData.witness2 || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData((prev: any) => ({ ...prev, witness2: val })); fetchAutocompleteSuggestions('witness2', val); } }} onChange={(_e, val) => { if (val) setFormData((prev: any) => ({ ...prev, witness2: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('witness2', formData.witness2 || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label={t('records.label_witness_2')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
              </Stack>
            </Stack>
          </RecordSection>
          <FormControl fullWidth>
            <InputLabel>{t('records.label_priest_select')}</InputLabel>
            <Select label={t('records.label_priest_select')} value={formData.priest || ''} onChange={(e) => { const value = e.target.value; if (value === 'custom') { setFormData((prev: any) => ({ ...prev, priest: '', customPriest: true })); } else { setFormData((prev: any) => ({ ...prev, priest: value, customPriest: false })); } }}>
              <MenuItem value=""><em>{t('records.placeholder_select_priest')}</em></MenuItem>
              {priestOptions.map((priest) => (<MenuItem key={priest} value={priest}>{priest}</MenuItem>))}
              <MenuItem value="custom"><em>{t('records.option_other_priest')}</em></MenuItem>
            </Select>
          </FormControl>
          {formData.customPriest && (
            <TextField label={t('records.label_priest')} value={formData.priest || ''} onChange={(e) => setFormData((prev: any) => ({ ...prev, priest: e.target.value }))} fullWidth placeholder={t('records.placeholder_priest_name')} />
          )}
        </>
      )}

      {selectedRecordType === 'funeral' && (
        <>
          <RecordSection title={t('records.section_deceased')}>
            <Stack spacing={2.5} sx={{ mt: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('deceasedFirstName', formData.deceasedFirstName || formData.firstName || '')} loading={acLoading['deceasedFirstName']} inputValue={formData.deceasedFirstName || formData.firstName || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData((prev: any) => ({ ...prev, deceasedFirstName: val, firstName: val })); fetchAutocompleteSuggestions('deceasedFirstName', val); } }} onChange={(_e, val) => { if (val) setFormData((prev: any) => ({ ...prev, deceasedFirstName: val, firstName: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('deceasedFirstName', formData.deceasedFirstName || formData.firstName || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label={t('common.first_name')} required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
                <Autocomplete freeSolo disableClearable sx={{ flex: 1 }} options={getAcOptions('deceasedLastName', formData.deceasedLastName || formData.lastName || '')} loading={acLoading['deceasedLastName']} inputValue={formData.deceasedLastName || formData.lastName || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData((prev: any) => ({ ...prev, deceasedLastName: val, lastName: val })); fetchAutocompleteSuggestions('deceasedLastName', val); } }} onChange={(_e, val) => { if (val) setFormData((prev: any) => ({ ...prev, deceasedLastName: val, lastName: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('deceasedLastName', formData.deceasedLastName || formData.lastName || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label={t('common.last_name')} required sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
              </Stack>
              <TextField label={t('records.label_age_at_death')} type="number" value={formData.age || ''} onChange={(e) => setFormData((prev: any) => ({ ...prev, age: e.target.value }))} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </Stack>
          </RecordSection>
          <RecordSection title={t('records.section_funeral')}>
            <Stack spacing={2.5} sx={{ mt: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label={t('records.label_date_of_death')} type="date" value={formData.deathDate || formData.dateOfDeath || ''} onChange={(e) => setFormData((prev: any) => ({ ...prev, deathDate: e.target.value, dateOfDeath: e.target.value }))} InputLabelProps={{ shrink: true }} required sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                <TextField label={t('records.label_burial_date')} type="date" value={formData.burialDate || ''} onChange={(e) => setFormData((prev: any) => ({ ...prev, burialDate: e.target.value }))} InputLabelProps={{ shrink: true }} sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              </Stack>
              <Autocomplete freeSolo disableClearable fullWidth options={getAcOptions('burialLocation', formData.burialLocation || '')} loading={acLoading['burialLocation']} inputValue={formData.burialLocation || ''} onInputChange={(_e, val, reason) => { if (reason === 'input' || reason === 'clear') { setFormData((prev: any) => ({ ...prev, burialLocation: val })); fetchAutocompleteSuggestions('burialLocation', val); } }} onChange={(_e, val) => { if (val) setFormData((prev: any) => ({ ...prev, burialLocation: val })); }} renderOption={(props, option) => { const s = getAcSuggestionsWithCount('burialLocation', formData.burialLocation || '').find(x => x.value === option); return <li {...props} key={option}><Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>{option}</span>{s && <Chip label={s.count} size="small" sx={{ ml: 1, minWidth: 28, height: 20, fontSize: '0.7rem' }} />}</Box></li>; }} renderInput={(params) => <TextField {...params} label={t('records.label_burial_location')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />} />
            </Stack>
          </RecordSection>
          <FormControl fullWidth>
            <InputLabel>{t('records.label_priest_select')}</InputLabel>
            <Select label={t('records.label_priest_select')} value={formData.priest || ''} onChange={(e) => { const value = e.target.value; if (value === 'custom') { setFormData((prev: any) => ({ ...prev, priest: '', customPriest: true })); } else { setFormData((prev: any) => ({ ...prev, priest: value, customPriest: false })); } }}>
              <MenuItem value=""><em>{t('records.placeholder_select_priest')}</em></MenuItem>
              {priestOptions.map((priest) => (<MenuItem key={priest} value={priest}>{priest}</MenuItem>))}
              <MenuItem value="custom"><em>{t('records.option_other_priest')}</em></MenuItem>
            </Select>
          </FormControl>
          {formData.customPriest && (
            <TextField label={t('records.label_priest')} value={formData.priest || ''} onChange={(e) => setFormData((prev: any) => ({ ...prev, priest: e.target.value }))} fullWidth placeholder={t('records.placeholder_priest_name')} />
          )}
        </>
      )}
    </Stack>
  );
};

export default RecordEditForm;
