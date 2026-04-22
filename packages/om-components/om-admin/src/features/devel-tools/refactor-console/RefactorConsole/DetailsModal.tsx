import React from 'react';
import { Box, Button, Paper } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';

interface ModalData {
  type: 'reasons' | 'duplicates' | 'replicates';
  data: any;
}

interface DetailsModalProps {
  showModal: ModalData | null;
  onClose: () => void;
  theme: Theme;
}

const DetailsModal: React.FC<DetailsModalProps> = ({ showModal, onClose, theme }) => {
  if (!showModal || showModal.type === 'requirementPreview') return null;

  const { type, data } = showModal;

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        bgcolor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1300
      }}
    >
      <Paper
        elevation={8}
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 1,
          maxWidth: '42rem',
          width: '100%',
          mx: 2,
          maxHeight: '80vh',
          overflow: 'auto'
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: theme.palette.text.primary }}>
              {type === 'reasons' ? 'Classification Details' : 'Duplicate Analysis'}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: theme.palette.text.secondary,
                cursor: 'pointer',
                fontSize: '1.5rem',
                lineHeight: 1,
                padding: 0,
                width: 24,
                height: 24
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = theme.palette.text.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = theme.palette.text.secondary;
              }}
            >
              &times;
            </button>
          </Box>

          {type === 'reasons' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div>
                <h3 style={{ fontWeight: 500, color: theme.palette.text.primary, marginBottom: '0.5rem' }}>File Information</h3>
                <Box sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : theme.palette.grey[50], p: 1.5, borderRadius: 1 }}>
                  <p style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: theme.palette.text.primary }}>{data.node.relPath}</p>
                  <p style={{ fontSize: '0.875rem', color: theme.palette.text.secondary, marginTop: '0.25rem' }}>
                    Classification: <span style={{ fontWeight: 500 }}>{data.classification}</span>
                  </p>
                </Box>
              </div>

              <div>
                <h3 style={{ fontWeight: 500, color: theme.palette.text.primary, marginBottom: '0.5rem' }}>Usage Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Box sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), p: 1.5, borderRadius: 1 }}>
                    <p style={{ fontSize: '0.875rem', color: theme.palette.info.main }}>Import References</p>
                    <p style={{ fontSize: '1.125rem', fontWeight: 600, color: theme.palette.info.main }}>{data.usage.importRefs}</p>
                  </Box>
                  <Box sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), p: 1.5, borderRadius: 1 }}>
                    <p style={{ fontSize: '0.875rem', color: theme.palette.success.main }}>Server References</p>
                    <p style={{ fontSize: '1.125rem', fontWeight: 600, color: theme.palette.success.main }}>{data.usage.serverRefs}</p>
                  </Box>
                  <Box sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1), p: 1.5, borderRadius: 1 }}>
                    <p style={{ fontSize: '0.875rem', color: theme.palette.secondary.main }}>Route References</p>
                    <p style={{ fontSize: '1.125rem', fontWeight: 600, color: theme.palette.secondary.main }}>{data.usage.routeRefs}</p>
                  </Box>
                  <Box sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), p: 1.5, borderRadius: 1 }}>
                    <p style={{ fontSize: '0.875rem', color: theme.palette.warning.main }}>Usage Score</p>
                    <p style={{ fontSize: '1.125rem', fontWeight: 600, color: theme.palette.warning.main }}>{data.usage.score}</p>
                  </Box>
                </div>
              </div>

              <div>
                <h3 style={{ fontWeight: 500, color: theme.palette.text.primary, marginBottom: '0.5rem' }}>Classification Reasons</h3>
                <ul className="space-y-1">
                  {data.reasons.map((reason: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm" style={{ color: theme.palette.text.primary }}>
                      <span style={{ color: theme.palette.info.main, marginTop: '0.125rem' }}>&bull;</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Box>
          )}

          {type === 'duplicates' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div>
                <h3 style={{ fontWeight: 500, color: theme.palette.text.primary, marginBottom: '0.5rem' }}>Duplicate Analysis</h3>
                <Box sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : theme.palette.grey[50], p: 1.5, borderRadius: 1 }}>
                  <p style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: theme.palette.text.primary }}>{data.node.relPath}</p>
                </Box>
              </div>

              {data.duplicates.length > 0 && (
                <div>
                  <h3 style={{ fontWeight: 500, color: theme.palette.text.primary, marginBottom: '0.5rem' }}>Exact Duplicates</h3>
                  <ul className="space-y-1">
                    {data.duplicates.map((duplicate: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-sm" style={{ color: theme.palette.text.primary }}>
                        <span style={{ color: theme.palette.error.main, marginTop: '0.125rem' }}>&bull;</span>
                        <span className="font-mono">{duplicate}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.nearMatches.length > 0 && (
                <div>
                  <h3 style={{ fontWeight: 500, color: theme.palette.text.primary, marginBottom: '0.5rem' }}>Near Matches</h3>
                  <ul className="space-y-2">
                    {data.nearMatches.map((match: any, index: number) => (
                      <li key={index}>
                        <Box sx={{
                          bgcolor: theme.palette.mode === 'dark' ? theme.palette.warning.dark + '20' : theme.palette.warning.light,
                          p: 1.5,
                          borderRadius: 1,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start'
                        }}>
                          <span className="font-mono text-sm" style={{ color: theme.palette.text.primary }}>{match.target}</span>
                          <Box sx={{
                            fontSize: '0.75rem',
                            bgcolor: theme.palette.mode === 'dark' ? theme.palette.warning.dark + '40' : theme.palette.warning.main,
                            color: theme.palette.mode === 'dark' ? theme.palette.warning.light : theme.palette.warning.contrastText,
                            px: 1,
                            py: 0.5,
                            borderRadius: 0.5
                          }}>
                            {Math.round(match.similarity * 100)}% similar
                          </Box>
                        </Box>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Box>
          )}
        </Box>

        <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{ textTransform: 'none' }}
          >
            Close
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default DetailsModal;
