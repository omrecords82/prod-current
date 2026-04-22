import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Package } from '@/ui/icons';
import { FileAnalysis } from '@/types/refactorConsole';

export type RestorationStatus = 'ready' | 'missing_deps' | 'server_blocker' | 'unknown';

interface RestorationStatusBadgeProps {
  fileAnalysis: FileAnalysis;
  bundleSize?: number;
  className?: string;
}

/**
 * Determines the restoration status based on file analysis
 */
export function calculateRestorationStatus(fileAnalysis: FileAnalysis): RestorationStatus {
  const { imports, endpoints } = fileAnalysis;
  
  // Check if all imports are resolved
  const allImportsResolved = imports.every(imp => imp.resolved);
  
  // Check if any imports are missing but might exist in backup
  const missingImportsInBackup = imports.filter(imp => 
    !imp.resolved && !imp.error?.includes('node_modules')
  );
  
  // Check if any endpoints are missing from server
  const missingEndpoints = endpoints.filter(ep => !ep.existsInServer);
  
  // Server Blocker: Required endpoints don't exist
  if (missingEndpoints.length > 0) {
    return 'server_blocker';
  }
  
  // Missing Deps: Imports not resolved but might be in backup
  if (!allImportsResolved && missingImportsInBackup.length > 0) {
    return 'missing_deps';
  }
  
  // Ready: All imports resolved and all endpoints exist
  if (allImportsResolved && endpoints.every(ep => ep.existsInServer || endpoints.length === 0)) {
    return 'ready';
  }
  
  return 'unknown';
}

export const RestorationStatusBadge: React.FC<RestorationStatusBadgeProps> = ({
  fileAnalysis,
  bundleSize,
  className = ''
}) => {
  const status = calculateRestorationStatus(fileAnalysis);
  
  const statusConfig = {
    ready: {
      icon: CheckCircle,
      label: 'Ready',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      description: 'All dependencies resolved and endpoints verified'
    },
    missing_deps: {
      icon: AlertTriangle,
      label: 'Missing Deps',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      description: 'Some imports missing (may exist in backup bundle)'
    },
    server_blocker: {
      icon: XCircle,
      label: 'Server Blocker',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      description: 'Required API endpoints not found in server'
    },
    unknown: {
      icon: AlertTriangle,
      label: 'Unknown',
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-50 dark:bg-gray-700/50',
      borderColor: 'border-gray-200 dark:border-gray-700',
      description: 'Status cannot be determined'
    }
  };
  
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.bgColor} ${config.borderColor} ${className}`}
      title={config.description}
    >
      <Icon className={`w-4 h-4 ${config.color}`} />
      <span className={`text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
      {bundleSize && bundleSize > 1 && (
        <div className="flex items-center gap-1 ml-1">
          <Package className="w-3 h-3 text-gray-500 dark:text-gray-400" />
          <span className="text-xs text-gray-600 dark:text-gray-400">{bundleSize}</span>
        </div>
      )}
    </div>
  );
};

export default RestorationStatusBadge;
