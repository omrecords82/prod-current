/**
 * Environment-Aware Page Wrapper
 * 
 * Wraps pages to show environment context and development information
 * for super_admin users in the "latest" environment.
 * 
 * Features:
 * - Shows development banner for high-priority features
 * - Displays environment indicator
 * - Logs environment context for debugging
 * 
 * Priority Levels:
 * - 0: No banner shown (production-ready, no notification needed)
 * - 1-4: Development priorities (banner shown)
 * - 5: Production ready (banner shown)
 * 
 * Usage:
 *   <EnvironmentAwarePage 
 *     featureId="baptism-records-v2"
 *     priority={1}
 *     showBanner
 *   >
 *     <BaptismRecordsPage />
 *   </EnvironmentAwarePage>
 */

import { Alert, Box, Chip, Collapse } from '@mui/material';
import React from 'react';
import { shouldShowDevBanners } from '../../config/featureFlags';
import { FeaturePriority, FeatureRiskLevel, useEnvironment } from '../../context/EnvironmentContext';

interface EnvironmentAwarePageProps {
  children: React.ReactNode;
  
  // Feature identification
  featureId?: string;
  
  // Feature priority (0 = no banner, 1-4 = reconstructed, 5 = stable)
  priority?: FeaturePriority;
  
  // Risk level
  riskLevel?: FeatureRiskLevel;
  
  // Show development banner (default: true for latest environment)
  showBanner?: boolean;
  
  // Feature display name for banner
  featureName?: string;
}

// Priority labels
const PRIORITY_LABELS: Record<FeaturePriority, string> = {
  0: 'No Banner - Production Ready',
  1: 'Priority 1 - Critical Records',
  2: 'Priority 2 - Active Reconstruction',
  3: 'Priority 3 - Schema Sync',
  4: 'Priority 4 - Interactive Reports',
  5: 'Priority 5 - Production Ready',
};

// Risk level colors
const RISK_COLORS: Record<FeatureRiskLevel, 'error' | 'warning' | 'info' | 'success'> = {
  high: 'error',
  medium: 'warning',
  low: 'info',
  'production-ready': 'success',
};

const EnvironmentAwarePage: React.FC<EnvironmentAwarePageProps> = ({
  children,
  featureId,
  priority,
  riskLevel,
  showBanner = true,
  featureName,
}) => {
  const { environment, hasLatestAccess } = useEnvironment();
  
  // Determine if we should show the development banner
  // Priority 0 = never show banner (production ready with no notification)
  const shouldShowBanner =
    showBanner &&
    hasLatestAccess &&
    shouldShowDevBanners() &&
    priority !== 0 &&
    (
      (priority !== undefined && priority <= 4) ||
      (!!riskLevel && riskLevel !== 'production-ready')
    );

  // Get banner content based on priority/risk
  const getBannerContent = () => {
    if (priority !== undefined) {
      return (
        <>
          <Chip 
            label={PRIORITY_LABELS[priority]} 
            size="small" 
            color={priority <= 2 ? 'error' : priority <= 4 ? 'warning' : 'success'}
            sx={{ mr: 1, fontWeight: 600 }}
          />
          <strong>{featureName || featureId || 'Feature'}</strong> — 
          {priority <= 4 
            ? ' This feature is part of the reconstruction effort. Your feedback helps improve it.'
            : ' This feature is production-ready.'
          }
        </>
      );
    }

    if (riskLevel) {
      return (
        <>
          <Chip 
            label={riskLevel.toUpperCase()} 
            size="small" 
            color={RISK_COLORS[riskLevel]}
            sx={{ mr: 1, fontWeight: 600 }}
          />
          <strong>{featureName || featureId || 'Feature'}</strong> — 
          Risk level: {riskLevel}
        </>
      );
    }

    return (
      <>
        <strong>{featureName || featureId || 'Feature'}</strong> — 
        Development version
      </>
    );
  };

  return (
    <>
      <Collapse in={shouldShowBanner}>
        <Alert 
          severity={priority && priority <= 2 ? 'warning' : 'info'}
          sx={{ 
            mb: 2,
            borderRadius: 1,
            '& .MuiAlert-message': {
              width: '100%',
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
            🧪 {getBannerContent()}
          </Box>
        </Alert>
      </Collapse>
      {children}
    </>
  );
};

export default EnvironmentAwarePage;
