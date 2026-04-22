import { Box, SxProps, Theme } from '@mui/material';
import {
  IconCrown,
  IconShieldCheck,
  IconBuilding,
  IconCross,
  IconBook,
  IconPencil,
  IconEye,
  IconUser,
} from '@tabler/icons-react';
import React from 'react';

type RoleConfig = {
  icon: React.ElementType;
  color: string;
  label: string;
};

export const ROLE_AVATAR_CONFIG: Record<string, RoleConfig> = {
  super_admin: { icon: IconCrown, color: '#7c3aed', label: 'Super Admin' },
  admin: { icon: IconShieldCheck, color: '#2563eb', label: 'Admin' },
  church_admin: { icon: IconBuilding, color: '#0891b2', label: 'Church Admin' },
  priest: { icon: IconCross, color: '#059669', label: 'Priest' },
  deacon: { icon: IconBook, color: '#d97706', label: 'Deacon' },
  editor: { icon: IconPencil, color: '#dc2626', label: 'Editor' },
  viewer: { icon: IconEye, color: '#6b7280', label: 'Viewer' },
  guest: { icon: IconUser, color: '#9ca3af', label: 'Guest' },
};

export function getRoleColor(role?: string): string {
  return ROLE_AVATAR_CONFIG[role || '']?.color || '#6b7280';
}

export function getRoleLabel(role?: string): string {
  return ROLE_AVATAR_CONFIG[role || '']?.label || role || 'User';
}

interface RoleAvatarProps {
  role?: string;
  size?: number;
  sx?: SxProps<Theme>;
}

export const RoleAvatar: React.FC<RoleAvatarProps> = ({ role, size = 40, sx }) => {
  const config = ROLE_AVATAR_CONFIG[role || ''] || ROLE_AVATAR_CONFIG.guest;
  const IconComponent = config.icon;
  const iconSize = Math.round(size * 0.5);

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: config.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...sx,
      }}
    >
      <IconComponent size={iconSize} color="#fff" stroke={1.8} />
    </Box>
  );
};
