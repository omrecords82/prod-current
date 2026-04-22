import React, { useState } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import { Dialog, DialogContent, DialogTitle, DialogActions } from '@mui/material';
import { Button, TextField, Typography, Box, Alert, CircularProgress, Chip } from '@mui/material';
import { IconBrandGithub, IconX, IconCheck } from '@tabler/icons-react';

interface LogEntry {
  id: number;
  timestamp: Date;
  level: 'ERROR' | 'CRITICAL' | 'WARN';
  source: string;
  message: string;
  details?: string;
  hash?: string;
  occurrences?: number;
  source_component?: string;
}

interface GitHubIssueModalProps {
  open: boolean;
  onClose: () => void;
  logEntry: LogEntry | null;
}

export const GitHubIssueModal: React.FC<GitHubIssueModalProps> = ({
  open,
  onClose,
  logEntry
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ url: string; number: number } | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');

  const handleCreateIssue = async () => {
    if (!logEntry) return;

    setIsCreating(true);
    setError(null);

    try {
      const payload = {
        error_hash: logEntry.hash || `temp_${Date.now()}`,
        log_message: logEntry.message,
        log_details: logEntry.details || '',
        log_level: logEntry.level,
        source_component: logEntry.source_component || logEntry.source,
        occurrence_count: logEntry.occurrences || 1,
        custom_title: customTitle.trim(),
        custom_description: customDescription.trim()
      };

      const data = await apiClient.post<any>('/errors/report-to-github', payload);

      setSuccess({
        url: data.github_url,
        number: data.issue_number
      });

    } catch (err: any) {
      console.error('GitHub Issue Creation Error:', err);
      setError(err.message || 'Failed to create GitHub issue');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccess(null);
    setCustomTitle('');
    setCustomDescription('');
    onClose();
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'error';
      case 'ERROR': return 'warning';
      case 'WARN': return 'info';
      default: return 'default';
    }
  };

  const generateIssueTitle = () => {
    if (customTitle.trim()) return customTitle;
    if (!logEntry) return '';
    
    const truncatedMessage = logEntry.message.substring(0, 60);
    return `[${logEntry.level}] ${truncatedMessage}${logEntry.message.length > 60 ? '...' : ''}`;
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#1e293b',
          color: 'white',
          border: '1px solid #475569'
        }
      }}
    >
      <DialogTitle sx={{ 
        backgroundColor: '#0f172a', 
        borderBottom: '1px solid #475569',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        color: 'white', 
        fontSize: '1.25rem', 
        fontWeight: 'bold'
      }}>
        <IconBrandGithub size={24} color="#f59e0b" />
        Create GitHub Issue
      </DialogTitle>

      <DialogContent sx={{ padding: 3 }}>
        {logEntry && (
          <Box>
            {/* Log Entry Summary */}
            <Box sx={{ marginBottom: 3, padding: 2, backgroundColor: '#374151', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 2 }}>
                <Chip 
                  label={logEntry.level}
                  color={getLogLevelColor(logEntry.level) as any}
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                />
                <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                  {logEntry.source_component || logEntry.source} • {logEntry.occurrences || 1} occurrence(s)
                </Typography>
              </Box>
              
              <Typography variant="h6" sx={{ color: 'white', marginBottom: 1 }}>
                {logEntry.message}
              </Typography>
              
              {logEntry.details && (
                <Typography variant="body2" sx={{ color: '#d1d5db', fontFamily: 'monospace' }}>
                  {logEntry.details}
                </Typography>
              )}
            </Box>

            {/* Custom Title */}
            <TextField
              fullWidth
              label="Issue Title (Optional)"
              placeholder={generateIssueTitle()}
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              sx={{ 
                marginBottom: 2,
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: '#6b7280' },
                  '&:hover fieldset': { borderColor: '#9ca3af' },
                  '&.Mui-focused fieldset': { borderColor: '#3b82f6' }
                },
                '& .MuiInputLabel-root': { color: '#9ca3af' }
              }}
            />

            {/* Custom Description */}
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Additional Description (Optional)"
              placeholder="Add any additional context or steps to reproduce..."
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              sx={{ 
                marginBottom: 2,
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: '#6b7280' },
                  '&:hover fieldset': { borderColor: '#9ca3af' },
                  '&.Mui-focused fieldset': { borderColor: '#3b82f6' }
                },
                '& .MuiInputLabel-root': { color: '#9ca3af' }
              }}
            />

            {/* Preview */}
            <Box sx={{ marginBottom: 2, padding: 2, backgroundColor: '#111827', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ color: '#f59e0b', marginBottom: 1 }}>
                Preview Issue:
              </Typography>
              <Typography variant="body2" sx={{ color: '#e5e7eb', fontWeight: 'bold' }}>
                {generateIssueTitle()}
              </Typography>
            </Box>

            {/* Error Message */}
            {error && (
              <Alert severity="error" sx={{ marginBottom: 2, backgroundColor: '#7f1d1d', color: 'white' }}>
                {error}
              </Alert>
            )}

            {/* Success Message */}
            {success && (
              <Alert 
                severity="success" 
                sx={{ marginBottom: 2, backgroundColor: '#14532d', color: 'white' }}
                action={
                  <Button
                    size="small"
                    href={success.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ color: 'white' }}
                  >
                    View Issue #{success.number}
                  </Button>
                }
              >
                GitHub issue created successfully!
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ 
        padding: 3, 
        backgroundColor: '#0f172a', 
        borderTop: '1px solid #475569',
        gap: 2
      }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          startIcon={<IconX size={16} />}
          sx={{ 
            color: 'white', 
            borderColor: '#6b7280',
            '&:hover': { borderColor: '#9ca3af', backgroundColor: '#374151' }
          }}
        >
          Cancel
        </Button>
        
        {!success && (
          <Button
            onClick={handleCreateIssue}
            disabled={isCreating || !logEntry}
            variant="contained"
            startIcon={isCreating ? <CircularProgress size={16} /> : <IconBrandGithub size={16} />}
            sx={{ 
              backgroundColor: '#f59e0b',
              color: 'black',
              fontWeight: 'bold',
              '&:hover': { backgroundColor: '#d97706' },
              '&:disabled': { backgroundColor: '#6b7280', color: '#9ca3af' }
            }}
          >
            {isCreating ? 'Creating...' : 'Create GitHub Issue'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};