/**
 * ThemeCustomizer - Enhanced theme customization component
 * Adapted from Raydar template with Material-UI integration
 */

import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  Divider,
  IconButton,
} from '@mui/material';
import { IconX, IconPalette } from '@tabler/icons-react';

export interface ThemeSettings {
  mode: 'light' | 'dark';
  primaryColor: string;
  sidebarTheme: 'light' | 'dark';
  topbarTheme: 'light' | 'dark';
  sidebarSize: 'default' | 'condensed' | 'hidden' | 'sm-hover-active' | 'sm-hover';
}

export interface ThemeCustomizerProps {
  open: boolean;
  onClose: () => void;
  settings: ThemeSettings;
  onChange: (settings: Partial<ThemeSettings>) => void;
  onReset: () => void;
}

/**
 * Theme customization panel for adjusting application appearance
 * 
 * @example
 * ```tsx
 * <ThemeCustomizer
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   settings={themeSettings}
 *   onChange={handleThemeChange}
 *   onReset={handleReset}
 * />
 * ```
 */
export const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({
  open,
  onClose,
  settings,
  onChange,
  onReset,
}) => {
  const ColorSchemeSection = () => (
    <Box mb={3}>
      <Typography variant="h6" gutterBottom>
        Color Scheme
      </Typography>
      <FormControl component="fieldset">
        <RadioGroup
          value={settings.mode}
          onChange={(e) => onChange({ mode: e.target.value as 'light' | 'dark' })}
        >
          <FormControlLabel
            value="light"
            control={<Radio />}
            label="Light"
          />
          <FormControlLabel
            value="dark"
            control={<Radio />}
            label="Dark"
          />
        </RadioGroup>
      </FormControl>
    </Box>
  );

  const TopbarThemeSection = () => (
    <Box mb={3}>
      <Typography variant="h6" gutterBottom>
        Topbar Theme
      </Typography>
      <FormControl component="fieldset">
        <RadioGroup
          value={settings.topbarTheme}
          onChange={(e) => onChange({ topbarTheme: e.target.value as 'light' | 'dark' })}
        >
          <FormControlLabel
            value="light"
            control={<Radio />}
            label="Light"
          />
          <FormControlLabel
            value="dark"
            control={<Radio />}
            label="Dark"
          />
        </RadioGroup>
      </FormControl>
    </Box>
  );

  const SidebarThemeSection = () => (
    <Box mb={3}>
      <Typography variant="h6" gutterBottom>
        Sidebar Theme
      </Typography>
      <FormControl component="fieldset">
        <RadioGroup
          value={settings.sidebarTheme}
          onChange={(e) => onChange({ sidebarTheme: e.target.value as 'light' | 'dark' })}
        >
          <FormControlLabel
            value="light"
            control={<Radio />}
            label="Light"
          />
          <FormControlLabel
            value="dark"
            control={<Radio />}
            label="Dark"
          />
        </RadioGroup>
      </FormControl>
    </Box>
  );

  const SidebarSizeSection = () => {
    const sizeOptions = [
      { value: 'default', label: 'Default' },
      { value: 'condensed', label: 'Condensed' },
      { value: 'hidden', label: 'Hidden' },
      { value: 'sm-hover-active', label: 'Small Hover Active' },
      { value: 'sm-hover', label: 'Small Hover' },
    ];

    return (
      <Box mb={3}>
        <Typography variant="h6" gutterBottom>
          Sidebar Size
        </Typography>
        <FormControl component="fieldset">
          <RadioGroup
            value={settings.sidebarSize}
            onChange={(e) => onChange({ sidebarSize: e.target.value as any })}
          >
            {sizeOptions.map((option) => (
              <FormControlLabel
                key={option.value}
                value={option.value}
                control={<Radio />}
                label={option.label}
              />
            ))}
          </RadioGroup>
        </FormControl>
      </Box>
    );
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: 320 }
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center">
            <IconPalette size={20} />
            <Typography variant="h6" ml={1}>
              Theme Settings
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <IconX size={20} />
          </IconButton>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        <ColorSchemeSection />
        
        {settings.mode === 'light' && (
          <>
            <TopbarThemeSection />
            <SidebarThemeSection />
          </>
        )}
        
        <SidebarSizeSection />
        
        <Box mt={3}>
          <Button
            variant="contained"
            color="error"
            fullWidth
            onClick={onReset}
          >
            Reset to Defaults
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default ThemeCustomizer;