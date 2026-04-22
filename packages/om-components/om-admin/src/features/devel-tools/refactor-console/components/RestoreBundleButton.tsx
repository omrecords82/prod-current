import React, { useState } from 'react';
import { Package, Loader2, CheckCircle, AlertCircle } from '@/ui/icons';
import { FeatureBundle } from '@/types/refactorConsole';
import { RestorationStatusBadge, calculateRestorationStatus } from './RestorationStatusBadge';
import refactorConsoleClient from '../api/refactorConsoleClient';
import { toast } from 'react-toastify';

interface RestoreBundleButtonProps {
  bundle: FeatureBundle;
  onRestoreComplete?: () => void;
}

const RestoreBundleButton: React.FC<RestoreBundleButtonProps> = ({
  bundle,
  onRestoreComplete
}) => {
  const [isRestoring, setIsRestoring] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const status = calculateRestorationStatus({
    file: bundle.rootFile,
    imports: bundle.missingImports,
    endpoints: bundle.requiredEndpoints,
    integrationPoints: []
  });
  
  const canRestore = status === 'ready' || status === 'missing_deps';
  
  const handleRestore = async () => {
    if (!canRestore) {
      toast.error('Cannot restore bundle: dependencies or endpoints missing');
      return;
    }
    
    setIsRestoring(true);
    
    try {
      // Generate route path from root file
      const rootFileName = bundle.rootFile.relPath
        .replace(/\.(tsx?|jsx?)$/, '')
        .replace(/^src\//, '')
        .replace(/\//g, '/');
      
      const routePath = `/apps/${rootFileName}`;
      
      // Generate menu label from file name
      const menuLabel = bundle.rootFile.relPath
        .split('/')
        .pop()!
        .replace(/\.(tsx?|jsx?)$/, '')
        .replace(/([A-Z])/g, ' $1')
        .trim();
      
      const result = await refactorConsoleClient.restoreBundle({
        bundleFiles: bundle.files.map(f => f.relPath),
        routePath,
        menuLabel,
        menuIcon: 'FileCode'
      });
      
      if (result.success) {
        toast.success(`Successfully restored ${result.restoredFiles.length} files`);
        if (onRestoreComplete) {
          onRestoreComplete();
        }
      } else {
        toast.error(result.message || 'Restoration failed');
      }
    } catch (error) {
      toast.error(`Failed to restore bundle: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRestoring(false);
      setShowConfirm(false);
    }
  };
  
  if (!canRestore) {
    return (
      <div className="flex items-center gap-2">
        <RestorationStatusBadge 
          fileAnalysis={{
            file: bundle.rootFile,
            imports: bundle.missingImports,
            endpoints: bundle.requiredEndpoints,
            integrationPoints: []
          }}
          bundleSize={bundle.files.length}
        />
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {status === 'server_blocker' 
            ? 'Required endpoints missing in server'
            : 'Cannot restore'}
        </span>
      </div>
    );
  }
  
  if (showConfirm) {
    return (
      <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <AlertCircle className="w-5 h-5 text-yellow-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-yellow-900">
            Restore {bundle.files.length} files?
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            This will copy files from backup and update Router.tsx and MenuItems.ts
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowConfirm(false)}
            className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleRestore}
            disabled={isRestoring}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isRestoring ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Restoring...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Confirm
              </>
            )}
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      <RestorationStatusBadge 
        fileAnalysis={{
          file: bundle.rootFile,
          imports: bundle.missingImports,
          endpoints: bundle.requiredEndpoints,
          integrationPoints: []
        }}
        bundleSize={bundle.files.length}
      />
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isRestoring || !canRestore}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <Package className="w-4 h-4" />
        <span>Restore Bundle</span>
      </button>
    </div>
  );
};

export default RestoreBundleButton;
