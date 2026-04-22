// Types for Refactor Console feature

export type Classification = 'green' | 'orange' | 'yellow' | 'red';

export type RecoveryStatus = 'missing_in_prod' | 'modified_since_backup' | 'new_file' | 'unchanged';

export type SourceType = 'local' | 'remote';

export interface Snapshot {
  id: string;           // e.g., "09-2025"
  label: string;        // e.g., "September 2025"
  path: string;         // Full path to the snapshot/prod directory
  date: string;         // ISO date string
  month: number;        // Month number (1-12)
  year: number;         // Full year
  exists: boolean;      // Whether the prod subdirectory exists
  isValid: boolean;     // Whether this is a valid snapshot
}

export interface UsageData {
  importRefs: number;
  serverRefs: number;
  routeRefs: number;
  runtimeHints: number;
  score: number;
}

export interface SimilarityData {
  duplicates: string[];
  nearMatches: { target: string; similarity: number }[];
}

export interface FileNode {
  path: string;
  relPath: string;
  type: 'file' | 'dir';
  size: number;
  mtimeMs: number;
  classification: Classification;
  reasons: string[];
  usage: UsageData;
  similarity?: SimilarityData;
  featurePathMatch: boolean;
  inDevelTree: boolean;
  // Recovery/Gap Analysis fields
  recoveryStatus?: RecoveryStatus;
  backupPath?: string;
  hash?: string; // MD5 hash for comparison
}

export interface ScanSummary {
  totalFiles: number;
  totalDirs: number;
  duplicates: number;
  likelyInProd: number;
  highRisk: number;
  inDevelopment: number;
  legacyOrDupes: number;
  // Recovery/Gap Analysis summary
  missingInProd?: number;
  modifiedSinceBackup?: number;
  newFiles?: number;
}

export interface RefactorScan {
  generatedAt: string;
  root: string;
  summary: ScanSummary;
  nodes: FileNode[];
  // Gap Analysis metadata
  backupPath?: string;
  gapAnalysisEnabled?: boolean;
  // Multi-source metadata
  sourceType?: SourceType;
  snapshotId?: string;
  pathConfig?: {
    sourceType?: SourceType;
    snapshotId?: string;
    sourcePath?: string;
    destinationPath?: string;
    backupPath?: string;
    validationWarnings?: string[];
  };
}

export interface FilterState {
  classifications: Classification[];
  searchQuery: string;
  fileType: string;
  modifiedDays: number;
  showDuplicates: boolean;
  // Recovery/Gap Analysis filters
  recoveryStatus?: RecoveryStatus[];
  showMissingOnly?: boolean;
  // Whitelist filters
  showWhitelistedOnly?: boolean;
  hideWhitelisted?: boolean;
}

export interface WhitelistEntry {
  relPath: string;
  addedAt: string;       // ISO date string
  reason?: string;       // Optional reason for whitelisting
}

export interface SortOption {
  key: 'score' | 'name' | 'mtime' | 'classification' | 'recoveryStatus';
  direction: 'asc' | 'desc';
  label: string;
}

export interface TreeItem extends FileNode {
  children?: TreeItem[];
  expanded?: boolean;
  visible?: boolean;
  parentPath?: string;
  level?: number;
}

// Phase 1 Recovery Analysis Types
export interface FileComparison {
  relPath: string;
  sourcePath: string;
  targetPath: string | null;
  sourceHash: string;
  targetHash: string | null;
  status: 'missing_in_target' | 'modified_in_target' | 'identical' | 'exists_only_in_target';
  size: number;
  mtimeMs: number;
}

export interface ImportDependency {
  importPath: string;
  resolved: boolean;
  resolvedPath: string | null;
  error: string | null;
}

export interface EndpointReference {
  method: string;
  path: string;
  foundInDocs: string[];
  existsInServer: boolean;
  routeFile: string | null;
}

export interface ASTIntegrationPoint {
  file: string;
  type: 'MenuItems' | 'Router';
  lineNumber: number;
  codeBlock: string;
}

export interface FileAnalysis {
  file: FileComparison;
  imports: ImportDependency[];
  endpoints: EndpointReference[];
  integrationPoints: ASTIntegrationPoint[];
}

export interface Phase1Report {
  generatedAt: string;
  sourcePath: string;
  targetPath: string;
  summary: {
    totalFilesInSource: number;
    missingInTarget: number;
    modifiedInTarget: number;
    identical: number;
    existsOnlyInTarget: number;
  };
  restorableFiles: FileComparison[];
  modifiedFiles: FileComparison[];
  documentation: {
    endpointsFound: number;
    endpointsVerified: number;
    endpointsMissing: number;
  };
  files: FileAnalysis[];
  integrationPoints: {
    menuItems: ASTIntegrationPoint | null;
    router: ASTIntegrationPoint | null;
  };
}

export interface FeatureBundle {
  rootFile: FileComparison;
  files: FileComparison[];
  components: FileComparison[];
  hooks: FileComparison[];
  services: FileComparison[];
  pages: FileComparison[];
  allImportsResolved: boolean;
  missingImports: ImportDependency[];
  requiredEndpoints: EndpointReference[];
  status: 'ready' | 'missing_deps' | 'server_blocker' | 'unknown';
}

export interface RestoreBundleRequest {
  bundleFiles: string[]; // relPath array
  routePath?: string;
  menuLabel?: string;
  menuIcon?: string;
}

// ============================================================================
// File Preview/Diff Types
// ============================================================================
export interface FilePreview {
  relPath: string;
  sourcePath: string;
  targetPath: string;
  sourceContent: string;
  targetContent: string | null;
  sourceExists: boolean;
  targetExists: boolean;
  sourceSize: number;
  targetSize: number;
  sourceModified: number;
  targetModified: number | null;
  diffStats: {
    sourceLines: number;
    targetLines: number;
    linesAdded: number;
    identical: boolean;
  };
}

export interface ImportDependency {
  importPath: string;
  resolvedPath: string | null;
  exists: boolean;
  lineNumber: number;
  importType: 'relative' | 'absolute' | 'package';
}

export interface DependencyCheckResult {
  hasImports: boolean;
  totalImports: number;
  missingImports: ImportDependency[];
  missingCount: number;
  allDependenciesExist: boolean;
  imports: ImportDependency[];
}

export interface PreviewRestoreResponse {
  success: boolean;
  preview: FilePreview;
  dependencies: DependencyCheckResult;
  warnings: string[];
}

// ============================================================================
// Restore History Types
// ============================================================================
export interface RestoreHistoryEntry {
  id: string;
  timestamp: string;
  user: string | null;
  userEmail: string | null;
  relPath: string;
  sourcePath: string;
  targetPath: string;
  sourceType: 'local' | 'remote';
  snapshotId: string | null;
  fileSize: number;
  success: boolean;
  error: string | null;
}

export interface RestoreHistoryResponse {
  ok: boolean;
  total: number;
  limit: number;
  offset: number;
  entries: RestoreHistoryEntry[];
}

export interface RestoreHistoryStats {
  totalRestores: number;
  successfulRestores: number;
  failedRestores: number;
  uniqueFiles: number;
  uniqueUsers: number;
  lastRestore: RestoreHistoryEntry | null;
  restoresBySourceType: { local: number; remote: number };
  restoresBySnapshot: Record<string, number>;
}
