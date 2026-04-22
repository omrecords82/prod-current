/**
 * DropzoneFormInput - Enhanced file upload dropzone component
 * Adapted from Raydar template with Material-UI integration
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  IconButton,
  Grid,
  FormLabel,
  FormHelperText,
  Chip,
  LinearProgress,
} from '@mui/material';
import { IconCloudUpload, IconX, IconFile } from '@tabler/icons-react';
import { useDropzone, type FileRejection } from 'react-dropzone';

export interface UploadedFile extends File {
  preview?: string;
  formattedSize?: string;
  uploadProgress?: number;
}

export interface DropzoneFormInputProps {
  label?: React.ReactNode;
  labelClassName?: string;
  helpText?: React.ReactNode;
  text?: string;
  textClassName?: string;
  showPreview?: boolean;
  maxFiles?: number;
  maxSize?: number; // in bytes
  accept?: Record<string, string[]>;
  onFileUpload?: (files: File[]) => void;
  onFileRemove?: (file: UploadedFile) => void;
  loading?: boolean;
  disabled?: boolean;
  error?: string;
}

/**
 * File upload dropzone component with preview and progress support
 * 
 * @example
 * ```tsx
 * <DropzoneFormInput
 *   label="Upload Documents"
 *   text="Drag & drop files here, or click to select"
 *   helpText="Supported formats: PDF, DOC, DOCX (max 10MB)"
 *   showPreview={true}
 *   maxFiles={5}
 *   maxSize={10 * 1024 * 1024} // 10MB
 *   accept={{
 *     'application/pdf': ['.pdf'],
 *     'application/msword': ['.doc', '.docx']
 *   }}
 *   onFileUpload={handleFileUpload}
 * />
 * ```
 */
export const DropzoneFormInput: React.FC<DropzoneFormInputProps> = ({
  label,
  labelClassName,
  helpText,
  text = 'Drag & drop files here, or click to select',
  textClassName,
  showPreview = true,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  accept,
  onFileUpload,
  onFileRemove,
  loading = false,
  disabled = false,
  error,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleAcceptedFiles = useCallback((acceptedFiles: File[]) => {
    const processedFiles: UploadedFile[] = acceptedFiles.map((file) => {
      const processedFile = file as UploadedFile;
      processedFile.formattedSize = formatFileSize(file.size);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        processedFile.preview = URL.createObjectURL(file);
      }
      
      return processedFile;
    });

    setSelectedFiles((prev) => [...prev, ...processedFiles]);
    onFileUpload?.(acceptedFiles);
  }, [onFileUpload]);

  const handleFileRejections = useCallback((rejections: FileRejection[]) => {
    console.warn('File rejections:', rejections);
    // Handle rejected files (show error messages, etc.)
  }, []);

  const removeFile = useCallback((fileToRemove: UploadedFile) => {
    setSelectedFiles((prev) => prev.filter((file) => file !== fileToRemove));
    
    // Revoke preview URL to avoid memory leaks
    if (fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    
    onFileRemove?.(fileToRemove);
  }, [onFileRemove]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop: handleAcceptedFiles,
    onDropRejected: handleFileRejections,
    maxFiles: maxFiles - selectedFiles.length,
    maxSize,
    accept,
    disabled: disabled || loading,
  });

  const getFileIcon = (file: UploadedFile) => {
    if (file.type.startsWith('image/') && file.preview) {
      return (
        <Box
          component="img"
          src={file.preview}
          alt={file.name}
          sx={{
            width: 60,
            height: 60,
            objectFit: 'cover',
            borderRadius: 1,
            bgcolor: 'grey.100',
          }}
        />
      );
    }

    return (
      <Box
        sx={{
          width: 60,
          height: 60,
          bgcolor: 'grey.100',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <IconFile size={24} />
        <Typography variant="caption" sx={{ mt: 0.5, fontSize: '0.6rem', textAlign: 'center' }}>
          {file.name.split('.').pop()?.toUpperCase()}
        </Typography>
      </Box>
    );
  };

  const dropzoneColor = isDragReject ? 'error.main' : isDragActive ? 'primary.main' : 'grey.400';
  const dropzoneBgColor = isDragReject ? 'error.light' : isDragActive ? 'primary.light' : 'grey.50';

  return (
    <Box>
      {label && (
        <FormLabel className={labelClassName} sx={{ mb: 1, display: 'block' }}>
          {label}
        </FormLabel>
      )}

      <Paper
        {...getRootProps()}
        sx={{
          border: 2,
          borderStyle: 'dashed',
          borderColor: dropzoneColor,
          bgcolor: dropzoneBgColor,
          p: 3,
          textAlign: 'center',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            borderColor: disabled || loading ? dropzoneColor : 'primary.main',
            bgcolor: disabled || loading ? dropzoneBgColor : 'primary.light',
          },
          opacity: disabled || loading ? 0.6 : 1,
        }}
      >
        <input {...getInputProps()} />
        
        {loading ? (
          <Box>
            <LinearProgress sx={{ mb: 2 }} />
            <Typography color="text.secondary">Uploading files...</Typography>
          </Box>
        ) : (
          <Box>
            <IconCloudUpload size={48} color={isDragReject ? 'error' : 'primary'} />
            <Typography variant="h6" className={textClassName} sx={{ mt: 1, mb: 1 }}>
              {isDragActive ? 'Drop files here' : text}
            </Typography>
            {helpText && (
              typeof helpText === 'string' ? (
                <FormHelperText sx={{ textAlign: 'center', mt: 1 }}>
                  {helpText}
                </FormHelperText>
              ) : (
                helpText
              )
            )}
            {maxFiles && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Maximum {maxFiles} files • Max size: {formatFileSize(maxSize)}
              </Typography>
            )}
          </Box>
        )}
      </Paper>

      {error && (
        <FormHelperText error sx={{ mt: 1 }}>
          {error}
        </FormHelperText>
      )}

      {showPreview && selectedFiles.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Selected Files ({selectedFiles.length})
          </Typography>
          <Grid container spacing={2}>
            {selectedFiles.map((file, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={`${file.name}-${index}`}>
                <Card
                  sx={{
                    position: 'relative',
                    height: '100%',
                    '&:hover .remove-button': {
                      opacity: 1,
                    },
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box display="flex" alignItems="center" spacing={1}>
                      {getFileIcon(file)}
                      <Box sx={{ ml: 1, flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          noWrap
                          title={file.name}
                          fontWeight="medium"
                        >
                          {file.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {file.formattedSize}
                        </Typography>
                        {file.uploadProgress !== undefined && (
                          <Box sx={{ mt: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={file.uploadProgress}
                              size="small"
                            />
                          </Box>
                        )}
                      </Box>
                    </Box>
                    
                    <IconButton
                      className="remove-button"
                      size="small"
                      onClick={() => removeFile(file)}
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        bgcolor: 'error.main',
                        color: 'white',
                        '&:hover': {
                          bgcolor: 'error.dark',
                        },
                      }}
                    >
                      <IconX size={16} />
                    </IconButton>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default DropzoneFormInput;