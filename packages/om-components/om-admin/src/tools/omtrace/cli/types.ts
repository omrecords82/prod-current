// CLI-specific types for OMTRACE

export interface CLIOptions {
  selftest: boolean;
  buildIndex: boolean;
  trace: boolean;
  refactor: boolean;
  delete: boolean;
  dryRun: boolean;
  yes: boolean;
  force: boolean;
  pickFirst: boolean;
  json: boolean;
  verbose: boolean;
  timeout: number;
  reverse: boolean;
  deep: boolean;
  showRoute: boolean;
  showServer: boolean;
  renameLegacy: boolean;
  menuCommand?: string;
  menuLabel?: string;
  menuPath?: string;
  menuRole?: string;
  menuSection?: string;
  menuHidden: boolean;
  interactive: boolean;
  noInteractive: boolean;
  clearCache: boolean;
  indexPath?: string;
  feRoot?: string;
  target?: string;
}

export type RefHit = {
  file: string;
  kind: "import"|"route"|"menu"|"barrel"|"style"|"test"|"json";
  line: number;
  snippet: string;
};

export type DeletePlan = {
  target: string;
  resolvedFiles: string[];
  patches: {file: string; kind: string; preview: string}[];
  archiveDir: string;
  branchName: string;
};

export type DeleteResult = {
  success: boolean;
  target: string;
  patched: number;
  archived: number;
  branchName: string;
  archiveDir: string;
  errors?: string[];
  verifyResult?: { typecheckOk: boolean; buildOk: boolean; errors?: string };
};
