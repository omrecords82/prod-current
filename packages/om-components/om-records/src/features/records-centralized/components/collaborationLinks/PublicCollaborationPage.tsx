import { apiClient } from '@/api/utils/axiosInstance';
/**
 * PublicCollaborationPage
 *
 * Public-facing page for recipients of collaboration links.
 * Route: /c/:token
 *
 * Scenario A (add_new):  Full record form, submit up to N new records.
 * Scenario B (request_updates): Pre-populated forms, fill in missing fields.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
} from '@mui/material';
import {
  CheckCircle,
  Error as ErrorIcon,
  Church as ChurchIcon,
  Add as AddIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { FIELD_DEFINITIONS, RECORD_TYPES, type FieldDefinition } from '../constants';

interface CollabConfig {
  linkType: 'add_new' | 'request_updates';
  recordType: 'baptism' | 'marriage' | 'funeral';
  churchName: string;
  clergyOptions: string[];
  label?: string;
  maxRecords?: number;
  recordsSubmitted?: number;
  records?: any[];
}

const RECORD_TYPE_LABELS: Record<string, string> = {
  baptism: 'Baptism',
  marriage: 'Marriage',
  funeral: 'Funeral',
};

const PublicCollaborationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<CollabConfig | null>(null);
  const [completed, setCompleted] = useState(false);

  // Scenario A state
  const [currentRecord, setCurrentRecord] = useState<Record<string, any>>({});
  const [recordsSubmitted, setRecordsSubmitted] = useState(0);

  // Scenario B state
  const [updateForms, setUpdateForms] = useState<Record<number, Record<string, any>>>({});

  // Load config
  useEffect(() => {
    if (!token) return;
    const fetchConfig = async () => {
      try {
        setLoading(true);
        setError(null);
        const data: CollabConfig = await apiClient.get<any>(`/collaboration-links/public/${token}`);
        setConfig(data);
        setRecordsSubmitted(data.recordsSubmitted || 0);

        // Initialize update forms for Scenario B
        if (data.linkType === 'request_updates' && data.records) {
          const forms: Record<number, Record<string, any>> = {};
          data.records.forEach((record) => {
            forms[record.id] = {};
          });
          setUpdateForms(forms);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load form');
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [token]);

  const getFields = useCallback((): FieldDefinition[] => {
    if (!config) return [];
    return FIELD_DEFINITIONS[config.recordType as keyof typeof FIELD_DEFINITIONS]?.fields || [];
  }, [config]);

  // Handle field change for Scenario A
  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    setCurrentRecord((prev) => ({ ...prev, [fieldName]: value }));
  }, []);

  // Handle field change for Scenario B
  const handleUpdateFieldChange = useCallback(
    (recordId: number, fieldName: string, value: any) => {
      setUpdateForms((prev) => ({
        ...prev,
        [recordId]: { ...prev[recordId], [fieldName]: value },
      }));
    },
    []
  );

  // Submit new record (Scenario A)
  const handleSubmitNewRecord = useCallback(async () => {
    if (!token || !config) return;
    try {
      setSubmitting(true);
      setError(null);
      const data = await apiClient.post<any>(`/collaboration-links/public/${token}/submit`, { records: [currentRecord] });
      setRecordsSubmitted(data.recordsSubmitted);
      setCurrentRecord({});
      if (data.completed) {
        setCompleted(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }, [token, config, currentRecord]);

  // Submit updates (Scenario B)
  const handleSubmitUpdates = useCallback(async () => {
    if (!token || !config) return;
    try {
      setSubmitting(true);
      setError(null);

      const updates = Object.entries(updateForms)
        .filter(([, fields]) => Object.keys(fields).length > 0)
        .map(([recordId, fields]) => ({
          recordId: parseInt(recordId),
          fields,
        }));

      if (updates.length === 0) {
        setError('No changes to submit');
        setSubmitting(false);
        return;
      }

      await apiClient.post<any>(`/collaboration-links/public/${token}/submit`, { updates });
      setCompleted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }, [token, config, updateForms]);

  // Render a single field
  const renderField = (
    field: FieldDefinition,
    value: any,
    onChange: (name: string, val: any) => void,
    disabled: boolean = false
  ) => {
    const commonProps = {
      key: field.name,
      fullWidth: true,
      size: 'small' as const,
      label: field.label,
      required: field.required,
      disabled,
    };

    if (field.type === 'select') {
      // Use clergy options from backend if this is the clergy field
      const options =
        field.optionsSource === 'clergy' && config?.clergyOptions
          ? config.clergyOptions.map((c) => ({ value: c, label: c }))
          : field.options || [];

      return (
        <Grid item xs={12} sm={6} key={field.name}>
          <FormControl fullWidth size="small" required={field.required} disabled={disabled}>
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={value || ''}
              label={field.label}
              onChange={(e) => onChange(field.name, e.target.value)}
            >
              {options.map((opt: any) => (
                <MenuItem key={opt.value || opt} value={opt.value || opt}>
                  {opt.label || opt}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      );
    }

    if (field.type === 'textarea') {
      return (
        <Grid item xs={12} key={field.name}>
          <TextField
            {...commonProps}
            multiline
            rows={3}
            value={value || ''}
            onChange={(e) => onChange(field.name, e.target.value)}
          />
        </Grid>
      );
    }

    if (field.type === 'date') {
      return (
        <Grid item xs={12} sm={6} key={field.name}>
          <TextField
            {...commonProps}
            type="date"
            value={value || ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
      );
    }

    if (field.type === 'number') {
      return (
        <Grid item xs={12} sm={6} key={field.name}>
          <TextField
            {...commonProps}
            type="number"
            value={value || ''}
            onChange={(e) => onChange(field.name, e.target.value)}
          />
        </Grid>
      );
    }

    // Default: text
    return (
      <Grid item xs={12} sm={6} key={field.name}>
        <TextField
          {...commonProps}
          value={value || ''}
          onChange={(e) => onChange(field.name, e.target.value)}
        />
      </Grid>
    );
  };

  // --- Loading ---
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
        <CircularProgress />
      </Box>
    );
  }

  // --- Error ---
  if (error && !config) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
        <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
          <ErrorIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {error}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This link may have expired, already been used, or been revoked.
          </Typography>
        </Paper>
      </Box>
    );
  }

  // --- Completed ---
  if (completed) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
        <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
          <CheckCircle color="success" sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Thank You!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Your submission has been received successfully.
          </Typography>
          {config && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {config.churchName}
            </Typography>
          )}
        </Paper>
      </Box>
    );
  }

  if (!config) return null;

  const fields = getFields();

  // --- Scenario A: Add New Records ---
  if (config.linkType === 'add_new') {
    const maxRecords = config.maxRecords || 1;
    const remaining = maxRecords - recordsSubmitted;
    const progress = (recordsSubmitted / maxRecords) * 100;

    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
        <Box sx={{ maxWidth: 700, mx: 'auto', px: 2 }}>
          {/* Header */}
          <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <ChurchIcon />
              <Typography variant="h6">{config.churchName}</Typography>
            </Box>
            <Typography variant="h5" sx={{ mb: 1 }}>
              New {RECORD_TYPE_LABELS[config.recordType]} Record
            </Typography>
            {config.label && (
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                {config.label}
              </Typography>
            )}
          </Paper>

          {/* Progress */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Record {recordsSubmitted + 1} of {maxRecords}
              </Typography>
              <Chip
                label={`${remaining} remaining`}
                size="small"
                color={remaining <= 1 ? 'warning' : 'default'}
              />
            </Box>
            <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 1 }} />
          </Paper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Form */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <AddIcon color="primary" />
              <Typography variant="h6">
                Enter {RECORD_TYPE_LABELS[config.recordType]} Details
              </Typography>
            </Box>
            <Grid container spacing={2}>
              {fields.map((field) =>
                renderField(field, currentRecord[field.name], handleFieldChange)
              )}
            </Grid>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                onClick={handleSubmitNewRecord}
                disabled={submitting}
                sx={{
                  background: 'linear-gradient(135deg, #b45309 0%, #c8a951 100%)',
                  '&:hover': { background: 'linear-gradient(135deg, #92400e 0%, #b09030 100%)' },
                }}
              >
                {submitting ? <CircularProgress size={24} /> : `Submit Record (${recordsSubmitted + 1}/${maxRecords})`}
              </Button>
            </Box>
          </Paper>
        </Box>
      </Box>
    );
  }

  // --- Scenario B: Request Updates ---
  if (config.linkType === 'request_updates' && config.records) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
        <Box sx={{ maxWidth: 800, mx: 'auto', px: 2 }}>
          {/* Header */}
          <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <ChurchIcon />
              <Typography variant="h6">{config.churchName}</Typography>
            </Box>
            <Typography variant="h5" sx={{ mb: 1 }}>
              Update {RECORD_TYPE_LABELS[config.recordType]} Records
            </Typography>
            {config.label && (
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                {config.label}
              </Typography>
            )}
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.75 }}>
              Please fill in the missing information for the records below.
              Fields that already have values are shown for reference.
            </Typography>
          </Paper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Record Cards */}
          {config.records.map((record, idx) => {
            const formChanges = updateForms[record.id] || {};
            return (
              <Card key={record.id} sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <EditIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle1" fontWeight={600}>
                      Record #{idx + 1}
                    </Typography>
                  </Box>
                  <Grid container spacing={2}>
                    {fields.map((field) => {
                      const existingValue = record[field.name];
                      const hasValue = existingValue !== null && existingValue !== undefined && existingValue !== '';

                      if (hasValue) {
                        // Read-only: show existing value
                        return (
                          <Grid item xs={12} sm={6} key={field.name}>
                            <TextField
                              fullWidth
                              size="small"
                              label={field.label}
                              value={
                                field.type === 'date' && existingValue
                                  ? String(existingValue).substring(0, 10)
                                  : existingValue
                              }
                              disabled
                              InputProps={{
                                sx: { bgcolor: '#f0f7ff' },
                              }}
                            />
                          </Grid>
                        );
                      }

                      // Editable: empty field
                      return renderField(
                        field,
                        formChanges[field.name],
                        (name, val) => handleUpdateFieldChange(record.id, name, val)
                      );
                    })}
                  </Grid>
                </CardContent>
              </Card>
            );
          })}

          {/* Submit */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, mb: 4 }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmitUpdates}
              disabled={submitting}
              sx={{
                background: 'linear-gradient(135deg, #b45309 0%, #c8a951 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #92400e 0%, #b09030 100%)' },
              }}
            >
              {submitting ? <CircularProgress size={24} /> : 'Submit All Updates'}
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

  return null;
};

export default PublicCollaborationPage;
