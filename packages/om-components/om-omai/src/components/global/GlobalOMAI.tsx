import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemText,
  Fab,
  Collapse,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  Switch,
  FormControlLabel,
  Tooltip,
  Card,
  CardContent,
  ListItemIcon,
  Button,
  Tabs,
  Tab,
  Badge,
} from '@mui/material';
import {
  Psychology as AIIcon,
  Close as CloseIcon,
  DragIndicator as DragIcon,
  Send as SendIcon,
  History as HistoryIcon,
  Security as SecurityIcon,
  Info as InfoIcon,
  Terminal as TerminalIcon,
  Settings as SettingsIcon,
  Minimize as MinimizeIcon,
  Maximize as MaximizeIcon,
  OpenInFull as ResizeIcon,
  Error as ErrorIcon,
  Task as TaskIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext.tsx';
import { useLocation } from 'react-router-dom';
import { useGlobalErrorStore, GlobalError } from '../../hooks/useGlobalErrorStore.tsx';
import { KanbanDataContext } from '../../context/kanbancontext';
import type { OMAICommand, PageContext, OMAISettings } from './GlobalOMAI/types';
import { getComponentNameFromPath, getDbModelFromPath, getPageDescription, getSeverityColor, determinePriorityFromSeverity, generateTaskDescription } from './GlobalOMAI/utils';
import ErrorsTab from './GlobalOMAI/ErrorsTab';
import TaskCreationDialog from './GlobalOMAI/TaskCreationDialog';
import AssistantTab from './GlobalOMAI/AssistantTab';

const GlobalOMAI: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { 
    errors, 
    filteredErrors, 
    stats, 
    filter, 
    setFilter,
    addError, 
    resolveError, 
    dismissError, 
    undismissError,
    toggleErrorExpansion,
    deleteError, 
    clearErrors,
    clearDismissedErrors
  } = useGlobalErrorStore();
  const kanbanContext = useContext(KanbanDataContext);
  const { createTask, boards = [], currentBoard, fetchBoard, fetchBoards } = kanbanContext || {};
  
  // Standalone: passed as React.Dispatch to children OR used with updater fns
  const [commandHistory, setCommandHistory] = useState<OMAICommand[]>([]);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent'
  });
  const [settings, setSettings] = useState<OMAISettings>({
    handsOnModeEnabled: false,
    destructiveCommandsWarning: true,
    defaultAIMode: 'assistive',
    defaultLanguage: 'en-US',
    uiTheme: 'orthodox-blue',
    autonomousActions: false,
    errorRecoveryMode: 'report',
    verbosityLevel: 'normal',
    agentPersonality: 'classic',
    databaseContextOverride: 'auto',
    serviceEnvironment: 'prod',
    showMetrics: true,
    exportLogsFormat: 'json',
    trackExecutionTime: true,
    trackQueryCount: true,
    trackSuccessRate: true,
  });

  // Bucketed state: overlay UI (11 fields)
  interface OverlayState {
    isOpen: boolean;
    isMinimized: boolean;
    isDragging: boolean;
    isResizing: boolean;
    position: { x: number; y: number };
    size: { width: number; height: number };
    command: string;
    isExecuting: boolean;
    handsOnMode: boolean;
    historyMenuAnchor: null | HTMLElement;
    showSettings: boolean;
  }
  const [overlayState, setOverlayState] = useState<OverlayState>({
    isOpen: false,
    isMinimized: false,
    isDragging: false,
    isResizing: false,
    position: { x: window.innerWidth - 600, y: window.innerHeight / 2 - 500 },
    size: { width: 600, height: 800 },
    command: '',
    isExecuting: false,
    handsOnMode: false,
    historyMenuAnchor: null,
    showSettings: false,
  });
  const setOverlayField = useCallback(<K extends keyof OverlayState>(key: K, value: OverlayState[K]) => {
    setOverlayState(prev => ({ ...prev, [key]: value }));
  }, []);
  const { isOpen, isMinimized, isDragging, isResizing, position, size, command, isExecuting, handsOnMode, historyMenuAnchor, showSettings } = overlayState;
  const setIsOpen = useCallback((v: boolean) => setOverlayField('isOpen', v), [setOverlayField]);
  const setIsMinimized = useCallback((v: boolean) => setOverlayField('isMinimized', v), [setOverlayField]);
  const setIsDragging = useCallback((v: boolean) => setOverlayField('isDragging', v), [setOverlayField]);
  const setIsResizing = useCallback((v: boolean) => setOverlayField('isResizing', v), [setOverlayField]);
  const setPosition = useCallback((v: { x: number; y: number }) => setOverlayField('position', v), [setOverlayField]);
  const setSize = useCallback((v: { width: number; height: number }) => setOverlayField('size', v), [setOverlayField]);
  const setCommand = useCallback((v: string) => setOverlayField('command', v), [setOverlayField]);
  const setIsExecuting = useCallback((v: boolean) => setOverlayField('isExecuting', v), [setOverlayField]);
  const setHandsOnMode = useCallback((v: boolean) => setOverlayField('handsOnMode', v), [setOverlayField]);
  const setHistoryMenuAnchor = useCallback((v: null | HTMLElement) => setOverlayField('historyMenuAnchor', v), [setOverlayField]);
  const setShowSettings = useCallback((v: boolean) => setOverlayField('showSettings', v), [setOverlayField]);

  // Bucketed state: tabs + data (6 fields)
  interface TabDataState {
    activeTab: number;
    selectedError: GlobalError | null;
    taskCreationDialog: boolean;
    pageContext: PageContext | null;
    availableCommands: string[];
    suggestions: string[];
  }
  const [tabDataState, setTabDataState] = useState<TabDataState>({
    activeTab: 0,
    selectedError: null,
    taskCreationDialog: false,
    pageContext: null,
    availableCommands: [],
    suggestions: [],
  });
  const setTabDataField = useCallback(<K extends keyof TabDataState>(key: K, value: TabDataState[K]) => {
    setTabDataState(prev => ({ ...prev, [key]: value }));
  }, []);
  const { activeTab, selectedError, taskCreationDialog, pageContext, availableCommands, suggestions } = tabDataState;
  const setActiveTab = useCallback((v: number) => setTabDataField('activeTab', v), [setTabDataField]);
  const setSelectedError = useCallback((v: GlobalError | null) => setTabDataField('selectedError', v), [setTabDataField]);
  const setTaskCreationDialog = useCallback((v: boolean) => setTabDataField('taskCreationDialog', v), [setTabDataField]);
  const setPageContext = useCallback((v: PageContext | null) => setTabDataField('pageContext', v), [setTabDataField]);
  const setAvailableCommands = useCallback((v: string[]) => setTabDataField('availableCommands', v), [setTabDataField]);
  const setSuggestions = useCallback((v: string[]) => setTabDataField('suggestions', v), [setTabDataField]);

  // Refs
  const dragRef = useRef<HTMLDivElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);

  // Only show for super_admin users
  if (!user || user.role !== 'super_admin') {
    return null;
  }

  // Listen for global errors and add them to the store
  useEffect(() => {
    const handleGlobalError = (event: CustomEvent) => {
      addError(event.detail);
    };

    window.addEventListener('omai-error', handleGlobalError as EventListener);
    
    return () => {
      window.removeEventListener('omai-error', handleGlobalError as EventListener);
    };
  }, [addError]);

  // Initialize page context when location changes
  useEffect(() => {
    updatePageContext();
  }, [location, user]);

  // Load command history and available commands
  useEffect(() => {
    loadCommandHistory();
    loadAvailableCommands();
    
    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem('omai_settings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
        setHandsOnMode(parsedSettings.handsOnModeEnabled);
      } catch (error) {
        console.error('Failed to load OMAI settings:', error);
      }
    }
  }, []);

  const updatePageContext = () => {
    const context: PageContext = {
      pathname: location.pathname,
      userRole: user?.role || 'unknown',
      churchId: user?.church_id?.toString(),
      componentName: getComponentNameFromPath(location.pathname),
      dbModel: getDbModelFromPath(location.pathname),
      description: getPageDescription(location.pathname)
    };
    setPageContext(context);
    generateContextualSuggestions(context);
  };


  const generateContextualSuggestions = (context: PageContext) => {
    const suggestions: string[] = [];
    
    if (context.pathname.includes('records')) {
      suggestions.push('show record counts', 'export recent records', 'explain this page');
    } else if (context.pathname.includes('build')) {
      suggestions.push('check build status', 'restart build', 'show logs');
    } else if (context.pathname.includes('ai')) {
      suggestions.push('ai status', 'restart ai services', 'show metrics');
    } else if (context.pathname.includes('users')) {
      suggestions.push('show active users', 'list permissions', 'check sessions');
    }
    
    // Add error-related suggestions
    if (stats.unresolved > 0) {
      suggestions.push('omai errors', `show ${stats.unresolved} errors`, 'clear errors');
    }
    
    suggestions.push('help', 'status', 'refresh page');
    setSuggestions(suggestions);
  };

  const loadCommandHistory = async () => {
    try {
      const data = await apiClient.get<any>('/omai/command-history');
      setCommandHistory(data.history || []);
    } catch (error) {
      console.error('Failed to load command history:', error);
    }
  };

  const loadAvailableCommands = async () => {
    try {
      const data = await apiClient.get<any>('/omai/available-commands');
      setAvailableCommands(data.commands || []);
    } catch (error) {
      console.error('Failed to load available commands:', error);
    }
  };

  // Enhanced executeCommand to handle error commands
  const executeCommand = async (commandText: string) => {
    if (!commandText.trim()) return;

    // Handle special error commands
    if (commandText.toLowerCase().startsWith('omai errors')) {
      setActiveTab(1); // Switch to Errors tab
      return;
    }
    
    if (commandText.toLowerCase().includes('clear errors')) {
      clearErrors();
      return;
    }
    
    const errorIdMatch = commandText.match(/omai taskify (.+)/);
    if (errorIdMatch) {
      const errorId = errorIdMatch[1];
      const error = errors.find(e => e.id === errorId);
      if (error) {
        setSelectedError(error);
        setTaskCreationDialog(true);
      }
      return;
    }

    setIsExecuting(true);
    const commandId = `cmd_${Date.now()}`;
    
    const newCommand: OMAICommand = {
      id: commandId,
      command: commandText,
      timestamp: new Date().toISOString(),
      status: 'pending',
      context: pageContext?.pathname
    };

    setCommandHistory(prev => [newCommand, ...prev.slice(0, 9)]);
    setCommand('');

    try {
      const result = await apiClient.post<any>('/omai/execute-command', {
        command: commandText,
        context: pageContext,
        handsOnMode: settings.handsOnModeEnabled,
        settings: settings
      });
      
      const updatedCommand: OMAICommand = {
        ...newCommand,
        status: result.success ? 'success' : 'error',
        result: result.message || result.error
      };

      setCommandHistory(prev => 
        prev.map(cmd => cmd.id === commandId ? updatedCommand : cmd)
      );

      // Handle special commands
      if (result.action) {
        handleSpecialAction(result.action, result.data);
      }

    } catch (error) {
      const errorCommand: OMAICommand = {
        ...newCommand,
        status: 'error',
        result: 'Failed to execute command'
      };

      setCommandHistory(prev => 
        prev.map(cmd => cmd.id === commandId ? errorCommand : cmd)
      );
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSpecialAction = (action: string, data: any) => {
    switch (action) {
      case 'refresh_page':
        window.location.reload();
        break;
      case 'navigate':
        window.location.href = data.url;
        break;
      case 'open_panel':
        // Open specific admin panels
        break;
      case 'show_logs':
        // Display logs in a modal or redirect
        break;
    }
  };

  // Helper function to automatically select a suitable board for bug tracking
  const autoSelectBugsBoard = async () => {
    try {
      if (!fetchBoards || !fetchBoard) {
        console.log('Kanban context functions not available');
        alert('Kanban context not available. Please ensure you are logged in and have access to Kanban boards.');
        return false;
      }

      console.log('Refreshing boards list...');
      console.log('User context:', user);
      console.log('Current location:', location.pathname);
      
      // First, refresh the boards list
      await fetchBoards();
      
      // If we're on the Kanban page, try to get the selected board from the page
      if (location.pathname.includes('/kanban')) {
        console.log('We are on Kanban page, checking for selected board in page state...');
        
        // Try to find the Bugs board by ID from the page's selection
        const urlParams = new URLSearchParams(window.location.search);
        const selectedBoardId = urlParams.get('board');
        
        if (selectedBoardId) {
          console.log('Found board ID in URL:', selectedBoardId);
          if (fetchBoard) {
            try {
              await fetchBoard(parseInt(selectedBoardId));
              console.log('Successfully loaded board from URL parameter');
            } catch (error) {
              console.error('Failed to load board from URL:', error);
            }
          }
        } else {
          console.log('No board ID in URL, trying to detect from page selection...');
          
          // Check if there's a board selection button that's active
          const activeButton = document.querySelector('[data-testid="board-selector"] .active, .MuiButton-contained');
          if (activeButton) {
            console.log('Found active board button:', activeButton.textContent);
          }
        }
      }
      
      // Also try to directly test the API
      try {
        const data = await apiClient.get<any>('/kanban/boards');
        console.log('Direct API response data:', data);
        
        {
          // If we found boards in the direct API call, try to manually load them
          if (data.success && data.boards && data.boards.length > 0) {
            console.log(`Found ${data.boards.length} boards via direct API call:`);
            data.boards.forEach((board: any, index: number) => {
              console.log(`  ${index + 1}. ${board.name} (ID: ${board.id})`);
            });
            
            // Look for a bugs board
            const bugsBoard = data.boards.find((board: any) => 
              board.name.toLowerCase().includes('bug') ||
              board.name.toLowerCase().includes('issue') ||
              board.name.toLowerCase().includes('error')
            );
            
            if (bugsBoard && fetchBoard) {
              console.log('Found bugs board via direct API, attempting to load:', bugsBoard);
              try {
                await fetchBoard(bugsBoard.id);
                alert(`✅ Successfully loaded "${bugsBoard.name}" board via direct API!`);
                return true;
              } catch (fetchError) {
                console.error('Failed to fetch board details:', fetchError);
                alert(`❌ Found "${bugsBoard.name}" but failed to load details: ${fetchError}`);
              }
            } else if (data.boards.length > 0 && fetchBoard) {
              // Use first available board
              const firstBoard = data.boards[0];
              console.log('No bugs board found, using first available:', firstBoard);
              try {
                await fetchBoard(firstBoard.id);
                alert(`✅ Successfully loaded "${firstBoard.name}" board (first available)!`);
                return true;
              } catch (fetchError) {
                console.error('Failed to fetch first board details:', fetchError);
                alert(`❌ Found "${firstBoard.name}" but failed to load details: ${fetchError}`);
              }
            }
          } else {
            console.log('Direct API returned success but no boards found');
            alert('❌ API worked but returned no boards. Check user permissions.');
          }
        }
      } catch (apiError) {
        console.error('Direct API call failed:', apiError);
      }
      
      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Current boards after refresh:', boards);
      
      if (boards && boards.length > 0) {
        // Look for a board named "Bugs" or similar
        const bugsBoard = boards.find(board => 
          board.name.toLowerCase().includes('bug') ||
          board.name.toLowerCase().includes('issue') ||
          board.name.toLowerCase().includes('error')
        );
        
        if (bugsBoard) {
          console.log('Found bugs board:', bugsBoard);
          await fetchBoard(bugsBoard.id);
          alert(`✅ Successfully selected "${bugsBoard.name}" board!`);
          return true;
        } else {
          // Use the first available board
          console.log('No bugs board found, using first available:', boards[0]);
          await fetchBoard(boards[0].id);
          alert(`✅ Selected "${boards[0].name}" board (no bugs-specific board found).`);
          return true;
        }
      } else {
        console.error('No boards available after refresh');
        alert('❌ No Kanban boards found. Please create a board first on the Kanban page.');
        return false;
      }
    } catch (error) {
      console.error('Failed to auto-select bugs board:', error);
      alert(`❌ Failed to select board: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  };

  // Enhanced task creation from error with automatic Bug column detection
  const handleCreateTaskFromError = async (error?: GlobalError) => {
    const targetError = error || selectedError;
    if (!targetError) {
      console.error('No error selected for task creation');
      return;
    }

    try {
      console.log('Creating task from error:', targetError);
      console.log('Current board:', currentBoard);
      console.log('Available boards:', boards);

      // Check if we have a current board, if not try to auto-select one
      if (!currentBoard) {
        console.log('No current board available. Attempting to auto-select...');
        const boardSelected = await autoSelectBugsBoard();
        
        if (!boardSelected || !currentBoard) {
          console.error('No current board available. Available boards:', boards);
          alert(`No Kanban board is currently selected. Available boards: ${boards?.length || 0}. Please visit the Kanban page and select a board first, or create a board named "Bugs" for automatic detection.`);
          return;
        }
        
        console.log('Successfully auto-selected board:', currentBoard);
      }

      // Find "Bugs" column or use the first available column
      let bugsColumnId = null;
      
      if (currentBoard?.columns && Array.isArray(currentBoard.columns) && currentBoard.columns.length > 0) {
        // First, try to find a bugs/issues column
        const bugsColumn = currentBoard.columns.find(col => 
          col.name.toLowerCase().includes('bug') || 
          col.name.toLowerCase().includes('issue') ||
          col.name.toLowerCase().includes('error') ||
          col.name.toLowerCase().includes('backlog') ||
          col.name.toLowerCase().includes('todo')
        );
        
        if (bugsColumn) {
          bugsColumnId = bugsColumn.id;
          console.log('Found bugs column:', bugsColumn);
        } else {
          // Use the first column as fallback
          bugsColumnId = currentBoard.columns[0].id;
          console.log('Using first available column:', currentBoard.columns[0]);
        }
      } else {
        console.error('No columns available in current board');
        alert('No columns available in the current Kanban board. Please create columns first.');
        return;
      }

      // Determine which board to use for the task
      const targetBoardId = currentBoard.id;
      console.log('Target board ID:', targetBoardId);
      console.log('Target column ID:', bugsColumnId);

      const taskTitle = taskForm.title || `🐛 Fix: ${targetError.message.substring(0, 50)}...`;
      const taskDescription = taskForm.description || generateTaskDescription(targetError);

      const taskData = {
        board_id: targetBoardId,
        column_id: bugsColumnId,
        title: taskTitle,
        description: taskDescription,
        priority: determinePriorityFromSeverity(targetError.severity),
        assigned_to: user?.id,
        created_by: user?.id,
        status: 'todo',
        position: 0, // Add to top of column
        labels: []  // Simplified for now to avoid potential issues
      };

      console.log('Task data being sent:', taskData);

      if (createTask) {
        await createTask(taskData);
      } else {
        throw new Error('Kanban task creation is not available. Please ensure the Kanban context is loaded.');
      }
      console.log('Task created successfully!');
      
      // Mark error as resolved with task reference
      resolveError(targetError.id);
      
      setTaskCreationDialog(false);
      setSelectedError(null);
      setTaskForm({ title: '', description: '', priority: 'medium' });
      
      // Show success message
      alert(`✅ Bug task created successfully in "${currentBoard.name}" board!`);
      
    } catch (error) {
      console.error('Failed to create task from error:', error);
      alert(`❌ Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };



  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    setIsDragging(true);
    
    const rect = dragRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - offsetX)),
        y: Math.max(0, Math.min(window.innerHeight - size.height, e.clientY - offsetY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [size]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(400, Math.min(1200, e.clientX - position.x));
      const newHeight = Math.max(500, Math.min(1000, e.clientY - position.y));
      
      setSize({
        width: newWidth,
        height: newHeight
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [position]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeCommand(command);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setCommand(suggestion);
    executeCommand(suggestion);
  };

  const handleHistoryCommand = (historyCommand: OMAICommand) => {
    setCommand(historyCommand.command);
    setHistoryMenuAnchor(null);
  };

  // Enhanced Errors Tab Content with filtering and enhanced features

  return (
    <>
      {/* Floating OMAI Button with Enhanced Error Badge */}
      {!isOpen && (
        <Badge
          badgeContent={stats.unresolved}
          color="error"
          max={99}
          sx={{
            position: 'fixed',
            top: '50%',
            right: 24,
            transform: 'translateY(-50%)',
            zIndex: 9999,
          }}
        >
          <Fab
            color="primary"
            sx={{
              background: stats.criticalCount > 0 
                ? 'linear-gradient(45deg, #d32f2f 30%, #f44336 90%)'
                : 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            '&:hover': {
                background: stats.criticalCount > 0
                  ? 'linear-gradient(45deg, #c62828 30%, #d32f2f 90%)'
                  : 'linear-gradient(45deg, #1976D2 30%, #1BA3D3 90%)',
              },
              animation: stats.criticalCount > 0 ? 'pulse 1.5s infinite' : 'none',
              '@keyframes pulse': {
                '0%': {
                  boxShadow: '0 0 0 0 rgba(211, 47, 47, 0.7)',
                },
                '70%': {
                  boxShadow: '0 0 0 10px rgba(211, 47, 47, 0)',
                },
                '100%': {
                  boxShadow: '0 0 0 0 rgba(211, 47, 47, 0)',
                },
              },
          }}
          onClick={() => setIsOpen(true)}
        >
          <AIIcon />
        </Fab>
        </Badge>
      )}

      {/* Enhanced OMAI Assistant Panel */}
      <Collapse in={isOpen}>
        <Paper
          ref={dragRef}
          elevation={8}
          sx={{
            position: 'fixed',
            top: position.y,
            left: position.x,
            width: size.width,
            height: isMinimized ? 'auto' : size.height,
            maxHeight: isMinimized ? 'auto' : size.height,
            zIndex: 9999,
            cursor: isDragging ? 'grabbing' : 'auto',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            border: '2px solid',
            borderColor: stats.criticalCount > 0 ? '#d32f2f' : 'primary.main',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            resize: isResizing ? 'both' : 'none',
            overflow: 'hidden'
          }}
        >
          {/* Enhanced Header with Error Indicators */}
          <Box
            sx={{
              p: 2,
              background: stats.criticalCount > 0 
                ? 'linear-gradient(45deg, #d32f2f 30%, #f44336 90%)'
                : 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              color: 'white',
              cursor: 'grab',
              '&:active': { cursor: 'grabbing' }
            }}
            onMouseDown={handleDragStart}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={1}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(255,255,255,0.2)' }}>
                  <AIIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    OMAI Assistant
                    {stats.criticalCount > 0 && (
                      <Chip 
                        label="CRITICAL ERRORS" 
                        size="small" 
                        sx={{ 
                          ml: 1, 
                          bgcolor: 'rgba(255,255,255,0.2)', 
                          color: 'white',
                          fontWeight: 'bold',
                          animation: 'blink 1s infinite',
                          '@keyframes blink': {
                            '0%, 50%': { opacity: 1 },
                            '51%, 100%': { opacity: 0.5 },
                          },
                        }}
                      />
                    )}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    Enhanced Error Console & AI Interface
                  </Typography>
                </Box>
              </Box>
                             <Box display="flex" alignItems="center" gap={1}>
                 <Tooltip title="OMAI Settings">
                   <IconButton
                     size="small"
                     sx={{ color: 'white' }}
                     onClick={() => setShowSettings(!showSettings)}
                   >
                     <SettingsIcon />
                   </IconButton>
                 </Tooltip>
                 <Tooltip title="Command History">
                   <IconButton
                     size="small"
                     sx={{ color: 'white' }}
                     onClick={(e) => setHistoryMenuAnchor(e.currentTarget)}
                   >
                     <HistoryIcon />
                   </IconButton>
                 </Tooltip>
                 <Tooltip title={isMinimized ? "Maximize" : "Minimize"}>
                   <IconButton
                     size="small"
                     sx={{ color: 'white' }}
                     onClick={() => setIsMinimized(!isMinimized)}
                   >
                     {isMinimized ? <MaximizeIcon /> : <MinimizeIcon />}
                   </IconButton>
                 </Tooltip>
                 <DragIcon sx={{ opacity: 0.7 }} />
                 <IconButton
                   size="small"
                   sx={{ color: 'white' }}
                   onClick={() => setIsOpen(false)}
                 >
                   <CloseIcon />
                 </IconButton>
               </Box>
            </Box>
          </Box>

          {/* Content with Enhanced Tabs */}
           {!isMinimized && (
           <Box sx={{ 
             height: size.height - 80, 
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Enhanced Tab Navigation */}
              <Tabs 
                value={activeTab} 
                onChange={(e, newValue) => setActiveTab(newValue)}
                sx={{ 
                  borderBottom: 1, 
                  borderColor: 'divider', 
                  flexShrink: 0,
                  bgcolor: '#f8f9fa'
                }}
              >
                <Tab label="Assistant" />
                <Tab 
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Badge 
                        badgeContent={stats.unresolved} 
                        color="error"
                        max={99}
                      >
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <ErrorIcon sx={{ fontSize: 16 }} />
                          Errors
                        </Box>
                      </Badge>
                      {stats.criticalCount > 0 && (
                        <Chip
                          label="CRITICAL"
                          size="small"
                          sx={{
                            bgcolor: '#d32f2f',
                            color: 'white',
                            fontSize: '0.6rem',
                            height: 16,
                            fontWeight: 'bold'
                          }}
                        />
                      )}
                    </Box>
                  } 
                />
              </Tabs>

              {/* Tab Content */}
              <Box sx={{ p: 2, overflow: 'auto', flexGrow: 1 }}>
                {activeTab === 0 && (
                  <AssistantTab
                    pageContext={pageContext}
                    settings={settings}
                    setSettings={setSettings}
                    setHandsOnMode={setHandsOnMode}
                    command={command}
                    setCommand={setCommand}
                    isExecuting={isExecuting}
                    suggestions={suggestions}
                    commandHistory={commandHistory}
                    commandInputRef={commandInputRef}
                    onCommandSubmit={handleCommandSubmit}
                    onSuggestionClick={handleSuggestionClick}
                    user={user}
                    currentBoard={currentBoard}
                    boards={boards || []}
                    fetchBoards={fetchBoards}
                    autoSelectBugsBoard={autoSelectBugsBoard}
                    kanbanContext={kanbanContext}
                  />
                )}

                {activeTab === 1 && (
                  <ErrorsTab handleCreateTaskFromError={handleCreateTaskFromError} />
                )}
              </Box>
             
             {/* Resize Handle */}
             <Box
               sx={{
                 position: 'absolute',
                 bottom: 0,
                 right: 0,
                 width: 20,
                 height: 20,
                 cursor: 'nw-resize',
                 background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                 borderTopLeftRadius: 8,
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 '&:hover': {
                   background: 'linear-gradient(135deg, #1565c0 0%, #2196f3 100%)',
                 }
               }}
               onMouseDown={handleResizeStart}
             >
               <ResizeIcon sx={{ fontSize: 12, color: 'white' }} />
             </Box>
           </Box>
           )}
         </Paper>
      </Collapse>

      {/* History Menu - keeping existing functionality */}
      <Menu
        anchorEl={historyMenuAnchor}
        open={Boolean(historyMenuAnchor)}
        onClose={() => setHistoryMenuAnchor(null)}
      >
        {commandHistory.slice(0, 10).map((cmd) => (
          <MenuItem
            key={cmd.id}
            onClick={() => handleHistoryCommand(cmd)}
            sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
          >
            {cmd.command}
          </MenuItem>
        ))}
        {commandHistory.length === 0 && (
          <MenuItem disabled>No command history</MenuItem>
        )}
      </Menu>

      <TaskCreationDialog
        open={taskCreationDialog}
        onClose={() => setTaskCreationDialog(false)}
        selectedError={selectedError}
        taskForm={taskForm}
        setTaskForm={setTaskForm}
        onCreateTask={() => handleCreateTaskFromError()}
      />
    </>
  );
};

export default GlobalOMAI; 