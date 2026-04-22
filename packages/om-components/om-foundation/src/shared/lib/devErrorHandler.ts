/**
 * Development Error Handler
 * 
 * Sets up development-only error handlers for React errors and other
 * development-time error scenarios. Only active in development mode.
 */

/**
 * Setup development error handlers
 * This should be called early in the application lifecycle (e.g., in main.tsx)
 * Only active when import.meta.env.DEV is true
 */
export function setupDevErrorHandlers(): void {
  // Only run in development mode
  if (!import.meta.env.DEV) {
    return;
  }

  // Handle React errors (Error Boundaries catch these, but we can log them globally)
  const originalError = console.error;
  console.error = (...args: any[]) => {
    originalError.apply(console, args);
    
    // Check if this is a React error
    const errorString = args.join(' ');
    if (errorString.includes('Error:') || errorString.includes('Warning:')) {
      // Log React errors for development debugging
      console.group('🔴 React Error Detected (Dev Mode)');
      console.error(...args);
      console.groupEnd();
    }
  };

  // Enhanced error logging for development
  window.addEventListener('error', (event) => {
    console.group('🔴 Global Error (Dev Mode)');
    console.error('Error:', event.error);
    console.error('Message:', event.message);
    console.error('Filename:', event.filename);
    console.error('Line:', event.lineno);
    console.error('Column:', event.colno);
    console.error('Stack:', event.error?.stack);
    console.groupEnd();
  });

  // Enhanced promise rejection logging for development
  window.addEventListener('unhandledrejection', (event) => {
    console.group('🔴 Unhandled Promise Rejection (Dev Mode)');
    console.error('Reason:', event.reason);
    console.error('Stack:', event.reason?.stack);
    console.groupEnd();
  });

  console.log('🛠️ Development error handlers initialized');
}
