/**
 * omTheme - Default theme export for OrthodoxMetrics
 * 
 * This file provides a default Material-UI theme that can be used
 * before the CustomizerContext is available.
 */
import { createTheme } from '@mui/material/styles';
import components from './Components';
import typography from './Typography';
import { shadows } from './Shadows';
import { baselightTheme } from './DefaultColors';
import { LightThemeColors } from './LightThemeColors';

// Get the first light theme as default (usually 'BLUE_THEME' or similar)
const defaultThemeOption = LightThemeColors[0] || LightThemeColors.find((theme) => theme.name === 'BLUE_THEME') || LightThemeColors[0];

// Create a default theme without context dependencies
const omTheme = createTheme({
  ...baselightTheme,
  palette: {
    mode: 'light',
    ...baselightTheme.palette,
    ...(defaultThemeOption?.palette || {}),
  },
  shape: {
    borderRadius: 12,
  },
  shadows: shadows,
  typography: typography,
  direction: 'ltr',
  ...(defaultThemeOption || {}),
});

// Apply components
omTheme.components = components(omTheme);

export { omTheme };
