/**
 * DetectEntriesStep - Step 1: Multi-record segmentation
 * Extracted from FusionTab Step 1
 */

import React, { useCallback, useState } from 'react';
import { Box, Typography, Button, Stack, Alert, CircularProgress } from '@mui/material';
import { useWorkbench } from '../../../context/WorkbenchContext';
import { detectEntries } from '../../../utils/visionParser';
import type { FusionEntry } from '../../../types/fusion';

interface DetectEntriesStepProps {
  onNext: () => void;
  onBack: () => void;
}

const DetectEntriesStep: React.FC<DetectEntriesStepProps> = ({
  onNext,
  onBack,
}) => {
  const workbench = useWorkbench();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const ocrResult = workbench.state.ocrResult;
  const ocrText = workbench.state.ocrText;
  const hasEntries = workbench.state.entries.length > 0;
  
  const handleDetectEntries = useCallback(async () => {
    console.log('[DetectEntriesStep] Starting detection...', { 
      hasOcrResult: !!ocrResult, 
      hasOcrText: !!ocrText,
      ocrResultType: ocrResult ? typeof ocrResult : 'null'
    });
    
    if (!ocrResult) {
      const errorMsg = 'No OCR result available. Please ensure the job has completed processing.';
      console.error('[DetectEntriesStep]', errorMsg);
      setError(errorMsg);
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Use the detectEntries function from visionParser
      console.log('[DetectEntriesStep] Calling detectEntries...');
      const detected = detectEntries(ocrResult, ocrText || undefined);
      console.log('[DetectEntriesStep] Detection result:', { count: detected.length, entries: detected });
      
      if (detected.length === 0) {
        // For single-page documents, create a single entry covering the whole page
        console.log('[DetectEntriesStep] No entries detected, creating single entry for whole page');
        const pageSize = ocrResult?.fullTextAnnotation?.pages?.[0];
        if (pageSize && pageSize.width && pageSize.height) {
          const singleEntry: FusionEntry = {
            id: 'entry_0',
            text: ocrText || '',
            bbox: {
              x: 0,
              y: 0,
              w: pageSize.width,
              h: pageSize.height,
            },
            confidence: 0.5,
          };
          
          workbench.setEntries([singleEntry]);
          
          workbench.dispatch({ 
            type: 'SET_ENTRY_AREAS', 
            payload: [{ entryId: singleEntry.id, bbox: singleEntry.bbox }]
          });
          
          workbench.dispatch({
            type: 'SET_STEP_STATUS',
            payload: { step: 'detectEntries', status: { complete: true } }
          });
          
          console.log('[DetectEntriesStep] Created single entry for whole page');
          setIsProcessing(false);
          return;
        }
        
        const errorMsg = 'No entries detected. The document may be empty or the detection algorithm could not find distinct records.';
        console.warn('[DetectEntriesStep]', errorMsg);
        setError(errorMsg);
        setIsProcessing(false);
        return;
      }
      
      // Convert to FusionEntry format and set in workbench
      const entries: FusionEntry[] = detected.map((entry, idx) => ({
        id: `entry_${idx}`,
        text: entry.text || '',
        bbox: entry.bbox,
        confidence: entry.confidence || 0.5,
      }));
      
      console.log('[DetectEntriesStep] Setting entries in workbench:', entries.length);
      
      // Set entries and entry areas
      workbench.setEntries(entries);
      
      // Create entry areas from detected entries
      const entryAreas = entries.map(entry => ({
        entryId: entry.id,
        bbox: entry.bbox,
      }));
      
      workbench.dispatch({ 
        type: 'SET_ENTRY_AREAS', 
        payload: entryAreas 
      });
      
      // Mark step as complete
      workbench.dispatch({
        type: 'SET_STEP_STATUS',
        payload: { step: 'detectEntries', status: { complete: true } }
      });
      
      console.log('[DetectEntriesStep] Detection complete:', { entriesCount: entries.length });
      setIsProcessing(false);
    } catch (err: any) {
      console.error('[DetectEntriesStep] Error detecting entries:', err);
      setError(err.message || 'Failed to detect entries. Check console for details.');
      setIsProcessing(false);
    }
  }, [ocrResult, ocrText, workbench]);
  
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Detect Entries
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Automatically detect individual records on this page. Multiple records can be extracted from a single image.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {hasEntries && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {workbench.state.entries.length} entr{workbench.state.entries.length === 1 ? 'y' : 'ies'} detected.
        </Alert>
      )}
      
      {!ocrResult && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          OCR result not loaded. Please wait for the job to complete processing, or refresh the page.
        </Alert>
      )}
      
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button 
          variant="contained"
          color="primary"
          onClick={handleDetectEntries}
          disabled={isProcessing || !ocrResult}
          startIcon={isProcessing ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ minWidth: 180 }}
        >
          {isProcessing ? 'Detecting...' : hasEntries ? 'Re-detect Entries' : 'Auto-Detect Entries'}
        </Button>
        {!hasEntries && ocrResult && (
          <Button 
            variant="outlined"
            onClick={() => {
              // Fallback: Create single entry for whole page
              const pageSize = ocrResult?.fullTextAnnotation?.pages?.[0];
              if (pageSize && pageSize.width && pageSize.height) {
                const singleEntry: FusionEntry = {
                  id: 'entry_0',
                  text: ocrText || '',
                  bbox: {
                    x: 0,
                    y: 0,
                    w: pageSize.width,
                    h: pageSize.height,
                  },
                  confidence: 0.5,
                };
                
                workbench.setEntries([singleEntry]);
                workbench.dispatch({ 
                  type: 'SET_ENTRY_AREAS', 
                  payload: [{ entryId: singleEntry.id, bbox: singleEntry.bbox }]
                });
                workbench.dispatch({
                  type: 'SET_STEP_STATUS',
                  payload: { step: 'detectEntries', status: { complete: true } }
                });
              }
            }}
            disabled={!ocrResult}
          >
            Use Whole Page
          </Button>
        )}
      </Stack>
      
      {hasEntries && (
        <Alert severity="success" sx={{ mt: 2 }}>
          ✓ {workbench.state.entries.length} entr{workbench.state.entries.length === 1 ? 'y' : 'ies'} detected. You can now continue to the next step.
        </Alert>
      )}
      
      <Stack direction="row" spacing={1} sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button variant="outlined" onClick={onBack} disabled>
          Back
        </Button>
        <Button 
          variant="contained" 
          color="primary"
          onClick={onNext}
          disabled={!hasEntries}
          sx={{ minWidth: 120 }}
        >
          Continue
        </Button>
      </Stack>
      
      {!hasEntries && !isProcessing && ocrResult && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Click "Auto-Detect Entries" to automatically identify records on this page.
        </Typography>
      )}
    </Box>
  );
};

export default DetectEntriesStep;

