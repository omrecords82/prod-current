/**
 * TemplateBuilder — Create OCR layout templates from sample jobs.
 *
 * Shows structure clusters, lets user pick a sample, view column bands,
 * map columns to record fields, and save as a reusable template.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { IconTemplate, IconRefresh, IconDeviceFloppy, IconPlayerPlay } from '@tabler/icons-react';
import { apiClient } from '@/shared/lib/axiosInstance';
import { getFieldsForType } from '../utils/recordFields';

interface Cluster {
  fingerprint: string;
  columnCount: number;
  orientation: string;
  jobCount: number;
  sampleJobIds: number[];
  allJobIds: number[];
  sampleHeaders: string[];
  recordType: string;
}

interface TemplateBuilderProps {
  churchId: number;
  onTemplateCreated?: (templateId: number) => void;
}

const TemplateBuilder: React.FC<TemplateBuilderProps> = ({ churchId, onTemplateCreated }) => {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [recordType, setRecordType] = useState('baptism');
  const [templateName, setTemplateName] = useState('');
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ templateId: number; message: string } | null>(null);
  const [reprocessing, setReprocessing] = useState(false);
  const [sampleExtraction, setSampleExtraction] = useState<any>(null);

  const fetchClusters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/api/ocr/structure-clusters?churchId=${churchId}`);
      const data = res?.data || res;
      setClusters(data.clusters || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch clusters');
    }
    setLoading(false);
  }, [churchId]);

  useEffect(() => {
    fetchClusters();
  }, [fetchClusters]);

  // Load sample job extraction when cluster is selected
  useEffect(() => {
    if (!selectedCluster || selectedCluster.sampleJobIds.length === 0) {
      setSampleExtraction(null);
      return;
    }

    const jobId = selectedCluster.sampleJobIds[0];
    (async () => {
      try {
        const res = await apiClient.get(`/api/ocr/jobs/${jobId}`);
        const data = res?.data || res;
        setSampleExtraction(data.table_extraction || null);
        if (selectedCluster.recordType && selectedCluster.recordType !== 'unknown') {
          setRecordType(selectedCluster.recordType);
        }
      } catch {
        setSampleExtraction(null);
      }
    })();
  }, [selectedCluster]);

  // Auto-generate template name
  useEffect(() => {
    if (selectedCluster) {
      setTemplateName(`${recordType}_${selectedCluster.columnCount}col_${selectedCluster.orientation}`);
    }
  }, [selectedCluster, recordType]);

  const fields = getFieldsForType(recordType);

  const handleSaveTemplate = useCallback(async () => {
    if (!selectedCluster || !templateName || !sampleExtraction) return;

    setSaving(true);
    setSaveResult(null);
    try {
      // Build column_bands from extraction
      const bands = sampleExtraction.column_bands || {};

      const res = await apiClient.post('/api/ocr/layout-templates', {
        name: templateName,
        record_type: recordType,
        column_bands: bands,
        header_y_threshold: sampleExtraction.header_y_threshold || 0.15,
        field_mappings: columnMappings,
        is_default: true,
      });
      const data = res?.data || res;
      const templateId = data.id || data.templateId;
      setSaveResult({ templateId, message: `Template saved (ID: ${templateId})` });
      onTemplateCreated?.(templateId);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to save template');
    }
    setSaving(false);
  }, [selectedCluster, templateName, recordType, columnMappings, sampleExtraction, onTemplateCreated]);

  const handleReprocessCluster = useCallback(async () => {
    if (!selectedCluster || !saveResult) return;

    setReprocessing(true);
    try {
      await apiClient.post('/api/ocr/batch-reprocess', {
        jobIds: selectedCluster.allJobIds,
        templateId: saveResult.templateId,
      });
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Reprocess failed');
    }
    setReprocessing(false);
  }, [selectedCluster, saveResult]);

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress size={28} />
        <Typography variant="body2" sx={{ mt: 1 }}>Analyzing job structures...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconTemplate size={20} />
          <Typography variant="h6">Template Builder</Typography>
          <Button size="small" startIcon={<IconRefresh size={16} />} onClick={fetchClusters}>
            Refresh
          </Button>
        </Stack>

        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        {saveResult && <Alert severity="success">{saveResult.message}</Alert>}

        {/* Cluster list */}
        {clusters.length === 0 && !loading && (
          <Alert severity="info">No completed jobs with table extractions found.</Alert>
        )}

        {clusters.map((cluster) => (
          <Card
            key={cluster.fingerprint}
            variant="outlined"
            sx={{
              cursor: 'pointer',
              borderColor: selectedCluster?.fingerprint === cluster.fingerprint ? 'primary.main' : undefined,
              borderWidth: selectedCluster?.fingerprint === cluster.fingerprint ? 2 : 1,
            }}
            onClick={() => setSelectedCluster(cluster)}
          >
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip label={`${cluster.jobCount} jobs`} size="small" color="primary" />
                <Chip label={`${cluster.columnCount} columns`} size="small" variant="outlined" />
                <Chip label={cluster.orientation} size="small" variant="outlined" />
                <Chip label={cluster.recordType} size="small" variant="outlined" />
                {cluster.sampleHeaders.length > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    Headers: {cluster.sampleHeaders.join(' | ')}
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        ))}

        {/* Template editor */}
        {selectedCluster && sampleExtraction && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Typography variant="subtitle2">
                Configure template for {selectedCluster.jobCount} jobs ({selectedCluster.columnCount} columns)
              </Typography>

              <Stack direction="row" spacing={1}>
                <TextField
                  label="Template Name"
                  size="small"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  sx={{ flex: 1 }}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Record Type</InputLabel>
                  <Select
                    value={recordType}
                    label="Record Type"
                    onChange={(e) => setRecordType(e.target.value)}
                  >
                    <MenuItem value="baptism">Baptism</MenuItem>
                    <MenuItem value="marriage">Marriage</MenuItem>
                    <MenuItem value="funeral">Funeral</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              {/* Column → Field mapping */}
              <Typography variant="caption" fontWeight={600}>Map columns to fields:</Typography>
              {Object.entries(sampleExtraction.column_bands || {}).map(([colKey, band]: [string, any]) => (
                <Stack key={colKey} direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" sx={{ minWidth: 70, fontFamily: 'monospace' }}>
                    {colKey}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80 }}>
                    [{(band[0] * 100).toFixed(0)}% - {(band[1] * 100).toFixed(0)}%]
                  </Typography>
                  <FormControl size="small" sx={{ flex: 1, minWidth: 140 }}>
                    <Select
                      value={columnMappings[colKey] || ''}
                      displayEmpty
                      onChange={(e) => {
                        setColumnMappings(prev => ({ ...prev, [colKey]: e.target.value }));
                      }}
                      sx={{ fontSize: '0.8rem' }}
                    >
                      <MenuItem value="">
                        <em>Unmapped</em>
                      </MenuItem>
                      {fields.map(f => (
                        <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              ))}

              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={saving ? <CircularProgress size={16} /> : <IconDeviceFloppy size={16} />}
                  onClick={handleSaveTemplate}
                  disabled={saving || !templateName}
                >
                  Save Template
                </Button>
                {saveResult && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={reprocessing ? <CircularProgress size={16} /> : <IconPlayerPlay size={16} />}
                    onClick={handleReprocessCluster}
                    disabled={reprocessing}
                  >
                    Reprocess {selectedCluster.jobCount} jobs
                  </Button>
                )}
              </Stack>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Box>
  );
};

export default TemplateBuilder;
