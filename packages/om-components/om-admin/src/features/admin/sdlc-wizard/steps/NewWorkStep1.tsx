/**
 * NewWorkStep1 — Select or create OM Daily items for the new change set
 */

import {
  Add as AddIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxBlankIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  FormControl,
  InputAdornment,
  InputLabel,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/shared/lib/apiClient';

interface DailyItem {
  id: number;
  title: string;
  status: string;
  priority: string;
  category: string | null;
  change_set?: { code: string; status: string } | null;
}

interface Props {
  selectedItemIds: number[];
  onItemsChange: (ids: number[]) => void;
}

const NewWorkStep1: React.FC<Props> = ({ selectedItemIds, onItemsChange }) => {
  const [items, setItems] = useState<DailyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newCategory, setNewCategory] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/omai-daily/items');
      setItems(res.data.items || []);
    } catch (err) {
      console.error('Failed to fetch items:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const toggleItem = (id: number) => {
    if (selectedItemIds.includes(id)) {
      onItemsChange(selectedItemIds.filter(i => i !== id));
    } else {
      onItemsChange([...selectedItemIds, id]);
    }
  };

  const handleCreateItem = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await apiClient.post('/omai-daily/items', {
        title: newTitle.trim(),
        priority: newPriority,
        category: newCategory || undefined,
        status: 'in_progress',
        horizon: '7d',
      });
      const newItem = res.data.item;
      await fetchItems();
      onItemsChange([...selectedItemIds, newItem.id]);
      setNewTitle('');
      setShowCreate(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create item');
    } finally {
      setCreating(false);
    }
  };

  // Filter: unassigned items that match search
  const filtered = items.filter(item => {
    if (item.change_set) return false; // Already in a change set
    if (item.status === 'done' || item.status === 'cancelled') return false;
    if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const PRIORITY_COLORS: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
    critical: 'error', high: 'warning', medium: 'info', low: 'default',
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Select Work Items</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Choose unassigned OM Daily items to include in the new change set, or create a new item.
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
          }}
          sx={{ flex: 1 }}
        />
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setShowCreate(!showCreate)}
        >
          New Item
        </Button>
      </Box>

      <Collapse in={showCreate}>
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Create New Item</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              label="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              sx={{ flex: 2, minWidth: 200 }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Priority</InputLabel>
              <Select value={newPriority} label="Priority" onChange={(e) => setNewPriority(e.target.value)}>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              sx={{ minWidth: 120 }}
            />
            <Button variant="contained" size="small" onClick={handleCreateItem} disabled={creating || !newTitle.trim()}>
              {creating ? <CircularProgress size={16} /> : 'Create'}
            </Button>
          </Box>
        </Paper>
      </Collapse>

      {selectedItemIds.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {selectedItemIds.length} item{selectedItemIds.length > 1 ? 's' : ''} selected
        </Alert>
      )}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress /></Box>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">No unassigned items found. Create one above.</Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
          <List dense disablePadding>
            {filtered.map(item => {
              const selected = selectedItemIds.includes(item.id);
              return (
                <ListItemButton key={item.id} onClick={() => toggleItem(item.id)} selected={selected}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Checkbox
                      edge="start"
                      checked={selected}
                      icon={<CheckBoxBlankIcon />}
                      checkedIcon={<CheckBoxIcon />}
                      tabIndex={-1}
                      disableRipple
                      size="small"
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    secondary={`#${item.id} · ${item.status} · ${item.category || 'uncategorized'}`}
                  />
                  <Chip label={item.priority} size="small" color={PRIORITY_COLORS[item.priority] || 'default'} />
                </ListItemButton>
              );
            })}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default NewWorkStep1;
