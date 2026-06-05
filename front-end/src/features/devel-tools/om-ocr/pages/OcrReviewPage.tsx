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
import type { ChurchRecordFieldConfig } from '@/features/devel-tools/om-ocr/config/recordFields';
import FusionOverlay from '@/features/devel-tools/om-ocr/components/FusionOverlay';
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
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  InputAdornment,
  List,
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
} from '@mui/material';
import {
  IconArrowLeft,
  IconCheck,
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
  IconRobot,
  IconZoomIn,
  IconZoomOut,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

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
}

const STATUS_LABELS: Record<string, { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'info' }> = {
  uploaded: { label: 'Uploaded', color: 'default' },
  ocr_complete: { label: 'OCR Done', color: 'info' },
  agent_extracted: { label: 'Review Fields', color: 'warning' },
  ready_to_seed: { label: 'Ready to Seed', color: 'primary' },
  seeded: { label: 'In Records DB', color: 'success' },
  returned: { label: 'Returned', color: 'default' },
};

const OcrReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPortal = location.pathname.startsWith('/portal');
  const { churchId: churchIdParam, jobId: jobIdParam } = useParams<{ churchId: string; jobId: string }>();
  const { user } = useAuth();

  const churchId = useMemo(() => {
    if (churchIdParam) return Number(churchIdParam);
    return user?.church_id ? Number(user.church_id) : null;
  }, [churchIdParam, user?.church_id]);

  const selectedJobId = jobIdParam ? Number(jobIdParam) : null;

  const [jobs, setJobs] = useState<OcrJobRow[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [extractLoading, setExtractLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordType, setRecordType] = useState<string>('baptism');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [ocrPreview, setOcrPreview] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<PipelineStatus>('uploaded');
  const [extractMethod, setExtractMethod] = useState<string | null>(null);
  const [allRecords, setAllRecords] = useState<Array<Record<string, string>>>([]);
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
  const [mapHint, setMapHint] = useState<string | null>(null);
  const [jobsCollapsed, setJobsCollapsed] = useState(false);
  const [imagePanelWidth, setImagePanelWidth] = useState(560);
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

  const backPath = isPortal ? '/portal/upload' : '/devel/ocr-studio/upload';
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

    const nameKeys = ['child_name', 'groom_name', 'deceased_name', 'bride_name'];
    const recName = nameKeys.map((k) => rec[k]).find(Boolean);
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
  }, [recordCandidates, allRecords, selectedRecordIndex, fields]);

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
    } catch {
      setTableExtractionJson(null);
      setRecordCandidates(null);
      setScoringV2(null);
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

  const loadJobs = useCallback(async () => {
    if (!churchId) return;
    setJobsLoading(true);
    try {
      const res: any = await apiClient.get(`/api/church/${churchId}/ocr/jobs?limit=100`);
      const list: OcrJobRow[] = res?.data?.jobs || res?.jobs || [];
      setJobs(list.filter((j) => j.review_status !== 'seeded' || j.id === String(selectedJobId)));
    } catch {
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  }, [churchId, selectedJobId]);

  const loadExtract = useCallback(async (jobId: number) => {
    if (!churchId) return;
    setExtractLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get(`/api/church/${churchId}/ocr/jobs/${jobId}/agent-extract`);
      const data = res?.data ?? res;
      setReviewStatus(data.review_status || 'uploaded');
      setOcrPreview(data.ocr_text_preview || null);

      const extract = data.extract;
      const rt = extract?.record_type || 'baptism';
      if (rt && rt !== 'custom') setRecordType(rt);

      const records: Array<Record<string, string>> = Array.isArray(extract?.records) && extract.records.length
        ? extract.records
        : extract?.fields
          ? [extract.fields]
          : [];
      const idx = typeof extract?.candidate_index === 'number' ? extract.candidate_index : 0;
      setAllRecords(records);
      setSelectedRecordIndex(Math.min(idx, Math.max(records.length - 1, 0)));
      setExtractMethod(extract?.method || null);
      setNeedsReviewFlag(!!extract?.needs_review);
      setRefinementNotes(extract?.refinement_notes || null);
      setFields({ ...(records[idx] || extract?.fields || {}) });
      setConfirmedIndexes(new Set<number>(Array.isArray(extract?.confirmed_indexes) ? extract.confirmed_indexes : []));
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load extraction');
      setFields({});
    } finally {
      setExtractLoading(false);
    }
  }, [churchId]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

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
    try {
      const res: any = await apiClient.post(`/api/church/${churchId}/ocr/jobs/${selectedJobId}/agent-extract`);
      const extract = res?.data?.extract ?? res?.extract;
      if (extract?.record_type && extract.record_type !== 'custom') setRecordType(extract.record_type);
      const records: Array<Record<string, string>> = Array.isArray(extract?.records) && extract.records.length
        ? extract.records
        : extract?.fields ? [extract.fields] : [];
      const idx = typeof extract?.candidate_index === 'number' ? extract.candidate_index : 0;
      setAllRecords(records);
      setSelectedRecordIndex(Math.min(idx, Math.max(records.length - 1, 0)));
      setExtractMethod(extract?.method || null);
      setNeedsReviewFlag(!!extract?.needs_review);
      setRefinementNotes(extract?.refinement_notes || null);
      setFields({ ...(records[idx] || extract?.fields || {}) });
      setConfirmedIndexes(new Set<number>());
      setColumnBandsOverride(null);
      setReviewStatus('agent_extracted');
      await loadJobs();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Agent extraction failed');
    } finally {
      setExtractLoading(false);
    }
  };

  const confirmFields = async () => {
    if (!churchId || !selectedJobId) return;
    const updated = [...allRecords];
    if (updated.length) updated[selectedRecordIndex] = { ...fields };
    else updated.push({ ...fields });

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

      if (allDone) {
        setReviewStatus('ready_to_seed');
        setMapHint('All records confirmed — ready to seed.');
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

  if (!churchId) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>Missing church ID</Typography>
        <Button component={Link} to={backPath} startIcon={<IconArrowLeft size={18} />}>Back to Upload</Button>
      </Box>
    );
  }

  const statusCfg = STATUS_LABELS[reviewStatus] || { label: reviewStatus, color: 'default' as const };

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title={jobsCollapsed ? 'Show jobs list' : 'Hide jobs list'}>
          <IconButton size="small" onClick={() => setJobsCollapsed((v) => !v)}>
            {jobsCollapsed ? <IconLayoutSidebarLeftExpand size={20} /> : <IconLayoutSidebarLeftCollapse size={20} />}
          </IconButton>
        </Tooltip>
        <Button component={Link} to={backPath} startIcon={<IconArrowLeft size={16} />} size="small" sx={{ textTransform: 'none' }}>
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
            width: { xs: '100%', md: '33.333%' },
            minWidth: { md: 280 },
            maxWidth: { md: 400 },
            maxHeight: { xs: '40vh', md: 'none' },
            flexShrink: 0,
            borderRight: { md: '1px solid' },
            borderBottom: { xs: '1px solid', md: 'none' },
            borderColor: 'divider',
            overflow: 'auto',
          }}
        >
          <Box sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={700}>Jobs awaiting review</Typography>
              <Tooltip title="Hide jobs list">
                <IconButton size="small" onClick={() => setJobsCollapsed(true)}>
                  <IconLayoutSidebarLeftCollapse size={18} />
                </IconButton>
              </Tooltip>
            </Stack>
            {jobsLoading && <CircularProgress size={24} />}
            {!jobsLoading && jobs.length === 0 && (
              <Alert severity="info">No jobs in the pipeline. Upload images first.</Alert>
            )}
            <List dense disablePadding>
              {jobs.map((j) => {
                const cfg = STATUS_LABELS[j.review_status] || { label: j.review_status, color: 'default' as const };
                const active = selectedJobId === Number(j.id);
                return (
                  <ListItemButton
                    key={j.id}
                    selected={active}
                    onClick={() => navigate(`${reviewBase}/${j.id}`)}
                    sx={{ borderRadius: 1, mb: 0.5 }}
                  >
                    <ListItemText
                      primary={j.filename || `Job #${j.id}`}
                      secondary={new Date(j.created_at).toLocaleString()}
                      primaryTypographyProps={{ noWrap: true, fontSize: '0.85rem', fontWeight: active ? 700 : 500 }}
                    />
                    <Chip label={cfg.label} size="small" color={cfg.color} variant="outlined" />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        </Box>
        )}

        {/* Confirm panel + source image */}
        <Box ref={contentRowRef} sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, overflow: 'hidden' }}>
          <Box sx={{ flex: 1, minWidth: 0, overflow: 'auto', p: 2 }}>
          {!selectedJobId ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography color="text.secondary">Select a job from the queue to review extracted fields.</Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="h6" fontWeight={700}>Job #{selectedJobId}</Typography>
                <Chip label={statusCfg.label} color={statusCfg.color} size="small" />
                <Chip label={recordType} size="small" variant="outlined" />
                {extractMethod && (
                  <Chip
                    label={extractMethod === 'assembler' ? 'Table assembly' : extractMethod === 'llm_vision' ? 'AI vision' : extractMethod === 'llm' ? 'AI agent' : 'Heuristic'}
                    size="small"
                    color={extractMethod === 'assembler' ? 'success' : (extractMethod === 'llm' || extractMethod === 'llm_vision') ? 'primary' : 'default'}
                    variant="outlined"
                  />
                )}
              </Stack>

              {allRecords.length > 1 && (
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <FormControl size="small" sx={{ minWidth: 320, flex: 1 }}>
                    <InputLabel>Record on this page</InputLabel>
                    <Select
                      label="Record on this page"
                      value={selectedRecordIndex}
                      onChange={(e) => goToRecord(Number(e.target.value))}
                    >
                      {allRecords.map((rec, i) => (
                        <MenuItem key={i} value={i}>
                          {confirmedIndexes.has(i) ? '✓ ' : ''}
                          #{rec.record_number || i + 1} — {rec.child_name || rec.groom_name || rec.deceased_name || `Record ${i + 1}`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Chip
                    size="small"
                    color={confirmedIndexes.size >= allRecords.length ? 'success' : 'default'}
                    label={`${confirmedIndexes.size}/${allRecords.length} confirmed`}
                  />
                </Stack>
              )}

              {needsReviewFlag && (
                <Alert severity="warning">
                  This record may need manual review — some key fields could not be confidently mapped from the ledger layout.
                </Alert>
              )}

              {extractMethod === 'heuristic' && (
                <Alert severity="info">
                  Field mapping used basic text patterns. Click <strong>Re-run Agent</strong> to retry structured assembly and AI cleanup.
                </Alert>
              )}

              {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

              {(refinementNotes || ocrPreview || extractMethod) && (
                <Box>
                  <Button
                    size="small"
                    variant="text"
                    sx={{ textTransform: 'none', px: 0, mb: showDetailedInfo ? 1 : 0 }}
                    endIcon={showDetailedInfo ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                    onClick={() => setShowDetailedInfo((v) => !v)}
                  >
                    Detailed Information
                  </Button>
                  <Collapse in={showDetailedInfo}>
                    <Stack spacing={1.5}>
                      {extractMethod && (
                        <Typography variant="caption" color="text.secondary">
                          Extraction method: {extractMethod === 'assembler' ? 'Table assembly' : extractMethod === 'llm_vision' ? 'AI vision' : extractMethod === 'llm' ? 'AI agent' : 'Heuristic'}
                        </Typography>
                      )}
                      {(extractMethod === 'llm' || extractMethod === 'llm_vision') && refinementNotes && (
                        <Alert severity="info" sx={{ py: 0.5 }}>
                          {refinementNotes}
                        </Alert>
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
                <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress /></Box>
              ) : (
                <>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <IconRobot size={16} />
                      <Typography variant="subtitle2" fontWeight={700}>
                        Agent-extracted fields — edit and confirm
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                        gap: 2,
                      }}
                    >
                      {fieldDefs.map((def) => {
                        const fieldColor = REVIEW_FIELD_COLORS[def.name];
                        const isFocused = focusedField === def.name;
                        return (
                          <TextField
                            key={def.name}
                            fullWidth
                            size="small"
                            label={def.label}
                            required={def.required}
                            value={fields[def.name] || ''}
                            onChange={(e) => setFields((prev) => ({ ...prev, [def.name]: e.target.value }))}
                            onFocus={() => setFocusedField(def.name)}
                            multiline={def.type === 'textarea'}
                            minRows={def.type === 'textarea' ? 2 : 1}
                            sx={{
                              ...(def.type === 'textarea' ? { gridColumn: { sm: '1 / -1' } } : {}),
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
                                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: fieldColor, flexShrink: 0 }} />
                                </InputAdornment>
                              ),
                            } : undefined}
                          />
                        );
                      })}
                    </Box>
                  </Paper>

                  <Divider />

                  <Stack direction="row" spacing={1.5} flexWrap="wrap">
                    <Button
                      variant="outlined"
                      startIcon={<IconRefresh size={18} />}
                      onClick={runAgentExtract}
                      disabled={extractLoading}
                    >
                      Re-run Agent
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<IconCheck size={18} />}
                      onClick={confirmFields}
                      disabled={confirmLoading || reviewStatus === 'seeded'}
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
                      disabled={seedLoading || reviewStatus !== 'ready_to_seed'}
                    >
                      {seedLoading ? 'Seeding…' : 'Seed to Records'}
                    </Button>
                  </Stack>

                  <Typography variant="caption" color="text.secondary">
                    Flow: Upload → OCR → Agent extract → Confirm → Seed → view in Records Management (AG Grid)
                  </Typography>
                </>
              )}
            </Stack>
          )}
          </Box>

          {selectedJobId && jobImageUrl && (
            <Box
              onMouseDown={startImagePanelResize}
              sx={{
                display: { xs: 'none', lg: 'flex' },
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

              {fieldHighlightBoxes.length > 0 && (
                <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {fieldDefs
                    .filter((d) => fieldHighlightBoxes.some((b) => b.label === d.name.replace(/_/g, ' ')))
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

              {(mapMode || mapHint) && (
                <Box sx={{ px: 1.5, py: 0.75, borderBottom: '1px solid', borderColor: 'divider', bgcolor: mapMode ? 'action.hover' : 'background.paper' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconHandFinger size={16} />
                    <Typography variant="caption" sx={{ flex: 1 }}>
                      {mapMode
                        ? `Map mode — click a region on the scan to add it to “${focusedField?.replace(/_/g, ' ')}”.`
                        : mapHint}
                    </Typography>
                    {mapMode && (
                      <Button size="small" sx={{ textTransform: 'none' }} onClick={() => setFocusedField(null)}>Done</Button>
                    )}
                  </Stack>
                </Box>
              )}

              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 7,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  boxShadow: 2,
                  p: 0.75,
                }}
              >
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
                  sx={{ width: 90 }}
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
              </Box>

              <Box
                ref={scrollRef}
                onMouseMove={onContainerMouseMove}
                onMouseUp={onContainerMouseUp}
                onMouseLeave={onContainerMouseUp}
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  p: 1.5,
                  pt: 6,
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
    </Box>
  );
};

export default OcrReviewPage;
