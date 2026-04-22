/**
 * Button Showcase - Visual regression testing page for MUI button styling
 * 
 * Purpose: Ensures that theme changes don't silently break button styling site-wide.
 * Location: /devel-tools/button-showcase
 * 
 * This component displays all button variants, colors, and states in both
 * light and dark modes, making it easy to spot regressions after theme edits.
 */

import React from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  ButtonGroup,
  IconButton,
  Stack,
  Divider
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { 
  Save, 
  Edit, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Settings,
  ChevronRight
} from '@/ui/icons';

const ButtonShowcase: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const variants = ['contained', 'outlined', 'text'] as const;
  const colors = ['primary', 'secondary', 'success', 'error', 'warning', 'info', 'inherit'] as const;
  const sizes = ['small', 'medium', 'large'] as const;

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Button Showcase
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Visual regression testing for MUI button styling. Use this page to verify
          that theme changes don't break button appearance across the site.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Current theme mode: <strong>{isDark ? 'Dark' : 'Light'}</strong>
        </Typography>
      </Paper>

      {/* Button Variants x Colors Matrix */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Variants × Colors
        </Typography>
        <Box sx={{ display: 'grid', gap: 3 }}>
          {variants.map((variant) => (
            <Box key={variant}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {variant.toUpperCase()}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {colors.map((color) => (
                  <Button 
                    key={`${variant}-${color}`} 
                    variant={variant} 
                    color={color}
                  >
                    {color}
                  </Button>
                ))}
              </Stack>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Button Sizes */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Sizes
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          {sizes.map((size) => (
            <Button key={size} variant="contained" color="primary" size={size}>
              {size}
            </Button>
          ))}
        </Stack>
      </Paper>

      {/* Button States */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          States
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <Button variant="contained" color="primary">
            Normal
          </Button>
          <Button variant="contained" color="primary" disabled>
            Disabled
          </Button>
          <Button variant="outlined" color="primary">
            Outlined Normal
          </Button>
          <Button variant="outlined" color="primary" disabled>
            Outlined Disabled
          </Button>
          <Button variant="text" color="primary">
            Text Normal
          </Button>
          <Button variant="text" color="primary" disabled>
            Text Disabled
          </Button>
        </Stack>
      </Paper>

      {/* Buttons with Icons */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          With Icons
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <Button variant="contained" startIcon={<Save className="w-4 h-4" />}>
            Save
          </Button>
          <Button variant="outlined" startIcon={<Edit className="w-4 h-4" />}>
            Edit
          </Button>
          <Button variant="contained" color="error" startIcon={<Trash2 className="w-4 h-4" />}>
            Delete
          </Button>
          <Button variant="outlined" endIcon={<ChevronRight className="w-4 h-4" />}>
            Next
          </Button>
          <Button variant="text" startIcon={<RefreshCw className="w-4 h-4" />}>
            Refresh
          </Button>
        </Stack>
      </Paper>

      {/* Icon Buttons */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Icon Buttons
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <IconButton color="primary">
            <Plus className="w-5 h-5" />
          </IconButton>
          <IconButton color="secondary">
            <Edit className="w-5 h-5" />
          </IconButton>
          <IconButton color="error">
            <Trash2 className="w-5 h-5" />
          </IconButton>
          <IconButton color="default">
            <Settings className="w-5 h-5" />
          </IconButton>
          <IconButton disabled>
            <RefreshCw className="w-5 h-5" />
          </IconButton>
        </Stack>
      </Paper>

      {/* Button Groups */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Button Groups
        </Typography>
        <Stack spacing={2}>
          <ButtonGroup variant="contained">
            <Button>One</Button>
            <Button>Two</Button>
            <Button>Three</Button>
          </ButtonGroup>
          <ButtonGroup variant="outlined">
            <Button>One</Button>
            <Button>Two</Button>
            <Button>Three</Button>
          </ButtonGroup>
          <ButtonGroup variant="text">
            <Button>One</Button>
            <Button>Two</Button>
            <Button>Three</Button>
          </ButtonGroup>
        </Stack>
      </Paper>

      {/* Full Width Buttons */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Full Width
        </Typography>
        <Stack spacing={2}>
          <Button variant="contained" fullWidth>
            Full Width Contained
          </Button>
          <Button variant="outlined" fullWidth>
            Full Width Outlined
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default ButtonShowcase;
