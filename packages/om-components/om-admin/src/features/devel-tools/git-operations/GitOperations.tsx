import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import { IconGitBranch, IconRefresh, IconCheck, IconX, IconAlertCircle } from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';

interface GitStatusResponse {
  success: boolean;
  output?: string;
  stderr?: string | null;
  error?: string;
  message?: string;
}

interface BranchResult {
  name: string;
  status: 'created' | 'exists' | 'error';
  message?: string;
}

interface CreateBranchesResponse {
  ok: boolean;
  baseBranch: string;
  baseSha: string;
  results: BranchResult[];
  error?: string;
  message?: string;
}

const GitOperations: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [creatingBranches, setCreatingBranches] = useState(false);
  const [gitStatus, setGitStatus] = useState<string | null>(null);
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  const [isClean, setIsClean] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [branchResults, setBranchResults] = useState<CreateBranchesResponse | null>(null);

  // Fetch git status on mount
  useEffect(() => {
    fetchGitStatus();
  }, []);

  const fetchGitStatus = async () => {
    setLoading(true);
    setError(null);
    setUnauthorized(false);

    try {
      const data: GitStatusResponse = await apiClient.get<any>('/ops/git/status');

      if (data.success && data.output) {
        setGitStatus(data.output);
        
        // Parse branch from output (format: ## branch-name...)
        const branchMatch = data.output.match(/^##\s+([^\s.]+)/m);
        if (branchMatch) {
          setCurrentBranch(branchMatch[1]);
        }

        // Check if clean (no modified/untracked files)
        // Clean output only has branch info line, no file changes
        const lines = data.output.split('\n').filter(line => line.trim());
        const hasChanges = lines.some(line => line.match(/^[ MADRCU?!]/));
        setIsClean(!hasChanges);
      } else {
        setError(data.error || 'Failed to fetch git status');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch git status');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultBranches = async () => {
    setCreatingBranches(true);
    setError(null);
    setBranchResults(null);

    try {
      const data: CreateBranchesResponse = await apiClient.post<any>('/ops/git/branches/create-default');
      setBranchResults(data);
    } catch (err: any) {
      setError(err.message || 'Failed to create branches');
    } finally {
      setCreatingBranches(false);
    }
  };

  if (unauthorized) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" icon={<IconAlertCircle />}>
          Not authorized. Admin or super_admin access required.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={4}>
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <IconGitBranch size={32} />
          <Typography variant="h4">Git Operations</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Safe, allowlisted git operations for repository management
        </Typography>
      </Box>

      {/* Git Status Section */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" mb={2}>
            <Typography variant="h6">Git Status</Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<IconRefresh />}
              onClick={fetchGitStatus}
              disabled={loading}
            >
              Refresh
            </Button>
          </Stack>

          {loading && (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {gitStatus && !loading && (
            <>
              {currentBranch && (
                <Box mb={2}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Current Branch
                  </Typography>
                  <Chip
                    label={currentBranch}
                    icon={<IconGitBranch size={16} />}
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              )}

              {isClean !== null && (
                <Box mb={2}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Repository Status
                  </Typography>
                  <Chip
                    label={isClean ? 'Clean' : 'Dirty'}
                    icon={isClean ? <IconCheck size={16} /> : <IconX size={16} />}
                    color={isClean ? 'success' : 'warning'}
                    variant="outlined"
                  />
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Raw Output
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  bgcolor: 'background.default',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: '400px',
                  overflow: 'auto',
                }}
              >
                {gitStatus}
              </Paper>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Default Branches Section */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Create Default Branches
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Creates the following branches from the current HEAD:
            <ul>
              <li><code>fix/build-events-users-softdelete</code></li>
              <li><code>chore/gallery-dir-bootstrap</code></li>
            </ul>
            This operation is idempotent - existing branches will not be recreated.
          </Typography>

          <Button
            variant="contained"
            startIcon={<IconGitBranch />}
            onClick={createDefaultBranches}
            disabled={creatingBranches || unauthorized}
            sx={{ mb: 2 }}
          >
            {creatingBranches ? 'Creating...' : 'Create Default Branches'}
          </Button>

          {creatingBranches && (
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <CircularProgress size={20} />
              <Typography variant="body2">Creating branches...</Typography>
            </Box>
          )}

          {branchResults && (
            <Box mt={2}>
              <Alert severity={branchResults.ok ? 'success' : 'error'} sx={{ mb: 2 }}>
                {branchResults.ok
                  ? `Branches processed. Base branch: ${branchResults.baseBranch} (${branchResults.baseSha.substring(0, 7)})`
                  : branchResults.error || 'Failed to create branches'}
              </Alert>

              <Typography variant="subtitle2" gutterBottom>
                Results:
              </Typography>
              <Stack spacing={1}>
                {branchResults.results.map((result, index) => (
                  <Box key={index}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', minWidth: '300px' }}>
                        {result.name}
                      </Typography>
                      <Chip
                        label={result.status}
                        color={
                          result.status === 'created'
                            ? 'success'
                            : result.status === 'exists'
                            ? 'info'
                            : 'error'
                        }
                        size="small"
                        icon={
                          result.status === 'created' ? (
                            <IconCheck size={14} />
                          ) : result.status === 'exists' ? (
                            <IconCheck size={14} />
                          ) : (
                            <IconX size={14} />
                          )
                        }
                      />
                      {result.message && (
                        <Typography variant="caption" color="text.secondary">
                          {result.message}
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default GitOperations;
