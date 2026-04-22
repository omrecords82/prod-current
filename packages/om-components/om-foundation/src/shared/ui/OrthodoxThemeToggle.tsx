/**
 * OrthodoxThemeToggle Component
 * 
 * Theme toggle component for OrthodoxMetrics.
 * Allows users to switch between light/dark mode and select theme colors.
 * 
 * Variants:
 * - icon: Simple icon button toggle
 * - switch: Toggle switch with optional text
 * - menu: Advanced settings menu with theme colors
 */

import { CustomizerContext } from '@/context/CustomizerContext';
import {
    DarkMode as DarkModeIcon,
    LightMode as LightModeIcon,
    Palette as PaletteIcon
} from '@mui/icons-material';
import {
    Box,
    Chip,
    Divider,
    FormControlLabel,
    IconButton,
    Menu,
    MenuItem,
    Stack,
    Switch,
    Tooltip,
    Typography
} from '@mui/material';
import React, { useContext, useState } from 'react';

interface OrthodoxThemeToggleProps {
  showText?: boolean;
  variant?: 'icon' | 'switch' | 'menu';
  size?: 'small' | 'medium' | 'large';
}

const OrthodoxThemeToggle: React.FC<OrthodoxThemeToggleProps> = ({
  showText = false,
  variant = 'icon',
  size = 'medium',
}) => {
  const {
    activeMode,
    setActiveMode,
    activeTheme,
    setActiveTheme,
  } = useContext(CustomizerContext);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const toggleMode = () => {
    setActiveMode(activeMode === 'light' ? 'dark' : 'light');
  };

  const themes = [
    { key: 'WHITE_THEME', name: 'Resurrection White', color: '#F5F5F0' },
    { key: 'GREEN_THEME', name: 'Ordinary Time Green', color: '#A4C639' },
    { key: 'PURPLE_THEME', name: 'Lenten Purple', color: '#6B2D75' },
    { key: 'RED_THEME', name: 'Martyrs Red', color: '#B22234' },
    { key: 'BLUE_THEME', name: 'Theotokos Blue', color: '#1E6B8C' },
    { key: 'GOLD_THEME', name: 'Royal Gold', color: '#C9A227' },
    { key: 'LENT_THEME', name: 'Great Lent', color: '#1a1a1a' },
  ];

  // Icon variant - simple toggle button
  if (variant === 'icon') {
    return (
      <Tooltip
        title={`Switch to ${activeMode === 'light' ? 'dark' : 'light'} mode`}
        placement="bottom"
      >
        <IconButton
          onClick={toggleMode}
          size={size}
          className="orthodox-theme-toggle"
          sx={{
            color: 'text.primary',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          {activeMode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
        </IconButton>
      </Tooltip>
    );
  }

  // Switch variant - toggle switch with text
  if (variant === 'switch') {
    return (
      <Box className="orthodox-theme-switch" sx={{ display: 'flex', alignItems: 'center' }}>
        <FormControlLabel
          control={
            <Switch
              checked={activeMode === 'dark'}
              onChange={toggleMode}
            />
          }
          label={showText ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {activeMode === 'light' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              <Typography variant="body2">
                {activeMode === 'light' ? 'Light Mode' : 'Dark Mode'}
              </Typography>
            </Box>
          ) : ''}
        />
      </Box>
    );
  }

  // Menu variant - advanced settings menu
  if (variant === 'menu') {
    return (
      <>
        <Tooltip title="Theme Settings" placement="bottom">
          <IconButton
            onClick={handleMenuOpen}
            size={size}
            className="orthodox-theme-menu-toggle"
            sx={{
              color: 'text.primary',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <PaletteIcon />
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          PaperProps={{
            className: 'orthodox-theme-menu',
            sx: {
              minWidth: 280,
              mt: 1,
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography
              variant="h6"
              sx={{
                textAlign: 'center',
                mb: 1,
              }}
            >
              Theme Settings
            </Typography>
            <Divider />
          </Box>

          {/* Mode Toggle */}
          <MenuItem onClick={handleMenuClose}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" width="100%">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {activeMode === 'light' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                <Typography>
                  {activeMode === 'light' ? 'Light Mode' : 'Dark Mode'}
                </Typography>
              </Box>
              <Switch
                checked={activeMode === 'dark'}
                onChange={toggleMode}
                size="small"
              />
            </Stack>
          </MenuItem>

          <Divider />

          {/* Theme Colors */}
          <Box sx={{ p: 2 }}>
            <Typography
              variant="subtitle2"
              sx={{
                mb: 1,
              }}
            >
              Theme Colors
            </Typography>
            <Stack spacing={1}>
              {themes.map((theme) => (
                <MenuItem
                  key={theme.key}
                  onClick={() => {
                    setActiveTheme(theme.key);
                    handleMenuClose();
                  }}
                  sx={{
                    borderRadius: 1,
                    backgroundColor: activeTheme === theme.key ? 'action.selected' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={2} width="100%">
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        backgroundColor: theme.color,
                        border: '2px solid',
                        borderColor: 'divider',
                      }}
                    />
                    <Typography
                      sx={{
                        flexGrow: 1,
                      }}
                    >
                      {theme.name}
                    </Typography>
                    {activeTheme === theme.key && (
                      <Chip
                        label="Active"
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                        }}
                      />
                    )}
                  </Stack>
                </MenuItem>
              ))}
            </Stack>
          </Box>
        </Menu>
      </>
    );
  }

  return null;
};

export default OrthodoxThemeToggle;
