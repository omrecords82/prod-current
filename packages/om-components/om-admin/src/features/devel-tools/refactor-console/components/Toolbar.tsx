import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  Filter,
  SortAsc,
  SortDesc,
  ChevronDown,
  Zap,
  FileSearch,
  Calendar,
  AlertCircle,
  Save,
  Settings,
  Archive,
  RotateCcw,
  Shield
} from '@/ui/icons';
import { useTheme, alpha } from '@mui/material/styles';
import { Paper, Box, TextField, Select, MenuItem, FormControl, InputLabel, Chip, Button } from '@mui/material';
import { FilterState, SortOption } from '@/types/refactorConsole';

interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  
  sortOptions: SortOption[];
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  
  filterState: FilterState;
  onFilterChange: (updates: Partial<FilterState>) => void;
  
  isLoading: boolean;
  onRefresh: () => void;
  onAnalyze: () => void;
  
  filteredCount: number;
  totalCount: number;
  
  // Gap Analysis / Recovery Mode
  compareWithBackup?: boolean;
  onToggleRecoveryMode?: () => void;

  // Whitelist
  whitelistCount?: number;
  onClearWhitelist?: () => void;

  className?: string;
}

const Toolbar: React.FC<ToolbarProps> = ({
  searchQuery,
  onSearchChange,
  sortOptions,
  currentSort,
  onSortChange,
  filterState,
  onFilterChange,
  isLoading,
  onRefresh,
  onAnalyze,
  filteredCount,
  totalCount,
  compareWithBackup = false,
  onToggleRecoveryMode,
  whitelistCount = 0,
  onClearWhitelist,
  className = ''
}) => {
  const theme = useTheme();
  const [showFilters, setShowFilters] = useState(false);
  const [showFileTypePicker, setShowFileTypePicker] = useState(false);
  const [showSortPicker, setShowSortPicker] = useState(false);

  const fileTypes = [
    { label: 'All Files', value: '' },
    { label: 'TypeScript', value: '.ts' },
    { label: 'TSX Components', value: '.tsx' },
    { label: 'JavaScript', value: '.js' },
    { label: 'JSX Components', value: '.jsx' },
    { label: 'CSS/SCSS', value: '.css' },
    { label: 'JSON', value: '.json' },
    { label: 'Configuration', value: ['.json', '.yaml', '.yml', '.toml'] },
  ];

  const modifiedTimeOptions = [
    { label: 'All Time', value: 0 },
    { label: 'Last 24 Hours', value: 1 },
    { label: 'Last 7 Days', value: 7 },
    { label: 'Last 30 Days', value: 30 },
    { label: 'Last 90 Days', value: 90 },
  ];

  const handleFileTypeSelect = (value: string | string[]) => {
    onFilterChange({ 
      fileType: Array.isArray(value) ? value[0] : value 
    });
    setShowFileTypePicker(false);
  };

  const handleSortSelect = (sort: SortOption) => {
    onSortChange(sort);
    setShowSortPicker(false);
  };

  const handleModifiedTimeSelect = (days: number) => {
    onFilterChange({ modifiedDays: days });
  };

  const clearFilters = () => {
    onFilterChange({
      classifications: ['green', 'orange', 'yellow', 'red'],
      searchQuery: '',
      fileType: '',
      modifiedDays: 0,
      showDuplicates: false,
      showWhitelistedOnly: false,
      hideWhitelisted: false,
    });
  };

  const hasActiveFilters =
    filterState.searchQuery.trim() !== '' ||
    filterState.fileType !== '' ||
    filterState.modifiedDays > 0 ||
    filterState.showDuplicates ||
    filterState.classifications.length < 4 ||
    filterState.showWhitelistedOnly ||
    filterState.hideWhitelisted;

  return (
    <Paper 
      elevation={0}
      sx={{ 
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1
      }}
      className={className}
    >
      {/* Main Toolbar */}
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Search */}
          <Box sx={{ flex: 1, position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: theme.palette.text.disabled, width: 16, height: 16, zIndex: 1 }} />
            <TextField
              fullWidth
              placeholder="Search files by name or path..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  pl: 5
                }
              }}
            />
          </Box>

          {/* Quick Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Sort Dropdown */}
            <Box sx={{ position: 'relative' }}>
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => setShowSortPicker(!showSortPicker)}
                endIcon={<ChevronDown className="w-4 h-4" />}
                startIcon={
                  currentSort.key === 'score' ? (
                    <Zap className="w-4 h-4" />
                  ) : currentSort.key === 'name' ? (
                    <FileSearch className="w-4 h-4" />
                  ) : currentSort.key === 'mtime' ? (
                    <Calendar className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )
                }
                sx={{ textTransform: 'none' }}
              >
                {currentSort.label}
              </Button>

              {showSortPicker && (
                <Paper
                  elevation={8}
                  sx={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    mt: 0.5,
                    width: 256,
                    bgcolor: 'background.paper',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    zIndex: 1300,
                    p: 1
                  }}
                >
                  {sortOptions.map((option) => (
                    <Button
                      key={`${option.key}-${option.direction}`}
                      onClick={() => handleSortSelect(option)}
                      fullWidth
                      startIcon={
                        option.key === 'score' ? (
                          <Zap className="w-4 h-4" />
                        ) : option.key === 'name' ? (
                          <FileSearch className="w-4 h-4" />
                        ) : option.key === 'mtime' ? (
                          <Calendar className="w-4 h-4" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )
                      }
                      endIcon={option.direction === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                      sx={{
                        textTransform: 'none',
                        justifyContent: 'flex-start',
                        px: 1.5,
                        py: 1,
                        color: currentSort.key === option.key && currentSort.direction === option.direction
                          ? 'primary.main'
                          : 'text.primary',
                        bgcolor: currentSort.key === option.key && currentSort.direction === option.direction
                          ? alpha(theme.palette.primary.main, 0.1)
                          : 'transparent',
                        '&:hover': {
                          bgcolor: 'action.hover'
                        }
                      }}
                    >
                      {option.label}
                    </Button>
                  ))}
                </Paper>
              )}
            </Box>

            {/* File Type Filter */}
            <Box sx={{ position: 'relative' }}>
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => setShowFileTypePicker(!showFileTypePicker)}
                endIcon={<ChevronDown className="w-4 h-4" />}
                startIcon={<FileSearch className="w-4 h-4" />}
                sx={{ textTransform: 'none' }}
              >
                {filterState.fileType || 'All Types'}
              </Button>

              {showFileTypePicker && (
                <Paper
                  elevation={8}
                  sx={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    mt: 0.5,
                    width: 192,
                    bgcolor: 'background.paper',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    zIndex: 1300,
                    p: 1
                  }}
                >
                  {fileTypes.map((type) => (
                    <Button
                      key={type.label}
                      onClick={() => handleFileTypeSelect(type.value)}
                      fullWidth
                      sx={{
                        textTransform: 'none',
                        justifyContent: 'flex-start',
                        px: 1.5,
                        py: 1,
                        color: (Array.isArray(type.value) ? type.value.includes(filterState.fileType) : filterState.fileType === type.value)
                          ? 'primary.main'
                          : 'text.primary',
                        bgcolor: (Array.isArray(type.value) ? type.value.includes(filterState.fileType) : filterState.fileType === type.value)
                          ? alpha(theme.palette.primary.main, 0.1)
                          : 'transparent',
                        '&:hover': {
                          bgcolor: 'action.hover'
                        }
                      }}
                    >
                      {type.label}
                    </Button>
                  ))}
                </Paper>
              )}
            </Box>

            {/* Additional Filters */}
            <Button
              variant={hasActiveFilters ? "contained" : "outlined"}
              color={hasActiveFilters ? "primary" : "inherit"}
              onClick={() => setShowFilters(!showFilters)}
              startIcon={<Filter className="w-4 h-4" />}
              sx={{ textTransform: 'none' }}
            >
              Filters
            </Button>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="text"
                onClick={clearFilters}
                sx={{
                  textTransform: 'none',
                  color: 'text.secondary',
                  '&:hover': {
                    color: 'text.primary'
                  }
                }}
              >
                Clear
              </Button>
            )}

            {/* Refresh */}
            <Button
              variant="outlined"
              color="inherit"
              onClick={onRefresh}
              disabled={isLoading}
              startIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
              sx={{ textTransform: 'none' }}
            >
              Refresh
            </Button>

            {/* Recovery Mode Toggle */}
            {onToggleRecoveryMode && (
              <Button
                variant={compareWithBackup ? "contained" : "outlined"}
                color={compareWithBackup ? "secondary" : "inherit"}
                onClick={onToggleRecoveryMode}
                disabled={isLoading}
                startIcon={<Archive className="w-4 h-4" />}
                sx={{ textTransform: 'none' }}
                title="Compare with September 2025 backup (Gap Analysis)"
              >
                Recovery Mode
              </Button>
            )}

            {/* Analyze Button */}
            <Button
              variant="contained"
              color="primary"
              onClick={onAnalyze}
              disabled={isLoading}
              startIcon={<Zap className="w-4 h-4" />}
              sx={{ textTransform: 'none' }}
            >
              Analyze
            </Button>
          </Box>
        </Box>

        {/* Results Count */}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.875rem', color: 'text.secondary' }}>
          <Box>
            Showing {filteredCount.toLocaleString()} of {totalCount.toLocaleString()} files
            {hasActiveFilters && ' (filtered)'}
          </Box>
          
          {isLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analyzing codebase...</span>
            </Box>
          )}
        </Box>
      </Box>

      {/* Extended Filters Panel */}
      {showFilters && (
        <Box sx={{ borderTop: 1, borderColor: 'divider', p: 2, bgcolor: 'action.hover' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
            {/* Modified Time Filter */}
            <FormControl fullWidth>
              <InputLabel>Modified Within</InputLabel>
              <Select
                value={filterState.modifiedDays}
                onChange={(e) => handleModifiedTimeSelect(Number(e.target.value))}
                label="Modified Within"
              >
                {modifiedTimeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Duplicates Only */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <input
                type="checkbox"
                id="showDuplicates"
                checked={filterState.showDuplicates}
                onChange={(e) => onFilterChange({ showDuplicates: e.target.checked })}
                style={{
                  width: 16,
                  height: 16,
                  accentColor: theme.palette.primary.main,
                  cursor: 'pointer'
                }}
              />
              <label htmlFor="showDuplicates" style={{ fontSize: '0.875rem', fontWeight: 500, color: theme.palette.text.primary, cursor: 'pointer' }}>
                Show duplicates only
              </label>
            </Box>

            {/* Recovery Status Filters (only show if Recovery Mode is enabled) */}
            {compareWithBackup && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <input
                    type="checkbox"
                    id="showMissingOnly"
                    checked={filterState.showMissingOnly || false}
                    onChange={(e) => onFilterChange({ showMissingOnly: e.target.checked })}
                    style={{
                      width: 16,
                      height: 16,
                      accentColor: theme.palette.secondary.main,
                      cursor: 'pointer'
                    }}
                  />
                  <label htmlFor="showMissingOnly" style={{ fontSize: '0.875rem', fontWeight: 500, color: theme.palette.text.primary, cursor: 'pointer' }}>
                    Show missing files only
                  </label>
                </Box>
              </>
            )}

            {/* Whitelist Filters */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Shield className="w-4 h-4" style={{ color: theme.palette.info.main }} />
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: theme.palette.text.primary }}>
                  Whitelist ({whitelistCount} files)
                </label>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label="Show Protected Only"
                  onClick={() => onFilterChange({
                    showWhitelistedOnly: !filterState.showWhitelistedOnly,
                    hideWhitelisted: false
                  })}
                  color={filterState.showWhitelistedOnly ? "info" : "default"}
                  size="small"
                  icon={<Shield className="w-3 h-3" />}
                  sx={{
                    bgcolor: filterState.showWhitelistedOnly
                      ? alpha(theme.palette.info.main, 0.1)
                      : undefined,
                    color: filterState.showWhitelistedOnly
                      ? 'info.main'
                      : undefined
                  }}
                />
                <Chip
                  label="Hide Protected"
                  onClick={() => onFilterChange({
                    hideWhitelisted: !filterState.hideWhitelisted,
                    showWhitelistedOnly: false
                  })}
                  color={filterState.hideWhitelisted ? "warning" : "default"}
                  size="small"
                  sx={{
                    bgcolor: filterState.hideWhitelisted
                      ? alpha(theme.palette.warning.main, 0.1)
                      : undefined,
                    color: filterState.hideWhitelisted
                      ? 'warning.main'
                      : undefined
                  }}
                />
                {whitelistCount > 0 && onClearWhitelist && (
                  <Chip
                    label="Clear All"
                    onClick={onClearWhitelist}
                    color="error"
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>

            {/* Quick Filter Badges */}
            <Box>
              <Box sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.primary', mb: 0.5 }}>Quick Filters</Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  label="Duplicates"
                  onClick={() => filterState.showDuplicates ? null : onFilterChange({ showDuplicates: true })}
                  color={filterState.showDuplicates ? "error" : "default"}
                  size="small"
                  sx={{
                    bgcolor: filterState.showDuplicates 
                      ? alpha(theme.palette.error.main, 0.1)
                      : undefined,
                    color: filterState.showDuplicates 
                      ? 'error.main'
                      : undefined
                  }}
                />
                <Chip
                  label="Recent (7d)"
                  onClick={() => onFilterChange({ modifiedDays: filterState.modifiedDays === 7 ? 0 : 7 })}
                  color={filterState.modifiedDays === 7 ? "primary" : "default"}
                  size="small"
                  sx={{
                    bgcolor: filterState.modifiedDays === 7
                      ? alpha(theme.palette.primary.main, 0.1)
                      : undefined,
                    color: filterState.modifiedDays === 7
                      ? 'primary.main'
                      : undefined
                  }}
                />
                <Chip
                  label="Legacy Only"
                  onClick={() => onFilterChange({ classifications: ['red'] })}
                  color="error"
                  size="small"
                  sx={{
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    color: 'error.main'
                  }}
                />
                {compareWithBackup && (
                  <>
                    <Chip
                      label="Missing"
                      onClick={() => onFilterChange({ recoveryStatus: ['missing_in_prod'], showMissingOnly: true })}
                      color={filterState.showMissingOnly ? "secondary" : "default"}
                      size="small"
                      sx={{
                        bgcolor: filterState.showMissingOnly
                          ? alpha(theme.palette.secondary.main, 0.1)
                          : undefined,
                        color: filterState.showMissingOnly
                          ? 'secondary.main'
                          : undefined
                      }}
                    />
                    <Chip
                      label="Modified"
                      onClick={() => onFilterChange({ recoveryStatus: ['modified_since_backup'] })}
                      color={filterState.recoveryStatus?.includes('modified_since_backup') ? "warning" : "default"}
                      size="small"
                      sx={{
                        bgcolor: filterState.recoveryStatus?.includes('modified_since_backup')
                          ? alpha(theme.palette.warning.main, 0.1)
                          : undefined,
                        color: filterState.recoveryStatus?.includes('modified_since_backup')
                          ? 'warning.main'
                          : undefined
                      }}
                    />
                    <Chip
                      label="New Files"
                      onClick={() => onFilterChange({ recoveryStatus: ['new_file'] })}
                      color={filterState.recoveryStatus?.includes('new_file') ? "success" : "default"}
                      size="small"
                      sx={{
                        bgcolor: filterState.recoveryStatus?.includes('new_file')
                          ? alpha(theme.palette.success.main, 0.1)
                          : undefined,
                        color: filterState.recoveryStatus?.includes('new_file')
                          ? 'success.main'
                          : undefined
                      }}
                    />
                  </>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default Toolbar;
