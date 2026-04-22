/**
 * Frontend Logger Utility
 * Provides easy interface for sending SUCCESS/DEBUG logs to backend
 */
import { apiClient } from '@/api/utils/axiosInstance';

interface LogEntry {
  log_level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'SUCCESS';
  source?: string;
  origin?: string;
  message: string;
  details?: string;
  source_component?: string;
  session_id?: string;
  user_agent?: string;
}

class Logger {
  private apiUrl: string;
  private defaultSource: string;
  private defaultOrigin: string;

  constructor() {
    this.apiUrl = '/logger';
    this.defaultSource = 'frontend';
    this.defaultOrigin = 'browser';
  }

  /**
   * Send log entry to backend
   */
  private async sendLog(entry: LogEntry): Promise<void> {
    try {
      const logData = {
        ...entry,
        source: entry.source || this.defaultSource,
        origin: entry.origin || this.defaultOrigin,
        session_id: this.getSessionId(),
        user_agent: navigator.userAgent
      };

      await apiClient.post<any>(this.apiUrl, logData);
    } catch (error) {
      // Fail silently to avoid breaking app
      console.warn('Logger send failed:', error);
    }
  }

  /**
   * Log SUCCESS message
   */
  success(message: string, details?: string, component?: string): void {
    this.sendLog({
      log_level: 'SUCCESS',
      message,
      details,
      source_component: component
    });
  }

  /**
   * Log DEBUG message  
   */
  debug(message: string, details?: string, component?: string): void {
    this.sendLog({
      log_level: 'DEBUG',
      message,
      details,
      source_component: component
    });
  }

  /**
   * Log INFO message
   */
  info(message: string, details?: string, component?: string): void {
    this.sendLog({
      log_level: 'INFO',
      message,
      details,
      source_component: component
    });
  }

  /**
   * Log WARN message
   */
  warn(message: string, details?: string, component?: string): void {
    this.sendLog({
      log_level: 'WARN',
      message,
      details,
      source_component: component
    });
  }

  /**
   * Log ERROR message
   */
  error(message: string, details?: string, component?: string): void {
    this.sendLog({
      log_level: 'ERROR',
      message,
      details,
      source_component: component
    });
  }

  /**
   * Get session ID from cookies or sessionStorage
   */
  private getSessionId(): string {
    // Try to get session ID from various sources
    const sessionFromStorage = sessionStorage.getItem('sessionId');
    if (sessionFromStorage) return sessionFromStorage;

    // Generate a temporary session ID
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('sessionId', tempId);
    return tempId;
  }

  /**
   * Log component lifecycle events
   */
  componentMounted(componentName: string, props?: any): void {
    this.debug(
      `Component ${componentName} mounted`,
      props ? `Props: ${JSON.stringify(props)}` : undefined,
      componentName
    );
  }

  /**
   * Log component unmount events
   */
  componentUnmounted(componentName: string): void {
    this.debug(
      `Component ${componentName} unmounted`,
      undefined,
      componentName
    );
  }

  /**
   * Log API request completion
   */
  apiSuccess(endpoint: string, duration: number): void {
    this.success(
      `API request completed successfully`,
      `Endpoint: ${endpoint}, Duration: ${duration}ms`,
      'ApiClient'
    );
  }

  /**
   * Log page load completion
   */
  pageLoaded(pageName: string, loadTime: number): void {
    this.success(
      `Page loaded successfully`,
      `Page: ${pageName}, Load time: ${loadTime}ms`,
      'PageLoader'
    );
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for custom instances
export { Logger };

// Usage examples:
/*
import { logger } from '@/utils/logger';

// Component lifecycle
logger.componentMounted('UserDashboard', { userId: 123 });

// API success
logger.apiSuccess('/api/users', 245);

// Page load
logger.pageLoaded('Dashboard', 1200);

// Custom success
logger.success('Backup completed', 'Size: 2.4GB');

// Debug with component context
logger.debug('State updated', 'New count: 42', 'Counter');

// Error logging
logger.error('Payment failed', 'Gateway timeout', 'PaymentForm');
*/