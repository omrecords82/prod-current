/**
 * PagesMenu Component
 * 
 * Menu page for OrthodoxMetrics frontend pages.
 * Displays a navigation menu with links to various frontend pages.
 * 
 * Route: /frontend-pages/menu
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PUBLIC_ROUTES } from '@/config/publicRoutes';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Home as HomeIcon,
  ContactMail as ContactIcon,
  Work as PortfolioIcon,
  AttachMoney as PricingIcon,
  Article as BlogIcon,
  PhotoLibrary as GalleryIcon,
  MenuBook as MenuIcon,
} from '@mui/icons-material';

interface MenuItem {
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
}

const PagesMenu: React.FC = () => {
  const navigate = useNavigate();

  const menuItems: MenuItem[] = [
    {
      title: 'Homepage',
      description: 'Main landing page',
      path: PUBLIC_ROUTES.HOME,
      icon: <HomeIcon />,
    },
    {
      title: 'Contact',
      description: 'Contact us page',
      path: PUBLIC_ROUTES.CONTACT,
      icon: <ContactIcon />,
    },
    {
      title: 'Portfolio',
      description: 'View our portfolio',
      path: PUBLIC_ROUTES.HOME,
      icon: <PortfolioIcon />,
    },
    {
      title: 'Pricing',
      description: 'View pricing plans',
      path: PUBLIC_ROUTES.PRICING,
      icon: <PricingIcon />,
    },
    {
      title: 'Blog',
      description: 'Read our blog posts',
      path: PUBLIC_ROUTES.BLOG,
      icon: <BlogIcon />,
    },
    {
      title: 'Gallery',
      description: 'Browse our gallery',
      path: PUBLIC_ROUTES.HOME,
      icon: <GalleryIcon />,
    },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <Box sx={{ py: 8 }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <MenuIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h3" gutterBottom>
            Frontend Pages Menu
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Navigate to different pages of the application
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {menuItems.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.path}>
              <Card
                sx={{
                  height: '100%',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardActionArea
                  onClick={() => handleNavigate(item.path)}
                  sx={{ height: '100%' }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        mb: 2,
                        color: 'primary.main',
                      }}
                    >
                      {item.icon}
                      <Typography variant="h6" sx={{ ml: 1.5 }}>
                        {item.title}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {item.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 6 }} />

        <Box>
          <Typography variant="h5" gutterBottom>
            Quick Links
          </Typography>
          <List>
            {menuItems.map((item, index) => (
              <React.Fragment key={item.path}>
                <ListItem
                  button
                  onClick={() => handleNavigate(item.path)}
                  sx={{
                    borderRadius: 1,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <ListItemText
                    primary={item.title}
                    secondary={item.description}
                  />
                </ListItem>
                {index < menuItems.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        </Box>
      </Container>
    </Box>
  );
};

export default PagesMenu;
