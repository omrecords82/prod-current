import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Grid,
  Alert,
  CircularProgress,
  Pagination,
  Stack,
  Tooltip,
  Badge,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Memory as MemoryIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Label as LabelIcon,
  Folder as FolderIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

interface Memory {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  access_level: 'private' | 'shared' | 'public';
  expires_at?: string;
  usage_count: number;
  last_accessed_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface MemoryFilters {
  category?: string;
  priority?: string;
  tags?: string[];
  search?: string;
  is_active?: boolean;
}

const MemoryManager: React.FC = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MemoryFilters>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    priority: 'medium',
    tags: [] as string[],
    access_level: 'private',
    expires_at: ''
  });

  const categories = ['learning', 'user_preference', 'system', 'analytics', 'tasks', 'knowledge'];
  const priorities = ['low', 'medium', 'high', 'critical'];
  const accessLevels = ['private', 'shared', 'public'];

  useEffect(() => {
    loadMemories();
  }, [filters, page]);

  const loadMemories = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Mock API call - replace with actual API
      console.log('Loading OMAI memories...', { filters, page });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock data
      const mockMemories: Memory[] = [
        {
          id: '1',
          title: 'User prefers dark mode',
          content: 'The user consistently chooses dark mode themes and mentions preference for low-light interfaces.',
          category: 'user_preference',
          priority: 'medium',
          tags: ['ui', 'theme', 'accessibility'],
          access_level: 'private',
          usage_count: 15,
          last_accessed_at: '2025-01-29T10:30:00Z',
          is_active: true,
          created_at: '2025-01-20T09:00:00Z',
          updated_at: '2025-01-29T10:30:00Z'
        },
        {
          id: '2',
          title: 'Church management workflow insights',
          content: 'User frequently manages multiple churches and prefers bulk operations for administrative tasks.',
          category: 'learning',
          priority: 'high',
          tags: ['workflow', 'admin', 'churches'],
          access_level: 'shared',
          usage_count: 8,
          last_accessed_at: '2025-01-28T14:20:00Z',
          is_active: true,
          created_at: '2025-01-15T11:00:00Z',
          updated_at: '2025-01-28T14:20:00Z'
        },
        {
          id: '3',
          title: 'OMAI training progress checkpoint',
          content: 'Completed Phase 1 foundation training with 85% accuracy on site understanding tasks.',
          category: 'system',
          priority: 'high',
          tags: ['training', 'checkpoint', 'progress'],
          access_level: 'private',
          usage_count: 3,
          is_active: true,
          created_at: '2025-01-25T16:45:00Z',
          updated_at: '2025-01-25T16:45:00Z'
        }
      ];
      
      setMemories(mockMemories);
      setTotalPages(1);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memories');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMemory = () => {
    setFormData({
      title: '',
      content: '',
      category: '',
      priority: 'medium',
      tags: [],
      access_level: 'private',
      expires_at: ''
    });
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleEditMemory = (memory: Memory) => {
    setFormData({
      title: memory.title,
      content: memory.content,
      category: memory.category,
      priority: memory.priority,
      tags: memory.tags,
      access_level: memory.access_level,
      expires_at: memory.expires_at || ''
    });
    setSelectedMemory(memory);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleViewMemory = (memory: Memory) => {
    setSelectedMemory(memory);
    setDialogMode('view');
    setDialogOpen(true);
  };

  const handleSaveMemory = async () => {
    try {
      console.log('Saving memory:', formData);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setDialogOpen(false);
      loadMemories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save memory');
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!confirm('Are you sure you want to delete this memory?')) return;
    
    try {
      console.log('Deleting memory:', memoryId);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      loadMemories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete memory');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getAccessLevelIcon = (level: string) => {
    switch (level) {
      case 'public': return '🌐';
      case 'shared': return '👥';
      case 'private': return '🔒';
      default: return '📄';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" component="h2" gutterBottom>
            <MemoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            OMAI Memory Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Store and manage OMAI's learning memories, preferences, and knowledge
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadMemories}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateMemory}
          >
            Add Memory
          </Button>
        </Stack>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <FilterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Filters
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Search"
                placeholder="Search memories..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={filters.category || ''}
                  label="Category"
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map(cat => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={filters.priority || ''}
                  label="Priority"
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                >
                  <MenuItem value="">All Priorities</MenuItem>
                  {priorities.map(priority => (
                    <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.is_active === undefined ? '' : filters.is_active ? 'active' : 'inactive'}
                  label="Status"
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    is_active: e.target.value === '' ? undefined : e.target.value === 'active' 
                  })}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Memories List */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>Loading memories...</Typography>
        </Box>
      ) : (
        <>
          <Grid container spacing={2}>
            {memories.map((memory) => (
              <Grid item xs={12} md={6} lg={4} key={memory.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Typography variant="h6" component="h3" noWrap sx={{ flex: 1, mr: 1 }}>
                        {memory.title}
                      </Typography>
                      <Box display="flex" gap={0.5}>
                        <Tooltip title="View Memory">
                          <IconButton size="small" onClick={() => handleViewMemory(memory)}>
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Memory">
                          <IconButton size="small" onClick={() => handleEditMemory(memory)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Memory">
                          <IconButton size="small" onClick={() => handleDeleteMemory(memory.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {memory.content.length > 100 
                        ? `${memory.content.substring(0, 100)}...` 
                        : memory.content
                      }
                    </Typography>

                    <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                      <Chip 
                        label={memory.category} 
                        size="small" 
                        icon={<FolderIcon />} 
                        variant="outlined" 
                      />
                      <Chip 
                        label={memory.priority} 
                        size="small" 
                        color={getPriorityColor(memory.priority) as any}
                      />
                      <Chip 
                        label={`${getAccessLevelIcon(memory.access_level)} ${memory.access_level}`} 
                        size="small" 
                        variant="outlined"
                      />
                    </Box>

                    <Box display="flex" flexWrap="wrap" gap={0.5} mb={2}>
                      {memory.tags.map((tag) => (
                        <Chip 
                          key={tag} 
                          label={tag} 
                          size="small" 
                          icon={<LabelIcon />}
                          variant="outlined"
                        />
                      ))}
                    </Box>

                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        Used {memory.usage_count} times
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(memory.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {memories.length === 0 && !loading && (
            <Box textAlign="center" py={6}>
              <MemoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No memories found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Start by creating your first OMAI memory to help the system learn and remember important information.
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateMemory}>
                Create First Memory
              </Button>
            </Box>
          )}

          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Memory Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' && 'Create New Memory'}
          {dialogMode === 'edit' && 'Edit Memory'}
          {dialogMode === 'view' && 'Memory Details'}
        </DialogTitle>
        <DialogContent>
          {dialogMode === 'view' && selectedMemory ? (
            <Box>
              <Typography variant="h6" gutterBottom>{selectedMemory.title}</Typography>
              <Typography variant="body1" paragraph>{selectedMemory.content}</Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Category</Typography>
                  <Typography variant="body2">{selectedMemory.category}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Priority</Typography>
                  <Typography variant="body2">{selectedMemory.priority}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Access Level</Typography>
                  <Typography variant="body2">{selectedMemory.access_level}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Usage Count</Typography>
                  <Typography variant="body2">{selectedMemory.usage_count}</Typography>
                </Grid>
              </Grid>
              
              <Box mt={2}>
                <Typography variant="subtitle2">Tags</Typography>
                <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                  {selectedMemory.tags.map((tag) => (
                    <Chip key={tag} label={tag} size="small" />
                  ))}
                </Box>
              </Box>
            </Box>
          ) : (
            <Stack spacing={3} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={dialogMode === 'view'}
              />
              
              <TextField
                fullWidth
                label="Content"
                multiline
                rows={4}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                disabled={dialogMode === 'view'}
              />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={formData.category}
                      label="Category"
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      disabled={dialogMode === 'view'}
                    >
                      {categories.map(cat => (
                        <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={formData.priority}
                      label="Priority"
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      disabled={dialogMode === 'view'}
                    >
                      {priorities.map(priority => (
                        <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              
              <FormControl fullWidth>
                <InputLabel>Access Level</InputLabel>
                <Select
                  value={formData.access_level}
                  label="Access Level"
                  onChange={(e) => setFormData({ ...formData, access_level: e.target.value })}
                  disabled={dialogMode === 'view'}
                >
                  {accessLevels.map(level => (
                    <MenuItem key={level} value={level}>{level}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                label="Tags (comma-separated)"
                value={formData.tags.join(', ')}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                })}
                disabled={dialogMode === 'view'}
                helperText="Enter tags separated by commas"
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            {dialogMode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {dialogMode !== 'view' && (
            <Button variant="contained" onClick={handleSaveMemory}>
              {dialogMode === 'create' ? 'Create' : 'Save'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MemoryManager;