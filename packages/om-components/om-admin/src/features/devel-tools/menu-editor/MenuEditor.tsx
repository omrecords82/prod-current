/**
 * Menu Editor - Super Admin Only
 * Web UI for editing navigation menus stored in database
 */

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  IconMenu2,
  IconPlus,
  IconRefresh,
  IconDatabase,
  IconTrash,
  IconDeviceFloppy,
  IconSettings,
  IconTemplate,
  IconReload,
} from '@tabler/icons-react';
import { DataGrid, GridColDef, GridRowsProp, GridActionsCellItem, GridRowParams } from '@mui/x-data-grid';
import { getMenuItems } from '@/layouts/full/vertical/sidebar/MenuItems';
import { useAuth } from '@/context/AuthContext';

// Import template system
import { SuperAdminMenuTemplate, SuperAdminMenuMetadata } from '@/layouts/full/vertical/sidebar/MenuItems-default-superadmin';
import { transformMenuTemplate, validateMenuItems, createTemplatePayload } from './templates/transformMenuTemplate';

// Icon whitelist (must match backend)
const ALLOWED_ICONS = [
  'IconLayoutDashboard',
  'IconShield',
  'IconUsers',
  'IconFileDescription',
  'IconSettings',
  'IconTerminal',
  'IconBorderAll',
  'IconEdit',
  'IconBug',
  'IconGitBranch',
  'IconSitemap',
  'IconDatabase',
  'IconRocket',
  'IconPalette',
  'IconNotes',
  'IconMessage',
  'IconBell',
  'IconUserPlus',
  'IconActivity',
  'IconCalendar',
  'IconPoint',
  'IconChartHistogram',
  'IconComponents',
  'IconForms',
  'IconLayout',
  'IconTool',
  'IconTree',
  'IconWriting',
  'OrthodoxChurchIcon',
];

interface MenuItem {
  id?: number;
  key_name: string;
  label: string;
  icon?: string;
  path?: string;
  parent_id?: number;
  order_index: number;
  is_active: number;
  meta?: string;
}

const MenuEditor: React.FC = () => {
  const { user, isSuperAdmin, hasRole } = useAuth();
  const canAccess = () => hasRole(['super_admin', 'admin']);
  const [loading, setLoading] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [seedDialogOpen, setSeedDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  
  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);

  // Template system state
  const [selectedTemplate, setSelectedTemplate] = useState<string>('default-superadmins');
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateResetDialogOpen, setTemplateResetDialogOpen] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);

  // Load menu items from backend
  const loadMenuItems = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiClient.get<any>('/admin/menus');
      setMenuItems(data.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load menu items');
      console.error('Error loading menus:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canAccess()) {
      loadMenuItems();
    }
  }, []);

  // Save menu items
  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await apiClient.put<any>('/admin/menus', { items: menuItems });
      setSuccess(data.message || 'Menu items saved successfully');
      
      // Reload to get updated data
      await loadMenuItems();
      
      // Reload the page after 2 seconds to refresh the menu
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to save menu items');
      console.error('Error saving menus:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper: Extract icon name from icon component
  const getIconName = (iconComponent: any): string => {
    if (!iconComponent) return 'IconPoint';
    
    // If it's already a string, return it
    if (typeof iconComponent === 'string') return iconComponent;
    
    // Extract name from React component
    if (iconComponent.type?.name) return iconComponent.type.name;
    if (iconComponent.type?.displayName) return iconComponent.type.displayName;
    
    // Try to get from toString
    const iconString = iconComponent.toString();
    const match = iconString.match(/Icon[A-Z][a-zA-Z]+/);
    if (match) return match[0];
    
    // Check if it's OrthodoxChurchIcon
    if (iconString.includes('OrthodoxChurch')) return 'OrthodoxChurchIcon';
    
    // Default fallback
    return 'IconPoint';
  };

  // Seed from static MenuItems.ts
  const handleSeed = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Get current static menu items
      const staticMenuItems = getMenuItems(user);
      
      // Transform to backend format
      const transformedItems: MenuItem[] = [];
      let orderIndex = 0;

      const processItem = (item: any, parentId?: number) => {
        // Skip nav labels (section headers)
        if (item.navlabel || item.subheader) {
          return;
        }

        const keyName = item.id || `menu-${orderIndex}`;
        const iconName = getIconName(item.icon);
        
        const menuItem: MenuItem = {
          key_name: keyName,
          label: item.title || 'Untitled',
          icon: iconName,
          path: item.href || null,
          parent_id: parentId || null,
          order_index: orderIndex++,
          is_active: 1,
          meta: item.chip ? JSON.stringify({ chip: item.chip, chipColor: item.chipColor }) : null,
        };

        transformedItems.push(menuItem);

        // Process children recursively
        if (item.children && item.children.length > 0) {
          const parentKeyName = keyName;
          item.children.forEach((child: any) => {
            processItem(child, transformedItems.findIndex(i => i.key_name === parentKeyName));
          });
        }
      };

      staticMenuItems.forEach((item: any) => processItem(item));

      // Debug: Log transformed items
      console.log('🌱 Seeding menu items:', transformedItems.length);
      console.log('Sample items:', transformedItems.slice(0, 5));
      
      // Validate icons before sending
      const invalidIcons = transformedItems.filter(item => 
        item.icon && !ALLOWED_ICONS.includes(item.icon)
      );
      
      if (invalidIcons.length > 0) {
        console.warn('⚠️ Items with invalid icons:', invalidIcons);
        // Replace invalid icons with default
        transformedItems.forEach(item => {
          if (item.icon && !ALLOWED_ICONS.includes(item.icon)) {
            console.log(`Replacing invalid icon "${item.icon}" with "IconPoint" for item "${item.label}"`);
            item.icon = 'IconPoint';
          }
        });
      }

      // Send to backend
      const data = await apiClient.post<any>('/admin/menus/seed', { items: transformedItems });
      setSuccess(data.message || 'Menu seeded successfully');
      setSeedDialogOpen(false);
      
      // Reload to show seeded data
      await loadMenuItems();
      
      // Reload the page after 2 seconds to refresh the menu
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to seed menu items');
      console.error('Error seeding menus:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reset to static menu
  const handleReset = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await apiClient.post<any>('/admin/menus/reset');
      setSuccess(data.message || 'Menu reset successfully');
      setResetDialogOpen(false);
      
      // Reload to show empty state
      await loadMenuItems();
      
      // Reload the page after 2 seconds to refresh the menu
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset menu');
      console.error('Error resetting menus:', err);
    } finally {
      setLoading(false);
    }
  };

  // Seed from template
  const handleSeedFromTemplate = async () => {
    setTemplateLoading(true);
    setError(null);
    setSuccess(null);
    setTemplateDialogOpen(false);

    try {
      console.log('🌱 Seeding from template:', selectedTemplate);
      
      // Transform template
      const normalized = transformMenuTemplate(SuperAdminMenuTemplate);
      
      // Validate
      const validation = validateMenuItems(normalized);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
      
      if (validation.warnings.length > 0) {
        console.warn('⚠️ Template warnings:', validation.warnings);
      }
      
      console.log(`✅ Transformed ${normalized.length} menu items`);
      
      // Create payload
      const payload = createTemplatePayload(
        SuperAdminMenuMetadata.id,
        SuperAdminMenuMetadata.role,
        normalized
      );
      
      // Send to backend
      const data = await apiClient.post<any>('/admin/menus/seed', payload);
      console.log('✅ Seed response:', data);
      
      setSuccess(`${data.message} (${data.stats.inserted} inserted, ${data.stats.updated} updated)`);
      
      // Reload menu items
      await loadMenuItems();
      
      // Reload the page after 2 seconds to refresh the menu
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (err: any) {
      console.error('❌ Error seeding from template:', err);
      setError(err.message || 'Failed to seed from template');
    } finally {
      setTemplateLoading(false);
    }
  };

  // Reset to template
  const handleResetToTemplate = async () => {
    setTemplateLoading(true);
    setError(null);
    setSuccess(null);
    setTemplateResetDialogOpen(false);

    try {
      console.log('🔄 Resetting to template:', selectedTemplate);
      
      // Transform template
      const normalized = transformMenuTemplate(SuperAdminMenuTemplate);
      
      // Validate
      const validation = validateMenuItems(normalized);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
      
      console.log(`✅ Transformed ${normalized.length} menu items`);
      
      // Create payload
      const payload = createTemplatePayload(
        SuperAdminMenuMetadata.id,
        SuperAdminMenuMetadata.role,
        normalized
      );
      
      // Send to backend
      const data = await apiClient.post<any>('/admin/menus/reset-to-template', payload);
      console.log('✅ Reset response:', data);
      
      setSuccess(`${data.message} (${data.stats.deleted} deleted, ${data.stats.inserted} inserted)`);
      
      // Reload menu items
      await loadMenuItems();
      
      // Reload the page after 2 seconds to refresh the menu
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (err: any) {
      console.error('❌ Error resetting to template:', err);
      setError(err.message || 'Failed to reset to template');
    } finally {
      setTemplateLoading(false);
    }
  };

  // Delete a single menu item
  const handleDeleteItem = async () => {
    if (!itemToDelete?.id) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.delete<any>(`/admin/menus/${itemToDelete.id}`);

      setSuccess(`Deleted menu item "${itemToDelete.label}"`);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      await loadMenuItems();
    } catch (err: any) {
      setError(err.message || 'Failed to delete menu item');
      console.error('Error deleting menu item:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update menu item
  const updateMenuItem = (id: number, field: keyof MenuItem, value: any) => {
    setMenuItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  // DataGrid columns
  const columns: GridColDef[] = [
    {
      field: 'label',
      headerName: 'Label',
      flex: 1,
      editable: true,
    },
    {
      field: 'key_name',
      headerName: 'Key',
      width: 150,
      editable: true,
    },
    {
      field: 'path',
      headerName: 'Path',
      flex: 1,
      editable: true,
    },
    {
      field: 'icon',
      headerName: 'Icon',
      width: 150,
      editable: true,
      type: 'singleSelect',
      valueOptions: ALLOWED_ICONS,
    },
    {
      field: 'order_index',
      headerName: 'Order',
      width: 80,
      editable: true,
      type: 'number',
    },
    {
      field: 'is_active',
      headerName: 'Active',
      width: 100,
      renderCell: (params) => (
        <Switch
          checked={params.value === 1}
          onChange={(e) => updateMenuItem(params.row.id, 'is_active', e.target.checked ? 1 : 0)}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 80,
      getActions: (params: GridRowParams) => [
        <GridActionsCellItem
          key="delete"
          icon={<IconTrash size={16} />}
          label="Delete"
          onClick={() => {
            setItemToDelete(params.row as MenuItem);
            setDeleteDialogOpen(true);
          }}
        />,
      ],
    },
  ];

  if (!canAccess()) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. Only admin and super_admin users can access the Menu Editor.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Stack direction="row" spacing={2} alignItems="center">
              <IconMenu2 size={32} />
              <Box>
                <Typography variant="h4">Menu Editor</Typography>
                <Typography variant="body2" color="text.secondary">
                  Edit super_admin navigation menus
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<IconRefresh />}
                onClick={loadMenuItems}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button
                variant="outlined"
                startIcon={<IconDatabase />}
                onClick={() => setSeedDialogOpen(true)}
                disabled={loading}
              >
                Seed from Static
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<IconTrash />}
                onClick={() => setResetDialogOpen(true)}
                disabled={loading}
              >
                Reset
              </Button>
              <Button
                variant="contained"
                startIcon={<IconDeviceFloppy />}
                onClick={handleSave}
                disabled={loading}
              >
                Save Changes
              </Button>
            </Stack>
          </Stack>

          {/* Template Controls */}
          <Box sx={{ mt: 3, mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconTemplate size={20} />
                Template Seeding
              </Typography>
              
              <Stack direction="row" spacing={2} alignItems="center">
                <FormControl sx={{ minWidth: 300 }}>
                  <InputLabel>Menu Template</InputLabel>
                  <Select
                    value={selectedTemplate}
                    label="Menu Template"
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    disabled={templateLoading}
                  >
                    <MenuItem value="default-superadmins">
                      {SuperAdminMenuMetadata.name}
                    </MenuItem>
                    {/* Add more templates in future */}
                  </Select>
                </FormControl>
                
                <Tooltip title="Update menu items from selected template (idempotent - won't create duplicates)">
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setTemplateDialogOpen(true)}
                    disabled={templateLoading || loading}
                    startIcon={templateLoading ? <CircularProgress size={20} /> : <IconDatabase />}
                  >
                    Seed from Template
                  </Button>
                </Tooltip>
                
                <Tooltip title="Delete all items and reload from template (destructive)">
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={() => setTemplateResetDialogOpen(true)}
                    disabled={templateLoading || loading}
                    startIcon={<IconReload />}
                  >
                    Reset to Template
                  </Button>
                </Tooltip>
              </Stack>
              
              <Alert severity="info" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>Tip:</strong> "Seed from Template" updates existing items (idempotent). 
                  "Reset to Template" deletes all items first and reloads from template.
                </Typography>
              </Alert>
            </Stack>
          </Box>

          {/* Status Messages */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          {/* Loading */}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {/* Menu Items Table */}
          {!loading && (
            <Box sx={{ height: 600, width: '100%' }}>
              <DataGrid
                rows={menuItems}
                columns={columns}
                pageSizeOptions={[25, 50, 100]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 100 } },
                }}
                disableRowSelectionOnClick
                processRowUpdate={(newRow) => {
                  setMenuItems(prevItems =>
                    prevItems.map(item => (item.id === newRow.id ? newRow : item))
                  );
                  return newRow;
                }}
              />
            </Box>
          )}

          {/* Info */}
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Note:</strong> Changes will only affect super_admin users. Regular users will continue to see the static menu.
              The menu will refresh automatically after saving.
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      {/* Seed Dialog */}
      <Dialog open={seedDialogOpen} onClose={() => setSeedDialogOpen(false)}>
        <DialogTitle>Seed Menu from Static MenuItems.ts</DialogTitle>
        <DialogContent>
          <Typography>
            This will import the current static menu structure into the database.
            Existing menu items with matching key_name will be updated.
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action will overwrite existing menu items!
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSeedDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSeed} variant="contained" disabled={loading}>
            Seed Menu
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Dialog */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
        <DialogTitle>Reset Menu to Static</DialogTitle>
        <DialogContent>
          <Typography>
            This will deactivate all super_admin database menu items.
            The menu will return to using the static MenuItems.ts file.
          </Typography>
          <Alert severity="error" sx={{ mt: 2 }}>
            This action cannot be undone! You will need to re-seed to get the DB menu back.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleReset} variant="contained" color="error" disabled={loading}>
            Reset Menu
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template Seed Dialog */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Seed Menu from Template</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography>
              This will seed the menu from the selected template:
            </Typography>
            <Alert severity="info">
              <Typography variant="body2">
                <strong>Template:</strong> {SuperAdminMenuMetadata.name}<br />
                <strong>Role:</strong> {SuperAdminMenuMetadata.role}<br />
                <strong>Version:</strong> {SuperAdminMenuMetadata.version}
              </Typography>
            </Alert>
            <Alert severity="success">
              <Typography variant="body2">
                <strong>Idempotent:</strong> Existing items will be updated. No duplicates will be created.
              </Typography>
            </Alert>
            <Typography variant="body2" color="text.secondary">
              {SuperAdminMenuMetadata.description}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSeedFromTemplate} 
            variant="contained" 
            disabled={templateLoading}
            startIcon={templateLoading ? <CircularProgress size={20} /> : <IconDatabase />}
          >
            Seed from Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Menu Item</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{itemToDelete?.label}</strong> ({itemToDelete?.key_name})?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Any child items will be moved to the root level.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteItem} variant="contained" color="error" disabled={loading}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template Reset Dialog */}
      <Dialog open={templateResetDialogOpen} onClose={() => setTemplateResetDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reset Menu to Template</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning">
              <Typography variant="body2">
                <strong>Warning:</strong> This will <strong>DELETE all existing menu items</strong> and reload from the template.
              </Typography>
            </Alert>
            <Typography>
              Template to restore:
            </Typography>
            <Alert severity="info">
              <Typography variant="body2">
                <strong>Template:</strong> {SuperAdminMenuMetadata.name}<br />
                <strong>Role:</strong> {SuperAdminMenuMetadata.role}<br />
                <strong>Version:</strong> {SuperAdminMenuMetadata.version}
              </Typography>
            </Alert>
            <Alert severity="error">
              <Typography variant="body2">
                <strong>This action cannot be undone!</strong> All custom menu items will be lost.
              </Typography>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateResetDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleResetToTemplate} 
            variant="contained" 
            color="warning"
            disabled={templateLoading}
            startIcon={templateLoading ? <CircularProgress size={20} /> : <IconReload />}
            autoFocus
          >
            Reset to Template
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MenuEditor;
