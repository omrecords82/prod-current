import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { RefactorScan, FileNode, Classification, FilterState, SortOption, TreeItem, Phase1Report, FeatureBundle } from '@/types/refactorConsole';
import refactorConsoleClient from '../api/refactorConsoleClient';
import { calculateAllBundles } from '../utils/bundleResolver';

// Phase 1 job status type
type Phase1Status = 'idle' | 'starting' | 'running' | 'done' | 'error';

interface UseRefactorScanReturn {
  scanData: RefactorScan | null;
  isLoading: boolean;
  error: string | null;
  
  // Filtering and search
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  
  // Sorting
  sortOption: SortOption;
  setSortOption: React.Dispatch<React.SetStateAction<SortOption>>;
  
  // Tree structure
  treeItems: TreeItem[];
  expandedPaths: Set<string>;
  setExpandedPaths: React.Dispatch<React.SetStateAction<Set<string>>>;
  
  // Actions
  loadScanData: (rebuild?: boolean, compareWithBackup?: boolean, sourceType?: 'local' | 'remote', snapshotId?: string) => Promise<void>;
  refreshScan: () => Promise<void>;
  
  // Utilities
  toggleExpanded: (path: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  
  // Statistics
  filteredCount: number;
  visibleNodes: FileNode[];
  
  // Gap Analysis
  compareWithBackup: boolean;
  setCompareWithBackup: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Phase 1 & Bundles
  phase1Report: Phase1Report | null;
  phase1Status: Phase1Status;
  phase1Progress: number;
  phase1CurrentStep: string;
  phase1Error: string | null;
  startPhase1Analysis: () => Promise<void>;
  bundles: Map<string, FeatureBundle>;
  calculateBundle: (rootFileRelPath: string) => FeatureBundle | null;
}

export const useRefactorScan = (isWhitelisted?: (relPath: string) => boolean): UseRefactorScanReturn => {
  const [scanData, setScanData] = useState<RefactorScan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Phase 1 state
  const [phase1Report, setPhase1Report] = useState<Phase1Report | null>(null);
  const [phase1Status, setPhase1Status] = useState<Phase1Status>('idle');
  const [phase1Progress, setPhase1Progress] = useState(0);
  const [phase1CurrentStep, setPhase1CurrentStep] = useState('');
  const [phase1Error, setPhase1Error] = useState<string | null>(null);
  const [phase1JobId, setPhase1JobId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [filterState, setFilterState] = useState<FilterState>({
    classifications: ['green', 'orange', 'yellow', 'red'],
    searchQuery: '',
    fileType: '',
    modifiedDays: 0,
    showDuplicates: false,
    recoveryStatus: undefined,
    showMissingOnly: false,
  });
  
  const [compareWithBackup, setCompareWithBackup] = useState(false);
  
  const [sortOption, setSortOption] = useState<SortOption>({
    key: 'score',
    direction: 'desc',
    label: 'Usage Score (High to Low)',
  });
  
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // Load scan data
  const loadScanData = useCallback(async (
    rebuild: boolean = false, 
    compareWithBackup: boolean = false,
    sourceType?: 'local' | 'remote',
    snapshotId?: string
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await refactorConsoleClient.scan(rebuild, compareWithBackup, undefined, sourceType, snapshotId);
      setScanData(data);
      
      // Auto-expand first level directories
      const autoExpandPaths = new Set<string>();
      if (data.nodes) {
        data.nodes
          .filter(node => node.type === 'dir')
          .slice(0, 5)  // Expand first 5 directories
          .forEach(node => autoExpandPaths.add(node.path));
      }
      setExpandedPaths(autoExpandPaths);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scan data');
      console.error('Scan error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshScan = useCallback(() => {
    return loadScanData(true);
  }, [loadScanData]);

  // Apply filters and sorting
  const filteredAndSortedNodes = useMemo(() => {
    if (!scanData?.nodes) return [];
    
    let filtered = scanData.nodes;
    
    // Apply classification filter
    filtered = filtered.filter(node => 
      filterState.classifications.includes(node.classification)
    );
    
    // Apply search query
    if (filterState.searchQuery.trim()) {
      const query = filterState.searchQuery.toLowerCase();
      filtered = filtered.filter(node =>
        node.relPath.toLowerCase().includes(query) ||
        node.reasons.some(reason => reason.toLowerCase().includes(query))
      );
    }
    
    // Apply file type filter
    if (filterState.fileType) {
      filtered = filtered.filter(node => 
        node.type === 'file' && 
        node.relPath.toLowerCase().endsWith(filterState.fileType.toLowerCase())
      );
    }
    
    // Apply modification date filter
    if (filterState.modifiedDays > 0) {
      const cutoffDate = Date.now() - (filterState.modifiedDays * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(node => node.mtimeMs >= cutoffDate);
    }
    
    // Apply duplicates filter
    if (filterState.showDuplicates) {
      filtered = filtered.filter(node => 
        node.similarity?.duplicates.length || node.similarity?.nearMatches.length
      );
    }
    
    // Apply recovery status filter
    if (filterState.recoveryStatus && filterState.recoveryStatus.length > 0) {
      filtered = filtered.filter(node => 
        node.recoveryStatus && filterState.recoveryStatus!.includes(node.recoveryStatus)
      );
    }
    
    // Apply missing only filter
    if (filterState.showMissingOnly) {
      filtered = filtered.filter(node => node.recoveryStatus === 'missing_in_prod');
    }

    // Apply whitelist filters
    if (isWhitelisted) {
      if (filterState.showWhitelistedOnly) {
        filtered = filtered.filter(node => isWhitelisted(node.relPath));
      } else if (filterState.hideWhitelisted) {
        filtered = filtered.filter(node => !isWhitelisted(node.relPath));
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortOption.key) {
        case 'score':
          comparison = a.usage.score - b.usage.score;
          break;
        case 'name':
          comparison = a.relPath.localeCompare(b.relPath);
          break;
        case 'mtime':
          comparison = a.mtimeMs - b.mtimeMs;
          break;
        case 'classification':
          const classificationOrder = { red: 0, orange: 1, yellow: 2, green: 3 };
          comparison = classificationOrder[a.classification] - classificationOrder[b.classification];
          break;
        case 'recoveryStatus':
          const recoveryOrder = { 
            'missing_in_prod': 0, 
            'modified_since_backup': 1, 
            'new_file': 2, 
            'unchanged': 3 
          };
          const aStatus = a.recoveryStatus || 'unchanged';
          const bStatus = b.recoveryStatus || 'unchanged';
          comparison = (recoveryOrder[aStatus] || 3) - (recoveryOrder[bStatus] || 3);
          break;
        default:
          comparison = 0;
      }
      
      return sortOption.direction === 'desc' ? -comparison : comparison;
    });
        
        return filtered;
      }, [scanData?.nodes, filterState, sortOption, isWhitelisted]);
      
      // Build tree structure
      const treeItems = useMemo(() => {
        if (!filteredAndSortedNodes.length) return [];
        
        const treeMap = new Map<string, TreeItem>();
        const rootItems: TreeItem[] = [];
        
        // Create tree item for each node
        filteredAndSortedNodes.forEach(node => {
          const treeItem: TreeItem = {
            ...node,
            children: [],
            expanded: expandedPaths.has(node.path),
            visible: true,
            parentPath: undefined,
          };
          treeMap.set(node.path, treeItem);
        });
        
        // Build hierarchy
        filteredAndSortedNodes.forEach(node => {
          const treeItem = treeMap.get(node.path)!;
          
          // Find the closest parent directory
          const pathParts = node.path.split('/');
          let parentPath = '';
          
          for (let i = pathParts.length - 1; i > 0; i--) {
            parentPath = pathParts.slice(0, i).join('/');
            const parentItem = treeMap.get(parentPath + '/'); // Directory paths end with '/'
            
            if (parentItem) {
              parentItem.children!.push(treeItem);
              treeItem.parentPath = parentPath;
              break;
            }
            
            parentPath = pathParts.slice(0, i).join('/');
            const parentDirItem = treeMap.get(parentPath);
            
            if (parentDirItem && parentDirItem.type === 'dir') {
              parentDirItem.children!.push(treeItem);
              treeItem.parentPath = parentPath;
              break;
            }
          }
          
          // If no parent found, it's a root item
          if (!treeItem.parentPath) {
            rootItems.push(treeItem);
          }
        });
        
        return rootItems;
      }, [filteredAndSortedNodes, expandedPaths]);
      
      // Utility functions
      const toggleExpanded = useCallback((path: string) => {
        setExpandedPaths(prev => {
          const newSet = new Set(prev);
          if (newSet.has(path)) {
            newSet.delete(path);
          } else {
            newSet.add(path);
          }
          return newSet;
        });
      }, []);
      
      const expandAll = useCallback(() => {
        const allDirPaths = scanData?.nodes
          ?.filter(node => node.type === 'dir')
          .map(node => node.path) || [];
        setExpandedPaths(new Set(allDirPaths));
      }, [scanData?.nodes]);
      
      const collapseAll = useCallback(() => {
        setExpandedPaths(new Set());
      }, []);
      
      // Auto-load on mount and when compareWithBackup changes
      useEffect(() => {
        loadScanData(false, compareWithBackup);
      }, [loadScanData, compareWithBackup]);
      
      // Cleanup polling interval on unmount
      useEffect(() => {
        return () => {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
        };
      }, []);
      
      // Start Phase 1 Analysis with polling
      const startPhase1Analysis = useCallback(async () => {
        // Clear any existing polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        
        // Reset state
        setPhase1Status('starting');
        setPhase1Progress(0);
        setPhase1CurrentStep('Starting analysis...');
        setPhase1Error(null);
        setPhase1Report(null);
        setPhase1JobId(null);
        
        try {
          // Start the background job
          const startResponse = await refactorConsoleClient.startPhase1Analysis();
          const jobId = startResponse.jobId;
          
          if (!jobId) {
            throw new Error('No jobId returned from server');
          }
          
          setPhase1JobId(jobId);
          setPhase1Status('running');
          console.log(`[useRefactorScan] Phase 1 job started: ${jobId}`);
          
          // Start polling for status (every 2 seconds)
          let pollAttempts = 0;
          const MAX_POLL_ATTEMPTS = 600; // 20 minutes max
          
          pollingIntervalRef.current = setInterval(async () => {
            pollAttempts++;
            
            // Safety: Stop polling after max attempts
            if (pollAttempts > MAX_POLL_ATTEMPTS) {
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              setPhase1Status('error');
              setPhase1Error('Polling timeout: Analysis took too long');
              setPhase1JobId(null);
              console.error('[useRefactorScan] Polling timeout');
              return;
            }
            
            try {
              const status = await refactorConsoleClient.getPhase1JobStatus(jobId);
              
              // Validate status response
              if (!status || typeof status !== 'object') {
                console.warn('[useRefactorScan] Invalid status response, continuing...');
                return;
              }
              
              // Update progress
              setPhase1Progress(status.progress ?? 0);
              setPhase1CurrentStep(status.currentStep || 'Processing...');
              
              // Check if done
              if (status.status === 'done') {
                // Ensure progress is at 100%
                if (status.progress !== undefined && status.progress < 100) {
                  console.log(`[useRefactorScan] Status 'done' but progress ${status.progress}%, waiting...`);
                  return;
                }
                
                // Fetch result
                try {
                  if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                  }
                  
                  const result = await refactorConsoleClient.getPhase1JobResult(jobId);
                  
                  // Validate and set result
                  if (result && typeof result === 'object' && result.summary) {
                    setPhase1Progress(100);
                    setPhase1CurrentStep('Complete');
                    setPhase1Status('done');
                    setPhase1Report(result);
                    setPhase1JobId(null);
                    console.log(`[useRefactorScan] Phase 1 complete: ${result.summary.missingInTarget} restorable files`);
                  } else {
                    throw new Error('Invalid result structure');
                  }
                } catch (resultError) {
                  // If result not ready, continue polling
                  if (resultError instanceof Error && resultError.message.includes('not ready')) {
                    console.log('[useRefactorScan] Result not ready, continuing...');
                    return;
                  }
                  
                  if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                  }
                  setPhase1Status('error');
                  setPhase1Error(resultError instanceof Error ? resultError.message : 'Failed to fetch result');
                  setPhase1JobId(null);
                  console.error('[useRefactorScan] Error fetching result:', resultError);
                }
              } else if (status.status === 'error') {
                // Job failed
                if (pollingIntervalRef.current) {
                  clearInterval(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
                }
                setPhase1Status('error');
                setPhase1Error(status.error || 'Unknown error');
                setPhase1JobId(null);
                console.error('[useRefactorScan] Job error:', status.error);
              }
              // If 'running' or 'queued', continue polling
            } catch (pollError) {
              console.error(`[useRefactorScan] Poll error (attempt ${pollAttempts}):`, pollError);
              // Continue polling on transient errors
            }
          }, 2000); // Poll every 2 seconds
          
        } catch (startError) {
          setPhase1Status('error');
          setPhase1Error(startError instanceof Error ? startError.message : 'Failed to start analysis');
          setPhase1JobId(null);
          console.error('[useRefactorScan] Failed to start Phase 1:', startError);
        }
      }, []);
      
      // Calculate bundles from Phase 1 report
      const bundles = useMemo(() => {
        if (!phase1Report || !phase1Report.restorableFiles || !phase1Report.files) {
          return new Map<string, FeatureBundle>();
        }
        return calculateAllBundles(phase1Report.restorableFiles, phase1Report.files);
      }, [phase1Report]);
      
      const calculateBundle = useCallback((rootFileRelPath: string): FeatureBundle | null => {
        return bundles.get(rootFileRelPath) || null;
      }, [bundles]);
      
      return {
        scanData,
        isLoading,
        error,
        filterState,
        setFilterState,
        sortOption,
        setSortOption,
        treeItems,
        expandedPaths,
        setExpandedPaths,
        loadScanData,
        refreshScan,
        toggleExpanded,
        expandAll,
        collapseAll,
        filteredCount: filteredAndSortedNodes.length,
        visibleNodes: filteredAndSortedNodes,
        compareWithBackup,
        setCompareWithBackup,
        phase1Report,
        phase1Status,
        phase1Progress,
        phase1CurrentStep,
        phase1Error,
        startPhase1Analysis,
        bundles,
        calculateBundle,
      };
    };
