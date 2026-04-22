// Typed errors with exit codes for OMTRACE

import { EXIT_CODES, ExitCode } from './types.js';

export class OMTRACEError extends Error {
  constructor(
    message: string,
    public code: ExitCode,
    public details?: string
  ) {
    super(message);
    this.name = 'OMTRACEError';
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export class AmbiguousTargetError extends OMTRACEError {
  constructor(target: string, candidates: string[]) {
    super(
      `Ambiguous target "${target}". Multiple candidates found. Use --pick-first to select one.`,
      EXIT_CODES.AMBIGUOUS,
      `Candidates: ${candidates.join(', ')}`
    );
    this.name = 'AmbiguousTargetError';
  }
}

export class IndexError extends OMTRACEError {
  constructor(message: string, details?: string) {
    super(message, EXIT_CODES.INDEX_FAILED, details);
    this.name = 'IndexError';
  }
}

export class ResolverError extends OMTRACEError {
  constructor(target: string, details?: string) {
    super(
      `Failed to resolve target "${target}". No candidates found.`,
      EXIT_CODES.RESOLVER_FAILED,
      details
    );
    this.name = 'ResolverError';
  }
}

export class RefactorError extends OMTRACEError {
  constructor(message: string, details?: string) {
    super(message, EXIT_CODES.REFACTOR_BLOCKED, details);
    this.name = 'RefactorError';
  }
}

export class TimeoutError extends OMTRACEError {
  constructor(operation: string, timeoutMs: number) {
    super(
      `Operation "${operation}" timed out after ${timeoutMs}ms`,
      EXIT_CODES.TIMEOUT
    );
    this.name = 'TimeoutError';
  }
}

// Helper to create and exit with error
export function exitWithError(error: OMTRACEError, json: boolean = false) {
  if (json) {
    console.error(JSON.stringify(error.toJSON(), null, 2));
  } else {
    console.error(`ERROR: ${error.message}`);
    if (error.details) {
      console.error(`Details: ${error.details}`);
    }
  }
  process.exit(error.code);
}
