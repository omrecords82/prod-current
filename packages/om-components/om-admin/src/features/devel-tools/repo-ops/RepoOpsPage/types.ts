export type BranchClassification = 'Already Merged' | 'Safe To Delete' | 'Fast-Forward Safe' | 'Needs Rebase' | 'Parked Work' | 'Stale / Diverged' | 'Manual Review';
export type RecommendedAction = 'Delete' | 'Merge' | 'Review' | 'Rebase' | 'Archive' | 'Push';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type BranchSource = 'remote' | 'local' | 'both';

export interface RemoteBranch {
  name: string;
  remoteRef: string;
  ahead: number;
  behind: number;
  lastCommit: string;
  lastCommitDate: string;
  lastCommitSha: string;
  changedFiles: number;
  classification: BranchClassification;
  recommendedAction: RecommendedAction;
  confidence: ConfidenceLevel;
  commitAgeDays: number;
  mergeBase: string;
  isMerged: boolean;
  hasLocal: boolean;
  isCurrent: boolean;
  source: BranchSource;
  note: string | null;
  noteUpdated: string | null;
}

export interface LocalOnlyBranch {
  name: string;
  ahead: number;
  behind: number;
  lastCommit: string;
  lastCommitDate: string;
  lastCommitSha: string;
  isCurrent: boolean;
  hasUnpushedCommits: boolean;
  isMerged: boolean;
  recommendedAction: RecommendedAction;
  source: 'local';
}

export interface BranchAnalysis {
  fetchOk: boolean;
  comparisonTarget: string;
  originMainSha: string;
  localContext: {
    currentBranch: string;
    headSha: string;
    isClean: boolean;
    trackingRemote: string | null;
  };
  remoteBranches: RemoteBranch[];
  localOnlyBranches: LocalOnlyBranch[];
  summary: {
    totalRemote: number;
    totalLocalOnly: number;
    alreadyMerged: number;
    safeToDelete: number;
    fastForwardSafe: number;
    needsRebase: number;
    parkedWork: number;
    staleDiverged: number;
    manualReview: number;
  };
}
