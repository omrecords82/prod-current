/**
 * Pipeline API helpers — typed fetch functions for OCR pipeline artifacts.
 *
 * Uses the existing apiClient from axiosInstance.
 * All paths auto-prefixed with /api by apiClient.
 */

import { apiClient } from '@/shared/lib/axiosInstance';
import type {
  ScoringV2Result,
  AutocommitPlan,
  AutocommitResults,
  CorrectionEvent,
  CorrectionsSummary,
  CommitBatch,
} from '../types/pipeline';

// ── Base path builder ───────────────────────────────────────────────────────

function ocrBase(churchId: number, jobId: number): string {
  return `/api/church/${churchId}/ocr/jobs/${jobId}`;
}

// ── Scoring V2 ──────────────────────────────────────────────────────────────

/**
 * Load scoring_v2 from job detail response (already returned inline).
 * This is a convenience wrapper that fetches the full job detail and extracts
 * the scoring_v2 from the first page.
 */
export async function fetchScoringV2(
  churchId: number,
  jobId: number,
): Promise<ScoringV2Result | null> {
  try {
    const res: any = await apiClient.get(`${ocrBase(churchId, jobId)}`);
    const pages = res?.data?.pages || res?.pages || [];
    return pages[0]?.scoringV2 || null;
  } catch {
    return null;
  }
}

// ── Autocommit ──────────────────────────────────────────────────────────────

export interface AutocommitOptions {
  forceIndices?: number[];
  thresholdOverrides?: Partial<{
    autoCommitRowThreshold: number;
    requiredProvenanceCoverage: number;
    minStructureScore: number;
  }>;
}

export interface AutocommitResponse {
  plan: AutocommitPlan;
  results: AutocommitResults;
  autocommit_batch_id: string;
  autocommit_committed: number;
  autocommit_skipped: number;
}

export async function triggerAutocommit(
  churchId: number,
  jobId: number,
  opts?: AutocommitOptions,
): Promise<AutocommitResponse> {
  const res: any = await apiClient.post(
    `${ocrBase(churchId, jobId)}/autocommit`,
    opts || {},
  );
  return res?.data || res;
}

// ── Commit Batches ──────────────────────────────────────────────────────────

export async function fetchCommitBatches(
  churchId: number,
  jobId: number,
): Promise<CommitBatch[]> {
  const res: any = await apiClient.get(
    `${ocrBase(churchId, jobId)}/review/commit-batches`,
  );
  return res?.data?.batches || res?.batches || [];
}

// ── Rollback ────────────────────────────────────────────────────────────────

export interface RollbackResponse {
  dry_run: boolean;
  batch_id: string;
  plan: {
    total_targets: number;
    by_table: Record<string, number[]>;
  };
  verification?: {
    all_present: boolean;
    missing_ids: number[];
  };
  result?: {
    deleted_count: number;
    errors: string[];
  };
}

export async function rollbackBatch(
  churchId: number,
  jobId: number,
  batchId: string,
  dryRun: boolean,
): Promise<RollbackResponse> {
  const res: any = await apiClient.post(
    `${ocrBase(churchId, jobId)}/review/rollback-batch`,
    { batch_id: batchId, dry_run: dryRun },
  );
  return res?.data || res;
}

// ── Corrections ─────────────────────────────────────────────────────────────

export interface CorrectionsResponse {
  summary: CorrectionsSummary;
  events: CorrectionEvent[];
  pagination: {
    total: number;
    offset: number;
    limit: number;
    has_more: boolean;
  };
}

export async function fetchCorrections(
  churchId: number,
  jobId: number,
  opts?: { limit?: number; offset?: number },
): Promise<CorrectionsResponse> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset) params.set('offset', String(opts.offset));
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res: any = await apiClient.get(
    `${ocrBase(churchId, jobId)}/review/corrections${qs}`,
  );
  return res?.data || res;
}

// ── Artifact download ───────────────────────────────────────────────────────

export async function downloadArtifact(
  churchId: number,
  artifactId: number,
): Promise<Blob> {
  const res: any = await apiClient.get(
    `/api/church/${churchId}/ocr/feeder/artifacts/${artifactId}/download`,
    { responseType: 'blob' },
  );
  return res?.data || res;
}
