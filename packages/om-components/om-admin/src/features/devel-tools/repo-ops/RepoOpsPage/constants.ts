import {
  IconTrash,
  IconGitMerge,
  IconEye,
  IconGitFork,
  IconArchive,
  IconUpload,
  IconCloud,
  IconDeviceDesktop,
  IconGitBranch,
} from '@tabler/icons-react';
import type { BranchClassification, RecommendedAction, BranchSource } from './types';

export const CLASSIFICATION_COLORS: Record<BranchClassification, { bg: string; bgDark: string; color: string; colorDark: string; border: string; borderDark: string }> = {
  'Already Merged': { bg: '#f3e8ff', bgDark: 'rgba(139,92,246,0.15)', color: '#7c3aed', colorDark: '#a78bfa', border: '#ddd6fe', borderDark: 'rgba(139,92,246,0.3)' },
  'Safe To Delete': { bg: '#f3e8ff', bgDark: 'rgba(139,92,246,0.12)', color: '#6d28d9', colorDark: '#c4b5fd', border: '#ddd6fe', borderDark: 'rgba(139,92,246,0.25)' },
  'Fast-Forward Safe': { bg: '#dcfce7', bgDark: 'rgba(34,197,94,0.15)', color: '#16a34a', colorDark: '#4ade80', border: '#bbf7d0', borderDark: 'rgba(34,197,94,0.3)' },
  'Needs Rebase': { bg: '#fef3c7', bgDark: 'rgba(245,158,11,0.15)', color: '#d97706', colorDark: '#fbbf24', border: '#fde68a', borderDark: 'rgba(245,158,11,0.3)' },
  'Parked Work': { bg: '#e0f2fe', bgDark: 'rgba(14,165,233,0.15)', color: '#0284c7', colorDark: '#38bdf8', border: '#bae6fd', borderDark: 'rgba(14,165,233,0.3)' },
  'Stale / Diverged': { bg: '#fce4ec', bgDark: 'rgba(233,30,99,0.15)', color: '#c62828', colorDark: '#ef9a9a', border: '#f8bbd0', borderDark: 'rgba(233,30,99,0.3)' },
  'Manual Review': { bg: '#fee2e2', bgDark: 'rgba(239,68,68,0.15)', color: '#dc2626', colorDark: '#f87171', border: '#fecaca', borderDark: 'rgba(239,68,68,0.3)' },
};

export const ACTION_ICONS: Record<RecommendedAction, React.ElementType> = {
  Delete: IconTrash,
  Merge: IconGitMerge,
  Review: IconEye,
  Rebase: IconGitFork,
  Archive: IconArchive,
  Push: IconUpload,
};

export const SOURCE_CONFIG: Record<BranchSource, { icon: React.ElementType; label: string }> = {
  remote: { icon: IconCloud, label: 'remote only' },
  local: { icon: IconDeviceDesktop, label: 'local only' },
  both: { icon: IconGitBranch, label: 'tracked' },
};
