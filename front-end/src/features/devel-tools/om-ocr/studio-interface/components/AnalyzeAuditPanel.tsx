import React, { useMemo } from 'react';
import {
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { IconChevronDown, IconChevronUp, IconDownload } from '@tabler/icons-react';

export interface AnalyzeAuditRecommendation {
  priority: 'high' | 'medium' | 'low';
  issue: string;
  affectedFiles: number;
  affectedPct: number;
  recommendation: string;
  suggestedFix: string;
}

export interface AnalyzeAuditReport {
  sessionId: string | null;
  churchId: number;
  generatedAt: string;
  rootPath?: string;
  recursive?: boolean;
  summary: {
    totalFiles: number;
    analyzed: number;
    failed: number;
    passedQuality: number;
    needsReview: number;
    avgQualityScore: number;
    issueCounts: Record<string, number>;
    autoFixCounts: Record<string, number>;
    recordTypeCounts: Record<string, number>;
    subdirectoryCount: number;
  };
  bySubdirectory: Array<{
    path: string;
    fileCount: number;
    passedQuality: number;
    avgQualityScore: number;
    issueCounts: Record<string, number>;
  }>;
  files: Array<{
    id: string;
    relativePath: string;
    qualityScore?: number;
    qualityIssues?: string[];
    needsReview: boolean;
    error?: string;
  }>;
  systemRecommendations: AnalyzeAuditRecommendation[];
}

const ISSUE_LABELS: Record<string, string> = {
  image_mostly_black: 'Mostly black',
  low_ocr_confidence: 'Low OCR',
  low_text_detected: 'Little text',
  over_cropped: 'Over-cropped',
  split_regions_suspect: 'Bad split regions',
  orientation_uncertain: 'Orientation uncertain',
  low_classification_confidence: 'Type uncertain',
};

const PRIORITY_COLOR: Record<string, 'error' | 'warning' | 'default'> = {
  high: 'error',
  medium: 'warning',
  low: 'default',
};

interface AnalyzeAuditPanelProps {
  report: AnalyzeAuditReport | null;
  loading?: boolean;
  activeIssueFilter: string | null;
  onIssueFilter: (issue: string | null) => void;
}

export function AnalyzeAuditPanel({
  report,
  loading,
  activeIssueFilter,
  onIssueFilter,
}: AnalyzeAuditPanelProps) {
  const [expanded, setExpanded] = React.useState(true);
  const [showSubdirs, setShowSubdirs] = React.useState(false);

  const issueEntries = useMemo(() => {
    if (!report) return [];
    return Object.entries(report.summary.issueCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [report]);

  if (!report && !loading) return null;

  const handleExport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ocr-analyze-audit-${report.sessionId || 'session'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Paper variant="outlined" sx={{ mb: 3, p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: expanded ? 1.5 : 0 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Directory audit
        </Typography>
        {loading && (
          <Chip size="small" label="Updating…" color="info" variant="outlined" />
        )}
        {report && (
          <>
            <Chip
              size="small"
              label={`${report.summary.analyzed} analyzed`}
              variant="outlined"
            />
            <Chip
              size="small"
              label={`${report.summary.passedQuality} passed QA`}
              color="success"
              variant="outlined"
            />
            {report.summary.needsReview > 0 && (
              <Chip
                size="small"
                label={`${report.summary.needsReview} need review`}
                color="warning"
                variant="outlined"
              />
            )}
            {report.summary.failed > 0 && (
              <Chip
                size="small"
                label={`${report.summary.failed} failed`}
                color="error"
                variant="outlined"
              />
            )}
          </>
        )}
        <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
          {report && (
            <Button
              size="small"
              startIcon={<IconDownload size={16} />}
              onClick={handleExport}
              sx={{ textTransform: 'none' }}
            >
              Export JSON
            </Button>
          )}
          <IconButton size="small" onClick={() => setExpanded((v) => !v)} aria-label="Toggle audit panel">
            {expanded ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
          </IconButton>
        </Box>
      </Stack>

      <Collapse in={expanded}>
        {report && (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                label={`Avg QA ${Math.round(report.summary.avgQualityScore * 100)}%`}
                variant="outlined"
              />
              <Chip
                size="small"
                label={`${report.summary.subdirectoryCount} folders`}
                variant="outlined"
              />
              {report.rootPath && (
                <Chip size="small" label={report.rootPath} variant="outlined" sx={{ maxWidth: 320 }} />
              )}
            </Stack>

            {issueEntries.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Filter by issue (click to toggle)
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {issueEntries.map(([issue, count]) => (
                    <Chip
                      key={issue}
                      size="small"
                      label={`${ISSUE_LABELS[issue] || issue} (${count})`}
                      color={activeIssueFilter === issue ? 'primary' : 'warning'}
                      variant={activeIssueFilter === issue ? 'filled' : 'outlined'}
                      onClick={() => onIssueFilter(activeIssueFilter === issue ? null : issue)}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                  {activeIssueFilter && (
                    <Chip
                      size="small"
                      label="Clear filter"
                      variant="outlined"
                      onClick={() => onIssueFilter(null)}
                      sx={{ cursor: 'pointer' }}
                    />
                  )}
                </Stack>
              </Box>
            )}

            {report.systemRecommendations.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  System improvements
                </Typography>
                <Stack spacing={1}>
                  {report.systemRecommendations.map((rec) => (
                    <Paper key={`${rec.issue}-${rec.affectedFiles}`} variant="outlined" sx={{ p: 1.5 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <Chip
                          size="small"
                          label={rec.priority}
                          color={PRIORITY_COLOR[rec.priority]}
                        />
                        <Typography variant="body2" fontWeight={600}>
                          {rec.recommendation}
                        </Typography>
                        <Chip
                          size="small"
                          label={`${rec.affectedFiles} files (${rec.affectedPct}%)`}
                          variant="outlined"
                          sx={{ ml: 'auto' }}
                        />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        Suggested fix: {rec.suggestedFix}
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            )}

            {report.bySubdirectory.length > 1 && (
              <Box>
                <Button
                  size="small"
                  onClick={() => setShowSubdirs((v) => !v)}
                  sx={{ textTransform: 'none', mb: 1 }}
                >
                  {showSubdirs ? 'Hide' : 'Show'} subdirectory breakdown ({report.bySubdirectory.length})
                </Button>
                <Collapse in={showSubdirs}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Folder</TableCell>
                        <TableCell align="right">Files</TableCell>
                        <TableCell align="right">Passed QA</TableCell>
                        <TableCell align="right">Avg QA</TableCell>
                        <TableCell>Top issues</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {report.bySubdirectory.map((sub) => {
                        const topIssues = Object.entries(sub.issueCounts)
                          .filter(([, c]) => c > 0)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 3)
                          .map(([k, c]) => `${ISSUE_LABELS[k] || k} (${c})`)
                          .join(', ');
                        return (
                          <TableRow key={sub.path}>
                            <TableCell>{sub.path}</TableCell>
                            <TableCell align="right">{sub.fileCount}</TableCell>
                            <TableCell align="right">{sub.passedQuality}</TableCell>
                            <TableCell align="right">{Math.round(sub.avgQualityScore * 100)}%</TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary">
                                {topIssues || '—'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Collapse>
              </Box>
            )}
          </Stack>
        )}
      </Collapse>
    </Paper>
  );
}
