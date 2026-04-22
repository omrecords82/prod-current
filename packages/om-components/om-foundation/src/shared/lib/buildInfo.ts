/**
 * Build Info Module
 * 
 * Provides build information including version, git SHA, and build time.
 * This information is typically injected during the build process.
 */

export interface BuildInfo {
  version: string;
  gitSha: string;
  buildTime: string;
  environment?: string;
  nodeVersion?: string;
}

/**
 * Get build information
 * Tries to read from environment variables (injected at build time)
 * Falls back to runtime values if not available
 */
export function getBuildInfo(): BuildInfo {
  // Try to get version from package.json via import.meta.env
  // In Vite, you can inject this via define in vite.config.ts
  const version =
    import.meta.env.VITE_APP_VERSION ||
    import.meta.env.APP_VERSION ||
    '1.0.0-unknown'; // Fallback if not injected at build time

  // Git SHA - typically injected during build
  const gitSha = 
    import.meta.env.VITE_GIT_SHA ||
    import.meta.env.GIT_SHA ||
    import.meta.env.VITE_COMMIT_HASH ||
    'unknown';

  // Build time - injected at build time or use current time
  const buildTime = 
    import.meta.env.VITE_BUILD_TIME ||
    import.meta.env.BUILD_TIME ||
    new Date().toISOString();

  // Environment
  const environment = 
    import.meta.env.MODE ||
    import.meta.env.NODE_ENV ||
    'development';

  // Node version (if available)
  const nodeVersion = 
    import.meta.env.VITE_NODE_VERSION ||
    undefined;

  return {
    version,
    gitSha: gitSha && gitSha.length > 7 ? gitSha.substring(0, 7) : gitSha, // Short SHA (7 chars) if available
    buildTime,
    environment,
    nodeVersion,
  };
}

/**
 * Get formatted build version string
 * Format: version-gitSha (e.g., "5.0.0-a1b2c3d")
 */
export function getBuildVersionString(): string {
  const info = getBuildInfo();
  return `${info.version}-${info.gitSha}`;
}

/**
 * Get full build info as a formatted string
 */
export function getBuildInfoString(): string {
  const info = getBuildInfo();
  return `v${info.version} (${info.gitSha}) - Built ${new Date(info.buildTime).toLocaleString()}`;
}

// Export default for convenience
export default {
  getBuildInfo,
  getBuildVersionString,
  getBuildInfoString,
};
