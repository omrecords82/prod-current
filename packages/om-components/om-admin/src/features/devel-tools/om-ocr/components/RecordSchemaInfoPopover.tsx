/**
 * RecordSchemaInfoPopover
 * Rich popover component that displays schema preview images for record types
 * Shows on hover/focus of an info trigger
 */

import React, { useState, useRef } from 'react';
import {
  Popover,
  Box,
  Typography,
  useTheme,
} from '@mui/material';
import { IconInfoCircle } from '@tabler/icons-react';

interface RecordSchemaInfoPopoverProps {
  title: string;
  imageSrc: string;
  maxWidth?: number;
  children?: React.ReactNode;
}

export const RecordSchemaInfoPopover: React.FC<RecordSchemaInfoPopoverProps> = ({
  title,
  imageSrc,
  maxWidth = 600,
  children,
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>) => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    // Small delay to allow mouse to move to popover
    timeoutRef.current = setTimeout(() => {
      setAnchorEl(null);
    }, 100);
  };

  const handlePopoverEnter = () => {
    // Cancel close if mouse enters popover
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handlePopoverLeave = () => {
    handleClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setAnchorEl(null);
    }
  };

  return (
    <>
      <Box
        component="span"
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        onFocus={handleOpen}
        onBlur={handleClose}
        onKeyDown={handleKeyDown}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          cursor: 'pointer',
          color: 'primary.main',
          '&:hover': {
            color: 'primary.dark',
          },
        }}
        aria-label={`Show schema info for ${title}`}
        tabIndex={0}
      >
        {children || <IconInfoCircle size={18} />}
      </Box>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        onMouseEnter={handlePopoverEnter}
        onMouseLeave={handlePopoverLeave}
        sx={{
          pointerEvents: 'auto',
          '& .MuiPopover-paper': {
            maxWidth: `${maxWidth}px`,
            bgcolor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.shadows[8],
            borderRadius: 2,
            overflow: 'hidden',
          },
        }}
        disableRestoreFocus
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Default Columns: {title}
          </Typography>
          <Box
            component="img"
            src={imageSrc}
            alt={`Schema preview for ${title}`}
            sx={{
              width: '100%',
              height: 'auto',
              display: 'block',
              borderRadius: 1,
              border: `1px solid ${theme.palette.divider}`,
            }}
            onError={(e) => {
              // Fallback to placeholder if image doesn't exist
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5TY2hlbWEgUHJldmlldyBQbGFjZWhvbGRlcjwvdGV4dD48L3N2Zz4=';
            }}
          />
        </Box>
      </Popover>
    </>
  );
};

export default RecordSchemaInfoPopover;

