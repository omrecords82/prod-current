/**
 * ScrollToTop Component
 * 
 * Scrolls to the top of the page when the route changes.
 * Wraps route content to ensure users start at the top when navigating.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Box } from '@mui/material';

interface ScrollToTopProps {
  children: React.ReactNode;
}

const ScrollToTop: React.FC<ScrollToTopProps> = ({ children }) => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top when route changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth', // Smooth scroll animation
    });
  }, [pathname]);

  return <Box>{children}</Box>;
};

export default ScrollToTop;
