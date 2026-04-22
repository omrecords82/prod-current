/**
 * usePageTitle Hook
 * Updates the browser document title dynamically
 */

import { useEffect } from 'react';

export const usePageTitle = (title: string) => {
  useEffect(() => {
    document.title = `${title} | OrthodoxMetrics`;
    
    return () => {
      document.title = 'OrthodoxMetrics';
    };
  }, [title]);
};
