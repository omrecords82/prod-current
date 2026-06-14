import React, { useCallback, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { IconCloudUpload, IconFolder, IconRotate, IconRotateClockwise, IconScan, IconTrash, IconUpload, IconX } from '@tabler/icons-react';
import { toast } from 'react-toastify';
import OcrSetupGate from '@/features/devel-tools/om-ocr/components/OcrSetupGate';
import { ocrStudioPathWithChurch } from '@/features/devel-tools/om-ocr/utils/ocrStudioChurch';
import { AnalyzeAuditPanel } from '../components/AnalyzeAuditPanel';
import { AnalyzePreviewThumb, type AnalyzePreviewVariant } from '../components/AnalyzePreviewThumb';
import { OcrStudioHubPanel } from '../components/OcrStudioHubPanel';
import { PageHeader } from '../components/PageHeader';
import { useOcrStudioChurch } from '../hooks/useOcrStudioChurch';
import {
  ANALYZE_ACCEPTED_TYPES,
  useOcrAnalyze,
  type AnalyzeLayoutType,
  type AnalyzeQueueItem,
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

const QUALITY_ISSUE_LABELS: Record<string, string> = {
  image_mostly_black: 'Mostly black',
  low_ocr_confidence: 'Low OCR',
  low_text_detected: 'Little text',
  over_cropped: 'Over-cropped',
  split_regions_suspect: 'Bad split regions',
  orientation_uncertain: 'Orientation uncertain',
  low_classification_confidence: 'Type uncertain',
};

export default function OcrStudioAnalyzePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toScreen } = useOcrStudioPaths();
  const { churchId, churchLabel } = useOcrStudioChurch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [previewItem, setPreviewItem] = useState<AnalyzeQueueItem | null>(null);
  const [previewVariant, setPreviewVariant] = useState<AnalyzePreviewVariant>('optimized');
  const [rotatingPreview, setRotatingPreview] = useState(false);
  const {
    sessionId,
    items,
    allItems,
    completedItems,
    analyzingCount,
    pendingQueueCount,
    selectedIds,
    selectedCount,
    allSelected,
    someSelected,
    isAnalyzing,
    isCommitting,
    restoringSession,
    analyzeProgress,
    previewVersion,
    dragActive,
    auditReport,
    auditLoading,
    issueFilter,
    setIssueFilter,
    setDragActive,
    analyzeFiles,
    updateItem,
    removeItem,
    rotateItem,
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
    analyzeFiles(e.dataTransfer.files);
  }, [analyzeFiles, setDragActive]);

  const goToMyUploads = useCallback(() => {
    const path = ocrStudioPathWithChurch(toScreen('upload-intake'), searchParams, churchId ?? undefined);
    const [base, qs = ''] = path.split('?');
    const merged = new URLSearchParams(qs);
    merged.set('tab', 'uploads');
    navigate(`${base}?${merged.toString()}`);
  }, [churchId, navigate, searchParams, toScreen]);

  const handleCommit = useCallback(async () => {
    if (!churchId || selectedCount === 0) return;
    try {
      const { jobIds, remainingCount } = await commitToUpload();
      toast.success(
        remainingCount > 0
          ? `Submitted ${jobIds.length} image(s) to OCR — ${remainingCount} still in analyze queue`
          : `Submitted ${jobIds.length} image(s) to OCR processing`,
      );
      if (jobIds.length > 0 && remainingCount === 0) {
        goToMyUploads();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Upload failed');
    }
  }, [churchId, commitToUpload, goToMyUploads, selectedCount]);

  const handleRotatePreview = useCallback(async (degrees: number) => {
    if (!previewItem) return;
    setRotatingPreview(true);
    try {
      const updated = await rotateItem(previewItem.id, degrees);
      setPreviewItem(updated);
      toast.success(`Rotated ${degrees}°`);
    } catch (err: any) {
      toast.error(err?.message || 'Rotate failed');
    } finally {
      setRotatingPreview(false);
    }
  }, [previewItem, rotateItem]);

  const needsReviewCount = allItems.filter((i) => i.needsReview && !i.analyzing && !i.error).length;
  const progressPct = analyzeProgress && analyzeProgress.total > 0
    ? Math.round((analyzeProgress.completed / analyzeProgress.total) * 100)
    : 0;

  return (
    <OcrSetupGate churchId={churchId}>
      <OcrStudioHubPanel churchLabel={churchId ? churchLabel : undefined}>
        <PageHeader
          title="Analyze Records"
          subtitle="Your analyze queue is the entry point for new records. Images stay here until you upload them to OCR or delete them."
        />

        <Alert severity="info" sx={{ mb: 2 }}>
          Records persist across visits for this parish. Drop images or choose a folder — subfolders are scanned automatically. When analysis finishes, the audit panel summarizes issues and suggests system improvements.
        </Alert>

        <Paper
          variant="outlined"
          onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          sx={{
            p: 4,
            mb: 1.5,
            textAlign: 'center',
            borderStyle: 'dashed',
            borderWidth: 2,
            borderColor: dragActive ? 'primary.main' : 'divider',
            bgcolor: dragActive ? 'action.hover' : 'transparent',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ANALYZE_ACCEPTED_TYPES}
            multiple
            hidden
            onChange={(e) => {
              analyzeFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <input
            ref={folderInputRef}
            type="file"
            accept={ANALYZE_ACCEPTED_TYPES}
            multiple
            hidden
            {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
            onChange={(e) => {
              analyzeFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <IconCloudUpload size={40} style={{ opacity: 0.45 }} />
          <Typography variant="body1" fontWeight={600} sx={{ mt: 1 }}>
            Drop mixed register images here
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isAnalyzing
              ? 'Add more images anytime — analysis continues in the background'
              : 'Baptism, marriage, and funeral pages together · results appear as each file finishes'}
          </Typography>
        </Paper>

        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<IconCloudUpload size={16} />}
            onClick={() => fileInputRef.current?.click()}
            sx={{ textTransform: 'none' }}
          >
            Choose images
          </Button>
          <Button
            variant="outlined"
            startIcon={<IconFolder size={16} />}
            onClick={() => folderInputRef.current?.click()}
            sx={{ textTransform: 'none' }}
          >
            Choose folder
          </Button>
        </Stack>

        {restoringSession && (
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">Restoring saved analyze queue…</Typography>
          </Box>
        )}

        {isAnalyzing && analyzeProgress && (
          <Box sx={{ mb: 3 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {analyzeProgress.completed} of {analyzeProgress.total} complete
                {pendingQueueCount > 0 ? ` · ${pendingQueueCount} queued` : ''}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {progressPct}%
              </Typography>
            </Stack>
            <LinearProgress variant="determinate" value={progressPct} sx={{ height: 8, borderRadius: 1 }} />
          </Box>
        )}

        {(allItems.length > 0 || auditReport) && !isAnalyzing && (
          <AnalyzeAuditPanel
            report={auditReport}
            loading={auditLoading}
            activeIssueFilter={issueFilter}
            onIssueFilter={setIssueFilter}
          />
        )}

        {issueFilter && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Showing {items.length} of {allItems.length} images with issue: {QUALITY_ISSUE_LABELS[issueFilter] || issueFilter}
          </Alert>
        )}

        {allItems.length > 0 && (
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip icon={<IconScan size={14} />} label={`${completedItems.length} analyzed`} size="small" />
            {analyzingCount > 0 && (
              <Chip label={`${analyzingCount} analyzing`} size="small" color="info" variant="outlined" />
            )}
            {pendingQueueCount > 0 && (
              <Chip label={`${pendingQueueCount} queued`} size="small" color="default" variant="outlined" />
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

        {allItems.length > 0 && (
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
                      {churchId && sessionId && !item.analyzing && !item.error ? (
                        <AnalyzePreviewThumb
                          churchId={churchId}
                          sessionId={sessionId}
                          fileId={item.id}
                          alt={item.originalFilename}
                          size={56}
                          cacheBust={previewVersion}
                          onClick={() => {
                            setPreviewVariant('optimized');
                            setPreviewItem(item);
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
                        {item.qualityScore != null && (
                          <Chip
                            size="small"
                            label={`QA ${confidencePct(item.qualityScore)}`}
                            color={item.qualityScore >= 0.55 ? 'success' : 'warning'}
                            variant="outlined"
                            sx={{ fontSize: '0.65rem', height: 20 }}
                          />
                        )}
                      </Stack>
                      )}
                      {item.qualityIssues && item.qualityIssues.length > 0 && !item.analyzing && (
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                          {item.qualityIssues.map((issue) => (
                            <Chip
                              key={issue}
                              size="small"
                              label={QUALITY_ISSUE_LABELS[issue] || issue}
                              color="warning"
                              variant="outlined"
                              sx={{ fontSize: '0.6rem', height: 18 }}
                            />
                          ))}
                          {item.autoFixesApplied && item.autoFixesApplied.length > 0 && (
                            <Tooltip title={`Auto-fixes: ${item.autoFixesApplied.join(', ')}`}>
                              <Chip
                                size="small"
                                label="Auto-fixed"
                                color="info"
                                variant="outlined"
                                sx={{ fontSize: '0.6rem', height: 18 }}
                              />
                            </Tooltip>
                          )}
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
                      {item.shouldSplit && (
                        <Button
                          size="small"
                          variant={item.splitRegions ? 'contained' : 'outlined'}
                          onClick={() => updateItem(item.id, { splitRegions: !item.splitRegions })}
                          sx={{ textTransform: 'none', fontSize: '0.7rem', mt: 0.5, display: 'block' }}
                        >
                          {item.splitRegions ? 'Will split into separate jobs' : 'Split into separate jobs'}
                        </Button>
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
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => { void removeItem(item.id); }} aria-label="Remove">
                        <IconTrash size={16} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}

        {allItems.length > 0 && (
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
                : selectedCount === allItems.length
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

        {allItems.length === 0 && !isAnalyzing && (
          <Alert severity="info" sx={{ mt: 1 }}>
            Analysis uses local image optimization and Tesseract OCR — no cloud Vision calls until you upload.
            Review suggestions for any file marked as needing attention before submitting.
          </Alert>
        )}

        <Dialog
          open={!!previewItem && !!churchId && !!sessionId}
          onClose={() => setPreviewItem(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1, gap: 1 }}>
            <Typography variant="subtitle1" fontWeight={600} noWrap sx={{ flex: 1 }}>
              {previewItem?.originalFilename}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <ToggleButtonGroup
                size="small"
                exclusive
                value={previewVariant}
                onChange={(_, value: AnalyzePreviewVariant | null) => {
                  if (value) setPreviewVariant(value);
                }}
              >
                <ToggleButton value="optimized" sx={{ textTransform: 'none', px: 1.5 }}>
                  Optimized
                </ToggleButton>
                <ToggleButton value="original" sx={{ textTransform: 'none', px: 1.5 }}>
                  Original
                </ToggleButton>
              </ToggleButtonGroup>
              <Tooltip title="Rotate left 90°">
                <span>
                  <IconButton
                    size="small"
                    disabled={rotatingPreview || previewVariant === 'original'}
                    onClick={() => { void handleRotatePreview(270); }}
                  >
                    <IconRotate size={18} />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Rotate right 90°">
                <span>
                  <IconButton
                    size="small"
                    disabled={rotatingPreview || previewVariant === 'original'}
                    onClick={() => { void handleRotatePreview(90); }}
                  >
                    <IconRotateClockwise size={18} />
                  </IconButton>
                </span>
              </Tooltip>
              <IconButton size="small" onClick={() => setPreviewItem(null)} aria-label="Close preview">
                <IconX size={18} />
              </IconButton>
            </Stack>
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', justifyContent: 'center', pb: 3, minHeight: 320 }}>
            {previewItem && churchId && sessionId && (
              <AnalyzePreviewThumb
                key={`${previewItem.id}-${previewVariant}-${previewVersion}`}
                churchId={churchId}
                sessionId={sessionId}
                fileId={previewItem.id}
                alt={previewItem.originalFilename}
                variant={previewVariant}
                cacheBust={previewVersion}
                size="fill"
              />
            )}
            {rotatingPreview && (
              <CircularProgress sx={{ position: 'absolute' }} />
            )}
          </DialogContent>
        </Dialog>
      </OcrStudioHubPanel>
    </OcrSetupGate>
  );
}
