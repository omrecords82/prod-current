import RecordSection from '../../../common/RecordSection';
import { useLanguage } from '@/context/LanguageContext';
import { Church } from '@/shared/lib/churchService';
import { Pencil, Plus } from '@/shared/ui/icons';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';
import type { BaptismRecord } from './types';

interface EditRecordDialogProps {
  open: boolean;
  onClose: () => void;
  editingRecord: BaptismRecord | null;
  selectedRecordType: string;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  priestOptions: string[];
  churches: Church[];
  selectedChurch: number;
  loading: boolean;
  onSave: () => void;
  isDarkMode: boolean;
}

const EditRecordDialog: React.FC<EditRecordDialogProps> = ({
  open,
  onClose,
  editingRecord,
  selectedRecordType,
  formData,
  setFormData,
  priestOptions,
  churches,
  selectedChurch,
  loading,
  onSave,
  isDarkMode,
}) => {
  const { t } = useLanguage();
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: theme.shadows[10],
        }
      }}
    >
      <DialogTitle
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, rgba(0,0,0,0.25) 100%), ${theme.palette.primary.main}`,
          color: 'white',
          py: 3,
          px: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '12px',
            bgcolor: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {editingRecord ? <Pencil size={28} /> : <Plus size={28} />}
        </Box>
        <Box>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600, mb: 0.5 }}>
            {editingRecord ? t('records.edit_record') : t('records.add_new_record')}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {selectedRecordType.charAt(0).toUpperCase() + selectedRecordType.slice(1)} Record
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ px: 3, py: 4 }}>
        <Stack spacing={4}>
          {selectedRecordType === 'baptism' && (
            <>
              {/* Personal Information Section */}
              <RecordSection title={t('records.section_personal')}>
                <Stack spacing={2.5} sx={{ mt: 2 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label={t('common.first_name')}
                      value={formData.firstName || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, firstName: e.target.value }))}
                      required
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <TextField
                      label={t('common.last_name')}
                      value={formData.lastName || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, lastName: e.target.value }))}
                      required
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label={t('records.label_date_of_birth')}
                      type="date"
                      value={formData.dateOfBirth || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, dateOfBirth: e.target.value }))}
                      InputLabelProps={{ shrink: true }}
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <TextField
                      label={t('records.label_place_of_birth')}
                      value={formData.placeOfBirth || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, placeOfBirth: e.target.value }))}
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label={t('records.label_father_name')}
                      value={formData.fatherName || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, fatherName: e.target.value }))}
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <TextField
                      label={t('records.label_mother_name')}
                      value={formData.motherName || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, motherName: e.target.value }))}
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Stack>
                </Stack>
              </RecordSection>

              {/* Baptism Details Section */}
              <RecordSection title={t('records.section_baptism')}>
                <Stack spacing={2.5} sx={{ mt: 2 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label={t('records.label_date_of_baptism')}
                      type="date"
                      value={formData.dateOfBaptism || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, dateOfBaptism: e.target.value }))}
                      InputLabelProps={{ shrink: true }}
                      required
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <FormControl sx={{ flex: 1 }}>
                      <InputLabel>{t('records.label_received_by')}</InputLabel>
                      <Select
                        label={t('records.label_received_by')}
                        value={formData.entryType || ''}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, entryType: e.target.value }))}
                        sx={{ borderRadius: 2 }}
                      >
                        <MenuItem value="Baptism">Baptism</MenuItem>
                        <MenuItem value="Chrismation">Chrismation</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                  <TextField
                    label={t('records.label_godparents')}
                    value={formData.godparentNames || ''}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, godparentNames: e.target.value }))}
                    placeholder={t('records.placeholder_godparents')}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Stack>
              </RecordSection>

              {/* Church & Registry Information Section */}
              <RecordSection title={t('records.section_church_registry')}>
                <Stack spacing={2.5} sx={{ mt: 2 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <FormControl sx={{ flex: 1 }}>
                      <InputLabel>{t('records.label_priest_select')}</InputLabel>
                      <Select
                        label={t('records.label_priest_select')}
                        value={formData.priest || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === 'custom') {
                            setFormData((prev: any) => ({ ...prev, priest: '', customPriest: true }));
                          } else {
                            setFormData((prev: any) => ({ ...prev, priest: value, customPriest: false }));
                          }
                        }}
                        sx={{ borderRadius: 2 }}
                      >
                        <MenuItem value="">
                          <em>{t('records.placeholder_select_priest')}</em>
                        </MenuItem>
                        {priestOptions.map((priest) => (
                          <MenuItem key={priest} value={priest}>{priest}</MenuItem>
                        ))}
                        <MenuItem value="custom">
                          <em>{t('records.option_other_priest')}</em>
                        </MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      label={t('records.label_church')}
                      value={churches.find(c => c.id === selectedChurch)?.church_name || t('records.label_no_church')}
                      InputProps={{ readOnly: true }}
                      sx={{
                        flex: 1,
                        '& .MuiOutlinedInput-root': { borderRadius: 2 },
                        '& .MuiInputBase-input': { color: 'text.secondary' },
                      }}
                    />
                  </Stack>
                  {formData.customPriest && (
                    <TextField
                      label={t('records.label_priest')}
                      value={formData.priest || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, priest: e.target.value }))}
                      fullWidth
                      placeholder={t('records.placeholder_priest_name')}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  )}
                  <TextField
                    label={t('records.label_registry_number')}
                    value={formData.registryNumber || ''}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, registryNumber: e.target.value }))}
                    placeholder={t('records.placeholder_registry')}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Stack>
              </RecordSection>

              {/* Additional Notes Section */}
              <RecordSection title={t('records.section_notes')}>
                <TextField
                  label={t('records.label_notes')}
                  multiline
                  rows={4}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, notes: e.target.value }))}
                  placeholder={t('records.placeholder_notes')}
                  fullWidth
                  sx={{ mt: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </RecordSection>
            </>
          )}

          {selectedRecordType === 'marriage' && (
            <>
              {/* Groom Information Section */}
              <RecordSection title={t('records.section_groom')}>
                <Stack spacing={2.5} sx={{ mt: 2 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label={t('common.first_name')}
                      value={formData.groomFirstName || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, groomFirstName: e.target.value }))}
                      required
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <TextField
                      label={t('common.last_name')}
                      value={formData.groomLastName || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, groomLastName: e.target.value }))}
                      required
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Stack>
                  <TextField
                    label={t('records.label_groom_parents')}
                    value={formData.groomParents || ''}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, groomParents: e.target.value }))}
                    placeholder={t('records.placeholder_groom_parents')}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Stack>
              </RecordSection>

              {/* Bride Information Section */}
              <RecordSection title={t('records.section_bride')}>
                <Stack spacing={2.5} sx={{ mt: 2 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label={t('common.first_name')}
                      value={formData.brideFirstName || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, brideFirstName: e.target.value }))}
                      required
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <TextField
                      label={t('common.last_name')}
                      value={formData.brideLastName || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, brideLastName: e.target.value }))}
                      required
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Stack>
                  <TextField
                    label={t('records.label_bride_parents')}
                    value={formData.brideParents || ''}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, brideParents: e.target.value }))}
                    placeholder={t('records.placeholder_bride_parents')}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Stack>
              </RecordSection>

              {/* Marriage Details Section */}
              <RecordSection title={t('records.section_marriage')}>
                <Stack spacing={2.5} sx={{ mt: 2 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label={t('records.label_marriage_date')}
                      type="date"
                      value={formData.marriageDate || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, marriageDate: e.target.value }))}
                      InputLabelProps={{ shrink: true }}
                      required
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <TextField
                      label={t('records.label_marriage_location')}
                      value={formData.marriageLocation || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, marriageLocation: e.target.value }))}
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label={t('records.label_witness_1')}
                      value={formData.witness1 || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, witness1: e.target.value }))}
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <TextField
                      label={t('records.label_witness_2')}
                      value={formData.witness2 || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, witness2: e.target.value }))}
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Stack>
                </Stack>
              </RecordSection>

              <FormControl fullWidth>
                <InputLabel>{t('records.label_priest_select')}</InputLabel>
                <Select
                  label={t('records.label_priest_select')}
                  value={formData.priest || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'custom') {
                      setFormData((prev: any) => ({ ...prev, priest: '', customPriest: true }));
                    } else {
                      setFormData((prev: any) => ({ ...prev, priest: value, customPriest: false }));
                    }
                  }}
                >
                  <MenuItem value="">
                    <em>{t('records.placeholder_select_priest')}</em>
                  </MenuItem>
                  {priestOptions.map((priest) => (
                    <MenuItem key={priest} value={priest}>{priest}</MenuItem>
                  ))}
                  <MenuItem value="custom">
                    <em>{t('records.option_other_priest')}</em>
                  </MenuItem>
                </Select>
              </FormControl>
              {formData.customPriest && (
                <TextField
                  label={t('records.label_priest')}
                  value={formData.priest || ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, priest: e.target.value }))}
                  fullWidth
                  placeholder={t('records.placeholder_priest_name')}
                />
              )}
            </>
          )}

          {selectedRecordType === 'funeral' && (
            <>
              {/* Deceased Information Section */}
              <RecordSection title={t('records.section_deceased')}>
                <Stack spacing={2.5} sx={{ mt: 2 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label={t('common.first_name')}
                      value={formData.deceasedFirstName || formData.firstName || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, deceasedFirstName: e.target.value, firstName: e.target.value }))}
                      required
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <TextField
                      label={t('common.last_name')}
                      value={formData.deceasedLastName || formData.lastName || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, deceasedLastName: e.target.value, lastName: e.target.value }))}
                      required
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label={t('records.label_age_at_death')}
                      type="number"
                      value={formData.age || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, age: e.target.value }))}
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Stack>
                </Stack>
              </RecordSection>

              {/* Funeral Details Section */}
              <RecordSection title={t('records.section_funeral')}>
                <Stack spacing={2.5} sx={{ mt: 2 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label={t('records.label_date_of_death')}
                      type="date"
                      value={formData.deathDate || formData.dateOfDeath || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, deathDate: e.target.value, dateOfDeath: e.target.value }))}
                      InputLabelProps={{ shrink: true }}
                      required
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <TextField
                      label={t('records.label_burial_date')}
                      type="date"
                      value={formData.burialDate || ''}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, burialDate: e.target.value }))}
                      InputLabelProps={{ shrink: true }}
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Stack>
                  <TextField
                    label={t('records.label_burial_location')}
                    value={formData.burialLocation || ''}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, burialLocation: e.target.value }))}
                    fullWidth
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Stack>
              </RecordSection>

              <FormControl fullWidth>
                <InputLabel>{t('records.label_priest_select')}</InputLabel>
                <Select
                  label={t('records.label_priest_select')}
                  value={formData.priest || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'custom') {
                      setFormData((prev: any) => ({ ...prev, priest: '', customPriest: true }));
                    } else {
                      setFormData((prev: any) => ({ ...prev, priest: value, customPriest: false }));
                    }
                  }}
                >
                  <MenuItem value="">
                    <em>{t('records.placeholder_select_priest')}</em>
                  </MenuItem>
                  {priestOptions.map((priest) => (
                    <MenuItem key={priest} value={priest}>{priest}</MenuItem>
                  ))}
                  <MenuItem value="custom">
                    <em>{t('records.option_other_priest')}</em>
                  </MenuItem>
                </Select>
              </FormControl>
              {formData.customPriest && (
                <TextField
                  label={t('records.label_priest')}
                  value={formData.priest || ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, priest: e.target.value }))}
                  fullWidth
                  placeholder={t('records.placeholder_priest_name')}
                />
              )}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions
        sx={{
          px: 3,
          py: 2.5,
          bgcolor: isDarkMode ? 'grey.900' : 'grey.50',
          borderTop: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          gap: 1.5,
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderRadius: 2,
            px: 3,
            py: 1,
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 500,
          }}
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={onSave}
          variant="contained"
          disabled={loading}
          sx={{
            borderRadius: 2,
            px: 4,
            py: 1,
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 600,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, rgba(0,0,0,0.25) 100%), ${theme.palette.primary.main}`,
            boxShadow: theme.shadows[4],
            '&:hover': {
              boxShadow: theme.shadows[8],
            },
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} color="inherit" />
              <span>{t('common.saving')}</span>
            </Box>
          ) : (
            editingRecord ? t('records.update_record') : t('records.save_record')
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditRecordDialog;
