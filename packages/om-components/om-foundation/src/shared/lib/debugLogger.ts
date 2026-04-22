/**
 * Comprehensive Debug Logger Service
 * Captures client-side errors, warnings, lifecycle events, and route changes
 */

class DebugLogger {
  private isEnabled: boolean = false;
  private originalConsole: any = {};
  private sessionId: string = '';
  private logBuffer: any[] = [];
  private flushInterval: number | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.checkDebugMode();
    this.setupKeyboardShortcut();
  }

  /**
   * Check if debug mode should be enabled from localStorage
   */
  private checkDebugMode(): void {
    this.isEnabled = localStorage.getItem('debugMode') === 'true';
    if (this.isEnabled) {
      this.enable();
    }
  }

  /**
   * Enable debug mode with full logging capture
   */
  enable(): void {
    if (this.isEnabled) return;
    
    this.isEnabled = true;
    localStorage.setItem('debugMode', 'true');
    
    // Capture all error events
    this.setupErrorCapture();
    
    // Override console methods
    this.setupConsoleCapture();
    
    // Capture route changes
    this.setupRouteCapture();
    
    // Capture performance metrics
    this.setupPerformanceCapture();
    
    // Setup fetch interceptor for API errors
    this.setupFetchInterceptor();
    
    // Start periodic flush to backend
    this.startPeriodicFlush();
    
    // Show floating debug badge
    this.showDebugBadge();
    
    console.log('🟠 Debug Mode ENABLED - All logs being captured');
    
    // Log debug mode activation
    this.captureLog({
      level: 'INFO',
      source: 'debugLogger',
      message: 'Debug mode activated',
      details: {
        sessionId: this.sessionId,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Disable debug mode and restore original console
   */
  disable(): void {
    if (!this.isEnabled) return;
    
    this.isEnabled = false;
    localStorage.setItem('debugMode', 'false');
    
    // Restore original console methods
    this.restoreConsole();
    
    // Remove event listeners
    this.removeEventListeners();
    
    // Stop periodic flush
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // Final flush of remaining logs
    this.flushLogs();
    
    // Hide debug badge
    this.hideDebugBadge();
    
    console.log('⏹️ Debug Mode DISABLED - Log capture stopped');
  }

  /**
   * Toggle debug mode on/off
   */
  toggle(): void {
    if (this.isEnabled) {
      this.disable();
    } else {
      this.enable();
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup error event capture
   */
  private setupErrorCapture(): void {
    // Capture JavaScript errors
    window.addEventListener('error', (event) => {
      this.captureLog({
        level: 'ERROR',
        source: 'window.onerror',
        message: event.message,
        details: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error?.stack
        }
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureLog({
        level: 'ERROR',
        source: 'unhandledrejection',
        message: 'Unhandled Promise Rejection',
        details: {
          reason: event.reason,
          stack: event.reason?.stack
        }
      });
    });
  }

  /**
   * Setup console method overrides
   */
  private setupConsoleCapture(): void {
    // Store original methods
    this.originalConsole = {
      debug: console.debug,
      warn: console.warn,
      error: console.error,
      info: console.info,
      log: console.log
    };

    // Override console.debug
    console.debug = (...args) => {
      this.originalConsole.debug.apply(console, args);
      this.captureLog({
        level: 'DEBUG',
        source: 'console.debug',
        message: args.join(' ')
      });
      // Send to client logger API immediately
      this.sendToClientLogger('debug', args.join(' '), 'console.debug');
    };

    // Override console.warn
    console.warn = (...args) => {
      this.originalConsole.warn.apply(console, args);
      this.captureLog({
        level: 'WARN',
        source: 'console.warn',
        message: args.join(' ')
      });
      // Send to client logger API immediately
      this.sendToClientLogger('warn', args.join(' '), 'console.warn');
    };

    // Override console.error
    console.error = (...args) => {
      this.originalConsole.error.apply(console, args);
      this.captureLog({
        level: 'ERROR',
        source: 'console.error',
        message: args.join(' ')
      });
      // Send to client logger API immediately
      this.sendToClientLogger('error', args.join(' '), 'console.error');
    };

    // Override console.log (maps to INFO)
    console.log = (...args) => {
      this.originalConsole.log.apply(console, args);
      this.captureLog({
        level: 'INFO',
        source: 'console.log',
        message: args.join(' ')
      });
      // Send to client logger API immediately
      this.sendToClientLogger('log', args.join(' '), 'console.log');
    };

    // Override console.info
    console.info = (...args) => {
      this.originalConsole.info.apply(console, args);
      this.captureLog({
        level: 'INFO',
        source: 'console.info',
        message: args.join(' ')
      });
      // Send to client logger API immediately
      this.sendToClientLogger('info', args.join(' '), 'console.info');
    };
  }

  /**
   * Send log directly to client logger API
   */
  private async sendToClientLogger(level: string, message: string, source: string): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? '/api/logger/client'
        : 'http://localhost:3002/api/logger/client';

      // rogue-fetch: intentional — this class overrides console.* methods; using apiClient
      // would trigger console logging which re-enters sendToClientLogger → infinite recursion
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'frontend',
          level: level,
          message: message,
          source: source,
          url: window.location.href,
          line: null,
          column: null,
          stack: ''
        })
      });
    } catch (error) {
      // Fail silently for client logger to avoid recursive loops
      // Don't use console.warn here as it would trigger infinite recursion
    }
  }

  /**
   * Setup route change capture
   */
  private setupRouteCapture(): void {
    let currentRoute = window.location.pathname;
    
    // Monitor pushState/replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      debugLogger.captureRouteChange(window.location.pathname, currentRoute);
      currentRoute = window.location.pathname;
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      debugLogger.captureRouteChange(window.location.pathname, currentRoute);
      currentRoute = window.location.pathname;
    };

    // Monitor popstate
    window.addEventListener('popstate', () => {
      debugLogger.captureRouteChange(window.location.pathname, currentRoute);
      currentRoute = window.location.pathname;
    });
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceCapture(): void {
    // Capture navigation timing
    if (performance && performance.timing) {
      const timing = performance.timing;
      this.captureLog({
        level: 'INFO',
        source: 'performance',
        message: 'Page Load Performance',
        details: {
          dns: timing.domainLookupEnd - timing.domainLookupStart,
          connect: timing.connectEnd - timing.connectStart,
          request: timing.responseEnd - timing.requestStart,
          domLoad: timing.domContentLoadedEventEnd - timing.navigationStart,
          pageLoad: timing.loadEventEnd - timing.navigationStart
        }
      });
    }
  }

  /**
   * Setup fetch interceptor to capture API errors
   */
  private setupFetchInterceptor(): void {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const [url, options] = args;
      const startTime = Date.now();
      
      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;
        
        // Log API errors (4xx, 5xx)
        if (!response.ok) {
          let responseText = '';
          try {
            const clonedResponse = response.clone();
            responseText = await clonedResponse.text();
          } catch (e) {
            responseText = 'Failed to read response body';
          }
          
          this.captureLog({
            level: response.status >= 500 ? 'ERROR' : 'WARN',
            source: 'fetch',
            message: `API ${response.status} Error: ${url}`,
            details: {
              url: url.toString(),
              status: response.status,
              statusText: response.statusText,
              method: options?.method || 'GET',
              duration: duration,
              responseBody: responseText.substring(0, 1000), // Limit response body
              requestHeaders: options?.headers ? JSON.stringify(options.headers) : undefined
            }
          });
        } else if (duration > 5000) {
          // Log slow API calls
          this.captureLog({
            level: 'WARN',
            source: 'fetch',
            message: `Slow API Response: ${url}`,
            details: {
              url: url.toString(),
              duration: duration,
              status: response.status,
              method: options?.method || 'GET'
            }
          });
        }
        
        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        // Log network errors
        this.captureLog({
          level: 'ERROR',
          source: 'fetch',
          message: `Network Error: ${url}`,
          details: {
            url: url.toString(),
            method: options?.method || 'GET',
            duration: duration,
            error: error.message,
            stack: error.stack
          }
        });
        
        throw error;
      }
    };
  }

  /**
   * Capture route change event
   */
  private captureRouteChange(newRoute: string, oldRoute: string): void {
    this.captureLog({
      level: 'INFO',
      source: 'router',
      message: `Route changed: ${oldRoute} → ${newRoute}`,
      details: {
        from: oldRoute,
        to: newRoute,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Capture component lifecycle events
   */
  captureComponentLifecycle(componentName: string, event: string, props?: any): void {
    if (!this.isEnabled) return;
    
    this.captureLog({
      level: 'DEBUG',
      source: 'component-lifecycle',
      message: `${componentName} ${event}`,
      details: {
        component: componentName,
        event,
        props: props ? JSON.stringify(props).substring(0, 500) : undefined
      }
    });
  }

  /**
   * Capture a log entry
   */
  private captureLog(logData: any): void {
    if (!this.isEnabled) return;

    const logEntry = {
      ...logData,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      debugMode: true,
      origin: 'browser',
      source_component: logData.source_component || logData.source
    };

    this.logBuffer.push(logEntry);

    // If buffer is getting large, flush immediately
    if (this.logBuffer.length >= 50) {
      this.flushLogs();
    }
  }

  /**
   * Start periodic flush to backend
   */
  private startPeriodicFlush(): void {
    this.flushInterval = window.setInterval(() => {
      if (this.logBuffer.length > 0) {
        this.flushLogs();
      }
    }, 10000); // Flush every 10 seconds
  }

  /**
   * Flush log buffer to backend
   */
  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];

    try {
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? '/api/logger/batch'
        : 'http://localhost:3002/api/logger/batch';

      // rogue-fetch: intentional — same recursion risk as sendToClientLogger; also needs
      // fail-silent retry semantics that apiClient's auto-throw would break
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          logs: logsToSend,
          debugMode: true
        })
      });

      console.log(`📤 Flushed ${logsToSend.length} debug logs to backend`);
    } catch (error) {
      console.warn('Failed to flush debug logs:', error);
      
      // Capture this API failure as a log entry
      this.captureLog({
        level: 'ERROR',
        source: 'debugLogger',
        message: `Failed to flush debug logs to backend: ${error.message}`,
        details: {
          error: error.message,
          stack: error.stack,
          logCount: logsToSend.length,
          url: apiUrl
        }
      });
      
      // Put logs back in buffer to retry later (but limit buffer size)
      if (this.logBuffer.length < 100) {
        this.logBuffer.unshift(...logsToSend);
      } else {
        console.warn('Debug log buffer full, dropping oldest logs');
      }
    }
  }

  /**
   * Setup keyboard shortcut (Ctrl+Shift+D)
   */
  private setupKeyboardShortcut(): void {
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        this.toggle();
      }
    });
  }

  /**
   * Show floating debug badge
   */
  private showDebugBadge(): void {
    if (document.getElementById('debug-badge')) return;

    const badge = document.createElement('div');
    badge.id = 'debug-badge';
    badge.innerHTML = '🟠 Debug Mode ON';
    badge.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(249, 115, 22, 0.9);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      z-index: 10000;
      animation: debugPulse 2s infinite;
      cursor: pointer;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    `;

    // Add CSS animation
    if (!document.getElementById('debug-badge-styles')) {
      const style = document.createElement('style');
      style.id = 'debug-badge-styles';
      style.textContent = `
        @keyframes debugPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      `;
      document.head.appendChild(style);
    }

    badge.addEventListener('click', () => this.toggle());
    document.body.appendChild(badge);
  }

  /**
   * Hide floating debug badge
   */
  private hideDebugBadge(): void {
    const badge = document.getElementById('debug-badge');
    if (badge) {
      badge.remove();
    }
  }

  /**
   * Restore original console methods
   */
  private restoreConsole(): void {
    if (this.originalConsole.debug) {
      console.debug = this.originalConsole.debug;
      console.warn = this.originalConsole.warn;
      console.error = this.originalConsole.error;
    }
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    // Note: In a real implementation, we'd need to store references
    // to the specific listener functions to remove them properly
  }

  /**
   * Get current debug status
   */
  isDebugMode(): boolean {
    return this.isEnabled;
  }

  /**
   * Test method to trigger a 500 error for debugging
   */
  async testApiError(): Promise<void> {
    if (!this.isEnabled) {
      console.log('Enable debug mode first to test API errors');
      return;
    }

    try {
      // rogue-fetch: intentional — test method inside debug logger, same recursion constraints
      const response = await fetch('/api/test-500-error');
      console.log('Test API response:', response.status);
    } catch (error) {
      console.log('Test API error caught:', error.message);
    }
  }

  /**
   * Test method to generate various log levels
   */
  generateTestLogs(): void {
    if (!this.isEnabled) {
      console.log('Enable debug mode first to test logging');
      return;
    }

    console.log('📝 Generating test logs...');
    
    this.captureLog({
      level: 'INFO',
      source: 'test',
      message: 'Test INFO log generated manually'
    });

    this.captureLog({
      level: 'WARN', 
      source: 'test',
      message: 'Test WARNING log generated manually'
    });

    this.captureLog({
      level: 'ERROR',
      source: 'test', 
      message: 'Test ERROR log generated manually'
    });

    this.captureLog({
      level: 'SUCCESS',
      source: 'test',
      message: 'Test SUCCESS log generated manually'
    });

    this.captureLog({
      level: 'DEBUG',
      source: 'test',
      message: 'Test DEBUG log generated manually'
    });

    console.log('✅ Test logs generated and will be flushed to backend');
  }
}

// Create global instance
export const debugLogger = new DebugLogger();

// Make debug logger available globally for testing
if (typeof window !== 'undefined') {
  (window as any).debugLogger = debugLogger;
}

// Export for use in React components
export default debugLogger;