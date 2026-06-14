/**
 * OcrReviewPage — Agent confirm & seed flow (replaces Workbench).
 * Routes: /devel/ocr-studio/review/:churchId
 *         /devel/ocr-studio/review/:churchId/:jobId
 *         /portal/ocr/review/:churchId/:jobId
 */

import { useAuth } from '@/context/AuthContext';
import {
  fetchChurchRecordFields,
  getReviewFieldsForType,
} from '@/features/devel-tools/om-ocr/utils/fieldConfig';
import {
  normalizeExtractRecords,
  recordDisplayName,
} from '@/features/devel-tools/om-ocr/config/recordFields';
import type { ChurchRecordFieldConfig } from '@/features/devel-tools/om-ocr/config/recordFields';
import FusionOverlay from '@/features/devel-tools/om-ocr/components/FusionOverlay';
import {
  getJobPipelineState,
  getUploadQueueItemState,
  needsJobPolling,
  shouldShowJobProgress,
  OcrReviewDropZone,
  OcrReviewInlineProgress,
  type ReviewUploadQueueItem,
} from '@/features/devel-tools/om-ocr/components/OcrReviewUploadWidgets';
import {
  adjustHighlightBoxesForCrop,
  cellBboxToVision,
  columnBoundaryEdges,
  computeCellTokens,
  computeFieldRegions,
  computeReviewCropBbox,
  cropVisionPageSize,
  fieldRegionsToBoxes,
  moveColumnBoundary,
  REVIEW_FIELD_COLORS,
  type ColumnBands,
} from '@/features/devel-tools/om-ocr/utils/recordHighlightBoxes';
import { apiClient } from '@/shared/lib/axiosInstance';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  FormControl,
  IconButton,
  InputLabel,
  InputAdornment,
  List,
  ListItem,
  MenuItem,
  Select,
  ListItemButton,
  ListItemText,
  Paper,
  Slider,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  IconArrowLeft,
  IconCheck,
  IconCloudUpload,
  IconChevronDown,
  IconChevronUp,
  IconColumns,
  IconDatabase,
  IconGripVertical,
  IconHandFinger,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconMaximize,
  IconRefresh,
  IconRestore,
  IconZoomIn,
  IconZoomOut,
  IconTrash,
  IconPhoto,
  IconAlertCircle,
  IconAlertTriangle,
  IconInfoCircle,
  IconX,
  IconRotateClockwise,
  IconRotate,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ocrStudioPathWithChurch,
  readOcrStudioChurchId,
  setOcrStudioChurchParam,
} from '@/features/devel-tools/om-ocr/utils/ocrStudioChurch';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';

function formatExtractMethod(method: string | null): string {
  if (!method) return 'Unknown';
  if (method === 'assembler') return 'Table assembly';
  if (method === 'llm_vision') return 'AI vision';
  if (method === 'llm') return 'AI agent';
  if (method === 'llamaparse_llm') return 'LlamaParse + AI';
  if (method === 'llamaparse') return 'LlamaParse';
  return 'Heuristic';
}

function recordsFromExtract(extract: any): Array<Record<string, string>> {
  if (Array.isArray(extract?.records) && extract.records.length) return extract.records;
  if (extract?.fields) return [extract.fields];
  return [];
}

const AGENT_EXTRACT_TIMEOUT_MS = 180_000;
const AGENT2_POLL_MS = 3_000;
const AGENT2_POLL_MAX = 40;

function isTimeoutError(err: any): boolean {
  return err?.code === 'ECONNABORTED'
    || err?.originalError?.code === 'ECONNABORTED'
    || err?.status === 408
    || /timeout/i.test(err?.message || '');
}

function mapVisualToOrig(x: number, y: number, w: number, h: number, rot: number) {
  const normRot = (rot % 360 + 360) % 360;
  if (normRot === 90) {
    return {
      x: y,
      y: 1 - (x + w),
      width: h,
      height: w
    };
  } else if (normRot === 180) {
    return {
      x: 1 - (x + w),
      y: 1 - (y + h),
      width: w,
      height: h
    };
  } else if (normRot === 270) {
    return {
      x: 1 - (y + h),
      y: x,
      width: h,
      height: w
    };
  }
  return { x, y, width: w, height: h };
}

function mapOrigToVisual(x: number, y: number, w: number, h: number, rot: number) {
  const normRot = (rot % 360 + 360) % 360;
  if (normRot === 90) {
    return {
      x: 1 - (y + h),
      y: x,
      width: h,
      height: w
    };
  } else if (normRot === 180) {
    return {
      x: 1 - (x + w),
      y: 1 - (y + h),
      width: w,
      height: h
    };
  } else if (normRot === 270) {
    return {
      x: y,
      y: 1 - (x + w),
      width: h,
      height: w
    };
  }
  return { x, y, width: w, height: h };
}

type PipelineStatus =
  | 'uploaded' | 'ocr_complete' | 'agent_extracted' | 'ready_to_seed' | 'seeded' | 'returned' | string;

interface OcrJobRow {
  id: string;
  filename: string;
  status: string;
  review_status: PipelineStatus;
  record_type: string | null;
  agent_status: string | null;
  ready_to_seed: boolean;
  seeded_at: string | null;
  has_ocr_text: boolean;
  created_at: string;
  records_count?: number | null;
  confirmed_count?: number | null;
}

const STATUS_LABELS: Record<string, { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'info' }> = {
  uploaded: { label: 'Uploaded', color: 'default' },
  ocr_complete: { label: 'OCR Done', color: 'info' },
  agent_extracted: { label: 'Review Fields', color: 'warning' },
  ready_to_seed: { label: 'Ready to Seed', color: 'primary' },
  seeded: { label: 'In Records DB', color: 'success' },
  returned: { label: 'Returned', color: 'default' },
};

const REVIEW_ACCEPTED_RE = /\.(jpe?g|png|tiff?)$/i;
const REVIEW_ACCEPTED_TYPES = '.jpg,.jpeg,.png,.tif,.tiff';

let _reviewUploadUid = 0;
const reviewUploadUid = () => `oru_${++_reviewUploadUid}_${Date.now()}`;

const normalizeReviewOcrLanguage = (raw?: string | null): string => {
  if (!raw) return 'en';
  const code = raw.toLowerCase().trim();
  if (code.length === 2) return code;
  const map: Record<string, string> = { eng: 'en', gre: 'el', ell: 'el', rus: 'ru', ara: 'ar', ron: 'ro' };
  return map[code] || code.slice(0, 2);
};

function cleanDateString(s: string): string {
  if (!s) return '';
  let clean = s.trim();
  // Clean trailing digit from 3-digit year (e.g. 11-16-702 -> 11-16-70)
  clean = clean.replace(/\b(\d{1,2})([\/\.\-\s]+)(\d{1,2})([\/\.\-\s]+)(\d{2})(\d)\b/g, '$1$2$3$4$5');
  // Clean trailing digit from 5-digit year (e.g. 11-16-19702 -> 11-16-1970)
  clean = clean.replace(/\b(\d{1,2})([\/\.\-\s]+)(\d{1,2})([\/\.\-\s]+)(\d{4})(\d+)\b/g, '$1$2$3$4$5');
  return clean;
}

function parseLedgerDateValue(s: string): number | null {
  const str = (s || '').trim();
  const m = str.match(/^(\d{1,2})[\/\.\-\s]+(\d{1,2})[\/\.\-\s]+(\d{2,4})$/);
  if (!m) {
    const yearMatch = str.match(/^(\d{4})$/);
    if (yearMatch) {
      return new Date(parseInt(yearMatch[1], 10), 0, 1).getTime();
    }
    return null;
  }
  let y = parseInt(m[3], 10);
  if (y < 100) y += 1900;
  return new Date(y, parseInt(m[1], 10) - 1, parseInt(m[2], 10)).getTime();
}

function normalizeBaptismDates(fields: Record<string, string>): void {
  let dob = fields.date_of_birth?.trim();
  let bapt = fields.date_of_baptism?.trim();

  if (dob) {
    dob = cleanDateString(dob);
    fields.date_of_birth = dob;
  }
  if (bapt) {
    bapt = cleanDateString(bapt);
    fields.date_of_baptism = bapt;
  }

  if (!dob || !bapt) return;

  const tBirth = parseLedgerDateValue(dob);
  const tBapt = parseLedgerDateValue(bapt);

  if (tBirth && tBapt) {
    const isBaptYearOnly = /^\d{4}$/.test(bapt);
    const isBirthYearOnly = /^\d{4}$/.test(dob);

    const getYear = (str: string, ts: number) => {
      if (/^\d{4}$/.test(str)) return parseInt(str, 10);
      const parsed = str.match(/\d{2,4}$/);
      if (parsed) {
        let y = parseInt(parsed[0], 10);
        if (y < 100) y += 1900;
        return y;
      }
      return new Date(ts).getFullYear();
    };

    const birthYear = getYear(dob, tBirth);
    const baptYear = getYear(bapt, tBapt);

    if (isBaptYearOnly && !isBirthYearOnly) {
      if (birthYear > baptYear) {
        fields.date_of_birth = bapt;
        fields.date_of_baptism = dob;
      }
    } else if (!isBaptYearOnly && isBirthYearOnly) {
      if (birthYear > baptYear) {
        fields.date_of_birth = bapt;
        fields.date_of_baptism = dob;
      }
    } else if (isBaptYearOnly && isBirthYearOnly) {
      if (birthYear > baptYear) {
        fields.date_of_birth = bapt;
        fields.date_of_baptism = dob;
      }
    } else {
      if (tBirth > tBapt) {
        fields.date_of_birth = bapt;
        fields.date_of_baptism = dob;
      } else if (tBirth === tBapt) {
        const d = new Date(tBapt);
        d.setDate(d.getDate() + 1);
        const separator = bapt.includes('/') ? '/' : (bapt.includes('.') ? '.' : '-');
        fields.date_of_baptism = `${d.getMonth() + 1}${separator}${d.getDate()}${separator}${d.getFullYear()}`;
      }
    }
  }
}
function debounce<T extends (...args: any[]) => void>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

function JobListThumb({ churchId, jobId }: { churchId: number; jobId: number }) {
  const [failed, setFailed] = useState(false);
  const thumbSx = {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: 1,
    bgcolor: 'action.hover',
    border: '1px solid',
    borderColor: 'divider',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  } as const;

  if (failed) {
    return (
      <Box sx={{ ...thumbSx, color: 'text.disabled' }}>
        <IconPhoto size={20} />
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={`/api/church/${churchId}/ocr/jobs/${jobId}/image`}
      alt=""
      onError={() => setFailed(true)}
      sx={{ ...thumbSx, objectFit: 'cover' }}
    />
  );
}

const OcrReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isPortal = location.pathname.startsWith('/portal');
  const { churchId: churchIdParam, jobId: jobIdParam } = useParams<{ churchId: string; jobId: string }>();
  const { user } = useAuth();

  const churchId = useMemo(() => {
    if (churchIdParam) return Number(churchIdParam);
    return user?.church_id ? Number(user.church_id) : null;
  }, [churchIdParam, user?.church_id]);

  // Review routes use :churchId in the path; sync ?church= so Upload and OCR Studio nav keep selection.
  useEffect(() => {
    if (!churchId || isPortal) return;
    const urlChurch = readOcrStudioChurchId(searchParams);
    if (urlChurch === churchId) return;
    setOcrStudioChurchParam(setSearchParams, churchId);
  }, [churchId, isPortal, searchParams, setSearchParams]);

  const selectedJobId = jobIdParam ? Number(jobIdParam) : null;

  const [jobs, setJobs] = useState<OcrJobRow[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [extractLoading, setExtractLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [rulesData, setRulesData] = useState<{
    has_blockers: boolean;
    has_warnings: boolean;
    outcomes: Array<{ record_index: number; outcomes: any[] }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordType, setRecordType] = useState<string>('baptism');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [ocrPreview, setOcrPreview] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<PipelineStatus>('uploaded');
  const [extractMethod, setExtractMethod] = useState<string | null>(null);
  const [allRecords, setAllRecords] = useState<Array<Record<string, string>>>([]);
  const [agent1Snapshot, setAgent1Snapshot] = useState<Array<Record<string, string>>>([]);
  const [agent2Records, setAgent2Records] = useState<Array<Record<string, string>>>([]);
  const [agent2Method, setAgent2Method] = useState<string | null>(null);
  const [agent2Notes, setAgent2Notes] = useState<string | null>(null);
  const [agent2Status, setAgent2Status] = useState<string | null>(null);
  const [agent2Available, setAgent2Available] = useState(false);
  const [llamaparsePreview, setLlamaparsePreview] = useState<string | null>(null);
  const [selectedRecordIndex, setSelectedRecordIndex] = useState(0);
  const [needsReviewFlag, setNeedsReviewFlag] = useState(false);
  const [refinementNotes, setRefinementNotes] = useState<string | null>(null);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [tableExtractionJson, setTableExtractionJson] = useState<any>(null);
  const [recordCandidates, setRecordCandidates] = useState<any>(null);
  const [scoringV2, setScoringV2] = useState<any>(null);
  const [artifactsLoading, setArtifactsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState(100);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });
  const [imageReady, setImageReady] = useState(false);
  const [churchFieldConfig, setChurchFieldConfig] = useState<ChurchRecordFieldConfig | null>(null);
  const [showDetailedInfo, setShowDetailedInfo] = useState(false);
  const [useFullPageImage, setUseFullPageImage] = useState(false);
  const [columnBandsOverride, setColumnBandsOverride] = useState<ColumnBands | null>(null);
  const [confirmedIndexes, setConfirmedIndexes] = useState<Set<number>>(new Set());
  const [showColumnGuides, setShowColumnGuides] = useState(true);
  const [layoutClassification, setLayoutClassification] = useState<any>(null);
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [mapHint, setMapHint] = useState<string | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [drawingBox, setDrawingBox] = useState({ x0: 0, y0: 0, x1: 0, y1: 0, active: false });
  const [recordBox, setRecordBox] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [confirmLayoutDialogOpen, setConfirmLayoutDialogOpen] = useState(false);
  const [saveLayoutLoading, setSaveLayoutLoading] = useState(false);
  const [rotation, setRotation] = useState<number>(0);
  const [jobsCollapsed, setJobsCollapsed] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<ReviewUploadQueueItem[]>([]);
  const [uploadDragActive, setUploadDragActive] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [ocrLanguage, setOcrLanguage] = useState('en');
  const [uploadRecordType, setUploadRecordType] = useState('custom');
  const [uploadRecordLayoutMode, setUploadRecordLayoutMode] = useState('auto');
  const [imagePanelWidth, setImagePanelWidth] = useState(680);
  const uploadFileInputRef = useRef<HTMLInputElement>(null);
  const uploadPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevSelectedReviewStatusRef = useRef<string | null>(null);
  const contentRowRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const zoomAnchorRef = useRef<{ fx: number; fy: number; vx: number; vy: number } | null>(null);
  const panRef = useRef<{ active: boolean; startX: number; startY: number; left: number; top: number; moved: boolean }>(
    { active: false, startX: 0, startY: 0, left: 0, top: 0, moved: false },
  );
  const dragBoundaryRef = useRef<{ leftKey: string; rightKey: string } | null>(null);

  const mapMode = focusedField !== null;

  const backPath = isPortal ? '/portal/ocr/upload' : '/devel/ocr-studio/upload';
  const uploadPath = useMemo(
    () => (isPortal ? backPath : ocrStudioPathWithChurch(backPath, searchParams, churchId)),
    [isPortal, backPath, searchParams, churchId],
  );
  const reviewBase = churchId
    ? (isPortal ? `/portal/ocr/review/${churchId}` : `/devel/ocr-studio/review/${churchId}`)
    : backPath;

  const fieldDefs = useMemo(
    () => getReviewFieldsForType(recordType, churchFieldConfig),
    [recordType, churchFieldConfig],
  );

  const selectedJob = useMemo(
    () => jobs.find((j) => Number(j.id) === selectedJobId) ?? null,
    [jobs, selectedJobId]
  );

  const currentRecordOutcomes = useMemo(() => {
    if (!rulesData?.outcomes) return [];
    const recordObj = rulesData.outcomes.find(o => o.record_index === selectedRecordIndex);
    return recordObj?.outcomes || [];
  }, [rulesData, selectedRecordIndex]);

  const ruleCounts = useMemo(() => {
    let suggestions = 0;
    let warnings = 0;
    let blockers = 0;
    
    currentRecordOutcomes.forEach((o: any) => {
      if (o.reviewer_decision !== 'pending') return;
      if (o.severity === 'blocker') blockers++;
      else if (o.severity === 'warning' || o.severity === 'error') warnings++;
      else suggestions++;
    });

    return { suggestions, warnings, blockers };
  }, [currentRecordOutcomes]);

  const triggerRevalidation = useCallback(
    debounce(async (updatedFields: Record<string, string>) => {
      if (!churchId || !selectedJobId) return;
      try {
        const res = await apiClient.post(`/api/church/${churchId}/ocr/rules/revalidate-record`, {
          job_id: selectedJobId,
          record_index: selectedRecordIndex,
          fields: updatedFields
        });
        const evalResult = res.data ?? res;
        
        setRulesData((prev: any) => {
          if (!prev) return { has_blockers: evalResult.has_blockers, has_warnings: evalResult.has_warnings, outcomes: [{ record_index: selectedRecordIndex, outcomes: evalResult.outcomes }] };
          
          const nextOutcomes = prev.outcomes.filter((o: any) => o.record_index !== selectedRecordIndex);
          nextOutcomes.push({ record_index: selectedRecordIndex, outcomes: evalResult.outcomes });
          
          const allOutcomes = nextOutcomes.flatMap((o: any) => o.outcomes);
          const hasBlockers = allOutcomes.some((o: any) => o.severity === 'blocker' && o.reviewer_decision === 'pending');
          const hasWarnings = allOutcomes.some((o: any) => (o.severity === 'warning' || o.severity === 'error') && o.reviewer_decision === 'pending');

          return {
            has_blockers: hasBlockers,
            has_warnings: hasWarnings,
            outcomes: nextOutcomes
          };
        });
      } catch (err) {
        console.error("Revalidation failed:", err);
      }
    }, 600),
    [churchId, selectedJobId, selectedRecordIndex]
  );

  const handleFieldChange = (fieldName: string, value: string) => {
    const nextFields = { ...fields, [fieldName]: value };
    setFields(nextFields);
    
    const nextRecords = [...allRecords];
    if (nextRecords[selectedRecordIndex]) {
      nextRecords[selectedRecordIndex] = nextFields;
    }
    setAllRecords(nextRecords);

    triggerRevalidation(nextFields);
  };

  // The agent's record array order does not always line up with the table
  // candidates (truncation, single confirmed record, LLM reordering). Resolve
  // the candidate (image row) that actually matches the displayed record so the
  // snippet/highlights track the fields, not just the array position.
  const candidateIndex = useMemo(() => {
    const cands = recordCandidates?.candidates;
    if (!Array.isArray(cands) || !cands.length) return selectedRecordIndex;
    const rec = allRecords[selectedRecordIndex] || fields || {};

    const rn = (rec.record_number || '').toString().trim();
    if (rn) {
      const byNum = cands.findIndex(
        (c: any) => ((c?.fields?.record_number ?? '').toString().trim()) === rn,
      );
      if (byNum >= 0) return byNum;
    }

    const nameKeys = ['child_first_name', 'child_last_name', 'child_name', 'groom_first_name', 'groom_last_name', 'groom_name', 'deceased_first_name', 'deceased_last_name', 'deceased_name', 'bride_first_name', 'bride_last_name', 'bride_name'];
    const recName = recordDisplayName(recordType, rec) || nameKeys.map((k) => rec[k]).find(Boolean);
    if (recName) {
      const tokens = recName.toUpperCase().split(/\s+/).filter((t: string) => t.length > 2);
      let best = -1;
      let bestScore = 0;
      cands.forEach((c: any, i: number) => {
        const cn = nameKeys.map((k) => c?.fields?.[k]).filter(Boolean).join(' ').toUpperCase();
        if (!cn) return;
        let s = 0;
        tokens.forEach((t: string) => { if (cn.includes(t)) s += 1; });
        if (s > bestScore) { bestScore = s; best = i; }
      });
      if (best >= 0 && bestScore > 0) return best;
    }

    return Math.min(selectedRecordIndex, cands.length - 1);
  }, [recordCandidates, allRecords, selectedRecordIndex, fields, recordType]);

  const reviewCropBbox = useMemo(
    () => computeReviewCropBbox(tableExtractionJson, recordCandidates, candidateIndex),
    [tableExtractionJson, recordCandidates, candidateIndex],
  );

  const useRecordSnippet = !!reviewCropBbox && !useFullPageImage;

  // Full-page view shows the ORIGINAL uploaded scan (before record splitting).
  const fullPageImageUrl = useMemo(() => {
    if (!churchId || !selectedJobId) return null;
    return `/api/church/${churchId}/ocr/jobs/${selectedJobId}/image?original=true`;
  }, [churchId, selectedJobId]);

  const jobImageUrl = useMemo(() => {
    if (!churchId || !selectedJobId) return null;
    if (useRecordSnippet) {
      return `/api/church/${churchId}/ocr/jobs/${selectedJobId}/record-crop/${candidateIndex}?mode=review`;
    }
    return fullPageImageUrl;
  }, [churchId, selectedJobId, candidateIndex, useRecordSnippet, fullPageImageUrl]);

  const loadJobArtifacts = useCallback(async (jobId: number) => {
    if (!churchId) return;
    setArtifactsLoading(true);
    try {
      const res: any = await apiClient.get(`/api/church/${churchId}/ocr/jobs/${jobId}`);
      const data = res?.data ?? res;
      const page = data?.pages?.[0];
      setTableExtractionJson(page?.tableExtractionJson ?? null);
      setRecordCandidates(page?.recordCandidates ?? null);
      setScoringV2(page?.scoringV2 ?? null);
      setLayoutClassification(data?.layout_classification_json ?? null);
      setRotation(page?.rotation || 0);
    } catch {
      setTableExtractionJson(null);
      setRecordCandidates(null);
      setScoringV2(null);
      setLayoutClassification(null);
      setRotation(0);
    } finally {
      setArtifactsLoading(false);
    }
  }, [churchId]);

  const effectiveBands: ColumnBands | null = useMemo(
    () => columnBandsOverride || tableExtractionJson?.column_bands || null,
    [columnBandsOverride, tableExtractionJson],
  );

  const activeCropBbox = useRecordSnippet ? reviewCropBbox : null;

  const fieldHighlightBoxes = useMemo(() => {
    if (!tableExtractionJson || !recordCandidates) return [];
    const pageDims = tableExtractionJson.page_dimensions;
    if (!pageDims?.width || !pageDims?.height) return [];
    const regions = computeFieldRegions({
      tableExtractionJson,
      recordCandidates,
      selectedRecordIndex: candidateIndex,
      fieldKeys: fieldDefs.map((d) => d.name),
      columnBands: effectiveBands,
    });
    return fieldRegionsToBoxes(regions, pageDims, focusedField, activeCropBbox);
  }, [tableExtractionJson, recordCandidates, candidateIndex, focusedField, fieldDefs, effectiveBands, activeCropBbox]);

  // Clickable per-cell tokens (only meaningful while a field is focused = map mode)
  const cellTokenOverlays = useMemo(() => {
    if (!mapMode || !tableExtractionJson?.page_dimensions) return [];
    const pageDims = tableExtractionJson.page_dimensions;
    const tokens = computeCellTokens({ tableExtractionJson, recordCandidates, selectedRecordIndex: candidateIndex });
    let boxes = tokens.map((t) => ({
      bbox: cellBboxToVision(t.frac, pageDims),
      color: '#1976d2',
      label: t.text,
    }));
    if (activeCropBbox) boxes = adjustHighlightBoxesForCrop(boxes, pageDims, activeCropBbox);
    return boxes.map((b, i) => ({ id: `tok-${i}`, text: b.label as string, bbox: b.bbox }));
  }, [mapMode, tableExtractionJson, recordCandidates, candidateIndex, activeCropBbox]);

  // Column guides live on the snippet (preprocessed crop). Band edges are
  // full-page fractions, so convert them into snippet-relative x.
  const columnEdges = useMemo(() => {
    if (!useRecordSnippet) return [] as Array<{ x: number; sx: number; leftKey: string; rightKey: string }>;
    const edges = columnBoundaryEdges(effectiveBands);
    if (!reviewCropBbox) return edges.map((e) => ({ ...e, sx: e.x }));
    const cx0 = reviewCropBbox[0];
    const span = reviewCropBbox[2] - reviewCropBbox[0];
    if (span <= 0) return [];
    return edges
      .map((e) => ({ ...e, sx: (e.x - cx0) / span }))
      .filter((e) => e.sx > 0.01 && e.sx < 0.99);
  }, [effectiveBands, useRecordSnippet, reviewCropBbox]);

  const visionPageSize = useMemo(() => {
    const pageDims = tableExtractionJson?.page_dimensions;
    if (useRecordSnippet && reviewCropBbox && pageDims?.width && pageDims?.height) {
      return cropVisionPageSize(pageDims, reviewCropBbox);
    }
    return {
      width: pageDims?.width || imageDimensions.naturalWidth || 0,
      height: pageDims?.height || imageDimensions.naturalHeight || 0,
    };
  }, [tableExtractionJson, imageDimensions, useRecordSnippet, reviewCropBbox]);

  const hydrateExtractResponse = (data: any) => {
    setReviewStatus(data.review_status || 'uploaded');
    setOcrPreview(data.ocr_text_preview || null);
    setAgent2Status(data.agent2_status || null);
    setLlamaparsePreview(data.llamaparse_preview || null);

    const extract = data.extract;
    const agent2 = data.agent2_extract;
    const rt = extract?.record_type || agent2?.record_type || 'baptism';
    if (rt && rt !== 'custom') setRecordType(rt);

      const records = recordsFromExtract(extract);
      const a2records = recordsFromExtract(agent2);
      const idx = typeof extract?.candidate_index === 'number' ? extract.candidate_index : 0;
      const rtNorm = rt && rt !== 'custom' ? rt : 'baptism';

      const normalizedRecords = normalizeExtractRecords(rtNorm, records.map((r) => ({ ...r })));
      const normalizedA2 = normalizeExtractRecords(rtNorm, a2records.map((r) => ({ ...r })));

      setAgent1Snapshot(normalizedRecords.map((r) => ({ ...r })));
      setAgent2Records(normalizedA2.map((r) => ({ ...r })));
      const primaryRecords = normalizedA2.length > 0 ? normalizedA2 : normalizedRecords;
      setAllRecords(primaryRecords.map((r) => ({ ...r })));
      const primaryIdx = Math.min(idx, Math.max(primaryRecords.length - 1, 0));
      setSelectedRecordIndex(primaryIdx);
    setExtractMethod(extract?.method || null);
    setAgent2Method(agent2?.method || null);
    setNeedsReviewFlag(!!extract?.needs_review);
    setRefinementNotes(extract?.refinement_notes || null);
    setAgent2Notes(agent2?.refinement_notes || null);
      setFields({ ...(primaryRecords[primaryIdx] || extract?.fields || {}) });
    setAgent2Available(!!agent2 || !!data.llamaparse_available);
    setConfirmedIndexes(new Set<number>(Array.isArray(extract?.confirmed_indexes) ? extract.confirmed_indexes : []));
    if (extract?.rules) {
      setRulesData(extract.rules);
    } else if (data?.rules) {
      setRulesData(data.rules);
    } else {
      setRulesData(null);
    }
  };

  const loadJobs = useCallback(async () => {
    if (!churchId) return;
    setJobsLoading(true);
    try {
      const res: any = await apiClient.get(`/api/church/${churchId}/ocr/jobs?limit=100`);
      const list: OcrJobRow[] = res?.data?.jobs || res?.jobs || [];
      setJobs((prev) => {
        if (prev.length === list.length && prev.every((p, i) => {
          const n = list[i];
          return n
            && String(p.id) === String(n.id)
            && p.status === n.status
            && p.review_status === n.review_status;
        })) {
          return prev;
        }
        return list;
      });
    } catch {
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  }, [churchId]);

  const loadExtract = useCallback(async (jobId: number) => {
    if (!churchId) return;
    setExtractLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get(`/api/church/${churchId}/ocr/jobs/${jobId}/agent-extract`);
      const data = res?.data ?? res;
      hydrateExtractResponse(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load extraction');
      setFields({});
    } finally {
      setExtractLoading(false);
    }
  }, [churchId]);

  const refreshExtractSnapshot = useCallback(async (jobId: number) => {
    if (!churchId) return null;
    const res: any = await apiClient.get(`/api/church/${churchId}/ocr/jobs/${jobId}/agent-extract`);
    const data = res?.data ?? res;
    hydrateExtractResponse(data);
    return data;
  }, [churchId]);

  const pollUntilAgent2Ready = useCallback(async (jobId: number) => {
    for (let attempt = 0; attempt < AGENT2_POLL_MAX; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, AGENT2_POLL_MS));
      const data = await refreshExtractSnapshot(jobId);
      const status = data?.agent2_status;
      if (status === 'complete' || status === 'unavailable' || status === 'failed') return data;
    }
    setMapHint('Agent 2 is still running — refresh the page in a moment.');
    return null;
  }, [refreshExtractSnapshot]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  useEffect(() => {
    if (!churchId) return;
    let cancelled = false;
    (async () => {
      try {
        const res: any = await apiClient.get(`/api/church/${churchId}/ocr/settings`);
        const data = res?.data ?? res;
        if (cancelled) return;
        setOcrLanguage(normalizeReviewOcrLanguage(data?.defaultLanguage || data?.language));
        const savedType = data?.documentProcessing?.defaultRecordType;
        if (savedType) setUploadRecordType(savedType);
        setUploadRecordLayoutMode(data?.documentProcessing?.recordLayoutMode || 'auto');
      } catch {
        if (!cancelled) {
          setOcrLanguage('en');
          setUploadRecordType('custom');
          setUploadRecordLayoutMode('auto');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [churchId]);

  const handleReviewFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || !churchId) return;
    const newFiles: ReviewUploadQueueItem[] = Array.from(fileList)
      .filter((f) => REVIEW_ACCEPTED_RE.test(f.name))
      .map((f) => ({
        id: reviewUploadUid(),
        file: f,
        name: f.name,
        status: 'pending' as const,
        progress: 0,
      }));
    if (newFiles.length > 0) setUploadQueue((prev) => [...prev, ...newFiles]);
  }, [churchId]);

  const handleReviewDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleReviewDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadDragActive(false);
    handleReviewFiles(e.dataTransfer.files);
  }, [handleReviewFiles]);

  const uploadQueueRef = useRef(uploadQueue);
  uploadQueueRef.current = uploadQueue;

  const startReviewUpload = useCallback(async () => {
    if (!churchId) return;
    const pending = uploadQueueRef.current.filter((f) => f.status === 'pending');
    if (pending.length === 0) return;
    setIsUploadingFiles(true);
    for (const item of pending) {
      setUploadQueue((q) => q.map((f) => (f.id === item.id ? { ...f, status: 'uploading', progress: 0 } : f)));
      try {
        const formData = new FormData();
        formData.append('files', item.file);
        formData.append('churchId', churchId.toString());
        formData.append('recordType', uploadRecordType);
        formData.append('language', ocrLanguage);
        formData.append('recordLayoutMode', uploadRecordLayoutMode);
        const response: any = await apiClient.post('/api/ocr/jobs/upload', formData, { timeout: 120000 });
        const uploadedJobs = response?.jobs || response?.data?.jobs || [];
        const jobId = uploadedJobs.length > 0 ? String(uploadedJobs[0].id) : undefined;
        if (jobId) {
          setUploadQueue((q) => q.map((f) => (f.id === item.id ? { ...f, status: 'queued', progress: 100, jobId } : f)));
        } else {
          setUploadQueue((q) => q.map((f) => (f.id === item.id ? { ...f, status: 'error', progress: 100, error: 'Upload OK but no job created' } : f)));
        }
      } catch (err: any) {
        const body = err?.originalError?.response?.data ?? err?.response?.data;
        const serverMsg = body?.error || body?.message || err?.message || 'Upload failed';
        setUploadQueue((q) => q.map((f) => (f.id === item.id ? { ...f, status: 'error', error: serverMsg } : f)));
      }
    }
    setIsUploadingFiles(false);
    loadJobs();
  }, [churchId, uploadRecordType, ocrLanguage, loadJobs]);

  const pendingUploadCount = useMemo(
    () => uploadQueue.filter((f) => f.status === 'pending').length,
    [uploadQueue],
  );

  useEffect(() => {
    if (!churchId || isUploadingFiles || pendingUploadCount === 0) return;
    startReviewUpload();
  }, [churchId, isUploadingFiles, pendingUploadCount, startReviewUpload]);

  const inFlightJobs = useMemo(
    () => jobs.filter((j) => needsJobPolling(j)),
    [jobs],
  );

  const awaitingJobs = useMemo(
    () => jobs.filter((j) => j.review_status !== 'ready_to_seed' && j.review_status !== 'seeded'),
    [jobs],
  );

  const completedJobs = useMemo(
    () => jobs.filter((j) => j.review_status === 'ready_to_seed' || j.review_status === 'seeded'),
    [jobs],
  );

  const hasActiveUploadPoll = useMemo(
    () => uploadQueue.some(
      (f) => f.status === 'pending'
        || f.status === 'uploading'
        || (f.jobId && !['completed', 'failed', 'error'].includes(f.status)),
    ),
    [uploadQueue],
  );

  const shouldPollJobs = hasActiveUploadPoll || inFlightJobs.length > 0;

  const syncUploadQueueFromJobs = useCallback((list: OcrJobRow[]) => {
    setUploadQueue((prev) => {
      if (prev.length === 0) return prev;
      let changed = false;
      const statusMap = new Map(list.map((j) => [String(j.id), j]));
      const next = prev.map((f) => {
        if (!f.jobId) return f;
        const job = statusMap.get(f.jobId);
        if (!job) return f;
        let uiStatus = f.status;
        if (job.status === 'failed' || job.status === 'error') {
          uiStatus = 'failed';
        } else if (['agent_extracted', 'ready_to_seed', 'seeded'].includes(job.review_status)) {
          uiStatus = 'completed';
        } else if (job.status === 'processing') {
          uiStatus = 'processing';
        } else if (job.status === 'pending' || job.status === 'queued') {
          uiStatus = 'queued';
        } else if (job.status === 'completed' || job.status === 'complete') {
          uiStatus = job.review_status === 'uploaded' ? 'queued' : 'processing';
        }
        if (uiStatus === f.status) return f;
        changed = true;
        return {
          ...f,
          status: uiStatus,
          progress: uiStatus === 'completed' ? 100 : f.progress,
          error: uiStatus === 'failed' ? (job as any).error_message || 'Processing failed' : f.error,
        };
      });
      return changed ? next : prev;
    });
  }, []);

  useEffect(() => {
    if (!churchId || !shouldPollJobs) {
      if (uploadPollRef.current) {
        clearInterval(uploadPollRef.current);
        uploadPollRef.current = null;
      }
      return;
    }

    const pollJobStatus = async () => {
      try {
        const res: any = await apiClient.get(`/api/church/${churchId}/ocr/jobs?limit=100`);
        const list: OcrJobRow[] = res?.data?.jobs || res?.jobs || [];
        setJobs((prev) => {
          if (prev.length === list.length && prev.every((p, i) => {
            const n = list[i];
            return n
              && String(p.id) === String(n.id)
              && p.status === n.status
              && p.review_status === n.review_status;
          })) {
            return prev;
          }
          return list;
        });
        syncUploadQueueFromJobs(list);
      } catch { /* non-fatal */ }
    };

    pollJobStatus();
    uploadPollRef.current = setInterval(pollJobStatus, 10000);
    return () => {
      if (uploadPollRef.current) {
        clearInterval(uploadPollRef.current);
        uploadPollRef.current = null;
      }
    };
  }, [churchId, shouldPollJobs, syncUploadQueueFromJobs]);

  useEffect(() => {
    if (uploadQueue.length === 0) return;
    if (!uploadQueue.every((f) => f.status === 'completed')) return;
    const timer = setTimeout(() => {
      setUploadQueue((prev) => (prev.every((f) => f.status === 'completed') ? [] : prev));
    }, 2000);
    return () => clearTimeout(timer);
  }, [uploadQueue]);

  useEffect(() => {
    if (!selectedJobId) return;
    setUploadQueue((prev) => {
      const next = prev.filter((f) => f.status !== 'completed');
      return next.length === prev.length ? prev : next;
    });
  }, [selectedJobId]);

  const pendingUploadRows = useMemo(
    () => uploadQueue.filter((f) => f.status === 'pending' || f.status === 'uploading'),
    [uploadQueue],
  );

  const awaitingJobIds = useMemo(
    () => new Set(awaitingJobs.map((j) => String(j.id))),
    [awaitingJobs],
  );

  const queueOnlyRows = useMemo(
    () => uploadQueue.filter(
      (f) => f.jobId
        && !awaitingJobIds.has(f.jobId)
        && !['completed', 'failed', 'error', 'pending', 'uploading'].includes(f.status),
    ),
    [uploadQueue, awaitingJobIds],
  );

  useEffect(() => {
    const awaitingIds = new Set(awaitingJobs.map((j) => Number(j.id)));
    setSelectedAwaitingJobIds((prev) => {
      const next = new Set([...prev].filter((id) => awaitingIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [awaitingJobs]);

  useEffect(() => {
    if (!churchId) {
      setChurchFieldConfig(null);
      return;
    }
    fetchChurchRecordFields(churchId)
      .then(setChurchFieldConfig)
      .catch(() => setChurchFieldConfig(null));
  }, [churchId]);

  useEffect(() => {
    if (churchId && selectedJobId) loadExtract(selectedJobId);
  }, [churchId, selectedJobId, loadExtract]);

  useEffect(() => {
    if (selectedJobId) setJobsCollapsed(true);
  }, [selectedJobId]);

  const selectedJobReviewStatus = selectedJob?.review_status;
  useEffect(() => {
    prevSelectedReviewStatusRef.current = null;
  }, [selectedJobId]);

  useEffect(() => {
    if (!churchId || !selectedJobId || !selectedJobReviewStatus) return;
    const prev = prevSelectedReviewStatusRef.current;
    if (prev === selectedJobReviewStatus) return;
    prevSelectedReviewStatusRef.current = selectedJobReviewStatus;
    if (prev !== null && ['ocr_complete', 'agent_extracted', 'ready_to_seed'].includes(selectedJobReviewStatus)) {
      loadExtract(selectedJobId);
    }
  }, [churchId, selectedJobId, selectedJobReviewStatus, loadExtract]);

  // Poll when LlamaParse extraction is still running in the background.
  useEffect(() => {
    if (!churchId || !selectedJobId || agent2Status !== 'running' || extractLoading) return;
    let cancelled = false;
    (async () => {
      const data = await pollUntilAgent2Ready(selectedJobId);
      if (!cancelled && data?.agent2_status === 'complete') {
        setMapHint('LlamaParse extraction finished — review and confirm the fields.');
      }
    })();
    return () => { cancelled = true; };
  }, [churchId, selectedJobId, agent2Status, extractLoading, pollUntilAgent2Ready]);

  useEffect(() => {
    setImageLoadFailed(false);
    setImageZoom(100);
    setFocusedField(null);
    setImageReady(false);
    setUseFullPageImage(false);
  }, [selectedJobId, selectedRecordIndex, jobImageUrl]);

  // Column overrides are page-scoped — reset only when switching jobs.
  useEffect(() => {
    setColumnBandsOverride(null);
    setMapHint(null);
  }, [selectedJobId]);

  // Mapping only works on the aligned snippet — drop back from full-page view.
  useEffect(() => {
    if (focusedField && useFullPageImage && reviewCropBbox) setUseFullPageImage(false);
  }, [focusedField, useFullPageImage, reviewCropBbox]);

  // Ctrl/⌘ + wheel = zoom the scan (native listener so preventDefault works).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      zoomTo(imageZoom - Math.sign(e.deltaY) * 15, e.clientX, e.clientY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [selectedJobId, jobImageUrl, imageLoadFailed, imageZoom]);

  useEffect(() => {
    if (churchId && selectedJobId) loadJobArtifacts(selectedJobId);
  }, [churchId, selectedJobId, loadJobArtifacts]);

  // ── Image interaction: drag-to-pan, ctrl+wheel zoom ────────────────────────
  const onImageMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || dragBoundaryRef.current) return;
    if (drawMode) {
      const img = imageRef.current;
      if (!img) return;
      const rect = img.getBoundingClientRect();
      const startX = (e.clientX - rect.left) / rect.width;
      const startY = (e.clientY - rect.top) / rect.height;
      setDrawingBox({
        x0: startX,
        y0: startY,
        x1: startX,
        y1: startY,
        active: true
      });
      return;
    }
    const sc = scrollRef.current;
    if (!sc) return;
    panRef.current = { active: true, startX: e.clientX, startY: e.clientY, left: sc.scrollLeft, top: sc.scrollTop, moved: false };
  };

  const onBoundaryMouseDown = (e: React.MouseEvent, leftKey: string, rightKey: string) => {
    e.stopPropagation();
    e.preventDefault();
    dragBoundaryRef.current = { leftKey, rightKey };
  };

  const onContainerMouseMove = (e: React.MouseEvent) => {
    if (drawMode && drawingBox.active) {
      const img = imageRef.current;
      if (!img) return;
      const rect = img.getBoundingClientRect();
      const curX = (e.clientX - rect.left) / rect.width;
      const curY = (e.clientY - rect.top) / rect.height;
      setDrawingBox((prev) => ({
        ...prev,
        x1: Math.max(0, Math.min(1, curX)),
        y1: Math.max(0, Math.min(1, curY)),
      }));
      return;
    }
    const boundary = dragBoundaryRef.current;
    if (boundary) {
      const img = imageRef.current;
      if (!img) return;
      const rect = img.getBoundingClientRect();
      let s = (e.clientX - rect.left) / rect.width;
      s = Math.max(0.01, Math.min(0.99, s));
      // Convert snippet-relative x back to full-page fraction
      let fullX = s;
      if (useRecordSnippet && reviewCropBbox) {
        fullX = reviewCropBbox[0] + s * (reviewCropBbox[2] - reviewCropBbox[0]);
      }
      fullX = Math.max(0.01, Math.min(0.99, fullX));
      setColumnBandsOverride((prev) => {
        const base = prev || (tableExtractionJson?.column_bands as ColumnBands | undefined);
        if (!base) return prev;
        return moveColumnBoundary(base, boundary.leftKey, boundary.rightKey, fullX);
      });
      return;
    }
    const p = panRef.current;
    if (!p.active) return;
    const sc = scrollRef.current;
    if (!sc) return;
    const dx = e.clientX - p.startX;
    const dy = e.clientY - p.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) p.moved = true;
    sc.scrollLeft = p.left - dx;
    sc.scrollTop = p.top - dy;
  };

  const onContainerMouseUp = () => {
    if (drawMode && drawingBox.active) {
      setDrawingBox((prev) => ({ ...prev, active: false }));
      const x_min = Math.min(drawingBox.x0, drawingBox.x1);
      const y_min = Math.min(drawingBox.y0, drawingBox.y1);
      const x_max = Math.max(drawingBox.x0, drawingBox.x1);
      const y_max = Math.max(drawingBox.y0, drawingBox.y1);
      const w = x_max - x_min;
      const h = y_max - y_min;
      if (w > 0.01 && h > 0.01) {
        setRecordBox({ x: x_min, y: y_min, width: w, height: h });
        setConfirmLayoutDialogOpen(true);
      }
      return;
    }
    dragBoundaryRef.current = null;
    panRef.current.active = false;
  };

  // ── Zoom anchored to a point (cursor or viewport center) ───────────────────
  const zoomTo = (nextZoom: number, clientX?: number, clientY?: number) => {
    const sc = scrollRef.current;
    const wrap = wrapperRef.current;
    if (sc && wrap && wrap.offsetWidth > 0 && wrap.offsetHeight > 0) {
      const scRect = sc.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      const vx = clientX != null ? clientX - scRect.left : sc.clientWidth / 2;
      const vy = clientY != null ? clientY - scRect.top : sc.clientHeight / 2;
      // Fraction of the content currently under the anchor point.
      const fx = (vx - (wrapRect.left - scRect.left)) / wrap.offsetWidth;
      const fy = (vy - (wrapRect.top - scRect.top)) / wrap.offsetHeight;
      zoomAnchorRef.current = { fx, fy, vx, vy };
    }
    setImageZoom(Math.min(500, Math.max(25, Math.round(nextZoom))));
  };

  // Re-anchor scroll after the zoom changes the content size.
  useLayoutEffect(() => {
    const a = zoomAnchorRef.current;
    const sc = scrollRef.current;
    const wrap = wrapperRef.current;
    if (!a || !sc || !wrap) return;
    const scRect = sc.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const curX = (wrapRect.left - scRect.left) + a.fx * wrap.offsetWidth;
    const curY = (wrapRect.top - scRect.top) + a.fy * wrap.offsetHeight;
    sc.scrollLeft += curX - a.vx;
    sc.scrollTop += curY - a.vy;
    zoomAnchorRef.current = null;
  }, [imageZoom]);

  // ── Resize the image panel via the splitter ────────────────────────────────
  const startImagePanelResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const row = contentRowRef.current;
    if (!row) return;
    const rect = row.getBoundingClientRect();
    const onMove = (ev: MouseEvent) => {
      let w = rect.right - ev.clientX;
      w = Math.max(320, Math.min(rect.width - 320, w));
      setImagePanelWidth(w);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
    };
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Click-to-map: clicking a source token fills the focused field ──────────
  const handleTokenClick = (_id: string, _bbox: any, text: string) => {
    if (!focusedField || !text) return;
    setFields((prev) => {
      const cur = (prev[focusedField] || '').trim();
      const next = cur ? `${cur} ${text}` : text;
      return { ...prev, [focusedField]: next };
    });
    setMapHint(`Added “${text.slice(0, 32)}${text.length > 32 ? '…' : ''}” → ${focusedField.replace(/_/g, ' ')}`);
  };

  // ── Record navigation (persists current edits before switching) ────────────
  const goToRecord = (idx: number) => {
    if (idx === selectedRecordIndex) return;
    const updated = [...allRecords];
    if (updated.length) updated[selectedRecordIndex] = { ...fields };
    setAllRecords(updated);
    setFields({ ...(updated[idx] || {}) });
    setSelectedRecordIndex(idx);
    setFocusedField(null);
  };

  const runAgentExtract = async () => {
    if (!churchId || !selectedJobId) return;
    setExtractLoading(true);
    setError(null);
    setAgent2Status('running');
    try {
      const res: any = await apiClient.post(
        `/api/church/${churchId}/ocr/jobs/${selectedJobId}/agent-extract`,
        {},
        { timeout: AGENT_EXTRACT_TIMEOUT_MS },
      );
      const data = res?.data ?? res;
      hydrateExtractResponse(data);
      setConfirmedIndexes(new Set<number>());
      setColumnBandsOverride(null);
      setReviewStatus('agent_extracted');
      await loadJobs();
      if (data?.agent2_status === 'running') {
        setMapHint('LlamaParse extraction is running in the background…');
        await pollUntilAgent2Ready(selectedJobId);
      }
    } catch (err: any) {
      if (isTimeoutError(err)) {
        setMapHint('Request timed out — checking whether extraction finished on the server…');
        try {
          await refreshExtractSnapshot(selectedJobId);
          await pollUntilAgent2Ready(selectedJobId);
          setError(null);
        } catch {
          setError('Agent extraction timed out. Try refreshing the page — results may already be saved.');
        }
      } else {
        setError(err?.response?.data?.error || err?.message || 'Agent extraction failed');
      }
    } finally {
      setExtractLoading(false);
    }
  };

  const runAgent2Extract = async () => {
    if (!churchId || !selectedJobId) return;
    setExtractLoading(true);
    setError(null);
    setAgent2Status('running');
    try {
      const res: any = await apiClient.post(
        `/api/church/${churchId}/ocr/jobs/${selectedJobId}/agent2-extract`,
        {},
        { timeout: AGENT_EXTRACT_TIMEOUT_MS },
      );
      const data = res?.data ?? res;
      const agent2 = data.agent2_extract;
      const a2records = recordsFromExtract(agent2);
      const rtNorm = (agent2?.record_type && agent2.record_type !== 'custom')
        ? agent2.record_type
        : recordType;
      const normalizedA2 = normalizeExtractRecords(rtNorm, a2records.map((r) => ({ ...r })));
      setAgent2Records(normalizedA2.map((r) => ({ ...r })));
      setAllRecords(normalizedA2.map((r) => ({ ...r })));
      const idx = Math.min(selectedRecordIndex, Math.max(normalizedA2.length - 1, 0));
      setSelectedRecordIndex(idx);
      setFields({ ...(normalizedA2[idx] || {}) });
      setAgent2Method(agent2?.method || null);
      setAgent2Notes(agent2?.refinement_notes || null);
      setAgent2Status('complete');
      setAgent2Available(true);
      if (agent2?.record_type && agent2.record_type !== 'custom') setRecordType(agent2.record_type);
      setMapHint('LlamaParse extraction complete — review and confirm the fields.');
    } catch (err: any) {
      if (isTimeoutError(err)) {
        setMapHint('Agent 2 timed out — checking server…');
        try {
          const data = await refreshExtractSnapshot(selectedJobId);
          if (data?.agent2_status === 'complete') {
            setError(null);
            setMapHint('Agent 2 finished on the server — data loaded.');
          } else {
            setError('Agent 2 extraction timed out. Refresh the page to check again.');
          }
        } catch {
          setError('Agent 2 extraction timed out. Refresh the page to check again.');
        }
      } else {
        setError(err?.response?.data?.error || err?.message || 'Agent 2 extraction failed');
      }
    } finally {
      setExtractLoading(false);
    }
  };

  const confirmFields = async () => {
    if (!churchId || !selectedJobId) return;

    const currentFields = { ...fields };
    if (recordType === 'baptism') {
      normalizeBaptismDates(currentFields);
      setFields(currentFields);
    }

    const updated = [...allRecords];
    if (updated.length) updated[selectedRecordIndex] = currentFields;
    else updated.push(currentFields);

    const newConfirmed = new Set(confirmedIndexes);
    newConfirmed.add(selectedRecordIndex);
    const total = updated.length;
    const allDone = newConfirmed.size >= total;

    setConfirmLoading(true);
    setError(null);
    try {
      await apiClient.post(`/api/church/${churchId}/ocr/jobs/${selectedJobId}/confirm-extract`, {
        record_type: recordType,
        records: updated,
        confirmed_indexes: Array.from(newConfirmed),
        finalize: allDone,
      });
      setAllRecords(updated);
      setConfirmedIndexes(newConfirmed);

      // Update list of jobs locally so it immediately shows up under correct section with counts
      setJobs((prevJobs) =>
        prevJobs.map((j) =>
          Number(j.id) === selectedJobId
            ? {
                ...j,
                confirmed_count: newConfirmed.size,
                records_count: total,
                review_status: allDone ? 'ready_to_seed' : j.review_status,
              }
            : j
        )
      );

      if (allDone) {
        setReviewStatus('ready_to_seed');
        setMapHint('All records confirmed — ready to seed.');

        // Prompt
        setTimeout(() => {
          const continueWork = window.confirm("All records on this page are confirmed!\n\nContinue working on records?");
          if (continueWork) {
            // Find next job awaiting review
            const nextJob = jobs.find((j) => {
              const isSelf = Number(j.id) === selectedJobId;
              const isAwaiting = j.review_status !== 'ready_to_seed' && j.review_status !== 'seeded';
              return !isSelf && isAwaiting;
            });
            if (nextJob) {
              navigate(`${reviewBase}/${nextJob.id}`);
            } else {
              alert("No more jobs awaiting review!");
            }
          }
        }, 100);
      } else {
        let next = -1;
        for (let step = 1; step <= total; step++) {
          const cand = (selectedRecordIndex + step) % total;
          if (!newConfirmed.has(cand)) { next = cand; break; }
        }
        if (next >= 0) {
          setSelectedRecordIndex(next);
          setFields({ ...(updated[next] || {}) });
          setFocusedField(null);
          setMapHint(`Record confirmed — now reviewing record ${next + 1} of ${total}.`);
        }
      }
      await loadJobs();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Confirm failed');
    } finally {
      setConfirmLoading(false);
    }
  };

  const seedRecords = async () => {
    if (!churchId || !selectedJobId) return;
    setSeedLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.post(`/api/church/${churchId}/ocr/jobs/${selectedJobId}/seed`);
      setReviewStatus('seeded');
      const created = res?.data?.created_records ?? res?.created_records ?? [];
      alert(`Seeded ${created.length} record(s) into ${recordType} table.`);
      await loadJobs();
      navigate(reviewBase);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Seed failed');
    } finally {
      setSeedLoading(false);
    }
  };

  const handleLayoutOverride = async (newLayout: 'tabular' | 'form' | 'narrative') => {
    if (!churchId || !selectedJobId || !layoutClassification) return;
    if (newLayout === layoutClassification.detectedLayoutType && layoutClassification.userOverridden) return;
    try {
      const updatedLayout = {
        ...layoutClassification,
        detectedLayoutType: newLayout,
        userOverridden: true,
      };
      await apiClient.patch(`/api/church/${churchId}/ocr/jobs/${selectedJobId}`, {
        layout_classification_json: updatedLayout,
      });
      setLayoutClassification(updatedLayout);
      setMapHint(`Layout set to ${newLayout}.`);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to save layout override');
    }
  };

  const handleApplyColumnOverride = () => {
    setMapHint("Columns applied to active preview.");
  };

  const [rerunLoading, setRerunLoading] = useState(false);
  const handleRerunExtraction = async () => {
    if (!churchId || !selectedJobId || !columnBandsOverride) return;
    setRerunLoading(true);
    try {
      const res: any = await apiClient.post(`/api/church/${churchId}/ocr/jobs/${selectedJobId}/re-extract`, {
        columnBands: columnBandsOverride,
        headerYThreshold: tableExtractionJson?.header_y_threshold || 0.15
      });
      const data = res?.data ?? res;
      if (data.success) {
        setTableExtractionJson(data.tableExtraction || null);
        setRecordCandidates(data.recordCandidates || null);
        setColumnBandsOverride(null);
        setMapHint("Re-extraction complete. Page parsed with custom columns.");
        loadExtract(selectedJobId);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Re-extraction failed');
    } finally {
      setRerunLoading(false);
    }
  };

  const [saveTemplateLoading, setSaveTemplateLoading] = useState(false);
  const handleSaveTemplate = async () => {
    if (!churchId || !templateName.trim() || !columnBandsOverride) return;
    setSaveTemplateLoading(true);
    try {
      const res: any = await apiClient.post(`/api/church/${churchId}/ocr/templates`, {
        name: templateName,
        recordType,
        columnBands: columnBandsOverride,
        headerYThreshold: tableExtractionJson?.header_y_threshold || 0.15
      });
      const data = res?.data ?? res;
      if (data.success) {
        setSaveTemplateDialogOpen(false);
        setMapHint(`Template "${templateName}" saved successfully.`);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to save template');
    } finally {
      setSaveTemplateLoading(false);
    }
  };

  const handleSaveDefinedLayout = async () => {
    if (!churchId || !selectedJobId || !recordBox) return;
    setSaveLayoutLoading(true);
    try {
      const mappedBox = mapVisualToOrig(recordBox.x, recordBox.y, recordBox.width, recordBox.height, rotation);
      await apiClient.post(`/api/church/${churchId}/ocr/jobs/${selectedJobId}/define-record-layout`, {
        recordBox: mappedBox
      });
      setConfirmLayoutDialogOpen(false);
      setDrawMode(false);
      setRecordBox(null);
      setMapHint('Custom record region template registered! Re-processing has been scheduled...');
      await loadJobs();
      navigate(`${reviewBase}`);
    } catch (err: any) {
      console.error("Failed to define layout:", err);
      alert("Failed to define layout: " + (err.response?.data?.error || err.message));
    } finally {
      setSaveLayoutLoading(false);
    }
  };

  const [selectedAwaitingJobIds, setSelectedAwaitingJobIds] = useState<Set<number>>(new Set());
  const [selectedCompletedJobIds, setSelectedCompletedJobIds] = useState<Set<number>>(new Set());
  const [pendingDeleteJobIds, setPendingDeleteJobIds] = useState<number[] | null>(null);
  const [pendingSeedJobIds, setPendingSeedJobIds] = useState<number[] | null>(null);
  const [deletingJobs, setDeletingJobs] = useState(false);
  const [bulkSeeding, setBulkSeeding] = useState(false);

  const toggleAwaitingJobSelection = useCallback((jobId: number) => {
    setSelectedAwaitingJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }, []);

  const toggleCompletedJobSelection = useCallback((jobId: number) => {
    setSelectedCompletedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }, []);

  useEffect(() => {
    const visibleIds = new Set(completedJobs.map((j) => Number(j.id)));
    setSelectedCompletedJobIds((prev) => {
      const next = new Set([...prev].filter((id) => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [completedJobs]);

  const handleBulkSeedJobs = useCallback(async (jobIds: number[]) => {
    if (!churchId || jobIds.length === 0) return;
    const seedable = jobIds.filter((id) => {
      const job = jobs.find((j) => Number(j.id) === id);
      return job?.review_status === 'ready_to_seed';
    });
    if (seedable.length === 0) return;

    setBulkSeeding(true);
    let success = 0;
    const errors: string[] = [];
    try {
      for (const jobId of seedable) {
        try {
          await apiClient.post(`/api/church/${churchId}/ocr/jobs/${jobId}/seed`);
          success += 1;
        } catch (err: any) {
          errors.push(`Job #${jobId}: ${err?.response?.data?.error || err?.message || 'Seed failed'}`);
        }
      }
      await loadJobs();
      setSelectedCompletedJobIds((prev) => {
        const next = new Set(prev);
        seedable.forEach((id) => next.delete(id));
        return next;
      });
      if (selectedJobId && seedable.includes(selectedJobId)) {
        navigate(reviewBase);
      }
      if (errors.length > 0) {
        alert(`Seeded ${success} job(s). Failed:\n${errors.join('\n')}`);
      } else {
        alert(`Seeded ${success} record batch(es) successfully.`);
      }
    } finally {
      setBulkSeeding(false);
      setPendingSeedJobIds(null);
    }
  }, [churchId, jobs, loadJobs, selectedJobId, navigate, reviewBase]);

  const handleDeleteJobs = useCallback(async (jobIds: number[]) => {
    if (!churchId || jobIds.length === 0) return;
    setDeletingJobs(true);
    try {
      await apiClient.delete(`/api/church/${churchId}/ocr/jobs`, { data: { jobIds } });
      const idSet = new Set(jobIds);
      setJobs((prevJobs) => prevJobs.filter((j) => !idSet.has(Number(j.id))));
      setSelectedAwaitingJobIds((prev) => {
        const next = new Set(prev);
        jobIds.forEach((id) => next.delete(id));
        return next;
      });
      setSelectedCompletedJobIds((prev) => {
        const next = new Set(prev);
        jobIds.forEach((id) => next.delete(id));
        return next;
      });
      if (selectedJobId && idSet.has(selectedJobId)) {
        navigate(reviewBase);
      }
    } catch (err: any) {
      alert(`Failed to delete job(s): ${err?.response?.data?.error || err?.message || err}`);
    } finally {
      setDeletingJobs(false);
      setPendingDeleteJobIds(null);
    }
  }, [churchId, selectedJobId, navigate, reviewBase]);

  if (!churchId) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>Missing church ID</Typography>
        <Button component={Link} to={uploadPath} startIcon={<IconArrowLeft size={18} />}>Back to Upload</Button>
      </Box>
    );
  }

  const statusCfg = STATUS_LABELS[reviewStatus] || { label: reviewStatus, color: 'default' as const };

  const allAwaitingSelected = awaitingJobs.length > 0
    && awaitingJobs.every((j) => selectedAwaitingJobIds.has(Number(j.id)));
  const someAwaitingSelected = selectedAwaitingJobIds.size > 0 && !allAwaitingSelected;

  const allCompletedSelected = completedJobs.length > 0
    && completedJobs.every((j) => selectedCompletedJobIds.has(Number(j.id)));
  const someCompletedSelected = selectedCompletedJobIds.size > 0 && !allCompletedSelected;
  const seedableCompletedCount = completedJobs.filter(
    (j) => selectedCompletedJobIds.has(Number(j.id)) && j.review_status === 'ready_to_seed',
  ).length;

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title={jobsCollapsed ? 'Show jobs list' : 'Hide jobs list'}>
          <IconButton size="small" onClick={() => setJobsCollapsed((v) => !v)}>
            {jobsCollapsed ? <IconLayoutSidebarLeftExpand size={20} /> : <IconLayoutSidebarLeftCollapse size={20} />}
          </IconButton>
        </Tooltip>
        <Button component={Link} to={uploadPath} startIcon={<IconArrowLeft size={16} />} size="small" sx={{ textTransform: 'none' }}>
          Upload
        </Button>
        <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>Confirm & Seed</Typography>
        <Button size="small" startIcon={<IconRefresh size={16} />} onClick={loadJobs} disabled={jobsLoading}>Refresh</Button>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* Job queue (collapsible) */}
        {jobsCollapsed ? (
          <Box
            sx={{
              width: 40,
              flexShrink: 0,
              borderRight: { md: '1px solid' },
              borderBottom: { xs: '1px solid', md: 'none' },
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 1,
            }}
          >
            <Tooltip title="Show jobs list">
              <IconButton size="small" onClick={() => setJobsCollapsed(false)}>
                <IconLayoutSidebarLeftExpand size={20} />
              </IconButton>
            </Tooltip>
            <Typography
              variant="caption"
              sx={{ mt: 1, writingMode: 'vertical-rl', color: 'text.secondary', userSelect: 'none' }}
            >
              Jobs ({jobs.length})
            </Typography>
          </Box>
        ) : (
        <Box
          sx={{
            width: { xs: '100%', md: 280 },
            minWidth: { md: 260 },
            maxWidth: { md: 320 },
            maxHeight: { xs: '40vh', md: 'none' },
            height: { md: '100%' },
            flexShrink: 0,
            borderRight: { md: '1px solid' },
            borderBottom: { xs: '1px solid', md: 'none' },
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <Box sx={{ flex: 1, overflow: 'auto', p: 2, minHeight: 0 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
                <Checkbox
                  size="small"
                  checked={allAwaitingSelected}
                  indeterminate={someAwaitingSelected}
                  disabled={awaitingJobs.length === 0}
                  onChange={(_, checked) => {
                    if (checked) {
                      setSelectedAwaitingJobIds(new Set(awaitingJobs.map((j) => Number(j.id))));
                    } else {
                      setSelectedAwaitingJobIds(new Set());
                    }
                  }}
                  sx={{ p: 0.5 }}
                />
                <Typography variant="subtitle2" fontWeight={700} noWrap>
                  Jobs awaiting review
                  {selectedAwaitingJobIds.size > 0 ? ` (${selectedAwaitingJobIds.size})` : ''}
                </Typography>
              </Stack>
              <Tooltip title="Hide jobs list">
                <IconButton size="small" onClick={() => setJobsCollapsed(true)}>
                  <IconLayoutSidebarLeftCollapse size={18} />
                </IconButton>
              </Tooltip>
            </Stack>
            {selectedAwaitingJobIds.size > 0 && (
              <Button
                size="small"
                color="error"
                variant="outlined"
                startIcon={<IconTrash size={14} />}
                sx={{ mb: 1, textTransform: 'none' }}
                onClick={() => setPendingDeleteJobIds(Array.from(selectedAwaitingJobIds))}
              >
                Delete selected ({selectedAwaitingJobIds.size})
              </Button>
            )}
            {jobsLoading && <CircularProgress size={24} />}
            {!jobsLoading && awaitingJobs.length === 0 && pendingUploadRows.length === 0 && queueOnlyRows.length === 0 && (
              <Alert severity="info" sx={{ py: 0.5, px: 1, fontSize: '0.75rem' }}>No jobs awaiting review.</Alert>
            )}
            <List dense disablePadding sx={{ mb: 3 }}>
              {[...pendingUploadRows, ...queueOnlyRows].map((f) => {
                const pipeline = getUploadQueueItemState(f);
                return (
                  <ListItem key={f.id} disablePadding sx={{ mb: 0.75 }}>
                    <Paper variant="outlined" sx={{ width: '100%', borderRadius: 1, overflow: 'hidden' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.75, pr: 0.5 }}>
                        {churchId && f.jobId ? (
                          <JobListThumb churchId={churchId} jobId={Number(f.jobId)} />
                        ) : (
                          <Box
                            sx={{
                              width: 44,
                              height: 44,
                              flexShrink: 0,
                              borderRadius: 1,
                              bgcolor: 'action.hover',
                              border: '1px solid',
                              borderColor: 'divider',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'info.main',
                            }}
                          >
                            <IconCloudUpload size={20} />
                          </Box>
                        )}
                        <ListItemText
                          primary={f.name}
                          secondary={pipeline.label}
                          sx={{ flex: 1, minWidth: 0, my: 0 }}
                          primaryTypographyProps={{ noWrap: true, fontSize: '0.85rem', fontWeight: 500 }}
                          secondaryTypographyProps={{ noWrap: true, fontSize: '0.75rem' }}
                        />
                        <Chip label={pipeline.label} size="small" color="info" variant="outlined" sx={{ flexShrink: 0 }} />
                      </Box>
                      <OcrReviewInlineProgress state={pipeline} />
                    </Paper>
                  </ListItem>
                );
              })}
              {awaitingJobs.map((j) => {
                const jobId = Number(j.id);
                const cfg = STATUS_LABELS[j.review_status] || { label: j.review_status, color: 'default' as const };
                const active = selectedJobId === jobId;
                const checked = selectedAwaitingJobIds.has(jobId);
                const processing = shouldShowJobProgress(j);
                const countStr = typeof j.records_count === 'number' ? `${j.confirmed_count || 0}/${j.records_count} ` : '';
                return (
                  <ListItem key={j.id} disablePadding sx={{ mb: 0.75 }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        width: '100%',
                        borderRadius: 1,
                        overflow: 'hidden',
                        ...(active && { borderColor: 'primary.main', borderWidth: 2 }),
                      }}
                    >
                      <ListItemButton
                        selected={active}
                        onClick={() => navigate(`${reviewBase}/${j.id}`)}
                        sx={{
                          borderRadius: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                          py: 0.75,
                          pr: 1,
                        }}
                      >
                        <Checkbox
                          size="small"
                          checked={checked}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleAwaitingJobSelection(jobId)}
                          sx={{ p: 0.25, flexShrink: 0 }}
                        />
                        {churchId && <JobListThumb churchId={churchId} jobId={jobId} />}
                        <ListItemText
                          primary={`${countStr}${j.filename || `Job #${j.id}`}`}
                          secondary={new Date(j.created_at).toLocaleString()}
                          sx={{ flex: 1, minWidth: 0, my: 0 }}
                          primaryTypographyProps={{ noWrap: true, fontSize: '0.85rem', fontWeight: active ? 700 : 500 }}
                          secondaryTypographyProps={{ noWrap: true }}
                        />
                        <Chip
                          label={cfg.label}
                          size="small"
                          color={cfg.color}
                          variant="outlined"
                          sx={{ flexShrink: 0 }}
                        />
                        <Tooltip title="Delete job completely">
                          <IconButton
                            size="small"
                            color="error"
                            sx={{ flexShrink: 0 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingDeleteJobIds([jobId]);
                            }}
                          >
                            <IconTrash size={16} />
                          </IconButton>
                        </Tooltip>
                      </ListItemButton>
                      {processing && (
                        <OcrReviewInlineProgress state={getJobPipelineState(j)} />
                      )}
                    </Paper>
                  </ListItem>
                );
              })}
            </List>

            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
              <Checkbox
                size="small"
                checked={allCompletedSelected}
                indeterminate={someCompletedSelected}
                disabled={completedJobs.length === 0}
                onChange={(_, checked) => {
                  if (checked) {
                    setSelectedCompletedJobIds(new Set(completedJobs.map((j) => Number(j.id))));
                  } else {
                    setSelectedCompletedJobIds(new Set());
                  }
                }}
                sx={{ p: 0.5 }}
              />
              <Typography variant="subtitle2" fontWeight={700} noWrap>
                Jobs complete
                {selectedCompletedJobIds.size > 0 ? ` (${selectedCompletedJobIds.size})` : ''}
              </Typography>
            </Stack>
            {selectedCompletedJobIds.size > 0 && (
              <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
                {seedableCompletedCount > 0 && (
                  <Button
                    size="small"
                    color="success"
                    variant="outlined"
                    startIcon={<IconDatabase size={14} />}
                    sx={{ textTransform: 'none' }}
                    disabled={bulkSeeding}
                    onClick={() => {
                      const ids = completedJobs
                        .filter((j) => selectedCompletedJobIds.has(Number(j.id)) && j.review_status === 'ready_to_seed')
                        .map((j) => Number(j.id));
                      setPendingSeedJobIds(ids);
                    }}
                  >
                    Seed selected ({seedableCompletedCount})
                  </Button>
                )}
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  startIcon={<IconTrash size={14} />}
                  sx={{ textTransform: 'none' }}
                  onClick={() => setPendingDeleteJobIds(Array.from(selectedCompletedJobIds))}
                >
                  Delete selected ({selectedCompletedJobIds.size})
                </Button>
              </Stack>
            )}
            {!jobsLoading && completedJobs.length === 0 && (
              <Alert severity="info" sx={{ py: 0.5, px: 1, fontSize: '0.75rem' }}>No completed jobs.</Alert>
            )}
            <List dense disablePadding>
              {completedJobs.map((j) => {
                const jobId = Number(j.id);
                const cfg = STATUS_LABELS[j.review_status] || { label: j.review_status, color: 'default' as const };
                const active = selectedJobId === jobId;
                const checked = selectedCompletedJobIds.has(jobId);
                const countStr = typeof j.records_count === 'number' ? `${j.confirmed_count || 0}/${j.records_count} ` : '';
                return (
                  <ListItem key={j.id} disablePadding sx={{ mb: 0.75 }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        width: '100%',
                        borderRadius: 1,
                        overflow: 'hidden',
                        ...(active && { borderColor: 'primary.main', borderWidth: 2 }),
                      }}
                    >
                      <ListItemButton
                        selected={active}
                        onClick={() => navigate(`${reviewBase}/${j.id}`)}
                        sx={{
                          borderRadius: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                          py: 0.75,
                          pr: 1,
                        }}
                      >
                        <Checkbox
                          size="small"
                          checked={checked}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleCompletedJobSelection(jobId)}
                          sx={{ p: 0.25, flexShrink: 0 }}
                        />
                        {churchId && <JobListThumb churchId={churchId} jobId={jobId} />}
                        <ListItemText
                          primary={`${countStr}${j.filename || `Job #${j.id}`}`}
                          secondary={new Date(j.created_at).toLocaleString()}
                          sx={{ flex: 1, minWidth: 0, my: 0 }}
                          primaryTypographyProps={{ noWrap: true, fontSize: '0.85rem', fontWeight: active ? 700 : 500 }}
                          secondaryTypographyProps={{ noWrap: true }}
                        />
                        <Chip
                          label={cfg.label}
                          size="small"
                          color={cfg.color}
                          variant="outlined"
                          sx={{ flexShrink: 0 }}
                        />
                        <Tooltip title="Delete job completely">
                          <IconButton
                            size="small"
                            color="error"
                            sx={{ flexShrink: 0 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingDeleteJobIds([jobId]);
                            }}
                          >
                            <IconTrash size={16} />
                          </IconButton>
                        </Tooltip>
                      </ListItemButton>
                    </Paper>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        </Box>
        )}

        {/* Source image + confirm panel */}
        <Box ref={contentRowRef} sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, overflow: 'hidden' }}>
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              order: { lg: 3 },
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              bgcolor: 'background.default',
            }}
          >
          <Box sx={{ flex: 1, minWidth: 0, overflow: 'auto', px: { xs: 2, lg: 2.5 }, pt: 2, pb: 1 }}>
          {!selectedJobId ? (
            <OcrReviewDropZone
              dragActive={uploadDragActive}
              disabled={!churchId}
              isUploading={isUploadingFiles || uploadQueue.some((f) => !['completed', 'failed', 'error', 'pending'].includes(f.status))}
              onDragEnter={handleReviewDrag}
              onDragLeave={handleReviewDrag}
              onDragOver={handleReviewDrag}
              onDrop={handleReviewDrop}
              onBrowse={() => uploadFileInputRef.current?.click()}
              fileInput={(
                <input
                  ref={uploadFileInputRef}
                  type="file"
                  accept={REVIEW_ACCEPTED_TYPES}
                  multiple
                  hidden
                  onChange={(e) => {
                    handleReviewFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
              )}
            />
          ) : (
            <Stack spacing={2}>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mr: 0.5 }}>
                    Job #{selectedJobId}
                  </Typography>
                  <Chip label={statusCfg.label} size="small" color={statusCfg.color} />
                  <FormControl size="small" sx={{ minWidth: 130 }}>
                    <Select
                      value={reviewStatus}
                      onChange={async (e) => {
                        const nextStatus = e.target.value;
                        try {
                          await apiClient.patch(`/api/church/${churchId}/ocr/jobs/${selectedJobId}/review-status`, {
                            review_status: nextStatus
                          });
                          setReviewStatus(nextStatus as PipelineStatus);
                          setJobs((prev) =>
                            prev.map((j) =>
                              Number(j.id) === selectedJobId ? { ...j, review_status: nextStatus as PipelineStatus } : j
                            )
                          );
                          setMapHint(`Review status updated to ${nextStatus}.`);
                        } catch (err: any) {
                          console.error("Failed to update status:", err);
                          alert("Failed to update status: " + (err.response?.data?.error || err.message));
                        }
                      }}
                      size="small"
                      variant="outlined"
                      sx={{ height: 32, fontSize: '0.8rem' }}
                    >
                      {Object.entries(STATUS_LABELS).map(([status, cfg]) => (
                        <MenuItem key={status} value={status} sx={{ fontSize: '0.8rem' }}>
                          {cfg.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 110 }}>
                    <InputLabel id="review-record-type-label">Type</InputLabel>
                    <Select
                      labelId="review-record-type-label"
                      label="Type"
                      value={recordType}
                      onChange={async (e) => {
                        const nextType = e.target.value;
                        setRecordType(nextType);
                        try {
                          await apiClient.post(`/api/church/${churchId}/ocr/jobs/${selectedJobId}/confirm-extract`, {
                            record_type: nextType,
                            records: allRecords.length ? allRecords : [fields],
                            confirmed_indexes: Array.from(confirmedIndexes),
                            finalize: false,
                          });
                          setJobs((prev) =>
                            prev.map((j) =>
                              Number(j.id) === selectedJobId ? { ...j, record_type: nextType } : j
                            )
                          );
                          setMapHint(`Record type changed to ${nextType}.`);
                        } catch (err: any) {
                          console.error("Failed to update record type on backend:", err);
                          setError(err?.response?.data?.error || "Failed to update record type");
                        }
                      }}
                      size="small"
                      sx={{ height: 32, textTransform: 'capitalize', fontSize: '0.8rem' }}
                    >
                      <MenuItem value="baptism">Baptism</MenuItem>
                      <MenuItem value="marriage">Marriage</MenuItem>
                      <MenuItem value="funeral">Funeral</MenuItem>
                    </Select>
                  </FormControl>
                  {agent2Method && (
                    <Chip
                      label={formatExtractMethod(agent2Method)}
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                  )}
                  {agent2Status && (
                    <Chip
                      size="small"
                      label={agent2Status === 'running' ? 'Extracting…' : agent2Status === 'complete' ? 'Extracted' : agent2Status}
                      color={agent2Status === 'complete' ? 'success' : agent2Status === 'running' ? 'info' : 'default'}
                    />
                  )}
                  <Box sx={{ flex: 1 }} />
                  {!agent2Available && agent2Status !== 'complete' && (
                    <Button size="small" variant="outlined" onClick={runAgent2Extract} disabled={extractLoading}>
                      Run extraction
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<IconRefresh size={16} />}
                    onClick={runAgent2Extract}
                    disabled={extractLoading}
                    sx={{ textTransform: 'none' }}
                  >
                    Re-extract
                  </Button>
                </Stack>

                {(allRecords.length > 1 || layoutClassification || currentRecordOutcomes.length > 0) && (
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1.25, pt: 1.25, borderTop: '1px solid', borderColor: 'divider' }}>
                    {allRecords.length > 1 && (
                      <>
                        <FormControl size="small" sx={{ minWidth: 260, flex: 1 }}>
                          <InputLabel id="review-record-index-label">Record on page</InputLabel>
                          <Select
                            labelId="review-record-index-label"
                            label="Record on page"
                            value={selectedRecordIndex}
                            onChange={(e) => goToRecord(Number(e.target.value))}
                            size="small"
                          >
                            {allRecords.map((rec, i) => (
                              <MenuItem key={i} value={i}>
                                {confirmedIndexes.has(i) ? '✓ ' : ''}
                                #{rec.record_number || i + 1} — {recordDisplayName(recordType, rec) || `Record ${i + 1}`}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Chip
                          size="small"
                          color={confirmedIndexes.size >= allRecords.length ? 'success' : 'default'}
                          label={`${confirmedIndexes.size}/${allRecords.length} confirmed`}
                        />
                      </>
                    )}
                    {layoutClassification && (
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel id="layout-override-label">Layout</InputLabel>
                        <Select
                          labelId="layout-override-label"
                          label="Layout"
                          value={layoutClassification.detectedLayoutType}
                          onChange={(e) => handleLayoutOverride(e.target.value as any)}
                          size="small"
                        >
                          <MenuItem value="tabular">Tabular Ledger</MenuItem>
                          <MenuItem value="form">Pre-printed Form</MenuItem>
                          <MenuItem value="narrative">Narrative</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                    {currentRecordOutcomes.length > 0 && (
                      <Stack direction="row" spacing={0.75}>
                        {ruleCounts.blockers > 0 && (
                          <Chip label={`${ruleCounts.blockers} blocker${ruleCounts.blockers > 1 ? 's' : ''}`} color="error" size="small" />
                        )}
                        {ruleCounts.warnings > 0 && (
                          <Chip label={`${ruleCounts.warnings} warning${ruleCounts.warnings > 1 ? 's' : ''}`} color="warning" size="small" />
                        )}
                        {ruleCounts.suggestions > 0 && (
                          <Chip label={`${ruleCounts.suggestions} suggestion${ruleCounts.suggestions > 1 ? 's' : ''}`} color="info" size="small" variant="outlined" />
                        )}
                      </Stack>
                    )}
                  </Stack>
                )}
              </Paper>

              {ruleCounts.blockers > 0 && (
                <Alert severity="error" sx={{ py: 0.75 }}>
                  Seeding is blocked until blocker fields are corrected.
                </Alert>
              )}

              {needsReviewFlag && (
                <Alert severity="warning" sx={{ py: 0.75 }}>
                  Some fields could not be confidently mapped — please verify against the source image.
                </Alert>
              )}

              {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

              {(agent2Notes || llamaparsePreview || ocrPreview) && (
                <Box>
                  <Button
                    size="small"
                    variant="text"
                    sx={{ textTransform: 'none', px: 0, mb: showDetailedInfo ? 1 : 0 }}
                    endIcon={showDetailedInfo ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                    onClick={() => setShowDetailedInfo((v) => !v)}
                  >
                    Extraction details
                  </Button>
                  <Collapse in={showDetailedInfo}>
                    <Stack spacing={1.5}>
                      {agent2Method && (
                        <Typography variant="caption" color="text.secondary">
                          Method: {formatExtractMethod(agent2Method)}
                        </Typography>
                      )}
                      {agent2Notes && (
                        <Alert severity="info" sx={{ py: 0.5 }}>
                          {agent2Notes}
                        </Alert>
                      )}
                      {llamaparsePreview && (
                        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
                          <Typography variant="caption" fontWeight={700} color="text.secondary">LlamaParse preview</Typography>
                          <Typography variant="body2" sx={{ mt: 0.5, fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>
                            {llamaparsePreview}
                          </Typography>
                        </Paper>
                      )}
                      {ocrPreview && (
                        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
                          <Typography variant="caption" fontWeight={700} color="text.secondary">OCR text preview</Typography>
                          <Typography variant="body2" sx={{ mt: 0.5, fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>
                            {ocrPreview}
                          </Typography>
                        </Paper>
                      )}
                    </Stack>
                  </Collapse>
                </Box>
              )}

              {extractLoading ? (
                <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
              ) : (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
                    Extracted fields
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                      gap: 1.5,
                    }}
                  >
                      {fieldDefs.map((def) => {
                        const fieldColor = REVIEW_FIELD_COLORS[def.name];
                        const isFocused = focusedField === def.name;
                        const hasSnippetLink = fieldHighlightBoxes.some((b) => b.fieldKey === def.name);
                        const fieldValue = fields[def.name] || '';

                        const fieldRules = currentRecordOutcomes.filter((o: any) => o.target_field === def.name);
                        const hasBlocker = fieldRules.some((o: any) => o.severity === 'blocker' && o.reviewer_decision === 'pending');
                        const hasWarningOrError = fieldRules.some((o: any) => (o.severity === 'warning' || o.severity === 'error') && o.reviewer_decision === 'pending');

                        return (
                          <Box
                            key={def.name}
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 0.5,
                              ...(def.type === 'textarea' ? { gridColumn: { sm: '1 / -1' } } : {}),
                            }}
                          >
                            <TextField
                              fullWidth
                              size="small"
                              label={def.label}
                              required={def.required}
                              value={fieldValue}
                              onChange={(e) => handleFieldChange(def.name, e.target.value)}
                              onFocus={() => setFocusedField(def.name)}
                              multiline={def.type === 'textarea'}
                              minRows={def.type === 'textarea' ? 2 : 1}
                              error={hasBlocker || hasWarningOrError}
                              sx={{
                                ...(fieldColor ? {
                                  '& .MuiOutlinedInput-root': {
                                    '& fieldset': {
                                      borderColor: isFocused ? fieldColor : `${fieldColor}66`,
                                      borderWidth: isFocused ? 2 : 1,
                                    },
                                  },
                                  '& .MuiInputLabel-root': {
                                    color: isFocused ? fieldColor : undefined,
                                  },
                                } : {}),
                              }}
                              InputProps={fieldColor ? {
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <Box sx={{
                                      width: 10,
                                      height: 10,
                                      borderRadius: '50%',
                                      bgcolor: hasSnippetLink ? fieldColor : `${fieldColor}44`,
                                      border: hasSnippetLink ? 'none' : `1px solid ${fieldColor}`,
                                      flexShrink: 0,
                                    }} />
                                  </InputAdornment>
                                ),
                              } : undefined}
                            />

                            {def.name === 'clergy' && !String(fieldValue || '').trim() && (
                              <Button
                                size="small"
                                variant="outlined"
                                sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                                onClick={async () => {
                                  const raw = window.prompt('Enter clergy name to add to parish roster:');
                                  if (!raw || !raw.trim()) return;
                                  try {
                                    await apiClient.post(`/api/church/${churchId}/ocr/rules/config/entities`, {
                                      entity_type: 'clergy',
                                      canonical_value: raw.trim(),
                                      display_label: raw.trim(),
                                      source_notes: 'Added from OCR review — unknown clergy',
                                    });
                                    triggerRevalidation(fields);
                                  } catch (err: any) {
                                    alert('Failed to add clergy: ' + (err.response?.data?.error || err.message));
                                  }
                                }}
                              >
                                Add to Parish Clergy
                              </Button>
                            )}
                            
                            {fieldRules.map((outcome: any) => {
                              if (outcome.reviewer_decision !== 'pending') return null;

                              const handleAccept = async () => {
                                try {
                                  await apiClient.post(`/api/church/${churchId}/ocr/rules/outcomes/${outcome.id}/accept`);
                                  let valToApply = outcome.suggested_value;
                                  if (typeof valToApply === 'string' && valToApply.startsWith('[')) {
                                    try {
                                      const parsed = JSON.parse(valToApply);
                                      if (Array.isArray(parsed) && parsed.length > 0) {
                                        valToApply = parsed[0].canonical_value || valToApply;
                                      }
                                    } catch (_) {}
                                  }
                                  if (valToApply) {
                                    setFields(prev => ({ ...prev, [outcome.target_field]: valToApply }));
                                    const nextRecords = [...allRecords];
                                    if (nextRecords[selectedRecordIndex]) {
                                      nextRecords[selectedRecordIndex][outcome.target_field] = valToApply;
                                    }
                                    setAllRecords(nextRecords);
                                    triggerRevalidation({ ...fields, [outcome.target_field]: valToApply });
                                  } else {
                                    triggerRevalidation(fields);
                                  }
                                } catch (err: any) {
                                  alert("Failed to accept suggestion: " + (err.response?.data?.error || err.message));
                                }
                              };

                              const handleReject = async () => {
                                try {
                                  await apiClient.post(`/api/church/${churchId}/ocr/rules/outcomes/${outcome.id}/reject`);
                                  triggerRevalidation(fields);
                                } catch (err: any) {
                                  alert("Failed to reject suggestion: " + (err.response?.data?.error || err.message));
                                }
                              };

                              const handleOverride = async () => {
                                const reason = window.prompt(`Enter reason to override this warning/error:`);
                                if (!reason || !reason.trim()) return;
                                try {
                                  await apiClient.post(`/api/church/${churchId}/ocr/rules/outcomes/${outcome.id}/override`, { reason });
                                  triggerRevalidation(fields);
                                } catch (err: any) {
                                  alert("Failed to override: " + (err.response?.data?.error || err.message));
                                }
                              };

                              if (outcome.action_type === 'suggest_value' || outcome.action_type === 'normalize_value') {
                                return (
                                  <Paper
                                    variant="outlined"
                                    key={outcome.id}
                                    sx={{
                                      p: 1,
                                      mt: 0.5,
                                      bgcolor: 'action.hover',
                                      borderColor: 'info.main',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 1
                                    }}
                                  >
                                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <IconInfoCircle size={14} color="#0288d1" />
                                      {outcome.explanation}
                                    </Typography>
                                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ gap: 0.5 }}>
                                      {Array.isArray(outcome.suggested_value) ? (
                                        outcome.suggested_value.map((sug: any, idx: number) => (
                                          <Chip
                                            key={idx}
                                            label={`${sug.canonical_value} (${Math.round((sug.score || 0) * 100)}%)`}
                                            size="small"
                                            onClick={async () => {
                                              try {
                                                setFields(prev => ({ ...prev, [outcome.target_field]: sug.canonical_value }));
                                                const nextRecords = [...allRecords];
                                                if (nextRecords[selectedRecordIndex]) {
                                                  nextRecords[selectedRecordIndex][outcome.target_field] = sug.canonical_value;
                                                }
                                                setAllRecords(nextRecords);
                                                await apiClient.post(`/api/church/${churchId}/ocr/rules/outcomes/${outcome.id}/accept`);
                                                triggerRevalidation({ ...fields, [outcome.target_field]: sug.canonical_value });
                                              } catch (err: any) {
                                                alert("Failed to apply clergy suggestion: " + (err.response?.data?.error || err.message));
                                              }
                                            }}
                                            color="info"
                                            variant="outlined"
                                            sx={{ cursor: 'pointer' }}
                                          />
                                        ))
                                      ) : (
                                        <Chip
                                          label={outcome.suggested_value}
                                          size="small"
                                          onClick={handleAccept}
                                          color="info"
                                          variant="filled"
                                          sx={{ cursor: 'pointer' }}
                                        />
                                      )}
                                      <Button
                                        size="small"
                                        color="error"
                                        startIcon={<IconX size={12} />}
                                        onClick={handleReject}
                                        sx={{ minWidth: 0, textTransform: 'none', px: 1, height: 24 }}
                                      >
                                        Reject
                                      </Button>
                                    </Stack>
                                  </Paper>
                                );
                              } else {
                                const isBlocker = outcome.severity === 'blocker';
                                return (
                                  <Alert
                                    key={outcome.id}
                                    severity={isBlocker ? 'error' : outcome.severity === 'warning' ? 'warning' : 'info'}
                                    variant="outlined"
                                    icon={isBlocker ? <IconAlertCircle size={16} /> : <IconAlertTriangle size={16} />}
                                    sx={{
                                      py: 0.25,
                                      px: 1,
                                      mt: 0.5,
                                      '& .MuiAlert-message': { fontSize: '0.75rem', py: 0.5 },
                                      '& .MuiAlert-icon': { py: 0.5, mr: 1 }
                                    }}
                                    action={
                                      !isBlocker ? (
                                        <Button size="small" color="inherit" onClick={handleOverride} sx={{ textTransform: 'none', py: 0, height: 20 }}>
                                          Override
                                        </Button>
                                      ) : undefined
                                    }
                                  >
                                    {outcome.explanation}
                                  </Alert>
                                );
                              }
                            })}
                          </Box>
                        );
                      })}
                    </Box>
                </Paper>
              )}
            </Stack>
          )}
          </Box>

          {selectedJobId && (
            <Box
              sx={{
                flexShrink: 0,
                px: { xs: 2, lg: 2.5 },
                py: 1.5,
                borderTop: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                flexWrap: 'wrap',
                boxShadow: '0 -4px 12px rgba(0,0,0,0.04)',
              }}
            >
              <Box sx={{ flex: 1 }} />
              <Button
                variant="contained"
                color="primary"
                startIcon={<IconCheck size={18} />}
                onClick={confirmFields}
                disabled={confirmLoading || reviewStatus === 'seeded' || extractLoading}
              >
                {confirmLoading
                  ? 'Confirming…'
                  : allRecords.length > 1
                    ? (confirmedIndexes.size + (confirmedIndexes.has(selectedRecordIndex) ? 0 : 1) >= allRecords.length
                      ? 'Confirm Last Record'
                      : 'Confirm Record & Next')
                    : 'Confirm Fields'}
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<IconDatabase size={18} />}
                onClick={seedRecords}
                disabled={seedLoading || reviewStatus !== 'ready_to_seed' || !!rulesData?.has_blockers || extractLoading}
              >
                {seedLoading ? 'Seeding…' : 'Seed to Records'}
              </Button>
            </Box>
          )}
          </Box>

          {selectedJobId && jobImageUrl && (
            <Box
              onMouseDown={startImagePanelResize}
              sx={{
                display: { xs: 'none', lg: 'flex' },
                order: { lg: 2 },
                width: '7px',
                flexShrink: 0,
                cursor: 'col-resize',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'divider',
                '&:hover': { bgcolor: 'primary.main' },
                color: 'background.paper',
              }}
            >
              <IconGripVertical size={14} />
            </Box>
          )}

          {selectedJobId && jobImageUrl && (
            <Box
              sx={{
                order: { lg: 1 },
                width: { xs: '100%', lg: imagePanelWidth },
                flexShrink: 0,
                borderTop: { xs: '1px solid', lg: 'none' },
                borderColor: 'divider',
                bgcolor: 'grey.100',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5}>
                  <Tooltip title="Zoom out">
                    <IconButton size="small" onClick={() => zoomTo(imageZoom - 25)}>
                      <IconZoomOut size={16} />
                    </IconButton>
                  </Tooltip>
                  <Slider
                    value={imageZoom}
                    onChange={(_, v) => zoomTo(v as number)}
                    min={25}
                    max={500}
                    step={5}
                    sx={{ width: 110 }}
                    size="small"
                  />
                  <Tooltip title="Zoom in">
                    <IconButton size="small" onClick={() => zoomTo(imageZoom + 25)}>
                      <IconZoomIn size={16} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Fit to panel">
                    <IconButton size="small" onClick={() => { zoomAnchorRef.current = null; setImageZoom(100); }}>
                      <IconMaximize size={16} />
                    </IconButton>
                  </Tooltip>
                  <Typography variant="caption" sx={{ minWidth: 36, textAlign: 'right' }}>{imageZoom}%</Typography>
                </Stack>
              </Box>

              <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {useRecordSnippet ? 'Record snippet' : 'Original source image'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap title={selectedJob?.filename}>
                      {useRecordSnippet && allRecords.length > 1
                        ? `Record ${selectedRecordIndex + 1} of ${allRecords.length} · headers + row`
                        : selectedJob?.filename || `Job #${selectedJobId}`}
                      {useRecordSnippet ? ' · drag to pan · Ctrl+wheel zoom' : reviewCropBbox ? ' · original upload (overlays in record view)' : ' · drag to pan · Ctrl+wheel zoom'}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                    {useRecordSnippet && columnEdges.length > 0 && (
                      <Tooltip title="Toggle resizable column guides">
                        <IconButton
                          size="small"
                          color={showColumnGuides ? 'error' : 'default'}
                          onClick={() => setShowColumnGuides((v) => !v)}
                        >
                          <IconColumns size={18} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {columnBandsOverride && useRecordSnippet && (
                      <Tooltip title="Reset column guides">
                        <IconButton size="small" onClick={() => setColumnBandsOverride(null)}>
                          <IconRestore size={18} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {!useRecordSnippet && (
                      <Button
                        size="small"
                        variant={drawMode ? "contained" : "outlined"}
                        color={drawMode ? "error" : "primary"}
                        sx={{ textTransform: 'none' }}
                        onClick={() => {
                          setDrawMode((v) => !v);
                          if (!drawMode) {
                            setRecordBox(null);
                            setDrawingBox({ x0: 0, y0: 0, x1: 0, y1: 0, active: false });
                          }
                        }}
                      >
                        {drawMode ? 'Cancel Drawing' : 'Define Record Box'}
                      </Button>
                    )}
                    <Tooltip title="Rotate counter-clockwise">
                      <IconButton
                        size="small"
                        onClick={async () => {
                          const newRot = (rotation - 90 + 360) % 360;
                          setRotation(newRot);
                          const page = jobDetail?.pages?.[0];
                          if (page?.pageId && churchId && selectedJobId) {
                            try {
                              await apiClient.post(`/api/church/${churchId}/ocr/jobs/${selectedJobId}/pages/${page.pageId}/rotate`, { rotation: newRot });
                            } catch (e) { console.warn('Failed to persist rotation', e); }
                          }
                        }}
                        color="primary"
                      >
                        <IconRotate size={18} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Rotate clockwise">
                      <IconButton
                        size="small"
                        onClick={async () => {
                          const newRot = (rotation + 90) % 360;
                          setRotation(newRot);
                          const page = jobDetail?.pages?.[0];
                          if (page?.pageId && churchId && selectedJobId) {
                            try {
                              await apiClient.post(`/api/church/${churchId}/ocr/jobs/${selectedJobId}/pages/${page.pageId}/rotate`, { rotation: newRot });
                            } catch (e) { console.warn('Failed to persist rotation', e); }
                          }
                        }}
                        color="primary"
                      >
                        <IconRotateClockwise size={18} />
                      </IconButton>
                    </Tooltip>
                    {rotation !== 0 && (
                      <Tooltip title="Reprocess image with this rotation applied">
                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          sx={{ textTransform: 'none', ml: 0.5 }}
                          onClick={async () => {
                            const page = jobDetail?.pages?.[0];
                            if (page?.pageId && churchId && selectedJobId) {
                              try {
                                await apiClient.post(`/api/church/${churchId}/ocr/jobs/${selectedJobId}/pages/${page.pageId}/rotate`, { rotation, reprocess: true });
                                setMapHint(`Reprocessing job with ${rotation}° rotation applied.`);
                              } catch (e) { console.warn('Failed to trigger reprocessing', e); }
                            }
                          }}
                        >
                          Reprocess ({rotation}°)
                        </Button>
                      </Tooltip>
                    )}
                    {reviewCropBbox && (
                      <Button
                        size="small"
                        variant="outlined"
                        sx={{ textTransform: 'none' }}
                        onClick={() => setUseFullPageImage((v) => !v)}
                      >
                        {useFullPageImage ? 'Record snippet' : 'Full page'}
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Box>

              {columnBandsOverride && (
                <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'warning.light', color: 'warning.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="caption" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    ⚠️ Layout modified · Not saved
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      onClick={handleApplyColumnOverride}
                      sx={{ textTransform: 'none', py: 0.25 }}
                    >
                      Apply
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      color="secondary"
                      onClick={handleRerunExtraction}
                      disabled={rerunLoading}
                      sx={{ textTransform: 'none', py: 0.25 }}
                    >
                      {rerunLoading ? <CircularProgress size={16} /> : 'Re-run'}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setTemplateName(`${recordType} Custom Template`);
                        setSaveTemplateDialogOpen(true);
                      }}
                      sx={{ textTransform: 'none', py: 0.25, bgcolor: 'background.paper' }}
                    >
                      Save as Template
                    </Button>
                  </Stack>
                </Box>
              )}

              {fieldHighlightBoxes.length > 0 && (
                <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {fieldDefs
                    .filter((d) => fieldHighlightBoxes.some((b) => b.fieldKey === d.name))
                    .map((def) => {
                      const color = REVIEW_FIELD_COLORS[def.name] || '#1976d2';
                      const active = focusedField === def.name;
                      return (
                        <Chip
                          key={def.name}
                          size="small"
                          label={def.label}
                          onClick={() => setFocusedField(active ? null : def.name)}
                          sx={{
                            bgcolor: active ? color : `${color}22`,
                            color: active ? '#fff' : 'text.primary',
                            border: `1px solid ${color}`,
                            fontWeight: active ? 700 : 500,
                          }}
                        />
                      );
                    })}
                </Box>
              )}

              {(drawMode || mapMode || mapHint) && (
                <Box sx={{ px: 1.5, py: 0.75, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (drawMode || mapMode) ? 'action.hover' : 'background.paper' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconHandFinger size={16} />
                    <Typography variant="caption" sx={{ flex: 1 }}>
                      {drawMode
                        ? "Draw mode — Click and drag on the image scan to draw a box around the records."
                        : mapMode
                        ? `Map mode — click a region on the scan to add it to “${focusedField?.replace(/_/g, ' ')}”.`
                        : mapHint}
                    </Typography>
                    {drawMode && (
                      <Button size="small" sx={{ textTransform: 'none' }} onClick={() => { setDrawMode(false); setRecordBox(null); }}>Cancel</Button>
                    )}
                    {mapMode && (
                      <Button size="small" sx={{ textTransform: 'none' }} onClick={() => setFocusedField(null)}>Done</Button>
                    )}
                  </Stack>
                </Box>
              )}

              <Box
                ref={scrollRef}
                onMouseMove={onContainerMouseMove}
                onMouseUp={onContainerMouseUp}
                onMouseLeave={onContainerMouseUp}
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  p: 1.5,
                  cursor: 'grab',
                  '&:active': { cursor: 'grabbing' },
                }}
              >
                {artifactsLoading && (
                  <Box sx={{ position: 'absolute', top: 60, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress size={22} />
                  </Box>
                )}
                {!imageLoadFailed ? (
                  <Box
                    ref={wrapperRef}
                    onMouseDown={onImageMouseDown}
                    sx={{
                      position: 'relative',
                      width: `${imageZoom}%`,
                      maxWidth: 'none',
                      mx: 'auto',
                      transform: rotation ? `rotate(${rotation}deg)` : 'none',
                      transformOrigin: 'center center',
                      transition: 'transform 0.2s ease-in-out',
                    }}
                  >
                    <Box
                      component="img"
                      ref={imageRef}
                      src={jobImageUrl}
                      alt={selectedJob?.filename || `OCR job ${selectedJobId}`}
                      draggable={false}
                      onError={() => {
                        if (!useFullPageImage && reviewCropBbox) {
                          setUseFullPageImage(true);
                        } else {
                          setImageLoadFailed(true);
                        }
                      }}
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        setImageDimensions({
                          width: img.clientWidth,
                          height: img.clientHeight,
                          naturalWidth: img.naturalWidth,
                          naturalHeight: img.naturalHeight,
                        });
                        setImageReady(true);
                      }}
                      sx={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                        borderRadius: 1,
                        boxShadow: 2,
                        bgcolor: 'background.paper',
                        userSelect: 'none',
                      }}
                    />

                    {/* Visual selection box while drawing or drawn */}
                    {drawMode && (drawingBox.active || recordBox) && (
                      <Box
                        sx={{
                          position: 'absolute',
                          left: `${Math.min(drawingBox.x0, drawingBox.x1) * 100}%`,
                          top: `${Math.min(drawingBox.y0, drawingBox.y1) * 100}%`,
                          width: `${Math.abs(drawingBox.x1 - drawingBox.x0) * 100}%`,
                          height: `${Math.abs(drawingBox.y1 - drawingBox.y0) * 100}%`,
                          border: '3px dashed #e53935',
                          backgroundColor: 'rgba(229, 57, 53, 0.15)',
                          pointerEvents: 'none',
                          zIndex: 9,
                        }}
                      />
                    )}

                    {imageReady && useRecordSnippet && visionPageSize.width > 0 && (fieldHighlightBoxes.length > 0 || cellTokenOverlays.length > 0) && (
                      <FusionOverlay
                        key={`${selectedJobId}-${candidateIndex}-${imageZoom}-${focusedField}-${columnBandsOverride ? 'ov' : 'def'}`}
                        boxes={fieldHighlightBoxes}
                        ocrTokens={mapMode ? cellTokenOverlays : []}
                        onTokenClick={handleTokenClick}
                        imageElement={imageRef.current}
                        visionWidth={visionPageSize.width}
                        visionHeight={visionPageSize.height}
                        showLabels
                      />
                    )}

                    {/* Draggable red column guides (snippet) */}
                    {imageReady && showColumnGuides && useRecordSnippet && columnEdges.map((edge, i) => (
                      <Box
                        key={`${edge.leftKey}-${edge.rightKey}-${i}`}
                        onMouseDown={(e) => onBoundaryMouseDown(e, edge.leftKey, edge.rightKey)}
                        sx={{
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          left: `${edge.sx * 100}%`,
                          width: 0,
                          borderLeft: '2px solid',
                          borderColor: 'error.main',
                          opacity: 0.7,
                          cursor: 'col-resize',
                          zIndex: 8,
                          '&::after': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: -5,
                            width: 12,
                          },
                          '&:hover': { opacity: 1, borderColor: 'error.dark' },
                        }}
                      />
                    ))}
                  </Box>
                ) : (
                  <Alert severity="warning" sx={{ m: 1 }}>
                    Could not load the document image for this job.
                  </Alert>
                )}
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      <Dialog open={saveTemplateDialogOpen} onClose={() => setSaveTemplateDialogOpen(false)}>
        <DialogTitle>Save as Reusable Template</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, minWidth: 300 }}>
            <TextField
              fullWidth
              label="Template Name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              disabled={saveTemplateLoading}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveTemplateDialogOpen(false)} disabled={saveTemplateLoading}>Cancel</Button>
          <Button onClick={handleSaveTemplate} variant="contained" disabled={saveTemplateLoading || !templateName.trim()}>
            {saveTemplateLoading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmLayoutDialogOpen} onClose={() => setConfirmLayoutDialogOpen(false)}>
        <DialogTitle>Define Record Region Layout</DialogTitle>
        <DialogContent>
          <Typography>
            You have outlined a record region within the scan:
            <br />
            <strong>Coordinates:</strong> X: {Math.round((recordBox?.x || 0) * 100)}%, Y: {Math.round((recordBox?.y || 0) * 100)}%, Width: {Math.round((recordBox?.width || 0) * 100)}%, Height: {Math.round((recordBox?.height || 0) * 100)}%
          </Typography>
          <Typography sx={{ mt: 2 }} color="text.secondary">
            Creating a template from this region will set it as the new default layout for this record type. The job will be restarted to extract records from this region.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setRecordBox(null); setConfirmLayoutDialogOpen(false); }} disabled={saveLayoutLoading}>Cancel</Button>
          <Button onClick={handleSaveDefinedLayout} color="primary" variant="contained" disabled={saveLayoutLoading}>
            {saveLayoutLoading ? <CircularProgress size={24} color="inherit" /> : 'Create Template & Re-process'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={pendingSeedJobIds !== null} onClose={() => !bulkSeeding && setPendingSeedJobIds(null)}>
        <DialogTitle>
          {pendingSeedJobIds && pendingSeedJobIds.length > 1
            ? `Seed ${pendingSeedJobIds.length} Jobs`
            : 'Seed Job to Records'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {pendingSeedJobIds && pendingSeedJobIds.length > 1
              ? `Seed ${pendingSeedJobIds.length} reviewed jobs into church records?`
              : `Seed Job #${pendingSeedJobIds?.[0]} into church records?`}
            {' '}Only jobs marked Ready to Seed will be written to the records database.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingSeedJobIds(null)} disabled={bulkSeeding}>Cancel</Button>
          <Button
            onClick={() => pendingSeedJobIds && handleBulkSeedJobs(pendingSeedJobIds)}
            color="success"
            variant="contained"
            disabled={bulkSeeding}
          >
            {bulkSeeding ? <CircularProgress size={24} color="inherit" /> : 'Seed to Records'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={pendingDeleteJobIds !== null} onClose={() => setPendingDeleteJobIds(null)}>
        <DialogTitle>
          {pendingDeleteJobIds && pendingDeleteJobIds.length > 1
            ? `Delete ${pendingDeleteJobIds.length} Jobs`
            : 'Delete Job Completely'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {pendingDeleteJobIds && pendingDeleteJobIds.length > 1
              ? `Are you sure you want to delete ${pendingDeleteJobIds.length} selected jobs completely?`
              : `Are you sure you want to delete Job #${pendingDeleteJobIds?.[0]} completely?`}
            {' '}This will permanently remove the job metadata, all extracted records, draft records, and uploaded files from the server. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDeleteJobIds(null)} disabled={deletingJobs}>Cancel</Button>
          <Button
            onClick={() => pendingDeleteJobIds && handleDeleteJobs(pendingDeleteJobIds)}
            color="error"
            variant="contained"
            disabled={deletingJobs}
          >
            {deletingJobs ? <CircularProgress size={24} color="inherit" /> : 'Delete Completely'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OcrReviewPage;
