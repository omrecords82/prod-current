/**
 * OMDailyBoardPage — Kanban Board page for OM Daily.
 * Fetches all items (no horizon filter) and renders OMDailyKanban.
 */

import React, { useEffect, useState } from 'react';
import { Box, Button, Snackbar, Alert, useTheme } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

import type { DailyItem, ItemFormData } from '../omDailyTypes';
import { DEFAULT_FORM } from '../omDailyTypes';
import ItemFormDialog from '../components/ItemFormDialog';
import { useOMDailyItems } from '../hooks/useOMDailyItems';
import { useToast } from '../hooks/useToast';
import OMDailyKanban from '@/components/apps/kanban/OMDailyKanban';

const OMDailyBoardPage: React.FC = () => {
  const theme = useTheme();
  const { items, fetchItems, saveItem, deleteItem, updateStatus, startWork } = useOMDailyItems();
  const { toast, showToast, closeToast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DailyItem | null>(null);
  const [form, setForm] = useState<ItemFormData>({ ...DEFAULT_FORM });

  // Fetch all items on mount (no horizon filter for full kanban view)
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ─── Event Handlers ────────────────────────────────────────────

  const handleKanbanStatusChange = async (itemId: number, newStatus: string) => {
    try {
      await updateStatus(itemId, newStatus);
      await fetchItems();
    } catch (err: any) {
      const msg = err.message || 'Transition blocked';
      showToast(msg, 'error');
    }
  };

  const handleQuickDone = async (itemId: number) => {
    try {
      await updateStatus(itemId, 'done', { progress: 100 });
      showToast('Item marked as done', 'success');
      await fetchItems();
    } catch {
      showToast('Failed to mark as done', 'error');
    }
  };

  const handleEditItem = (item: DailyItem) => {
    setEditingItem(item);
    setForm({
      title: item.title,
      description: item.description || '',
      horizon: item.horizon,
      status: item.status,
      priority: item.priority,
      category: item.category || '',
      due_date: item.due_date ? item.due_date.split('T')[0] : '',
      agent_tool: item.agent_tool || '',
      branch_type: item.branch_type || '',
      repo_target: (item as any).repo_target || 'orthodoxmetrics',
    });
    setDialogOpen(true);
  };

  const handleDeleteItem = async (id: number) => {
    try {
      await deleteItem(id);
      showToast('Item deleted', 'success');
      await fetchItems();
    } catch {
      showToast('Failed to delete item', 'error');
    }
  };

  const handleNewItem = () => {
    setEditingItem(null);
    setForm({ ...DEFAULT_FORM });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const result = await saveItem(form, editingItem?.id);
      const isNew = !editingItem;
      const itemId = result?.item?.id || result?.id;

      // Auto-create local branch if agent_tool + branch_type are set on new items
      if (isNew && form.agent_tool && form.branch_type && itemId) {
        try {
          const workResult = await startWork(itemId, form.branch_type, form.agent_tool);
          const branch = workResult?.branch || workResult?.item?.github_branch;
          showToast(`Item #${itemId} created — branch: ${branch}`, 'success');
        } catch (branchErr: any) {
          // Backend POST may have already created a remote branch via syncItemToGitHub
          const existingBranch = result?.item?.github_branch;
          if (existingBranch) {
            showToast(`Item #${itemId} created — remote branch: ${existingBranch}`, 'success');
          } else {
            showToast(`Item #${itemId} created (branch failed: ${branchErr.message})`, 'error');
          }
        }
      } else {
        showToast(isNew ? 'Item created' : 'Item updated', 'success');
      }

      setDialogOpen(false);
      setEditingItem(null);
      setForm({ ...DEFAULT_FORM });
      await fetchItems();
    } catch {
      showToast('Failed to save item', 'error');
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setForm({ ...DEFAULT_FORM });
  };

  // ─── Render ────────────────────────────────────────────────────

  return (
    <Box>
      {/* Action bar */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleNewItem}
        >
          New Item
        </Button>
      </Box>

      {/* Kanban board */}
      <OMDailyKanban
        items={items}
        onStatusChange={handleKanbanStatusChange}
        onEditItem={handleEditItem}
        onDeleteItem={handleDeleteItem}
        onQuickDone={handleQuickDone}
      />

      {/* Create/Edit dialog */}
      <ItemFormDialog
        open={dialogOpen}
        editingItem={editingItem}
        form={form}
        onFormChange={setForm}
        onSave={handleSave}
        onClose={handleCloseDialog}
      />

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={closeToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={closeToast} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OMDailyBoardPage;
