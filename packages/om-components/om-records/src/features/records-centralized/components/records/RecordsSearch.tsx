/**
 * Unified Records Search and Filter Component
 * Leverages existing search patterns from the codebase
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  TextField,
  Button,
  Chip,
  Paper,
  Typography,
  IconButton,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Divider,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Types
export interface SearchFilter {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'daterange' | 'multiselect';
  options?: Array<{ value: any; label: string }>;
  placeholder?: string;
  multiple?: boolean;
}

export interface RecordsSearchProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSearch: () => void;
  onClear: () => void;
  filters?: SearchFilter[];
  activeFilters?: Record<string, any>;
  onFilterChange: (key: string, value: any) => void;
  onClearFilters: () => void;
  loading?: boolean;
  resultsCount?: number;
  showFilters?: boolean;
  showResultsCount?: boolean;
  searchPlaceholder?: string;
  className?: string;
  compact?: boolean;
}

export function RecordsSearch({
  searchTerm,
  onSearchChange,
  onSearch,
  onClear,
  filters = [],
  activeFilters = {},
  onFilterChange,
  onClearFilters,
  loading = false,
  resultsCount,
  showFilters = true,
  showResultsCount = true,
  searchPlaceholder = 'Search records...',
  className = '',
  compact = false,
}: RecordsSearchProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Handle search input change
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value);
  }, [onSearchChange]);

  // Handle search submission
  const handleSearch = useCallback(() => {
    onSearch();
  }, [onSearch]);

  // Handle clear search
  const handleClear = useCallback(() => {
    onClear();
  }, [onClear]);

  // Handle filter change
  const handleFilterChange = useCallback((key: string, value: any) => {
    onFilterChange(key, value);
  }, [onFilterChange]);

  // Handle clear all filters
  const handleClearFilters = useCallback(() => {
    onClearFilters();
  }, [onClearFilters]);

  // Toggle advanced filters
  const toggleAdvancedFilters = useCallback(() => {
    setShowAdvancedFilters(prev => !prev);
  }, []);

  // Toggle expansion
  const toggleExpansion = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    return Object.values(activeFilters).filter(value => 
      value !== undefined && value !== null && value !== '' && 
      (!Array.isArray(value) || value.length > 0)
    ).length;
  }, [activeFilters]);

  // Check if there are any active filters
  const hasActiveFilters = activeFilterCount > 0;

  // Render filter field
  const renderFilterField = (filter: SearchFilter) => {
    const value = activeFilters[filter.key];

    switch (filter.type) {
      case 'text':
        return (
          <TextField
            fullWidth
            size="small"
            label={filter.label}
            placeholder={filter.placeholder}
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            variant="outlined"
          />
        );

      case 'select':
        return (
          <FormControl fullWidth size="small">
            <InputLabel>{filter.label}</InputLabel>
            <Select
              value={value || ''}
              onChange={(e) => handleFilterChange(filter.key, e.target.value)}
              label={filter.label}
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              {filter.options?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'multiselect':
        return (
          <FormControl fullWidth size="small">
            <InputLabel>{filter.label}</InputLabel>
            <Select
              multiple
              value={value || []}
              onChange={(e) => handleFilterChange(filter.key, e.target.value)}
              label={filter.label}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as any[]).map((val) => {
                    const option = filter.options?.find(opt => opt.value === val);
                    return (
                      <Chip
                        key={val}
                        label={option?.label || val}
                        size="small"
                      />
                    );
                  })}
                </Box>
              )}
            >
              {filter.options?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'date':
        return (
          <DatePicker
            label={filter.label}
            value={value || null}
            onChange={(newValue) => handleFilterChange(filter.key, newValue)}
            slotProps={{
              textField: {
                size: 'small',
                fullWidth: true,
              },
            }}
          />
        );

      case 'daterange':
        return (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <DatePicker
              label={`${filter.label} From`}
              value={value?.from || null}
              onChange={(newValue) => handleFilterChange(filter.key, {
                ...value,
                from: newValue
              })}
              slotProps={{
                textField: {
                  size: 'small',
                  fullWidth: true,
                },
              }}
            />
            <DatePicker
              label={`${filter.label} To`}
              value={value?.to || null}
              onChange={(newValue) => handleFilterChange(filter.key, {
                ...value,
                to: newValue
              })}
              slotProps={{
                textField: {
                  size: 'small',
                  fullWidth: true,
                },
              }}
            />
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper
        elevation={1}
        sx={{
          p: compact ? 2 : 3,
          borderRadius: 2,
          mb: 2,
        }}
        className={className}
      >
        {/* Search Bar */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: showFilters ? 2 : 0 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
              endAdornment: searchTerm && (
                <IconButton size="small" onClick={handleClear}>
                  <ClearIcon />
                </IconButton>
              ),
            }}
            disabled={loading}
          />
          
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={loading}
            startIcon={loading ? <RefreshIcon className="animate-spin" /> : <SearchIcon />}
            sx={{ minWidth: 100 }}
          >
            {loading ? 'Searching...' : 'Search'}
          </Button>

          {showFilters && filters.length > 0 && (
            <Tooltip title={showAdvancedFilters ? 'Hide Filters' : 'Show Filters'}>
              <IconButton
                onClick={toggleAdvancedFilters}
                color={hasActiveFilters ? 'primary' : 'default'}
              >
                <Badge badgeContent={activeFilterCount} color="primary">
                  <FilterIcon />
                </Badge>
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Results Count */}
        {showResultsCount && resultsCount !== undefined && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {resultsCount} result{resultsCount !== 1 ? 's' : ''} found
            </Typography>
          </Box>
        )}

        {/* Advanced Filters */}
        {showFilters && filters.length > 0 && (
          <Collapse in={showAdvancedFilters}>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Filters
                  </Typography>
                  {hasActiveFilters && (
                    <Button
                      size="small"
                      onClick={handleClearFilters}
                      startIcon={<ClearIcon />}
                    >
                      Clear All
                    </Button>
                  )}
                </Box>

                <Grid container spacing={2}>
                  {filters.map((filter) => (
                    <Grid item xs={12} sm={6} md={4} key={filter.key}>
                      {renderFilterField(filter)}
                    </Grid>
                  ))}
                </Grid>
              </Box>

              {/* Active Filters Display */}
              {hasActiveFilters && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Active Filters:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {Object.entries(activeFilters).map(([key, value]) => {
                      if (value === undefined || value === null || value === '' || 
                          (Array.isArray(value) && value.length === 0)) {
                        return null;
                      }

                      const filter = filters.find(f => f.key === key);
                      const displayValue = Array.isArray(value) 
                        ? value.map(v => filter?.options?.find(opt => opt.value === v)?.label || v).join(', ')
                        : filter?.options?.find(opt => opt.value === value)?.label || value;

                      return (
                        <Chip
                          key={key}
                          label={`${filter?.label || key}: ${displayValue}`}
                          onDelete={() => handleFilterChange(key, filter?.multiple ? [] : '')}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      );
                    })}
                  </Box>
                </Box>
              )}
            </motion.div>
          </Collapse>
        )}
      </Paper>
    </LocalizationProvider>
  );
}

export default RecordsSearch;
