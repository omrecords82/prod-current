/**
 * OcrStudioNav — Compact mini-navigation bar for OCR Studio pages.
 * Drop into any OCR Studio sub-page to enable quick jumps between siblings.
 *
 * Preserves `?church=XX` URL param when navigating between sibling pages
 * so each page's own church selector stays in sync.
 */

import {
  Assessment as AssessmentIcon,
  History as HistoryIcon,
  Home as HomeIcon,
  CloudUpload as UploadIcon,
  ViewColumn as ViewColumnIcon,
  TableRows as TableRowsIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { alpha, Box, Button, Stack, useTheme } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import React, { useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useOptionalOcrStudioPaths } from '../studio-interface/OcrStudioPathContext';
import { ocrStudioPathWithChurch } from '../utils/ocrStudioChurch';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactElement;
  /** When true, only super_admin sees this link (matches backend requireRole guards). */
  superAdminOnly?: boolean;
}

const OcrStudioNav: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isSuperAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const pathsCtx = useOptionalOcrStudioPaths();

  const navItems = useMemo((): NavItem[] => {
    const base = pathsCtx?.basePath ?? '/devel/ocr-studio';
    const isPortal = pathsCtx?.mode === 'portal';
    if (isPortal) {
      return [
        { label: 'Hub', path: base, icon: <HomeIcon fontSize="small" /> },
        { label: 'Analyze', path: `${base}/analyze`, icon: <AssessmentIcon fontSize="small" /> },
        { label: 'Upload', path: `${base}/upload`, icon: <UploadIcon fontSize="small" /> },
        { label: 'Review', path: `${base}/review`, icon: <AssessmentIcon fontSize="small" /> },
        { label: 'Settings', path: `${base}/settings`, icon: <SettingsIcon fontSize="small" /> },
      ];
    }
    return [
      { label: 'Hub', path: base, icon: <HomeIcon fontSize="small" /> },
      { label: 'Analyze', path: `${base}/analyze`, icon: <AssessmentIcon fontSize="small" /> },
      { label: 'Upload', path: `${base}/upload`, icon: <UploadIcon fontSize="small" /> },
      { label: 'Job History', path: `${base}/jobs`, icon: <HistoryIcon fontSize="small" />, superAdminOnly: true },
      { label: 'Record Headers', path: `${base}/record-fields`, icon: <TableRowsIcon fontSize="small" /> },
      { label: 'Table Extractor', path: `${base}/table-extractor`, icon: <AssessmentIcon fontSize="small" />, superAdminOnly: true },
      { label: 'Layout Templates', path: `${base}/layout-templates`, icon: <ViewColumnIcon fontSize="small" />, superAdminOnly: true },
    ];
  }, [pathsCtx]);

  const visibleItems = useMemo(
    () => navItems.filter((item) => !item.superAdminOnly || isSuperAdmin()),
    [navItems, isSuperAdmin],
  );

  const handleNavigate = useCallback(
    (targetPath: string) => {
      navigate(ocrStudioPathWithChurch(targetPath, searchParams));
    },
    [navigate, searchParams],
  );

  const isActivePath = useCallback((itemPath: string) => {
    if (pathname === itemPath) return true;
    if (itemPath !== (pathsCtx?.basePath ?? '/devel/ocr-studio') && pathname.startsWith(`${itemPath}/`)) {
      return true;
    }
    return false;
  }, [pathname, pathsCtx?.basePath]);

  return (
    <Box
      sx={{
        px: { xs: 0, sm: 0.5 },
        py: 0.75,
        mb: 1.5,
        borderBottom: '1px solid',
        borderColor: theme.palette.divider,
        bgcolor: alpha(theme.palette.primary.main, 0.03),
      }}
    >
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center">
        {visibleItems.map((item) => {
          const isActive = isActivePath(item.path);
          return (
            <Button
              key={item.path}
              size="small"
              startIcon={item.icon}
              onClick={() => !isActive && handleNavigate(item.path)}
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
