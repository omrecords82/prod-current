/**
 * Updates Indicator Component
 * Shows a badge in the header when system updates are available
 * Super admin only
 */

import {
  Badge,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import { IconRefresh } from '@tabler/icons-react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import UpdatesModal from './UpdatesModal';

interface UpdateStatus {
  updatesAvailable: boolean;
  frontend: {
    available: boolean;
    currentSha: string;
    remoteSha: string;
    behind: number;
  };
  backend: {
    available: boolean;
    currentSha: string;
    remoteSha: string;
    behind: number;
  };
  lastCheckedAt: string;
}

const UpdatesIndicator = () => {
  const theme = useTheme();
  const { session } = useAuth();
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is super_admin
  const isSuperAdmin = session?.user?.role === 'super_admin';

  // Auto-check for updates every 10 minutes
  useEffect(() => {
    if (!isSuperAdmin) return;

    const checkUpdates = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get('/api/system/update-status');
        if (response.data.success) {
          setUpdateStatus({
            updatesAvailable: response.data.updatesAvailable,
            frontend: response.data.frontend,
            backend: response.data.backend,
            lastCheckedAt: response.data.lastCheckedAt,
          });
        }
      } catch (err: any) {
        console.error('Failed to check for updates:', err);
        if (err.response?.status !== 403) {
          // Don't show error for permission denied (expected for non-super_admin)
          setError(err.response?.data?.message || 'Failed to check for updates');
        }
      } finally {
        setLoading(false);
      }
    };

    // Check immediately
    checkUpdates();

    // Check every 10 minutes
    const interval = setInterval(checkUpdates, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isSuperAdmin]);

  // Don't render if not super_admin
  if (!isSuperAdmin) {
    return null;
  }

  const updateCount = updateStatus
    ? (updateStatus.frontend.available ? 1 : 0) + (updateStatus.backend.available ? 1 : 0)
    : 0;

  return (
    <>
      <Tooltip
        title={
          loading
            ? 'Checking for updates...'
            : error
            ? `Error: ${error}`
            : updateStatus?.updatesAvailable
            ? `${updateCount} update${updateCount === 1 ? '' : 's'} available`
            : 'System up to date'
        }
      >
        <IconButton
          onClick={() => setModalOpen(true)}
          sx={{
            color: theme.palette.mode === 'dark' ? '#FFFFFF' : '#1a1a2e',
            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
          }}
        >
          <Badge
            badgeContent={updateCount}
            color="error"
            invisible={!updateStatus?.updatesAvailable}
          >
            <IconRefresh
              size="20"
              style={{
                animation: loading ? 'spin 1s linear infinite' : 'none',
              }}
            />
          </Badge>
        </IconButton>
      </Tooltip>

      {/* Updates Modal */}
      {modalOpen && (
        <UpdatesModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          updateStatus={updateStatus}
          onUpdateStatusChange={setUpdateStatus}
        />
      )}

      {/* Add spin animation for loading state */}
      <style>
        {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </>
  );
};

export default UpdatesIndicator;
