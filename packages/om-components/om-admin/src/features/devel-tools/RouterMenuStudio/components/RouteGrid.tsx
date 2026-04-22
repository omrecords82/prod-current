/**
 * Route Grid Component
 * MUI DataGrid for displaying and editing routes
 */

import React, { useState } from 'react';
import {
  DataGrid,
  GridColDef,
  GridActionsCellItem,
  GridRowParams,
  GridToolbarContainer,
  GridToolbarExport,
  GridToolbarFilterButton,
  GridToolbarColumnsButton,
} from '@mui/x-data-grid';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Tooltip,
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
  Typography,
  Alert,
} from '@mui/material';
import {
  IconEdit,
  IconTrash,
  IconPlus,
  IconRefresh,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  Route as RouteType,
  CreateRouteData,
  UpdateRouteData,
  routerMenuStudioAPI,
} from '../api';
import { toast } from 'react-toastify';

interface RouteGridProps {
  onSelectRoute?: (route: RouteType) => void;
}

interface EditDialogState {
  open: boolean;
  mode: 'create' | 'edit';
  route?: RouteType;
}

const RouteGrid: React.FC<RouteGridProps> = ({ onSelectRoute }) => {
  const queryClient = useQueryClient();
  const [editDialog, setEditDialog] = useState<EditDialogState>({ open: false, mode: 'create' });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Queries
  const { data: routes = [], isLoading, error, refetch } = useQuery({
    queryKey: ['routes'],
    queryFn: () => routerMenuStudioAPI.getRoutes(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateRouteData) => routerMenuStudioAPI.createRoute(data),
    onSuccess: () => {
      toast.success('Route created successfully');
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      setEditDialog({ open: false, mode: 'create' });
    },
    onError: (error: any) => {
      toast.error(`Failed to create route: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateRouteData }) =>
      routerMenuStudioAPI.updateRoute(id, data),
    onSuccess: () => {
      toast.success('Route updated successfully');
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      setEditDialog({ open: false, mode: 'create' });
    },
    onError: (error: any) => {
      toast.error(`Failed to update route: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, hard = false }: { id: number; hard?: boolean }) =>
      routerMenuStudioAPI.deleteRoute(id, hard),
    onSuccess: () => {
      toast.success('Route deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to delete route: ${error.message}`);
    },
  });

  const handleEdit = (route: RouteType) => {
    setEditDialog({ open: true, mode: 'edit', route });
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this route?')) {
      deleteMutation.mutate({ id });
    }
  };

  const handleHardDelete = (id: number) => {
    if (window.confirm('Are you sure you want to permanently delete this route? This action cannot be undone.')) {
      deleteMutation.mutate({ id, hard: true });
    }
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
            variant="outlined"
          />
        ))}
      </Box>
    );
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString();
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70, type: 'number' },
    {
      field: 'path',
      headerName: 'Path',
      width: 200,
      renderCell: (params) => (
        <Typography variant="body2" fontFamily="monospace" fontSize="0.85rem">
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'component',
      headerName: 'Component',
      width: 250,
      renderCell: (params) => (
        <Typography variant="body2" fontFamily="monospace" fontSize="0.85rem">
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'title',
      headerName: 'Title',
      width: 200,
      renderCell: (params) => params.value || <em style={{ color: '#666' }}>No title</em>,
    },
    {
      field: 'layout',
      headerName: 'Layout',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value || 'default'}
          size="small"
          variant="outlined"
          color={params.value === 'vertical' ? 'primary' : 'default'}
        />
      ),
    },
    {
      field: 'roles',
      headerName: 'Roles',
      width: 180,
      renderCell: (params) => formatRoles(params.value),
      sortable: false,
    },
    {
      field: 'is_active',
      headerName: 'Active',
      width: 100,
      type: 'boolean',
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          size="small"
          color={params.value ? 'success' : 'default'}
          variant={params.value ? 'filled' : 'outlined'}
        />
      ),
    },
    {
      field: 'order_index',
      headerName: 'Order',
      width: 80,
      type: 'number',
    },
    {
      field: 'updated_at',
      headerName: 'Updated',
      width: 160,
      renderCell: (params) => (
        <Typography variant="caption">
          {formatDate(params.value)}
        </Typography>
      ),
    },
    {
      field: 'updated_by',
      headerName: 'Updated By',
      width: 120,
      renderCell: (params) => (
        <Typography variant="caption">
          {params.value || 'system'}
        </Typography>
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      getActions: (params: GridRowParams) => [
        <GridActionsCellItem
          key="edit"
          icon={<IconEdit size={16} />}
          label="Edit"
          onClick={() => handleEdit(params.row)}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<IconTrash size={16} />}
          label="Delete"
          onClick={() => handleDelete(params.row.id)}
          disabled={deleteMutation.isPending}
        />,
      ],
    },
  ];

  const CustomToolbar = () => (
    <GridToolbarContainer>
      <Button
        startIcon={<IconPlus size={16} />}
        onClick={() => setEditDialog({ open: true, mode: 'create' })}
        variant="contained"
        size="small"
      >
        Add Route
      </Button>
      <Button
        startIcon={<IconRefresh size={16} />}
        onClick={() => refetch()}
        variant="outlined"
        size="small"
      >
        Refresh
      </Button>
      <GridToolbarColumnsButton />
      <GridToolbarFilterButton />
      <GridToolbarExport />
    </GridToolbarContainer>
  );

  return (
    <Box sx={{ height: '600px', width: '100%' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load routes: {(error as Error).message}
        </Alert>
      )}

      <DataGrid
        rows={routes}
        columns={columns}
        loading={isLoading}
        checkboxSelection
        disableRowSelectionOnClick
        onRowSelectionModelChange={(model) => setSelectedIds(model as number[])}
        rowSelectionModel={selectedIds}
        slots={{
          toolbar: CustomToolbar,
        }}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 25 },
          },
        }}
        pageSizeOptions={[10, 25, 50, 100]}
      />

      {/* Edit Dialog */}
      <RouteEditDialog
        open={editDialog.open}
        mode={editDialog.mode}
        route={editDialog.route}
        onSubmit={(data) => {
          if (editDialog.mode === 'create') {
            createMutation.mutate(data as CreateRouteData);
          } else if (editDialog.route) {
            updateMutation.mutate({ id: editDialog.route.id, data });
          }
        }}
        onClose={() => setEditDialog({ open: false, mode: 'create' })}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </Box>
  );
};

interface RouteEditDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  route?: RouteType;
  onSubmit: (data: CreateRouteData | UpdateRouteData) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const RouteEditDialog: React.FC<RouteEditDialogProps> = ({
  open,
  mode,
  route,
  onSubmit,
  onClose,
  isLoading,
}) => {
  const [formData, setFormData] = useState<CreateRouteData>({
    path: '',
    component: '',
    title: null,
    description: null,
    layout: 'vertical',
    roles: ['user'],
    is_active: true,
    order_index: 0,
    tags: null,
    meta: null,
  });

  React.useEffect(() => {
    if (route) {
      setFormData({
        path: route.path,
        component: route.component,
        title: route.title,
        description: route.description || '',
        layout: route.layout || 'vertical',
        roles: route.roles,
        is_active: route.is_active,
        order_index: route.order_index,
        tags: route.tags || null,
        meta: route.meta || null,
      });
    } else {
      setFormData({
        path: '',
        component: '',
        title: null,
        description: '',
        layout: 'vertical',
        roles: ['user'],
        is_active: true,
        order_index: 0,
        tags: null,
        meta: null,
      });
    }
  }, [route, open]);

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
          {mode === 'create' ? 'Create Route' : 'Edit Route'}
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              required
              fullWidth
              label="Path"
              value={formData.path}
              onChange={(e) => setFormData(prev => ({ ...prev, path: e.target.value }))}
              placeholder="/example/path"
              helperText="Route path (must start with /)"
            />

            <TextField
              required
              fullWidth
              label="Component"
              value={formData.component}
              onChange={(e) => setFormData(prev => ({ ...prev, component: e.target.value }))}
              placeholder="src/components/ExampleComponent"
              helperText="Component file path"
            />

            <TextField
              fullWidth
              label="Title"
              value={formData.title || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value || null }))}
              placeholder="Human-readable title"
            />

            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value || null }))}
              placeholder="Route description"
            />

            <FormControl fullWidth>
              <InputLabel>Layout</InputLabel>
              <Select
                value={formData.layout}
                onChange={(e) => setFormData(prev => ({ ...prev, layout: e.target.value }))}
                label="Layout"
              >
                <MenuItem value="vertical">Vertical</MenuItem>
                <MenuItem value="horizontal">Horizontal</MenuItem>
                <MenuItem value="fullscreen">Fullscreen</MenuItem>
                <MenuItem value="">Default</MenuItem>
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

export default RouteGrid;
