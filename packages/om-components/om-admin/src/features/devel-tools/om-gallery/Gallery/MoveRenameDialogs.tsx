import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import type { GalleryImage } from './types';

interface MoveRenameDialogsProps {
  moveDialogOpen: boolean;
  renameDialogOpen: boolean;
  itemToMove: GalleryImage | null;
  targetDir: string;
  newName: string;
  setTargetDir: (val: string) => void;
  setNewName: (val: string) => void;
  onCloseMove: () => void;
  onCloseRename: () => void;
  onMove: (image: GalleryImage, targetDir: string) => void;
  onRename: (image: GalleryImage, newName: string) => void;
}

const MoveRenameDialogs: React.FC<MoveRenameDialogsProps> = ({
  moveDialogOpen,
  renameDialogOpen,
  itemToMove,
  targetDir,
  newName,
  setTargetDir,
  setNewName,
  onCloseMove,
  onCloseRename,
  onMove,
  onRename,
}) => (
  <>
    {/* Move Dialog */}
    <Dialog open={moveDialogOpen} onClose={onCloseMove}>
      <DialogTitle>Move Image</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Target Directory"
          value={targetDir}
          onChange={(e) => setTargetDir(e.target.value)}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCloseMove}>Cancel</Button>
        <Button onClick={() => itemToMove && onMove(itemToMove, targetDir)}>Move</Button>
      </DialogActions>
    </Dialog>

    {/* Rename Dialog */}
    <Dialog open={renameDialogOpen} onClose={onCloseRename}>
      <DialogTitle>Rename Image</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="New Name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCloseRename}>Cancel</Button>
        <Button onClick={() => itemToMove && onRename(itemToMove, newName)}>Rename</Button>
      </DialogActions>
    </Dialog>
  </>
);

export default MoveRenameDialogs;
