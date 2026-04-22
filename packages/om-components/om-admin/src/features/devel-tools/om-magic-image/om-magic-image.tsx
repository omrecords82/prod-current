import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  Alert,
  CircularProgress,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Divider,
  ListSubheader,
} from '@mui/material';
import {
  IconCloudUpload,
  IconDownload,
  IconPhoto,
  IconSettings,
  IconWand,
} from '@tabler/icons-react';
import { styled } from '@mui/material/styles';

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

interface ExtractedImage {
  id: number;
  blob: Blob;
  url: string;
  width: number;
  height: number;
}

type SplitMode = 'auto' | 'grid' | 'detect';
type AspectRatioMode = 'maintain' | 'stretch' | 'crop';

interface SizePreset {
  label: string;
  category: string;
  width: number;
  height: number;
}

const SIZE_PRESETS: SizePreset[] = [
  // Hero / Banner Images
  { label: 'Hero - 1920 × 1080', category: 'Hero / Banner', width: 1920, height: 1080 },
  { label: 'Hero - 1920 × 1200', category: 'Hero / Banner', width: 1920, height: 1200 },
  { label: 'Hero - 1600 × 900', category: 'Hero / Banner', width: 1600, height: 900 },
  // Section Images
  { label: 'Section - 1200 × 800', category: 'Section Images', width: 1200, height: 800 },
  { label: 'Section - 1000 × 600', category: 'Section Images', width: 1000, height: 600 },
  // Thumbnails
  { label: 'Thumbnail - 400 × 400', category: 'Thumbnails', width: 400, height: 400 },
  { label: 'Thumbnail - 300 × 300', category: 'Thumbnails', width: 300, height: 300 },
  // Icons
  { label: 'Icon - 128 × 128', category: 'Icons', width: 128, height: 128 },
  { label: 'Icon - 64 × 64', category: 'Icons', width: 64, height: 64 },
  // Avatars
  { label: 'Avatar - 512 × 512', category: 'Avatars', width: 512, height: 512 },
  { label: 'Avatar - 256 × 256', category: 'Avatars', width: 256, height: 256 },
  { label: 'Avatar - 200 × 200', category: 'Avatars', width: 200, height: 200 },
  { label: 'Avatar - 180 × 180', category: 'Avatars', width: 180, height: 180 },
  { label: 'Avatar - 120 × 120', category: 'Avatars', width: 120, height: 120 },
  // Social Media - Facebook
  { label: 'Facebook Profile - 170 × 170', category: 'Social Media', width: 170, height: 170 },
  { label: 'Facebook Cover - 820 × 312', category: 'Social Media', width: 820, height: 312 },
  // Social Media - Instagram
  { label: 'Instagram Profile - 320 × 320', category: 'Social Media', width: 320, height: 320 },
  { label: 'Instagram Post - 1080 × 1080', category: 'Social Media', width: 1080, height: 1080 },
  // Social Media - Twitter/X
  { label: 'Twitter Profile - 400 × 400', category: 'Social Media', width: 400, height: 400 },
  { label: 'Twitter Header - 1500 × 500', category: 'Social Media', width: 1500, height: 500 },
  // Social Media - YouTube
  { label: 'YouTube Banner - 2560 × 1440', category: 'Social Media', width: 2560, height: 1440 },
  { label: 'YouTube Thumbnail - 1280 × 720', category: 'Social Media', width: 1280, height: 720 },
  // App / UI
  { label: 'App Icon - 1024 × 1024', category: 'App / UI', width: 1024, height: 1024 },
  { label: 'UI Element - 96 × 96', category: 'App / UI', width: 96, height: 96 },
  { label: 'UI Element - 48 × 48', category: 'App / UI', width: 48, height: 48 },
  // Print
  { label: 'Print Letter - 2550 × 3300', category: 'Print', width: 2550, height: 3300 },
  { label: 'Business Card - 1050 × 600', category: 'Print', width: 1050, height: 600 },
];

const OMMagicImage: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [extractedImages, setExtractedImages] = useState<ExtractedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState<SplitMode>('auto');
  const [gridRows, setGridRows] = useState<number>(3);
  const [gridCols, setGridCols] = useState<number>(3);
  const [sensitivity, setSensitivity] = useState<number>(50);
  const [sizePreset, setSizePreset] = useState<string>('original');
  const [customWidth, setCustomWidth] = useState<number>(200);
  const [customHeight, setCustomHeight] = useState<number>(200);
  const [aspectRatioMode, setAspectRatioMode] = useState<AspectRatioMode>('maintain');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceImageRef = useRef<HTMLImageElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset states
    setExtractedImages([]);
    setError(null);
    setSourceFile(file);

    // Create URL for the uploaded image
    const imageUrl = URL.createObjectURL(file);
    setSourceImage(imageUrl);
  };

  const detectImageRegions = useCallback((imageData: ImageData, width: number, height: number): Array<{x: number, y: number, w: number, h: number}> => {
    const regions: Array<{x: number, y: number, w: number, h: number}> = [];
    const data = imageData.data;
    const threshold = (sensitivity / 100) * 255;
    const visited = new Set<string>();

    // Simple edge detection and region finding
    // This is a basic implementation - can be enhanced with more sophisticated algorithms
    const isEdge = (x: number, y: number): boolean => {
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) return true;
      
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      
      // Check if this pixel is significantly different from neighbors
      const neighbors = [
        {x: x - 1, y}, {x: x + 1, y}, {x, y: y - 1}, {x, y: y + 1}
      ];
      
      for (const n of neighbors) {
        if (n.x < 0 || n.x >= width || n.y < 0 || n.y >= height) continue;
        const nIdx = (n.y * width + n.x) * 4;
        const nr = data[nIdx];
        const ng = data[nIdx + 1];
        const nb = data[nIdx + 2];
        
        const diff = Math.abs(r - nr) + Math.abs(g - ng) + Math.abs(b - nb);
        if (diff > threshold) return true;
      }
      
      return false;
    };

    // Find regions by flood fill from non-edge areas
    const floodFill = (startX: number, startY: number): {x: number, y: number, w: number, h: number} | null => {
      const key = `${startX},${startY}`;
      if (visited.has(key) || isEdge(startX, startY)) return null;
      
      const stack: Array<{x: number, y: number}> = [{x: startX, y: startY}];
      const regionPixels: Array<{x: number, y: number}> = [];
      let minX = startX, maxX = startX, minY = startY, maxY = startY;
      
      while (stack.length > 0) {
        const {x, y} = stack.pop()!;
        const key = `${x},${y}`;
        
        if (visited.has(key) || x < 0 || x >= width || y < 0 || y >= height) continue;
        if (isEdge(x, y)) continue;
        
        visited.add(key);
        regionPixels.push({x, y});
        
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        
        // Add neighbors
        stack.push({x: x + 1, y}, {x: x - 1, y}, {x, y: y + 1}, {x, y: y - 1});
      }
      
      // Only return region if it's large enough
      if (regionPixels.length < 100) return null;
      
      return {
        x: minX,
        y: minY,
        w: maxX - minX + 1,
        h: maxY - minY + 1
      };
    };

    // Scan for regions
    for (let y = 10; y < height - 10; y += 20) {
      for (let x = 10; x < width - 10; x += 20) {
        const region = floodFill(x, y);
        if (region) {
          regions.push(region);
        }
      }
    }

    return regions.length > 0 ? regions : [{x: 0, y: 0, w: width, h: height}];
  }, [sensitivity]);

  const extractImages = useCallback(() => {
    if (!sourceImage || !sourceFile) {
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

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const extracted: ExtractedImage[] = [];
        let regions: Array<{x: number, y: number, w: number, h: number}> = [];

        if (splitMode === 'grid') {
          // Grid-based splitting
          const cellWidth = img.width / gridCols;
          const cellHeight = img.height / gridRows;
          
          let imageCount = 1;
          for (let row = 0; row < gridRows; row++) {
            for (let col = 0; col < gridCols; col++) {
              const sx = col * cellWidth;
              const sy = row * cellHeight;
              
              regions.push({
                x: Math.floor(sx),
                y: Math.floor(sy),
                w: Math.floor(cellWidth),
                h: Math.floor(cellHeight)
              });
            }
          }
        } else if (splitMode === 'detect') {
          // Auto-detect regions
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          regions = detectImageRegions(imageData, img.width, img.height);
        } else {
          // Auto mode: try to detect, fallback to grid
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const detected = detectImageRegions(imageData, img.width, img.height);
          
          if (detected.length > 1) {
            regions = detected;
          } else {
            // Fallback to 3x3 grid
            const cellWidth = img.width / 3;
            const cellHeight = img.height / 3;
            for (let row = 0; row < 3; row++) {
              for (let col = 0; col < 3; col++) {
                regions.push({
                  x: Math.floor(col * cellWidth),
                  y: Math.floor(row * cellHeight),
                  w: Math.floor(cellWidth),
                  h: Math.floor(cellHeight)
                });
              }
            }
          }
        }

        // Determine target dimensions
        let targetWidth: number;
        let targetHeight: number;
        
        if (sizePreset === 'original') {
          // Use original region size
          targetWidth = 0;
          targetHeight = 0;
        } else if (sizePreset === 'custom') {
          targetWidth = customWidth;
          targetHeight = customHeight;
        } else {
          const preset = SIZE_PRESETS.find(p => p.label === sizePreset);
          if (preset) {
            targetWidth = preset.width;
            targetHeight = preset.height;
          } else {
            targetWidth = 0;
            targetHeight = 0;
          }
        }

        // Extract each region
        let processedCount = 0;
        regions.forEach((region, index) => {
          const extractCanvas = document.createElement('canvas');
          let finalWidth: number;
          let finalHeight: number;
          let sourceX = 0;
          let sourceY = 0;
          let sourceW = region.w;
          let sourceH = region.h;

          if (targetWidth > 0 && targetHeight > 0) {
            // Resize to target dimensions
            if (aspectRatioMode === 'maintain') {
              // Maintain aspect ratio, fit within target dimensions
              const scale = Math.min(targetWidth / region.w, targetHeight / region.h);
              finalWidth = Math.round(region.w * scale);
              finalHeight = Math.round(region.h * scale);
            } else if (aspectRatioMode === 'crop') {
              // Crop to fill target dimensions
              finalWidth = targetWidth;
              finalHeight = targetHeight;
              const scale = Math.max(targetWidth / region.w, targetHeight / region.h);
              const scaledW = region.w * scale;
              const scaledH = region.h * scale;
              sourceX = (region.w - scaledW / scale) / 2;
              sourceY = (region.h - scaledH / scale) / 2;
              sourceW = scaledW / scale;
              sourceH = scaledH / scale;
            } else {
              // Stretch to exact dimensions
              finalWidth = targetWidth;
              finalHeight = targetHeight;
            }
          } else {
            // Use original dimensions
            finalWidth = region.w;
            finalHeight = region.h;
          }

          extractCanvas.width = finalWidth;
          extractCanvas.height = finalHeight;
          const extractCtx = extractCanvas.getContext('2d');
          
          if (!extractCtx) return;

          // Apply smoothing for better quality when resizing
          extractCtx.imageSmoothingEnabled = true;
          extractCtx.imageSmoothingQuality = 'high';

          if (aspectRatioMode === 'crop' && targetWidth > 0 && targetHeight > 0) {
            // Draw cropped region
            extractCtx.drawImage(
              canvas,
              region.x + sourceX, region.y + sourceY, sourceW, sourceH,
              0, 0, finalWidth, finalHeight
            );
          } else {
            // Draw and resize
            extractCtx.drawImage(
              canvas,
              region.x, region.y, region.w, region.h,
              0, 0, finalWidth, finalHeight
            );
          }

          extractCanvas.toBlob((blob) => {
            if (blob) {
              const imageUrl = URL.createObjectURL(blob);
              extracted.push({
                id: index + 1,
                blob,
                url: imageUrl,
                width: finalWidth,
                height: finalHeight
              });

              processedCount++;
              if (processedCount === regions.length) {
                extracted.sort((a, b) => a.id - b.id);
                setExtractedImages(extracted);
                setIsProcessing(false);
              }
            } else {
              processedCount++;
              if (processedCount === regions.length) {
                setIsProcessing(false);
              }
            }
          }, 'image/jpeg', 0.95);
        });

        if (regions.length === 0) {
          setError('No images detected. Try adjusting the sensitivity or using grid mode.');
          setIsProcessing(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setIsProcessing(false);
      }
    };

    img.onerror = () => {
      setError('Failed to load the image');
      setIsProcessing(false);
    };

    img.src = sourceImage;
  }, [sourceImage, sourceFile, splitMode, gridRows, gridCols, detectImageRegions, sizePreset, customWidth, customHeight, aspectRatioMode]);

  const downloadImage = (image: ExtractedImage) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `image${image.id}.jpg`;
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

  return (
    <Box sx={{ p: 3, maxWidth: '1400px', margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        OM Magic Image Splitter
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Upload an image file containing multiple images. The tool will automatically detect and split them into separate files.
      </Typography>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Stack spacing={3}>
          <Box>
            <Button
              component="label"
              variant="contained"
              startIcon={<IconCloudUpload />}
              disabled={isProcessing}
              sx={{ mb: 2 }}
            >
              Upload Source Image
              <VisuallyHiddenInput
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </Button>
            {sourceFile && (
              <Chip
                label={sourceFile.name}
                onDelete={() => {
                  setSourceImage(null);
                  setSourceFile(null);
                  setExtractedImages([]);
                }}
                sx={{ ml: 2 }}
              />
            )}
          </Box>

          <Box>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Split Mode</InputLabel>
              <Select
                value={splitMode}
                label="Split Mode"
                onChange={(e) => setSplitMode(e.target.value as SplitMode)}
                disabled={isProcessing}
              >
                <MenuItem value="auto">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconWand size={18} />
                    Auto (Detect or Grid)
                  </Box>
                </MenuItem>
                <MenuItem value="detect">Detect Regions</MenuItem>
                <MenuItem value="grid">Manual Grid</MenuItem>
              </Select>
            </FormControl>

            {splitMode === 'grid' && (
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <TextField
                    label="Rows"
                    type="number"
                    value={gridRows}
                    onChange={(e) => setGridRows(parseInt(e.target.value) || 1)}
                    inputProps={{ min: 1, max: 10 }}
                    fullWidth
                    disabled={isProcessing}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Columns"
                    type="number"
                    value={gridCols}
                    onChange={(e) => setGridCols(parseInt(e.target.value) || 1)}
                    inputProps={{ min: 1, max: 10 }}
                    fullWidth
                    disabled={isProcessing}
                  />
                </Grid>
              </Grid>
            )}

            {splitMode === 'detect' && (
              <Box sx={{ mb: 2 }}>
                <Typography gutterBottom>Edge Detection Sensitivity</Typography>
                <Slider
                  value={sensitivity}
                  onChange={(_, value) => setSensitivity(value as number)}
                  min={10}
                  max={90}
                  step={5}
                  marks
                  disabled={isProcessing}
                />
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <Box>
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                Output Size
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Size Preset</InputLabel>
                <Select
                  value={sizePreset}
                  label="Size Preset"
                  onChange={(e) => setSizePreset(e.target.value)}
                  disabled={isProcessing}
                >
                  <MenuItem value="original">Original Size</MenuItem>
                  <MenuItem value="custom">Custom Size</MenuItem>
                  {Object.entries(
                    SIZE_PRESETS.reduce((acc, preset) => {
                      if (!acc[preset.category]) {
                        acc[preset.category] = [];
                      }
                      acc[preset.category].push(preset);
                      return acc;
                    }, {} as Record<string, SizePreset[]>)
                  ).flatMap(([category, presets]) => [
                    <ListSubheader key={`category-${category}`} sx={{ fontWeight: 'bold' }}>
                      {category}
                    </ListSubheader>,
                    ...presets.map((preset) => (
                      <MenuItem key={preset.label} value={preset.label} sx={{ pl: 3 }}>
                        {preset.label}
                      </MenuItem>
                    ))
                  ])}
                </Select>
              </FormControl>

              {sizePreset === 'custom' && (
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <TextField
                      label="Width (px)"
                      type="number"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(parseInt(e.target.value) || 1)}
                      inputProps={{ min: 1 }}
                      fullWidth
                      disabled={isProcessing}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Height (px)"
                      type="number"
                      value={customHeight}
                      onChange={(e) => setCustomHeight(parseInt(e.target.value) || 1)}
                      inputProps={{ min: 1 }}
                      fullWidth
                      disabled={isProcessing}
                    />
                  </Grid>
                </Grid>
              )}

              {sizePreset !== 'original' && (
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Aspect Ratio Mode</InputLabel>
                  <Select
                    value={aspectRatioMode}
                    label="Aspect Ratio Mode"
                    onChange={(e) => setAspectRatioMode(e.target.value as AspectRatioMode)}
                    disabled={isProcessing}
                  >
                    <MenuItem value="maintain">Maintain Aspect Ratio (Fit)</MenuItem>
                    <MenuItem value="stretch">Stretch to Exact Size</MenuItem>
                    <MenuItem value="crop">Crop to Fill</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Box>

            <Button
              variant="contained"
              color="primary"
              onClick={extractImages}
              disabled={!sourceImage || isProcessing}
              startIcon={isProcessing ? <CircularProgress size={20} /> : <IconPhoto />}
              fullWidth
              size="large"
            >
              {isProcessing ? 'Processing...' : 'Extract Images'}
            </Button>
          </Box>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {sourceImage && (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Source Image
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              maxHeight: '400px',
              overflow: 'auto',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 2,
            }}
          >
            <img
              ref={sourceImageRef}
              src={sourceImage}
              alt="Source"
              style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
            />
          </Box>
        </Paper>
      )}

      {extractedImages.length > 0 && (
        <Paper elevation={2} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Extracted Images ({extractedImages.length})
            </Typography>
            <Button
              variant="outlined"
              startIcon={<IconDownload />}
              onClick={downloadAllImages}
            >
              Download All
            </Button>
          </Box>
          <Grid container spacing={2}>
            {extractedImages.map((image) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={image.id}>
                <Card>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: 200,
                      bgcolor: 'grey.100',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={image.url}
                      alt={`Image ${image.id}`}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  </Box>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      image{image.id}.jpg
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {image.width} × {image.height}px
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      startIcon={<IconDownload />}
                      onClick={() => downloadImage(image)}
                      fullWidth
                    >
                      Download
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </Box>
  );
};

export default OMMagicImage;

