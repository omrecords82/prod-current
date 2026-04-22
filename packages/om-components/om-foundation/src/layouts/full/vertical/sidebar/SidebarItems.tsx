// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, List, useMediaQuery } from '@mui/material';
import NavItem from './NavItem';
import NavCollapse from './NavCollapse';
import NavGroup from './NavGroup/NavGroup';
import { useFilteredMenuItems } from '@/shared/lib/useFilteredMenuItems';
import { useAuth } from '@/context/AuthContext';
import { useBadgeStates } from '@/shared/lib/useBadgeStates';

import { CustomizerContext } from '@/context/CustomizerContext';

const SidebarItems = () => {
  const { pathname } = useLocation();
  const pathDirect = pathname;
  const pathWithoutLastPart = pathname.slice(0, pathname.lastIndexOf('/'));
  const { isSidebarHover, isCollapse, isMobileSidebar, setIsMobileSidebar } = useContext(CustomizerContext);
  const { user } = useAuth();
  const menuItems = useFilteredMenuItems();
  const { badgeMap } = useBadgeStates();

  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const hideMenu: any = lgUp ? isCollapse == "mini-sidebar" && !isSidebarHover : '';

  return (
    <Box sx={{ px: 3 }}>
      <List sx={{ pt: 0 }} className="sidebarNav">
        {menuItems.map((item: any) => {
          if (item.subheader) {
            return <NavGroup item={item} hideMenu={hideMenu} key={item.subheader} />;
          } else if (item.children) {
            return (
              <NavCollapse
                menu={item}
                pathDirect={pathDirect}
                hideMenu={hideMenu}
                pathWithoutLastPart={pathWithoutLastPart}
                level={1}
                key={item.id}
                onClick={() => setIsMobileSidebar(!isMobileSidebar)}
                badgeMap={badgeMap}
              />
            );
          } else {
            return (
              <NavItem item={item} key={item.id} pathDirect={pathDirect} hideMenu={hideMenu}
                onClick={() => setIsMobileSidebar(!isMobileSidebar)} badgeMap={badgeMap} />
            );
          }
        })}
      </List>
    </Box>
  );
};
export default SidebarItems;
