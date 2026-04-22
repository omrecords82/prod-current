/**
 * ChurchCard.tsx — Church card and status badge for USChurchMapPage sidebar.
 */

import React, { useState } from 'react';
import {
  alpha,
  Box,
  Chip,
  IconButton,
  Link,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  FilterList as FilterIcon,
  Language as WebIcon,
  OpenInNew as OpenIcon,
  Phone as PhoneIcon,
  Place as PlaceIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { STATUS_CONFIG } from './constants';
import type { EnrichedChurch, OpStatus } from './types';

export const StatusBadge: React.FC<{ status: OpStatus; size?: 'small' | 'medium' }> = ({ status, size = 'small' }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.directory;
  return (
    <Chip
      label={cfg.label}
      size={size}
      sx={{
        fontWeight: 600,
        fontSize: size === 'small' ? '0.65rem' : '0.75rem',
        height: size === 'small' ? 20 : 26,
        bgcolor: alpha(cfg.color, 0.12),
        color: cfg.color,
        border: `1px solid ${alpha(cfg.color, 0.3)}`,
      }}
    />
  );
};

const ChurchCard: React.FC<{
  church: EnrichedChurch;
  isDark: boolean;
  isSelected: boolean;
  onClick: () => void;
  onAction: (action: string) => void;
}> = ({ church, isDark, isSelected, onClick, onAction }) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const cfg = STATUS_CONFIG[church.op_status] || STATUS_CONFIG.directory;

  return (
    <Box
      onClick={onClick}
      sx={{
        p: 1.5,
        borderRadius: 1.5,
        cursor: 'pointer',
        border: isSelected ? `2px solid ${cfg.color}` : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        bgcolor: isSelected ? alpha(cfg.color, isDark ? 0.08 : 0.04) : 'transparent',
        '&:hover': { bgcolor: alpha(cfg.color, isDark ? 0.06 : 0.03) },
        transition: 'all 0.15s',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: cfg.color, mt: 0.7, flexShrink: 0 }} />
        <Typography variant="body2" fontWeight={600} sx={{ flex: 1, fontSize: '0.82rem', lineHeight: 1.35 }}>
          {church.name}
        </Typography>
        <StatusBadge status={church.op_status} />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1.75, mb: 0.5 }}>
        <PlaceIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
          {[church.city, church.state_code].filter(Boolean).join(', ') || '—'}
        </Typography>
        {church.jurisdiction && (
          <Chip label={church.jurisdiction} size="small" sx={{ fontSize: '0.6rem', height: 16, ml: 0.5 }} />
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, ml: 1.75, flexWrap: 'wrap' }}>
        {church.stage_label && church.op_status !== 'directory' && (
          <Chip
            label={church.stage_label}
            size="small"
            sx={{
              fontSize: '0.6rem', height: 16,
              bgcolor: church.stage_color ? alpha(church.stage_color, 0.12) : undefined,
              color: church.stage_color || undefined,
            }}
          />
        )}
        {church.website && (
          <Tooltip title={church.website}>
            <Link
              href={church.website}
              target="_blank"
              rel="noopener"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.25, textDecoration: 'none' }}
            >
              <WebIcon sx={{ fontSize: 11 }} />
              <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>Web</Typography>
            </Link>
          </Tooltip>
        )}
        {church.phone && (
          <Tooltip title={church.phone}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <PhoneIcon sx={{ fontSize: 11, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{church.phone}</Typography>
            </Box>
          </Tooltip>
        )}

        <Box sx={{ ml: 'auto' }}>
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); }}
            sx={{ p: 0.25 }}
          >
            <FilterIcon sx={{ fontSize: 14 }} />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            slotProps={{ paper: { sx: { minWidth: 160 } } }}
          >
            <MenuItem dense onClick={() => { setMenuAnchor(null); onAction('view'); }}>
              <ViewIcon sx={{ fontSize: 16, mr: 1 }} /> View Detail
            </MenuItem>
            {church.op_status === 'directory' && (
              <MenuItem dense onClick={() => { setMenuAnchor(null); onAction('onboard'); }}>
                <AddIcon sx={{ fontSize: 16, mr: 1 }} /> Start Onboarding
              </MenuItem>
            )}
            {church.op_status === 'onboarding' && (
              <MenuItem dense onClick={() => { setMenuAnchor(null); onAction('resume'); }}>
                <OpenIcon sx={{ fontSize: 16, mr: 1 }} /> Resume Onboarding
              </MenuItem>
            )}
          </Menu>
        </Box>
      </Box>
    </Box>
  );
};

export default ChurchCard;
