/**
 * Menu Tree Component
 * MUI TreeView for displaying and editing menu hierarchy
 */

import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Button,
  Chip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Stack,
  Alert,
  Paper,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  Collapse,
} from '@mui/material';
// import { TreeView, TreeItem } from '@mui/x-tree-view'; // Not working, using custom tree instead
import {
  IconFolder,
  IconFolderOpen,
  IconChevronDown,
  IconChevronRight,
  IconEdit,
  IconTrash,
  IconPlus,
  IconRefresh,
  IconCheck,
  IconX,
  IconMenu2,
} from '@tabler/icons-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  MenuNode,
  CreateMenuData,
  UpdateMenuData,
  ReorderMenuData,
  routerMenuStudioAPI,
} from '../api';
import { toast } from 'react-toastify';

interface MenuTreeProps {
  onSelectMenu?: (menu: MenuNode) => void;
}

interface EditDialogState {
  open: boolean;
  mode: 'create' | 'edit';
  menu?: MenuNode;
  parentId?: number;
}

const MenuTree: React.FC<MenuTreeProps> = ({ onSelectMenu }) => {
  const queryClient = useQueryClient();
  const [editDialog, setEditDialog] = useState<EditDialogState>({ open: false, mode: 'create' });
  const [selectedMenu, setSelectedMenu] = useState<MenuNode | null>(null);
  const [draggedItem, setDraggedItem] = useState<MenuNode | null>(null);

  // Queries
  const { data: menuTree = [], isLoading, error, refetch } = useQuery({
    queryKey: ['menu-tree'],
    queryFn: () => routerMenuStudioAPI.getMenuTree(),
  });

  const { data: flatMenus = [] } = useQuery({
    queryKey: ['menus'],
    queryFn: () => routerMenuStudioAPI.getMenus(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateMenuData) => routerMenuStudioAPI.createMenu(data),
    onSuccess: () => {
      toast.success('Menu item created successfully');
      queryClient.invalidateQueries({ queryKey: ['menu-tree'] });
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      setEditDialog({ open: false, mode: 'create' });
    },
    onError: (error: any) => {
      toast.error(`Failed to create menu item: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMenuData }) =>
      routerMenuStudioAPI.updateMenu(id, data),
    onSuccess: () => {
      toast.success('Menu item updated successfully');
      queryClient.invalidateQueries({ queryKey: ['menu-tree'] });
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      setEditDialog({ open: false, mode: 'create' });
    },
    onError: (error: any) => {
      toast.error(`Failed to update menu item: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, hard = false }: { id: number; hard?: boolean }) =>
      routerMenuStudioAPI.deleteMenu(id, hard),
    onSuccess: () => {
      toast.success('Menu item deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['menu-tree'] });
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      setSelectedMenu(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to delete menu item: ${error.message}`);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (data: ReorderMenuData) => routerMenuStudioAPI.reorderMenus(data),
    onSuccess: () => {
      toast.success('Menu order updated successfully');
      queryClient.invalidateQueries({ queryKey: ['menu-tree'] });
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to reorder menu items: ${error.message}`);
    },
  });

  const renderMenuItem = (menu: MenuNode): React.ReactNode => {
    const hasChildren = menu.children && menu.children.length > 0;
    const isSelected = selectedMenu?.id === menu.id;

    return (
      <Box key={menu.id} sx={{ mb: 0.5 }}>
        <Box
          sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1,
              borderRadius: 1,
              backgroundColor: isSelected ? 'action.selected' : 'transparent',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
              cursor: 'pointer',
            }}
            onClick={() => {
              setSelectedMenu(menu);
              onSelectMenu?.(menu);
            }}
            draggable
            onDragStart={(e) => {
              setDraggedItem(menu);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (draggedItem && draggedItem.id !== menu.id) {
                handleReorder(draggedItem, menu);
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconMenu2 size={16} />
              <Typography variant="body2" fontWeight={menu.is_active ? 'medium' : 'normal'}>
                {menu.label}
              </Typography>
              {!menu.is_active && (
                <Chip label="Inactive" size="small" color="default" variant="outlined" />
              )}
              {menu.path && (
                <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                  {menu.path}
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {menu.roles && menu.roles.length > 0 && (
                <Chip
                  label={`${menu.roles.length} role${menu.roles.length > 1 ? 's' : ''}`}
                  size="small"
                  variant="outlined"
                  color="info"
                />
              )}
              
              <Tooltip title="Add Child">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditDialog({ open: true, mode: 'create', parentId: menu.id });
                  }}
                >
                  <IconPlus size={14} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Edit">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditDialog({ open: true, mode: 'edit', menu });
                  }}
                >
                  <IconEdit size={14} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(menu.id!);
                  }}
                >
                  <IconTrash size={14} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        {hasChildren && (
          <Box sx={{ ml: 2 }}>
            {menu.children!.map(child => renderMenuItem(child))}
          </Box>
        )}
      </Box>
    );
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      deleteMutation.mutate({ id });
    }
  };

  const handleReorder = (draggedItem: MenuNode, targetItem: MenuNode) => {
    // Find all items that need to be updated
    const allItems = flatMenus.filter(item => item.parent_id === targetItem.parent_id);
    
    // Remove the dragged item from its original position
    const remainingItems = allItems.filter(item => item.id !== draggedItem.id);
    
    // Insert the dragged item at the target position
    const targetIndex = remainingItems.findIndex(item => item.id === targetItem.id);
    remainingItems.splice(targetIndex, 0, draggedItem);
    
    // Update order indexes
    const reorderData: ReorderMenuData = {
      items: remainingItems.map((item, index) => ({
        id: item.id!,
        parent_id: item.parent_id,
        order_index: index,
      })),
    };
    
    // Also update the parent relationship if needed
    if (targetItem.id !== draggedItem.id) {
      reorderData.items.forEach(item => {
        if (item.id === draggedItem.id) {
          item.parent_id = targetItem.parent_id;
        }
      });
    }
    
    reorderMutation.mutate(reorderData);
  };

  const formatRoles = (roles: string[]) => {
    if (!roles || roles.length === 0) return 'None';
    
    const roleColors: Record<string, string> = {
      super_admin: 'error',
      admin: 'warning', 
      user: 'info',
      guest: 'default',
    };

    return (
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        {roles.map((role) => (
          <Chip
            key={role}
            label={role}
            size="small"
            color={roleColors[role] || 'default'}
            variant="filled"
          />
        ))}
      </Box>
    );
  };

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load menu tree: {(error as Error).message}
        </Alert>
        <Button onClick={() => refetch()} startIcon={<IconRefresh size={16} />}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="h6" display="flex" alignItems="center" gap={1}>
            <IconMenu2 size={20} />
            Menu Tree
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<IconPlus size={16} />}
              onClick={() => setEditDialog({ open: true, mode: 'create' })}
              variant="contained"
              size="small"
            >
              Add Root Item
            </Button>
            <Button
              startIcon={<IconRefresh size={16} />}
              onClick={() => refetch()}
              variant="outlined"
              size="small"
            >
              Refresh
            </Button>
          </Box>
        </Stack>
      </Box>

      {/* Tree View */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <Typography>Loading menu tree...</Typography>
          </Box>
        ) : (
          <Box sx={{ height: '100%', flexGrow: 1 }}>
            {menuTree.map(renderMenuItem)}
          </Box>
        )}
      </Box>

      {/* Details Panel */}
      {selectedMenu && (
        <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Menu Details
          </Typography>
          
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Label
              </Typography>
              <Typography>{selectedMenu.label}</Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Key Name
              </Typography>
              <Typography fontFamily="monospace">{selectedMenu.key_name}</Typography>
            </Box>

            {selectedMenu.path && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Target Path
                </Typography>
                <Typography fontFamily="monospace">{selectedMenu.path}</Typography>
              </Box>
            )}

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Roles Required
              </Typography>
              {formatRoles(selectedMenu.roles)}
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Status
              </Typography>
              <Chip
                label={selectedMenu.is_active ? 'Active' : 'Inactive'}
                color={selectedMenu.is_active ? 'success' : 'default'}
                size="small"
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Order Index
              </Typography>
              <Typography>{selectedMenu.order_index}</Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Last Updated
              </Typography>
              <Typography variant="caption">
                {new Date(selectedMenu.updated_at).toLocaleString()}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      )}

      {/* Edit Dialog */}
      <MenuEditDialog
        open={editDialog.open}
        mode={editDialog.mode}
        menu={editDialog.menu}
        parentId={editDialog.parentId}
        onSubmit={(data) => {
          if (editDialog.mode === 'create') {
            createMutation.mutate(data as CreateMenuData);
          } else if (editDialog.menu) {
            updateMutation.mutate({ id: editDialog.menu.id, data });
          }
        }}
        onClose={() => setEditDialog({ open: false, mode: 'create' })}
        isLoading={createMutation.isPending || updateMutation.isPending}
        availableParents={flatMenus.filter(m => !m.parent_id && (!editDialog.menu || m.id !== editDialog.menu.id))}
      />
    </Box>
  );
};

interface MenuEditDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  menu?: MenuNode;
  parentId?: number;
  onSubmit: (data: CreateMenuData | UpdateMenuData) => void;
  onClose: () => void;
  isLoading?: boolean;
  availableParents: MenuNode[];
}

const MenuEditDialog: React.FC<MenuEditDialogProps> = ({
  open,
  mode,
  menu,
  parentId,
  onSubmit,
  onClose,
  isLoading,
  availableParents,
}) => {
  const [formData, setFormData] = useState({
    parent_id: parentId || null,
    key_name: '',
    label: '',
    icon: '',
    path: '',
    roles: ['user'],
    is_active: true,
    order_index: 0,
  });

  React.useEffect(() => {
    if (menu) {
      setFormData({
        parent_id: menu.parent_id || null,
        key_name: menu.key_name,
        label: menu.label,
        icon: menu.icon || '',
        path: menu.path || '',
        roles: menu.roles,
        is_active: menu.is_active,
        order_index: menu.order_index,
      });
    } else {
      setFormData({
        parent_id: parentId || null,
        key_name: '',
        label: '',
        icon: '',
        path: '',
        roles: ['user'],
        is_active: true,
        order_index: 0,
      });
    }
  }, [menu, parentId, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleAddRole = () => {
    const newRole = prompt('Enter role name:');
    if (newRole && !formData.roles.includes(newRole)) {
      setFormData(prev => ({
        ...prev,
        roles: [...prev.roles, newRole]
      }));
    }
  };

  const handleRemoveRole = (roleToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.filter(role => role !== roleToRemove)
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {mode === 'create' ? 'Create Menu Item' : 'Edit Menu Item'}
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              required
              fullWidth
              label="Label"
              value={formData.label}
              onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
              placeholder="Menu item label"
            />

            <TextField
              required
              fullWidth
              label="Key Name"
              value={formData.key_name}
              onChange={(e) => setFormData(prev => ({ ...prev, key_name: e.target.value }))}
              placeholder="unique-key-name"
              helperText="Unique key for this menu item (used internally)"
            />

            <TextField
              fullWidth
              label="Icon"
              value={formData.icon}
              onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
              placeholder="IconName"
              helperText="Icon name (from icon library)"
            />

            <TextField
              fullWidth
              label="Path"
              value={formData.path}
              onChange={(e) => setFormData(prev => ({ ...prev, path: e.target.value }))}
              placeholder="/target/path"
              helperText="Target route path (optional)"
            />

            <FormControl fullWidth>
              <InputLabel>Parent Menu</InputLabel>
              <Select
                value={formData.parent_id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, parent_id: e.target.value || null }))}
                label="Parent Menu"
              >
                <MenuItem value="">Root Level</MenuItem>
                {availableParents.map((parent) => (
                  <MenuItem key={parent.id} value={parent.id}>
                    {parent.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Roles Required
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                {formData.roles.map((role) => (
                  <Chip
                    key={role}
                    label={role}
                    onDelete={() => handleRemoveRole(role)}
                    size="small"
                  />
                ))}
              </Box>
              <Button
                size="small"
                onClick={handleAddRole}
                startIcon={<IconPlus size={14} />}
              >
                Add Role
              </Button>
            </Box>

            <Stack direction="row" spacing={3}>
              <TextField
                type="number"
                label="Order Index"
                value={formData.order_index}
                onChange={(e) => setFormData(prev => ({ ...prev, order_index: parseInt(e.target.value) || 0 }))}
                inputProps={{ min: 0 }}
                sx={{ width: 150 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                }
                label="Active"
              />
            </Stack>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>
            <IconX size={16} style={{ marginRight: 8 }} />
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            startIcon={<IconCheck size={16} />}
          >
            {isLoading ? 'Saving...' : (mode === 'create' ? 'Create' : 'Update')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default MenuTree;
