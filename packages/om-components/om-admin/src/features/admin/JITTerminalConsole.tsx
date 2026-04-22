// JIT Terminal Console - Admin Interface

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Alert,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tab,
  Tabs
} from '@mui/material';
import {
  Terminal as TerminalIcon,
  Android as AgentIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  Download as DownloadIcon,
  VpnKey as TokenIcon
} from '@mui/icons-material';
import { JITTerminal } from '@/components/terminal/JITTerminal';

interface AgentAccessRequest {
  agentId: string;
  task: string;
  timeoutMinutes?: number;
}

interface JITSession {
  id: string;
  userId: string;
  userName: string;
  startTime: number;
  expiryTime: number;
  isActive: boolean;
  isAgent?: boolean;
  agentId?: string;
  task?: string;
  commandCount: number;
}

const JITTerminalConsole: React.FC = () => {
  const [sessions, setSessions] = useState<JITSession[]>([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isAgentRequestOpen, setIsAgentRequestOpen] = useState(false);
  const [agentRequest, setAgentRequest] = useState<AgentAccessRequest>({
    agentId: '',
    task: '',
    timeoutMinutes: 15
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenSuccess, setTokenSuccess] = useState<string | null>(null);

  // Check user role and permissions
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const profile = await apiClient.get<any>('/auth/profile');
        setUserRole(profile.role);
      } catch (error) {
        console.error('Failed to get user profile:', error);
      }
    };
    
    checkUserRole();
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const data = await apiClient.get<any>('/jit/sessions');
      setSessions(data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const requestAgentAccess = async () => {
    if (!agentRequest.agentId || !agentRequest.task) {
      setError('Agent ID and task are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await apiClient.post<any>('/jit-terminal/agent-access', agentRequest);

      setSelectedSessionId(data.session.id);
      setIsTerminalOpen(true);
      setIsAgentRequestOpen(false);
      fetchSessions();
      
      // Reset form
      setAgentRequest({
        agentId: '',
        task: '',
        timeoutMinutes: 15
      });
    } catch (error) {
      setError('Failed to connect to server');
      console.error('Agent access request failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const terminateSession = async (sessionId: string) => {
    try {
      await apiClient.delete<any>(`/jit/sessions/${sessionId}`);
      fetchSessions();
    } catch (error) {
      console.error('Failed to terminate session:', error);
    }
  };

  const downloadCliToken = async () => {
    setTokenLoading(true);
    setError(null);
    setTokenSuccess(null);

    try {
      const data = await apiClient.post<any>('/jit/token', {
        expiresInHours: 24 // Default 24 hour expiration
      });

      // Create and download the token file
      const blob = new Blob([data.token], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = '.om-jit-token';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setTokenSuccess(`CLI token downloaded successfully! Expires in 24 hours.`);
      
      // Clear success message after 5 seconds
      setTimeout(() => setTokenSuccess(null), 5000);
    } catch (error) {
      setError('Failed to connect to server');
      console.error('CLI token download failed:', error);
    } finally {
      setTokenLoading(false);
    }
  };

  const formatTimeRemaining = (expiryTime: number) => {
    const remaining = expiryTime - Date.now();
    if (remaining <= 0) return 'Expired';
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const isAgentRole = userRole === 'admin' || userRole === 'super_admin';
  const userSessions = sessions.filter(s => !s.isAgent);
  const agentSessions = sessions.filter(s => s.isAgent);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        JIT Terminal Console
      </Typography>

      <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="User Sessions" icon={<TerminalIcon />} />
        <Tab label="Agent Sessions" icon={<AgentIcon />} />
      </Tabs>

      {/* CLI Token Access Section - Super Admin Only */}
      {userRole === 'super_admin' && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TokenIcon />
              CLI Access Token
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Download a secure token for CLI access to JIT Terminal sessions. 
              Store this token as ~/.om-jit-token for use with jitconnect script.
            </Typography>

            {tokenSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {tokenSuccess}
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Button
              variant="contained"
              startIcon={tokenLoading ? undefined : <DownloadIcon />}
              onClick={downloadCliToken}
              disabled={tokenLoading}
              sx={{ mr: 2 }}
            >
              {tokenLoading ? 'Generating Token...' : '🔐 Download CLI Access Token'}
            </Button>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Token expires in 24 hours. All CLI actions are logged and monitored.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Agent Access Request Button */}
      {isAgentRole && currentTab === 1 && (
        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<AgentIcon />}
            onClick={() => setIsAgentRequestOpen(true)}
            sx={{ mr: 2 }}
          >
            Request Terminal Access
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchSessions}
          >
            Refresh Sessions
          </Button>
        </Box>
      )}

      {/* Sessions List */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {currentTab === 0 ? 'Active User Sessions' : 'Active Agent Sessions'}
              </Typography>
              
              <List>
                {(currentTab === 0 ? userSessions : agentSessions).map((session) => (
                  <ListItem key={session.id}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {session.isAgent ? <AgentIcon /> : <TerminalIcon />}
                          <Typography variant="subtitle1">
                            {session.isAgent ? `Agent: ${session.agentId}` : session.userName}
                          </Typography>
                          {session.isAgent && (
                            <Chip 
                              label="AGENT" 
                              color="primary" 
                              size="small" 
                              icon={<SecurityIcon />}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Session ID: {session.id}
                          </Typography>
                          {session.isAgent && (
                            <Typography variant="body2" color="text.secondary">
                              Task: {session.task}
                            </Typography>
                          )}
                          <Typography variant="body2" color="text.secondary">
                            Commands: {session.commandCount} | 
                            Expires: {formatTimeRemaining(session.expiryTime)}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setSelectedSessionId(session.id);
                          setIsTerminalOpen(true);
                        }}
                        sx={{ mr: 1 }}
                      >
                        Connect
                      </Button>
                      <IconButton onClick={() => terminateSession(session.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
                
                {(currentTab === 0 ? userSessions : agentSessions).length === 0 && (
                  <ListItem>
                    <ListItemText 
                      primary={`No active ${currentTab === 0 ? 'user' : 'agent'} sessions`}
                      secondary={currentTab === 1 && isAgentRole ? 
                        "Click 'Request Terminal Access' to start an agent session" : 
                        undefined
                      }
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Agent Access Request Dialog */}
      <Dialog open={isAgentRequestOpen} onClose={() => setIsAgentRequestOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Agent Terminal Access</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <TextField
              label="Agent ID"
              value={agentRequest.agentId}
              onChange={(e) => setAgentRequest(prev => ({ ...prev, agentId: e.target.value }))}
              fullWidth
              margin="normal"
              required
              placeholder="e.g., omai, assistant-v2"
            />
            
            <TextField
              label="Task Description"
              value={agentRequest.task}
              onChange={(e) => setAgentRequest(prev => ({ ...prev, task: e.target.value }))}
              fullWidth
              margin="normal"
              required
              multiline
              rows={3}
              placeholder="Describe what the agent needs to accomplish..."
            />
            
            <TextField
              label="Timeout (minutes)"
              type="number"
              value={agentRequest.timeoutMinutes}
              onChange={(e) => setAgentRequest(prev => ({ ...prev, timeoutMinutes: parseInt(e.target.value) }))}
              fullWidth
              margin="normal"
              inputProps={{ min: 5, max: 60 }}
            />

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Security Notice:</strong> Agent sessions are restricted to whitelisted commands only. 
                All actions are logged and monitored.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button onClick={() => setIsAgentRequestOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={requestAgentAccess}
              disabled={loading || !agentRequest.agentId || !agentRequest.task}
            >
              {loading ? 'Requesting...' : 'Request Access'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Terminal Dialog */}
      {isTerminalOpen && selectedSessionId && (
        <JITTerminal
          isOpen={isTerminalOpen}
          onClose={() => {
            setIsTerminalOpen(false);
            setSelectedSessionId(null);
            fetchSessions();
          }}
          sessionId={selectedSessionId}
          user={{
            id: 'current-user',
            name: 'Current User',
            role: userRole
          }}
        />
      )}
    </Box>
  );
};

export default JITTerminalConsole; 