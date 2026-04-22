// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {
    Avatar,
    Box,
    Button,
    Divider,
    IconButton,
    Menu,
    Stack,
    Typography
} from '@mui/material';
import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { UserDataContext } from '../../../../context/UserDataContext';
import { RoleAvatar, getRoleLabel } from '../../../../utils/roleAvatars';
import * as dropdownData from './data';

import { IconMail, IconUserOff } from '@tabler/icons-react';

const Profile = () => {
  const { user, authenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl2, setAnchorEl2] = useState(null);
  
  // Use UserDataContext for profile data synchronization
  const context = useContext(UserDataContext);
  const profileData = context?.profileData;
  
  // Role from auth context

  const handleClick2 = (event: any) => {
    setAnchorEl2(event.currentTarget);
  };

  const handleClose2 = () => {
    setAnchorEl2(null);
  };

  const handleLogout = async () => {
    try {
      handleClose2(); // Close the menu first
      await logout();
      // Clear any remaining auth state
      localStorage.removeItem('auth_user');
      sessionStorage.clear();
      // Redirect to homepage after logout
      window.location.href = 'https://orthodoxmetrics.com/frontend-pages/homepage';
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, clear local state and redirect
      localStorage.removeItem('auth_user');
      sessionStorage.clear();
      // Redirect to homepage after logout
      window.location.href = 'https://orthodoxmetrics.com/frontend-pages/homepage';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <IconButton
          size="large"
          aria-label={authenticated ? "User profile" : "Not logged in"}
          color="inherit"
          aria-controls="msgs-menu"
          aria-haspopup={authenticated ? "true" : "false"}
          disabled={!authenticated}
          sx={{
            ...(typeof anchorEl2 === 'object' && {
              color: 'primary.main',
            }),
            ...(!authenticated && {
              opacity: 0.6,
            }),
          }}
          onClick={authenticated ? handleClick2 : undefined}
        >
          {authenticated ? (
            <RoleAvatar role={user?.role} size={35} />
          ) : (
            <IconUserOff 
              size={35} 
              style={{ 
                color: 'rgba(255, 255, 255, 0.6)',
                strokeWidth: 1.5
              }} 
            />
          )}
        </IconButton>
      </Box>
      {/* ------------------------------------------- */}
      {/* Message Dropdown */}
      {/* ------------------------------------------- */}
      <Menu
        id="msgs-menu"
        anchorEl={anchorEl2}
        keepMounted
        open={Boolean(anchorEl2)}
        onClose={handleClose2}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        sx={{
          '& .MuiMenu-paper': {
            width: '360px',
            p: 4,
          },
        }}
      >
        <Typography variant="h5">User Profile</Typography>
        <Stack direction="row" py={3} spacing={2} alignItems="center">
          <RoleAvatar role={user?.role} size={80} />
          <Box>
            <Typography variant="subtitle2" color="textPrimary" fontWeight={600}>
              {user?.nick || 
               profileData?.name || 
               (user?.first_name?.trim() && user?.last_name?.trim()
                ? `${user.first_name} ${user.last_name}`
                : 'User Profile')}
            </Typography>
            <Typography variant="subtitle2" color="textSecondary">
              {profileData?.role || user?.role || 'User'}
            </Typography>
            <Typography
              variant="subtitle2"
              color="textSecondary"
              display="flex"
              alignItems="center"
              gap={1}
            >
              <IconMail width={15} height={15} />
              {profileData?.email || user?.email || 'No email'}
            </Typography>
          </Box>
        </Stack>
        <Divider />
        {dropdownData.profile.filter((item) => !item.roleRestriction || item.roleRestriction.includes(user?.role || profileData?.role)).map((profile) => (
          <Box key={profile.title}>
            <Box sx={{ py: 2, px: 0 }} className="hover-text-primary">
              <Link to={profile.href}>
                <Stack direction="row" spacing={2}>
                  <Box
                    width="45px"
                    height="45px"
                    bgcolor="primary.light"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Avatar
                      src={profile.icon}
                      alt={profile.icon}
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: 0,
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography
                      variant="subtitle2"
                      fontWeight={600}
                      color="textPrimary"
                      className="text-hover"
                      noWrap
                      sx={{
                        width: '240px',
                      }}
                    >
                      {profile.title}
                    </Typography>
                    <Typography
                      color="textSecondary"
                      variant="subtitle2"
                      sx={{
                        width: '240px',
                      }}
                      noWrap
                    >
                      {profile.subtitle}
                    </Typography>
                  </Box>
                </Stack>
              </Link>
            </Box>
          </Box>
        ))}
        {authenticated && user && (
          <Box mt={2}>
            <Button
              onClick={handleLogout}
              variant="outlined"
              color="primary"
              fullWidth
            >
              Logout
            </Button>
          </Box>
        )}
      </Menu>
    </Box>
  );
};

export default Profile;
