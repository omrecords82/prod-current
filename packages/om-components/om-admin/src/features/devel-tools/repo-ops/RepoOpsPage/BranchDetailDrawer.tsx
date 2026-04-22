/**
 * BranchDetailDrawer — Right-side drawer showing full branch details,
 * operator notes, recommended action, and action buttons.
 * Extracted from RepoOpsPage.tsx
 */
import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  TextField,
  Drawer,
  Divider,
  Tooltip,
  Alert,
  IconButton,
} from '@mui/material';
import {
  IconGitBranch,
  IconX,
  IconCalendar,
  IconGitMerge,
  IconDeviceDesktop,
  IconArchive,
  IconAlertTriangle,
  IconTrash,
  IconParking,
} from '@tabler/icons-react';
import type { RemoteBranch, BranchAnalysis, BranchClassification, BranchSource } from './types';
import { SOURCE_CONFIG } from './constants';

interface BranchDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedBranch: RemoteBranch | null;
  analysis: BranchAnalysis | null;
  isDark: boolean;
  fontFamily: string;
  labelColor: string;
  textColor: string;
  cardBorder: string;
  subBg: string;
  classChip: (cls: BranchClassification) => Record<string, string>;
  sourceChip: (source: BranchSource) => { bg: string; color: string };
  classExplanation: (branch: RemoteBranch) => string;
  safeDeleteClassifications: BranchClassification[];
  // Note editing
  editingNote: boolean;
  setEditingNote: (v: boolean) => void;
  noteText: string;
  setNoteText: (v: string) => void;
  savingNote: boolean;
  handleSaveNote: (branch: RemoteBranch) => void;
  // Actions
  deleting: boolean;
  merging: boolean;
  openDeleteDialog: (branch: RemoteBranch) => void;
  openMergeDialog: (branch: RemoteBranch) => void;
}

const BranchDetailDrawer: React.FC<BranchDetailDrawerProps> = ({
  open,
  onClose,
  selectedBranch,
  analysis,
  isDark,
  fontFamily: f,
  labelColor,
  textColor,
  cardBorder,
  subBg,
  classChip,
  sourceChip,
  classExplanation,
  safeDeleteClassifications,
  editingNote,
  setEditingNote,
  noteText,
  setNoteText,
  savingNote,
  handleSaveNote,
  deleting,
  merging,
  openDeleteDialog,
  openMergeDialog,
}) => {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 440 }, bgcolor: isDark ? '#1a1a2e' : '#fff' } }}
    >
      {selectedBranch && (
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconGitBranch size={20} color={textColor} />
              <Typography sx={{ fontFamily: f, fontSize: '1rem', fontWeight: 600, color: textColor }}>Branch Details</Typography>
            </Box>
            <IconButton size="small" onClick={onClose}>
              <IconX size={18} />
            </IconButton>
          </Box>

          {/* Branch name */}
          <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor, mb: 0.5 }}>Branch Name</Typography>
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2, fontFamily: 'monospace', fontSize: '0.8125rem', color: textColor, bgcolor: subBg, borderColor: cardBorder, wordBreak: 'break-all' }}>
            {selectedBranch.name}
          </Paper>

          {/* Classification + Source + Confidence */}
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor, mb: 0.5 }}>Classification</Typography>
              <Chip
                label={selectedBranch.classification}
                sx={{ fontFamily: f, fontSize: '0.8125rem', fontWeight: 600, ...classChip(selectedBranch.classification) }}
              />
            </Box>
            <Box>
              <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor, mb: 0.5 }}>Source</Typography>
              <Chip
                size="small"
                label={SOURCE_CONFIG[selectedBranch.source]?.label || selectedBranch.source}
                sx={{ fontFamily: f, fontSize: '0.75rem', fontWeight: 500, height: 28, bgcolor: sourceChip(selectedBranch.source).bg, color: sourceChip(selectedBranch.source).color }}
              />
            </Box>
            {selectedBranch.confidence && (
              <Box>
                <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor, mb: 0.5 }}>Confidence</Typography>
                <Chip
                  size="small"
                  label={selectedBranch.confidence}
                  sx={{
                    fontFamily: f, fontSize: '0.75rem', fontWeight: 600, height: 28, textTransform: 'capitalize',
                    bgcolor: selectedBranch.confidence === 'high' ? (isDark ? 'rgba(22,163,74,0.15)' : '#dcfce7')
                      : selectedBranch.confidence === 'medium' ? (isDark ? 'rgba(217,119,6,0.15)' : '#fef3c7')
                      : (isDark ? 'rgba(220,38,38,0.15)' : '#fee2e2'),
                    color: selectedBranch.confidence === 'high' ? (isDark ? '#4ade80' : '#16a34a')
                      : selectedBranch.confidence === 'medium' ? (isDark ? '#fbbf24' : '#d97706')
                      : (isDark ? '#f87171' : '#dc2626'),
                  }}
                />
              </Box>
            )}
          </Box>

          {/* Comparison target */}
          <Paper sx={{ p: 1.5, mb: 2, borderRadius: 1.5, bgcolor: isDark ? 'rgba(96,165,250,0.06)' : '#eff6ff', border: `1px solid ${isDark ? 'rgba(96,165,250,0.15)' : '#dbeafe'}` }}>
            <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: isDark ? '#93c5fd' : '#2563eb' }}>
              Compared against <strong>{analysis?.comparisonTarget}</strong> ({analysis?.originMainSha})
            </Typography>
          </Paper>

          <Divider sx={{ my: 2 }} />

          {/* Commit Info */}
          <Typography sx={{ fontFamily: f, fontSize: '0.875rem', fontWeight: 600, color: textColor, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <IconCalendar size={16} /> Commit Information
          </Typography>
          <Box sx={{ display: 'grid', gap: 1.5, mb: 2 }}>
            <Box>
              <Typography sx={{ fontFamily: f, fontSize: '0.625rem', color: labelColor, textTransform: 'uppercase' }}>Last Commit</Typography>
              <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', color: textColor }}>{selectedBranch.lastCommitDate}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontFamily: f, fontSize: '0.625rem', color: labelColor, textTransform: 'uppercase' }}>Message</Typography>
              <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', color: textColor }}>{selectedBranch.lastCommit}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontFamily: f, fontSize: '0.625rem', color: labelColor, textTransform: 'uppercase' }}>SHA / Merge Base</Typography>
              <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: textColor }}>{selectedBranch.lastCommitSha} / {selectedBranch.mergeBase}</Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Relationship */}
          <Typography sx={{ fontFamily: f, fontSize: '0.875rem', fontWeight: 600, color: textColor, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <IconGitMerge size={16} /> Branch Relationship vs origin/main
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
            <Paper sx={{ p: 2, borderRadius: 1.5, bgcolor: subBg, textAlign: 'center' }}>
              <Typography sx={{ fontFamily: f, fontSize: '0.625rem', color: labelColor, textTransform: 'uppercase', mb: 0.5 }}>Ahead</Typography>
              <Typography sx={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 700, color: selectedBranch.ahead > 0 ? (isDark ? '#4ade80' : '#16a34a') : labelColor }}>
                {selectedBranch.ahead}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, borderRadius: 1.5, bgcolor: subBg, textAlign: 'center' }}>
              <Typography sx={{ fontFamily: f, fontSize: '0.625rem', color: labelColor, textTransform: 'uppercase', mb: 0.5 }}>Behind</Typography>
              <Typography sx={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 700, color: selectedBranch.behind > 0 ? (isDark ? '#f87171' : '#dc2626') : labelColor }}>
                {selectedBranch.behind}
              </Typography>
            </Paper>
          </Box>

          {selectedBranch.changedFiles > 0 && (
            <Paper sx={{ p: 2, borderRadius: 1.5, bgcolor: subBg, mb: 2 }}>
              <Typography sx={{ fontFamily: f, fontSize: '0.625rem', color: labelColor, textTransform: 'uppercase', mb: 0.5 }}>Changed Files</Typography>
              <Typography sx={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 700, color: textColor }}>{selectedBranch.changedFiles}</Typography>
            </Paper>
          )}

          {/* Local tracking info */}
          {selectedBranch.hasLocal && (
            <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb', mb: 2, border: `1px solid ${cardBorder}` }}>
              <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor }}>
                <IconDeviceDesktop size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Local branch exists{selectedBranch.isCurrent ? ' (currently checked out)' : ''}
              </Typography>
            </Paper>
          )}

          {/* Operator Note */}
          <Divider sx={{ my: 2 }} />
          <Typography sx={{ fontFamily: f, fontSize: '0.875rem', fontWeight: 600, color: textColor, mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <IconArchive size={16} /> Operator Note
          </Typography>
          {editingNote ? (
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                maxRows={4}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="e.g. Parked OCR feature work — do not delete"
                inputProps={{ maxLength: 500 }}
                sx={{ mb: 1, '& .MuiInputBase-input': { fontFamily: f, fontSize: '0.8125rem' } }}
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  disabled={savingNote}
                  onClick={() => handleSaveNote(selectedBranch)}
                  sx={{ fontFamily: f, textTransform: 'none', fontSize: '0.75rem' }}
                >
                  {savingNote ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  size="small"
                  onClick={() => setEditingNote(false)}
                  disabled={savingNote}
                  sx={{ fontFamily: f, textTransform: 'none', fontSize: '0.75rem' }}
                >
                  Cancel
                </Button>
                {selectedBranch.note && (
                  <Button
                    size="small"
                    color="error"
                    disabled={savingNote}
                    onClick={() => { setNoteText(''); handleSaveNote(selectedBranch); }}
                    sx={{ fontFamily: f, textTransform: 'none', fontSize: '0.75rem', ml: 'auto' }}
                  >
                    Remove
                  </Button>
                )}
              </Box>
            </Box>
          ) : (
            <Box sx={{ mb: 2 }}>
              {selectedBranch.note ? (
                <Paper sx={{ p: 1.5, borderRadius: 1.5, bgcolor: isDark ? 'rgba(14,165,233,0.06)' : '#f0f9ff', border: `1px solid ${isDark ? 'rgba(14,165,233,0.15)' : '#bae6fd'}`, mb: 1 }}>
                  <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', color: textColor, whiteSpace: 'pre-wrap' }}>
                    {selectedBranch.note}
                  </Typography>
                  {selectedBranch.noteUpdated && (
                    <Typography sx={{ fontFamily: f, fontSize: '0.625rem', color: labelColor, mt: 0.5 }}>
                      Updated {new Date(selectedBranch.noteUpdated).toLocaleDateString()}
                    </Typography>
                  )}
                </Paper>
              ) : (
                <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', color: labelColor, fontStyle: 'italic', mb: 1 }}>
                  No operator note
                </Typography>
              )}
              <Button
                size="small"
                variant="text"
                onClick={() => { setNoteText(selectedBranch.note || ''); setEditingNote(true); }}
                sx={{ fontFamily: f, textTransform: 'none', fontSize: '0.7rem', color: labelColor, p: 0 }}
              >
                {selectedBranch.note ? 'Edit note' : 'Add note'}
              </Button>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Recommended Action */}
          <Typography sx={{ fontFamily: f, fontSize: '0.875rem', fontWeight: 600, color: textColor, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <IconAlertTriangle size={16} /> Recommended Action
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, borderColor: cardBorder, mb: 2 }}>
            <Typography sx={{ fontFamily: f, fontSize: '0.875rem', fontWeight: 600, color: textColor, mb: 0.5 }}>
              {selectedBranch.recommendedAction}
            </Typography>
            <Typography sx={{ fontFamily: f, fontSize: '0.8125rem', color: labelColor }}>
              {classExplanation(selectedBranch)}
            </Typography>
          </Paper>

          {/* Info for parked work branches */}
          {selectedBranch.classification === 'Parked Work' && (
            <Alert
              severity="info"
              icon={<IconParking size={18} />}
              sx={{ mb: 2, fontFamily: f, fontSize: '0.8125rem' }}
            >
              This is a large feature branch with {selectedBranch.ahead} unique commits and minimal divergence from main ({selectedBranch.behind} behind).
              It can be rebased cleanly when ready to resume work.
            </Alert>
          )}

          {/* Warning for stale/diverged branches */}
          {selectedBranch.classification === 'Stale / Diverged' && (
            <Alert
              severity="error"
              icon={<IconAlertTriangle size={18} />}
              sx={{ mb: 2, fontFamily: f, fontSize: '0.8125rem' }}
            >
              This branch is stale or significantly diverged from main.
              {selectedBranch.commitAgeDays > 14 && ` Last commit was ${selectedBranch.commitAgeDays} days ago.`}
              {selectedBranch.behind >= 20 && ` It is ${selectedBranch.behind} commits behind main.`}
              {' '}Rebasing is unlikely to succeed cleanly — consider deleting and re-branching if the work is still needed.
            </Alert>
          )}

          {/* Warning for manual review branches */}
          {selectedBranch.classification === 'Manual Review' && (
            <Alert
              severity="warning"
              icon={<IconAlertTriangle size={18} />}
              sx={{ mb: 2, fontFamily: f, fontSize: '0.8125rem' }}
            >
              This branch is in an unusual state. Review carefully before proceeding.
            </Alert>
          )}

          {/* Action buttons */}
          <Box sx={{ display: 'grid', gap: 1, mt: 3 }}>
            {safeDeleteClassifications.includes(selectedBranch.classification) ? (
              <Button
                variant="contained"
                fullWidth
                startIcon={<IconTrash size={16} />}
                onClick={() => openDeleteDialog(selectedBranch)}
                disabled={deleting}
                sx={{
                  fontFamily: f, textTransform: 'none', fontSize: '0.875rem',
                  bgcolor: isDark ? 'rgba(139,92,246,0.8)' : '#7c3aed',
                  '&:hover': { bgcolor: isDark ? 'rgba(139,92,246,0.95)' : '#6d28d9' },
                }}
              >
                Delete Branch
              </Button>
            ) : selectedBranch.recommendedAction === 'Merge' && selectedBranch.behind === 0 && selectedBranch.ahead > 0 ? (
              <Button
                variant="contained"
                fullWidth
                startIcon={<IconGitMerge size={16} />}
                onClick={() => openMergeDialog(selectedBranch)}
                disabled={merging}
                sx={{
                  fontFamily: f, textTransform: 'none', fontSize: '0.875rem',
                  bgcolor: isDark ? 'rgba(34,197,94,0.8)' : '#16a34a',
                  '&:hover': { bgcolor: isDark ? 'rgba(34,197,94,0.95)' : '#15803d' },
                }}
              >
                Merge Branch
              </Button>
            ) : (
              <>
                <Button
                  variant="contained"
                  fullWidth
                  disabled
                  sx={{ fontFamily: f, textTransform: 'none', fontSize: '0.875rem' }}
                >
                  {selectedBranch.recommendedAction === 'Merge' && 'Merge Branch'}
                  {selectedBranch.recommendedAction === 'Review' && 'Review Changes'}
                  {selectedBranch.recommendedAction === 'Rebase' && 'Rebase Branch'}
                  {selectedBranch.recommendedAction === 'Archive' && 'Archive Branch'}
                  {selectedBranch.recommendedAction === 'Push' && 'Push to Remote'}
                  {selectedBranch.recommendedAction === 'Delete' && 'Delete Branch'}
                </Button>
                <Typography sx={{ fontFamily: f, fontSize: '0.6875rem', color: labelColor, textAlign: 'center' }}>
                  This action is not yet available — use git CLI for now
                </Typography>
              </>
            )}
          </Box>
        </Box>
      )}
    </Drawer>
  );
};

export default BranchDetailDrawer;
