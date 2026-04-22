/**
 * RepoOpsPage/helpers.ts — Styling helpers and branch classification utilities.
 */

import type { BranchClassification, BranchSource, RemoteBranch } from './types';
import { CLASSIFICATION_COLORS } from './constants';

/* ------------------------------------------------------------------ */
/*  Styling shortcuts                                                  */
/* ------------------------------------------------------------------ */

export const FONT = "'Inter', sans-serif";

export const getThemeColors = (isDark: boolean) => ({
  cardBg: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
  cardBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
  labelColor: isDark ? '#9ca3af' : '#6b7280',
  textColor: isDark ? '#f3f4f6' : '#111827',
  subBg: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb',
});

export const getClassChipSx = (cls: BranchClassification, isDark: boolean) => {
  const c = CLASSIFICATION_COLORS[cls];
  if (!c) return {};
  return {
    bgcolor: isDark ? c.bgDark : c.bg,
    color: isDark ? c.colorDark : c.color,
    border: `1px solid ${isDark ? c.borderDark : c.border}`,
  };
};

export const getSourceChipSx = (source: BranchSource, isDark: boolean) => {
  const labelColor = isDark ? '#9ca3af' : '#6b7280';
  const colors: Record<BranchSource, { bg: string; color: string }> = {
    remote: { bg: isDark ? 'rgba(96,165,250,0.12)' : '#dbeafe', color: isDark ? '#93c5fd' : '#2563eb' },
    local: { bg: isDark ? 'rgba(251,191,36,0.12)' : '#fef3c7', color: isDark ? '#fbbf24' : '#d97706' },
    both: { bg: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', color: labelColor },
  };
  return colors[source] || colors.both;
};

/* ------------------------------------------------------------------ */
/*  Classification explanation text                                    */
/* ------------------------------------------------------------------ */

export const getClassExplanation = (branch: RemoteBranch): string => {
  switch (branch.classification) {
    case 'Already Merged':
      return `All commits on this branch are reachable from origin/main (merged). No unique work remains. Safe to delete from remote.`;
    case 'Safe To Delete':
      return `This branch has no unique commits ahead of origin/main and is behind by ${branch.behind} commit(s). It can be safely deleted.`;
    case 'Fast-Forward Safe':
      return `This branch has ${branch.ahead} unique commit(s) and is not behind origin/main. It can be merged with a fast-forward merge — no conflicts possible.`;
    case 'Needs Rebase':
      return `This branch has ${branch.ahead} unique commit(s) and is ${branch.behind} commit(s) behind origin/main. It has recent activity and a small divergence — rebase onto origin/main before merging.`;
    case 'Parked Work':
      return `This is a substantial feature branch with ${branch.ahead} unique commit(s) and only ${branch.behind} commit(s) behind origin/main. The divergence is trivial relative to the amount of work. This branch is viable and can be rebased cleanly when ready.`;
    case 'Stale / Diverged':
      return `This branch has ${branch.ahead} unique commit(s) but is ${branch.behind} commit(s) behind origin/main. ${branch.commitAgeDays > 14 ? `Last commit was ${branch.commitAgeDays} days ago (stale). ` : ''}${branch.behind >= 20 ? `Significantly diverged from main. ` : ''}It is unlikely to merge cleanly and is recommended for deletion or manual review.`;
    case 'Manual Review':
      return `This branch is in an unusual state that requires manual investigation before any action.`;
    default:
      return '';
  }
};
