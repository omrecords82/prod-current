import { useCallback, useState } from 'react';
import { apiClient } from '../../../../api/utils/axiosInstance';
import { OmtraceRunFlags, OmtraceRunResult, RefactorHistoryItem, RefactorRequest, RefactorResponse, SlugRulesResponse } from '../types.ts';

// Default settings
const DEFAULT_BASE_DIR = '/var/www/orthodoxmetrics/prod';
const DEFAULT_RELATIVE_ROOT = 'front-end/src';
const DEFAULT_MAX_DEPTH = 5;

// Legacy mock data for slug rules and history (to be replaced later)
const MOCK_RESULTS_LEGACY: OmtraceRunResult[] = [
  {
    entry: 'ChurchSetupWizard',
    resolvedPath: 'src/features/church/apps/church-management/ChurchSetupWizard.tsx',
    direct: [
      'src/components/shared/FormField.tsx',
      'src/components/shared/Button.tsx',
      'src/utils/validation.ts',
      'src/services/churchService.ts'
    ],
    transitive: [
      'src/components/shared/Input.tsx',
      'src/components/shared/Label.tsx',
      'src/utils/helpers.ts',
      'src/types/church.ts'
    ],
    api: [
      { method: 'POST', path: '/api/churches', file: 'src/services/churchService.ts', line: 45 },
      { method: 'GET', path: '/api/churches/:id', file: 'src/services/churchService.ts', line: 23 }
    ],
    routes: [
      { file: 'src/routes/Router.tsx', line: 156, path: '/apps/church-management/wizard', roles: ['admin', 'super_admin'] }
    ],
    guards: [
      { file: 'src/routes/Router.tsx', line: 156, type: 'ProtectedRoute', roles: ['admin', 'super_admin'] }
    ],
    refactorPlan: {
      from: 'src/features/church/apps/church-management/ChurchSetupWizard.tsx',
      to: 'src/features/church/apps/church-management/ChurchSetupWizard.tsx',
      domain: 'church',
      slug: 'ch-wiz'
    },
    stats: {
      duration: 245,
      cacheHit: true
    }
  },
  {
    entry: 'UserManagement',
    resolvedPath: 'src/features/admin/admin/UserManagement.tsx',
    direct: [
      'src/components/shared/DataTable.tsx',
      'src/components/shared/Modal.tsx',
      'src/services/userService.ts',
      'src/hooks/useUsers.ts'
    ],
    transitive: [
      'src/components/shared/Table.tsx',
      'src/components/shared/Pagination.tsx',
      'src/utils/tableHelpers.ts'
    ],
    api: [
      { method: 'GET', path: '/api/admin/users', file: 'src/services/userService.ts', line: 12 },
      { method: 'PUT', path: '/api/admin/users/:id', file: 'src/services/userService.ts', line: 67 }
    ],
    stats: {
      duration: 189,
      cacheHit: false
    }
  }
];

const MOCK_SLUG_RULES: SlugRulesResponse = {
  domains: [
    {
      domain: 'church',
      slugs: [
        { code: 'ch-panel', label: 'Admin Panel', patterns: ['Admin', 'Panel'] },
        { code: 'ch-wiz', label: 'Wizard', patterns: ['Wizard', 'Setup', 'Onboard'] },
        { code: 'ch-dir', label: 'Directory', patterns: ['Directory', 'List'] }
      ]
    },
    {
      domain: 'user',
      slugs: [
        { code: 'usr-core', label: 'Core Management', patterns: ['Management', 'Admin'] },
        { code: 'usr-wiz', label: 'Wizard', patterns: ['Wizard', 'Setup'] },
        { code: 'usr-roles', label: 'Roles & Permissions', patterns: ['Roles', 'Permissions'] }
      ]
    },
    {
      domain: 'record',
      slugs: [
        { code: 'rec-template', label: 'Template', patterns: ['Template', 'Schema'] },
        { code: 'rec-opt', label: 'Options', patterns: ['Options', 'Config', 'Fields'] },
        { code: 'rec-dis', label: 'Display', patterns: ['Display', 'View', 'Show'] }
      ]
    }
  ],
  updatedAt: new Date().toISOString()
};

const MOCK_HISTORY: RefactorHistoryItem[] = [
  {
    timestamp: '2024-01-15T10:30:00Z',
    entry: 'ChurchSetupWizard',
    from: 'src/components/ChurchSetupWizard.tsx',
    to: 'src/features/church/apps/church-management/ChurchSetupWizard.tsx',
    importUpdates: 12,
    result: 'success',
    refactorMdPath: 'refactor.md',
    logPath: '.refactor_logs/2024-01-15/ChurchSetupWizard.json'
  },
  {
    timestamp: '2024-01-14T14:20:00Z',
    entry: 'UserManagement',
    from: 'src/views/UserManagement.tsx',
    to: 'src/components/user-management/usr-core/UserManagement.tsx',
    importUpdates: 8,
    result: 'success',
    refactorMdPath: 'refactor.md',
    logPath: '.refactor_logs/2024-01-14/UserManagement.json'
  }
];

export const useOmtraceApi = () => {
  const [isLoading, setIsLoading] = useState(false);

  const runAnalysis = useCallback(async (targets: string[], flags: OmtraceRunFlags): Promise<OmtraceRunResult> => {
    setIsLoading(true);
    
    try {
      // Get settings from localStorage
      const baseDir = localStorage.getItem('omtrace-baseDir') || DEFAULT_BASE_DIR;
      const relativeRoot = localStorage.getItem('omtrace-relativeRoot') || DEFAULT_RELATIVE_ROOT;
      const maxDepth = parseInt(localStorage.getItem('omtrace-maxDepth') || String(DEFAULT_MAX_DEPTH), 10);
      const mode = localStorage.getItem('omtrace-mode') || 'closure';
      
      // Call real backend API
      const response = await apiClient.post('/api/omtrace/analyze', {
        baseDir,
        relativeRoot,
        targets,
        maxDepth,
        mode,
        flags
      }) as any;
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Analysis failed');
      }
      
      // Return first result (for single target analysis)
      const results = response.data.results || [];
      if (results.length === 0) {
        throw new Error('No results returned from analysis');
      }
      
      return results[0];
      
    } catch (error: any) {
      console.error('OMTrace analysis error:', error);
      throw new Error(error.message || 'Failed to run analysis');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const runRefactor = useCallback(async (target: string, options: RefactorRequest): Promise<RefactorResponse> => {
    setIsLoading(true);
    
    try {
      // Get settings from localStorage
      const baseDir = localStorage.getItem('omtrace-baseDir') || DEFAULT_BASE_DIR;
      const relativeRoot = localStorage.getItem('omtrace-relativeRoot') || DEFAULT_RELATIVE_ROOT;
      const maxDepth = parseInt(localStorage.getItem('omtrace-maxDepth') || String(DEFAULT_MAX_DEPTH), 10);
      
      // TODO: Implement refactor endpoint on backend
      // For now, throw error indicating not implemented
      throw new Error('Refactor functionality not yet implemented in backend');
      
      // Future implementation:
      // const response = await apiClient.post('/api/omtrace/refactor', {
      //   baseDir,
      //   relativeRoot,
      //   target,
      //   maxDepth,
      //   options
      // });
      // return response.data;
      
    } catch (error: any) {
      console.error('OMTrace refactor error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getHistory = useCallback(async (): Promise<RefactorHistoryItem[]> => {
    setIsLoading(true);
    
    try {
      // TODO: Implement history endpoint on backend
      // For now, return empty array
      console.warn('History endpoint not yet implemented');
      return [];
      
      // Future implementation:
      // const response = await apiClient.get('/api/omtrace/history');
      // return response.data.history || [];
      
    } catch (error: any) {
      console.error('OMTrace history error:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSlugRules = useCallback(async (): Promise<SlugRulesResponse> => {
    setIsLoading(true);
    
    try {
      // TODO: Implement slug rules endpoint on backend
      // For now, return mock data
      console.warn('Slug rules endpoint not yet implemented, using mock data');
      await new Promise(resolve => setTimeout(resolve, 300));
      return MOCK_SLUG_RULES;
      
      // Future implementation:
      // const response = await apiClient.get('/api/omtrace/slug-rules');
      // return response.data;
      
    } catch (error: any) {
      console.error('OMTrace slug rules error:', error);
      return MOCK_SLUG_RULES;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSlugRules = useCallback(async (rules: SlugRulesResponse): Promise<void> => {
    setIsLoading(true);
    
    try {
      // TODO: Implement slug rules update endpoint on backend
      // For now, just log
      console.warn('Slug rules update endpoint not yet implemented');
      console.log('Updated slug rules:', rules);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Future implementation:
      // await apiClient.post('/api/omtrace/slug-rules', { rules });
      
    } catch (error: any) {
      console.error('OMTrace slug rules update error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    runAnalysis,
    runRefactor,
    getHistory,
    getSlugRules,
    updateSlugRules,
    isLoading
  };
};
