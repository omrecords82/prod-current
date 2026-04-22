/**
 * LookupService — Single canonical frontend service for all /api/lookup/* calls.
 * All dropdown/lookup data should go through this service.
 * Direct /api/lookup/* calls elsewhere are forbidden.
 */
import { apiJson } from './apiClient';

// ─── Types ───────────────────────────────────────────────────

export interface LookupItem {
  value: string;
  label: string;
  count: number;
}

export interface LookupResponse {
  items: LookupItem[];
  meta: {
    church_id: number;
    record_type: string;
    limit: number;
    total: number;
  };
}

// ─── Service ─────────────────────────────────────────────────

const LookupService = {
  /**
   * Fetch clergy names for dropdowns.
   * @param churchId  — required church ID
   * @param recordType — optional: 'baptism' | 'marriage' | 'funeral' (defaults to all)
   * @param search    — optional contains-match filter
   * @param limit     — optional, default 100, max 500
   */
  async getClergy(params: {
    churchId: number | string;
    recordType?: string;
    search?: string;
    limit?: number;
  }): Promise<LookupResponse> {
    const qp = new URLSearchParams();
    qp.append('church_id', String(params.churchId));
    if (params.recordType) qp.append('record_type', params.recordType);
    if (params.search) qp.append('search', params.search);
    if (params.limit) qp.append('limit', String(params.limit));

    return apiJson<LookupResponse>(`/lookup/clergy?${qp.toString()}`);
  },
};

export default LookupService;
