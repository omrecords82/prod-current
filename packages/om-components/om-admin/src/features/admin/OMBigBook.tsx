import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Tabs,
  Tab,
  Box,
  Chip,
  Paper,
  Stack,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import BigBookConsolePage from './BigBookConsolePage';
import EncryptedStoragePanel from './EncryptedStoragePanel';
import QuestionnairePreview from './QuestionnairePreview';
import OMAIDiscoveryPanel from './OMAIDiscoveryPanel';
import TSXComponentInstallWizard from './TSXComponentInstallWizard';
import MemoryManager from './MemoryManager';
import {
  Upload as UploadIcon,
  PlayArrow as PlayIcon,
  Delete as Trash2Icon,
  Settings as SettingsIcon,
  Save as SaveIcon,
  Refresh as RefreshCwIcon,
  CloudUpload as CloudUploadIcon,
  Memory as MemoryIcon,
  School as LearningIcon,
  Analytics as AnalyticsIcon,
  AutoMode as AIIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';

import type {
  FileUpload,
  ConsoleOutput,
  BigBookSettings,
} from './OMBigBook/types';
import { getFileTypeFromExtension, getFileIcon, getFileTypeChip } from './OMBigBook/fileUtils';
import { processFiles } from './OMBigBook/fileProcessing';
import { useOMAIData } from './OMBigBook/useOMAIData';
import LearningDashboardPanel from './OMBigBook/LearningDashboardPanel';
import TrainingPathwaysPanel from './OMBigBook/TrainingPathwaysPanel';
import KnowledgeAnalyticsPanel from './OMBigBook/KnowledgeAnalyticsPanel';
import EthicsReasoningPanel from './OMBigBook/EthicsReasoningPanel';
import CustomComponentsPanel from './OMBigBook/CustomComponentsPanel';
import RegistryManagementPanel from './OMBigBook/RegistryManagementPanel';
import TrainingDialog from './OMBigBook/TrainingDialog';
import FoundationDetailsDialog from './OMBigBook/FoundationDetailsDialog';
import ImportsScriptsTab from './OMBigBook/ImportsScriptsTab';
import ConsoleOutputTab from './OMBigBook/ConsoleOutputTab';
import { useRegistries } from './OMBigBook/useRegistries';
import { useCustomComponents } from './OMBigBook/useCustomComponents';
import {
  bigBookDialogReducer,
  initialBigBookDialogState,
} from './OMBigBook/dialogs';

const OMBigBook: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  // File / console / execution state
  const [uploadedFiles, setUploadedFiles] = useState<FileUpload[]>([]);
  const [consoleOutput, setConsoleOutput] = useState<ConsoleOutput[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileUpload | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<BigBookSettings>({
    databaseUser: 'root',
    databasePassword: '',
    useSudo: true,
    sudoPassword: '',
    defaultDatabase: 'omai_db',
    scriptTimeout: 30000,
    maxFileSize: 10485760 // 10MB
  });

  // OMAI data hook
  const omai = useOMAIData();

  // Stable logger for hooks below — defined before they consume it.
  const addConsoleMessage = useCallback(
    (type: ConsoleOutput['type'], message: string, _details?: string) => {
      const newMessage: ConsoleOutput = {
        id: Date.now().toString(),
        timestamp: new Date(),
        type,
        content: message,
        source: type === 'command' ? 'User' : 'System',
      };
      setConsoleOutput(prev => [...prev, newMessage]);
    },
    [],
  );

  // Extracted state hooks (drained from this component)
  const registriesHook = useRegistries({ log: addConsoleMessage });
  const customComponentsHook = useCustomComponents({ log: addConsoleMessage });

  // Single dialog state machine for the 4 modal dialogs
  const [dialog, dispatchDialog] = useReducer(bigBookDialogReducer, initialBigBookDialogState);
  const closeDialog = () => dispatchDialog({ type: 'close' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);

  // Auto-scroll console to bottom
  const scrollToBottom = useCallback(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [consoleOutput, scrollToBottom]);

  // Load registries / custom components when their tabs are opened
  useEffect(() => {
    if (activeTab === 5) registriesHook.load();
    if (activeTab === 6) customComponentsHook.load();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // File processing callbacks — bridge old setter API to dialog reducer
  const fileCallbacks = {
    addConsoleMessage,
    setUploadedFiles,
    setTsxFile: (file: File | null) => {
      // Open the TSX wizard with the new file. Same dispatch handles both
      // setTsxFile and setTsxWizardOpen from the previous setter pair.
      dispatchDialog({ type: 'open', dialog: { kind: 'tsxWizard', file } });
    },
    setTsxWizardOpen: (_open: boolean) => {
      // No-op: setTsxFile already opens the dialog. fileProcessing always
      // calls setTsxFile(file) immediately followed by setTsxWizardOpen(true).
    },
  };

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    await processFiles(Array.from(e.dataTransfer.files), fileCallbacks);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await processFiles(Array.from(e.target.files || []), fileCallbacks);
  };

  const executeFile = async (file: FileUpload) => {
    setIsExecuting(true);
    addConsoleMessage('command', `Executing: ${file.name}`);

    try {
      let content = file.content;
      if (file.encryptedPath) {
        try {
          const retrieveResult = await apiClient.get<any>(`/bigbook/storage/file/${file.id}?encryptedPath=${encodeURIComponent(file.encryptedPath)}`);

          if (retrieveResult.success) {
            content = retrieveResult.content;
          } else {
            throw new Error(`Failed to retrieve file from encrypted storage: ${retrieveResult.error}`);
          }
        } catch (retrieveError) {
          addConsoleMessage('error', `Failed to retrieve file from encrypted storage: ${file.name}`, retrieveError instanceof Error ? retrieveError.message : 'Unknown error');
          setIsExecuting(false);
          return;
        }
      }

      const result = await apiClient.post<any>('/bigbook/execute', { fileId: file.id, fileName: file.name, content, type: file.type, settings });

      if (result.success) {
        addConsoleMessage('success', `Execution completed: ${file.name}`, result.output);
      } else {
        addConsoleMessage('error', `Execution failed: ${file.name}`, result.error);
      }
    } catch (error) {
      addConsoleMessage('error', `Execution error: ${file.name}`, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsExecuting(false);
    }
  };

  const removeFile = async (fileId: string) => {
    const file = uploadedFiles.find(f => f.id === fileId);

    if (file?.encryptedPath) {
      try {
        const result = await apiClient.delete<any>(`/bigbook/storage/file/${fileId}?encryptedPath=${encodeURIComponent(file.encryptedPath)}`);

        if (result.success) {
          setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
          addConsoleMessage('success', `File removed from encrypted storage: ${file.name}`);
        } else {
          addConsoleMessage('error', `Failed to remove file from encrypted storage: ${file.name} - ${result.error}`);
        }
      } catch (error) {
        addConsoleMessage('error', `Error removing file from encrypted storage: ${file.name} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
      addConsoleMessage('info', 'File removed from list');
    }
  };

  const clearConsole = () => {
    setConsoleOutput([]);
  };

  const saveSettings = async () => {
    try {
      await apiClient.post<any>('/bigbook/settings', settings);
      addConsoleMessage('success', 'Settings saved successfully');
      setShowSettings(false);
    } catch (error) {
      addConsoleMessage('error', 'Error saving settings');
    }
  };

  const handleQuestionnairePreview = (file: FileUpload) => {
    if (!file.isQuestionnaire) {
      addConsoleMessage('warning', 'File is not a questionnaire');
      return;
    }
    dispatchDialog({ type: 'open', dialog: { kind: 'questionnairePreview', file } });
    addConsoleMessage('info', `Opening questionnaire preview: ${file.questionnaireMetadata?.title || file.name}`);
  };

  const handleQuestionnaireSubmit = async (submission: any) => {
    try {
      addConsoleMessage('info', `Submitting questionnaire responses: ${submission.questionnaireTitle}`);

      const result = await apiClient.post<any>('/bigbook/submit-response', submission);

      if (result.success) {
        addConsoleMessage('success', `Questionnaire submitted successfully (${result.action}): ${submission.questionnaireTitle}`,
          `Response ID: ${result.responseId}\nResponses: ${submission.responses.length} answers`);
      } else {
        addConsoleMessage('error', `Failed to submit questionnaire: ${result.error}`);
      }
    } catch (error) {
      addConsoleMessage('error', `Error submitting questionnaire: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            <AIIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            OMAI Learning Hub
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive OMAI learning, memory management, and progress tracking
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={() => setShowSettings(!showSettings)}
        >
          Settings
        </Button>
      </Stack>

      <Paper sx={{ width: '100%' }}>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Learning Dashboard" icon={<PsychologyIcon />} iconPosition="start" />
          <Tab label="Training Pathways" icon={<LearningIcon />} iconPosition="start" />
          <Tab label="Memory Management" icon={<MemoryIcon />} iconPosition="start" />
          <Tab label="Knowledge Analytics" icon={<AnalyticsIcon />} iconPosition="start" />
          <Tab label="Ethics & Reasoning" icon={<PsychologyIcon />} iconPosition="start" />
          <Tab label="OMAI Discovery" icon={<AIIcon />} iconPosition="start" />
          <Tab label="Imports & Scripts" />
          <Tab label="File Console" />
          <Tab label="Console" />
          <Tab label="Encrypted Storage" />
          <Tab label="Registry Management" />
          <Tab label="Custom Components" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 && (
            <LearningDashboardPanel
              learningProgress={omai.learningProgress}
              activeTrainingSession={omai.activeTrainingSession}
              learningLoading={omai.learningLoading}
              refreshOMAIData={omai.refreshOMAIData}
              setTrainingDialogOpen={(open: boolean) => open && dispatchDialog({ type: 'open', dialog: { kind: 'training' } })}
              stopTrainingSession={omai.stopTrainingSession}
            />
          )}
          {activeTab === 1 && (
            <TrainingPathwaysPanel
              trainingSessions={omai.trainingSessions}
              activeTrainingSession={omai.activeTrainingSession}
              learningLoading={omai.learningLoading}
              setSelectedTrainingPhase={omai.setSelectedTrainingPhase}
              setTrainingDialogOpen={(open: boolean) => open && dispatchDialog({ type: 'open', dialog: { kind: 'training' } })}
            />
          )}
          {activeTab === 2 && <MemoryManager />}
          {activeTab === 3 && (
            <KnowledgeAnalyticsPanel
              knowledgeMetrics={omai.knowledgeMetrics}
              learningProgress={omai.learningProgress}
            />
          )}
          {activeTab === 4 && (
            <EthicsReasoningPanel
              ethicsProgress={omai.ethicsProgress}
              ethicalFoundations={omai.ethicalFoundations}
              omlearnSurveys={omai.omlearnSurveys}
              ethicsLoading={omai.ethicsLoading}
              refreshOMAIData={omai.refreshOMAIData}
              setSelectedFoundation={(foundation: any) => {
                if (foundation) dispatchDialog({ type: 'open', dialog: { kind: 'foundationDetails', foundation } });
              }}
              setFoundationDialogOpen={(open: boolean) => {
                if (!open) closeDialog();
              }}
              importOMLearnResponses={omai.importOMLearnResponses}
            />
          )}
          {activeTab === 5 && <OMAIDiscoveryPanel />}

          {activeTab === 6 && (
            <ImportsScriptsTab
              showSettings={showSettings}
              settings={settings}
              setSettings={setSettings}
              saveSettings={saveSettings}
              uploadedFiles={uploadedFiles}
              isExecuting={isExecuting}
              fileInputRef={fileInputRef}
              onFileDrop={handleFileDrop}
              onDragOver={handleDragOver}
              onFileInputChange={handleFileInputChange}
              onExecuteFile={executeFile}
              onRemoveFile={removeFile}
            />
          )}

          {activeTab === 7 && (
            <BigBookConsolePage
              files={uploadedFiles}
              consoleOutput={consoleOutput}
              isExecuting={isExecuting}
              onFileSelect={setSelectedFile}
              onFileExecute={executeFile}
              onFileDelete={removeFile}
              onQuestionnairePreview={handleQuestionnairePreview}
              onClearConsole={clearConsole}
              selectedFile={selectedFile}
            />
          )}

          {activeTab === 8 && (
            <ConsoleOutputTab
              consoleOutput={consoleOutput}
              consoleRef={consoleRef}
              clearConsole={clearConsole}
            />
          )}

          {activeTab === 9 && <EncryptedStoragePanel />}

          {activeTab === 10 && (
            <RegistryManagementPanel
              registriesLoading={registriesHook.loading}
              registriesError={registriesHook.error}
              registries={registriesHook.registries}
              loadRegistries={registriesHook.load}
              toggleItemStatus={registriesHook.toggleItemStatus}
            />
          )}

          {activeTab === 11 && (
            <CustomComponentsPanel
              customComponentsLoading={customComponentsHook.loading}
              customComponents={customComponentsHook.customComponents}
              selectedCustomComponent={customComponentsHook.selected}
              setSelectedCustomComponent={customComponentsHook.setSelected}
              loadCustomComponents={customComponentsHook.load}
              handleRemoveCustomComponent={customComponentsHook.remove}
              addConsoleMessage={addConsoleMessage}
            />
          )}
        </Box>
      </Paper>

      <QuestionnairePreview
        open={dialog.kind === 'questionnairePreview'}
        onClose={closeDialog}
        file={dialog.kind === 'questionnairePreview' ? dialog.file : null}
        onSubmit={handleQuestionnaireSubmit}
      />

      <TSXComponentInstallWizard
        open={dialog.kind === 'tsxWizard'}
        onClose={closeDialog}
        file={dialog.kind === 'tsxWizard' ? dialog.file : null}
        onInstallComplete={(result) => {
          addConsoleMessage('success', `Component installation completed: ${result.componentName}`);
          if (result.previewUrl) {
            addConsoleMessage('info', `Preview available at: ${result.previewUrl}`);
          }
        }}
        onConsoleMessage={addConsoleMessage}
      />

      <TrainingDialog
        open={dialog.kind === 'training'}
        onClose={closeDialog}
        selectedPhase={omai.selectedTrainingPhase}
        onPhaseSelect={omai.setSelectedTrainingPhase}
        onStart={omai.startTrainingSession}
        loading={omai.learningLoading}
      />

      <FoundationDetailsDialog
        open={dialog.kind === 'foundationDetails'}
        onClose={closeDialog}
        foundation={dialog.kind === 'foundationDetails' ? dialog.foundation : null}
      />
    </Box>
  );

};

export default OMBigBook;
