import React, { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { IconCloudUpload, IconScan, IconTrash, IconUpload } from '@tabler/icons-react';
import { toast } from 'react-toastify';
import OcrSetupGate from '@/features/devel-tools/om-ocr/components/OcrSetupGate';
import { OcrStudioHubPanel } from '../components/OcrStudioHubPanel';
import { PageHeader } from '../components/PageHeader';
import { useOcrStudioChurch } from '../hooks/useOcrStudioChurch';
import {
  ANALYZE_ACCEPTED_TYPES,
  analyzePreviewUrl,
  useOcrAnalyze,
  type AnalyzeLayoutType,
  type AnalyzeRecordType,
} from '../hooks/useOcrAnalyze';
import { useOcrStudioPaths } from '../OcrStudioPathContext';

const RECORD_TYPES: AnalyzeRecordType[] = ['custom', 'baptism', 'marriage', 'funeral'];
const LAYOUT_MODES = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'single', label: 'Single record' },
  { value: 'ledger', label: 'Ledger page' },
  { value: 'multi_record_split', label: 'Split composite photo' },
  { value: 'multi_form_page', label: 'Multi-form page' },
];

function typeChipColor(t: string): 'default' | 'primary' | 'secondary' | 'success' | 'warning' {
  if (t === 'baptism') return 'primary';
  if (t === 'marriage') return 'secondary';
  if (t === 'funeral') return 'warning';
  return 'default';
}

function layoutLabel(l: AnalyzeLayoutType): string {
  if (l === 'tabular') return 'Tabular ledger';
  if (l === 'narrative') return 'Narrative journal';
  return 'Form / certificate';
}

function confidencePct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export default function OcrStudioAnalyzePage() {
  const navigate = useNavigate();
  const { toScreen } = useOcrStudioPaths();
  const { churchId, churchLabel } = useOcrStudioChurch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    sessionId,
    items,
    completedItems,
    analyzingCount,
    selectedIds,
    selectedCount,
    allSelected,
    someSelected,
    isAnalyzing,
    isCommitting,
    analyzeProgress,
    dragActive,
    setDragActive,
    analyzeFiles,
    updateItem,
    removeItem,
    clearAll,
    commitToUpload,
    toggleSelection,
    selectAll,
    selectNone,
    toggleSelectAll,
  } = useOcrAnalyze(churchId);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    analyzeFiles(e.dataTransfer.files).catch((err) => toast.error(err.message));
  }, [analyzeFiles, setDragActive]);

  const handleCommit = useCallback(async () => {
    if (!churchId || selectedCount === 0) return;
    try {
      const { jobIds, remainingCount } = await commitToUpload();
      toast.success(
        remainingCount > 0
          ? `Submitted ${jobIds.length} image(s) to OCR — ${remainingCount} still in analyze queue`
          : `Submitted ${jobIds.length} image(s) to OCR processing`,
      );
      if (remainingCount === 0) {
        navigate(toScreen('upload-intake'));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Upload failed');
    }
  }, [churchId, commitToUpload, navigate, toScreen]);

  const needsReviewCount = items.filter((i) => i.needsReview && !i.analyzing && !i.error).length;
  const progressPct = analyzeProgress && analyzeProgress.total > 0
    ? Math.round((analyzeProgress.completed / analyzeProgress.total) * 100)
    : 0;

  return (
    <OcrSetupGate churchId={churchId}>
      <OcrStudioHubPanel churchLabel={churchId ? churchLabel : undefined}>
        <PageHeader
          title="Analyze Records"
          subtitle="Upload a mixed batch of scans. OM will optimize each image, detect record type and layout, and split composite photos before sending to OCR."
        />

        <Paper
          variant="outlined"
          onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={isAnalyzing ? undefined : handleDrop}
          onClick={isAnalyzing ? undefined : () => fileInputRef.current?.click()}
          sx={{
            p: 4,
            mb: 3,
            textAlign: 'center',
            cursor: isAnalyzing ? 'default' : 'pointer',
            borderStyle: 'dashed',
            borderWidth: 2,
            borderColor: dragActive ? 'primary.main' : 'divider',
            bgcolor: dragActive ? 'action.hover' : 'transparent',
            opacity: isAnalyzing ? 0.85 : 1,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ANALYZE_ACCEPTED_TYPES}
            multiple
            hidden
            disabled={isAnalyzing}
            onChange={(e) => {
              analyzeFiles(e.target.files).catch((err) => toast.error(err.message));
              e.target.value = '';
            }}
          />
          {isAnalyzing ? (
            <CircularProgress size={36} sx={{ mb: 1 }} />
          ) : (
            <IconCloudUpload size={40} style={{ opacity: 0.45 }} />
          )}
          <Typography variant="body1" fontWeight={600} sx={{ mt: 1 }}>
            {isAnalyzing ? 'Analyzing images…' : 'Drop mixed register images here'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isAnalyzing && analyzeProgress
              ? `Processing ${analyzeProgress.completed + 1} of ${analyzeProgress.total}${analyzeProgress.currentName ? ` — ${analyzeProgress.currentName}` : ''}`
              : 'Baptism, marriage, and funeral pages together · results appear as each file finishes'}
          </Typography>
        </Paper>

        {isAnalyzing && analyzeProgress && (
          <Box sx={{ mb: 3 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {analyzeProgress.completed} of {analyzeProgress.total} complete
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {progressPct}%
              </Typography>
            </Stack>
            <LinearProgress variant="determinate" value={progressPct} sx={{ height: 8, borderRadius: 1 }} />
          </Box>
        )}

        {items.length > 0 && (
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip icon={<IconScan size={14} />} label={`${completedItems.length} analyzed`} size="small" />
            {analyzingCount > 0 && (
              <Chip label={`${analyzingCount} in progress`} size="small" color="info" variant="outlined" />
            )}
            {selectedCount > 0 && (
              <Chip label={`${selectedCount} selected`} size="small" color="primary" variant="outlined" />
            )}
            {needsReviewCount > 0 && (
              <Chip label={`${needsReviewCount} need review`} size="small" color="warning" variant="outlined" />
            )}
            <Button size="small" onClick={selectAll} disabled={allSelected || isAnalyzing} sx={{ textTransform: 'none' }}>
              Select all
            </Button>
            <Button size="small" onClick={selectNone} disabled={selectedCount === 0} sx={{ textTransform: 'none' }}>
              Select none
            </Button>
            {sessionId && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                Session {sessionId.slice(0, 12)}…
              </Typography>
            )}
            <Button size="small" color="inherit" onClick={() => clearAll().catch(() => {})}>
              Clear all
            </Button>
          </Box>
        )}

        {items.length > 0 && (
          <Paper variant="outlined" sx={{ overflow: 'auto', mb: 3 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={{ width: 48 }}>
                    <Checkbox
                      size="small"
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={toggleSelectAll}
                      disabled={isAnalyzing || items.every((i) => i.analyzing)}
                      inputProps={{ 'aria-label': 'Select all analyzed images' }}
                    />
                  </TableCell>
                  <TableCell sx={{ width: 72 }}>Preview</TableCell>
                  <TableCell>File</TableCell>
                  <TableCell>Record type</TableCell>
                  <TableCell>Layout</TableCell>
                  <TableCell>Optimizations</TableCell>
                  <TableCell>Upload as</TableCell>
                  <TableCell sx={{ width: 48 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    hover
                    selected={item.needsReview && !item.analyzing}
                    sx={{ opacity: !item.analyzing && !item.error && !selectedIds.has(item.id) ? 0.72 : 1 }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelection(item.id)}
                        disabled={!!item.analyzing || !!item.error}
                        inputProps={{ 'aria-label': `Select ${item.originalFilename}` }}
                      />
                    </TableCell>
                    <TableCell>
                      {churchId && sessionId && !item.analyzing ? (
                        <Box
                          component="img"
                          src={analyzePreviewUrl(churchId, sessionId, item.id)}
                          alt=""
                          sx={{
                            width: 56,
                            height: 56,
                            objectFit: 'cover',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        />
                      ) : (
                        <Box sx={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CircularProgress size={20} />
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 180 }}>
                        {item.originalFilename}
                      </Typography>
                      {item.analyzing && (
                        <Typography variant="caption" color="info.main" sx={{ display: 'block' }}>
                          Analyzing…
                        </Typography>
                      )}
                      {item.error && (
                        <Typography variant="caption" color="error.main" sx={{ display: 'block' }}>
                          {item.error}
                        </Typography>
                      )}
                      {!item.analyzing && !item.error && (
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                        <Chip
                          size="small"
                          label={`Type ${confidencePct(item.recordTypeConfidence)}`}
                          variant="outlined"
                          sx={{ fontSize: '0.65rem', height: 20 }}
                        />
                        <Chip
                          size="small"
                          label={`OCR ${confidencePct(item.ocrConfidence)}`}
                          variant="outlined"
                          sx={{ fontSize: '0.65rem', height: 20 }}
                        />
                      </Stack>
                      )}
                      {item.warnings.length > 0 && !item.analyzing && (
                        <Tooltip title={item.warnings.join(' ')}>
                          <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.25 }} noWrap>
                            {item.warnings[0]}
                          </Typography>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" fullWidth sx={{ minWidth: 120 }}>
                        <Select
                          value={item.recordType}
                          onChange={(e) => updateItem(item.id, { recordType: e.target.value as AnalyzeRecordType })}
                        >
                          {RECORD_TYPES.map((t) => (
                            <MenuItem key={t} value={t}>
                              {t === 'custom' ? 'Auto-detect' : t.charAt(0).toUpperCase() + t.slice(1)}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {item.suggestedRecordType !== 'custom' && item.suggestedRecordType !== 'unknown' && (
                        <Typography variant="caption" color="text.secondary">
                          Suggested: {item.suggestedRecordType}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={layoutLabel(item.detectedLayoutType)}
                        sx={{ mb: 0.5 }}
                      />
                      <Typography variant="caption" color="text.secondary" display="block">
                        {confidencePct(item.layoutConfidence)} confidence
                      </Typography>
                      {item.matchedCatalogLayoutTitle && (
                        <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ maxWidth: 140 }}>
                          {item.matchedCatalogLayoutTitle}
                        </Typography>
                      )}
                      {item.shouldSplit && (
                        <Chip size="small" label={`${item.regionsDetected} regions`} color="info" variant="outlined" sx={{ mt: 0.5 }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {item.optimizationsApplied.map((o) => (
                          <Chip key={o} label={o} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" fullWidth sx={{ minWidth: 130, mb: 0.5 }}>
                        <InputLabel>Layout mode</InputLabel>
                        <Select
                          label="Layout mode"
                          value={item.recordLayoutMode}
                          onChange={(e) => updateItem(item.id, { recordLayoutMode: e.target.value })}
                        >
                          {LAYOUT_MODES.map((m) => (
                            <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {item.shouldSplit && (
                        <Button
                          size="small"
                          variant={item.splitRegions ? 'contained' : 'outlined'}
                          onClick={() => updateItem(item.id, { splitRegions: !item.splitRegions })}
                          sx={{ textTransform: 'none', fontSize: '0.7rem' }}
                        >
                          {item.splitRegions ? 'Will split' : 'Split regions'}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => removeItem(item.id)} aria-label="Remove">
                        <IconTrash size={16} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}

        {items.length > 0 && (
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <Button
              variant="contained"
              startIcon={isCommitting ? <CircularProgress size={18} color="inherit" /> : <IconUpload size={18} />}
              disabled={isCommitting || isAnalyzing || selectedCount === 0}
              onClick={handleCommit}
              sx={{ textTransform: 'none' }}
            >
              {isCommitting
                ? 'Uploading…'
                : selectedCount === items.length
                  ? `Upload all ${selectedCount} optimized image(s)`
                  : `Upload ${selectedCount} selected image(s)`}
            </Button>
            <Typography variant="body2" color="text.secondary">
              {selectedCount === 0
                ? 'Select images to send to the OCR pipeline.'
                : 'Unselected images stay in this analyze session until you upload or clear them.'}
            </Typography>
          </Stack>
        )}

        {items.length === 0 && !isAnalyzing && (
          <Alert severity="info" sx={{ mt: 1 }}>
            Analysis uses local image optimization and Tesseract OCR — no cloud Vision calls until you upload.
            Review suggestions for any file marked as needing attention before submitting.
          </Alert>
        )}
      </OcrStudioHubPanel>
    </OcrSetupGate>
  );
}
