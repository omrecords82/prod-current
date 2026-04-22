/**
 * OcrUploader Component
 * 
 * Upload interface for OCR document processing.
 * Allows users to upload images or PDFs for OCR processing.
 * 
 * Route: /apps/ocr/upload
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Card,
  CardContent,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { EnhancedOCRUploader } from '../devel-tools/om-ocr/EnhancedOCRUploader';

const OcrUploader: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (files: File[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (uploadedFiles.length === 0) {
      setError('Please select at least one file to upload');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      
      // TODO: Implement actual upload logic
      // const formData = new FormData();
      // uploadedFiles.forEach(file => formData.append('files', file));
      // const response = await fetch('/api/ocr/upload', {
      //   method: 'POST',
      //   body: formData,
      // });
      
      // Simulate upload
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setUploadedFiles([]);
      setUploading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload files');
      setUploading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          OCR Document Upload
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Upload images or PDFs to process with Optical Character Recognition (OCR).
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Use Enhanced OCR Uploader if available */}
        <Box sx={{ mb: 3 }}>
          <EnhancedOCRUploader />
        </Box>

        {/* File List */}
        {uploadedFiles.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Selected Files ({uploadedFiles.length})
              </Typography>
              <List>
                {uploadedFiles.map((file, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={file.name}
                      secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveFile(index)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}

        {uploading && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Uploading and processing files...
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setUploadedFiles([])}
            disabled={uploading || uploadedFiles.length === 0}
          >
            Clear All
          </Button>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={handleUpload}
            disabled={uploading || uploadedFiles.length === 0}
          >
            {uploading ? 'Processing...' : 'Upload & Process'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default OcrUploader;
