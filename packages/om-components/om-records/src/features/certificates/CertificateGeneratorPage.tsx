/**
 * Certificate Generator Page
 * 
 * Features:
 * - Blank certificate template with drag-and-drop field positioning
 * - Save/load church-specific field positions
 * - Generate Report wizard for batch certificate generation
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  IconButton,
  Slider,
  Stack,
  Chip,
  Tooltip,
  Switch,
  FormControlLabel,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Download as DownloadIcon,
  ArrowBack as BackIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Refresh as RefreshIcon,
  Restore as ResetIcon,
  DragIndicator as DragIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Search as SearchIcon,
  Assignment as AssignmentIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import type { RecordData } from './certificateTypes';
import {
  API_BASE,
  BAPTISM_DEFAULT_POSITIONS,
  MARRIAGE_DEFAULT_POSITIONS,
  BAPTISM_FIELD_LABELS,
  MARRIAGE_FIELD_LABELS,
  formatDate,
  getRecordDisplayName,
} from './certificateTypes';
import GenerateReportWizard from './GenerateReportWizard';

const CertificateGeneratorPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const recordType = searchParams.get('recordType') || 'baptism';
  const recordId = searchParams.get('recordId');
  const churchIdParam = searchParams.get('churchId');
  const churchId = (!churchIdParam || churchIdParam === '0') ? '46' : churchIdParam;

  type SnackbarState = { open: boolean; message: string; severity: 'success' | 'error' };
  type PageBucket = {
    loading: boolean;
    error: string | null;
    templateUrl: string | null;
    recordData: RecordData | null;
    zoom: number;
    downloading: boolean;
    saving: boolean;
    snackbar: SnackbarState;
  };
  const [page, setPage] = useState<PageBucket>({
    loading: true,
    error: null,
    templateUrl: null,
    recordData: null,
    zoom: 90,
    downloading: false,
    saving: false,
    snackbar: { open: false, message: '', severity: 'success' },
  });
  const setPageField = useCallback(<K extends keyof PageBucket>(key: K, value: PageBucket[K]) => {
    setPage(prev => ({ ...prev, [key]: value }));
  }, []);
  const { loading, error, templateUrl, recordData, zoom, downloading, saving, snackbar } = page;
  const setLoading = useCallback((v: boolean) => setPageField('loading', v), [setPageField]);
  const setError = useCallback((v: string | null) => setPageField('error', v), [setPageField]);
  const setTemplateUrl = useCallback((v: string | null) => setPageField('templateUrl', v), [setPageField]);
  const setRecordData = useCallback((v: RecordData | null) => setPageField('recordData', v), [setPageField]);
  const setZoom = useCallback((v: number) => setPageField('zoom', v), [setPageField]);
  const setDownloading = useCallback((v: boolean) => setPageField('downloading', v), [setPageField]);
  const setSaving = useCallback((v: boolean) => setPageField('saving', v), [setPageField]);
  const setSnackbar: React.Dispatch<React.SetStateAction<SnackbarState>> = useCallback((action) => {
    setPage(prev => ({ ...prev, snackbar: typeof action === 'function' ? (action as (p: SnackbarState) => SnackbarState)(prev.snackbar) : action }));
  }, []);

  // Field positioning state
  const defaultPositions = recordType === 'marriage' ? MARRIAGE_DEFAULT_POSITIONS : BAPTISM_DEFAULT_POSITIONS;
  const fieldLabels = recordType === 'marriage' ? MARRIAGE_FIELD_LABELS : BAPTISM_FIELD_LABELS;

  type FieldPositions = Record<string, { x: number; y: number }>;
  type PlacementBucket = {
    fieldPositions: FieldPositions;
    placedFields: Set<string>;
    draggingField: string | null;
    showCoordinates: boolean;
    imageLoaded: boolean;
    savedPositionsLoaded: boolean;
    savedPositions: FieldPositions | null;
    driftWarnings: Array<{ field: string; label: string; distance: number }>;
    showDriftDialog: boolean;
  };
  const [placement, setPlacement] = useState<PlacementBucket>({
    fieldPositions: {},
    placedFields: new Set<string>(),
    draggingField: null,
    showCoordinates: false,
    imageLoaded: false,
    savedPositionsLoaded: false,
    savedPositions: null,
    driftWarnings: [],
    showDriftDialog: false,
  });
  const setPlacementField = useCallback(<K extends keyof PlacementBucket>(key: K, value: PlacementBucket[K]) => {
    setPlacement(prev => ({ ...prev, [key]: value }));
  }, []);
  const { fieldPositions, placedFields, draggingField, showCoordinates, imageLoaded, savedPositionsLoaded, savedPositions, driftWarnings, showDriftDialog } = placement;
  const setFieldPositions: React.Dispatch<React.SetStateAction<FieldPositions>> = useCallback((action) => {
    setPlacement(prev => ({ ...prev, fieldPositions: typeof action === 'function' ? (action as (p: FieldPositions) => FieldPositions)(prev.fieldPositions) : action }));
  }, []);
  const setPlacedFields: React.Dispatch<React.SetStateAction<Set<string>>> = useCallback((action) => {
    setPlacement(prev => ({ ...prev, placedFields: typeof action === 'function' ? (action as (p: Set<string>) => Set<string>)(prev.placedFields) : action }));
  }, []);
  const setDraggingField = useCallback((v: string | null) => setPlacementField('draggingField', v), [setPlacementField]);
  const setShowCoordinates = useCallback((v: boolean) => setPlacementField('showCoordinates', v), [setPlacementField]);
  const setImageLoaded = useCallback((v: boolean) => setPlacementField('imageLoaded', v), [setPlacementField]);
  const setSavedPositionsLoaded = useCallback((v: boolean) => setPlacementField('savedPositionsLoaded', v), [setPlacementField]);
  const setSavedPositions = useCallback((v: FieldPositions | null) => setPlacementField('savedPositions', v), [setPlacementField]);
  const setDriftWarnings = useCallback((v: Array<{ field: string; label: string; distance: number }>) => setPlacementField('driftWarnings', v), [setPlacementField]);
  const setShowDriftDialog = useCallback((v: boolean) => setPlacementField('showDriftDialog', v), [setPlacementField]);

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  
  // Refs
  const imageRef = useRef<HTMLImageElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);

  // Get field value for display
  const getFieldValue = (fieldName: string): string => {
    if (!recordData) return '';
    
    switch (fieldName) {
      case 'fullName': {
        const first = recordData.first_name || recordData.person_first || '';
        const last = recordData.last_name || recordData.person_last || '';
        return `${first} ${last}`.trim();
      }
      case 'birthDate':
        return formatDate(recordData.birth_date);
      case 'birthplace':
        return recordData.birthplace || '';
      case 'baptismDate':
        return formatDate(recordData.baptism_date || recordData.reception_date);
      case 'sponsors':
        return recordData.sponsors || recordData.godparents || '';
      case 'clergyBy':
      case 'clergyRector':
      case 'clergy':
        return recordData.clergy || '';
      case 'church':
        return recordData.churchName || '';
      case 'groomName': {
        const gFirst = recordData.fname_groom || recordData.groom_first || '';
        const gLast = recordData.lname_groom || recordData.groom_last || '';
        return `${gFirst} ${gLast}`.trim();
      }
      case 'brideName': {
        const bFirst = recordData.fname_bride || recordData.bride_first || '';
        const bLast = recordData.lname_bride || recordData.bride_last || '';
        return `${bFirst} ${bLast}`.trim();
      }
      case 'marriageDate':
        return formatDate(recordData.marriage_date);
      case 'witnesses':
        return recordData.witnesses || '';
      default:
        return '';
    }
  };

  // Remove a field from the certificate
  const removeField = (fieldName: string) => {
    setPlacedFields(prev => {
      const newSet = new Set(prev);
      newSet.delete(fieldName);
      return newSet;
    });
    setFieldPositions(prev => {
      const newPos = { ...prev };
      delete newPos[fieldName];
      return newPos;
    });
  };

  // Reset - remove all placed fields
  const resetPositions = () => {
    setFieldPositions({});
    setPlacedFields(new Set());
  };

  // Place all fields at saved or default positions
  const placeAllFields = () => {
    setFieldPositions(prev => {
      const newPos = { ...prev };
      Object.keys(fieldLabels).forEach(key => {
        if (!newPos[key]) {
          newPos[key] = defaultPositions[key] || { x: 300, y: 300 };
        }
      });
      return newPos;
    });
    setPlacedFields(new Set(Object.keys(fieldLabels)));
  };

  // Load saved positions for this church
  const loadSavedPositions = async (): Promise<Record<string, { x: number; y: number }> | null> => {
    try {
      const data = await apiClient.get<any>(`/church/${churchId}/certificate/positions/${recordType}`);
      if (data.success && data.positions && !data.isDefault) {
        setSavedPositions(data.positions);
        setFieldPositions(data.positions);
        setPlacedFields(new Set(Object.keys(data.positions)));
        setSavedPositionsLoaded(true);
        setShowCoordinates(true); // Show coordinates by default when saved positions exist
        return data.positions;
      }
    } catch (err) {
      console.warn('Could not load saved positions:', err);
    }
    return null;
  };

  // Check for coordinate drift from saved positions
  const checkCoordinateDrift = () => {
    if (!savedPositions || Object.keys(fieldPositions).length === 0) return;
    
    const DRIFT_THRESHOLD = 50; // pixels
    const warnings: Array<{ field: string; label: string; distance: number }> = [];
    
    Object.keys(fieldPositions).forEach(fieldName => {
      const current = fieldPositions[fieldName];
      const saved = savedPositions[fieldName];
      
      if (current && saved) {
        const distance = Math.sqrt(
          Math.pow(current.x - saved.x, 2) + Math.pow(current.y - saved.y, 2)
        );
        
        if (distance > DRIFT_THRESHOLD) {
          warnings.push({
            field: fieldName,
            label: fieldLabels[fieldName] || fieldName,
            distance: Math.round(distance),
          });
        }
      }
    });
    
    setDriftWarnings(warnings);
    if (warnings.length > 0) {
      setShowDriftDialog(true);
    }
  };

  // Revert to saved positions
  const revertToSaved = () => {
    if (savedPositions) {
      setFieldPositions(savedPositions);
      setPlacedFields(new Set(Object.keys(savedPositions)));
      setDriftWarnings([]);
      setShowDriftDialog(false);
      setSnackbar({ open: true, message: 'Reverted to saved positions', severity: 'success' });
    }
  };

  // Save positions for this church
  const savePositions = async () => {
    if (placedFields.size === 0) {
      setSnackbar({ open: true, message: 'No fields to save', severity: 'error' });
      return;
    }
    
    try {
      setSaving(true);
      await apiClient.post<any>(`/church/${churchId}/certificate/positions/${recordType}`, { positions: fieldPositions });
      setSnackbar({ open: true, message: 'Positions saved! These will be used for all certificates of this type.', severity: 'success' });
      setSavedPositionsLoaded(true);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to save positions', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Fetch blank template and record data
  const fetchData = useCallback(async () => {
    if (!recordId || !churchId) {
      setError('Missing required parameters: recordId and churchId');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [templateData, recordResData] = await Promise.all([
        apiClient.get<any>(`/church/${churchId}/certificate/${recordType}/template`),
        apiClient.post<any>(`/church/${churchId}/certificate/${recordType}/${recordId}/preview`, { fieldOffsets: {}, hiddenFields: Object.keys(fieldLabels) }),
      ]);

      if (templateData.success && templateData.template) {
        setTemplateUrl(templateData.template); setImageLoaded(false);
      }

      if (recordResData.success && recordResData.record) {
        setRecordData(recordResData.record);
      }
      if (!templateUrl && recordResData.preview) {
        setTemplateUrl(recordResData.preview);
      }

      // Load saved positions
      await loadSavedPositions();

    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load certificate data');
    } finally {
      setLoading(false);
    }
  }, [recordId, churchId, recordType, fieldLabels]);

  useEffect(() => {
    fetchData();
  }, []);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, fieldName: string) => {
    setDraggingField(fieldName);
    e.dataTransfer.setData('fieldName', fieldName);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fieldName = e.dataTransfer.getData('fieldName') || draggingField;
    if (!fieldName || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const scaleX = imageRef.current.naturalWidth / rect.width;
    const scaleY = imageRef.current.naturalHeight / rect.height;
    
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    
    setFieldPositions(prev => ({ ...prev, [fieldName]: { x, y } }));
    setPlacedFields(prev => new Set([...prev, fieldName]));
    setDraggingField(null);
  };

  const handleDragEnd = () => setDraggingField(null);

  const handleFieldMouseDown = (e: React.MouseEvent, fieldName: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = fieldPositions[fieldName] || { x: 0, y: 0 };
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!imageRef.current) return;
      
      const rect = imageRef.current.getBoundingClientRect();
      const scaleX = imageRef.current.naturalWidth / rect.width;
      const scaleY = imageRef.current.naturalHeight / rect.height;
      
      const deltaX = (moveEvent.clientX - startX) * scaleX;
      const deltaY = (moveEvent.clientY - startY) * scaleY;
      
      setFieldPositions(prev => ({
        ...prev,
        [fieldName]: {
          x: Math.round(startPos.x + deltaX),
          y: Math.round(startPos.y + deltaY),
        },
      }));
    };
    
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      // Check for drift after drag ends
      setTimeout(() => checkCoordinateDrift(), 100);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Download single certificate
  // Preview PDF in new window
  const handlePreviewPDF = async () => {
    if (!recordId || !churchId) return;

    try {
      const positions: Record<string, { x: number; y: number }> = {};
      const hiddenFields: string[] = [];
      
      Object.keys(fieldLabels).forEach(key => {
        if (placedFields.has(key) && fieldPositions[key]) {
          positions[key] = fieldPositions[key];
        } else {
          hiddenFields.push(key);
        }
      });
      
      const blob = await apiClient.get<Blob>(
        `/church/${churchId}/certificate/${recordType}/${recordId}/download?positions=${encodeURIComponent(JSON.stringify(positions))}&hidden=${encodeURIComponent(JSON.stringify(hiddenFields))}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Preview error:', err);
      setError(err instanceof Error ? err.message : 'Failed to preview certificate');
    }
  };

  const handleDownload = async () => {
    if (!recordId || !churchId) return;

    try {
      setDownloading(true);
      
      const positions: Record<string, { x: number; y: number }> = {};
      const hiddenFields: string[] = [];
      
      Object.keys(fieldLabels).forEach(key => {
        if (placedFields.has(key) && fieldPositions[key]) {
          positions[key] = fieldPositions[key];
        } else {
          hiddenFields.push(key);
        }
      });
      
      const blob = await apiClient.get<Blob>(
        `/church/${churchId}/certificate/${recordType}/${recordId}/download?positions=${encodeURIComponent(JSON.stringify(positions))}&hidden=${encodeURIComponent(JSON.stringify(hiddenFields))}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${recordType}_certificate_${recordId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      setError(err instanceof Error ? err.message : 'Failed to download certificate');
    } finally {
      setDownloading(false);
    }
  };

  const getDisplayName = () => {
    if (!recordData) return '';
    if (recordType === 'marriage') {
      const groom = `${recordData.fname_groom || recordData.groom_first || ''} ${recordData.lname_groom || recordData.groom_last || ''}`.trim();
      const bride = `${recordData.fname_bride || recordData.bride_first || ''} ${recordData.lname_bride || recordData.bride_last || ''}`.trim();
      return `${groom} & ${bride}`;
    }
    return `${recordData.first_name || recordData.person_first || ''} ${recordData.last_name || recordData.person_last || ''}`.trim();
  };

  const handleGoBack = () => navigate(-1);

  const getScreenPosition = (fieldName: string) => {
    if (!imageRef.current || !imageWrapperRef.current) return null;
    
    const rect = imageRef.current.getBoundingClientRect();
    const wrapperRect = imageWrapperRef.current.getBoundingClientRect();
    const pos = fieldPositions[fieldName];
    if (!pos) return null;
    
    const scaleX = rect.width / imageRef.current.naturalWidth;
    const scaleY = rect.height / imageRef.current.naturalHeight;
    
    return {
      left: (rect.left - wrapperRect.left) + (pos.x * scaleX),
      top: (rect.top - wrapperRect.top) + (pos.y * scaleY),
    };
  };


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <Paper sx={{ p: 1.5, flexShrink: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={handleGoBack} size="small">
              <BackIcon />
            </IconButton>
            <Box>
              <Typography variant="h6">
                {recordType === 'marriage' ? 'Marriage' : 'Baptism'} Certificate Generator
              </Typography>
              {recordData && (
                <Typography variant="caption" color="text.secondary">{getDisplayName()}</Typography>
              )}
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="outlined"
              size="small"
              startIcon={<AssignmentIcon />}
              onClick={() => setWizardOpen(true)}
            >
              Generate Report
            </Button>
            <Chip label={`Record #${recordId}`} size="small" variant="outlined" />
            <Chip label={`Church #${churchId}`} size="small" variant="outlined" />
            {savedPositionsLoaded && (
              <Chip label="Saved positions loaded" size="small" color="success" />
            )}
            {driftWarnings.length > 0 && (
              <Chip 
                label={`${driftWarnings.length} position changes`} 
                size="small" 
                color="warning" 
                icon={<WarningIcon />}
                onClick={() => setShowDriftDialog(true)}
                sx={{ cursor: 'pointer' }}
              />
            )}
          </Stack>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mx: 2, mt: 1 }} action={<Button size="small" onClick={fetchData}>Retry</Button>}>
          {error}
        </Alert>
      )}

      {/* Main Content */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', p: 2, gap: 2 }}>
        {/* Left Panel */}
        <Box sx={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'auto' }}>
          <Card>
            <CardContent sx={{ py: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">Drag Fields</Typography>
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="Place All Fields">
                    <Button size="small" variant="outlined" onClick={placeAllFields} sx={{ minWidth: 'auto', px: 1 }}>
                      All
                    </Button>
                  </Tooltip>
                  <Tooltip title="Clear All">
                    <IconButton size="small" onClick={resetPositions}>
                      <ResetIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
              
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Drag fields onto the certificate to place them.
              </Typography>
              
              <Divider sx={{ my: 1 }} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {Object.keys(fieldLabels).map((fieldName) => {
                  const isPlaced = placedFields.has(fieldName);
                  const value = getFieldValue(fieldName);
                  const displayValue = value || `[${fieldLabels[fieldName]}]`;
                  
                  return (
                    <Box
                      key={fieldName}
                      draggable
                      onDragStart={(e) => handleDragStart(e, fieldName)}
                      onDragEnd={handleDragEnd}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        p: 0.75,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: isPlaced ? 'success.main' : 'grey.300',
                        bgcolor: isPlaced ? 'success.light' : 'background.paper',
                        cursor: 'grab',
                        opacity: isPlaced ? 0.6 : 1,
                        '&:hover': {
                          bgcolor: isPlaced ? 'success.light' : 'action.hover',
                          borderColor: isPlaced ? 'success.main' : 'primary.main',
                        },
                      }}
                    >
                      <DragIcon fontSize="small" color="action" />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>
                          {fieldLabels[fieldName]}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 'medium',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: value ? 'text.primary' : 'text.disabled',
                          }}
                        >
                          {displayValue}
                        </Typography>
                      </Box>
                      {isPlaced && (
                        <Chip label="✓" size="small" color="success" sx={{ height: 20, '& .MuiChip-label': { px: 0.5 } }} />
                      )}
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>

          {/* Coordinates Toggle */}
          <Card>
            <CardContent sx={{ py: 1 }}>
              <FormControlLabel
                control={<Switch size="small" checked={showCoordinates} onChange={(e) => setShowCoordinates(e.target.checked)} />}
                label={<Typography variant="body2">Show coordinates</Typography>}
              />
              
              {showCoordinates && placedFields.size > 0 && (
                <Box sx={{ mt: 1, maxHeight: 150, overflow: 'auto' }}>
                  {Object.keys(fieldLabels).map((fieldName) => {
                    const pos = fieldPositions[fieldName];
                    if (!pos || !placedFields.has(fieldName)) return null;
                    return (
                      <Typography key={fieldName} variant="caption" sx={{ display: 'block' }}>
                        {fieldLabels[fieldName]}: ({pos.x}, {pos.y})
                      </Typography>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent sx={{ py: 1 }}>
              <Stack spacing={1}>
                <Button
                  variant="outlined"
                  fullWidth
                  size="small"
                  color="secondary"
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                  onClick={savePositions}
                  disabled={saving || placedFields.size === 0}
                >
                  {saving ? 'Saving...' : 'Save Positions for Church'}
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  size="small"
                  startIcon={<SearchIcon />}
                  onClick={handlePreviewPDF}
                  disabled={loading || placedFields.size === 0}
                >
                  Preview PDF
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  size="small"
                  startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
                  onClick={handleDownload}
                  disabled={loading || downloading || placedFields.size === 0}
                >
                  {downloading ? 'Downloading...' : 'Download PDF'}
                </Button>
                <Button variant="outlined" fullWidth size="small" onClick={handleGoBack}>
                  Back to Records
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* Right Panel - Certificate Preview */}
        <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1, borderBottom: '1px solid #e0e0e0' }}>
            <Typography variant="subtitle2">
              Certificate Preview 
              {placedFields.size > 0 && (
                <Chip label={`${placedFields.size} fields`} size="small" sx={{ ml: 1 }} />
              )}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconButton size="small" onClick={() => setZoom(z => Math.max(30, z - 10))}>
                <ZoomOutIcon fontSize="small" />
              </IconButton>
              <Slider value={zoom} onChange={(_, v) => setZoom(v as number)} min={30} max={150} sx={{ width: 80 }} size="small" />
              <IconButton size="small" onClick={() => setZoom(z => Math.min(150, z + 10))}>
                <ZoomInIcon fontSize="small" />
              </IconButton>
              <Typography variant="caption" sx={{ minWidth: 35 }}>{zoom}%</Typography>
              <Divider orientation="vertical" flexItem />
              <IconButton size="small" onClick={fetchData} disabled={loading}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'grey.200',
              overflow: 'auto',
              p: 2,
            }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {loading ? (
              <Stack alignItems="center" spacing={2}>
                <CircularProgress />
                <Typography color="text.secondary">Loading template...</Typography>
              </Stack>
            ) : templateUrl ? (
              <Box ref={imageWrapperRef} sx={{ position: 'relative', display: 'inline-block' }}>
                <img
                  ref={imageRef}
                  src={templateUrl}
                  alt="Certificate Template"
                  onLoad={() => setImageLoaded(true)}
                  style={{
                    width: `${zoom}%`,
                    maxWidth: 'none',
                    objectFit: 'contain',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    borderRadius: 4,
                    backgroundColor: 'white',
                    userSelect: 'none',
                  }}
                  draggable={false}
                />
                
                {imageLoaded && Array.from(placedFields).map((fieldName) => {
                  const screenPos = getScreenPosition(fieldName);
                  if (!screenPos) return null;
                  
                  const value = getFieldValue(fieldName);
                  const displayValue = value || `[${fieldLabels[fieldName]}]`;
                  
                  return (
                    <Box
                      key={fieldName}
                      onMouseDown={(e) => handleFieldMouseDown(e, fieldName)}
                      sx={{
                        position: 'absolute',
                        left: screenPos.left,
                        top: screenPos.top,
                        transform: 'translate(-50%, -50%)',
                        cursor: 'move',
                        zIndex: 10,
                        userSelect: 'none',
                      }}
                    >
                      <Box sx={{ position: 'relative' }}>
                        <Typography
                          sx={{
                            color: value ? '#000' : '#999',
                            fontWeight: 500,
                            fontSize: '11px',
                            whiteSpace: 'nowrap',
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            padding: '3px 8px',
                            borderRadius: '3px',
                            border: '1px solid #1976d2',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          }}
                        >
                          {displayValue}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); removeField(fieldName); }}
                          sx={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            width: 16,
                            height: 16,
                            bgcolor: 'error.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'error.dark' },
                            p: 0,
                          }}
                        >
                          <CloseIcon sx={{ fontSize: 12 }} />
                        </IconButton>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Typography color="text.secondary">No template available</Typography>
            )}
          </Box>
        </Paper>
      </Box>

      {/* Toast Notification - Top Center */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Drift Warning Dialog */}
      <Dialog open={showDriftDialog} onClose={() => setShowDriftDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <WarningIcon color="warning" />
            <Typography>Position Changes Detected</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            The following fields have been moved significantly from their saved positions. 
            Would you like to save these new positions or revert to the saved ones?
          </Alert>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Field</TableCell>
                  <TableCell>Distance Moved</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {driftWarnings.map(warning => (
                  <TableRow key={warning.field}>
                    <TableCell>{warning.label}</TableCell>
                    <TableCell>{warning.distance}px</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDriftDialog(false)}>Keep Changes</Button>
          <Button onClick={revertToSaved} color="warning">Revert to Saved</Button>
          <Button onClick={() => { savePositions(); setShowDriftDialog(false); }} variant="contained" color="primary">
            Save New Positions
          </Button>
        </DialogActions>
      </Dialog>

      <GenerateReportWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        churchId={churchId}
        recordType={recordType}
        fieldLabels={fieldLabels}
        fieldPositions={fieldPositions}
        savedPositions={savedPositions}
        defaultPositions={defaultPositions}
        savedPositionsLoaded={savedPositionsLoaded}
        loadSavedPositions={loadSavedPositions}
        onSnackbar={(message, severity) => setSnackbar({ open: true, message, severity })}
      />
    </Box>
  );
};

export default CertificateGeneratorPage;
