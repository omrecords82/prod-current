/**
 * FastForwardStep1 — Select from draft/active change sets for fast-forward
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
  git_branch: string | null;
  item_count: number;
}

interface Props {
  selectedCsId: number | null;
  onSelect: (cs: ChangeSet) => void;
}

const FastForwardStep1: React.FC<Props> = ({ selectedCsId, onSelect }) => {
  const [changeSets, setChangeSets] = useState<ChangeSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/change-sets', { params: { status: 'draft,active' } });
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
      <Typography variant="h6" gutterBottom>Select Change Set to Fast-Forward</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Choose a draft or active change set to bypass all intermediate stages and promote directly.
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
          <Typography color="text.secondary">No draft or active change sets found.</Typography>
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
                  label={cs.status}
                  size="small"
                  sx={{ bgcolor: cs.status === 'active' ? '#1976d2' : '#9e9e9e', color: '#fff' }}
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default FastForwardStep1;
