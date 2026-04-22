import { Box, Chip } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { AlertCircle, CheckCircle, ChevronRight, XCircle } from '@/ui/icons';
import React from 'react';
import { OmtraceRunResult } from './types.ts';

interface ResultsListProps {
  results: OmtraceRunResult[];
  onOpenDetails: (result: OmtraceRunResult) => void;
}

export const ResultsList: React.FC<ResultsListProps> = ({ results, onOpenDetails }) => {
  const theme = useTheme();
  
  const getStatusIcon = (result: OmtraceRunResult) => {
    if (result.error) return <XCircle className="w-5 h-5 text-red-500" />;
    if (result.direct.length === 0) return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  const getStatusText = (result: OmtraceRunResult) => {
    if (result.error) return 'Error';
    if (result.direct.length === 0) return 'No Dependencies';
    return 'Success';
  };

  const getStatusColor = (result: OmtraceRunResult) => {
    if (result.error) return 'bg-red-100 text-red-800';
    if (result.direct.length === 0) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const formatPath = (path: string) => {
    if (path.startsWith('src/')) {
      return path.substring(4);
    }
    return path;
  };

  return (
    <Box sx={{ '& > *:not(:last-child)': { borderBottom: 1, borderColor: 'divider' } }}>
      {results.map((result, index) => (
        <Box
          key={index}
          sx={{ 
            p: 2, 
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
            transition: 'background-color 0.2s'
          }}
          onClick={() => onOpenDetails(result)}
        >
          <Box sx={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                {getStatusIcon(result)}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 500, color: theme.palette.text.primary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {result.entry}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: theme.palette.mode === 'dark' ? theme.palette.grey[400] : theme.palette.text.secondary, margin: 0 }}>
                    {formatPath(result.resolvedPath)}
                  </p>
                </Box>
                <Chip 
                  label={getStatusText(result)}
                  size="small"
                  color={result.error ? 'error' : result.direct.length === 0 ? 'warning' : 'success'}
                  sx={{ fontSize: '0.75rem' }}
                />
              </Box>

              {/* Dependency Counts */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, fontSize: '0.875rem', color: theme.palette.mode === 'dark' ? theme.palette.grey[300] : theme.palette.text.secondary }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span style={{ fontWeight: 500 }}>Direct:</span>
                  <Chip label={result.direct.length} size="small" color="primary" sx={{ height: 20, fontSize: '0.75rem' }} />
                </Box>
                
                {result.transitive && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <span style={{ fontWeight: 500 }}>Transitive:</span>
                    <Chip label={result.transitive.length} size="small" color="secondary" sx={{ height: 20, fontSize: '0.75rem' }} />
                  </Box>
                )}
                
                {result.reverse && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <span style={{ fontWeight: 500 }}>Reverse:</span>
                    <Chip label={result.reverse.length} size="small" color="warning" sx={{ height: 20, fontSize: '0.75rem' }} />
                  </Box>
                )}
                
                {result.api && result.api.length > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <span style={{ fontWeight: 500 }}>API:</span>
                    <Chip label={result.api.length} size="small" color="success" sx={{ height: 20, fontSize: '0.75rem' }} />
                  </Box>
                )}
                
                {result.routes && result.routes.length > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <span style={{ fontWeight: 500 }}>Routes:</span>
                    <Chip label={result.routes.length} size="small" color="info" sx={{ height: 20, fontSize: '0.75rem' }} />
                  </Box>
                )}
                
                {result.guards && result.guards.length > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <span style={{ fontWeight: 500 }}>Guards:</span>
                    <Chip label={result.guards.length} size="small" sx={{ height: 20, fontSize: '0.75rem', bgcolor: alpha(theme.palette.error.main, 0.1), color: 'error.main' }} />
                  </Box>
                )}
              </Box>

              {/* Error Message */}
              {result.error && (
                <Box sx={{ mt: 1, p: 1.5, bgcolor: alpha(theme.palette.error.main, 0.1), border: 1, borderColor: 'error.main', borderRadius: 1, fontSize: '0.875rem', color: 'error.main' }}>
                  {result.error}
                </Box>
              )}

              {/* Refactor Preview */}
              {result.refactorPlan && (
                <Box sx={{ mt: 1.5, p: 1.5, bgcolor: alpha(theme.palette.info.main, 0.1), border: 1, borderColor: 'info.main', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: theme.palette.info.main }}>Refactor Plan:</span>
                    <Chip 
                      label={`${result.refactorPlan.domain}-${result.refactorPlan.slug}`}
                      size="small"
                      color="info"
                      sx={{ height: 20, fontSize: '0.75rem' }}
                    />
                  </Box>
                  <Box sx={{ fontSize: '0.75rem', color: theme.palette.mode === 'dark' ? theme.palette.info.light : theme.palette.info.dark }}>
                    <div>From: {formatPath(result.refactorPlan.from)}</div>
                    <div>To: {formatPath(result.refactorPlan.to)}</div>
                  </Box>
                </Box>
              )}

              {/* Stats */}
              {result.stats && (
                <Box sx={{ mt: 1, fontSize: '0.75rem', color: theme.palette.mode === 'dark' ? theme.palette.grey[500] : theme.palette.text.secondary }}>
                  Analysis completed in {result.stats.duration}ms
                  {result.stats.cacheHit && ' (cached)'}
                </Box>
              )}
            </Box>

            <ChevronRight style={{ width: 20, height: 20, color: theme.palette.action.disabled, flexShrink: 0, marginLeft: 8 }} />
          </Box>
        </Box>
      ))}
    </Box>
  );
};
