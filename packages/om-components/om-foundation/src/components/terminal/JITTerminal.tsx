// JIT Terminal Component
// Web-based terminal with xterm.js for super_admin JIT sessions

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import { 
  Box, 
  Typography, 
  Button, 
  Alert, 
  Chip, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Terminal as TerminalIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import 'xterm/css/xterm.css';

interface JITTerminalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
}

interface JITSession {
  id: string;
  userId: string;
  startTime: number;
  expiryTime: number;
  isActive: boolean;
  commandCount: number;
}

export const JITTerminal: React.FC<JITTerminalProps> = ({
  isOpen,
  onClose,
  sessionId,
  user
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  const [session, setSession] = useState<JITSession | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [commandLog, setCommandLog] = useState<string[]>([]);

  // Initialize terminal
  const initializeTerminal = useCallback(() => {
    if (!terminalRef.current || terminal.current) return;

    console.log('[JIT Terminal] Initializing terminal...');

    terminal.current = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selection: '#3e3e3e',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff'
      },
      cols: 80,
      rows: 24
    });

    // Add addons
    fitAddon.current = new FitAddon();
    terminal.current.loadAddon(fitAddon.current);
    terminal.current.loadAddon(new WebLinksAddon());
    terminal.current.loadAddon(new SearchAddon());

    // Open terminal
    terminal.current.open(terminalRef.current);
    
    // Focus the terminal
    terminal.current.focus();
    
    // Fit terminal to container after a short delay to ensure DOM is ready
    setTimeout(() => {
      if (fitAddon.current && terminal.current) {
        fitAddon.current.fit();
        console.log('[JIT Terminal] Terminal fitted to container');
      }
    }, 100);

    // Handle resize
    const handleResize = () => {
      if (fitAddon.current && terminal.current) {
        fitAddon.current.fit();
      }
    };
    window.addEventListener('resize', handleResize);

    console.log('[JIT Terminal] Terminal initialized successfully');

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Create WebSocket connection
  const connectWebSocket = useCallback(async () => {
    if (!sessionId || wsRef.current) return;

    try {
      setIsConnecting(true);
      setError(null);

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/api/jit/ws?sessionId=${sessionId}`;
      
      console.log('[JIT Terminal] Connecting to WebSocket:', wsUrl);
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        
        if (terminal.current) {
          terminal.current.writeln('\x1b[32m[JIT Terminal] Connected to secure session\x1b[0m');
          terminal.current.writeln('\x1b[33m[WARNING] This is a monitored super_admin JIT session. All actions are logged.\x1b[0m');
          terminal.current.writeln('');
        }
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('[JIT Terminal] Received WebSocket message:', data.type, data);
        
        switch (data.type) {
          case 'welcome':
            if (terminal.current) {
              terminal.current.writeln('\x1b[32m[JIT Terminal] Connected to secure session\x1b[0m');
              terminal.current.writeln('\x1b[33m[WARNING] This is a monitored super_admin JIT session. All actions are logged.\x1b[0m');
              if (data.terminal) {
                terminal.current.writeln(`\x1b[36m[INFO] Shell: ${data.terminal.shell} (PID: ${data.terminal.pid})\x1b[0m`);
              }
              terminal.current.writeln('');
              console.log('[JIT Terminal] Welcome message displayed');
            }
            break;
            
          case 'terminal_data':
            if (terminal.current && data.data) {
              console.log('[JIT Terminal] Writing terminal data:', data.data.length, 'characters');
              terminal.current.write(data.data);
            } else {
              console.warn('[JIT Terminal] Cannot write data - terminal not ready or no data');
            }
            break;
            
          case 'terminal_exit':
            if (terminal.current) {
              terminal.current.writeln(`\x1b[31m[JIT Terminal] Terminal session ended (code: ${data.code})\x1b[0m`);
            }
            setTimeout(() => {
              onClose();
            }, 2000);
            break;
            
          case 'terminal_error':
            if (terminal.current) {
              terminal.current.writeln(`\x1b[31m[ERROR] ${data.message}\x1b[0m`);
            }
            setError(data.message);
            break;
            
          case 'terminal_resized':
            // Terminal resize confirmation - no action needed
            break;
            
          case 'pong':
            // Ping/pong response - keep connection alive
            break;
            
          case 'error':
            setError(data.message);
            if (terminal.current) {
              terminal.current.writeln(`\x1b[31m[ERROR] ${data.message}\x1b[0m`);
            }
            break;
            
          default:
            console.warn('[JIT Terminal] Unknown message type:', data.type);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        
        if (terminal.current) {
          terminal.current.writeln('\x1b[31m[JIT Terminal] Connection closed\x1b[0m');
        }
      };

      wsRef.current.onerror = (error) => {
        setError('WebSocket connection failed');
        setIsConnecting(false);
        console.error('[JIT Terminal] WebSocket error:', error);
      };

      // Handle terminal input
      if (terminal.current) {
        terminal.current.onData((data) => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'terminal_input',
              input: data
            }));
          }
        });
        
        // Handle terminal resize
        terminal.current.onResize((size) => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'terminal_resize',
              cols: size.cols,
              rows: size.rows
            }));
          }
        });
      }

    } catch (err) {
      setError('Failed to establish terminal connection');
      setIsConnecting(false);
      console.error('[JIT Terminal] Connection error:', err);
    }
  }, [sessionId]);

  // Handle session expiry
  const handleSessionExpired = useCallback(() => {
    if (terminal.current) {
      terminal.current.writeln('\x1b[31m[JIT Terminal] Session expired. Disconnecting...\x1b[0m');
    }
    
    setTimeout(() => {
      onClose();
    }, 2000);
  }, [onClose]);

  // Download session transcript
  const downloadTranscript = useCallback(() => {
    if (!session || commandLog.length === 0) return;

    const transcript = [
      `JIT Terminal Session Transcript`,
      `================================`,
      `Session ID: ${session.id}`,
      `User: ${user.name} (${user.id})`,
      `Start Time: ${new Date(session.startTime).toISOString()}`,
      `Commands Executed: ${session.commandCount}`,
      ``,
      `Command Log:`,
      ...commandLog.map((cmd, i) => `${i + 1}. ${cmd}`)
    ].join('\n');

    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jit-session-${session.id}-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [session, commandLog, user]);

  // End session
  const endSession = useCallback(async () => {
    try {
      await apiClient.post<any>('/jit/end-session', { sessionId });
    } catch (error) {
      console.error('[JIT Terminal] Failed to end session:', error);
    }
    
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    onClose();
  }, [sessionId, onClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (terminal.current) {
        terminal.current.dispose();
      }
    };
  }, []);

  // Initialize terminal when dialog opens
  useEffect(() => {
    if (isOpen && !terminal.current) {
      console.log('[JIT Terminal] Dialog opened, initializing terminal...');
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        initializeTerminal();
      }, 50);
    }
  }, [isOpen, initializeTerminal]);

  // Connect WebSocket when session is available
  useEffect(() => {
    if (isOpen && sessionId && terminal.current && !wsRef.current) {
      console.log('[JIT Terminal] Connecting WebSocket for session:', sessionId);
      connectWebSocket();
    }
  }, [isOpen, sessionId, connectWebSocket]);

  // Update time remaining
  useEffect(() => {
    if (!session || !session.isActive) return;

    const interval = setInterval(() => {
      const remaining = session.expiryTime - Date.now();
      setTimeRemaining(Math.max(0, remaining));
      
      if (remaining <= 0) {
        handleSessionExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session, handleSessionExpired]);

  // Format time remaining
  const formatTimeRemaining = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#1e1e1e',
          minHeight: '70vh',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <DialogTitle sx={{ bgcolor: '#2d2d2d', color: 'white', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TerminalIcon />
          <Typography variant="h6" component="div" sx={{ flex: 1 }}>
            JIT Terminal - Super Admin Access
          </Typography>
          
          {session && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {timeRemaining > 0 && (
                <Typography variant="body2" color="warning.main">
                  {Math.floor(timeRemaining / 60000)}m {Math.floor((timeRemaining % 60000) / 1000)}s
                </Typography>
              )}
              <Tooltip title="Download Session Transcript">
                <IconButton 
                  size="small" 
                  onClick={downloadTranscript}
                  disabled={commandLog.length === 0}
                >
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}
          
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ 
        p: 0, 
        bgcolor: '#1e1e1e', 
        position: 'relative',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0 // Important: allows flex child to shrink
      }}>
        {/* Security Warning Banner */}
        <Alert 
          severity="warning" 
          icon={<WarningIcon />}
          sx={{ 
            borderRadius: 0, 
            bgcolor: '#3e2723', 
            color: '#ffb74d',
            '& .MuiAlert-icon': { color: '#ffb74d' }
          }}
        >
          <Typography variant="body2">
            <strong>MONITORED SESSION:</strong> This is a super_admin JIT terminal session. 
            All commands and outputs are logged for security and compliance purposes.
          </Typography>
        </Alert>

        {/* Connection Status */}
        {isConnecting && (
          <Box sx={{ p: 2 }}>
            <LinearProgress />
            <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
              Establishing secure terminal connection...
            </Typography>
          </Box>
        )}

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ borderRadius: 0 }}>
            {error}
          </Alert>
        )}

        {/* Terminal Container */}
        <Box
          ref={terminalRef}
          id="terminal-container"
          sx={{
            flex: 1,
            height: '500px',
            width: '100%',
            backgroundColor: '#000',
            position: 'relative',
            '& .xterm': {
              height: '100% !important',
              width: '100% !important'
            },
            '& .xterm-viewport': {
              overflow: 'hidden'
            },
            '& .xterm-screen': {
              height: '100% !important'
            }
          }}
        />

        {/* Connection Status Overlay */}
        {!isConnected && !isConnecting && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: 'rgba(0,0,0,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 2
            }}
          >
            <Typography variant="h6" color="text.secondary">
              Terminal Disconnected
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<RefreshIcon />}
              onClick={connectWebSocket}
              disabled={isConnecting}
            >
              Reconnect
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ bgcolor: '#2d2d2d', px: 3, py: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Session: {session?.id || 'Not connected'}
          </Typography>
          
          {isConnected && (
            <Chip 
              label="Connected" 
              color="success" 
              size="small" 
            />
          )}
        </Box>
        
        <Button onClick={endSession} variant="contained" color="error">
          End Session
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default JITTerminal; 