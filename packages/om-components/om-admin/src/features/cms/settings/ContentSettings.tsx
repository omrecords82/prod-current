import React, { useCallback, useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Alert,
    Card,
    CardContent,
    Stack,
    Button,
    CircularProgress,
    Grid,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    IconButton,
    Tooltip,
    Snackbar,
    Tabs,
    Tab
} from '@mui/material';
import {
    IconUpload,
    IconPhoto,
    IconTrash,
    IconEye,
    IconDownload,
    IconUsers,
    IconLayoutGrid,
    IconFolder,
    IconFolderPlus,
    IconRefresh,
    IconFilter,
    IconMoodSmile,
    IconBrandGravatar
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import ImageGridExtractor from '@/features/tables/settings/ImageGridExtractor';
import { adminAPI } from '@/api/admin.api';

export type ContentType = 'avatar' | 'banner' | 'profile' | 'gif' | 'emoji' | 'all';

interface GlobalImage {
    id: string;
    name: string;
    url: string;
    type: 'profile' | 'banner' | 'avatar' | 'gif' | 'emoji';
    size: string;
    uploadedAt: string;
    uploadedBy: string;
    source?: 'global' | 'user' | 'directory';
    filename?: string;
    directory?: string;
}

interface ContentDirectory {
    id?: string;
    path: string;
    contentType: ContentType;
    enabled: boolean;
    description?: string;
    lastScanned?: string;
    fileCount?: number;
}

const ContentSettings: React.FC = () => {
    const { isSuperAdmin } = useAuth();
    // Standalone: globalImages uses updater-fn callsites
    const [globalImages, setGlobalImages] = useState<GlobalImage[]>([]);

    // Bucketed state: upload/snack (9 fields)
    interface UploadState {
        loading: boolean;
        error: string | null;
        uploadDialogOpen: boolean;
        uploadType: ContentType;
        uploading: boolean;
        selectedFile: File | null;
        imageName: string;
        snackbarOpen: boolean;
        snackbarMessage: string;
    }
    const [uploadState, setUploadState] = useState<UploadState>({
        loading: false,
        error: null,
        uploadDialogOpen: false,
        uploadType: 'avatar',
        uploading: false,
        selectedFile: null,
        imageName: '',
        snackbarOpen: false,
        snackbarMessage: '',
    });
    const setUploadField = useCallback(<K extends keyof UploadState>(key: K, value: UploadState[K]) => {
        setUploadState(prev => ({ ...prev, [key]: value }));
    }, []);
    const { loading, error, uploadDialogOpen, uploadType, uploading, selectedFile, imageName, snackbarOpen, snackbarMessage } = uploadState;
    const setLoading = useCallback((v: boolean) => setUploadField('loading', v), [setUploadField]);
    const setError = useCallback((v: string | null) => setUploadField('error', v), [setUploadField]);
    const setUploadDialogOpen = useCallback((v: boolean) => setUploadField('uploadDialogOpen', v), [setUploadField]);
    const setUploadType = useCallback((v: ContentType) => setUploadField('uploadType', v), [setUploadField]);
    const setUploading = useCallback((v: boolean) => setUploadField('uploading', v), [setUploadField]);
    const setSelectedFile = useCallback((v: File | null) => setUploadField('selectedFile', v), [setUploadField]);
    const setImageName = useCallback((v: string) => setUploadField('imageName', v), [setUploadField]);
    const setSnackbarOpen = useCallback((v: boolean) => setUploadField('snackbarOpen', v), [setUploadField]);
    const setSnackbarMessage = useCallback((v: string) => setUploadField('snackbarMessage', v), [setUploadField]);

    // Bucketed state: directories/tabs (8 fields)
    interface DirectoryState {
        gridExtractorOpen: boolean;
        gridExtractorType: 'profile' | 'banner';
        activeTab: 'content' | 'directories';
        selectedContentType: ContentType;
        directories: ContentDirectory[];
        directoryDialogOpen: boolean;
        newDirectory: ContentDirectory;
        scanningDirectory: string | null;
    }
    const [directoryState, setDirectoryState] = useState<DirectoryState>({
        gridExtractorOpen: false,
        gridExtractorType: 'profile',
        activeTab: 'content',
        selectedContentType: 'all',
        directories: [],
        directoryDialogOpen: false,
        newDirectory: { path: '', contentType: 'avatar', enabled: true, description: '' },
        scanningDirectory: null,
    });
    const setDirectoryField = useCallback(<K extends keyof DirectoryState>(key: K, value: DirectoryState[K]) => {
        setDirectoryState(prev => ({ ...prev, [key]: value }));
    }, []);
    const { gridExtractorOpen, gridExtractorType, activeTab, selectedContentType, directories, directoryDialogOpen, newDirectory, scanningDirectory } = directoryState;
    const setGridExtractorOpen = useCallback((v: boolean) => setDirectoryField('gridExtractorOpen', v), [setDirectoryField]);
    const setGridExtractorType = useCallback((v: 'profile' | 'banner') => setDirectoryField('gridExtractorType', v), [setDirectoryField]);
    const setActiveTab = useCallback((v: 'content' | 'directories') => setDirectoryField('activeTab', v), [setDirectoryField]);
    const setSelectedContentType = useCallback((v: ContentType) => setDirectoryField('selectedContentType', v), [setDirectoryField]);
    const setDirectories = useCallback((v: ContentDirectory[]) => setDirectoryField('directories', v), [setDirectoryField]);
    const setDirectoryDialogOpen = useCallback((v: boolean) => setDirectoryField('directoryDialogOpen', v), [setDirectoryField]);
    const setNewDirectory = useCallback((v: ContentDirectory) => setDirectoryField('newDirectory', v), [setDirectoryField]);
    const setScanningDirectory = useCallback((v: string | null) => setDirectoryField('scanningDirectory', v), [setDirectoryField]);

    useEffect(() => {
        if (isSuperAdmin()) {
            fetchGlobalImages();
            fetchDirectories();
        }
    }, [isSuperAdmin]);

    const fetchGlobalImages = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await adminAPI.globalImages.getAll();
            // Ensure response is always an array
            const images = Array.isArray(response) ? response : [];
            setGlobalImages(images);
        } catch (err: any) {
            setError(err.message || 'Failed to load global images');
            setGlobalImages([]); // Ensure empty array on error
        } finally {
            setLoading(false);
        }
    };

    const fetchDirectories = async () => {
        try {
            const response = await adminAPI.globalImages.getDirectories?.() || [];
            setDirectories(Array.isArray(response) ? response : []);
        } catch (err: any) {
            console.error('Failed to load directories:', err);
            setDirectories([]);
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate file type based on content type
            const allowedTypes: Record<ContentType, string[]> = {
                avatar: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
                banner: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
                profile: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
                gif: ['image/gif'],
                emoji: ['image/png', 'image/gif', 'image/svg+xml', 'image/webp'],
                all: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
            };

            const allowed = allowedTypes[uploadType] || allowedTypes.all;
            if (!allowed.includes(file.type)) {
                setError(`Invalid file type for ${uploadType}. Allowed: ${allowed.join(', ')}`);
                return;
            }

            // Validate file size (10MB limit for gifs, 5MB for others)
            const maxSize = uploadType === 'gif' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
            if (file.size > maxSize) {
                setError(`File size must be less than ${maxSize / 1024 / 1024}MB`);
                return;
            }

            setSelectedFile(file);
            setImageName(file.name.replace(/\.[^/.]+$/, '')); // Remove extension
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !imageName.trim()) {
            setError('Please select a file and enter a name');
            return;
        }

        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('image', selectedFile);
            formData.append('name', imageName);
            formData.append('type', uploadType === 'all' ? 'avatar' : uploadType);

            const response = await adminAPI.globalImages.upload(formData);

            if (response.success) {
                setGlobalImages(prev => Array.isArray(prev) ? [...prev, response.data.image] : [response.data.image]);
                setUploadDialogOpen(false);
                setSelectedFile(null);
                setImageName('');
                setUploadType('profile');
            } else {
                throw new Error(response.message || 'Upload failed');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to upload image');
            console.error('Error uploading image:', err);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (image: GlobalImage) => {
        const imageType = image.source === 'user' ? 'auto-detected' : 'global';
        if (!confirm(`Are you sure you want to delete this ${imageType} image?`)) {
            return;
        }

        try {
            const response = await adminAPI.globalImages.update(Number(image.id), { action: 'delete' });

            if (response.success) {
                setGlobalImages(prev => Array.isArray(prev) ? prev.filter(img => img.id !== image.id) : []);
            } else {
                throw new Error('Failed to delete image');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to delete image');
            console.error('Error deleting image:', err);
        }
    };

    const getImageRequirements = (type: ContentType) => {
        const requirements: Record<ContentType, string> = {
            avatar: 'Recommended: 200x200 pixels, JPG, PNG, GIF, or WebP files',
            banner: 'Recommended: 1200x300 pixels, JPG, PNG, GIF, or WebP files',
            profile: 'Recommended: 200x200 pixels, JPG, PNG, or GIF files',
            gif: 'Animated GIF files, up to 10MB',
            emoji: 'PNG, GIF, SVG, or WebP files, typically 32x32 to 128x128 pixels',
            all: 'Various image formats supported'
        };
        return requirements[type] || requirements.avatar;
    };

    const handleAddDirectory = async () => {
        if (!newDirectory.path.trim()) {
            setError('Please enter a directory path');
            return;
        }

        try {
            const response = await adminAPI.globalImages.addDirectory?.(newDirectory);
            if (response?.success) {
                await fetchDirectories();
                setDirectoryDialogOpen(false);
                setNewDirectory({ path: '', contentType: 'avatar', enabled: true, description: '' });
                setSnackbarMessage('Directory added successfully');
                setSnackbarOpen(true);
            } else {
                throw new Error(response?.message || 'Failed to add directory');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to add directory');
        }
    };

    const handleScanDirectory = async (directory: ContentDirectory) => {
        setScanningDirectory(directory.path);
        try {
            const response = await adminAPI.globalImages.scanDirectory?.(directory.path);
            if (response?.success) {
                await fetchGlobalImages();
                await fetchDirectories();
                setSnackbarMessage(`Scanned ${response.data?.count || 0} files from directory`);
                setSnackbarOpen(true);
            } else {
                throw new Error(response?.message || 'Failed to scan directory');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to scan directory');
        } finally {
            setScanningDirectory(null);
        }
    };

    const handleDeleteDirectory = async (directory: ContentDirectory) => {
        if (!confirm(`Are you sure you want to remove the directory "${directory.path}"?`)) {
            return;
        }

        try {
            const response = await adminAPI.globalImages.deleteDirectory?.(directory.path);
            if (response?.success) {
                await fetchDirectories();
                setSnackbarMessage('Directory removed successfully');
                setSnackbarOpen(true);
            } else {
                throw new Error(response?.message || 'Failed to remove directory');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to remove directory');
        }
    };

    const handleToggleDirectory = async (directory: ContentDirectory) => {
        try {
            const updated = { ...directory, enabled: !directory.enabled };
            const response = await adminAPI.globalImages.updateDirectory?.(directory.path, updated);
            if (response?.success) {
                await fetchDirectories();
            } else {
                throw new Error(response?.message || 'Failed to update directory');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to update directory');
        }
    };

    const getContentTypeIcon = (type: ContentType) => {
        switch (type) {
            case 'avatar':
            case 'profile':
                return <IconBrandGravatar size={20} />;
            case 'emoji':
                return <IconMoodSmile size={20} />;
            default:
                return <IconPhoto size={20} />;
        }
    };

    const filteredImages = selectedContentType === 'all' 
        ? globalImages 
        : globalImages.filter(img => img.type === selectedContentType);

  const handleImagesExtracted = async (images: any[], type: 'profile' | 'banner') => {
    setUploading(true);
    setError(null);

    try {
      // Images are already saved by the ImageGridExtractor component
      // Just refresh the global images list to show the new images
      await fetchGlobalImages();
      
      setSnackbarMessage(`Successfully extracted and saved ${images.length} ${type} images`);
      setSnackbarOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh images list');
    } finally {
      setUploading(false);
    }
  };

    if (!isSuperAdmin()) {
        return (
            <Alert severity="error">
                Access denied. Only super administrators can manage global content.
            </Alert>
        );
    }

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                Global Content Management
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
                Manage publicly available content including avatars, banners, GIFs, and emojis.
                You can upload individual files, specify directories for automatic scanning, or extract images from grids.
                All content is made available to users for their profiles and communications.
            </Alert>

            <Tabs 
                value={activeTab} 
                onChange={(_, newValue) => setActiveTab(newValue)}
                sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            >
                <Tab label="Content Library" value="content" />
                <Tab label="Directory Management" value="directories" />
            </Tabs>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} action={
                    <Button color="inherit" size="small" onClick={() => {
                        setError(null);
                        if (activeTab === 'content') fetchGlobalImages();
                        else fetchDirectories();
                    }}>
                        Dismiss
                    </Button>
                }>
                    {error}
                </Alert>
            )}

            {activeTab === 'content' && (
                <>
                    <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap">
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Filter by Type</InputLabel>
                            <Select
                                value={selectedContentType}
                                label="Filter by Type"
                                onChange={(e) => setSelectedContentType(e.target.value as ContentType)}
                                startAdornment={<IconFilter size={16} style={{ marginRight: 8 }} />}
                            >
                                <MenuItem value="all">All Types</MenuItem>
                                <MenuItem value="avatar">Avatars</MenuItem>
                                <MenuItem value="banner">Banners</MenuItem>
                                <MenuItem value="profile">Profiles</MenuItem>
                                <MenuItem value="gif">GIFs</MenuItem>
                                <MenuItem value="emoji">Emojis</MenuItem>
                            </Select>
                        </FormControl>
                        
                        <Button
                            variant="contained"
                            startIcon={<IconUpload />}
                            onClick={() => {
                                setUploadType('avatar');
                                setUploadDialogOpen(true);
                            }}
                        >
                            Upload Avatar
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<IconUpload />}
                            onClick={() => {
                                setUploadType('banner');
                                setUploadDialogOpen(true);
                            }}
                        >
                            Upload Banner
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<IconUpload />}
                            onClick={() => {
                                setUploadType('gif');
                                setUploadDialogOpen(true);
                            }}
                        >
                            Upload GIF
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<IconUpload />}
                            onClick={() => {
                                setUploadType('emoji');
                                setUploadDialogOpen(true);
                            }}
                        >
                            Upload Emoji
                        </Button>
                    </Stack>
                </>
            )}

            {activeTab === 'directories' && (
                <>
                    <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                        <Button
                            variant="contained"
                            startIcon={<IconFolderPlus />}
                            onClick={() => setDirectoryDialogOpen(true)}
                        >
                            Add Content Directory
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<IconRefresh />}
                            onClick={fetchDirectories}
                        >
                            Refresh Directories
                        </Button>
                    </Stack>

                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        {directories.map((dir) => (
                            <Grid item xs={12} md={6} key={dir.path}>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Stack spacing={2}>
                                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <IconFolder size={20} />
                                                    <Typography variant="h6" noWrap sx={{ flex: 1 }}>
                                                        {dir.path}
                                                    </Typography>
                                                </Box>
                                                <Chip 
                                                    label={dir.enabled ? 'Enabled' : 'Disabled'} 
                                                    color={dir.enabled ? 'success' : 'default'}
                                                    size="small"
                                                    onClick={() => handleToggleDirectory(dir)}
                                                />
                                            </Box>
                                            
                                            <Box>
                                                <Chip 
                                                    label={dir.contentType} 
                                                    size="small" 
                                                    color="primary"
                                                    sx={{ mr: 1 }}
                                                />
                                                {dir.fileCount !== undefined && (
                                                    <Chip 
                                                        label={`${dir.fileCount} files`} 
                                                        size="small" 
                                                        variant="outlined"
                                                    />
                                                )}
                                            </Box>

                                            {dir.description && (
                                                <Typography variant="body2" color="text.secondary">
                                                    {dir.description}
                                                </Typography>
                                            )}

                                            {dir.lastScanned && (
                                                <Typography variant="body2" color="text.secondary">
                                                    Last scanned: {new Date(dir.lastScanned).toLocaleString()}
                                                </Typography>
                                            )}

                                            <Stack direction="row" spacing={1}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={scanningDirectory === dir.path ? <CircularProgress size={16} /> : <IconRefresh size={16} />}
                                                    onClick={() => handleScanDirectory(dir)}
                                                    disabled={scanningDirectory === dir.path || !dir.enabled}
                                                >
                                                    Scan Directory
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="error"
                                                    startIcon={<IconTrash size={16} />}
                                                    onClick={() => handleDeleteDirectory(dir)}
                                                >
                                                    Remove
                                                </Button>
                                            </Stack>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}

                        {directories.length === 0 && (
                            <Grid item xs={12}>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Box display="flex" flexDirection="column" alignItems="center" py={4}>
                                            <IconFolder size={48} style={{ color: '#ccc', marginBottom: 16 }} />
                                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                                No Directories Configured
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
                                                Add directories containing publicly usable content (avatars, banners, GIFs, emojis) for automatic scanning.
                                            </Typography>
                                            <Button
                                                variant="contained"
                                                startIcon={<IconFolderPlus />}
                                                onClick={() => setDirectoryDialogOpen(true)}
                                            >
                                                Add Directory
                                            </Button>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}
                    </Grid>
                </>
            )}

            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                <Button
                    variant="outlined"
                    startIcon={<IconLayoutGrid />}
                    onClick={() => {
                        setGridExtractorType('profile');
                        setGridExtractorOpen(true);
                    }}
                >
                    Extract & Save Profile Images from Grid
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<IconLayoutGrid />}
                    onClick={() => {
                        setGridExtractorType('banner');
                        setGridExtractorOpen(true);
                    }}
                >
                    Extract & Save Banner Images from Grid
                </Button>
            </Stack>

            {activeTab === 'content' && (
                <>
                    {loading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                            <CircularProgress />
                            <Typography variant="body2" sx={{ ml: 2 }}>
                                Loading content...
                            </Typography>
                        </Box>
                    ) : (
                        <Grid container spacing={3}>
                            {Array.isArray(filteredImages) && filteredImages.map((image) => (
                        <Grid item xs={12} sm={6} md={4} key={image.id}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Box display="flex" alignItems="center" mb={2}>
                                        {getContentTypeIcon(image.type)}
                                        <Typography variant="h6" noWrap sx={{ ml: 1 }}>
                                            {image.name}
                                        </Typography>
                                    </Box>
                                    
                                    {image.directory && (
                                        <Chip 
                                            label={`From: ${image.directory}`} 
                                            size="small" 
                                            color="info"
                                            variant="outlined"
                                            sx={{ mb: 1 }}
                                        />
                                    )}
                                    
                                    <Box 
                                        sx={{ 
                                            width: '100%', 
                                            height: image.type === 'profile' ? 120 : 80,
                                            backgroundImage: `url(${image.url})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            borderRadius: 1,
                                            mb: 2,
                                            border: '1px solid #e0e0e0'
                                        }}
                                    />
                                    
                                    <Stack spacing={1}>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            <Chip 
                                                label={image.type === 'profile' ? 'Profile' : 'Banner'} 
                                                size="small" 
                                                color={image.type === 'profile' ? 'primary' : 'secondary'}
                                            />
                                            <Chip 
                                                label={image.source === 'user' ? 'Auto-Detected' : 'Global'} 
                                                size="small" 
                                                color={image.source === 'user' ? 'warning' : 'success'}
                                                variant="outlined"
                                            />
                                        </Box>
                                        <Typography variant="body2" color="text.secondary">
                                            Size: {image.size}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Uploaded: {new Date(image.uploadedAt).toLocaleDateString()}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            By: {image.uploadedBy}
                                        </Typography>
                                    </Stack>
                                    
                                    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                                        <Tooltip title="Preview">
                                            <IconButton 
                                                size="small" 
                                                onClick={() => window.open(image.url, '_blank')}
                                            >
                                                <IconEye size={16} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Download">
                                            <IconButton 
                                                size="small" 
                                                onClick={() => window.open(image.url, '_blank')}
                                            >
                                                <IconDownload size={16} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton 
                                                size="small" 
                                                color="error"
                                                onClick={() => handleDelete(image)}
                                            >
                                                <IconTrash size={16} />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                    
                            {Array.isArray(filteredImages) && filteredImages.length === 0 && (
                                <Grid item xs={12}>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Box display="flex" flexDirection="column" alignItems="center" py={4}>
                                                <IconPhoto size={48} style={{ color: '#ccc', marginBottom: 16 }} />
                                                <Typography variant="h6" color="text.secondary" gutterBottom>
                                                    {selectedContentType === 'all' ? 'No Content Available' : `No ${selectedContentType} content`}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
                                                    {selectedContentType === 'all' 
                                                        ? 'Upload content or configure directories to make assets available to all users.'
                                                        : `Upload ${selectedContentType} content or scan directories to add ${selectedContentType} files.`
                                                    }
                                                </Typography>
                                                <Button
                                                    variant="contained"
                                                    startIcon={<IconUpload />}
                                                    onClick={() => {
                                                        setUploadType(selectedContentType === 'all' ? 'avatar' : selectedContentType);
                                                        setUploadDialogOpen(true);
                                                    }}
                                                >
                                                    Upload {selectedContentType === 'all' ? 'Content' : selectedContentType.charAt(0).toUpperCase() + selectedContentType.slice(1)}
                                                </Button>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            )}
                        </Grid>
                    )}
                </>
            )}

            {/* Upload Dialog */}
            <Dialog 
                open={uploadDialogOpen} 
                onClose={() => setUploadDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    Upload {uploadType.charAt(0).toUpperCase() + uploadType.slice(1)} Content
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <Alert severity="info">
                            Requirements: {getImageRequirements(uploadType)}
                        </Alert>
                        
                        <TextField
                            label="Content Name"
                            value={imageName}
                            onChange={(e) => setImageName(e.target.value)}
                            fullWidth
                            placeholder={`Enter a name for this ${uploadType}`}
                        />
                        
                        <Box>
                            <input
                                accept={uploadType === 'gif' ? 'image/gif' : uploadType === 'emoji' ? 'image/png,image/gif,image/svg+xml,image/webp' : 'image/jpeg,image/png,image/gif,image/webp'}
                                style={{ display: 'none' }}
                                id="global-content-upload"
                                type="file"
                                onChange={handleFileSelect}
                            />
                            <label htmlFor="global-content-upload">
                                <Button
                                    variant="outlined"
                                    component="span"
                                    startIcon={<IconUpload />}
                                    fullWidth
                                >
                                    Select File
                                </Button>
                            </label>
                            {selectedFile && (
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                                </Typography>
                            )}
                        </Box>
                        
                        {error && (
                            <Alert severity="error">
                                {error}
                            </Alert>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setUploadDialogOpen(false);
                        setSelectedFile(null);
                        setImageName('');
                        setError(null);
                    }}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleUpload} 
                        variant="contained"
                        disabled={!selectedFile || !imageName.trim() || uploading}
                        startIcon={uploading ? <CircularProgress size={16} /> : <IconUpload />}
                    >
                        {uploading ? 'Uploading...' : 'Upload'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Directory Management Dialog */}
            <Dialog 
                open={directoryDialogOpen} 
                onClose={() => {
                    setDirectoryDialogOpen(false);
                    setNewDirectory({ path: '', contentType: 'avatar', enabled: true, description: '' });
                    setError(null);
                }}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    Add Content Directory
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <Alert severity="info">
                            Specify a directory path on the server that contains publicly usable content.
                            The system will scan this directory and make all valid files available to users.
                        </Alert>
                        
                        <TextField
                            label="Directory Path"
                            value={newDirectory.path}
                            onChange={(e) => setNewDirectory({ ...newDirectory, path: e.target.value })}
                            fullWidth
                            placeholder="/path/to/content/directory"
                            required
                            helperText="Absolute path to the directory on the server"
                        />
                        
                        <FormControl fullWidth>
                            <InputLabel>Content Type</InputLabel>
                            <Select
                                value={newDirectory.contentType}
                                label="Content Type"
                                onChange={(e) => setNewDirectory({ ...newDirectory, contentType: e.target.value as ContentType })}
                            >
                                <MenuItem value="avatar">Avatars</MenuItem>
                                <MenuItem value="banner">Banners</MenuItem>
                                <MenuItem value="profile">Profile Images</MenuItem>
                                <MenuItem value="gif">GIFs</MenuItem>
                                <MenuItem value="emoji">Emojis</MenuItem>
                            </Select>
                        </FormControl>
                        
                        <TextField
                            label="Description (Optional)"
                            value={newDirectory.description || ''}
                            onChange={(e) => setNewDirectory({ ...newDirectory, description: e.target.value })}
                            fullWidth
                            multiline
                            rows={2}
                            placeholder="Brief description of this directory's contents"
                        />
                        
                        {error && (
                            <Alert severity="error">
                                {error}
                            </Alert>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setDirectoryDialogOpen(false);
                        setNewDirectory({ path: '', contentType: 'avatar', enabled: true, description: '' });
                        setError(null);
                    }}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleAddDirectory} 
                        variant="contained"
                        disabled={!newDirectory.path.trim()}
                        startIcon={<IconFolderPlus />}
                    >
                        Add Directory
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Image Grid Extractor */}
            <ImageGridExtractor
                open={gridExtractorOpen}
                onClose={() => setGridExtractorOpen(false)}
                onImagesExtracted={handleImagesExtracted}
                type={gridExtractorType}
            />

            {/* Success Snackbar */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={12000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: 'center', horizontal: 'center' }}
                sx={{
                  position: 'fixed',
                  top: '50% !important',
                  left: '50% !important',
                  transform: 'translate(-50%, -50%) !important',
                  zIndex: 10000,
                  '& .MuiSnackbar-root': {
                    position: 'fixed',
                    top: '50% !important',
                    left: '50% !important',
                    transform: 'translate(-50%, -50%) !important',
                  }
                }}
            >
                <Alert 
                  severity="success" 
                  onClose={() => setSnackbarOpen(false)}
                  sx={{ 
                    minWidth: '400px',
                    maxWidth: '600px',
                    fontSize: '1.1rem',
                    padding: '16px 20px',
                    '& .MuiAlert-message': {
                      fontSize: '1.1rem',
                      fontWeight: 500,
                    },
                    '& .MuiAlert-icon': {
                      fontSize: '28px',
                    }
                  }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ContentSettings; 