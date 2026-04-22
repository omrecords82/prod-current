import { apiClient } from '@/api/utils/axiosInstance';
/**
 * CollaborationWizardDialog
 *
 * Replaces the old "Collaborative Report" button behavior.
 * Two scenarios:
 *   A) Generate link for adding new records
 *   B) Generate link for updating existing records with missing info
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  InputAdornment,
} from '@mui/material';
import {
  ContentCopy,
  Add as AddIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Link as LinkIcon,
  CheckCircle,
} from '@mui/icons-material';
import { FIELD_DEFINITIONS, type RecordType } from '../constants';

interface CollaborationWizardDialogProps {
  open: boolean;
  onClose: () => void;
  defaultRecordType: string;
  churchId: string | number;
}

const RECORD_TYPE_OPTIONS = [
  { value: 'baptism', label: 'Baptism' },
  { value: 'marriage', label: 'Marriage' },
  { value: 'funeral', label: 'Funeral' },
];

const CollaborationWizardDialog: React.FC<CollaborationWizardDialogProps> = ({
  open,
  onClose,
  defaultRecordType,
  churchId,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [scenario, setScenario] = useState<'add_new' | 'request_updates' | ''>('');
  const [recordType, setRecordType] = useState<string>(defaultRecordType || 'baptism');
  const [maxRecords, setMaxRecords] = useState(5);
  const [label, setLabel] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Scenario B: record search/selection
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<number[]>([]);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setActiveStep(0);
      setScenario('');
      setRecordType(defaultRecordType || 'baptism');
      setMaxRecords(5);
      setLabel('');
      setRecipientName('');
      setRecipientEmail('');
      setError(null);
      setGeneratedUrl('');
      setCopied(false);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedRecordIds([]);
    }
  }, [open, defaultRecordType]);

  const steps =
    scenario === ''
      ? ['Choose Action', 'Configure', 'Share Link']
      : ['Choose Action', 'Configure', 'Share Link'];

  // Search records for Scenario B
  const handleSearch = useCallback(async () => {
    if (!churchId || !recordType) return;
    try {
      setSearching(true);
      setError(null);
      const params = new URLSearchParams({
        search: searchQuery,
        limit: '50',
        page: '1',
      });
      const data = await apiClient.get<any>(`/churches/${churchId}/records/${recordType}?${params}`);
      setSearchResults(data.data?.records || data.records || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  }, [churchId, recordType, searchQuery]);

  // Auto-search when record type changes in scenario B
  useEffect(() => {
    if (scenario === 'request_updates' && activeStep === 1 && churchId) {
      handleSearch();
    }
  }, [scenario, activeStep, recordType]);

  const toggleRecordSelection = useCallback((id: number) => {
    setSelectedRecordIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  }, []);

  // Get display columns for the search results table
  const getDisplayColumns = useCallback(() => {
    const fields = FIELD_DEFINITIONS[recordType as RecordType]?.fields || [];
    // Show first 4 fields in the table
    return fields.slice(0, 4);
  }, [recordType]);

  // Count empty fields on a record
  const countEmptyFields = useCallback(
    (record: any) => {
      const fields = FIELD_DEFINITIONS[recordType as RecordType]?.fields || [];
      return fields.filter(
        (f) => !record[f.name] || record[f.name] === null || record[f.name] === ''
      ).length;
    },
    [recordType]
  );

  // Generate the link
  const handleGenerateLink = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const numericChurchId = parseInt(String(churchId));
      if (!numericChurchId || numericChurchId <= 0) {
        setError('Please select a specific church from the church selector before generating a link.');
        setLoading(false);
        return;
      }

      const body: any = {
        churchId: numericChurchId,
        linkType: scenario,
        recordType,
        label: label || undefined,
        recipientName: recipientName || undefined,
        recipientEmail: recipientEmail || undefined,
      };

      if (scenario === 'add_new') {
        body.maxRecords = maxRecords;
      } else {
        body.targetRecordIds = selectedRecordIds;
      }

      const data = await apiClient.post<any>('/collaboration-links', body);
      setGeneratedUrl(data.url);
      setActiveStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate link');
    } finally {
      setLoading(false);
    }
  }, [scenario, recordType, churchId, maxRecords, selectedRecordIds, label, recipientName, recipientEmail]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generatedUrl]);

  const canProceedToGenerate = () => {
    if (scenario === 'add_new') {
      return maxRecords >= 1;
    }
    if (scenario === 'request_updates') {
      return selectedRecordIds.length > 0;
    }
    return false;
  };

  // Format date value for display
  const formatValue = (val: any) => {
    if (!val || val === null) return '—';
    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) {
      return val.substring(0, 10);
    }
    return String(val);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { minHeight: 500 } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinkIcon color="primary" />
          <Typography variant="h6">Collaboration Link</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Step 0: Choose Scenario */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="body1" sx={{ mb: 3 }}>
              What would you like to share?
            </Typography>
            <RadioGroup
              value={scenario}
              onChange={(e) => setScenario(e.target.value as any)}
            >
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mb: 2,
                  cursor: 'pointer',
                  border: scenario === 'add_new' ? '2px solid' : '1px solid',
                  borderColor: scenario === 'add_new' ? 'primary.main' : 'divider',
                  '&:hover': { borderColor: 'primary.main' },
                }}
                onClick={() => setScenario('add_new')}
              >
                <FormControlLabel
                  value="add_new"
                  control={<Radio />}
                  label={
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AddIcon color="primary" />
                        <Typography variant="subtitle1" fontWeight={600}>
                          Add New Records
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                        Generate a link for someone to enter new baptism, marriage, or funeral records.
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0, width: '100%' }}
                />
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  border: scenario === 'request_updates' ? '2px solid' : '1px solid',
                  borderColor: scenario === 'request_updates' ? 'primary.main' : 'divider',
                  '&:hover': { borderColor: 'primary.main' },
                }}
                onClick={() => setScenario('request_updates')}
              >
                <FormControlLabel
                  value="request_updates"
                  control={<Radio />}
                  label={
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EditIcon color="primary" />
                        <Typography variant="subtitle1" fontWeight={600}>
                          Request Record Updates
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                        Select existing records and ask someone to fill in missing information.
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0, width: '100%' }}
                />
              </Paper>
            </RadioGroup>
          </Box>
        )}

        {/* Step 1: Configure */}
        {activeStep === 1 && scenario === 'add_new' && (
          <Box>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Configure New Record Link
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Record Type</InputLabel>
                <Select
                  value={recordType}
                  label="Record Type"
                  onChange={(e) => setRecordType(e.target.value)}
                >
                  {RECORD_TYPE_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Max Records"
                type="number"
                size="small"
                value={maxRecords}
                onChange={(e) => setMaxRecords(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                inputProps={{ min: 1, max: 100 }}
                sx={{ minWidth: 130 }}
              />
            </Box>

            <TextField
              label="Label (optional)"
              placeholder="e.g., Fr. John's baptism entries"
              fullWidth
              size="small"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              sx={{ mb: 2 }}
            />

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Optional: recipient details
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Recipient Name"
                size="small"
                fullWidth
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
              <TextField
                label="Recipient Email"
                size="small"
                fullWidth
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
            </Box>
          </Box>
        )}

        {activeStep === 1 && scenario === 'request_updates' && (
          <Box>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Select Records to Update
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Record Type</InputLabel>
                <Select
                  value={recordType}
                  label="Record Type"
                  onChange={(e) => {
                    setRecordType(e.target.value);
                    setSelectedRecordIds([]);
                    setSearchResults([]);
                  }}
                >
                  {RECORD_TYPE_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                size="small"
                fullWidth
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={handleSearch} disabled={searching}>
                        <SearchIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {selectedRecordIds.length > 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {selectedRecordIds.length} record(s) selected
              </Alert>
            )}

            <TextField
              label="Label (optional)"
              placeholder="e.g., Missing dates for 2024 records"
              fullWidth
              size="small"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              sx={{ mb: 2 }}
            />

            {searching ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : (
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ maxHeight: 300, overflow: 'auto' }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" />
                      {getDisplayColumns().map((col) => (
                        <TableCell key={col.name}>{col.label}</TableCell>
                      ))}
                      <TableCell>Missing Fields</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {searchResults.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={getDisplayColumns().length + 2} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            No records found. Try a different search.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      searchResults.map((record) => {
                        const empty = countEmptyFields(record);
                        return (
                          <TableRow
                            key={record.id}
                            hover
                            selected={selectedRecordIds.includes(record.id)}
                            onClick={() => toggleRecordSelection(record.id)}
                            sx={{ cursor: 'pointer' }}
                          >
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedRecordIds.includes(record.id)}
                                size="small"
                              />
                            </TableCell>
                            {getDisplayColumns().map((col) => (
                              <TableCell key={col.name}>
                                {formatValue(record[col.name])}
                              </TableCell>
                            ))}
                            <TableCell>
                              {empty > 0 ? (
                                <Chip label={`${empty} empty`} size="small" color="warning" />
                              ) : (
                                <Chip label="Complete" size="small" color="success" />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* Step 2: Generated Link */}
        {activeStep === 2 && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircle color="success" sx={{ fontSize: 56, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Link Generated!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {scenario === 'add_new'
                ? `This link allows adding up to ${maxRecords} ${recordType} record(s). It expires in 30 days.`
                : `This link allows updating ${selectedRecordIds.length} ${recordType} record(s). It expires in 30 days.`}
            </Typography>

            <Paper
              variant="outlined"
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: '#f5f5f5',
                wordBreak: 'break-all',
              }}
            >
              <Typography
                variant="body2"
                sx={{ flex: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}
              >
                {generatedUrl}
              </Typography>
              <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
                <IconButton onClick={handleCopyLink} color={copied ? 'success' : 'default'}>
                  {copied ? <CheckCircle /> : <ContentCopy />}
                </IconButton>
              </Tooltip>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {activeStep === 0 && (
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              variant="contained"
              disabled={!scenario}
              onClick={() => setActiveStep(1)}
            >
              Next
            </Button>
          </>
        )}

        {activeStep === 1 && (
          <>
            <Button onClick={() => setActiveStep(0)}>Back</Button>
            <Button
              variant="contained"
              disabled={!canProceedToGenerate() || loading}
              onClick={handleGenerateLink}
            >
              {loading ? <CircularProgress size={22} /> : 'Generate Link'}
            </Button>
          </>
        )}

        {activeStep === 2 && (
          <Button variant="contained" onClick={onClose}>
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CollaborationWizardDialog;
