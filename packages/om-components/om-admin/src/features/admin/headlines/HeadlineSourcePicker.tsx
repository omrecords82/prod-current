import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Switch,
  Button,
  Chip,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Language as LanguageIcon,
  Rss as RssIcon,
  Settings as SettingsIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Science as TestIcon
} from '@mui/icons-material';

// Types
interface NewsSource {
  id: string;
  name: string;
  feed_url: string;
  language: string;
  enabled: boolean;
  categories: string[];
  last_fetch?: string;
  article_count?: number;
  status: 'active' | 'inactive' | 'error';
  description?: string;
}

interface Category {
  id: string;
  name: string;
  enabled: boolean;
  keywords: string[];
  priority: number;
}

interface ScrapingConfig {
  enabled: boolean;
  schedule: string;
  maxArticlesPerSource: number;
  languages: string[];
  categories: string[];
  sources: string[];
}

const HeadlineSourcePicker: React.FC = () => {
  // State
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [config, setConfig] = useState<ScrapingConfig>({
    enabled: true,
    schedule: '0 */6 * * *', // Every 6 hours
    maxArticlesPerSource: 20,
    languages: ['en'],
    categories: [],
    sources: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [addSourceDialog, setAddSourceDialog] = useState(false);
  const [newSource, setNewSource] = useState<Partial<NewsSource>>({
    name: '',
    feed_url: '',
    language: 'en',
    enabled: true,
    categories: []
  });

  // Load data on component mount
  useEffect(() => {
    loadSourcesAndCategories();
  }, []);

  const loadSourcesAndCategories = async () => {
    try {
      setLoading(true);
      
      // Load sources
      const sourcesData = await apiClient.get<any>('/headlines/sources/manage');
      
      // Load categories
      const categoriesData = await apiClient.get<any>('/headlines/categories');
      
      // Load config
      const configData = await apiClient.get<any>('/headlines/config');
      
      if (sourcesData.success) setSources(sourcesData.sources);
      if (categoriesData.success) setCategories(categoriesData.categories);
      if (configData.success) setConfig(configData.config);
      
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load sources and categories' });
    } finally {
      setLoading(false);
    }
  };

  const handleSourceToggle = (sourceId: string, enabled: boolean) => {
    setSources(prev => prev.map(source => 
      source.id === sourceId ? { ...source, enabled } : source
    ));
    
    setConfig(prev => ({
      ...prev,
      sources: enabled 
        ? [...prev.sources, sourceId]
        : prev.sources.filter(id => id !== sourceId)
    }));
  };

  const handleCategoryToggle = (categoryId: string, enabled: boolean) => {
    setCategories(prev => prev.map(category => 
      category.id === categoryId ? { ...category, enabled } : category
    ));
    
    setConfig(prev => ({
      ...prev,
      categories: enabled 
        ? [...prev.categories, categoryId]
        : prev.categories.filter(id => id !== categoryId)
    }));
  };

  const handleLanguageToggle = (language: string, enabled: boolean) => {
    setConfig(prev => ({
      ...prev,
      languages: enabled
        ? [...prev.languages, language]
        : prev.languages.filter(lang => lang !== language)
    }));
  };

  const testSource = async (sourceId: string) => {
    try {
      setTesting(sourceId);
      const data = await apiClient.post<any>(`/headlines/sources/${sourceId}/test`);
      
      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `Test successful! Found ${data.articleCount} articles from ${data.sourceName}` 
        });
        
        // Update source status
        setSources(prev => prev.map(source => 
          source.id === sourceId 
            ? { ...source, status: 'active', article_count: data.articleCount }
            : source
        ));
      } else {
        setMessage({ type: 'error', text: `Test failed: ${data.message}` });
        
        // Update source status
        setSources(prev => prev.map(source => 
          source.id === sourceId ? { ...source, status: 'error' } : source
        ));
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to test source' });
    } finally {
      setTesting(null);
    }
  };

  const addNewSource = async () => {
    try {
      if (!newSource.name || !newSource.feed_url) {
        setMessage({ type: 'error', text: 'Name and Feed URL are required' });
        return;
      }

      const data = await apiClient.post<any>('/headlines/sources', newSource);
      
      if (data.success) {
        setSources(prev => [...prev, data.source]);
        setAddSourceDialog(false);
        setNewSource({ name: '', feed_url: '', language: 'en', enabled: true, categories: [] });
        setMessage({ type: 'success', text: 'Source added successfully' });
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to add source' });
    }
  };

  const saveConfiguration = async () => {
    try {
      setSaving(true);
      
      // Save sources
      await apiClient.put<any>('/headlines/sources/bulk-update', { sources });
      
      // Save categories
      await apiClient.put<any>('/headlines/categories/bulk-update', { categories });
      
      // Save config
      const configData = await apiClient.put<any>('/headlines/config', { config });
      
      if (configData.success) {
        setMessage({ type: 'success', text: 'Configuration saved successfully' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save configuration' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const languageOptions = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'gr', name: 'Greek', flag: '🇬🇷' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺' },
    { code: 'ro', name: 'Romanian', flag: '🇷🇴' },
    { code: 'sr', name: 'Serbian', flag: '🇷🇸' }
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <Typography>Loading sources and categories...</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          📰 Orthodox Headlines Configuration
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadSourcesAndCategories}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveConfiguration}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Global Settings */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ⚙️ Global Settings
              </Typography>
              
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.enabled}
                        onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                      />
                    }
                    label="Enable Automatic Scraping"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Max Articles per Source"
                    type="number"
                    value={config.maxArticlesPerSource}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      maxArticlesPerSource: parseInt(e.target.value) || 20 
                    }))}
                    size="small"
                    fullWidth
                  />
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Cron Schedule"
                    value={config.schedule}
                    onChange={(e) => setConfig(prev => ({ ...prev, schedule: e.target.value }))}
                    size="small"
                    fullWidth
                    helperText="e.g., '0 */6 * * *' for every 6 hours"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Languages */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🌍 Languages
              </Typography>
              
              <FormGroup row>
                {languageOptions.map((lang) => (
                  <FormControlLabel
                    key={lang.code}
                    control={
                      <Checkbox
                        checked={config.languages.includes(lang.code)}
                        onChange={(e) => handleLanguageToggle(lang.code, e.target.checked)}
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </Box>
                    }
                  />
                ))}
              </FormGroup>
            </CardContent>
          </Card>
        </Grid>

        {/* Categories */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📂 Content Categories
              </Typography>
              
              <FormGroup>
                {categories.map((category) => (
                  <FormControlLabel
                    key={category.id}
                    control={
                      <Checkbox
                        checked={category.enabled}
                        onChange={(e) => handleCategoryToggle(category.id, e.target.checked)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2">{category.name}</Typography>
                        <Box display="flex" gap={0.5} mt={0.5}>
                          {category.keywords.slice(0, 3).map((keyword, idx) => (
                            <Chip key={idx} label={keyword} size="small" variant="outlined" />
                          ))}
                          {category.keywords.length > 3 && (
                            <Chip label={`+${category.keywords.length - 3} more`} size="small" />
                          )}
                        </Box>
                      </Box>
                    }
                  />
                ))}
              </FormGroup>
            </CardContent>
          </Card>
        </Grid>

        {/* News Sources */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  📡 News Sources ({sources.filter(s => s.enabled).length}/{sources.length} enabled)
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setAddSourceDialog(true)}
                >
                  Add Source
                </Button>
              </Box>
              
              <Grid container spacing={2}>
                {sources.map((source) => (
                  <Grid item xs={12} md={6} key={source.id}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                          <Box flex={1}>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                              <Typography variant="h6">{source.name}</Typography>
                              <Chip 
                                label={source.language.toUpperCase()} 
                                size="small" 
                                color="primary" 
                              />
                              <Chip 
                                label={source.status} 
                                size="small" 
                                color={source.status === 'active' ? 'success' : 
                                      source.status === 'error' ? 'error' : 'default'} 
                              />
                            </Box>
                            
                            <Typography variant="body2" color="text.secondary" mb={1}>
                              {source.feed_url}
                            </Typography>
                            
                            {source.description && (
                              <Typography variant="body2" mb={1}>
                                {source.description}
                              </Typography>
                            )}
                            
                            <Box display="flex" gap={1} mb={2}>
                              {source.categories.map((cat, idx) => (
                                <Chip key={idx} label={cat} size="small" variant="outlined" />
                              ))}
                            </Box>
                            
                            {source.article_count !== undefined && (
                              <Typography variant="caption" color="text.secondary">
                                Articles: {source.article_count} | 
                                Last fetch: {source.last_fetch ? new Date(source.last_fetch).toLocaleDateString() : 'Never'}
                              </Typography>
                            )}
                          </Box>
                          
                          <FormControlLabel
                            control={
                              <Switch
                                checked={source.enabled}
                                onChange={(e) => handleSourceToggle(source.id, e.target.checked)}
                              />
                            }
                            label=""
                          />
                        </Box>
                        
                        <Box display="flex" gap={1}>
                          <Button
                            size="small"
                            startIcon={<TestIcon />}
                            onClick={() => testSource(source.id)}
                            disabled={testing === source.id}
                          >
                            {testing === source.id ? 'Testing...' : 'Test'}
                          </Button>
                          
                          <Tooltip title="Configure source">
                            <IconButton size="small">
                              <SettingsIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add Source Dialog */}
      <Dialog open={addSourceDialog} onClose={() => setAddSourceDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New News Source</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Source Name"
                value={newSource.name}
                onChange={(e) => setNewSource(prev => ({ ...prev, name: e.target.value }))}
                fullWidth
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="RSS Feed URL"
                value={newSource.feed_url}
                onChange={(e) => setNewSource(prev => ({ ...prev, feed_url: e.target.value }))}
                fullWidth
                required
                placeholder="https://example.com/rss.xml"
              />
            </Grid>
            
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Language</InputLabel>
                <Select
                  value={newSource.language}
                  onChange={(e) => setNewSource(prev => ({ ...prev, language: e.target.value }))}
                >
                  {languageOptions.map((lang) => (
                    <MenuItem key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newSource.enabled || false}
                    onChange={(e) => setNewSource(prev => ({ ...prev, enabled: e.target.checked }))}
                  />
                }
                label="Enable by default"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Description (optional)"
                value={newSource.description || ''}
                onChange={(e) => setNewSource(prev => ({ ...prev, description: e.target.value }))}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddSourceDialog(false)}>Cancel</Button>
          <Button onClick={addNewSource} variant="contained">Add Source</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for messages */}
      <Snackbar
        open={!!message}
        autoHideDuration={6000}
        onClose={() => setMessage(null)}
      >
        <Alert severity={message?.type} onClose={() => setMessage(null)}>
          {message?.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default HeadlineSourcePicker; 