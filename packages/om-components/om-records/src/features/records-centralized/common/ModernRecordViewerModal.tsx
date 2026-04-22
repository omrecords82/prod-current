/**
 * Modern Record Viewer Modal
 *
 * Clean, professional record viewer with:
 * - View/edit toggle in header
 * - Prev/Next navigation
 * - Structured field display
 * - Godparents/sponsors with avatars
 * - Parents and birthplace
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Avatar,
  Tooltip,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Description as CertificateIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';

export interface ModernRecordViewerModalProps {
  open: boolean;
  onClose: () => void;
  recordType: 'baptism' | 'marriage' | 'funeral';
  record: any;
  recordIndex: number;
  recordTotal: number;
  onPrev: () => void;
  onNext: () => void;
  onEdit: (record: any) => void;
  onGenerateCertificate?: () => void;
  isDarkMode?: boolean;
  formatDate?: (date: any) => string;
  displayJsonField?: (field: any) => string;
  editFormComponent?: React.ReactNode;
  accentColor?: string;
  mode?: 'view' | 'edit';
  onModeChange?: (mode: 'view' | 'edit') => void;
  onSave?: () => void;
  saveLoading?: boolean;
}

const ModernRecordViewerModal: React.FC<ModernRecordViewerModalProps> = ({
  open,
  onClose,
  recordType,
  record,
  recordIndex,
  recordTotal,
  onPrev,
  onNext,
  onEdit,
  onGenerateCertificate,
  isDarkMode = false,
  formatDate = (date) => date ? new Date(date).toLocaleDateString() : '—',
  displayJsonField = (field) => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    if (Array.isArray(field)) return field.join(', ');
    return JSON.stringify(field);
  },
  editFormComponent,
  accentColor,
  mode: externalMode,
  onModeChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [internalMode, setInternalMode] = useState<'view' | 'edit'>('view');

  const mode = externalMode ?? internalMode;
  const setMode = onModeChange ?? setInternalMode;

  if (!record) return null;

  const accent = accentColor || theme.palette.primary.main;

  // --- Data helpers ---
  const getPersonName = () => {
    if (recordType === 'marriage') {
      const groom = `${record.fname_groom || record.groom_first || record.groomFirstName || ''} ${record.lname_groom || record.groom_last || record.groomLastName || ''}`.trim();
      const bride = `${record.fname_bride || record.bride_first || record.brideFirstName || ''} ${record.lname_bride || record.bride_last || record.brideLastName || ''}`.trim();
      return `${groom} & ${bride}`;
    } else if (recordType === 'funeral') {
      return `${record.deceased_first || record.firstName || ''} ${record.deceased_last || record.lastName || ''}`.trim();
    }
    return `${record.person_first || record.firstName || ''} ${record.person_middle || record.middleName || ''} ${record.person_last || record.lastName || ''}`.trim().replace(/\s+/g, ' ');
  };

  const getRecordTypeLabel = () => recordType.charAt(0).toUpperCase() + recordType.slice(1);

  const getGodparents = () => {
    if (recordType !== 'baptism') return [];
    const raw = record.godparents || record.sponsors || record.godparentNames;
    if (!raw) return [];
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [raw];
      } catch {
        return raw.split(',').map((g: string) => g.trim()).filter(Boolean);
      }
    }
    return Array.isArray(raw) ? raw : [];
  };

  const getWitnesses = () => {
    if (recordType !== 'marriage') return [];
    const raw = record.witnesses;
    if (!raw) return [];
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [raw];
      } catch {
        return raw.split(',').map((w: string) => w.trim()).filter(Boolean);
      }
    }
    return Array.isArray(raw) ? raw : [];
  };

  const getParents = () => {
    if (record.parents) return record.parents;
    const father = record.father_name || record.fatherName || '';
    const mother = record.mother_name || record.motherName || '';
    if (father && mother) return `${father} & ${mother}`;
    return father || mother || '';
  };

  const getBirthplace = () => record.place_name || record.birthplace || record.placeOfBirth || '';

  const getInitials = (name: string) => {
    if (typeof name !== 'string') return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const handleEditClick = () => setMode('edit');
  const handleCancelEdit = () => setMode('view');
  const handleCloseModal = () => { setMode('view'); onClose(); };

  // --- Render helpers ---
  const Field = ({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) => {
    const display = value || '—';
    return (
      <Box sx={{ mb: 1.5 }}>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontSize: '0.68rem',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            display: 'block',
            mb: 0.25,
          }}
        >
          {label}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontWeight: display !== '—' ? 500 : 400,
            color: display === '—' ? 'text.disabled' : 'text.primary',
            fontFamily: mono ? 'monospace' : 'inherit',
          }}
        >
          {display}
        </Typography>
      </Box>
    );
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <Typography
      variant="overline"
      sx={{
        color: 'text.secondary',
        fontWeight: 700,
        fontSize: '0.7rem',
        letterSpacing: 1.2,
        display: 'block',
        mb: 1.5,
        borderBottom: `2px solid`,
        borderColor: 'divider',
        pb: 0.5,
      }}
    >
      {title}
    </Typography>
  );

  const ceremonyDate = formatDate(
    recordType === 'marriage' ? (record.mdate || record.marriage_date || record.marriageDate) :
    recordType === 'funeral' ? (record.funeral_date || record.funeralDate) :
    (record.baptism_date || record.dateOfBaptism)
  );

  return (
    <Dialog
      open={open}
      onClose={handleCloseModal}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          maxHeight: { xs: '100vh', sm: '90vh' },
          borderRadius: { xs: 0, sm: 2 },
          overflow: 'hidden',
        }
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          bgcolor: accent,
          color: 'white',
          px: { xs: 2, sm: 2.5 },
          py: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" sx={{ opacity: 0.75, fontSize: '0.65rem', letterSpacing: 1, textTransform: 'uppercase' }}>
              {getRecordTypeLabel()} Record
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {getPersonName() || 'Unknown'}
              </Typography>
              <Tooltip title={mode === 'view' ? 'Switch to Edit' : 'Switch to View'}>
                <IconButton
                  size="small"
                  onClick={mode === 'view' ? handleEditClick : handleCancelEdit}
                  sx={{
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.15)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                    width: 28,
                    height: 28,
                  }}
                >
                  {mode === 'view' ? <EditIcon sx={{ fontSize: 15 }} /> : <ViewIcon sx={{ fontSize: 15 }} />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0, ml: 1 }}>
            <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.7rem', fontWeight: 600, mr: 0.5 }}>
              {recordIndex + 1}/{recordTotal}
            </Typography>
            <IconButton onClick={onPrev} disabled={recordIndex <= 0} size="small" sx={{ color: 'white', '&.Mui-disabled': { color: 'rgba(255,255,255,0.25)' } }}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <IconButton onClick={onNext} disabled={recordIndex >= recordTotal - 1} size="small" sx={{ color: 'white', '&.Mui-disabled': { color: 'rgba(255,255,255,0.25)' } }}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
            <IconButton onClick={handleCloseModal} size="small" sx={{ color: 'white', ml: 0.5 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ px: { xs: 2, sm: 2.5 }, py: 2.5, overflow: 'auto' }}>
        {mode === 'view' ? (
          <Box>
            {/* Person Information */}
            {recordType === 'marriage' ? (
              <>
                <SectionHeader title="Couple Information" />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, columnGap: 4 }}>
                  <Field label="Groom" value={`${record.fname_groom || record.groom_first || record.groomFirstName || ''} ${record.lname_groom || record.groom_last || record.groomLastName || ''}`.trim()} />
                  <Field label="Bride" value={`${record.fname_bride || record.bride_first || record.brideFirstName || ''} ${record.lname_bride || record.bride_last || record.brideLastName || ''}`.trim()} />
                  <Field label="Groom's Parents" value={record.parentsg || record.groomParents} />
                  <Field label="Bride's Parents" value={record.parentsb || record.brideParents} />
                </Box>
              </>
            ) : recordType === 'funeral' ? (
              <>
                <SectionHeader title="Deceased" />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, columnGap: 4 }}>
                  <Field label="Name" value={getPersonName()} />
                  <Field label="Date of Death" value={formatDate(record.death_date || record.deathDate)} />
                </Box>
              </>
            ) : (
              <>
                <SectionHeader title="Person" />
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0, columnGap: 4 }}>
                  <Field label="Full Name" value={getPersonName()} />
                  <Field label="Date of Birth" value={formatDate(record.birth_date || record.dateOfBirth)} />
                  {getBirthplace() && <Field label="Birthplace" value={getBirthplace()} />}
                  <Field label="Baptism Date" value={formatDate(record.baptism_date || record.dateOfBaptism)} />
                  {getParents() && <Field label="Parents" value={getParents()} />}
                </Box>
              </>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Ceremony */}
            <SectionHeader title="Ceremony" />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 0, columnGap: 4 }}>
              <Field label="Date" value={ceremonyDate} />
              <Field label="Clergy" value={record.officiant_name || record.priest || record.clergy} />
              <Field label="Location" value={record.place_name || record.location || record.mlicense || record.marriageLicense || record.churchName} />
            </Box>
            {record.address && <Field label="Address" value={record.address} />}

            <Divider sx={{ my: 2 }} />

            {/* Registry */}
            <SectionHeader title="Registry" />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 0, columnGap: 4 }}>
              <Field label="Record ID" value={`#${record.id}`} mono />
              <Field label="Book No." value={record.book_no || record.bookNumber} />
              <Field label="Page No." value={record.page_no || record.pageNumber} />
              <Field label="Entry No." value={record.entry_no || record.entryNumber} />
            </Box>

            {/* Godparents / Witnesses */}
            {(recordType === 'baptism' || recordType === 'marriage') && (() => {
              const people = recordType === 'marriage' ? getWitnesses() : getGodparents();
              const label = recordType === 'marriage' ? 'Witnesses' : 'Godparents';
              if (people.length === 0) return null;

              return (
                <>
                  <Divider sx={{ my: 2 }} />
                  <SectionHeader title={label} />
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {people.map((person: any, i: number) => {
                      const name = typeof person === 'string' ? person : person.name || '';
                      return (
                        <Box
                          key={i}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 1.5,
                            py: 0.75,
                            bgcolor: isDarkMode ? 'action.hover' : 'grey.100',
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Avatar sx={{ width: 26, height: 26, bgcolor: accent, fontSize: '0.65rem', fontWeight: 700 }}>
                            {getInitials(name)}
                          </Avatar>
                          <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.85rem' }}>
                            {name}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </>
              );
            })()}

            {/* Notes */}
            {record.notes && (
              <>
                <Divider sx={{ my: 2 }} />
                <SectionHeader title="Notes" />
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontStyle: 'italic' }}>
                  {record.notes}
                </Typography>
              </>
            )}
          </Box>
        ) : (
          <Box>
            {editFormComponent || (
              <Box sx={{ py: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Edit form not available
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      {/* Footer */}
      <DialogActions sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        px: 2.5,
        py: 1.25,
        justifyContent: 'space-between',
      }}>
        <Box>
          {mode === 'view' && onGenerateCertificate && (recordType === 'baptism' || recordType === 'marriage') && (
            <Button size="small" variant="outlined" onClick={onGenerateCertificate} startIcon={<CertificateIcon />}>
              Certificate
            </Button>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {mode === 'view' ? (
            <>
              <Button size="small" onClick={handleCloseModal} color="inherit">Close</Button>
              <Button size="small" variant="contained" onClick={handleEditClick} startIcon={<EditIcon />}>
                Edit
              </Button>
            </>
          ) : (
            <>
              <Button size="small" onClick={handleCancelEdit} startIcon={<CancelIcon />} color="inherit">Cancel</Button>
              <Button size="small" variant="contained" color="success" startIcon={<SaveIcon />}>Save</Button>
            </>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ModernRecordViewerModal;
