/**
 * Orthodox Themed Layout Wrapper
 * Applies theme classes and integrates with AG Grid
 */

import React, { useEffect } from 'react';
import { Box } from '@mui/material';
import { useTheme } from '../../context/ThemeContext.tsx';

interface ThemedLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * ThemedLayout Component
 * Wraps content with appropriate theme classes and applies CSS custom properties
 */
export const ThemedLayout: React.FC<ThemedLayoutProps> = ({ 
  children, 
  className = '' 
}) => {
  const { themeConfig } = useTheme();

  return (
    <Box
      className={`${themeConfig.cssClass} ${className}`.trim()}
      sx={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-background)',
        color: 'var(--color-text-primary)',
        transition: 'all 0.3s ease',
      }}
    >
      {children}
    </Box>
  );
};

/**
 * AG Grid Theme Wrapper
 * Specifically for wrapping AG Grid components with theme classes
 */
export const ThemedAGGridWrapper: React.FC<ThemedLayoutProps> = ({ 
  children, 
  className = '' 
}) => {
  const { themeConfig } = useTheme();

  return (
    <Box
      className={`${themeConfig.agGridTheme} ${themeConfig.cssClass} ${className}`.trim()}
      sx={{
        width: '100%',
        height: '100%',
        '& .ag-theme-quartz, & .ag-theme-quartz-dark': {
          '--ag-background-color': 'var(--color-surface)',
          '--ag-foreground-color': 'var(--color-text-primary)',
          '--ag-border-color': 'var(--color-border)',
          '--ag-header-background-color': 'var(--color-primary)',
          '--ag-header-foreground-color': 'var(--color-text-primary)',
          '--ag-row-hover-color': 'rgba(var(--color-primary-rgb), 0.1)',
          '--ag-selected-row-background-color': 'rgba(var(--color-primary-rgb), 0.15)',
        },
      }}
    >
      {children}
    </Box>
  );
};

export default ThemedLayout;
