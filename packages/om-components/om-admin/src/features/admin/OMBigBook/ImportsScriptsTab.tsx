/**
 * ImportsScriptsTab — Tab 6 content for OMBigBook: settings panel,
 * file upload area, and uploaded files list.
 * Extracted from OMBigBook.tsx.
 */
import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Save as SaveIcon,
  PlayArrow as PlayIcon,
  Delete as Trash2Icon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import type { FileUpload, BigBookSettings } from './types';
import { getFileIcon, getFileTypeChip } from './fileUtils';

interface ImportsScriptsTabProps {
  showSettings: boolean;
  settings: BigBookSettings;
  setSettings: React.Dispatch<React.SetStateAction<BigBookSettings>>;
  saveSettings: () => void;
  uploadedFiles: FileUpload[];
  isExecuting: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExecuteFile: (file: FileUpload) => void;
  onRemoveFile: (fileId: string) => void;
}

const ImportsScriptsTab: React.FC<ImportsScriptsTabProps> = ({
  showSettings,
  settings,
  setSettings,
  saveSettings,
  uploadedFiles,
  isExecuting,
  fileInputRef,
  onFileDrop,
  onDragOver,
  onFileInputChange,
  onExecuteFile,
  onRemoveFile,
}) => (
  <Stack spacing={3}>
    {/* Settings Panel */}
    {showSettings && (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon />
            Big Book Settings
          </Typography>
                                   <Stack spacing={3}>
                       <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                         <TextField
                           sx={{ flex: 1, minWidth: 250 }}
                           label="Database User"
                           value={settings.databaseUser}
                           onChange={(e) => setSettings(prev => ({ ...prev, databaseUser: e.target.value }))}
                           placeholder="root"
                         />
                         <TextField
                           sx={{ flex: 1, minWidth: 250 }}
                           type="password"
                           label="Database Password"
                           value={settings.databasePassword}
                           onChange={(e) => setSettings(prev => ({ ...prev, databasePassword: e.target.value }))}
                           placeholder="Enter database password"
                         />
                       </Box>
                       <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                         <TextField
                           sx={{ flex: 1, minWidth: 250 }}
                           label="Default Database"
                           value={settings.defaultDatabase}
                           onChange={(e) => setSettings(prev => ({ ...prev, defaultDatabase: e.target.value }))}
                           placeholder="omai_db"
                         />
                         <TextField
                           sx={{ flex: 1, minWidth: 250 }}
                           type="number"
                           label="Script Timeout (ms)"
                           value={settings.scriptTimeout}
                           onChange={(e) => setSettings(prev => ({ ...prev, scriptTimeout: parseInt(e.target.value) }))}
                         />
                       </Box>
                       <FormControlLabel
                         control={
                           <Switch
                             checked={settings.useSudo}
                             onChange={(e) => setSettings(prev => ({ ...prev, useSudo: e.target.checked }))}
                           />
                         }
                         label="Use Sudo for Script Execution"
                       />
                       {settings.useSudo && (
                         <TextField
                           fullWidth
                           type="password"
                           label="Sudo Password"
                           value={settings.sudoPassword}
                           onChange={(e) => setSettings(prev => ({ ...prev, sudoPassword: e.target.value }))}
                           placeholder="Enter sudo password"
                         />
                       )}
                       <Button
                         variant="contained"
                         startIcon={<SaveIcon />}
                         onClick={saveSettings}
                       >
                         Save Settings
                       </Button>
                     </Stack>
        </CardContent>
      </Card>
    )}

    {/* File Upload Area */}
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          File Upload
        </Typography>
        <Box
          sx={{
            border: '2px dashed',
            borderColor: 'grey.300',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            cursor: 'pointer',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'action.hover'
            }
          }}
          onDrop={onFileDrop}
          onDragOver={onDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <CloudUploadIcon sx={{ fontSize: 48, color: 'grey.500', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Drop files here or click to upload
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Supports all file types: .md, .js, .sh, .py, .sql, .html, .css, .json, .xml, .txt, .pdf, images, videos, audio, archives (max 10MB)
          </Typography>
          <Typography variant="body2" color="primary.main" sx={{ mt: 1, fontWeight: 'bold' }}>
            🗺️ Special: Drop Parish Map .zip files for auto-installation!
          </Typography>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".md,.js,.jsx,.ts,.tsx,.sh,.bash,.py,.sql,.html,.htm,.css,.scss,.sass,.json,.xml,.txt,.log,.pdf,.jpg,.jpeg,.png,.gif,.svg,.webp,.mp4,.avi,.mov,.wmv,.mp3,.wav,.ogg,.zip,.tar,.gz,.rar"
            onChange={onFileInputChange}
            style={{ display: 'none' }}
          />
        </Box>
      </CardContent>
    </Card>

    {/* Uploaded Files List */}
    {uploadedFiles.length > 0 && (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Uploaded Files
          </Typography>
          <List>
            {uploadedFiles.map((file) => (
              <ListItem key={file.id} divider>
                <ListItemIcon>
                  {getFileIcon(file.type)}
                </ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={`${(file.size / 1024).toFixed(1)} KB • ${file.uploaded.toLocaleString()}`}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getFileTypeChip(file.type)}
                  <Tooltip title="Execute">
                    <IconButton
                      onClick={() => onExecuteFile(file)}
                      disabled={isExecuting}
                      color="primary"
                    >
                      <PlayIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remove">
                    <IconButton
                      onClick={() => onRemoveFile(file.id)}
                      color="error"
                    >
                      <Trash2Icon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    )}
  </Stack>
);

export default ImportsScriptsTab;
