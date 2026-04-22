/**
 * useGalleryUpload — Custom hook encapsulating all upload state and handlers.
 * Extracted from Gallery.tsx
 */
import { useState, useRef } from 'react';
import type { UploadStatus } from './types';

interface UseGalleryUploadReturn {
  uploadDialogOpen: boolean;
  uploading: boolean;
  uploadProgress: number;
  uploadError: string | null;
  selectedFiles: File[];
  uploadStatus: Record<string, UploadStatus>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleUpload: () => Promise<void>;
  handleOpenUploadDialog: () => void;
  handleCloseUploadDialog: () => void;
  handleRemoveFile: (index: number) => void;
}

export function useGalleryUpload(): UseGalleryUploadReturn {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<Record<string, UploadStatus>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      // Allowed image file extensions
      const allowedExtensions = ['.jpg', '.jpeg', '.tiff', '.gif', '.png'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!allowedExtensions.includes(fileExtension)) {
        errors.push(`${file.name}: Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name}: File size must be less than 10MB`);
        return;
      }
      validFiles.push(file);
    });

    if (errors.length > 0) {
      setUploadError(errors.join('\n'));
    } else {
      setUploadError(null);
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const uploadSingleFile = (file: File, targetDirectory: string = 'review-required'): Promise<void> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('targetDir', targetDirectory);
      
      const xhr = new XMLHttpRequest();
      const fileKey = `${file.name}-${file.size}`;

      // Initialize upload status
      setUploadStatus(prev => ({
        ...prev,
        [fileKey]: { progress: 0, status: 'uploading' }
      }));

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadStatus(prev => {
            const updated = {
              ...prev,
              [fileKey]: { ...prev[fileKey], progress: percentComplete, status: 'uploading' as const }
            };
            // Calculate overall progress
            const allStatuses = Object.values(updated);
            const totalProgress = allStatuses.length > 0 
              ? allStatuses.reduce((sum, s) => sum + s.progress, 0) / allStatuses.length 
              : 0;
            setUploadProgress(totalProgress);
            return updated;
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              setUploadStatus(prev => ({
                ...prev,
                [fileKey]: { progress: 100, status: 'success' }
              }));
              resolve();
            } else {
              const errorMsg = response.error || response.message || 'Upload failed';
              setUploadStatus(prev => ({
                ...prev,
                [fileKey]: { progress: 0, status: 'error', error: errorMsg }
              }));
              reject(new Error(errorMsg));
            }
          } catch (e) {
            setUploadStatus(prev => ({
              ...prev,
              [fileKey]: { progress: 100, status: 'success' }
            }));
            resolve();
          }
        } else {
          let errorMessage = 'Upload failed';
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            errorMessage = errorResponse.error || errorResponse.message || errorMessage;
          } catch (e) {
            if (xhr.status === 500) {
              errorMessage = 'Internal server error. Please check server logs.';
            } else if (xhr.status === 404) {
              errorMessage = 'Upload endpoint not found. Backend needs to implement POST /api/gallery/upload';
            } else {
              errorMessage = `Upload failed with status ${xhr.status}`;
            }
          }
          setUploadStatus(prev => ({
            ...prev,
            [fileKey]: { progress: 0, status: 'error', error: errorMessage }
          }));
          reject(new Error(errorMessage));
        }
      });

      xhr.addEventListener('error', () => {
        const errorMsg = 'Upload failed. Backend endpoint /api/gallery/upload may not be available.';
        setUploadStatus(prev => ({
          ...prev,
          [fileKey]: { progress: 0, status: 'error', error: errorMsg }
        }));
        reject(new Error(errorMsg));
      });

      xhr.open('POST', '/api/gallery/upload');
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setUploadError('Please select at least one file');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);
    
    // Initialize upload status for all files
    const initialStatus: Record<string, UploadStatus> = {};
    selectedFiles.forEach(file => {
      const fileKey = `${file.name}-${file.size}`;
      initialStatus[fileKey] = { progress: 0, status: 'pending' };
    });
    setUploadStatus(initialStatus);

    try {
      // Upload files sequentially to avoid overwhelming the server
      const errors: string[] = [];
      for (const file of selectedFiles) {
        try {
          // Always upload to review-required directory
          await uploadSingleFile(file, 'review-required');
        } catch (error: any) {
          errors.push(`${file.name}: ${error.message || 'Upload failed'}`);
        }
      }

      if (errors.length > 0) {
        setUploadError(`Some files failed to upload:\n${errors.join('\n')}`);
      } else {
        // All files uploaded successfully
        setUploadDialogOpen(false);
        setSelectedFiles([]);
        setUploadStatus({});
        setUploadProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        // Reload the page to show newly uploaded images
        window.location.href = '/apps/gallery';
      }
    } catch (error: any) {
      setUploadError(error.message || 'An error occurred during upload');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenUploadDialog = () => {
    setUploadDialogOpen(true);
    setSelectedFiles([]);
    setUploadError(null);
    setUploadProgress(0);
    setUploadStatus({});
  };

  const handleCloseUploadDialog = () => {
    if (!uploading) {
      setUploadDialogOpen(false);
      setSelectedFiles([]);
      setUploadError(null);
      setUploadProgress(0);
      setUploadStatus({});
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return {
    uploadDialogOpen,
    uploading,
    uploadProgress,
    uploadError,
    selectedFiles,
    uploadStatus,
    fileInputRef,
    handleFileSelect,
    handleUpload,
    handleOpenUploadDialog,
    handleCloseUploadDialog,
    handleRemoveFile,
  };
}
