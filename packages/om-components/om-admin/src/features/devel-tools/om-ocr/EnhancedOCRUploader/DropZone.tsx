import React from 'react';
import {
  Box,
  Button,
  Chip,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { IconPhoto } from '@tabler/icons-react';

interface DropZoneProps {
  dragActive: boolean;
  isUploading: boolean;
  simulationMode: boolean;
  isSimulationModeAvailable: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onDrag: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFiles: (files: FileList | null) => void;
  onLoadDemoImages: () => void;
  onSimulationModeChange: (val: boolean) => void;
}

const DropZone: React.FC<DropZoneProps> = ({
  dragActive,
  isUploading,
  simulationMode,
  isSimulationModeAvailable,
  fileInputRef,
  onDrag,
  onDrop,
  onFiles,
  onLoadDemoImages,
  onSimulationModeChange,
}) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        mb: 3,
        borderRadius: 3,
        border: '2px dashed',
        borderColor: dragActive ? 'primary.main' : alpha(theme.palette.primary.main, 0.3),
        bgcolor: dragActive ? alpha(theme.palette.primary.main, 0.05) : alpha(theme.palette.primary.main, 0.02),
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: alpha(theme.palette.primary.main, 0.05)
        }
      }}
      onDragEnter={onDrag}
      onDragLeave={onDrag}
      onDragOver={onDrag}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.tiff"
        onChange={(e) => onFiles(e.target.files)}
        style={{ display: 'none' }}
      />

      <Box
        sx={{
          width: 80,
          height: 80,
          mx: 'auto',
          mb: 2,
          borderRadius: '50%',
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <IconPhoto size={40} color={theme.palette.primary.main} />
      </Box>

      <Typography variant="h6" fontWeight={600} color="text.primary">
        Drag & drop record images here
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        or click to browse files
      </Typography>

      <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
        <Chip label="• JPG" size="small" variant="outlined" />
        <Chip label="• PNG" size="small" variant="outlined" />
        <Chip label="• TIFF" size="small" variant="outlined" />
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Max 50 files per batch • 10MB per file
      </Typography>

      {/* Demo Images and Simulation Mode (only for church 46) */}
      {isSimulationModeAvailable && (
        <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<IconPhoto />}
            onClick={(e) => { e.stopPropagation(); onLoadDemoImages(); }}
            disabled={isUploading}
            sx={{ mt: 1 }}
          >
            Load Demo Images
          </Button>
          <FormControlLabel
            control={
              <Switch
                checked={simulationMode}
                onChange={(e) => { e.stopPropagation(); onSimulationModeChange(e.target.checked); }}
                disabled={isUploading}
              />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight={500}>
                  Simulation Mode
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Use pre-validated demo OCR results
                </Typography>
              </Box>
            }
            sx={{ mt: 1 }}
            onClick={(e) => e.stopPropagation()}
          />
        </Box>
      )}
    </Paper>
  );
};

export default DropZone;
