/**
 * OcrStudioNav — Compact mini-navigation bar for OCR Studio pages.
 * Drop into any OCR Studio sub-page to enable quick jumps between siblings.
 */

import {
  Assessment as AssessmentIcon,
  History as HistoryIcon,
  Home as HomeIcon,
  Settings as SettingsIcon,
  CloudUpload as UploadIcon,
  ViewColumn as ViewColumnIcon,
} from '@mui/icons-material';
import { alpha, Box, Button, Stack, useTheme } from '@mui/material';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactElement;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Hub',              path: '/devel/ocr-studio',                 icon: <HomeIcon fontSize="small" /> },
  { label: 'Upload',           path: '/devel/ocr-studio/upload',          icon: <UploadIcon fontSize="small" /> },
  { label: 'Job History',      path: '/devel/ocr-studio/jobs',            icon: <HistoryIcon fontSize="small" /> },
  { label: 'Settings',         path: '/devel/ocr-studio/settings',        icon: <SettingsIcon fontSize="small" /> },
  { label: 'Table Extractor',  path: '/devel/ocr-studio/table-extractor', icon: <AssessmentIcon fontSize="small" /> },
  { label: 'Layout Templates', path: '/devel/ocr-studio/layout-templates', icon: <ViewColumnIcon fontSize="small" /> },
];

const OcrStudioNav: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <Box
      sx={{
        px: { xs: 1, sm: 2 },
        py: 0.75,
        mb: 1.5,
        borderBottom: '1px solid',
        borderColor: theme.palette.divider,
        bgcolor: alpha(theme.palette.primary.main, 0.03),
      }}
    >
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Button
              key={item.path}
              size="small"
              startIcon={item.icon}
              onClick={() => !isActive && navigate(item.path)}
              sx={{
                textTransform: 'none',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.78rem',
                color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                bgcolor: isActive ? alpha(theme.palette.primary.main, 0.10) : 'transparent',
                borderRadius: 1,
                px: 1.5,
                minHeight: 32,
                '&:hover': {
                  bgcolor: isActive
                    ? alpha(theme.palette.primary.main, 0.14)
                    : alpha(theme.palette.action.hover, 0.06),
                },
              }}
            >
              {item.label}
            </Button>
          );
        })}
      </Stack>
    </Box>
  );
};

export default OcrStudioNav;
