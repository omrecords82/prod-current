/**
 * Image Grid Extractor Component
 * 
 * Allows users to upload a grid image and extract individual images
 * from it by splitting the image into a grid pattern.
 */

import React, { useState, useRef } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    Grid,
    Alert,
    CircularProgress,
    Stack,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton
} from '@mui/material';
import {
    IconUpload,
    IconDownload,
    IconLayoutGrid,
    IconPhoto,
    IconX
} from '@tabler/icons-react';

interface ExtractedImage {
    id: number;
    blob: Blob;
    url: string;
    name: string;
}

interface ImageGridExtractorProps {
    open: boolean;
    onClose: () => void;
    onImagesExtracted: (images: ExtractedImage[], type: 'profile' | 'banner') => void;
    type: 'profile' | 'banner';
}

const ImageGridExtractor: React.FC<ImageGridExtractorProps> = ({
    open,
    onClose,
    onImagesExtracted,
    type
}) => {
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [extractedImages, setExtractedImages] = useState<ExtractedImage[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [gridSize, setGridSize] = useState<{ rows: number; cols: number }>({ rows: 3, cols: 3 });
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Reset states
        setExtractedImages([]);
        setError(null);

        // Validate file type
        if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
            setError('Only JPG, PNG, or GIF files are allowed');
            return;
        }

        // Create URL for the uploaded image
        const imageUrl = URL.createObjectURL(file);
        setSourceImage(imageUrl);
    };

    const extractImages = () => {
        if (!sourceImage) {
            setError('Please upload an image first');
            return;
        }

        setIsProcessing(true);
        setError(null);

        const img = new Image();
        img.onload = () => {
            try {
                const canvas = canvasRef.current;
                if (!canvas) throw new Error('Canvas not available');

                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('Could not get canvas context');

                // Calculate image dimensions
                const imageWidth = img.width / gridSize.cols;
                const imageHeight = img.height / gridSize.rows;

                // Target size based on type
                const targetSize = type === 'profile' ? 200 : 300;
                const targetWidth = type === 'banner' ? 1200 : targetSize;
                const targetHeight = type === 'banner' ? 300 : targetSize;

                const extractedImages: ExtractedImage[] = [];

                // Extract each image
                let imageCount = 1;
                for (let row = 0; row < gridSize.rows; row++) {
                    for (let col = 0; col < gridSize.cols; col++) {
                        // Set canvas size to target dimensions
                        canvas.width = targetWidth;
                        canvas.height = targetHeight;
                        
                        // Calculate source coordinates
                        const sx = col * imageWidth;
                        const sy = row * imageHeight;
                        
                        // Draw the cropped section to the canvas, resizing to target dimensions
                        ctx.drawImage(
                            img,
                            sx, sy, imageWidth, imageHeight,
                            0, 0, targetWidth, targetHeight
                        );
                        
                        // Convert canvas to blob
                        canvas.toBlob((blob) => {
                            if (blob) {
                                const imageUrl = URL.createObjectURL(blob);
                                const imageName = `${type}_${imageCount}`;
                                
                                extractedImages.push({
                                    id: imageCount,
                                    blob,
                                    url: imageUrl,
                                    name: imageName
                                });
                                
                                // When all images are processed
                                if (extractedImages.length === gridSize.rows * gridSize.cols) {
                                    // Sort by ID to ensure correct order
                                    extractedImages.sort((a, b) => a.id - b.id);
                                    setExtractedImages(extractedImages);
                                    setIsProcessing(false);
                                }
                            }
                        }, 'image/png');
                        
                        imageCount++;
                    }
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
                setIsProcessing(false);
            }
        };

        img.onerror = () => {
            setError('Failed to load the uploaded image');
            setIsProcessing(false);
        };

        img.src = sourceImage;
    };

    const downloadImage = (image: ExtractedImage) => {
        const link = document.createElement('a');
        link.href = image.url;
        link.download = `${image.name}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadAllImages = () => {
        extractedImages.forEach((image, index) => {
            setTimeout(() => {
                downloadImage(image);
            }, index * 100);
        });
    };

    const handleUseImages = async () => {
        try {
            // Convert blobs to base64 and prepare for upload
            const imagesToUpload = [];
            
            for (const image of extractedImages) {
                const base64 = await blobToBase64(image.blob);
                imagesToUpload.push({
                    name: image.name,
                    data: base64
                });
            }
            
            // Send to server to save as individual files
            const result = await apiClient.post<any>('/admin/global-images/save-extracted', {
                images: imagesToUpload,
                type: type
            });
            console.log('✅ Extracted images saved successfully:', result);
            
            // Call the callback with the saved images
            onImagesExtracted(extractedImages, type);
            onClose();
        } catch (error) {
            console.error('Error saving extracted images:', error);
            setError(error instanceof Error ? error.message : 'Failed to save extracted images');
        }
    };

    // Helper function to convert blob to base64
    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error('Failed to convert blob to base64'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read blob'));
            reader.readAsDataURL(blob);
        });
    };

    const handleClose = () => {
        setSourceImage(null);
        setExtractedImages([]);
        setError(null);
        setIsProcessing(false);
        onClose();
    };

    const getGridSizeOptions = () => {
        const options = [
            { rows: 2, cols: 2, label: '2x2 Grid (4 images)' },
            { rows: 2, cols: 3, label: '2x3 Grid (6 images)' },
            { rows: 3, cols: 2, label: '3x2 Grid (6 images)' },
            { rows: 3, cols: 3, label: '3x3 Grid (9 images)' },
            { rows: 3, cols: 4, label: '3x4 Grid (12 images)' },
            { rows: 4, cols: 3, label: '4x3 Grid (12 images)' },
            { rows: 4, cols: 4, label: '4x4 Grid (16 images)' }
        ];
        return options;
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: { 
                    maxHeight: '90vh',
                    overflow: 'hidden'
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconLayoutGrid size={24} />
                    <Typography variant="h6">
                        Extract & Save {type === 'profile' ? 'Profile' : 'Banner'} Images from Grid
                    </Typography>
                </Box>
                <IconButton onClick={handleClose}>
                    <IconX size={20} />
                </IconButton>
            </DialogTitle>
            
            <DialogContent sx={{ overflow: 'auto' }}>
                <Stack spacing={3} sx={{ py: 2 }}>
                    <Alert severity="info">
                        Upload a grid image to extract individual {type} images. 
                        The system will automatically split the image into a grid and save each section as a separate file in the {type} directory.
                    </Alert>

                    {error && (
                        <Alert severity="error">
                            {error}
                        </Alert>
                    )}

                    {/* Grid Size Selection */}
                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Grid Size
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Select the grid layout of your image:
                            </Typography>
                            <Grid container spacing={1}>
                                {getGridSizeOptions().map((option) => (
                                    <Grid item key={`${option.rows}x${option.cols}`}>
                                        <Chip
                                            label={option.label}
                                            onClick={() => setGridSize({ rows: option.rows, cols: option.cols })}
                                            color={gridSize.rows === option.rows && gridSize.cols === option.cols ? 'primary' : 'default'}
                                            variant={gridSize.rows === option.rows && gridSize.cols === option.cols ? 'filled' : 'outlined'}
                                            sx={{ cursor: 'pointer' }}
                                        />
                                    </Grid>
                                ))}
                            </Grid>
                        </CardContent>
                    </Card>

                    {/* Image Upload */}
                    <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" gutterBottom>
                                Upload Grid Image
                            </Typography>
                            
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleImageUpload}
                            />
                            
                            <Button
                                variant="contained"
                                startIcon={<IconUpload size={18} />}
                                onClick={() => fileInputRef.current?.click()}
                                size="large"
                                sx={{ mb: 2 }}
                            >
                                Choose Grid Image
                            </Button>
                            
                            {sourceImage && (
                                <Box sx={{ mt: 2 }}>
                                    <img 
                                        src={sourceImage} 
                                        alt="Source Grid" 
                                        style={{ 
                                            maxWidth: '100%', 
                                            maxHeight: '300px',
                                            border: '1px solid #e0e0e0',
                                            borderRadius: '4px'
                                        }}
                                    />
                                </Box>
                            )}
                        </CardContent>
                    </Card>

                    {/* Extract Button */}
                    {sourceImage && (
                        <Box sx={{ textAlign: 'center' }}>
                            <Button
                                variant="contained"
                                onClick={extractImages}
                                disabled={isProcessing}
                                startIcon={isProcessing ? <CircularProgress size={20} /> : <IconLayoutGrid size={18} />}
                                size="large"
                            >
                                {isProcessing ? 'Extracting...' : `Extract ${gridSize.rows * gridSize.cols} Images`}
                            </Button>
                        </Box>
                    )}

                    {/* Extracted Images */}
                    {extractedImages.length > 0 && (
                        <Card variant="outlined">
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6">
                                        Extracted Images ({extractedImages.length})
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        startIcon={<IconDownload size={18} />}
                                        onClick={downloadAllImages}
                                        size="small"
                                    >
                                        Download All
                                    </Button>
                                </Box>
                                
                                <Grid container spacing={2}>
                                    {extractedImages.map((image) => (
                                        <Grid item xs={6} sm={4} md={3} key={image.id}>
                                            <Card variant="outlined" sx={{ textAlign: 'center' }}>
                                                <CardContent>
                                                    <img 
                                                        src={image.url} 
                                                        alt={`Extracted ${image.id}`}
                                                        style={{ 
                                                            width: '100%', 
                                                            height: 'auto',
                                                            maxHeight: '120px',
                                                            objectFit: 'cover',
                                                            borderRadius: '4px'
                                                        }}
                                                    />
                                                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                                        {image.name}
                                                    </Typography>
                                                    <Button
                                                        size="small"
                                                        onClick={() => downloadImage(image)}
                                                        sx={{ mt: 1 }}
                                                    >
                                                        Download
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                            </CardContent>
                        </Card>
                    )}

                    {/* Hidden canvas for processing */}
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose}>
                    Cancel
                </Button>
                {extractedImages.length > 0 && (
                    <Button 
                        onClick={handleUseImages} 
                        variant="contained"
                        startIcon={<IconPhoto size={18} />}
                    >
                        Use {extractedImages.length} Images
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default ImageGridExtractor;
