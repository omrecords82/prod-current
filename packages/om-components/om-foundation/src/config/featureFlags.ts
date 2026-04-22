/**
 * Feature Flags Configuration
 * Controls feature availability across the application
 * 
 * Uses Vite environment variables (import.meta.env) not process.env
 * 
 * Environment Gating:
 * - "stable" environment: Production-ready features only
 * - "latest" environment: All features including in-development (super_admin only)
 */

import { getEnvBool } from '@/utils/env';

export interface FeatureFlags {
  interactiveReports: {
    enableRecipientPages: boolean;
  };
  environmentGating: {
    enableLatestEnvironment: boolean;
    showDevBanners: boolean;
  };
  recordsV2: {
    baptism: boolean;
    marriage: boolean;
    funeral: boolean;
  };
}

// Legacy support flag
export const RECORDS_LEGACY_ENABLED = getEnvBool('VITE_RECORDS_LEGACY_ENABLED', false);

// Default feature flags (can be overridden by environment variables)
const defaultFlags: FeatureFlags = {
  interactiveReports: {
    enableRecipientPages: getEnvBool('ENABLE_INTERACTIVE_REPORT_RECIPIENTS', true),
  },
  environmentGating: {
    // Enable the environment gating system
    enableLatestEnvironment: getEnvBool('VITE_ENABLE_LATEST_ENVIRONMENT', true),
    // Show development banners for latest features
    showDevBanners: getEnvBool('VITE_SHOW_DEV_BANNERS', true),
  },
  recordsV2: {
    // Records V2 feature flags (used with environment gating)
    baptism: getEnvBool('VITE_RECORDS_V2_BAPTISM', true),
    marriage: getEnvBool('VITE_RECORDS_V2_MARRIAGE', true),
    funeral: getEnvBool('VITE_RECORDS_V2_FUNERAL', true),
  },
};

// Get feature flag value
export function getFeatureFlag<K extends keyof FeatureFlags>(
  category: K,
  flag: keyof FeatureFlags[K]
): boolean {
  const categoryFlags = defaultFlags[category];
  if (!categoryFlags) return false;
  return (categoryFlags[flag] as boolean) ?? false;
}

// Check if interactive report recipient pages are enabled
export function isInteractiveReportRecipientsEnabled(): boolean {
  return getFeatureFlag('interactiveReports', 'enableRecipientPages');
}

// Check if environment gating is enabled
export function isEnvironmentGatingEnabled(): boolean {
  return getFeatureFlag('environmentGating', 'enableLatestEnvironment');
}

// Check if dev banners should be shown
export function shouldShowDevBanners(): boolean {
  return getFeatureFlag('environmentGating', 'showDevBanners');
}

// Check if Records V2 is enabled for a specific type
export function isRecordsV2Enabled(recordType: 'baptism' | 'marriage' | 'funeral'): boolean {
  return getFeatureFlag('recordsV2', recordType);
}

export default defaultFlags;
