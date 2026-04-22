/**
 * AssistantTab — Tab 0 content for GlobalOMAI: page context card,
 * Kanban debug panel, security settings, command input, suggestions,
 * and recent command results.
 * Extracted from GlobalOMAI.tsx.
 */
import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Info as InfoIcon,
  Terminal as TerminalIcon,
  Send as SendIcon,
  Security as SecurityIcon,
  Task as TaskIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import type { OMAICommand, PageContext, OMAISettings } from './types';

interface AssistantTabProps {
  pageContext: PageContext | null;
  settings: OMAISettings;
  setSettings: React.Dispatch<React.SetStateAction<OMAISettings>>;
  setHandsOnMode: (value: boolean) => void;
  command: string;
  setCommand: (value: string) => void;
  isExecuting: boolean;
  suggestions: string[];
  commandHistory: OMAICommand[];
  commandInputRef: React.RefObject<HTMLInputElement>;
  onCommandSubmit: (e: React.FormEvent) => void;
  onSuggestionClick: (suggestion: string) => void;
  // Kanban debug props
  user: any;
  currentBoard: any;
  boards: any[];
  fetchBoards: (() => Promise<void>) | undefined;
  autoSelectBugsBoard: () => Promise<boolean>;
  kanbanContext: any;
}

const AssistantTab: React.FC<AssistantTabProps> = ({
  pageContext,
  settings,
  setSettings,
  setHandsOnMode,
  command,
  setCommand,
  isExecuting,
  suggestions,
  commandHistory,
  commandInputRef,
  onCommandSubmit,
  onSuggestionClick,
  user,
  currentBoard,
  boards,
  fetchBoards,
  autoSelectBugsBoard,
  kanbanContext,
}) => (
  <Box>
    {/* Page Context */}
    {pageContext && (
      <Card sx={{ 
        mb: 2, 
        bgcolor: '#e3f2fd', 
        border: '1px solid #bbdefb',
        color: '#0d47a1'
      }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <InfoIcon fontSize="small" sx={{ color: '#1976d2' }} />
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#0d47a1' }}>
              Current Context
            </Typography>
          </Box>
          <Typography variant="body2" fontWeight="500" sx={{ color: '#1565c0' }}>
            {pageContext.componentName}
          </Typography>
          <Typography variant="caption" display="block" sx={{ color: '#424242' }}>
            {pageContext.pathname}
          </Typography>
          {pageContext.description && (
            <Typography variant="caption" display="block" sx={{ mt: 0.5, color: '#666666' }}>
              {pageContext.description}
            </Typography>
          )}
          <Box display="flex" gap={1} mt={1}>
            <Chip
              label={pageContext.userRole}
              size="small"
              sx={{ 
                bgcolor: '#1976d2', 
                color: 'white',
                fontWeight: 'bold'
              }}
            />
            {pageContext.dbModel && (
              <Chip
                label={`DB: ${pageContext.dbModel}`}
                size="small"
                sx={{ 
                  bgcolor: '#e0e0e0', 
                  color: '#424242',
                  fontWeight: 'bold'
                }}
              />
            )}
          </Box>
        </CardContent>
      </Card>
                 )}

                                {/* Kanban Debug Panel */}
                    {user?.role === 'super_admin' && kanbanContext && (
                      <Card sx={{ 
                        mb: 2, 
                        bgcolor: '#fff3e0', 
                        border: '1px solid #ffb74d',
                        color: '#e65100'
                      }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <TaskIcon fontSize="small" sx={{ color: '#f57c00' }} />
                            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#e65100' }}>
                              Kanban Status
                            </Typography>
                            <Box ml="auto">
                              <Tooltip title="Refresh Kanban Data">
                                <IconButton
                                  size="small"
                                  onClick={fetchBoards}
                                  sx={{ color: '#f57c00' }}
                                >
                                  <RefreshIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                          <Typography variant="body2" sx={{ color: '#f57c00', mb: 1 }}>
                            <strong>Current Board:</strong> {currentBoard ? `${currentBoard.name} (ID: ${currentBoard.id})` : 'None selected'}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#f57c00', mb: 1 }}>
                            <strong>Available Boards:</strong> {boards?.length || 0}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#f57c00', mb: 1 }}>
                            <strong>Available Columns:</strong> {currentBoard?.columns?.length || 0}
                          </Typography>
                          {currentBoard?.columns && Array.isArray(currentBoard.columns) && currentBoard.columns.length > 0 && (
                            <Box>
                              <Typography variant="caption" sx={{ color: '#bf360c', fontWeight: 'bold' }}>
                                Columns: 
                              </Typography>
                              <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
                                {currentBoard.columns.map((col: any) => (
                                  <Chip
                                    key={col.id}
                                    label={`${col.name} (${col.id})`}
                                    size="small"
                                    sx={{ 
                                      bgcolor: col.name.toLowerCase().includes('bug') || 
                                               col.name.toLowerCase().includes('issue') || 
                                               col.name.toLowerCase().includes('error') 
                                        ? '#f44336' : '#ff9800', 
                                      color: 'white',
                                      fontSize: '0.7rem',
                                      height: 18
                                    }}
                                  />
                                ))}
                              </Box>
                            </Box>
                          )}
                          {!currentBoard && (
                            <Alert severity="warning" sx={{ mt: 1, py: 0 }}>
                              <Typography variant="caption">
                                ⚠️ No Kanban board selected. Visit the Kanban page to select a board for task creation.
                              </Typography>
                              <Box display="flex" gap={1} mt={1}>
                                <Button 
                                  size="small" 
                                  onClick={autoSelectBugsBoard}
                                  sx={{ fontSize: '0.7rem' }}
                                >
                                  Auto-Select Board
                                </Button>
                                <Button 
                                  size="small" 
                                  variant="outlined"
                                  onClick={async () => {
                                    console.log('Testing Kanban API directly...');
                                    try {
                                      const { apiClient: axiosApiClient } = await import('@/api/utils/axiosInstance');
                                      const data = await axiosApiClient.get<any>('/kanban/health');
                                      console.log('Health check data:', data);
                                      alert(`✅ Kanban API is working! ${data.message}`);
                                    } catch (error: any) {
                                      console.error('Health check error:', error);
                                      alert(`❌ Health check error: ${error.message}`);
                                    }
                                  }}
                                  sx={{ fontSize: '0.7rem' }}
                                >
                                  Test API
                                </Button>
                              </Box>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    )}

                          {/* Security Settings */}
             <Box mb={2}>
               <FormControlLabel
                 control={
                   <Switch
                     checked={settings.handsOnModeEnabled}
                     onChange={(e) => {
                       const newValue = e.target.checked;
                       setSettings(prev => ({...prev, handsOnModeEnabled: newValue}));
                       setHandsOnMode(newValue);
                     }}
                     color="warning"
                   />
                 }
                 label={
                   <Box display="flex" alignItems="center" gap={1}>
                     <SecurityIcon fontSize="small" sx={{ color: '#f57c00' }} />
                     <Typography variant="body2" sx={{ color: '#424242', fontWeight: 500 }}>
                       Hands-On Mode
                     </Typography>
                   </Box>
                 }
               />
               {settings.handsOnModeEnabled && settings.destructiveCommandsWarning && (
                 <Alert severity="warning" sx={{ mt: 1, py: 0, bgcolor: '#fff3e0', border: '1px solid #ffb74d' }}>
                   <Typography variant="caption" sx={{ color: '#e65100', fontWeight: 500 }}>
                     Destructive commands enabled. Use with caution.
                   </Typography>
                 </Alert>
               )}
             </Box>

            {/* Command Input */}
            <form onSubmit={onCommandSubmit}>
              <TextField
                ref={commandInputRef}
                fullWidth
                size="small"
                placeholder="Enter OMAI command..."
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                disabled={isExecuting}
                InputProps={{
                  startAdornment: <TerminalIcon sx={{ mr: 1, color: '#1976d2' }} />,
                  endAdornment: (
                    <IconButton
                      type="submit"
                      size="small"
                      disabled={!command.trim() || isExecuting}
                      sx={{ color: '#1976d2' }}
                    >
                      {isExecuting ? <CircularProgress size={16} /> : <SendIcon />}
                    </IconButton>
                  )
                }}
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'white',
                    '& fieldset': {
                      borderColor: '#e0e0e0'
                    },
                    '&:hover fieldset': {
                      borderColor: '#1976d2'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#1976d2'
                    }
                  },
                  '& .MuiInputBase-input': {
                    color: '#424242',
                    fontWeight: 500
                  }
                }}
              />
            </form>

            {/* Quick Suggestions */}
            {suggestions.length > 0 && (
              <Box mb={2}>
                <Typography variant="subtitle2" gutterBottom sx={{ color: '#424242', fontWeight: 'bold' }}>
                  Quick Actions
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={0.5}>
                  {suggestions.map((suggestion, index) => (
                    <Chip
                      key={index}
                      label={suggestion}
                      size="small"
                      onClick={() => onSuggestionClick(suggestion)}
                      sx={{ 
                        cursor: 'pointer',
                        bgcolor: '#f5f5f5',
                        color: '#424242',
                        fontWeight: 500,
                        '&:hover': {
                          bgcolor: '#e3f2fd',
                          color: '#1976d2'
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Command Results */}
            {commandHistory.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ color: '#424242', fontWeight: 'bold' }}>
                  Recent Commands
                </Typography>
                <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                  {commandHistory.slice(0, 5).map((cmd, index) => (
                    <ListItem key={cmd.id} sx={{ px: 0, bgcolor: index % 2 === 0 ? '#f9f9f9' : 'transparent', borderRadius: 1 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {cmd.status === 'pending' && <CircularProgress size={16} />}
                        {cmd.status === 'success' && <Chip label="✓" size="small" sx={{ bgcolor: '#4caf50', color: 'white', fontWeight: 'bold' }} />}
                        {cmd.status === 'error' && <Chip label="✗" size="small" sx={{ bgcolor: '#f44336', color: 'white', fontWeight: 'bold' }} />}
                      </ListItemIcon>
                      <ListItemText
                        primary={cmd.command}
                        secondary={cmd.result}
                        primaryTypographyProps={{ 
                          variant: 'body2', 
                          fontFamily: 'monospace',
                          color: '#424242',
                          fontWeight: 500
                        }}
                        secondaryTypographyProps={{ 
                          variant: 'caption',
                          color: '#666666'
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
                      </Box>
                    )}
              </Box>
);

export default AssistantTab;
