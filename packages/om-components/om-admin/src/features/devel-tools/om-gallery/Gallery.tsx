import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Alert,
  useTheme,
  Paper,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  IconArrowLeft,
  IconArrowRight,
  IconUpload,
  IconPhoto,
  IconTrash,
  IconDownload,
} from '@tabler/icons-react';
import { DataGrid, GridRowSelectionModel } from '@mui/x-data-grid';
import {
  CANONICAL_IMAGE_DIRECTORIES,
  buildImageUrl,
  extractDirectoryFromPath,
  IMAGES_BASE_PATH
} from '../system-documentation/gallery.config';
import type { GalleryImage } from './Gallery/types';
import { GalleryContainer, ThumbnailGrid, ImageCard, ImageThumbnail, CarouselContainer, CarouselButton, CarouselImageContainer } from './Gallery/styledComponents';
import { createColumns } from './Gallery/columns';
import UploadDialog from './Gallery/UploadDialog';
import ImageDetailDialog from './Gallery/ImageDetailDialog';
import SuggestionsDialog from './Gallery/SuggestionsDialog';
import { sortImages } from './Gallery/galleryUtils';
import type { SortBy, SortOrder, UsageFilter } from './Gallery/galleryUtils';
import { useGalleryUpload } from './Gallery/useGalleryUpload';
import { useGallerySuggestions } from './Gallery/useGallerySuggestions';
import DirectorySidebar from './Gallery/DirectorySidebar';
import MoveRenameDialogs from './Gallery/MoveRenameDialogs';
import { openImageInNewWindow } from './Gallery/openInNewWindow';
import { useImageUsage } from './Gallery/useImageUsage';
import { exportCSV, exportUsedImages } from './Gallery/exportUtils';

const Gallery: React.FC = () => {
  const theme = useTheme();
  type GalleryBucket = {
    images: GalleryImage[];
    imageDialogOpen: boolean;
    selectedImage: GalleryImage | null;
    deleting: boolean;
    selectedRows: GridRowSelectionModel;
    sortBy: SortBy;
    sortOrder: SortOrder;
    usageFilter: UsageFilter;
  };
  const [gallery, setGallery] = useState<GalleryBucket>({
    images: [],
    imageDialogOpen: false,
    selectedImage: null,
    deleting: false,
    selectedRows: [],
    sortBy: 'date',
    sortOrder: 'desc',
    usageFilter: 'all',
  });
  const setGalleryField = useCallback(<K extends keyof GalleryBucket>(key: K, value: GalleryBucket[K]) => {
    setGallery(prev => ({ ...prev, [key]: value }));
  }, []);
  const { images, imageDialogOpen, selectedImage, deleting, selectedRows, sortBy, sortOrder, usageFilter } = gallery;
  const setImages: React.Dispatch<React.SetStateAction<GalleryImage[]>> = useCallback((action) => {
    setGallery(prev => ({ ...prev, images: typeof action === 'function' ? (action as (p: GalleryImage[]) => GalleryImage[])(prev.images) : action }));
  }, []);
  const setImageDialogOpen = useCallback((v: boolean) => setGalleryField('imageDialogOpen', v), [setGalleryField]);
  const setSelectedImage = useCallback((v: GalleryImage | null) => setGalleryField('selectedImage', v), [setGalleryField]);
  const setDeleting = useCallback((v: boolean) => setGalleryField('deleting', v), [setGalleryField]);
  const setSelectedRows = useCallback((v: GridRowSelectionModel) => setGalleryField('selectedRows', v), [setGalleryField]);
  const setSortBy = useCallback((v: SortBy) => setGalleryField('sortBy', v), [setGalleryField]);
  const setSortOrder = useCallback((v: SortOrder) => setGalleryField('sortOrder', v), [setGalleryField]);
  const setUsageFilter = useCallback((v: UsageFilter) => setGalleryField('usageFilter', v), [setGalleryField]);

  const [currentIndex, setCurrentIndex] = useState(0);

  type DirBucket = {
    exportingUsedImages: boolean;
    selectedDirectory: string;
    directoryTree: any;
    loadingTree: boolean;
    moveDialogOpen: boolean;
    renameDialogOpen: boolean;
    itemToMove: GalleryImage | null;
    newName: string;
    targetDir: string;
  };
  const [dir, setDir] = useState<DirBucket>({
    exportingUsedImages: false,
    selectedDirectory: '',
    directoryTree: { directories: [], files: [] },
    loadingTree: false,
    moveDialogOpen: false,
    renameDialogOpen: false,
    itemToMove: null,
    newName: '',
    targetDir: 'review-required',
  });
  const setDirField = useCallback(<K extends keyof DirBucket>(key: K, value: DirBucket[K]) => {
    setDir(prev => ({ ...prev, [key]: value }));
  }, []);
  const { exportingUsedImages, selectedDirectory, directoryTree, loadingTree, moveDialogOpen, renameDialogOpen, itemToMove, newName, targetDir } = dir;
  const setExportingUsedImages = useCallback((v: boolean) => setDirField('exportingUsedImages', v), [setDirField]);
  const setSelectedDirectory = useCallback((v: string) => setDirField('selectedDirectory', v), [setDirField]);
  const setDirectoryTree = useCallback((v: any) => setDirField('directoryTree', v), [setDirField]);
  const setLoadingTree = useCallback((v: boolean) => setDirField('loadingTree', v), [setDirField]);
  const setMoveDialogOpen = useCallback((v: boolean) => setDirField('moveDialogOpen', v), [setDirField]);
  const setRenameDialogOpen = useCallback((v: boolean) => setDirField('renameDialogOpen', v), [setDirField]);
  const setItemToMove = useCallback((v: GalleryImage | null) => setDirField('itemToMove', v), [setDirField]);
  const setNewName = useCallback((v: string) => setDirField('newName', v), [setDirField]);
  const setTargetDir = useCallback((v: string) => setDirField('targetDir', v), [setDirField]);

  // Upload hook
  const {
    uploadDialogOpen, uploading, uploadProgress, uploadError,
    selectedFiles, uploadStatus, fileInputRef,
    handleFileSelect, handleUpload, handleOpenUploadDialog,
    handleCloseUploadDialog, handleRemoveFile,
  } = useGalleryUpload();

  // Image usage checking
  const { checkingUsage, checkImageUsage } = useImageUsage({ images, setImages, selectedDirectory, usageFilter });


  // Single source of truth: activeImages combines directory selection, usage filter, and sorting
  // This ensures grid, table, and carousel all use the same filtered and sorted list
  const activeImages = React.useMemo(() => {
    if (!images || images.length === 0) return [];
    
    // Apply usage filter
    let filtered: GalleryImage[] = images;
    if (usageFilter === 'used') {
      filtered = images.filter(img => img && img.isUsed === true);
    } else if (usageFilter === 'unused') {
      filtered = images.filter(img => img && img.isUsed === false);
    } else if (usageFilter === 'not_checked') {
      filtered = images.filter(img => img && img.isUsed === undefined);
    }
    // 'all' case: filtered = images (already set)
    
    // Apply sorting
    return sortImages(filtered, sortBy, sortOrder);
  }, [images, usageFilter, sortBy, sortOrder]);

  // Reset carousel index when active images change
  React.useEffect(() => {
    if (activeImages.length > 0 && currentIndex >= activeImages.length) {
      setCurrentIndex(0);
    } else if (activeImages.length === 0) {
      setCurrentIndex(0);
    }
  }, [activeImages.length, currentIndex]);

  // Carousel navigation handlers - use activeImages instead of images
  const handlePrevious = () => {
    if (activeImages.length === 0) return;
    setCurrentIndex((prev) => (prev === 0 ? activeImages.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (activeImages.length === 0) return;
    setCurrentIndex((prev) => (prev === activeImages.length - 1 ? 0 : prev + 1));
  };

  // Re-sort images when sort criteria changes
  useEffect(() => {
    if (images.length > 0) {
      const sorted = sortImages(images);
      setImages(sorted);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortOrder]);

  // Load directory tree on mount, then cleanup empty directories
  useEffect(() => {
    const initializeGallery = async () => {
      await loadDirectoryTree();
      // Clean up empty directories after loading tree
      await cleanupEmptyDirectories();
    };
    initializeGallery();
  }, []);

  // Load images when directory changes
  useEffect(() => {
    loadImages();
  }, [selectedDirectory]);

  const loadDirectoryTree = async () => {
    setLoadingTree(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const debug = urlParams.get('debug') === '1' ? '&debug=1' : '';
      const data = await apiClient.get<any>(`/gallery/tree?depth=3${debug}`);
      console.log('📁 Directory tree loaded:', {
        directories: data.directories?.length || 0,
        files: data.files?.length || 0,
        path: data.path
      });
      setDirectoryTree(data);
      
      // Log debug info if available
      if (data.debug) {
        console.log('🔍 [DEBUG] Directory tree debug info:', data.debug);
        if (data.debug.resolvedImagesRoot) {
          console.log(`🔍 [DEBUG] Images root: ${data.debug.resolvedImagesRoot}`);
          console.log(`🔍 [DEBUG] Root exists: ${data.debug.rootExists}`);
          console.log(`🔍 [DEBUG] Root readable: ${data.debug.rootCanRead}`);
          if (data.debug.firstEntries && data.debug.firstEntries.length > 0) {
            console.log(`🔍 [DEBUG] First entries:`, data.debug.firstEntries);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error loading directory tree:', error);
      // Don't wipe state - keep existing tree if available
    } finally {
      setLoadingTree(false);
    }
  };

  const loadImages = async () => {
    try {
      const path = selectedDirectory === '' ? '' : selectedDirectory;
      const url = `/api/gallery/images?path=${encodeURIComponent(path)}&recursive=1`;

      const data = await apiClient.get<any>(url.replace('/api', ''));
      {
        if (data.debug) console.log('🔍 [DEBUG] Images API:', data.debug);

        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.tiff', '.webp', '.svg'];
        const imageFiles = (data.images || []).filter((file: any) => {
          const ext = (file.name || file.path || '').split('.').pop()?.toLowerCase() || '';
          return imageExtensions.includes(`.${ext}`);
        });

        const transformedImages = imageFiles.map((file: any, index: number) => {
          let fileSize: number | null = null;
          let fileModified: string | null = null;
          let fileCreated: string | null = null;
          let metadataError: string | null = null;

          if (file.metadataStatus === 'error') {
            metadataError = file.statError || 'Failed to read file metadata';
          } else {
            if (file.size !== undefined && file.size !== null && file.size !== '') {
              fileSize = typeof file.size === 'number' ? file.size : parseInt(String(file.size), 10);
              if (isNaN(fileSize) || fileSize < 0) { fileSize = null; metadataError = 'Invalid file size value'; }
            }
            fileModified = (file.modified && file.modified !== '') ? file.modified : null;
            fileCreated = (file.created && file.created !== '') ? file.created : null;
          }

          let imageUrl = file.url;
          if (!imageUrl && file.path) {
            imageUrl = file.path.startsWith('/') ? file.path : `${IMAGES_BASE_PATH}/${file.path}`;
          }
          if (!imageUrl && file.name) {
            const directory = file.path ? extractDirectoryFromPath(file.path) : null;
            imageUrl = directory ? buildImageUrl(directory, file.name) : `${IMAGES_BASE_PATH}/${CANONICAL_IMAGE_DIRECTORIES[0]}/${file.name}`;
          }

          return {
            id: `img-${index}-${file.name}`,
            name: file.name || 'Unknown',
            path: file.path || file.url || file.name,
            url: imageUrl || '/images/incode/placeholder.png',
            created: fileCreated,
            modified: fileModified,
            size: fileSize,
            type: file.type || file.name?.split('.').pop()?.toLowerCase() || 'unknown',
            isUsed: undefined,
            metadataError: metadataError || undefined,
          };
        });

        setImages(transformedImages);
        setCurrentIndex(0);
      }
    } catch (error: any) {
      console.error('Gallery API request failed:', error.message);
      setImages([]);
    }
  };

  // Suggestions hook (needs loadImages/loadDirectoryTree)
  const {
    suggestions, suggestionsDialogOpen, setSuggestionsDialogOpen,
    suggestionStatuses, setSuggestionStatuses,
    showFullSummary, setShowFullSummary,
    summaryExpanded, setSummaryExpanded,
    validating, applying,
    handleGetSuggestions, handleDryRun, handleApplySingle,
    handleApplyAll, handleCopySummary,
  } = useGallerySuggestions({ images, loadImages, loadDirectoryTree });

  const handleImageClick = (image: GalleryImage) => {
    setSelectedImage(image);
    setImageDialogOpen(true);
  };

  const handleOpenInNewWindow = openImageInNewWindow;

  const handleDeleteImage = async (image: GalleryImage) => {
    if (!window.confirm(`Are you sure you want to delete "${image.name}"?`)) {
      return;
    }

    setDeleting(true);
    try {
      // Extract relative path from /images/... path
      const relativePath = image.path.replace(/^\/images\//, '');
      console.log('🗑️ [Frontend] Single delete:', {
        name: image.name,
        originalPath: image.path,
        relativePath: relativePath,
        selectedDirectory: selectedDirectory
      });
      
      await apiClient.delete<any>('/gallery/file', { data: { path: relativePath } });
      console.log('🗑️ [Frontend] Delete successful');
      await loadImages();
      await loadDirectoryTree();
      setImageDialogOpen(false);
      setSelectedImage(null);
    } catch (error: any) {
      console.error('🗑️ [Frontend] Error deleting image:', error);
      alert(`Failed to delete image: ${error.message || 'Network error'}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleMoveImage = async (image: GalleryImage, targetDir: string) => {
    try {
      const relativePath = image.path.replace(/^\/images\//, '');
      const targetPath = targetDir ? `${targetDir}/${image.name}` : image.name;
      
      await apiClient.post<any>('/gallery/move', { from: relativePath, to: targetPath, overwrite: false });
      await loadImages();
      await loadDirectoryTree();
      setMoveDialogOpen(false);
      setItemToMove(null);
    } catch (error) {
      console.error('Error moving image:', error);
      alert('Failed to move image');
    }
  };

  const handleRenameImage = async (image: GalleryImage, newName: string) => {
    try {
      const relativePath = image.path.replace(/^\/images\//, '');
      await apiClient.post<any>('/gallery/rename', { path: relativePath, newName });
      await loadImages();
      await loadDirectoryTree();
      setRenameDialogOpen(false);
      setItemToMove(null);
      setNewName('');
    } catch (error) {
      console.error('Error renaming image:', error);
      alert('Failed to rename image');
    }
  };

  const handleCreateDirectory = async (dirName: string) => {
    if (!dirName || !dirName.trim()) {
      alert('Directory name cannot be empty');
      return;
    }
    
    try {
      const targetPath = selectedDirectory ? `${selectedDirectory}/${dirName.trim()}` : dirName.trim();
      const data = await apiClient.post<any>('/gallery/mkdir', { path: targetPath });
      await loadDirectoryTree();
      console.log('Directory created:', data);
    } catch (error: any) {
      console.error('Error creating directory:', error);
      alert(`Failed to create directory: ${error.message || 'Unknown error'}`);
    }
  };














  // MUI DataGrid column definitions (extracted to Gallery/columns.tsx)
  const columns = createColumns({
    checkingUsage,
    deleting,
    selectedDirectory,
    handleImageClick,
    setItemToMove,
    setNewName,
    setRenameDialogOpen,
    setTargetDir,
    setMoveDialogOpen,
    handleDeleteImage,
  });

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) {
      alert('Please select at least one image to delete');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedRows.length} image(s)?`)) {
      return;
    }

    setDeleting(true);
    try {
      // Use activeImages to ensure we're deleting from the filtered view
      const selectedImages = activeImages.filter(img => selectedRows.includes(img.id || img.path));
      const deletePromises = selectedImages.map(async (image) => {
        const relativePath = image.path.replace(/^\/images\//, '');
        console.log('🗑️ [Frontend] Attempting to delete:', {
          name: image.name,
          originalPath: image.path,
          relativePath: relativePath,
          selectedDirectory: selectedDirectory
        });
        try {
          await apiClient.delete<any>('/gallery/file', { data: { path: relativePath } });
          return { success: true, image: image.name, path: relativePath };
        } catch (error: any) {
          console.error(`Error deleting ${image.name}:`, error);
          return { 
            success: false, 
            image: image.name, 
            error: error.message || 'Network error',
            path: relativePath 
          };
        }
      });

      const results = await Promise.all(deletePromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      if (successful.length > 0) {
        await loadImages();
        await loadDirectoryTree();
        setSelectedRows([]);
        
        if (failed.length > 0) {
          const failedDetails = failed.map(f => `  - ${f.image}: ${f.error}`).join('\n');
          alert(`Successfully deleted ${successful.length} image(s).\n\nFailed to delete ${failed.length} image(s):\n${failedDetails}`);
        } else {
          alert(`Successfully deleted ${successful.length} image(s)`);
        }
      } else {
        const failedDetails = failed.map(f => `  - ${f.image}: ${f.error}`).join('\n');
        alert(`Failed to delete ${failed.length} image(s):\n\n${failedDetails}`);
      }
    } catch (error: any) {
      console.error('Error deleting images:', error);
      alert(`An error occurred while deleting images: ${error.message || 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCSV = () => exportCSV(images);

  const handleExportUsedImages = () => exportUsedImages(setExportingUsedImages, null);

  // No longer needed - MUI DataGrid uses React components for cell rendering

  // Get first 8 images for thumbnail display - use activeImages to respect filters
  const thumbnailImages = activeImages.slice(0, 8);

  // Use canonical directories from shared config (single source of truth)
  const DEFAULT_DIRECTORIES = CANONICAL_IMAGE_DIRECTORIES;

  // Check if directory is a canonical directory

  // Clean up empty directories
  const cleanupEmptyDirectories = async () => {
    try {
      const data = await apiClient.post<any>('/gallery/cleanup-empty-dirs');
      if (data.deleted && data.deleted.length > 0) {
        console.log(`🗑️ Cleaned up ${data.deleted.length} empty directory(ies):`, data.deleted);
        // Reload directory tree after cleanup
        await loadDirectoryTree();
      }
    } catch (error) {
      console.error('Error cleaning up empty directories:', error);
      // Don't show error to user - this is a background operation
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'row' }}>
      {/* Directory Tree Sidebar */}
      <DirectorySidebar
        selectedDirectory={selectedDirectory}
        setSelectedDirectory={setSelectedDirectory}
        directoryTree={directoryTree}
        loadingTree={loadingTree}
        onCreateDirectory={handleCreateDirectory}
        onGetSuggestions={handleGetSuggestions}
      />

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <GalleryContainer maxWidth="xl">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 2,
              fontFamily: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
            }}
          >
            Image Gallery
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Browse images from <code>/public/images/**</code> (all directories)
          </Typography>
          {/* Usage Status Banner */}
          {images.length > 0 && images.some(img => img.isUsed === undefined) && (
            <Alert 
              severity="info" 
              sx={{ mb: 3 }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => checkImageUsage(images, true)}
                  disabled={checkingUsage}
                >
                  {checkingUsage ? 'Checking...' : 'Check Now'}
                </Button>
              }
            >
              Usage status not computed. Click &quot;Refresh Usage&quot; or &quot;Check Now&quot; to determine which images are used in the codebase.
            </Alert>
          )}
          {/* Carousel Navigation Arrows */}
          {activeImages.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, mb: 3 }}>
              <CarouselButton
                onClick={handlePrevious}
                aria-label="Previous image"
                sx={{ position: 'relative', transform: 'none' }}
              >
                <IconArrowLeft size={28} />
              </CarouselButton>
              
              <CarouselButton
                onClick={handleNext}
                aria-label="Next image"
                sx={{ position: 'relative', transform: 'none' }}
              >
                <IconArrowRight size={28} />
              </CarouselButton>
            </Box>
          )}

          <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" sx={{ mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<IconUpload size={20} />}
              onClick={handleOpenUploadDialog}
              sx={{
                backgroundColor: '#C8A24B',
                color: '#1a1a1a',
                '&:hover': {
                  backgroundColor: '#B8923A',
                },
              }}
            >
              Upload Images
            </Button>

            {/* Refresh Usage Check */}
            {images.length > 0 && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => checkImageUsage(images, true)}
                disabled={checkingUsage}
                title={checkingUsage ? 'Checking image usage in codebase...' : 'Check all images for usage in codebase'}
              >
                {checkingUsage ? 'Checking...' : 'Refresh Usage'}
              </Button>
            )}
          </Stack>
        </Box>

        {/* Carousel - Current Image Display */}
        {activeImages.length > 0 && (
          <CarouselContainer>
            <CarouselButton
              onClick={handlePrevious}
              sx={{ left: { xs: -20, sm: -28 } }}
              aria-label="Previous image"
              disabled={activeImages.length === 0}
            >
              <IconArrowLeft size={28} />
            </CarouselButton>

            <CarouselImageContainer
              onClick={() => activeImages[currentIndex] && handleOpenInNewWindow(activeImages[currentIndex])}
              sx={{ cursor: 'pointer' }}
              isUsed={activeImages[currentIndex]?.isUsed === true}
            >
              {activeImages[currentIndex] && (
                <Box
                  component="img"
                  src={activeImages[currentIndex].url}
                  alt={activeImages[currentIndex].name}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    imageOrientation: 'from-image', // Respect EXIF orientation
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/incode/placeholder.png';
                  }}
                />
              )}
            </CarouselImageContainer>

            <CarouselButton
              onClick={handleNext}
              sx={{ right: { xs: -20, sm: -28 } }}
              aria-label="Next image"
              disabled={activeImages.length === 0}
            >
              <IconArrowRight size={28} />
            </CarouselButton>

            {/* Image info below carousel */}
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {activeImages[currentIndex]?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {activeImages.length > 0 ? `${currentIndex + 1} of ${activeImages.length}` : '0 of 0'}
              </Typography>
            </Box>
          </CarouselContainer>
        )}

        {/* Thumbnail Grid - 2 rows of 4 images (8 total) */}
        {activeImages.length > 0 && (
          <Box>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
              Recent Images
            </Typography>
            <ThumbnailGrid>
              {thumbnailImages.map((image, index) => {
                // Find index in activeImages to sync with carousel
                const activeIndex = activeImages.findIndex(img => img.id === image.id || img.path === image.path);
                return (
                <ImageCard
                  key={image.id || index}
                  onClick={() => {
                    if (activeIndex >= 0) {
                      setCurrentIndex(activeIndex);
                    }
                    handleOpenInNewWindow(image);
                  }}
                  isUsed={image.isUsed === true}
                >
                  <ImageThumbnail
                    component="img"
                    image={image.url}
                    alt={image.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/incode/placeholder.png';
                    }}
                  />
                </ImageCard>
                );
              })}
            </ThumbnailGrid>
          </Box>
        )}

        {/* AG Grid Table */}
        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              All Images
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              {/* Sort Controls */}
              {images.length > 0 && (
                <>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Sort By</InputLabel>
                    <Select
                      value={sortBy}
                      label="Sort By"
                      onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'size' | 'type' | 'location')}
                    >
                      <MenuItem value="date">Date Modified</MenuItem>
                      <MenuItem value="name">Name</MenuItem>
                      <MenuItem value="size">Size</MenuItem>
                      <MenuItem value="type">Type</MenuItem>
                      <MenuItem value="location">Location</MenuItem>
                    </Select>
                  </FormControl>
                  <IconButton
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                    size="small"
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </IconButton>
                </>
              )}

              {/* Usage Filter */}
              {images.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Usage Filter</InputLabel>
                    <Select
                      value={usageFilter}
                      label="Usage Filter"
                      onChange={(e) => setUsageFilter(e.target.value as 'all' | 'used' | 'unused' | 'not_checked')}
                    >
                    <MenuItem value="all">All Images</MenuItem>
                    <MenuItem value="used">Used in Codebase</MenuItem>
                    <MenuItem value="unused">Not Used</MenuItem>
                    <MenuItem value="not_checked">Not Checked</MenuItem>
                  </Select>
                </FormControl>
              )}

              <Button
                variant="outlined"
                color="error"
                startIcon={<IconTrash size={18} />}
                onClick={handleBulkDelete}
                disabled={deleting || selectedRows.length === 0}
              >
                Delete Selected ({selectedRows.length})
              </Button>
              <Button
                variant="outlined"
                startIcon={<IconDownload size={18} />}
                onClick={handleExportCSV}
                disabled={images.length === 0}
              >
                Export CSV
              </Button>
              <Button
                variant="outlined"
                color="success"
                startIcon={<IconDownload size={18} />}
                onClick={handleExportUsedImages}
                disabled={exportingUsedImages}
              >
                {exportingUsedImages ? 'Generating...' : 'Export Used Images List'}
              </Button>
            </Stack>
          </Box>
          <Paper sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={activeImages}
              columns={columns}
              getRowId={(row) => row.id || row.path}
              checkboxSelection
              disableRowSelectionOnClick
              rowSelectionModel={selectedRows}
              onRowSelectionModelChange={(newSelection) => {
                setSelectedRows(newSelection);
              }}
              pageSizeOptions={[10, 20, 50, 100]}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 20 },
                },
              }}
              getRowClassName={(params) => {
                if (!params || !params.row) return '';
                const image = params.row as GalleryImage;
                if (!image) return '';
                if (image.isUsed === true) {
                  return 'gallery-row-used';
                } else if (image.isUsed === false) {
                  return 'gallery-row-unused';
                }
                return '';
              }}
              sx={{
                '& .MuiDataGrid-cell:focus': {
                  outline: 'none',
                },
                '& .gallery-row-used': {
                  background: 'linear-gradient(90deg, rgba(200, 230, 201, 0.3) 0%, rgba(200, 230, 201, 0.1) 100%)',
                  '&:hover': {
                    backgroundColor: 'rgba(200, 230, 201, 0.4) !important',
                  },
                },
                '& .gallery-row-unused': {
                  background: 'linear-gradient(90deg, rgba(255, 205, 210, 0.3) 0%, rgba(255, 205, 210, 0.1) 100%)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 205, 210, 0.4) !important',
                  },
                },
              }}
            />
          </Paper>
        </Box>

        {images.length === 0 && (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              border: `2px dashed ${theme.palette.divider}`,
              borderRadius: 2,
            }}
          >
            <IconPhoto size={64} style={{ opacity: 0.3, marginBottom: 16 }} />
            <Typography variant="h6" color="text.secondary">
              No images in gallery
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Upload your first image to get started
            </Typography>
          </Box>
        )}
      </GalleryContainer>
      </Box>

      {/* Move/Rename Dialogs */}
      <MoveRenameDialogs
        moveDialogOpen={moveDialogOpen}
        renameDialogOpen={renameDialogOpen}
        itemToMove={itemToMove}
        targetDir={targetDir}
        newName={newName}
        setTargetDir={setTargetDir}
        setNewName={setNewName}
        onCloseMove={() => setMoveDialogOpen(false)}
        onCloseRename={() => setRenameDialogOpen(false)}
        onMove={handleMoveImage}
        onRename={handleRenameImage}
      />

      {/* Catalog Suggestions Dialog */}
      <SuggestionsDialog
        open={suggestionsDialogOpen}
        onClose={() => {
          setSuggestionsDialogOpen(false);
          setSuggestionStatuses({});
          setShowFullSummary(false);
          setSummaryExpanded(false);
        }}
        suggestions={suggestions}
        suggestionStatuses={suggestionStatuses}
        showFullSummary={showFullSummary}
        setShowFullSummary={setShowFullSummary}
        summaryExpanded={summaryExpanded}
        setSummaryExpanded={setSummaryExpanded}
        validating={validating}
        applying={applying}
        onDryRun={handleDryRun}
        onApplyAll={handleApplyAll}
        onApplySingle={handleApplySingle}
        onCopySummary={handleCopySummary}
      />

      {/* Image Detail Dialog */}
      <ImageDetailDialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        image={selectedImage}
        deleting={deleting}
        onOpenInNewWindow={handleOpenInNewWindow}
        onDelete={handleDeleteImage}
      />

      {/* Upload Dialog */}
      <UploadDialog
        open={uploadDialogOpen}
        onClose={handleCloseUploadDialog}
        selectedFiles={selectedFiles}
        uploadStatus={uploadStatus}
        uploading={uploading}
        uploadProgress={uploadProgress}
        uploadError={uploadError}
        fileInputRef={fileInputRef}
        onFileSelect={handleFileSelect}
        onRemoveFile={handleRemoveFile}
        onUpload={handleUpload}
      />
    </Box>
  );
};

export default Gallery;

