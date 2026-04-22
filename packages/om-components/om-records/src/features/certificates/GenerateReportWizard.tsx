/**
 * GenerateReportWizard — 4-step batch certificate generation wizard.
 * Steps: Search Criteria → Select Records → Preview & Adjust → Generate
 * Self-contained with own state for search, selection, preview, and generation.
 * Extracted from CertificateGeneratorPage.tsx
 */
import React, { useState } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import JSZip from 'jszip';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  IconButton,
  Stack,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  LinearProgress,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import type { RecordData, SearchCriteria } from './certificateTypes';
import {
  API_BASE,
  BAPTISM_SEARCH_FIELDS,
  MARRIAGE_SEARCH_FIELDS,
  formatDate,
  getRecordDisplayName,
} from './certificateTypes';

interface GenerateReportWizardProps {
  open: boolean;
  onClose: () => void;
  churchId: string;
  recordType: string;
  fieldLabels: Record<string, string>;
  fieldPositions: Record<string, { x: number; y: number }>;
  savedPositions: Record<string, { x: number; y: number }> | null;
  defaultPositions: Record<string, { x: number; y: number }>;
  savedPositionsLoaded: boolean;
  loadSavedPositions: () => Promise<Record<string, { x: number; y: number }> | null>;
  onSnackbar: (message: string, severity: 'success' | 'error') => void;
}

const WIZARD_STEPS = ['Search Criteria', 'Select Records', 'Preview & Adjust', 'Generate'];

const GenerateReportWizard: React.FC<GenerateReportWizardProps> = ({
  open,
  onClose,
  churchId,
  recordType,
  fieldLabels,
  fieldPositions,
  savedPositions,
  defaultPositions,
  savedPositionsLoaded,
  loadSavedPositions,
  onSnackbar,
}) => {
  const [wizardStep, setWizardStep] = useState(0);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria[]>([{ field: '', value: '' }]);
  const [searchResults, setSearchResults] = useState<RecordData[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
  const [searching, setSearching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const searchFields = recordType === 'marriage' ? MARRIAGE_SEARCH_FIELDS : BAPTISM_SEARCH_FIELDS;
  const selectedRecordsArray = Array.from(selectedRecords);

  const handleClose = () => {
    setGenerating(false);
    onClose();
  };

  // Reset wizard state when opened
  const handleEnter = () => {
    setWizardStep(0);
    setSearchCriteria([{ field: '', value: '' }]);
    setSearchResults([]);
    setSelectedRecords(new Set());
    setGenerationProgress(0);
    setGeneratedCount(0);
    setPreviewUrl(null);
    setPreviewIndex(0);
  };

  const addSearchCriteria = () => {
    setSearchCriteria(prev => [...prev, { field: '', value: '' }]);
  };

  const removeSearchCriteria = (index: number) => {
    if (searchCriteria.length > 1) {
      setSearchCriteria(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateSearchCriteria = (index: number, key: 'field' | 'value', value: string) => {
    setSearchCriteria(prev => {
      const newCriteria = [...prev];
      newCriteria[index] = { ...newCriteria[index], [key]: value };
      return newCriteria;
    });
  };

  const hasValidSearchCriteria = () => {
    return searchCriteria.some(c => c.field && c.value.trim());
  };

  const handleSearch = async () => {
    if (!hasValidSearchCriteria()) return;
    
    setSearching(true);
    try {
      const validCriteria = searchCriteria.filter(c => c.field && c.value.trim());
      const queryParams = new URLSearchParams();
      validCriteria.forEach(c => queryParams.append(c.field, c.value.trim()));
      
      const data = await apiClient.get<any>(
        `/church/${churchId}/certificate/${recordType}/search?${queryParams.toString()}`
      );
      setSearchResults(data.records || []);
      setWizardStep(1);
    } catch (err) {
      onSnackbar('Search failed. Please try again.', 'error');
    } finally {
      setSearching(false);
    }
  };

  const toggleRecordSelection = (id: number) => {
    setSelectedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllRecords = () => {
    setSelectedRecords(new Set(searchResults.map(r => r.id)));
  };

  const deselectAllRecords = () => {
    setSelectedRecords(new Set());
  };

  // Load preview for a specific record
  const loadPreview = async (recId: number) => {
    setLoadingPreview(true);
    try {
      const positions = savedPositions || fieldPositions || {};
      const data = await apiClient.post<any>(
        `/church/${churchId}/certificate/${recordType}/${recId}/preview`,
        { fieldOffsets: positions, hiddenFields: [] }
      );
      if (data.success && data.preview) {
        setPreviewUrl(data.preview);
      }
    } catch (err) {
      console.error('Preview load error:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const goToPreview = (index: number) => {
    if (index >= 0 && index < selectedRecordsArray.length) {
      setPreviewIndex(index);
      loadPreview(selectedRecordsArray[index]);
    }
  };

  const currentPreviewRecord = selectedRecordsArray.length > 0 
    ? searchResults.find(r => r.id === selectedRecordsArray[previewIndex]) 
    : null;

  const generateBatchCertificates = async () => {
    if (selectedRecords.size === 0) return;
    
    setGenerating(true);
    setGenerationProgress(0);
    setGeneratedCount(0);
    
    // Load saved positions for this church
    let positions = fieldPositions;
    if (Object.keys(positions).length === 0) {
      const savedPos = await loadSavedPositions();
      if (savedPos) {
        positions = savedPos;
      } else {
        positions = defaultPositions;
      }
    }
    
    const hiddenFields = Object.keys(fieldLabels).filter(k => !positions[k]);
    const recordIds = Array.from(selectedRecords);
    const total = recordIds.length;
    
    // Create ZIP file
    const zip = new JSZip();
    let successCount = 0;
    
    for (let i = 0; i < recordIds.length; i++) {
      const recId = recordIds[i];
      try {
        const blob = await apiClient.get<Blob>(
          `/church/${churchId}/certificate/${recordType}/${recId}/download?positions=${encodeURIComponent(JSON.stringify(positions))}&hidden=${encodeURIComponent(JSON.stringify(hiddenFields))}`,
          { responseType: 'blob' }
        );
        // Get record info for filename
        const record = searchResults.find(r => r.id === recId);
        let filename = `${recordType}_${recId}.pdf`;
        if (record) {
          const lastName = (record.last_name || record.lname_groom || '').replace(/[^a-zA-Z]/g, '');
          const firstName = (record.first_name || record.fname_groom || '').replace(/[^a-zA-Z]/g, '');
          if (lastName && firstName) {
            filename = `${recordType}_${lastName}_${firstName}.pdf`;
          }
        }
        zip.file(filename, blob);
        successCount++;
        setGeneratedCount(successCount);
      } catch (err) {
        console.error(`Failed to generate certificate for record ${recId}:`, err);
      }
      
      setGenerationProgress(((i + 1) / total) * 100);
    }
    
    // Generate and download ZIP
    if (successCount > 0) {
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${recordType}_certificates_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
    
    setGenerating(false);
    onSnackbar(`Generated ${successCount} certificates in ZIP file!`, 'success');
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth TransitionProps={{ onEnter: handleEnter }}>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Generate Certificates</Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      
      <DialogContent dividers>
        <Stepper activeStep={wizardStep} sx={{ mb: 3 }}>
          {WIZARD_STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step 1: Search Criteria */}
        {wizardStep === 0 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Step 1:</strong> Define your search criteria to find records. You can use multiple fields to narrow down your search.
                At least one field must have a value.
              </Typography>
            </Alert>
            
            <Typography variant="subtitle2" gutterBottom>Search Criteria</Typography>
            
            {searchCriteria.map((criteria, index) => (
              <Grid container spacing={2} key={index} sx={{ mb: 1 }}>
                <Grid item xs={5}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Field</InputLabel>
                    <Select
                      value={criteria.field}
                      label="Field"
                      onChange={(e) => updateSearchCriteria(index, 'field', e.target.value)}
                    >
                      {searchFields.map(f => (
                        <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={5}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Value"
                    type={searchFields.find(f => f.key === criteria.field)?.type === 'date' ? 'date' : 'text'}
                    value={criteria.value}
                    onChange={(e) => updateSearchCriteria(index, 'value', e.target.value)}
                    InputLabelProps={searchFields.find(f => f.key === criteria.field)?.type === 'date' ? { shrink: true } : undefined}
                  />
                </Grid>
                <Grid item xs={2}>
                  <IconButton 
                    onClick={() => removeSearchCriteria(index)} 
                    disabled={searchCriteria.length === 1}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Grid>
              </Grid>
            ))}
            
            <Button startIcon={<AddIcon />} onClick={addSearchCriteria} size="small" sx={{ mt: 1 }}>
              Add Criteria
            </Button>
          </Box>
        )}

        {/* Step 2: Select Records */}
        {wizardStep === 1 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Step 2:</strong> Select the records you want to generate certificates for. 
                You can select multiple records. A certificate will be generated for each selected record.
              </Typography>
            </Alert>
            
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle2">
                Found {searchResults.length} records
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={selectAllRecords}>Select All</Button>
                <Button size="small" onClick={deselectAllRecords}>Deselect All</Button>
              </Stack>
            </Stack>
            
            <TableContainer sx={{ maxHeight: 300 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedRecords.size === searchResults.length && searchResults.length > 0}
                        indeterminate={selectedRecords.size > 0 && selectedRecords.size < searchResults.length}
                        onChange={(e) => e.target.checked ? selectAllRecords() : deselectAllRecords()}
                      />
                    </TableCell>
                    <TableCell>ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {searchResults.map((record) => (
                    <TableRow 
                      key={record.id} 
                      hover 
                      onClick={() => toggleRecordSelection(record.id)}
                      selected={selectedRecords.has(record.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox checked={selectedRecords.has(record.id)} />
                      </TableCell>
                      <TableCell>{record.id}</TableCell>
                      <TableCell>{getRecordDisplayName(record, recordType)}</TableCell>
                      <TableCell>
                        {formatDate(record.reception_date || record.baptism_date || record.marriage_date)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {searchResults.length === 0 && (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                No records found. Try adjusting your search criteria.
              </Typography>
            )}
          </Box>
        )}

        {/* Step 3: Preview & Adjust */}
        {wizardStep === 2 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Step 3:</strong> Preview certificates and adjust field positions if needed. 
                Changes here apply to all certificates in this batch.
              </Typography>
            </Alert>
            
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} sx={{ mb: 2 }}>
              <Button size="small" variant="outlined" onClick={() => goToPreview(previewIndex - 1)} disabled={previewIndex === 0}>Previous</Button>
              <Typography variant="body2">
                Record {previewIndex + 1} of {selectedRecordsArray.length}
                {currentPreviewRecord && <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>({getRecordDisplayName(currentPreviewRecord, recordType)})</Typography>}
              </Typography>
              <Button size="small" variant="outlined" onClick={() => goToPreview(previewIndex + 1)} disabled={previewIndex >= selectedRecordsArray.length - 1}>Next</Button>
              <Button size="small" variant="contained" onClick={() => { if (selectedRecordsArray.length > 0) loadPreview(selectedRecordsArray[previewIndex]); }}>Refresh</Button>
            </Stack>
            
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 2,
              minHeight: 550,
            }}>
              {loadingPreview ? (
                <CircularProgress />
              ) : previewUrl ? (
                <img src={previewUrl} alt="Certificate Preview" style={{ width: '100%', maxWidth: 650, height: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', borderRadius: 4 }} />
              ) : (
                <Typography color="text.secondary">Loading preview...</Typography>
              )}
            </Box>
          </Box>
        )}

        {/* Step 4: Generate */}
        {wizardStep === 3 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Step 4:</strong> Review your selection and generate certificates. 
                Each certificate will be downloaded as a separate PDF file.
              </Typography>
            </Alert>
            
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>Summary</Typography>
                <Typography variant="body2">
                  • <strong>{selectedRecords.size}</strong> records selected
                </Typography>
                <Typography variant="body2">
                  • Certificate type: <strong>{recordType === 'marriage' ? 'Marriage' : 'Baptism'}</strong>
                </Typography>
                <Typography variant="body2">
                  • Church ID: <strong>{churchId}</strong>
                </Typography>
                <Typography variant="body2">
                  • Positions: <strong>{savedPositionsLoaded ? 'Saved (custom)' : 'Default'}</strong>
                </Typography>
              </CardContent>
            </Card>
            
            {generating && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Generating certificates... ({generatedCount} of {selectedRecords.size})
                </Typography>
                <LinearProgress variant="determinate" value={generationProgress} />
              </Box>
            )}
            
            {!generating && generatedCount > 0 && (
              <Alert severity="success" icon={<CheckCircleIcon />}>
                Successfully generated {generatedCount} certificates!
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        {wizardStep > 0 && !generating && (
          <Button onClick={() => setWizardStep(prev => prev - 1)}>
            Back
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        {wizardStep === 0 && (
          <Button 
            variant="contained" 
            onClick={handleSearch}
            disabled={!hasValidSearchCriteria() || searching}
            startIcon={searching ? <CircularProgress size={16} /> : <SearchIcon />}
          >
            {searching ? 'Searching...' : 'Search Records'}
          </Button>
        )}
        {wizardStep === 1 && (
          <Button 
            variant="contained" 
            onClick={() => { setWizardStep(2); setPreviewIndex(0); if (selectedRecordsArray.length > 0) loadPreview(selectedRecordsArray[0]); }}
            disabled={selectedRecords.size === 0}
          >
            Preview ({selectedRecords.size} selected)
          </Button>
        )}
        {wizardStep === 2 && (
          <Button 
            variant="contained" 
            onClick={() => setWizardStep(3)}
          >
            Continue to Generate
          </Button>
        )}
        {wizardStep === 3 && (
          <Button 
            variant="contained" 
            color="primary"
            onClick={generateBatchCertificates}
            disabled={generating || selectedRecords.size === 0}
            startIcon={generating ? <CircularProgress size={16} /> : <DownloadIcon />}
          >
            {generating ? 'Generating...' : `Generate ${selectedRecords.size} Certificates`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default GenerateReportWizard;
