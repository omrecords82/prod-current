// UI types for OMTrace Console
export type OmtraceRunFlags = { 
  reverse?: boolean; 
  deep?: boolean; 
  buildIndex?: boolean;
  json?: boolean;
  exact?: boolean;
  listCandidates?: boolean;
  pickFirst?: boolean;
  refactor?: boolean;
  yes?: boolean;
  dryRun?: boolean;
  force?: boolean;
};

export type OmtraceRunResult = {
  entry: string;
  resolvedPath: string;
  status?: "ok" | "ambiguous" | "error";
  error?: string;
  direct: string[];
  transitive?: string[];
  reverse?: string[];
  api?: Array<{ 
    method?: string; 
    path: string; 
    file: string; 
    line?: number 
  }>;
  routes?: Array<{ 
    file: string; 
    line: number; 
    path?: string; 
    roles?: string[] 
  }>;
  guards?: Array<{ 
    file: string; 
    line: number; 
    type: string; 
    roles?: string[] 
  }>;
  refactorPlan?: { 
    from: string;
    to: string;
    domain: string; 
    slug: string; 
  };
  stats?: {
    duration: number;
    cacheHit?: boolean;
  };
  message?: string;
};

export type RefactorRequest = {
  target: string;
  yes?: boolean;
  dryRun?: boolean;
  pickFirst?: boolean;
  force?: boolean;
};

export type RefactorResponse = {
  from: string;
  to: string;
  domain: string;
  slug: string;
  importUpdates: number;
  notes?: string[];
  refactorMdPath?: string;
  logPath?: string;
};

// Slug taxonomy types
export type SlugRule = { 
  code: string; 
  label?: string; 
  patterns?: string[] 
};

export type DomainRules = { 
  domain: string; 
  slugs: SlugRule[] 
};

export type SlugRulesResponse = { 
  domains: DomainRules[]; 
  updatedAt?: string 
};

// File system tree types
export type FileTreeNode = {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
  size?: number;
  modified?: string;
};

export type FileTreeResponse = {
  root: string;
  nodes: FileTreeNode[];
  updatedAt?: string;
};

// History/Export types
export type RefactorHistoryItem = {
  timestamp: string;
  entry: string;
  from: string;
  to: string;
  importUpdates: number;
  result: 'success' | 'no-op' | 'error';
  refactorMdPath?: string;
  logPath?: string;
};

// Component state types
export type AnalysisState = {
  targets: string[];
  flags: OmtraceRunFlags;
  results: OmtraceRunResult[];
  isLoading: boolean;
  error?: string;
};

export type RefactorState = {
  target?: string;
  plan?: RefactorResponse;
  isExecuting: boolean;
  error?: string;
};
