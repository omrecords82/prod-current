import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '@/api/utils/axiosInstance';

export interface GlobalError {
  id: string;
  hash: string; // Unique hash for deduplication
  timestamp: string;
  firstOccurrence: string;
  lastOccurrence: string;
  occurrenceCount: number;
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  route: string;
  component?: string;
  userRole?: string;
  userId?: number;
  churchId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'js_error' | 'unhandled_rejection' | 'api_error' | 'custom';
  context?: {
    url: string;
    userAgent: string;
    viewport: string;
    additionalData?: any;
  };
  resolved?: boolean;
  dismissed?: boolean;
  taskId?: number; // Reference to created Kanban task
  isExpanded?: boolean; // UI state for expansion
  tags?: string[]; // For categorization
}

interface ErrorStats {
  total: number;
  unique: number;
  unresolved: number;
  dismissed: number;
  lastError?: GlobalError;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

interface ErrorFilter {
  severity?: GlobalError['severity'][];
  type?: GlobalError['type'][];
  route?: string;
  component?: string;
  dismissed?: boolean;
  resolved?: boolean;
  showOnlyNew?: boolean;
}

export const useGlobalErrorStore = () => {
  const [errors, setErrors] = useState<GlobalError[]>([]);
  const [dismissedErrors, setDismissedErrors] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<ErrorStats>({ 
    total: 0, 
    unique: 0, 
    unresolved: 0, 
    dismissed: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0
  });
  const [filter, setFilter] = useState<ErrorFilter>({});
  const location = useLocation();
  const { user } = useAuth();

  // Load errors from localStorage on mount
  useEffect(() => {
    try {
      const savedErrors = localStorage.getItem('omai_global_errors');
      const savedDismissed = localStorage.getItem('omai_dismissed_errors');
      
      if (savedErrors) {
        const parsedErrors = JSON.parse(savedErrors);
        setErrors(parsedErrors);
      }
      
      if (savedDismissed) {
        const parsedDismissed = JSON.parse(savedDismissed);
        setDismissedErrors(new Set(parsedDismissed));
      }
    } catch (error) {
      console.error('Failed to load saved errors:', error);
    }
  }, []);

  // Save errors to localStorage whenever errors change
  useEffect(() => {
    try {
      localStorage.setItem('omai_global_errors', JSON.stringify(errors));
      updateStats(errors);
    } catch (error) {
      console.error('Failed to save errors:', error);
    }
  }, [errors]);

  // Save dismissed errors
  useEffect(() => {
    try {
      localStorage.setItem('omai_dismissed_errors', JSON.stringify(Array.from(dismissedErrors)));
    } catch (error) {
      console.error('Failed to save dismissed errors:', error);
    }
  }, [dismissedErrors]);

  const updateStats = (errorList: GlobalError[]) => {
    const visible = errorList.filter(error => !error.dismissed);
    
    setStats({
      total: errorList.reduce((sum, error) => sum + error.occurrenceCount, 0),
      unique: errorList.length,
      unresolved: visible.filter(error => !error.resolved).length,
      dismissed: errorList.filter(error => error.dismissed).length,
      lastError: errorList[0], // Most recent error
      criticalCount: visible.filter(error => error.severity === 'critical').length,
      highCount: visible.filter(error => error.severity === 'high').length,
      mediumCount: visible.filter(error => error.severity === 'medium').length,
      lowCount: visible.filter(error => error.severity === 'low').length,
    });
  };

  const generateErrorHash = (errorData: Partial<GlobalError>): string => {
    // Create a unique hash based on message, stack trace, and location
    const hashInput = [
      errorData.message,
      errorData.stack?.split('\n')[0], // First line of stack trace
      errorData.filename,
      errorData.lineno
    ].filter(Boolean).join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  };

  const addError = useCallback((errorData: Partial<GlobalError>) => {
    const errorHash = generateErrorHash(errorData);
    const now = new Date().toISOString();
    
    // Check if this error already exists
    const existingErrorIndex = errors.findIndex(error => error.hash === errorHash);
    
    if (existingErrorIndex !== -1) {
      // Update existing error
      setErrors(prev => {
        const updated = [...prev];
        const existing = updated[existingErrorIndex];
        updated[existingErrorIndex] = {
          ...existing,
          lastOccurrence: now,
          occurrenceCount: existing.occurrenceCount + 1,
          // Move to front of array (most recent)
        };
        // Move to front
        const [updatedError] = updated.splice(existingErrorIndex, 1);
        updated.unshift(updatedError);
        return updated;
      });
      
      // Dispatch event for existing error
      window.dispatchEvent(new CustomEvent('omai-error-update', { 
        detail: { hash: errorHash, isNew: false }
      }));
      
      return errors[existingErrorIndex];
    } else {
      // Create new error
      const newError: GlobalError = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        hash: errorHash,
        timestamp: now,
        firstOccurrence: now,
        lastOccurrence: now,
        occurrenceCount: 1,
        route: location.pathname,
        component: getComponentNameFromPath(location.pathname),
        userRole: user?.role,
        userId: user?.id,
        churchId: user?.church_id?.toString(),
        severity: determineSeverity(errorData.message || ''),
        type: 'js_error',
        context: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
        },
        resolved: false,
        dismissed: dismissedErrors.has(errorHash),
        isExpanded: false,
        tags: generateTags(errorData),
        ...errorData,
      };

      setErrors(prev => [newError, ...prev.slice(0, 99)]); // Keep only last 100 unique errors
      
      // Dispatch custom event for real-time notifications (only for new errors)
      if (!newError.dismissed) {
        window.dispatchEvent(new CustomEvent('omai-error', { 
          detail: newError 
        }));
      }

      // Auto-log critical errors to backend if available
      if (newError.severity === 'critical') {
        logErrorToBackend(newError);
      }

      return newError;
    }
  }, [location.pathname, user, errors, dismissedErrors]);

  const resolveError = useCallback((errorId: string, taskId?: number) => {
    setErrors(prev => 
      prev.map(error => 
        error.id === errorId 
          ? { ...error, resolved: true, taskId }
          : error
      )
    );
  }, []);

  const dismissError = useCallback((errorId: string) => {
    setErrors(prev => 
      prev.map(error => {
        if (error.id === errorId) {
          setDismissedErrors(prev => new Set([...prev, error.hash]));
          return { ...error, dismissed: true };
        }
        return error;
      })
    );
  }, []);

  const undismissError = useCallback((errorId: string) => {
    setErrors(prev => 
      prev.map(error => {
        if (error.id === errorId) {
          setDismissedErrors(prev => {
            const newSet = new Set(prev);
            newSet.delete(error.hash);
            return newSet;
          });
          return { ...error, dismissed: false };
        }
        return error;
      })
    );
  }, []);

  const toggleErrorExpansion = useCallback((errorId: string) => {
    setErrors(prev => 
      prev.map(error => 
        error.id === errorId 
          ? { ...error, isExpanded: !error.isExpanded }
          : error
      )
    );
  }, []);

  const deleteError = useCallback((errorId: string) => {
    setErrors(prev => prev.filter(error => error.id !== errorId));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
    localStorage.removeItem('omai_global_errors');
  }, []);

  const clearDismissedErrors = useCallback(() => {
    setDismissedErrors(new Set());
    localStorage.removeItem('omai_dismissed_errors');
    // Update existing errors to not be dismissed
    setErrors(prev => prev.map(error => ({ ...error, dismissed: false })));
  }, []);

  const getFilteredErrors = useCallback(() => {
    return errors.filter(error => {
      if (filter.severity && !filter.severity.includes(error.severity)) return false;
      if (filter.type && !filter.type.includes(error.type)) return false;
      if (filter.route && !error.route.includes(filter.route)) return false;
      if (filter.component && !error.component?.includes(filter.component)) return false;
      if (filter.dismissed !== undefined && error.dismissed !== filter.dismissed) return false;
      if (filter.resolved !== undefined && error.resolved !== filter.resolved) return false;
      if (filter.showOnlyNew && error.occurrenceCount > 1) return false;
      
      return true;
    });
  }, [errors, filter]);

  const getErrorsByRoute = useCallback((route: string) => {
    return errors.filter(error => error.route === route);
  }, [errors]);

  const getErrorsBySeverity = useCallback((severity: GlobalError['severity']) => {
    return errors.filter(error => error.severity === severity);
  }, [errors]);

  const getErrorByHash = useCallback((hash: string) => {
    return errors.find(error => error.hash === hash);
  }, [errors]);

  return {
    errors,
    filteredErrors: getFilteredErrors(),
    stats,
    filter,
    setFilter,
    addError,
    resolveError,
    dismissError,
    undismissError,
    toggleErrorExpansion,
    deleteError,
    clearErrors,
    clearDismissedErrors,
    getErrorsByRoute,
    getErrorsBySeverity,
    getErrorByHash,
  };
};

// Helper functions
const getComponentNameFromPath = (pathname: string): string => {
  const pathMap: { [key: string]: string } = {
    '/admin/ai': 'AI Administration Panel',
    '/admin/bigbook': 'OM Big Book Console',
    '/admin/build': 'Build Console',
    '/admin/users': 'User Management',
    '/apps/records-ui': 'Church Records Browser',
    '/apps/records': 'Records Dashboard',
    '/omb/editor': 'OMB Editor',
    '/dashboards/modern': 'Modern Dashboard',
    '/admin/orthodox-metrics': 'Orthodox Metrics Dashboard',
    '/pages/kanban': 'Kanban Board',
    '/apps/kanban': 'Kanban Application'
  };
  return pathMap[pathname] || 'Unknown Component';
};

const determineSeverity = (message: string): GlobalError['severity'] => {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
    return 'medium';
  }
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('403') || lowerMessage.includes('401')) {
    return 'high';
  }
  if (lowerMessage.includes('crash') || lowerMessage.includes('critical') || lowerMessage.includes('fatal')) {
    return 'critical';
  }
  if (lowerMessage.includes('warning') || lowerMessage.includes('deprecated')) {
    return 'low';
  }
  
  return 'medium';
};

const generateTags = (errorData: Partial<GlobalError>): string[] => {
  const tags: string[] = [];
  
  if (errorData.filename?.includes('node_modules')) tags.push('dependency');
  if (errorData.message?.toLowerCase().includes('chunk')) tags.push('loading');
  if (errorData.message?.toLowerCase().includes('network')) tags.push('network');
  if (errorData.type === 'api_error') tags.push('api');
  
  return tags;
};

const logErrorToBackend = async (error: GlobalError) => {
  try {
    await apiClient.post('/errors/log', error);
  } catch (logError) {
    console.error('Failed to log error to backend:', logError);
  }
};