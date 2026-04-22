/**
 * ClergySelector — Shared autocomplete clergy field for all sacramental forms.
 *
 * Wraps MUI Autocomplete + LookupService.getClergy() in a freeSolo dropdown
 * that matches the Tailwind-based form styling used across the records module.
 *
 * Usage:
 *   <ClergySelector
 *     churchId="46"
 *     recordType="baptism"
 *     value={formData.clergy}
 *     onChange={(v) => setFormData(p => ({ ...p, clergy: v }))}
 *     onBlur={() => markTouched('clergy')}
 *     error={isFieldError('clergy')}
 *   />
 */

import React, { useState, useEffect } from 'react';
import { Autocomplete, TextField, CircularProgress, useTheme } from '@mui/material';
import LookupService, { LookupItem } from '../../../shared/lib/lookupService';

interface ClergySelectorProps {
  churchId: string | number;
  recordType: 'baptism' | 'marriage' | 'funeral';
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: boolean;
  placeholder?: string;
}

export function ClergySelector({
  churchId,
  recordType,
  value,
  onChange,
  onBlur,
  error,
  placeholder = 'e.g. Fr. John Smith',
}: ClergySelectorProps) {
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    if (!churchId) return;
    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      try {
        const res = await LookupService.getClergy({ churchId, recordType });
        if (!cancelled) {
          setOptions(res.items.map((item: LookupItem) => item.label));
        }
      } catch {
        // Silently fail — user can still type freely
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [churchId, recordType]);

  return (
    <Autocomplete
      freeSolo
      options={options}
      loading={loading}
      value={value}
      onInputChange={(_e, v) => onChange(v)}
      onBlur={onBlur}
      noOptionsText="No clergy found for this parish"
      loadingText="Loading clergy..."
      size="small"
      slotProps={{
        paper: {
          sx: {
            border: '1px solid',
            borderColor: isDark ? '#374151' : 'divider',
            backgroundColor: isDark ? '#1f2937' : undefined,
            color: isDark ? '#f3f4f6' : undefined,
            boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.08)',
            borderRadius: '8px',
            mt: 0.5,
            '& .MuiAutocomplete-option': {
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              py: 1,
              px: 1.5,
              color: isDark ? '#e5e7eb' : undefined,
              '&:hover': {
                backgroundColor: isDark ? '#374151' : undefined,
              },
              '&[aria-selected="true"]': {
                backgroundColor: isDark ? '#374151' : undefined,
              },
            },
            '& .MuiAutocomplete-noOptions, & .MuiAutocomplete-loading': {
              color: isDark ? '#9ca3af' : undefined,
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
            },
          },
        },
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          error={error}
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              borderRadius: '8px',
              backgroundColor: isDark ? '#1f2937' : 'white',
              color: isDark ? '#f3f4f6' : undefined,
              '& fieldset': {
                borderColor: error
                  ? (isDark ? '#991b1b' : '#fca5a5')
                  : (isDark ? '#374151' : '#e5e7eb'),
              },
              '&:hover fieldset': {
                borderColor: error
                  ? (isDark ? '#b91c1c' : '#f87171')
                  : (isDark ? '#4b5563' : '#d1d5db'),
              },
              '&.Mui-focused fieldset': {
                borderColor: error
                  ? (isDark ? '#dc2626' : '#ef4444')
                  : (isDark ? '#6b7280' : '#9ca3af'),
                borderWidth: '1px',
              },
            },
            '& .MuiInputBase-input': {
              py: '7.5px',
              color: isDark ? '#f3f4f6' : undefined,
              '&::placeholder': {
                color: isDark ? '#6b7280' : undefined,
                opacity: 1,
              },
            },
            '& .MuiSvgIcon-root': {
              color: isDark ? '#9ca3af' : undefined,
            },
          }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
