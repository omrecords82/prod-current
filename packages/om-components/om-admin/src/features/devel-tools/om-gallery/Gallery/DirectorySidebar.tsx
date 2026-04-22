import React from 'react';
import { Box, Button, Chip, Typography } from '@mui/material';
import { IconFolder, IconFolderPlus, IconSparkles } from '@tabler/icons-react';
import { OMLoading } from '@/components/common/OMLoading';
import { CANONICAL_IMAGE_DIRECTORIES, isCanonicalDirectory } from '../../system-documentation/gallery.config';

interface DirectorySidebarProps {
  selectedDirectory: string;
  setSelectedDirectory: (dir: string) => void;
  directoryTree: any;
  loadingTree: boolean;
  onCreateDirectory: (name: string) => void;
  onGetSuggestions: () => void;
}

const renderDirectoryTree = (
  dirs: any[],
  selectedDirectory: string,
  setSelectedDirectory: (dir: string) => void,
  level: number = 0,
) => {
  const canonicalDirsToShow = CANONICAL_IMAGE_DIRECTORIES.map(dirName => {
    const existing = dirs.find(d => d.name.toLowerCase() === dirName.toLowerCase());
    if (existing) return existing;
    return {
      name: dirName,
      path: dirName,
      childrenCount: 0,
      isEmpty: true,
    };
  });

  const otherDirs = dirs.filter(d => !isCanonicalDirectory(d.name));
  const allDirs = [...canonicalDirsToShow, ...otherDirs];

  return allDirs.map((dir) => {
    const isDefault = isCanonicalDirectory(dir.name);
    const isEmpty = dir.isEmpty === true;

    return (
      <Box key={dir.path} sx={{ pl: level * 2 }}>
        <Button
          fullWidth
          startIcon={<IconFolder size={16} />}
          onClick={() => !isEmpty && setSelectedDirectory(dir.path)}
          disabled={isEmpty}
          sx={{
            justifyContent: 'flex-start',
            textTransform: 'none',
            color: isEmpty
              ? 'text.disabled'
              : selectedDirectory === dir.path
                ? '#C8A24B'
                : (isDefault ? '#1976d2' : 'inherit'),
            fontWeight: selectedDirectory === dir.path ? 'bold' : (isDefault ? '600' : 'normal'),
            backgroundColor: isEmpty
              ? 'rgba(0, 0, 0, 0.02)'
              : isDefault && selectedDirectory !== dir.path
                ? 'rgba(25, 118, 210, 0.08)'
                : 'transparent',
            border: isDefault ? '1px solid rgba(25, 118, 210, 0.2)' : 'none',
            borderRadius: isDefault ? 1 : 0,
            mb: isDefault ? 0.5 : 0,
            opacity: isEmpty ? 0.6 : 1,
            '&:hover': {
              backgroundColor: isEmpty
                ? 'rgba(0, 0, 0, 0.02)'
                : isDefault
                  ? 'rgba(25, 118, 210, 0.12)'
                  : 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          {dir.name} {isEmpty ? '(empty)' : `(${dir.childrenCount})`}
          {isDefault && (
            <Chip
              label={isEmpty ? "Empty" : "Default"}
              size="small"
              sx={{
                ml: 1,
                height: 18,
                fontSize: '0.65rem',
                backgroundColor: isEmpty
                  ? 'rgba(0, 0, 0, 0.05)'
                  : 'rgba(25, 118, 210, 0.1)',
                color: isEmpty ? 'text.disabled' : '#1976d2',
              }}
            />
          )}
        </Button>
      </Box>
    );
  });
};

const DirectorySidebar: React.FC<DirectorySidebarProps> = ({
  selectedDirectory,
  setSelectedDirectory,
  directoryTree,
  loadingTree,
  onCreateDirectory,
  onGetSuggestions,
}) => (
  <Box sx={{ width: 250, minWidth: 250, p: 2, borderRight: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
    <Typography variant="h6" sx={{ mb: 2 }}>Directories</Typography>
    <Button
      fullWidth
      startIcon={<IconFolder size={16} />}
      onClick={() => setSelectedDirectory('')}
      sx={{
        justifyContent: 'flex-start',
        textTransform: 'none',
        mb: 1,
        color: selectedDirectory === '' ? '#C8A24B' : 'inherit',
        fontWeight: selectedDirectory === '' ? 'bold' : 'normal',
      }}
    >
      Root (All Images)
    </Button>
    {loadingTree ? (
      <OMLoading size="sm" label="Loading directories" />
    ) : directoryTree.directories && directoryTree.directories.length > 0 ? (
      renderDirectoryTree(directoryTree.directories, selectedDirectory, setSelectedDirectory)
    ) : (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, p: 1 }}>
        No directories found. Images may still be available in root.
      </Typography>
    )}
    <Button
      fullWidth
      startIcon={<IconFolderPlus size={16} />}
      onClick={() => {
        const dirName = prompt('Enter directory name:');
        if (dirName) onCreateDirectory(dirName);
      }}
      sx={{ mt: 2, justifyContent: 'flex-start', textTransform: 'none' }}
    >
      New Folder
    </Button>
    <Button
      fullWidth
      startIcon={<IconSparkles size={16} />}
      onClick={onGetSuggestions}
      sx={{ mt: 1, justifyContent: 'flex-start', textTransform: 'none' }}
    >
      Catalog Suggestions
    </Button>
  </Box>
);

export default DirectorySidebar;
