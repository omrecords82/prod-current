import { Classification, FilterState, RefactorScan } from '@/types/refactorConsole';
import { Box, Button, ButtonGroup, Paper, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
    AlertTriangle,
    Calendar,
    CheckCircle,
    Clock,
    GitBranch,
    Shield,
    XCircle
} from '@/ui/icons';
import React from 'react';

interface LegendProps {
  scanData: RefactorScan | null;
  filterState: FilterState;
  onFilterChange: (updates: Partial<FilterState>) => void;
  className?: string;
  whitelistCount?: number;
}

const Legend: React.FC<LegendProps> = ({
  scanData,
  filterState,
  onFilterChange,
  className = '',
  whitelistCount = 0
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  if (!scanData) return null;

  const classificationConfigs = [
    {
      key: 'green' as Classification,
      label: 'Production Ready',
      icon: CheckCircle,
      description: 'Likely in production and actively used',
      color: 'green',
      count: scanData.summary.likelyInProd
    },
    {
      key: 'orange' as Classification,
      label: 'High Risk',
      icon: AlertTriangle,
      description: 'May be used by multiple feature areas',
      color: 'orange',
      count: scanData.summary.highRisk
    },
    {
      key: 'yellow' as Classification,
      label: 'In Development',
      icon: Clock,
      description: 'Development files or low usage, recent edits',
      color: 'yellow',
      count: scanData.summary.inDevelopment
    },
    {
      key: 'red' as Classification,
      label: 'Legacy/Duplicate',
      icon: XCircle,
      description: 'Duplicates, legacy patterns, or old files',
      color: 'red',
      count: scanData.summary.legacyOrDupes
    }
  ];

  const handleClassificationToggle = (classification: Classification) => {
    const newClassifications = filterState.classifications.includes(classification)
      ? filterState.classifications.filter(c => c !== classification)
      : [...filterState.classifications, classification];
    
    onFilterChange({ classifications: newClassifications });
  };

  const handleSelectAllClassifications = () => {
    onFilterChange({ classifications: ['green', 'orange', 'yellow', 'red'] });
  };

  const handleDeselectAllClassifications = () => {
    onFilterChange({ classifications: [] });
  };

  // Get theme-aware styles for each classification
  const getColorStyles = (color: string) => {
    const colorMap: Record<string, { main: string; light: string; dark: string }> = {
      green: { main: theme.palette.success.main, light: theme.palette.success.light, dark: theme.palette.success.dark },
      orange: { main: theme.palette.warning.main, light: theme.palette.warning.light, dark: theme.palette.warning.dark },
      yellow: { main: theme.palette.warning.main, light: theme.palette.warning.light, dark: theme.palette.warning.dark },
      red: { main: theme.palette.error.main, light: theme.palette.error.light, dark: theme.palette.error.dark },
    };
    const colors = colorMap[color] || { main: theme.palette.grey[500], light: theme.palette.grey[100], dark: theme.palette.grey[700] };
    return {
      bgcolor: alpha(colors.main, isDark ? 0.25 : 0.12),
      color: isDark ? '#fff' : colors.dark,
      borderColor: alpha(colors.main, isDark ? 0.6 : 0.4),
      iconColor: isDark ? '#fff' : colors.main,
    };
  };

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
      {/* Header */}
      <Box 
        sx={{ 
          p: 2,
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Classification Legend
          </Typography>
          <ButtonGroup size="small" variant="outlined">
            <Button onClick={handleSelectAllClassifications} color="info" sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
              All
            </Button>
            <Button onClick={handleDeselectAllClassifications} color="inherit" sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
              None
            </Button>
          </ButtonGroup>
        </Box>
      </Box>

      {/* Classification Items */}
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {classificationConfigs.map((config) => {
          const styles = getColorStyles(config.color);
          const Icon = config.icon;
          const isSelected = filterState.classifications.includes(config.key);

          return (
            <Box
              key={config.key}
              onClick={() => handleClassificationToggle(config.key)}
              sx={{
                p: 1.5,
                borderRadius: 1,
                border: 2,
                cursor: 'pointer',
                transition: 'all 0.2s',
                bgcolor: isSelected ? styles.bgcolor : 'action.hover',
                borderColor: isSelected ? styles.borderColor : 'divider',
                '&:hover': {
                  bgcolor: isSelected ? styles.bgcolor : 'action.selected',
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    borderRadius: 0.5,
                    bgcolor: isSelected ? styles.bgcolor : 'action.selected'
                  }}
                >
                  <Icon 
                    className="w-4 h-4" 
                    style={{ color: isSelected ? styles.iconColor : theme.palette.text.disabled }} 
                  />
                </Box>
                
                <Box sx={{ flex: 1 }}>
                  <Typography 
                    variant="body2" 
                    fontWeight={500}
                    sx={{ color: isSelected ? styles.color : 'text.primary' }}
                  >
                    {config.label}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ color: isSelected ? styles.color : (isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary') }}
                  >
                    {config.description}
                  </Typography>
                </Box>
                
                <Typography 
                  variant="body2" 
                  fontWeight={500}
                  color={isSelected ? styles.color : 'text.secondary'}
                >
                  {config.count}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Summary Statistics */}
      <Box 
        sx={{ 
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'action.hover'
        }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, textAlign: 'center' }}>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {scanData.summary.totalFiles}
            </Typography>
            <Typography variant="body2" sx={{ color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary' }}>Total Files</Typography>
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {scanData.summary.totalDirs}
            </Typography>
            <Typography variant="body2" sx={{ color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary' }}>Directories</Typography>
          </Box>
          <Box sx={{ gridColumn: 'span 2', mt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <GitBranch className="w-4 h-4" />
                <Typography variant="body2" sx={{ color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary' }}>
                  {scanData.summary.duplicates} duplicates
                </Typography>
              </Box>
              {whitelistCount > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Shield className="w-4 h-4" style={{ color: theme.palette.info.main }} />
                  <Typography variant="body2" sx={{ color: theme.palette.info.main, fontWeight: 500 }}>
                    {whitelistCount} protected
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Calendar className="w-4 h-4" />
                <Typography variant="body2" sx={{ color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary' }}>
                  Last scan: {new Date(scanData.generatedAt).toLocaleTimeString()}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default Legend;
