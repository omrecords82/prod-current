/**
 * AdvanceStep1 — Select from active change sets to advance
 */

import { Search as SearchIcon } from '@mui/icons-material';
import {
  Box,
  Chip,
  CircularProgress,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/shared/lib/apiClient';

interface ChangeSet {
  id: number;
  code: string;
  title: string;
  status: string;
  priority: string;
  change_type: string;
  git_branch: string | null;
  item_count: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#1976d2', ready_for_staging: '#ed6c02', staged: '#9c27b0',
  in_review: '#0288d1', approved: '#2e7d32', draft: '#9e9e9e',
};

interface Props {
  selectedCsId: number | null;
  onSelect: (cs: ChangeSet) => void;
}

const AdvanceStep1: React.FC<Props> = ({ selectedCsId, onSelect }) => {
  const [changeSets, setChangeSets] = useState<ChangeSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch non-terminal change sets
      const res = await apiClient.get('/admin/change-sets', { params: { status: 'active,ready_for_staging,staged,in_review,approved' } });
      setChangeSets(res.data.items || []);
    } catch (err) {
      console.error('Failed to load change sets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = changeSets.filter(cs =>
    !search || cs.title.toLowerCase().includes(search.toLowerCase()) || cs.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Select Change Set to Advance</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Choose an active change set to move to its next lifecycle stage.
      </Typography>

      <TextField
        size="small"
        fullWidth
        placeholder="Search by title or code..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
        }}
        sx={{ mb: 2 }}
      />

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress /></Box>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">No change sets available to advance.</Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
          <List dense disablePadding>
            {filtered.map(cs => (
              <ListItemButton
                key={cs.id}
                selected={selectedCsId === cs.id}
                onClick={() => onSelect(cs)}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight={600}>{cs.code}</Typography>
                      <Typography variant="body2">{cs.title}</Typography>
                    </Box>
                  }
                  secondary={`${cs.item_count} items · ${cs.git_branch || 'no branch'}`}
                />
                <Chip
                  label={cs.status.replace(/_/g, ' ')}
                  size="small"
                  sx={{ bgcolor: STATUS_COLORS[cs.status] || '#9e9e9e', color: '#fff', fontWeight: 600 }}
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default AdvanceStep1;
