import React from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { IconUpload, IconX } from '@tabler/icons-react';
import type { UploadStatus } from './types';

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  selectedFiles: File[];
  uploadStatus: Record<string, UploadStatus>;
  uploading: boolean;
  uploadProgress: number;
  uploadError: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onUpload: () => void;
}

const UploadDialog: React.FC<UploadDialogProps> = ({
  open,
  onClose,
  selectedFiles,
  uploadStatus,
  uploading,
  uploadProgress,
  uploadError,
  fileInputRef,
  onFileSelect,
  onRemoveFile,
  onUpload,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Upload Image to Gallery
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <IconX size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.tiff,.gif,.png"
            onChange={onFileSelect}
            style={{ display: 'none' }}
            id="image-upload-input"
            multiple
          />
          <label htmlFor="image-upload-input">
            <Button
              variant="outlined"
              component="span"
              fullWidth
              startIcon={<IconUpload size={20} />}
              sx={{ mb: 2 }}
            >
              {selectedFiles.length > 0 ? `Select More Images (${selectedFiles.length} selected)` : 'Select Images'}
            </Button>
          </label>

          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2, textAlign: 'center' }}>
            Allowed formats: .jpg, .jpeg, .tiff, .gif, .png (You can select multiple files)
          </Typography>

          {selectedFiles.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Selected Images ({selectedFiles.length}):
              </Typography>
              <Stack spacing={1}>
                {selectedFiles.map((file, index) => {
                  const fileKey = `${file.name}-${file.size}`;
                  const status = uploadStatus[fileKey];
                  return (
                    <Box
                      key={index}
                      sx={{
                        p: 2,
                        bgcolor: 'background.default',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: status?.status === 'error' ? 'error.main' : status?.status === 'success' ? 'success.main' : 'divider',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {file.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                          </Typography>
                          {status && (
                            <>
                              {status.status === 'uploading' && (
                                <Box sx={{ mt: 1 }}>
                                  <LinearProgress variant="determinate" value={status.progress} />
                                  <Typography variant="caption" color="text.secondary">
                                    Uploading... {Math.round(status.progress)}%
                                  </Typography>
                                </Box>
                              )}
                              {status.status === 'success' && (
                                <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                                  ✓ Uploaded successfully
                                </Typography>
                              )}
                              {status.status === 'error' && (
                                <Typography variant="caption" color="error.main" sx={{ mt: 0.5, display: 'block' }}>
                                  ✗ {status.error || 'Upload failed'}
                                </Typography>
                              )}
                            </>
                          )}
                        </Box>
                        {!uploading && (
                          <IconButton
                            size="small"
                            onClick={() => onRemoveFile(index)}
                            sx={{ ml: 1 }}
                            color="error"
                          >
                            <IconX size={18} />
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          )}

          {uploading && selectedFiles.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Overall Progress: {Math.round(uploadProgress)}%
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Uploading {selectedFiles.length} image{selectedFiles.length > 1 ? 's' : ''}...
              </Typography>
            </Box>
          )}

          {uploadError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {uploadError}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={uploading}>
          Cancel
        </Button>
        <Button
          onClick={onUpload}
          variant="contained"
          disabled={selectedFiles.length === 0 || uploading}
          sx={{
            backgroundColor: '#C8A24B',
            color: '#1a1a1a',
            '&:hover': { backgroundColor: '#B8923A' },
          }}
        >
          {uploading ? `Uploading... (${Math.round(uploadProgress)}%)` : `Upload ${selectedFiles.length} Image${selectedFiles.length !== 1 ? 's' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UploadDialog;
