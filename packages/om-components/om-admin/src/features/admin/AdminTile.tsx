/**
 * Orthodox Metrics - Admin Tile Component
 * Reusable tile component for the Super Admin Control Panel
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Chip, useTheme } from '@mui/material';
import { useAuth } from '@/context/AuthContext';

interface AdminTileProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  to: string;
  roleRestriction?: string[];
  badge?: string;
  badgeColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  disabled?: boolean;
  comingSoon?: boolean;
}

/**
 * AdminTile Component
 * Individual tile for the admin dashboard with hover effects and role-based access
 */
export const AdminTile: React.FC<AdminTileProps> = ({
  icon,
  label,
  description,
  to,
  roleRestriction = [],
  badge,
  badgeColor = 'primary',
  disabled = false,
  comingSoon = false
}) => {
  const theme = useTheme();
  const { user, hasRole } = useAuth();

  // Check if user has required role
  const hasAccess = roleRestriction.length === 0 || roleRestriction.some(role => hasRole(role as any));

  if (!hasAccess) {
    return null; // Hide tile if user doesn't have access
  }

  const isClickable = !disabled && !comingSoon;

  const TileContent = (
    <Card
      sx={{
        position: 'relative',
        height: '180px',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        borderRadius: 4,
        border: `2px solid transparent`,
        background: theme.palette.mode === 'dark' 
          ? 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)'
          : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)',
        backdropFilter: 'blur(20px)',
        opacity: disabled || comingSoon ? 0.6 : 1,
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: theme.palette.mode === 'dark'
            ? 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.1) 0%, transparent 50%)'
            : 'radial-gradient(circle at 50% 0%, rgba(0,0,0,0.03) 0%, transparent 50%)',
          pointerEvents: 'none'
        },
        '&:hover': isClickable ? {
          transform: 'translateY(-8px) scale(1.02)',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)'
            : '0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
          border: `2px solid ${theme.palette.primary.main}`,
          '&::before': {
            background: theme.palette.mode === 'dark'
              ? `radial-gradient(circle at 50% 0%, ${theme.palette.primary.main}20 0%, transparent 70%)`
              : `radial-gradient(circle at 50% 0%, ${theme.palette.primary.main}10 0%, transparent 70%)`
          },
          '& .tile-icon': {
            transform: 'scale(1.15) rotate(5deg)',
            color: theme.palette.primary.main,
          },
          '& .tile-label': {
            color: theme.palette.primary.main,
          },
          '& .tile-description': {
            color: theme.palette.text.primary,
          }
        } : {}
      }}
    >
      <CardContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          textAlign: 'center',
          p: 4,
          position: 'relative',
          zIndex: 1,
          '&:last-child': { pb: 4 }
        }}
      >
        {/* Badge */}
        {(badge || comingSoon) && (
          <Box
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 2
            }}
          >
            <Chip
              label={comingSoon ? 'Coming Soon' : badge}
              size="small"
              color={comingSoon ? 'warning' : badgeColor}
              variant="filled"
              sx={{
                fontSize: '0.7rem',
                height: 22,
                fontWeight: 700,
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                backdropFilter: 'blur(10px)'
              }}
            />
          </Box>
        )}

        {/* Icon */}
        <Box
          className="tile-icon"
          sx={{
            fontSize: '3.5rem',
            mb: 2,
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            color: theme.palette.text.primary,
            filter: theme.palette.mode === 'dark' 
              ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
              : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: theme.palette.mode === 'dark'
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(0,0,0,0.03)'
          }}
        >
          {icon}
        </Box>

        {/* Label */}
        <Typography
          className="tile-label"
          variant="h6"
          component="div"
          sx={{
            fontWeight: 700,
            mb: 1,
            transition: 'color 0.4s ease',
            fontSize: '1.125rem',
            lineHeight: 1.2,
            letterSpacing: '-0.01em'
          }}
        >
          {label}
        </Typography>

        {/* Description */}
        {description && (
          <Typography
            className="tile-description"
            variant="body2"
            color="text.secondary"
            sx={{
              fontSize: '0.875rem',
              lineHeight: 1.5,
              maxWidth: '90%',
              transition: 'color 0.4s ease',
              fontWeight: 500
            }}
          >
            {description}
          </Typography>
        )}

        {/* Coming Soon or Disabled Overlay */}
        {(disabled || comingSoon) && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.1)',
              borderRadius: 3,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 1
              }}
            >
              {comingSoon ? 'Coming Soon' : 'Disabled'}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  // Wrap with Link if clickable and not coming soon
  if (isClickable) {
    return (
      <Link 
        to={to} 
        style={{ textDecoration: 'none' }}
        aria-label={`Navigate to ${label}`}
      >
        {TileContent}
      </Link>
    );
  }

  return TileContent;
};

export default AdminTile;
