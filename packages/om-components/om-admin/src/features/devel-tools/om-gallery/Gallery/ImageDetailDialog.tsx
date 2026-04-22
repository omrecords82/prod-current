import React from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { IconX, IconTrash } from '@tabler/icons-react';
import type { GalleryImage } from './types';

interface ImageDetailDialogProps {
  open: boolean;
  onClose: () => void;
  image: GalleryImage | null;
  deleting: boolean;
  onOpenInNewWindow: (image: GalleryImage) => void;
  onDelete: (image: GalleryImage) => Promise<void>;
}

const ImageDetailDialog: React.FC<ImageDetailDialogProps> = ({
  open,
  onClose,
  image,
  deleting,
  onOpenInNewWindow,
  onDelete,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">{image?.name}</Typography>
        <IconButton onClick={onClose}>
          <IconX />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {image && (
          <Box>
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <img
                src={image.url}
                alt={image.name}
                style={{
                  maxWidth: '100%',
                  maxHeight: '400px',
                  objectFit: 'contain',
                  borderRadius: '8px',
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/incode/placeholder.png';
                }}
              />
            </Box>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Image Name</Typography>
                <Typography variant="body1">{image.name}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Image Path</Typography>
                <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>{image.path}</Typography>
              </Box>
              {image.created && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Image Created</Typography>
                  <Typography variant="body1">{new Date(image.created).toLocaleString()}</Typography>
                </Box>
              )}
              {image.type && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">File Type</Typography>
                  <Chip label={image.type.toUpperCase()} size="small" />
                </Box>
              )}
              {image.size && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">File Size</Typography>
                  <Typography variant="body1">{(image.size / 1024).toFixed(2)} KB</Typography>
                </Box>
              )}
            </Stack>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => image && onOpenInNewWindow(image)}
          variant="outlined"
        >
          Open in New Window
        </Button>
        <Button
          onClick={() => image && onDelete(image)}
          variant="contained"
          color="error"
          startIcon={<IconTrash size={18} />}
          disabled={deleting}
        >
          {deleting ? 'Deleting...' : 'Delete Image'}
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImageDetailDialog;
