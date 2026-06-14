import type { GlobalCliFlags, JobDetail, JobSummary, OmocrProfile } from '../types/index.js';

export class OmocrApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'OmocrApiError';
  }
}

export interface ApiClientOptions {
  profile: OmocrProfile;
  flags?: GlobalCliFlags;
}

export class OcrApiClient {
  private readonly base: string;
  private readonly timeoutMs: number;
  private readonly verbose: boolean;

  constructor(private readonly opts: ApiClientOptions) {
    this.base = opts.profile.apiBase.replace(/\/$/, '');
    this.timeoutMs = (opts.profile.timeoutSeconds ?? 120) * 1000;
    this.verbose = !!opts.flags?.verbose;
  }

  private authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const token = process.env.OMOCR_TOKEN?.trim();
    if (token) {
      headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }
    const session = process.env.OMOCR_SESSION?.trim();
    if (session) {
      headers.Cookie = session.includes('=') ? session : `connect.sid=${session}`;
    }
    return headers;
  }

  private churchId(explicit?: number): number {
    const id = explicit ?? this.opts.flags?.churchId ?? this.opts.profile.defaultChurchId;
    if (!id) {
      throw new Error('church-id is required (flag --church-id or profile defaultChurchId)');
    }
    return id;
  }

  async request<T>(
    method: string,
    pathname: string,
    init?: { body?: unknown; query?: Record<string, string | number | undefined>; rawBody?: BodyInit; headers?: Record<string, string> },
  ): Promise<T> {
    const url = new URL(pathname.startsWith('http') ? pathname : `${this.base}${pathname}`);
    if (init?.query) {
      for (const [k, v] of Object.entries(init.query)) {
        if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...this.authHeaders(),
      ...(init?.headers ?? {}),
    };

    let body: BodyInit | undefined = init?.rawBody;
    if (init?.body !== undefined && !init.rawBody) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(init.body);
    }

    if (this.verbose) {
      process.stderr.write(`[omocr] ${method} ${url.toString()}\n`);
    }

    try {
      const res = await fetch(url, { method, headers, body, signal: controller.signal });
      const text = await res.text();
      let data: unknown = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }
      if (!res.ok) {
        const msg = typeof data === 'object' && data && 'error' in data
          ? String((data as { error: unknown }).error)
          : `HTTP ${res.status}`;
        throw new OmocrApiError(msg, res.status, data);
      }
      return data as T;
    } finally {
      clearTimeout(timer);
    }
  }

  // ── Health / status ───────────────────────────────────────────────────────

  getSystemHealth() {
    return this.request<{ status?: string; ok?: boolean }>('GET', '/api/system/health');
  }

  getPipelineMetrics() {
    return this.request<unknown>('GET', '/api/ocr/pipeline-metrics');
  }

  // ── Jobs ──────────────────────────────────────────────────────────────────

  async listJobs(churchId?: number, limit = 100): Promise<{ jobs: JobSummary[] }> {
    const cid = this.churchId(churchId);
    return this.request('GET', `/api/church/${cid}/ocr/jobs`, { query: { limit } });
  }

  async getJob(jobId: number, churchId?: number): Promise<JobDetail> {
    const cid = this.churchId(churchId);
    const data = await this.request<{ job?: JobDetail; pages?: JobDetail['pages'] } & JobDetail>(
      'GET',
      `/api/church/${cid}/ocr/jobs/${jobId}`,
    );
    return { ...data, pages: data.pages ?? (data as JobDetail).pages };
  }

  async getAgentExtract(jobId: number, churchId?: number) {
    const cid = this.churchId(churchId);
    return this.request<{ extract?: unknown; review_status?: string }>(
      'GET',
      `/api/church/${cid}/ocr/jobs/${jobId}/agent-extract`,
    );
  }

  async getJobHistory(jobId: number, churchId?: number) {
    const cid = this.churchId(churchId);
    return this.request<{ history?: unknown[] }>('GET', `/api/church/${cid}/ocr/jobs/${jobId}/history`);
  }

  async cancelJob(jobId: number, churchId?: number, reason?: string) {
    const cid = this.churchId(churchId);
    return this.request('POST', `/api/church/${cid}/ocr/jobs/${jobId}/cancel`, { body: { reason } });
  }

  async retryJob(jobId: number, churchId?: number) {
    const cid = this.churchId(churchId);
    return this.request('POST', `/api/church/${cid}/ocr/jobs/${jobId}/retry`);
  }

  async runAgentExtract(jobId: number, churchId?: number) {
    const cid = this.churchId(churchId);
    return this.request('POST', `/api/church/${cid}/ocr/jobs/${jobId}/agent-extract`);
  }

  async uploadFiles(
    filePaths: string[],
    options: { churchId?: number; recordType?: string; language?: string },
  ): Promise<{ jobs: Array<{ id: number; filename?: string; status?: string }> }> {
    const cid = this.churchId(options.churchId);
    const form = new FormData();
    form.append('churchId', String(cid));
    form.append('recordType', options.recordType || 'custom');
    form.append('language', options.language || 'en');

    const { readFile } = await import('node:fs/promises');
    const { basename } = await import('node:path');
    for (const fp of filePaths) {
      const buf = await readFile(fp);
      const blob = new Blob([buf]);
      form.append('files', blob, basename(fp));
    }

    return this.request('POST', '/api/ocr/jobs/upload', { rawBody: form });
  }

  // ── Templates (admin) ─────────────────────────────────────────────────────

  listLayoutTemplates() {
    return this.request<{ templates?: unknown[] }>('GET', '/api/ocr/layout-templates');
  }

  getLayoutTemplate(id: number) {
    return this.request<unknown>('GET', `/api/ocr/layout-templates/${id}`);
  }

  validateJobAdmin(jobId: number) {
    return this.request<unknown>('GET', `/api/ocr/validate/${jobId}`);
  }

  // ── Analyze (pre-upload) ──────────────────────────────────────────────────

  scanAnalyzeDirectory(
    rootPath: string,
    options: { churchId?: number; recursive?: boolean; maxFiles?: number; sessionId?: string },
  ) {
    const cid = this.churchId(options.churchId);
    return this.request<{ report: unknown }>('POST', `/api/church/${cid}/ocr/analyze/scan-directory`, {
      body: {
        rootPath,
        recursive: options.recursive !== false,
        maxFiles: options.maxFiles ?? 500,
        sessionId: options.sessionId,
      },
    });
  }

  getAnalyzeAuditReport(sessionId: string, churchId?: number) {
    const cid = this.churchId(churchId);
    return this.request<{ report: unknown }>('GET', `/api/church/${cid}/ocr/analyze/${sessionId}/audit-report`);
  }
}
