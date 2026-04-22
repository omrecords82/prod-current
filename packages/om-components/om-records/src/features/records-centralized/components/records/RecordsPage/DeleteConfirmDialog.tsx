import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { useLanguage } from '@/context/LanguageContext';

interface DeleteConfirmDialogProps {
  open: boolean;
  recordName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  open,
  recordName,
  onCancel,
  onConfirm,
}) => {
  const { t } = useLanguage();

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle sx={{ fontWeight: 600 }}>
        {t('records.delete_confirm_title')}
      </DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete &apos;{recordName}&apos;?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('records.delete_confirm_warning')}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onCancel} variant="outlined">
          {t('common.cancel')}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="error"
        >
          {t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmDialog;
