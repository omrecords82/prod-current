// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as React from 'react';
import {
  IconButton,
  Box,
  AppBar,
  useMediaQuery,
  Toolbar,
  styled,
  Stack,
  Theme,
} from '@mui/material';


import { IconMenu2, IconMoon, IconSun } from '@tabler/icons-react';
import Notifications from '@/layouts/full/vertical/header/Notification';
import Profile from '@/layouts/full/vertical/header/Profile';
import Search from '@/layouts/full/vertical/header/Search';
import Language from '@/layouts/full/vertical/header/Language';
import Navigation from '@/layouts/full/vertical/header/Navigation';
import Logo from '@/layouts/full/shared/logo/Logo';
import config from '@/context/config';
import { CustomizerContext } from '@/context/CustomizerContext';


const Header = () => {
  const lgDown = useMediaQuery((theme: Theme) => theme.breakpoints.down('lg'));
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));

  // drawer
  const { isLayout, setIsMobileSidebar, isMobileSidebar, activeMode, setActiveMode, headerBackground } = React.useContext(CustomizerContext);
  const TopbarHeight = config.topbarHeight;

  const AppBarStyled = styled(AppBar)(({ theme }) => ({
    background: headerBackground 
      ? `url(/images/bgtiled${headerBackground}.png) repeat`
      : theme.palette.background.paper,
    backgroundSize: 'auto',
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',

    [theme.breakpoints.up('lg')]: {
      minHeight: TopbarHeight,
    },
  }));
  const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
    margin: '0 auto',
    width: '100%',
    color: `${theme.palette.text.secondary} !important`,
  }));

  return (
    <AppBarStyled position="sticky" color="default" elevation={8}>
      <ToolbarStyled
        sx={{
          maxWidth: isLayout === 'boxed' ? 'lg' : '100%!important',
        }}
      >
        <Box sx={{ width: lgDown ? '45px' : 'auto', overflow: 'hidden' }}>
          <Logo />
        </Box>
        {/* ------------------------------------------- */}
        {/* Toggle Button Sidebar */}
        {/* ------------------------------------------- */}
        {lgDown ? (
          <IconButton
            color="inherit"
            aria-label="menu"
            onClick={() => setIsMobileSidebar(!isMobileSidebar)}>
            <IconMenu2 />
          </IconButton>
        ) : (
          ''
        )}
        {/* ------------------------------------------- */}
        {/* Search Dropdown */}
        {/* ------------------------------------------- */}
        <Search />
        {lgUp ? (
          <>
            <Navigation />
          </>
        ) : null}
        <Box flexGrow={1} />
        <Stack spacing={1} direction="row" alignItems="center">
          <Language />
          {/* ------------------------------------------- */}
          {/* Dark/Light Mode Toggle */}
          {/* ------------------------------------------- */}
          <IconButton 
            size="large" 
            color="inherit"
            onClick={() => setActiveMode(activeMode === 'light' ? 'dark' : 'light')}
          >
            {activeMode === 'light' ? (
              <IconMoon size="21" stroke="1.5" />
            ) : (
              <IconSun size="21" stroke="1.5" />
            )}
          </IconButton>
          <Notifications />

          <Profile />
        </Stack>
      </ToolbarStyled>
    </AppBarStyled>
  );
};

export default Header;
