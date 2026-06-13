/**
 * useOMDailyItems — shared hook for OM Daily item fetching and CRUD.
 * Used by Items page, Board page, and Dashboard.
 */

import { useCallback, useState } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import type { DailyItem } from '../omDailyTypes';

interface UseOMDailyItemsOptions {
  autoFetch?: boolean;
}

export function useOMDailyItems(_opts?: UseOMDailyItemsOptions) {
  const [items, setItems] = useState<DailyItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async (params?: {
    horizon?: string;
    status?: string;
    priority?: string;
    category?: string;
    due?: string;
    search?: string;
    sort?: string;
  }) => {
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      if (params?.horizon) qs.set('horizon', params.horizon);
      if (params?.status) qs.set('status', params.status);
      if (params?.priority) qs.set('priority', params.priority);
      if (params?.category) qs.set('category', params.category);
      if (params?.due) qs.set('due', params.due);
      if (params?.search) qs.set('search', params.search);
      qs.set('sort', params?.sort || 'priority');

      const data = await apiClient.get<any>(`/omai-daily/items?${qs}`);
      setItems(data.items || []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await apiClient.get<any>('/omai-daily/categories');
      setCategories(data.categories || []);
    } catch {}
  }, []);

  const saveItem = useCallback(async (form: Record<string, any>, editId?: number) => {
    const url = editId ? `/omai-daily/items/${editId}` : '/omai-daily/items';
    if (editId) {
      return apiClient.put<any>(url, form);
    } else {
      return apiClient.post<any>(url, form);
    }
  }, []);

  const deleteItem = useCallback(async (id: number) => {
    await apiClient.delete<any>(`/omai-daily/items/${id}`);
  }, []);

  const updateStatus = useCallback(async (id: number, newStatus: string, extra?: Record<string, any>) => {
    return apiClient.patch<any>(`/omai-daily/items/${id}/status`, { status: newStatus, ...extra });
  }, []);

  const startWork = useCallback(async (id: number, branchType: string, agentTool: string) => {
    return apiClient.post<any>(`/omai-daily/items/${id}/start-work`, { branch_type: branchType, agent_tool: agentTool });
  }, []);

  return {
    items, setItems, categories, loading,
    fetchItems, fetchCategories, saveItem, deleteItem, updateStatus, startWork,
  };
}
