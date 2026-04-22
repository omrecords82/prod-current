/**
 * Orthodox Metrics - Table Control Panel
 * Controls for selecting table elements and styling options
 */

import React from 'react';
import {
  Box,
  Typography,
  ButtonGroup,
  Button,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Paper
} from '@mui/material';
import { 
  TableView, 
  ViewColumn, 
  ViewHeadline, 
  CropDin,
  FormatPaint,
  BorderStyle
} from '@mui/icons-material';
import { TableTheme } from '../store/useTableStyleStore.ts';

interface TableControlPanelProps {
  selectedElement: string;
  onElementSelect: (element: string) => void;
  tableTheme: TableTheme;
  onBorderStyleChange: (color: string, width: number, radius: number) => void;
}

const elementOptions = [
  { value: 'header', label: 'Header', icon: <ViewHeadline /> },
  { value: 'cell', label: 'Cell', icon: <CropDin /> },
  { value: 'row', label: 'Row', icon: <ViewColumn /> }
];

const shadowOptions = [
  'none',
  '0 1px 3px rgba(0,0,0,0.1)',
  '0 2px 4px rgba(0,0,0,0.1)',
  '0 4px 8px rgba(0,0,0,0.15)',
  '0 8px 16px rgba(0,0,0,0.2)'
];

export const TableControlPanel: React.FC<TableControlPanelProps> = ({
  selectedElement,
  onElementSelect,
  tableTheme,
  onBorderStyleChange
}) => {
  const handleBorderWidthChange = (event: Event, newValue: number | number[]) => {
    const width = Array.isArray(newValue) ? newValue[0] : newValue;
    onBorderStyleChange(tableTheme.borderColor, width, tableTheme.borderRadius);
  };

  const handleBorderRadiusChange = (event: Event, newValue: number | number[]) => {
    const radius = Array.isArray(newValue) ? newValue[0] : newValue;
    onBorderStyleChange(tableTheme.borderColor, tableTheme.borderWidth, radius);
  };

  const handleBorderColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const color = event.target.value;
    onBorderStyleChange(color, tableTheme.borderWidth, tableTheme.borderRadius);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <FormatPaint sx={{ mr: 1 }} />
        Element Selection
      </Typography>

      {/* Element Selector */}
      <ButtonGroup orientation="vertical" fullWidth sx={{ mb: 3 }}>
        {elementOptions.map((option) => (
          <Button
            key={option.value}
            variant={selectedElement === option.value ? 'contained' : 'outlined'}
            onClick={() => onElementSelect(option.value)}
            startIcon={option.icon}
            sx={{ justifyContent: 'flex-start' }}
          >
            {option.label}
          </Button>
        ))}
      </ButtonGroup>

      {/* Current Selection Info */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Selected Element
        </Typography>
        <Chip
          label={elementOptions.find(opt => opt.value === selectedElement)?.label}
          color="primary"
          icon={elementOptions.find(opt => opt.value === selectedElement)?.icon}
        />
      </Paper>

      {/* Border Styling */}
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <BorderStyle sx={{ mr: 1 }} />
        Border Styling
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Border Width: {tableTheme.borderWidth}px
        </Typography>
        <Slider
          value={tableTheme.borderWidth}
          onChange={handleBorderWidthChange}
          min={0}
          max={5}
          step={1}
          marks
          valueLabelDisplay="auto"
        />
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Border Radius: {tableTheme.borderRadius}px
        </Typography>
        <Slider
          value={tableTheme.borderRadius}
          onChange={handleBorderRadiusChange}
          min={0}
          max={20}
          step={1}
          marks
          valueLabelDisplay="auto"
        />
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Border Color
        </Typography>
        <TextField
          type="color"
          value={tableTheme.borderColor}
          onChange={handleBorderColorChange}
          fullWidth
          size="small"
          sx={{
            '& input[type="color"]': {
              width: '100%',
              height: 32,
              border: 'none',
              borderRadius: 1
            }
          }}
        />
      </Box>

      {/* Font Styling */}
      <Typography variant="h6" gutterBottom>
        Typography
      </Typography>

      <Box sx={{ mb: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Font Family</InputLabel>
          <Select
            value={tableTheme.fontFamily}
            label="Font Family"
          >
            <MenuItem value="Roboto, Arial, sans-serif">Roboto</MenuItem>
            <MenuItem value="Georgia, serif">Georgia</MenuItem>
            <MenuItem value="Times New Roman, serif">Times New Roman</MenuItem>
            <MenuItem value="Arial, sans-serif">Arial</MenuItem>
            <MenuItem value="Helvetica, sans-serif">Helvetica</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Font Size: {tableTheme.fontSize}px
        </Typography>
        <Slider
          value={tableTheme.fontSize}
          min={10}
          max={20}
          step={1}
          marks
          valueLabelDisplay="auto"
        />
      </Box>

      {/* Shadow Effects */}
      <Typography variant="h6" gutterBottom>
        Shadow Effects
      </Typography>

      <FormControl fullWidth size="small">
        <InputLabel>Shadow Style</InputLabel>
        <Select
          value={tableTheme.shadowStyle}
          label="Shadow Style"
        >
          {shadowOptions.map((shadow) => (
            <MenuItem key={shadow} value={shadow}>
              {shadow === 'none' ? 'No Shadow' : 'Shadow'}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};
export default TableControlPanel;
