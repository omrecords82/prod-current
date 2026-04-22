/**
 * Orthodox Metrics - Field Renderer Component
 * Dynamic form field rendering based on RecordField type with color customization
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  FormControl,
  FormLabel,
  FormHelperText,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  IconButton,
  Tooltip,
  Chip,
  InputAdornment,
} from '@mui/material';
import {
  Palette as PaletteIcon,
  CalendarToday as CalendarIcon,
  Email as EmailIcon,
  Smartphone as PhoneIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import { RecordField, FieldType } from '../../types/church-records-advanced.types.ts';
import ColorPickerPopover from '../ColorPickerPopover';

interface FieldRendererProps {
  field: RecordField;
  value: any;
  color?: string;
  error?: string;
  readonly?: boolean;
  onValueChange: (value: any) => void;
  onColorChange: (color: string) => void;
}

/**
 * Field Renderer Component
 */
const FieldRenderer: React.FC<FieldRendererProps> = ({
  field,
  value,
  color,
  error,
  readonly = false,
  onValueChange,
  onColorChange,
}) => {
  const [colorPickerAnchor, setColorPickerAnchor] = useState<HTMLElement | null>(null);

  // Handle color picker toggle
  const handleColorPickerToggle = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (readonly) return;
    setColorPickerAnchor(colorPickerAnchor ? null : event.currentTarget);
  }, [colorPickerAnchor, readonly]);

  // Handle color selection
  const handleColorSelect = useCallback((selectedColor: string) => {
    onColorChange(selectedColor);
    setColorPickerAnchor(null);
  }, [onColorChange]);

  // Render field icon based on type
  const renderFieldIcon = () => {
    switch (field.type) {
      case 'date':
        return <CalendarIcon />;
      case 'email':
        return <EmailIcon />;
      case 'phone':
        return <PhoneIcon />;
      default:
        return null;
    }
  };

  // Render color indicator and picker button
  const renderColorControls = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* Color indicator */}
      {color && (
        <Box
          sx={{
            width: 16,
            height: 16,
            backgroundColor: color,
            borderRadius: '50%',
            border: '1px solid #ccc',
          }}
        />
      )}
      
      {/* Color picker button */}
      <Tooltip title={readonly ? 'View field color' : 'Change field color'}>
        <IconButton
          size="small"
          onClick={handleColorPickerToggle}
          disabled={readonly}
          sx={{ opacity: readonly ? 0.5 : 1 }}
        >
          <PaletteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );

  // Render the appropriate input component based on field type
  const renderInput = () => {
    const commonProps = {
      fullWidth: true,
      error: !!error,
      disabled: readonly,
      helperText: error || field.placeholder,
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'number':
        return (
          <TextField
            {...commonProps}
            type={field.type === 'number' ? 'number' : 'text'}
            value={value || ''}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={field.placeholder}
            InputProps={{
              startAdornment: renderFieldIcon() ? (
                <InputAdornment position="start">
                  {renderFieldIcon()}
                </InputAdornment>
              ) : undefined,
            }}
          />
        );

      case 'textarea':
        return (
          <TextField
            {...commonProps}
            multiline
            rows={3}
            value={value || ''}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={field.placeholder}
          />
        );

      case 'date':
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              value={value ? new Date(value) : null}
              onChange={(date) => onValueChange(date)}
              disabled={readonly}
              slotProps={{
                textField: {
                  ...commonProps,
                  InputProps: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarIcon />
                      </InputAdornment>
                    ),
                  },
                },
              }}
            />
          </LocalizationProvider>
        );

      case 'select':
        return (
          <FormControl fullWidth error={!!error} disabled={readonly}>
            <Select
              value={value || ''}
              onChange={(e) => onValueChange(e.target.value)}
              displayEmpty
            >
              <MenuItem value="">
                <em>{field.placeholder || 'Select an option'}</em>
              </MenuItem>
              {field.options?.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {(error || field.placeholder) && (
              <FormHelperText>{error || field.placeholder}</FormHelperText>
            )}
          </FormControl>
        );

      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Checkbox
                checked={!!value}
                onChange={(e) => onValueChange(e.target.checked)}
                disabled={readonly}
              />
            }
            label={field.placeholder || 'Check if applicable'}
          />
        );

      default:
        return (
          <TextField
            {...commonProps}
            value={value || ''}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Field Label and Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <FormLabel
          component="legend"
          sx={{ 
            fontWeight: 600,
            color: color ? color : 'text.primary',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          {field.label}
          {field.required && (
            <Chip 
              label="Required" 
              size="small" 
              color="error" 
              variant="outlined"
              sx={{ fontSize: '0.75rem', height: '20px' }}
            />
          )}
        </FormLabel>
        
        {renderColorControls()}
      </Box>

      {/* Field Input */}
      <Box
        sx={{
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: color ? `${color}40` : undefined,
            },
            '&:hover fieldset': {
              borderColor: color ? `${color}80` : undefined,
            },
            '&.Mui-focused fieldset': {
              borderColor: color || undefined,
            },
          },
          '& .MuiFormLabel-root.Mui-focused': {
            color: color || undefined,
          },
        }}
      >
        {renderInput()}
      </Box>

      {/* Field metadata */}
      {field.validation && (
        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {field.validation.min !== undefined && (
            <Chip 
              label={`Min: ${field.validation.min}`} 
              size="small" 
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: '18px' }}
            />
          )}
          {field.validation.max !== undefined && (
            <Chip 
              label={`Max: ${field.validation.max}`} 
              size="small" 
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: '18px' }}
            />
          )}
          {field.validation.pattern && (
            <Chip 
              label="Pattern validation" 
              size="small" 
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: '18px' }}
            />
          )}
        </Box>
      )}

      {/* Color Picker Popover */}
      <ColorPickerPopover
        open={!!colorPickerAnchor}
        anchorEl={colorPickerAnchor}
        currentColor={color}
        onColorSelect={handleColorSelect}
        onClose={() => setColorPickerAnchor(null)}
      />
    </Box>
  );
};

export default FieldRenderer;
