import React from 'react';
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  IconPhoto,
  IconEdit,
  IconArrowsExchange,
  IconTrash,
} from '@tabler/icons-react';
import type { GalleryImage } from './types';

interface ColumnFactoryParams {
  checkingUsage: boolean;
  deleting: boolean;
  selectedDirectory: string;
  handleImageClick: (image: GalleryImage) => void;
  setItemToMove: (image: GalleryImage | null) => void;
  setNewName: (name: string) => void;
  setRenameDialogOpen: (open: boolean) => void;
  setTargetDir: (dir: string) => void;
  setMoveDialogOpen: (open: boolean) => void;
  handleDeleteImage: (image: GalleryImage) => Promise<void>;
}

export const createColumns = ({
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
}: ColumnFactoryParams): GridColDef[] => [
  {
    field: 'name',
    headerName: 'Image Name',
    flex: 1,
    minWidth: 200,
    renderCell: (params: GridRenderCellParams) => {
      if (!params || !params.row) {
        return <Typography variant="body2">Unknown</Typography>;
      }
      const image = params.row as GalleryImage;
      if (!image) {
        return <Typography variant="body2">Unknown</Typography>;
      }
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
          <Box
            component="img"
            src={image.url || '/images/incode/placeholder.png'}
            alt={image.name || 'Unknown'}
            sx={{
              width: 40,
              height: 40,
              objectFit: 'cover',
              imageOrientation: 'from-image',
              transform: 'none',
              borderRadius: 1,
              cursor: 'pointer',
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/images/incode/placeholder.png';
            }}
            onClick={() => handleImageClick(image)}
          />
          <Typography
            variant="body2"
            sx={{ cursor: 'pointer', color: 'primary.main' }}
            onClick={() => handleImageClick(image)}
          >
            {params.value || 'Unknown'}
          </Typography>
        </Box>
      );
    },
  },
  {
    field: 'path',
    headerName: 'Image Location',
    flex: 2,
    minWidth: 250,
  },
  {
    field: 'modified',
    headerName: 'Date Modified',
    flex: 1,
    minWidth: 180,
    valueGetter: (value: any, row: GalleryImage) => {
      if (!row) return null;
      const dateStr = row.modified || row.created;
      return dateStr || null;
    },
    valueFormatter: (value: any, row?: any) => {
      const dateValue = value?.value !== undefined ? value.value : value;
      const imageRow = row?.row || row;
      if (imageRow && imageRow.metadataError) {
        return 'Error';
      }
      if (!dateValue || dateValue === '') {
        return 'Unknown';
      }
      try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) {
          return 'Unknown';
        }
        return date.toLocaleString();
      } catch (e) {
        return 'Unknown';
      }
    },
    renderCell: (params: GridRenderCellParams) => {
      if (!params || !params.row) {
        return <Typography variant="body2">Unknown</Typography>;
      }
      const image = params.row as GalleryImage;
      if (!image) {
        return <Typography variant="body2">Unknown</Typography>;
      }
      if (image.metadataError) {
        return (
          <Tooltip title={image.metadataError} arrow>
            <Typography variant="body2" color="error">Error</Typography>
          </Tooltip>
        );
      }
      const dateStr = image.modified || image.created;
      if (!dateStr) {
        return <Typography variant="body2">Unknown</Typography>;
      }
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          return <Typography variant="body2">Unknown</Typography>;
        }
        return <Typography variant="body2">{date.toLocaleString()}</Typography>;
      } catch (e) {
        return <Typography variant="body2">Unknown</Typography>;
      }
    },
  },
  {
    field: 'isUsed',
    headerName: 'Usage Status',
    width: 130,
    valueGetter: (value: any, row: GalleryImage) => {
      if (!row || row.isUsed === undefined) return 'Unknown';
      return row.isUsed ? 'Used' : 'Not Used';
    },
    renderCell: (params: GridRenderCellParams) => {
      if (!params || !params.row) {
        return <Chip label="Unknown" size="small" variant="outlined" />;
      }
      const image = params.row as GalleryImage;
      if (!image) {
        return <Chip label="Unknown" size="small" variant="outlined" />;
      }
      if (image.isUsed === undefined && checkingUsage) {
        return <Chip label="Checking..." size="small" variant="outlined" />;
      }
      if (image.isUsed === undefined) {
        return <Chip label="Not Checked" size="small" variant="outlined" color="default" />;
      }
      return (
        <Chip
          label={image.isUsed ? 'Used' : 'Not Used'}
          size="small"
          sx={{
            backgroundColor: image.isUsed ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
            color: image.isUsed ? 'success.main' : 'error.main',
            fontWeight: 600,
          }}
        />
      );
    },
  },
  {
    field: 'type',
    headerName: 'File Type',
    width: 120,
  },
  {
    field: 'size',
    headerName: 'File Size',
    width: 120,
    valueGetter: (value: any, row: GalleryImage) => {
      if (!row) return null;
      const size = row.size;
      return size !== undefined && size !== null ? size : null;
    },
    valueFormatter: (value: any, row?: any) => {
      const sizeValue = value?.value !== undefined ? value.value : value;
      if (sizeValue === undefined || sizeValue === null) {
        return 'Unknown';
      }
      const numValue = typeof sizeValue === 'number' ? sizeValue : Number(sizeValue);
      if (isNaN(numValue) || numValue < 0) {
        return 'Unknown';
      }
      if (numValue === 0) return '0 KB';
      const sizeKB = numValue / 1024;
      if (sizeKB < 1024) {
        return `${sizeKB.toFixed(2)} KB`;
      }
      return `${(sizeKB / 1024).toFixed(2)} MB`;
    },
  },
  {
    field: 'actions',
    headerName: 'Actions',
    width: 200,
    sortable: false,
    filterable: false,
    renderCell: (params: GridRenderCellParams) => {
      if (!params || !params.row) {
        return null;
      }
      const image = params.row as GalleryImage;
      if (!image) {
        return null;
      }
      return (
        <Stack direction="row" spacing={1}>
          <IconButton
            size="small"
            onClick={() => handleImageClick(image)}
            title="View"
          >
            <IconPhoto size={18} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              setItemToMove(image);
              setNewName(image.name);
              setRenameDialogOpen(true);
            }}
            title="Rename"
          >
            <IconEdit size={18} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              setItemToMove(image);
              setTargetDir(selectedDirectory);
              setMoveDialogOpen(true);
            }}
            title="Move"
          >
            <IconArrowsExchange size={18} />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDeleteImage(image)}
            disabled={deleting}
            title="Delete"
          >
            <IconTrash size={18} />
          </IconButton>
        </Stack>
      );
    },
  },
];
