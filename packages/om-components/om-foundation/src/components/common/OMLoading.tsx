import React, { useState, useEffect } from 'react';
import { Box, Typography, Backdrop } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import styles from './OMLoading.module.css';

export interface OMLoadingProps {
  /** Label text to display (default: "Loading") */
  label?: string;
  /** Size variant: sm, md, lg (default: "md") */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className */
  className?: string;
}

/**
 * OMLoading - Inline loading component with animated priest image
 * 
 * Usage:
 * <OMLoading label="Loading" size="md" />
 */
export const OMLoading: React.FC<OMLoadingProps> = ({
  label = 'Loading',
  size = 'md',
  className = '',
}) => {
  const [dots, setDots] = useState('');
  const theme = useTheme();
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Animate dots: ".", "..", "...", ""
  useEffect(() => {
    if (prefersReducedMotion) {
      setDots('...');
      return;
    }

    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === '') return '.';
        if (prev === '.') return '..';
        if (prev === '..') return '...';
        return '';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  const sizeClass = styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`];

  return (
    <Box
      className={`${styles.container} ${sizeClass} ${className}`}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      aria-live="polite"
      aria-label={`${label}${dots}`}
    >
      <Box className={styles.imageWrapper}>
        <img
          src="/images/ui/loading-priest.png"
          alt="Loading"
          className={`${styles.priestImage} ${prefersReducedMotion ? styles.noAnimation : ''}`}
          loading="eager"
          onError={(e) => {
            // Fallback if image doesn't exist yet
            console.warn('OMLoading: Image not found at /images/ui/loading-priest.png');
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </Box>
      <Typography
        variant="body1"
        className={styles.label}
        sx={{
          mt: 2,
          color: theme.palette.text.secondary,
          fontWeight: 500,
        }}
      >
        {label}
        <span className={styles.dots} aria-hidden="true">
          {dots}
        </span>
      </Typography>
    </Box>
  );
};

export interface OMLoadingOverlayProps {
  /** Whether the overlay is open */
  open: boolean;
  /** Label text to display (default: "Loading") */
  label?: string;
  /** Size variant: sm, md, lg (default: "md") */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show backdrop (default: true) */
  backdrop?: boolean;
}

/**
 * OMLoadingOverlay - Fullscreen overlay loading component
 * 
 * Usage:
 * <OMLoadingOverlay open={isLoading} label="Loading" />
 */
export const OMLoadingOverlay: React.FC<OMLoadingOverlayProps> = ({
  open,
  label = 'Loading',
  size = 'md',
  backdrop = true,
}) => {
  if (!open) return null;

  return (
    <Backdrop
      open={open}
      sx={{
        zIndex: (theme) => theme.zIndex.modal + 1,
        backgroundColor: backdrop ? 'rgba(0, 0, 0, 0.5)' : 'transparent',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
      onClick={(e) => {
        // Prevent clicks from passing through
        e.stopPropagation();
      }}
    >
      <Box
        sx={{
          position: 'relative',
          pointerEvents: 'none',
        }}
      >
        <OMLoading label={label} size={size} />
      </Box>
    </Backdrop>
  );
};
