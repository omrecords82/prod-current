import React from 'react';
import {
  alpha,
  Avatar,
  Box,
  Button,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { COLOR } from './constants';
import type { ContactsPanelProps } from './types';

const ContactsPanel: React.FC<ContactsPanelProps> = ({
  contacts,
  setEditingContact,
  setContactForm,
  setContactDialogOpen,
  handleDeleteContact,
}) => (
  <>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="subtitle1" fontWeight={700}>Contacts ({contacts.length})</Typography>
      <Button
        variant="contained" size="small" startIcon={<AddIcon />}
        onClick={() => {
          setEditingContact(null);
          setContactForm({ first_name: '', last_name: '', role: '', email: '', phone: '', is_primary: false, notes: '' });
          setContactDialogOpen(true);
        }}
        sx={{ textTransform: 'none', bgcolor: COLOR, '&:hover': { bgcolor: alpha(COLOR, 0.85) } }}
      >
        Add Contact
      </Button>
    </Box>

    {contacts.length === 0 ? (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No contacts yet</Typography>
    ) : (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {contacts.map(c => (
          <Paper key={c.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: c.is_primary ? COLOR : alpha(COLOR, 0.3), fontSize: '0.85rem' }}>
                {(c.first_name?.[0] || '?').toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {c.first_name} {c.last_name || ''}
                  </Typography>
                  {c.is_primary === 1 && <StarIcon sx={{ fontSize: 16, color: '#ff9800' }} />}
                </Box>
                {c.role && <Typography variant="caption" color="text.secondary">{c.role}</Typography>}
                <Box sx={{ display: 'flex', gap: 2, mt: 0.25 }}>
                  {c.email && <Typography variant="caption" color="text.secondary">{c.email}</Typography>}
                  {c.phone && <Typography variant="caption" color="text.secondary">{c.phone}</Typography>}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={() => {
                    setEditingContact(c);
                    setContactForm({
                      first_name: c.first_name,
                      last_name: c.last_name || '',
                      role: c.role || '',
                      email: c.email || '',
                      phone: c.phone || '',
                      is_primary: c.is_primary === 1,
                      notes: c.notes || '',
                    });
                    setContactDialogOpen(true);
                  }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton size="small" color="error" onClick={() => handleDeleteContact(c.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>
    )}
  </>
);

export default ContactsPanel;
