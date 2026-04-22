import React, { useState, useEffect } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import type { ChurchUser } from './types';
import { USER_ROLES, AVAILABLE_PERMISSIONS } from './constants';

interface UserDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (user: ChurchUser) => void;
  editingUser: ChurchUser | null;
}

const UserDialog: React.FC<UserDialogProps> = ({
  open,
  onClose,
  onSave,
  editingUser,
}) => {
  const [userData, setUserData] = useState<Partial<ChurchUser>>({
    email: '',
    first_name: '',
    last_name: '',
    role: 'user',
    permissions: [],
    send_invite: true
  });

  useEffect(() => {
    if (editingUser) {
      setUserData(editingUser);
    } else {
      setUserData({
        email: '',
        first_name: '',
        last_name: '',
        role: 'user',
        permissions: [],
        send_invite: true
      });
    }
  }, [editingUser, open]);

  const handleSave = () => {
    if (userData.email && userData.first_name && userData.last_name) {
      onSave({
        ...userData,
        id: editingUser?.id || Date.now().toString()
      } as ChurchUser);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {editingUser ? 'Edit User' : 'Add User'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="First Name"
              value={userData.first_name || ''}
              onChange={(e) => setUserData({ ...userData, first_name: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Last Name"
              value={userData.last_name || ''}
              onChange={(e) => setUserData({ ...userData, last_name: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              type="email"
              label="Email Address"
              value={userData.email || ''}
              onChange={(e) => setUserData({ ...userData, email: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                label="Role"
                value={userData.role || 'user'}
                onChange={(e) => setUserData({ ...userData, role: e.target.value as any })}
              >
                {USER_ROLES.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    {role.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={userData.send_invite || false}
                  onChange={(e) => setUserData({ ...userData, send_invite: e.target.checked })}
                />
              }
              label="Send Email Invitation"
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Permissions
            </Typography>
            <FormGroup row>
              {AVAILABLE_PERMISSIONS.map((permission) => (
                <FormControlLabel
                  key={permission}
                  control={
                    <Checkbox
                      checked={userData.permissions?.includes(permission) || false}
                      onChange={(e) => {
                        const currentPermissions = userData.permissions || [];
                        if (e.target.checked) {
                          setUserData({
                            ...userData,
                            permissions: [...currentPermissions, permission]
                          });
                        } else {
                          setUserData({
                            ...userData,
                            permissions: currentPermissions.filter(p => p !== permission)
                          });
                        }
                      }}
                    />
                  }
                  label={permission.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                />
              ))}
            </FormGroup>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!userData.email || !userData.first_name || !userData.last_name}
        >
          {editingUser ? 'Update' : 'Add'} User
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserDialog;
