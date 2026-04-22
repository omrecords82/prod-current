import { Avatar, Box, Typography, Grid, Stack } from '@mui/material';
import * as dropdownData from './data';
import { Link } from 'react-router-dom';
import { useMenuVisibility } from '../../../../context/MenuVisibilityContext';
import { useAuth } from '@/context/AuthContext';
import { getAppsLink } from './data';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';

const AppLinks = () => {
  const { user } = useAuth();
  const { visibleMenus } = useMenuVisibility();

  // Use filtered appsLink based on user role
  const visibleApps = getAppsLink(user);

  // Map dropdown app hrefs to menu IDs
  const appIdMap: { [href: string]: string } = {
    '/apps/notes': 'app-notes',
    '/apps/email': 'app-email',
    '/apps/kanban': 'app-kanban',
    '/apps/ocr-upload': 'app-ocr-upload',
    '/apps/invoice/list': 'app-invoice',
  };

  // (Optional) If you want to further filter by visibleMenus, you can do so here, but only if needed.
  // const filteredVisibleApps = visibleApps.filter(app => {
  //   const menuId = appIdMap[app.href];
  //   return menuId ? visibleMenus[menuId] : true;
  // });

  return (
    (<Grid container spacing={3} mb={4}>
      {visibleApps.map((links, index) => (
        <Grid
          key={index}
          size={{
            lg: 6
          }}>
          <Link to={links.href} className="hover-text-primary">
            <Stack direction="row" spacing={2}>
              <Box
                minWidth="45px"
                height="45px"
                bgcolor="grey.100"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Avatar
                  src={links.avatar}
                  alt={links.avatar}
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
                  noWrap
                  className="text-hover"
                  sx={{
                    width: '240px',
                  }}
                >
                  {links.title}
                </Typography>
                <Typography
                  color="textSecondary"
                  variant="subtitle2"
                  fontSize="12px"
                  sx={{
                    width: '240px',
                  }}
                  noWrap
                >
                  {links.subtext}
                </Typography>
              </Box>
            </Stack>
          </Link>
        </Grid>
      ))}
    </Grid>)
  );
};

export default AppLinks;
