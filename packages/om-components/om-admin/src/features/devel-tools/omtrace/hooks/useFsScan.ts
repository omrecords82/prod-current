import { useCallback, useState } from 'react';
import { apiClient } from '../../../../api/utils/axiosInstance';
import { FileTreeResponse } from '../types.ts';

// Default settings
const DEFAULT_BASE_DIR = '/var/www/orthodoxmetrics/prod';
const DEFAULT_RELATIVE_ROOT = 'front-end/src';
const DEFAULT_MAX_DEPTH = 5;

// Legacy mock file tree data (kept for reference)
const MOCK_FILE_TREE_LEGACY: FileTreeResponse = {
  root: 'src',
  nodes: [
    {
      name: 'components',
      path: 'src/components',
      type: 'directory',
      children: [
        {
          name: 'church-management',
          path: 'src/components/church-management',
          type: 'directory',
          children: [
            {
              name: 'ch-wiz',
              path: 'src/components/church-management/ch-wiz',
              type: 'directory',
              children: [
                {
                  name: 'ChurchSetupWizard.tsx',
                  path: 'src/features/church/apps/church-management/ChurchSetupWizard.tsx',
                  type: 'file',
                  size: 31245,
                  modified: '2024-01-15T10:30:00Z'
                }
              ]
            }
          ]
        },
        {
          name: 'user-management',
          path: 'src/components/user-management',
          type: 'directory',
          children: [
            {
              name: 'usr-core',
              path: 'src/components/user-management/usr-core',
              type: 'directory',
              children: [
                {
                  name: 'UserManagement.tsx',
                  path: 'src/components/user-management/usr-core/UserManagement.tsx',
                  type: 'file',
                  size: 28456,
                  modified: '2024-01-14T14:20:00Z'
                }
              ]
            }
          ]
        },
        {
          name: 'shared',
          path: 'src/components/shared',
          type: 'directory',
          children: [
            {
              name: 'Button.tsx',
              path: 'src/components/shared/Button.tsx',
              type: 'file',
              size: 8234,
              modified: '2024-01-10T09:15:00Z'
            },
            {
              name: 'FormField.tsx',
              path: 'src/components/shared/FormField.tsx',
              type: 'file',
              size: 15678,
              modified: '2024-01-12T11:45:00Z'
            }
          ]
        }
      ]
    },
    {
      name: 'views',
      path: 'src/views',
      type: 'directory',
      children: [
        {
          name: 'admin',
          path: 'src/views/admin',
          type: 'directory',
          children: [
            {
              name: 'UserManagement.tsx',
              path: 'src/features/admin/admin/UserManagement.tsx',
              type: 'file',
              size: 28456,
              modified: '2024-01-14T14:20:00Z'
            }
          ]
        }
      ]
    },
    {
      name: 'services',
      path: 'src/services',
      type: 'directory',
      children: [
        {
          name: 'churchService.ts',
          path: 'src/services/churchService.ts',
          type: 'file',
          size: 12345,
          modified: '2024-01-13T16:30:00Z'
        },
        {
          name: 'userService.ts',
          path: 'src/services/userService.ts',
          type: 'file',
          size: 9876,
          modified: '2024-01-12T13:20:00Z'
        }
      ]
    },
    {
      name: 'utils',
      path: 'src/utils',
      type: 'directory',
      children: [
        {
          name: 'validation.ts',
          path: 'src/utils/validation.ts',
          type: 'file',
          size: 5432,
          modified: '2024-01-11T10:00:00Z'
        },
        {
          name: 'helpers.ts',
          path: 'src/utils/helpers.ts',
          type: 'file',
          size: 3456,
          modified: '2024-01-10T08:30:00Z'
        }
      ]
    }
  ],
  updatedAt: new Date().toISOString()
};

export const useFsScan = () => {
  const [fileTree, setFileTree] = useState<FileTreeResponse | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const scanFileSystem = useCallback(async () => {
    setIsScanning(true);
    
    try {
      // Get settings from localStorage
      const baseDir = localStorage.getItem('omtrace-baseDir') || DEFAULT_BASE_DIR;
      const relativeRoot = localStorage.getItem('omtrace-relativeRoot') || DEFAULT_RELATIVE_ROOT;
      const maxDepth = parseInt(localStorage.getItem('omtrace-maxDepth') || String(DEFAULT_MAX_DEPTH), 10);
      
      // Call real backend API
      const response = await apiClient.post('/api/omtrace/tree', {
        baseDir,
        relativeRoot,
        maxDepth
      }) as any;
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'File tree scan failed');
      }
      
      setFileTree(response.data);
      
    } catch (error: any) {
      console.error('File tree scan error:', error);
      // Set empty tree on error
      setFileTree({
        root: localStorage.getItem('omtrace-relativeRoot') || DEFAULT_RELATIVE_ROOT,
        nodes: [],
        updatedAt: new Date().toISOString()
      });
      throw new Error(error.message || 'Failed to scan file system');
    } finally {
      setIsScanning(false);
    }
  }, []);

  const clearFileTree = useCallback(() => {
    setFileTree(null);
  }, []);

  return {
    scanFileSystem,
    clearFileTree,
    fileTree,
    isScanning
  };
};
