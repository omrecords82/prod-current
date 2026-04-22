import React from 'react';
import {
  Alert,
  Box,
  Button,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  VpnKey as VpnKeyIcon,
} from '@mui/icons-material';
import { IconRefresh, IconTrash, IconUsers } from '@tabler/icons-react';
import BlankCard from '@/shared/ui/BlankCard';

interface UsersTabProps {
  churchId: string | undefined;
  churchUsers: any[];
  loadingUsers: boolean;
  loadChurchUsers: (churchId: string) => void;
  handlePasswordReset: (userId: number, email: string) => void;
  handleUserAction: (userId: number, action: string) => void;
  onAddUser: () => void;
  onEditUser: (user: any) => void;
}

const UsersTab: React.FC<UsersTabProps> = ({
  churchId,
  churchUsers,
  loadingUsers,
  loadChurchUsers,
  handlePasswordReset,
  handleUserAction,
  onAddUser,
  onEditUser,
}) => (
  <BlankCard>
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5">
            <IconUsers size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            User Management
          </Typography>
          <Typography color="textSecondary">Manage users assigned to this church (ID: {churchId})</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<RefreshIcon />} onClick={() => churchId && loadChurchUsers(churchId)} disabled={loadingUsers}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={onAddUser}>
            Add User
          </Button>
        </Stack>
      </Stack>

      {loadingUsers ? (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
      ) : churchUsers.length === 0 ? (
        <Alert severity="info">
          No users assigned to this church. Click "Add User" to create one.
        </Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {churchUsers.map((u: any) => (
                <TableRow key={u.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{u.first_name} {u.last_name}</Typography>
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Chip label={u.role} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip label={u.is_active ? 'Active' : 'Inactive'} color={u.is_active ? 'success' : 'default'} size="small" />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => onEditUser(u)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reset Password">
                        <IconButton size="small" onClick={() => handlePasswordReset(u.id, u.email)}>
                          <VpnKeyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={u.is_active ? 'Deactivate' : 'Activate'}>
                        <IconButton size="small" onClick={() => handleUserAction(u.id, u.is_active ? 'deactivate' : 'activate')} sx={{ color: u.is_active ? 'warning.main' : 'success.main' }}>
                          {u.is_active ? <IconTrash size={16} /> : <IconRefresh size={16} />}
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </CardContent>
  </BlankCard>
);

export default UsersTab;
