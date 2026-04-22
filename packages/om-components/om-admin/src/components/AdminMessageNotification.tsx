import React, { useEffect, useState } from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  IconButton,
  Box,
  Typography,
} from '@mui/material';
import { IconX } from '@tabler/icons-react';
import { useWebSocket } from '@/context/WebSocketContext';

interface AdminMessage {
  type: string;
  title: string;
  message: string;
  timestamp: string;
  priority?: string;
}

const AdminMessageNotification: React.FC = () => {
  const { onAdminMessage, isConnected } = useWebSocket();
  const [message, setMessage] = useState<AdminMessage | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = onAdminMessage((adminMessage: AdminMessage) => {
      console.log('📨 Received admin message:', adminMessage);
      setMessage(adminMessage);
      setOpen(true);
    });

    return () => {
      unsubscribe();
    };
  }, [onAdminMessage, isConnected]);

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
    // Clear message after a delay to allow animation
    setTimeout(() => setMessage(null), 300);
  };

  if (!message) return null;

  return (
    <Snackbar
      open={open}
      autoHideDuration={10000} // 10 seconds
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{ mt: 8 }}
    >
      <Alert
        severity="info"
        onClose={handleClose}
        sx={{
          minWidth: 350,
          maxWidth: 500,
          '& .MuiAlert-message': {
            width: '100%',
          },
        }}
        action={
          <IconButton
            aria-label="close"
            color="inherit"
            size="small"
            onClick={handleClose}
          >
            <IconX size={18} />
          </IconButton>
        }
      >
        <AlertTitle>{message.title || 'Admin Message'}</AlertTitle>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {message.message}
        </Typography>
        {message.timestamp && (
          <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
            {new Date(message.timestamp).toLocaleString()}
          </Typography>
        )}
      </Alert>
    </Snackbar>
  );
};

export default AdminMessageNotification;

