/**
 * ArtifactInspector — Browse pipeline artifacts for the current job/page.
 * Shows artifact list, specialized views for known types, generic JSON for others.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
  Stack,
  CircularProgress,
  Divider,
  Paper,
  alpha,
  useTheme,
} from '@mui/material';
import {
  IconCrop,
  IconChartBar,
  IconFileText,
  IconEye,
  IconTable,
  IconGitCommit,
  IconArrowBack,
  IconPencil,
  IconFileCode,
} from '@tabler/icons-react';
import type { ScoringV2Result, BorderGeometry } from '../../types/pipeline';
import type { FeederPage } from '../../types/ocrJob';
import ScoringV2Panel from './ScoringV2Panel';

// ── Artifact type metadata ──────────────────────────────────────────────────

interface ArtifactTypeMeta {
  label: string;
  icon: React.ReactNode;
  color: string;
}

const ARTIFACT_TYPES: Record<string, ArtifactTypeMeta> = {
  border_geometry: { label: 'Border Detection', icon: <IconCrop size={16} />, color: '#7c4dff' },
  scoring_v2: { label: 'Scoring V2', icon: <IconChartBar size={16} />, color: '#00bcd4' },
  raw_text: { label: 'Raw OCR Text', icon: <IconFileText size={16} />, color: '#607d8b' },
  vision_json: { label: 'Vision API', icon: <IconEye size={16} />, color: '#ff9800' },
  table_extraction: { label: 'Table Extraction', icon: <IconTable size={16} />, color: '#4caf50' },
  record_candidates: { label: 'Record Candidates', icon: <IconFileCode size={16} />, color: '#2196f3' },
  record_candidates_provenance: { label: 'Provenance', icon: <IconFileCode size={16} />, color: '#9c27b0' },
  autocommit_plan: { label: 'Autocommit Plan', icon: <IconGitCommit size={16} />, color: '#ff5722' },
  autocommit_results: { label: 'Autocommit Results', icon: <IconGitCommit size={16} />, color: '#e91e63' },
  rollback_results: { label: 'Rollback Results', icon: <IconArrowBack size={16} />, color: '#f44336' },
  correction_log: { label: 'Corrections Log', icon: <IconPencil size={16} />, color: '#795548' },
  source_image: { label: 'Source Image', icon: <IconEye size={16} />, color: '#3f51b5' },
};

function getArtifactMeta(type: string): ArtifactTypeMeta {
  return ARTIFACT_TYPES[type] || { label: type, icon: <IconFileCode size={16} />, color: '#9e9e9e' };
}

// ── Props ───────────────────────────────────────────────────────────────────

interface ArtifactInspectorProps {
  page: FeederPage | null;
  scoringV2: ScoringV2Result | null;
  recordCandidates: any;
  tableExtraction: any;
  /** Called when user wants to highlight a bbox on the image viewer */
  onHighlightBbox?: (bbox: [number, number, number, number], label: string) => void;
}

// ── Available artifacts derived from page data ──────────────────────────────

interface AvailableArtifact {
  type: string;
  data: any;
  meta: ArtifactTypeMeta;
}

function deriveArtifacts(
  page: FeederPage | null,
  scoringV2: ScoringV2Result | null,
  recordCandidates: any,
  tableExtraction: any,
): AvailableArtifact[] {
  const artifacts: AvailableArtifact[] = [];

  if (scoringV2) {
    artifacts.push({ type: 'scoring_v2', data: scoringV2, meta: getArtifactMeta('scoring_v2') });
  }
  if (recordCandidates) {
    artifacts.push({ type: 'record_candidates', data: recordCandidates, meta: getArtifactMeta('record_candidates') });
  }
  if (tableExtraction) {
    artifacts.push({ type: 'table_extraction', data: tableExtraction, meta: getArtifactMeta('table_extraction') });
  }
  if (page?.rawText) {
    artifacts.push({ type: 'raw_text', data: page.rawText, meta: getArtifactMeta('raw_text') });
  }
  if (page?.meta) {
    artifacts.push({ type: 'page_meta', data: page.meta, meta: { label: 'Page Metadata', icon: <IconFileCode size={16} />, color: '#607d8b' } });
  }

  return artifacts;
}

// ── Component ───────────────────────────────────────────────────────────────

const ArtifactInspector: React.FC<ArtifactInspectorProps> = ({
  page,
  scoringV2,
  recordCandidates,
  tableExtraction,
  onHighlightBbox,
}) => {
  const theme = useTheme();
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const artifacts = useMemo(
    () => deriveArtifacts(page, scoringV2, recordCandidates, tableExtraction),
    [page, scoringV2, recordCandidates, tableExtraction],
  );

  // Auto-select first artifact
  useEffect(() => {
    if (artifacts.length > 0 && !selectedType) {
      setSelectedType(artifacts[0].type);
    }
  }, [artifacts, selectedType]);

  const selectedArtifact = artifacts.find((a) => a.type === selectedType) || null;

  if (!page) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Select a job to inspect artifacts
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left: Artifact list */}
      <Box
        sx={{
          width: 180,
          minWidth: 180,
          borderRight: '1px solid',
          borderColor: 'divider',
          overflow: 'auto',
        }}
      >
        <Typography variant="caption" fontWeight={600} sx={{ px: 1.5, pt: 1, display: 'block', color: 'text.secondary' }}>
          ARTIFACTS ({artifacts.length})
        </Typography>
        <List dense sx={{ py: 0.5 }}>
          {artifacts.map((art) => (
            <ListItemButton
              key={art.type}
              selected={selectedType === art.type}
              onClick={() => setSelectedType(art.type)}
              sx={{ py: 0.5, px: 1.5, borderRadius: 0 }}
            >
              <ListItemIcon sx={{ minWidth: 28, color: art.meta.color }}>
                {art.meta.icon}
              </ListItemIcon>
              <ListItemText
                primary={art.meta.label}
                primaryTypographyProps={{ variant: 'caption', fontWeight: selectedType === art.type ? 600 : 400 }}
              />
            </ListItemButton>
          ))}
        </List>
        {artifacts.length === 0 && (
          <Typography variant="caption" color="text.disabled" sx={{ p: 1.5 }}>
            No artifacts found
          </Typography>
        )}
      </Box>

      {/* Right: Detail view */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {selectedArtifact ? (
          <ArtifactDetailView artifact={selectedArtifact} onHighlightBbox={onHighlightBbox} />
        ) : (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Select an artifact to view details
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ── Detail View (switches by type) ─────────────────────────────────────────

interface ArtifactDetailViewProps {
  artifact: AvailableArtifact;
  onHighlightBbox?: (bbox: [number, number, number, number], label: string) => void;
}

const ArtifactDetailView: React.FC<ArtifactDetailViewProps> = ({ artifact, onHighlightBbox }) => {
  const { type, data } = artifact;

  // Specialized view for scoring_v2
  if (type === 'scoring_v2' && data) {
    return <ScoringV2Panel scoring={data as ScoringV2Result} onHighlightBbox={onHighlightBbox} />;
  }

  // Specialized view for raw text
  if (type === 'raw_text' && typeof data === 'string') {
    return (
      <Box sx={{ p: 1.5 }}>
        <Typography variant="caption" fontWeight={600} gutterBottom display="block">
          Raw OCR Text
        </Typography>
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 500,
            overflow: 'auto',
            bgcolor: 'action.hover',
          }}
        >
          {data}
        </Paper>
      </Box>
    );
  }

  // Specialized view for record_candidates — summary
  if (type === 'record_candidates' && data) {
    const rows = data?.rows || data?.candidates || [];
    return (
      <Box sx={{ p: 1.5 }}>
        <Typography variant="caption" fontWeight={600} gutterBottom display="block">
          Record Candidates ({Array.isArray(rows) ? rows.length : 0} rows)
        </Typography>
        <GenericJsonView data={data} />
      </Box>
    );
  }

  // Generic JSON viewer for everything else
  return (
    <Box sx={{ p: 1.5 }}>
      <Typography variant="caption" fontWeight={600} gutterBottom display="block">
        {artifact.meta.label}
      </Typography>
      <GenericJsonView data={data} />
    </Box>
  );
};

// ── Generic JSON Viewer ─────────────────────────────────────────────────────

const GenericJsonView: React.FC<{ data: any }> = ({ data }) => {
  const formatted = useMemo(() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data]);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        fontFamily: 'monospace',
        fontSize: '0.7rem',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        maxHeight: 500,
        overflow: 'auto',
        bgcolor: 'action.hover',
        lineHeight: 1.4,
      }}
    >
      {formatted}
    </Paper>
  );
};

export default ArtifactInspector;
