/**
 * usePhase1Analysis — Custom hook encapsulating Phase 1 analysis state,
 * health check, polling logic, and job management.
 * Extracted from RefactorConsole.tsx
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import type { Phase1Report } from '@/types/refactorConsole';
import refactorConsoleClient from '../api/refactorConsoleClient';

export type Phase1State = 'idle' | 'starting' | 'running' | 'done' | 'error';

export interface UsePhase1AnalysisReturn {
  phase1State: Phase1State;
  phase1Report: Phase1Report | null;
  phase1Progress: number;
  phase1CurrentStep: string;
  phase1Error: string | null;
  healthStatus: 'checking' | 'ok' | 'error';
  healthError: string | null;
  handlePhase1Analysis: () => Promise<void>;
}

export function usePhase1Analysis(
  hookPhase1Report: Phase1Report | null
): UsePhase1AnalysisReturn {
  const [phase1State, setPhase1State] = useState<Phase1State>('idle');
  const [phase1Report, setPhase1Report] = useState<Phase1Report | null>(hookPhase1Report);
  const [phase1Progress, setPhase1Progress] = useState(0);
  const [phase1CurrentStep, setPhase1CurrentStep] = useState<string>('');
  const [phase1Error, setPhase1Error] = useState<string | null>(null);
  const [phase1JobId, setPhase1JobId] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [healthError, setHealthError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync phase1Report from hook
  useEffect(() => {
    if (hookPhase1Report) {
      setPhase1Report(hookPhase1Report);
    }
  }, [hookPhase1Report]);

  // Health check on mount
  useEffect(() => {
    const verifyConnection = async () => {
      try {
        setHealthStatus('checking');
        setHealthError(null);
        const health: any = await refactorConsoleClient.healthCheck();
        if (health.ok || health.status === 'ok') {
          setHealthStatus('ok');
        } else {
          setHealthStatus('error');
          setHealthError(health.message || 'Unknown error');
        }
      } catch (error) {
        setHealthStatus('error');
        setHealthError(error instanceof Error ? error.message : 'Connection failed');
        console.error('Health check failed:', error);
        
        // Autonomous fix: If it's a TypeError (500), suggest rebuild
        if (error instanceof Error && error.message.includes('TypeError')) {
          console.warn('[RefactorConsole] Health check failed with TypeError. Server may need rebuild.');
          toast.error('API connection error detected. Server may need rebuild.', {
            autoClose: 5000
          });
        }
      }
    };

    verifyConnection();
  }, []);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const handlePhase1Analysis = useCallback(async () => {
    // Clear any existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Reset state
    setPhase1State('starting');
    setPhase1Progress(0);
    setPhase1CurrentStep('Starting analysis...');
    setPhase1Error(null);
    setPhase1Report(null); // Clear previous report
    setPhase1JobId(null);
    
    try {
      // Start the background job
      const startResponse = await refactorConsoleClient.startPhase1Analysis();
      const jobId = startResponse.jobId;
      
      if (!jobId) {
        throw new Error('No jobId returned from server');
      }
      
      setPhase1JobId(jobId);
      setPhase1State('running');
      toast.info('Phase 1 analysis started in background');
      
      // Start polling for status
      let pollAttempts = 0;
      const MAX_POLL_ATTEMPTS = 600; // 20 minutes max (600 * 2 seconds)
      
      const interval = setInterval(async () => {
        pollAttempts++;
        
        // Safety: Stop polling after max attempts
        if (pollAttempts > MAX_POLL_ATTEMPTS) {
          clearInterval(interval);
          pollingIntervalRef.current = null;
          setPhase1State('error');
          setPhase1Error('Polling timeout: Analysis took too long');
          setPhase1JobId(null);
          toast.error('Phase 1 analysis timed out');
          console.error('[Phase1] Polling timeout after', MAX_POLL_ATTEMPTS, 'attempts');
          return;
        }
        
        try {
          const status = await refactorConsoleClient.getPhase1JobStatus(jobId);
          
          // Validate status response structure
          if (!status || typeof status !== 'object') {
            console.warn('[Phase1] Invalid status response format, continuing to poll...');
            return;
          }
          
          // Update progress and current step (always safe to update these)
          setPhase1Progress(status.progress ?? 0);
          setPhase1CurrentStep(status.currentStep || 'Processing...');
          
          // Only proceed if status is explicitly 'done' (not just progress 100%)
          if (status.status === 'done') {
            // Double-check: ensure progress is 100% before fetching results
            if (status.progress !== undefined && status.progress < 100) {
              console.log(`[Phase1] Status is 'done' but progress is ${status.progress}%, continuing to poll...`);
              return;
            }
            
            // Analysis complete - fetch result
            try {
              clearInterval(interval);
              pollingIntervalRef.current = null;
              
              const result = await refactorConsoleClient.getPhase1JobResult(jobId);
              
              // Validate result structure before setting state
              if (!result || typeof result !== 'object') {
                throw new Error('Invalid result format: result is not an object');
              }
              
              // Ensure required fields exist with defaults
              const validatedResult: Phase1Report = {
                generatedAt: result.generatedAt || new Date().toISOString(),
                sourcePath: result.sourcePath || '',
                targetPath: result.targetPath || '',
                summary: {
                  totalFilesInSource: result.summary?.totalFilesInSource ?? 0,
                  missingInTarget: result.summary?.missingInTarget ?? 0,
                  modifiedInTarget: result.summary?.modifiedInTarget ?? 0,
                  identical: result.summary?.identical ?? 0,
                  existsOnlyInTarget: result.summary?.existsOnlyInTarget ?? 0
                },
                restorableFiles: Array.isArray(result.restorableFiles) ? result.restorableFiles : [],
                modifiedFiles: Array.isArray(result.modifiedFiles) ? result.modifiedFiles : [],
                documentation: {
                  endpointsFound: result.documentation?.endpointsFound ?? 0,
                  endpointsVerified: result.documentation?.endpointsVerified ?? 0,
                  endpointsMissing: result.documentation?.endpointsMissing ?? 0
                },
                files: Array.isArray(result.files) ? result.files : [],
                integrationPoints: {
                  menuItems: result.integrationPoints?.menuItems || null,
                  router: result.integrationPoints?.router || null
                }
              };
              
              // Final validation: ensure summary exists before setting state
              if (!validatedResult.summary) {
                throw new Error('Result validation failed: summary is missing');
              }
              
              // Only set state if validation passes
              // Ensure progress is set to 100% when marking as done
              setPhase1Progress(100);
              setPhase1CurrentStep('Complete');
              setPhase1State('done');
              setPhase1Report(validatedResult);
              setPhase1JobId(null);
              toast.success(`Phase 1 analysis complete: ${validatedResult.summary.missingInTarget} restorable files found`);
            } catch (resultError) {
              // If result fetch fails, check if it's just not ready yet
              if (resultError instanceof Error && resultError.message.includes('not ready')) {
                // Continue polling - don't clear interval
                console.log('[Phase1] Result not ready yet, continuing to poll...');
                return;
              }
              // Otherwise, show error
              clearInterval(interval);
              pollingIntervalRef.current = null;
              setPhase1State('error');
              setPhase1Error(resultError instanceof Error ? resultError.message : 'Failed to fetch results');
              setPhase1JobId(null);
              toast.error(`Failed to fetch Phase 1 results: ${resultError instanceof Error ? resultError.message : 'Unknown error'}`);
              console.error('Phase 1 result fetch error:', resultError);
            }
          } else if (status.status === 'error') {
            // Analysis failed
            clearInterval(interval);
            pollingIntervalRef.current = null;
            setPhase1State('error');
            setPhase1Error(status.error || 'Unknown error');
            setPhase1JobId(null);
            toast.error(`Phase 1 analysis failed: ${status.error || 'Unknown error'}`);
            console.error('Phase 1 error:', status.error);
          }
          // If status is 'running' or 'queued', continue polling (no action needed)
        } catch (error) {
          console.error(`[Phase1] Error polling status (attempt ${pollAttempts}):`, error);
          // Don't stop polling on transient errors, but log them
          if (error instanceof Error && !error.message.includes('not ready') && !error.message.includes('Failed to fetch')) {
            console.warn('[Phase1] Non-transient error during polling, will retry:', error.message);
          }
          // Continue polling on errors - network issues are transient
        }
      }, 2000); // Poll every 2 seconds
      
      pollingIntervalRef.current = interval;
    } catch (error) {
      setPhase1State('error');
      setPhase1Error(error instanceof Error ? error.message : 'Failed to start Phase 1 analysis');
      setPhase1JobId(null);
      toast.error(error instanceof Error ? error.message : 'Failed to start Phase 1 analysis');
      console.error('Phase 1 start error:', error);
    }
  }, []);

  return {
    phase1State,
    phase1Report,
    phase1Progress,
    phase1CurrentStep,
    phase1Error,
    healthStatus,
    healthError,
    handlePhase1Analysis,
  };
}
