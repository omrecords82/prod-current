/**
 * Environment Context
 * 
 * Provides environment-aware feature gating based on user role.
 * - super_admin users: Access to "latest" (bleeding-edge) features
 * - All other roles: Access to "stable" (production-ready) features
 * 
 * This context reads the X-Environment header from API responses
 * and provides utilities for conditional feature rendering.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';

// Environment types
export type Environment = 'stable' | 'latest';

// Feature risk levels from Refactor Console
export type FeatureRiskLevel = 'high' | 'medium' | 'low' | 'production-ready';

// Feature priority levels (0 = no banner, 1-4 from reconstruction tasks, 5 = production ready)
export type FeaturePriority = 0 | 1 | 2 | 3 | 4 | 5;

interface EnvironmentContextValue {
  // Current environment
  environment: Environment;
  
  // Check if user has access to latest features
  hasLatestAccess: boolean;
  
  // Check if a specific feature is enabled for the current environment
  isFeatureEnabled: (featureId: string) => boolean;
  
  // Check if a feature with given risk level should be shown
  shouldShowFeature: (riskLevel: FeatureRiskLevel) => boolean;
  
  // Check if a feature with given priority should be shown
  shouldShowPriority: (priority: FeaturePriority) => boolean;
  
  // Register a feature as "high risk" (only shown in latest environment)
  registerHighRiskFeature: (featureId: string) => void;
  
  // Get all registered high-risk features
  highRiskFeatures: Set<string>;
  
  // Loading state
  loading: boolean;
}

const EnvironmentContext = createContext<EnvironmentContextValue | undefined>(undefined);

// High-risk features that should only be shown in "latest" environment
// These are Priority 1-4 features from the reconstruction tasks
const DEFAULT_HIGH_RISK_FEATURES = new Set([
  'baptism-records-v2',
  'marriage-records-v2', 
  'funeral-records-v2',
  'interactive-reports',
  'interactive-report-jobs',
  'ocr-studio',
  'enhanced-ocr-uploader',
  'dynamic-records-inspector',
]);

// Features that are stable and safe for all users
const STABLE_FEATURES = new Set([
  'user-profile',
  'contacts',
  'notes',
  'tickets',
  'email',
  'kanban',
  'invoice',
  'church-management',
  'social-chat',
  'notifications',
]);

export const EnvironmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, authenticated } = useAuth();
  const [environment, setEnvironment] = useState<Environment>('stable');
  const [highRiskFeatures, setHighRiskFeatures] = useState<Set<string>>(DEFAULT_HIGH_RISK_FEATURES);
  const [loading, setLoading] = useState(true);

  // Determine environment based on user role
  useEffect(() => {
    if (!authenticated || !user) {
      setEnvironment('stable');
      setLoading(false);
      return;
    }

    // super_admin gets latest, everyone else gets stable
    const userEnvironment: Environment = user.role === 'super_admin' ? 'latest' : 'stable';
    setEnvironment(userEnvironment);
    setLoading(false);
    
    console.log(`🌍 Environment set to "${userEnvironment}" for role "${user.role}"`);
  }, [authenticated, user]);

  // Check if user has access to latest features
  const hasLatestAccess = useMemo(() => {
    return environment === 'latest';
  }, [environment]);

  // Check if a specific feature is enabled
  const isFeatureEnabled = useCallback((featureId: string): boolean => {
    // Stable features are always enabled
    if (STABLE_FEATURES.has(featureId)) {
      return true;
    }

    // High-risk features require "latest" environment
    if (highRiskFeatures.has(featureId)) {
      return hasLatestAccess;
    }

    // Default: show feature if not explicitly high-risk
    return true;
  }, [hasLatestAccess, highRiskFeatures]);

  // Check if a feature with given risk level should be shown
  const shouldShowFeature = useCallback((riskLevel: FeatureRiskLevel): boolean => {
    switch (riskLevel) {
      case 'high':
        // High-risk features only in latest
        return hasLatestAccess;
      case 'medium':
        // Medium-risk features only in latest for now
        return hasLatestAccess;
      case 'low':
      case 'production-ready':
        // Low-risk and production-ready shown to all
        return true;
      default:
        return true;
    }
  }, [hasLatestAccess]);

  // Check if a feature with given priority should be shown
  const shouldShowPriority = useCallback((priority: FeaturePriority): boolean => {
    // Priority 1-4 are high-risk reconstruction features
    // Priority 5 is production-ready
    if (priority <= 4) {
      return hasLatestAccess;
    }
    return true;
  }, [hasLatestAccess]);

  // Register a feature as high-risk
  const registerHighRiskFeature = useCallback((featureId: string) => {
    setHighRiskFeatures(prev => new Set([...prev, featureId]));
  }, []);

  const value: EnvironmentContextValue = {
    environment,
    hasLatestAccess,
    isFeatureEnabled,
    shouldShowFeature,
    shouldShowPriority,
    registerHighRiskFeature,
    highRiskFeatures,
    loading,
  };

  return (
    <EnvironmentContext.Provider value={value}>
      {children}
    </EnvironmentContext.Provider>
  );
};

// Hook to use environment context
export const useEnvironment = (): EnvironmentContextValue => {
  const context = useContext(EnvironmentContext);
  if (!context) {
    throw new Error('useEnvironment must be used within an EnvironmentProvider');
  }
  return context;
};

// Hook to check if a feature is enabled (convenience wrapper)
export const useFeatureEnabled = (featureId: string): boolean => {
  const { isFeatureEnabled } = useEnvironment();
  return isFeatureEnabled(featureId);
};

// Hook to check if user has latest access (convenience wrapper)
export const useHasLatestAccess = (): boolean => {
  const { hasLatestAccess } = useEnvironment();
  return hasLatestAccess;
};

export default EnvironmentContext;
