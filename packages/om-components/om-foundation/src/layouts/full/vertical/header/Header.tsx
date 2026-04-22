import config from '@/context/config';
import { AppBar, Box, IconButton, Stack, Toolbar, styled, useMediaQuery } from '@mui/material';
import { IconMenu2 } from '@tabler/icons-react';
import { useContext } from 'react';

// Components
import OrthodoxThemeToggle from '@/shared/ui/OrthodoxThemeToggle';
import WorkSessionControl from '../../../../components/layout/WorkSessionControl';
import ChurchHeader from '../../../../components/layout/ChurchHeader';
import Language from './Language';
import LastLoggedIn from './LastLoggedIn';
import MobileRightSidebar from './MobileRightSidebar';
import Navigation from './Navigation';
import Notifications from './Notification';
import Profile from './Profile';
import UpdatesIndicator from './UpdatesIndicator';

// Contexts & Hooks
import { useAuth } from '@/context/AuthContext';
import { CustomizerContext } from '@/context/CustomizerContext';

const Header = () => {
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const lgDown = useMediaQuery((theme: any) => theme.breakpoints.down('lg'));
  const { authenticated } = useAuth();

  const TopbarHeight = config.topbarHeight;
  const { setIsCollapse, isCollapse, isMobileSidebar, setIsMobileSidebar, headerBackground } = useContext(CustomizerContext);

  const AppBarStyled = styled(AppBar)(({ theme }) => ({
    boxShadow: theme.palette.mode === 'dark'
      ? '0 1px 2px 0 rgba(0, 0, 0, 0.3)'
      : '0 1px 3px 0 rgba(45, 27, 78, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
    background: theme.palette.mode === 'dark'
      ? 'rgba(15, 17, 23, 0.95)'
      : 'rgba(255, 255, 255, 0.92)',
    backdropFilter: 'blur(12px)',
    borderBottom: theme.palette.mode === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.06)'
      : '1px solid rgba(45, 27, 78, 0.06)',
    [theme.breakpoints.up('lg')]: {
      minHeight: TopbarHeight,
    },
  }));

  const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
    width: '100%',
    color: theme.palette.mode === 'dark' ? '#f3f4f6' : '#2d1b4e',
    padding: '0 16px',
    minHeight: TopbarHeight,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  }));

  return (
    <AppBarStyled position="sticky" color="default">
      <ToolbarStyled>
        {/* Menu Toggle Button */}
        <IconButton
          color="inherit"
          aria-label="menu"
          onClick={() => {
            if (lgUp) {
              isCollapse === "full-sidebar" ? setIsCollapse("mini-sidebar") : setIsCollapse("full-sidebar");
            } else {
              setIsMobileSidebar(!isMobileSidebar);
            }
          }}
          sx={{ 
            mr: 1,
            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
          }}
        >
          <IconMenu2 size="20" />
        </IconButton>

        {/* Navigation Links */}
        {lgUp ? (
          <Box sx={{ mr: 2 }}>
            <Navigation />
          </Box>
        ) : null}

        {/* Church Header with Switch Dropdown */}
        {authenticated && (
          <Box sx={{ mr: 'auto' }}>
            <ChurchHeader />
          </Box>
        )}

        {/* Right Side Actions */}
        <Stack spacing={1.5} direction="row" alignItems="center" sx={{ ml: 'auto' }}>

          {/* Work Session Timer */}
          {authenticated && <WorkSessionControl />}

          {/* User Tools */}
          <LastLoggedIn />
          <Language />
          <OrthodoxThemeToggle variant="icon" />
          <UpdatesIndicator />
          <Notifications />
          
          {lgDown ? <MobileRightSidebar /> : null}

          {/* Profile - Slightly separated */}
          <Box sx={{ ml: 0.5 }}>
            <Profile />
          </Box>
        </Stack>
      </ToolbarStyled>
    </AppBarStyled>
  );
};

export default Header;
