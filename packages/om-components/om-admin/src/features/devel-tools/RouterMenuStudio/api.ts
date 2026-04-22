/**
 * Router/Menu Studio API Client
 * Frontend API client for Router/Menu Studio functionality
 */

import { apiClient } from '@/api/utils/axiosInstance';

// Types for the API responses
export interface Route {
  id: number;
  path: string;
  component: string;
  title: string | null;
  description?: string | null;
  layout?: string | null;
  roles: string[];
  is_active: boolean;
  order_index: number;
  tags?: string[] | null;
  meta?: Record<string, unknown> | null;
  created_at: string | Date;
  updated_at: string | Date;
  updated_by?: string | null;
}

export interface MenuNode {
  id: number;
  parent_id?: number | null;
  key_name: string;
  label: string;
  icon?: string | null;
  path?: string | null;
  roles: string[];
  is_active: boolean;
  order_index: number;
  meta?: Record<string, unknown> | null;
  created_at: string | Date;
  updated_at: string | Date;
  updated_by?: string | null;
  children?: MenuNode[];
}

export interface ApiResponse<T> {
  ok: boolean;
  reason?: string;
  errors?: any[];
  routes?: Route[]; // For routes endpoints
  menus?: MenuNode[]; // For menus list endpoint
  tree?: MenuNode[]; // For menu tree endpoint
  route?: Route; // For single route
  menu?: MenuNode; // For single menu
}

export interface CreateRouteData {
  path: string;
  component: string;
  title: string | null;
  description?: string | null;
  layout?: string | null;
  roles: string[];
  is_active: boolean;
  order_index: number;
  tags?: string[] | null;
  meta?: Record<string, unknown> | null;
}

export interface UpdateRouteData extends Partial<CreateRouteData> {}

export interface CreateMenuData {
  parent_id?: number | null;
  key_name: string;
  label: string;
  icon?: string | null;
  path?: string | null;
  roles: string[];
  is_active: boolean;
  order_index: number;
  meta?: Record<string, unknown> | null;
}

export interface UpdateMenuData extends Partial<CreateMenuData> {}

export interface ReorderMenuData {
  items: Array<{
    id: number;
    parent_id?: number | null;
    order_index: number;
  }>;
}

export interface RoutesQuery {
  q?: string;
  is_active?: string | null;
  limit?: string;
  offset?: string;
  sort?: string;
  dir?: string;
}

export interface MenusQuery extends RoutesQuery {}

class RouterMenuStudioAPI {
  private basePath = '/studio';

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.basePath}${endpoint}`;
    const method = (options.method || 'GET').toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';

    try {
      const body = options.body ? JSON.parse(options.body as string) : undefined;
      let data: any;
      if (method === 'get' || method === 'delete') {
        data = await apiClient[method]<any>(url);
      } else {
        data = await apiClient[method]<any>(url, body);
      }
      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Routes API
  async getRoutes(query: RoutesQuery = {}): Promise<Route[]> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = params.toString() ? `/routes?${params.toString()}` : '/routes';
    const response = await this.request<Route[]>(endpoint);
    return response.routes || [];
  }

  async createRoute(data: CreateRouteData): Promise<Route> {
    const response = await this.request<Route>('/routes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.route!;
  }

  async updateRoute(id: number, data: UpdateRouteData): Promise<Route> {
    const response = await this.request<Route>(`/routes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.route!;
  }

  async deleteRoute(id: number, hard = false): Promise<void> {
    const endpoint = hard ? `/routes/${id}?hard=1` : `/routes/${id}`;
    await this.request(endpoint, {
      method: 'DELETE',
    });
  }

  // Menus API
  async getMenuTree(): Promise<MenuNode[]> {
    const response = await this.request<MenuNode[]>('/menus/tree');
    return response.tree || [];
  }

  async getMenus(query: MenusQuery = {}): Promise<MenuNode[]> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = params.toString() ? `/menus?${params.toString()}` : '/menus';
    const response = await this.request<MenuNode[]>(endpoint);
    return response.menus || [];
  }

  async createMenu(data: CreateMenuData): Promise<MenuNode> {
    const response = await this.request<MenuNode>('/menus', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.menu!;
  }

  async updateMenu(id: number, data: UpdateMenuData): Promise<MenuNode> {
    const response = await this.request<MenuNode>(`/menus/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    return response.menu!;
  }

  async deleteMenu(id: number, hard = false): Promise<void> {
    const endpoint = hard ? `/menus/${id}?hard=1` : `/menus/${id}`;
    await this.request(endpoint, {
      method: 'DELETE',
    });
  }

  async reorderMenus(data: ReorderMenuData): Promise<void> {
    await this.request('/menus/reorder', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Export singleton instance
export const routerMenuStudioAPI = new RouterMenuStudioAPI();

// Export individual methods for convenience
export const {
  getRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
  getMenuTree,
  getMenus,
  createMenu,
  updateMenu,
  deleteMenu,
  reorderMenus,
} = routerMenuStudioAPI;
