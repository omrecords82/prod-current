// Core types for OMTRACE system

export interface IndexStats {
  files: number;
  ts: number;
  ageMs: number;
}

export interface DepsIndex {
  generatedAt: string;
  root: string;
  stats: IndexStats;
  nodes: Array<{
    id: string;           // "src/components/.../File.tsx"
    imports: string[];    // normalized "src/..." paths
    kind: "ts" | "tsx" | "js" | "jsx";
    mtime: number;        // Unix timestamp
  }>;
  metadata?: {
    baseDir?: string;     // Base directory for path resolution
    scanRoot?: string;    // Scan root directory
    maxDepth?: number;    // Maximum depth for traversal
    mode?: 'full' | 'closure';
  };
}

export interface Candidate {
  path: string;           // "src/components/.../File.tsx"
  score: number;          // Higher = better match
  reason: string;         // Why this candidate was chosen
  mtime: number;          // File modification time
}

export interface TraceResult {
  entry: string;          // Original input
  resolvedPath: string;   // Normalized path
  status: "ok" | "ambiguous" | "error";
  candidates?: Candidate[];
  counts: {
    direct: number;
    transitive: number;
    reverse: number;
    server?: number;      // Server-side API endpoints
  };
  deps: {
    direct: string[];
    transitive: string[];
    reverse: string[];
    server?: string[];    // Server-side API endpoints
  };
  routes?: Array<{ path: string; file: string; line?: number; roles?: string[] }>;
  componentReferences?: string[];
  api?: Array<{ method: string; path: string; file: string; line?: number }>;
  plan?: {
    domain: string;
    slug: string;
    to: string;
  };
}

export interface RefactorPlan {
  from: string;           // "src/views/admin/Component.tsx"
  to: string;             // "src/components/domain-management/slug/Component.tsx"
  domain: string;         // "user"
  slug: string;           // "usr-core"
  importUpdates: number;
  notes: string[];
}

export interface RefactorResult extends RefactorPlan {
  success: boolean;
  error?: string;
  filesTouched: string[];
}

export interface SelfTestResult {
  ok: boolean;
  feRoot: string;
  index: {
    path: string;
    ageMs: number;
    files: number;
  };
  traceProbe: {
    status: string;
    resolvedPath?: string;
  };
  error?: {
    code: number;
    message: string;
  };
}

export interface CLIError {
  error: {
    code: number;
    message: string;
    details?: string;
  };
}

// ResolverError.ts
export class ResolverError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResolverError';
  };
}

export class AmbiguousTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AmbiguousTargetError';
  };
}

// Exit codes
export const EXIT_CODES = {
  SUCCESS: 0,
  AMBIGUOUS: 2,
  INDEX_FAILED: 3,
  RESOLVER_FAILED: 4,
  REFACTOR_BLOCKED: 5,
  TIMEOUT: 6,
} as const;

export type ExitCode = typeof EXIT_CODES[keyof typeof EXIT_CODES];
