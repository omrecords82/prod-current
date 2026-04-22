/**
 * useGallerySuggestions — Custom hook encapsulating all catalog suggestion
 * state and handlers (get, dry-run, apply single/all, copy summary).
 * Extracted from Gallery.tsx
 */
import { useState } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import type { GalleryImage, SuggestionStatus } from './types';
import { normalizePath } from './galleryUtils';

interface UseGallerySuggestionsParams {
  images: GalleryImage[];
  loadImages: () => Promise<void>;
  loadDirectoryTree: () => Promise<void>;
}

interface UseGallerySuggestionsReturn {
  suggestions: any[];
  suggestionsDialogOpen: boolean;
  setSuggestionsDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  suggestionStatuses: Record<number, SuggestionStatus>;
  setSuggestionStatuses: React.Dispatch<React.SetStateAction<Record<number, SuggestionStatus>>>;
  showFullSummary: boolean;
  setShowFullSummary: React.Dispatch<React.SetStateAction<boolean>>;
  summaryExpanded: boolean;
  setSummaryExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  validating: boolean;
  applying: boolean;
  handleGetSuggestions: () => Promise<void>;
  handleDryRun: () => Promise<void>;
  handleApplySingle: (idx: number) => Promise<void>;
  handleApplyAll: () => Promise<void>;
  handleCopySummary: () => void;
}

export function useGallerySuggestions({
  images,
  loadImages,
  loadDirectoryTree,
}: UseGallerySuggestionsParams): UseGallerySuggestionsReturn {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsDialogOpen, setSuggestionsDialogOpen] = useState(false);
  const [suggestionStatuses, setSuggestionStatuses] = useState<Record<number, SuggestionStatus>>({});
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [validating, setValidating] = useState(false);
  const [applying, setApplying] = useState(false);

  const handleGetSuggestions = async () => {
    try {
      const data = await apiClient.post<any>('/gallery/suggest-destination', { images: images.map(img => ({ path: img.path, name: img.name })) });
      setSuggestions(data.suggestions || []);
      setSuggestionStatuses({}); // Reset statuses
      setSuggestionsDialogOpen(true);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      alert('Failed to get catalog suggestions');
    }
  };

  const handleDryRun = async () => {
    if (suggestions.length === 0) return;
    
    setValidating(true);
    try {
      // Convert suggestions to actions
      const actions = suggestions.map((suggestion) => {
        const relativePath = normalizePath(suggestion.path);
        const targetPath = suggestion.suggestedDir 
          ? `${suggestion.suggestedDir}/${suggestion.suggestedName}`
          : suggestion.suggestedName;
        
        return {
          type: 'move',
          from: relativePath,
          to: targetPath
        };
      });

      const data = await apiClient.post<any>('/gallery/validate-actions', { actions });
      const newStatuses: Record<number, any> = {};
      
      data.results.forEach((result: any, idx: number) => {
        newStatuses[idx] = {
          status: result.ok ? 'valid' : 'invalid',
          message: result.message,
          code: result.code
        };
      });
      
      setSuggestionStatuses(newStatuses);
      setSummaryExpanded(true);
    } catch (error) {
      console.error('Error validating actions:', error);
      alert('Failed to validate actions');
    } finally {
      setValidating(false);
    }
  };

  const handleApplySingle = async (idx: number) => {
    const suggestion = suggestions[idx];
    if (!suggestion) return;

    setApplying(true);
    try {
      const relativePath = normalizePath(suggestion.path);
      const targetPath = suggestion.suggestedDir 
        ? `${suggestion.suggestedDir}/${suggestion.suggestedName}`
        : suggestion.suggestedName;

      const actions = [{
        type: 'move',
        from: relativePath,
        to: targetPath
      }];

      const data = await apiClient.post<any>('/gallery/apply-actions', { actions, continueOnError: false });
      const result = data.results[0];
      
      setSuggestionStatuses(prev => ({
        ...prev,
        [idx]: {
          status: result.ok ? 'applied' : 'failed',
          message: result.message,
          code: result.code
        }
      }));

      if (result.ok) {
        // Reload images and directory tree
        await loadImages();
        await loadDirectoryTree();
      }
    } catch (error) {
      console.error('Error applying action:', error);
      setSuggestionStatuses(prev => ({
        ...prev,
        [idx]: {
          status: 'failed',
          message: 'Failed to apply action',
          code: 'APPLY_ERROR'
        }
      }));
    } finally {
      setApplying(false);
    }
  };

  const handleApplyAll = async () => {
    if (suggestions.length === 0) return;

    // Check if any are invalid
    const invalidCount = Object.values(suggestionStatuses).filter(
      s => s.status === 'invalid'
    ).length;
    
    if (invalidCount > 0) {
      const proceed = confirm(
        `${invalidCount} suggestion(s) are invalid. Do you want to continue anyway? ` +
        'Only valid suggestions will be applied.'
      );
      if (!proceed) return;
    }

    setApplying(true);
    try {
      const actions = suggestions.map((suggestion) => {
        const relativePath = normalizePath(suggestion.path);
        const targetPath = suggestion.suggestedDir 
          ? `${suggestion.suggestedDir}/${suggestion.suggestedName}`
          : suggestion.suggestedName;
        
        return {
          type: 'move',
          from: relativePath,
          to: targetPath
        };
      });

      const data = await apiClient.post<any>('/gallery/apply-actions', { actions, continueOnError: true });
      const newStatuses: Record<number, any> = {};
      
      data.results.forEach((result: any, idx: number) => {
        newStatuses[idx] = {
          status: result.ok ? 'applied' : 'failed',
          message: result.message,
          code: result.code
        };
      });
      
      setSuggestionStatuses(newStatuses);
      setSummaryExpanded(true);

      // Reload if any succeeded
      if (data.summary.ok > 0) {
        await loadImages();
        await loadDirectoryTree();
      }
    } catch (error) {
      console.error('Error applying actions:', error);
      alert('Failed to apply actions');
    } finally {
      setApplying(false);
    }
  };

  const handleCopySummary = () => {
    const summary = {
      total: suggestions.length,
      statuses: Object.entries(suggestionStatuses).map(([idx, status]) => ({
        index: parseInt(idx),
        suggestion: suggestions[parseInt(idx)],
        status: status.status,
        message: status.message,
        code: status.code
      })),
      summary: {
        total: suggestions.length,
        valid: Object.values(suggestionStatuses).filter(s => s.status === 'valid').length,
        invalid: Object.values(suggestionStatuses).filter(s => s.status === 'invalid').length,
        applied: Object.values(suggestionStatuses).filter(s => s.status === 'applied').length,
        failed: Object.values(suggestionStatuses).filter(s => s.status === 'failed').length,
        pending: Object.values(suggestionStatuses).filter(s => s.status === 'pending' || !s).length
      }
    };

    const text = JSON.stringify(summary, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      alert('Summary copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('Failed to copy summary');
    });
  };

  return {
    suggestions,
    suggestionsDialogOpen,
    setSuggestionsDialogOpen,
    suggestionStatuses,
    setSuggestionStatuses,
    showFullSummary,
    setShowFullSummary,
    summaryExpanded,
    setSummaryExpanded,
    validating,
    applying,
    handleGetSuggestions,
    handleDryRun,
    handleApplySingle,
    handleApplyAll,
    handleCopySummary,
  };
}
