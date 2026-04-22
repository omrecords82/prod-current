import { Box, IconButton, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material';

import { IconPower } from '@tabler/icons-react';

import { useAuth } from '@/context/AuthContext';
import { CustomizerContext } from '@/context/CustomizerContext';
import { UserDataContext } from '@/context/UserDataContext';
import { getBuildVersionString } from '@/shared/lib/buildInfo';
import { RoleAvatar } from '@/utils/roleAvatars';
import { useContext } from 'react';
import { Link } from 'react-router-dom';

export const Profile = () => {
  const { isSidebarHover, isCollapse } = useContext(CustomizerContext);
  const { user } = useAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Use UserDataContext for profile data synchronization
  const userDataContext = useContext(UserDataContext);
  const profileData = userDataContext?.profileData;

  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const hideMenu = lgUp ? isCollapse == 'mini-sidebar' && !isSidebarHover : '';

  // Don't show profile if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <>
    <div className="om-sidebar-profile">
      {!hideMenu ? (
        <>
          <RoleAvatar role={user?.role} size={38} />

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.8125rem',
                color: isDark ? '#f3f4f6' : '#2d1b4e',
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {profileData?.name ||
               (user?.first_name?.trim() && user?.last_name?.trim()
                ? `${user.first_name} ${user.last_name}`
                : user?.email || 'Unknown User')}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.6875rem',
                color: isDark ? '#9ca3af' : '#6b7280',
                textTransform: 'capitalize',
              }}
            >
              {profileData?.role || user?.role || 'User'}
            </Typography>
          </Box>
          <Tooltip title="Logout" placement="top">
            <IconButton
              component={Link}
              to="auth/login"
              aria-label="logout"
              size="small"
              sx={{
                color: isDark ? '#9ca3af' : '#6b7280',
                '&:hover': {
                  color: isDark ? '#d4af37' : '#2d1b4e',
                  backgroundColor: isDark ? 'rgba(212, 175, 55, 0.1)' : 'rgba(45, 27, 78, 0.08)',
                },
              }}
            >
              <IconPower size="18" />
            </IconButton>
          </Tooltip>
        </>
      ) : (
        ''
      )}
    </div>
    {!hideMenu && (
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          textAlign: 'center',
          opacity: 0.4,
          pb: 1,
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.625rem',
        }}
      >
        v{getBuildVersionString()}
      </Typography>
    )}
    </>
  );
};
