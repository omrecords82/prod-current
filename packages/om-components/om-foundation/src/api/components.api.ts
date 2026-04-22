/**
 * Components API Service for OrthodMetrics
 * Handles component management, discovery, and dynamic loading
 */

import { apiJson } from '@/shared/lib/apiClient';

// Component types
export interface Component {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  tags: string[];
  version: string;
  author: string;
  filePath: string;
  isActive: boolean;
  isSystem: boolean;
  dependencies: string[];
  props: ComponentProp[];
  examples: ComponentExample[];
  createdAt: string;
  updatedAt: string;
  lastUsed?: string;
  usageCount: number;
}

export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: any;
  description: string;
  options?: string[];
}

export interface ComponentExample {
  id: string;
  title: string;
  description: string;
  code: string;
  props: Record<string, any>;
  preview?: string;
}

export interface ComponentCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
  componentCount: number;
  order: number;
}

export interface ComponentFilters {
  search?: string;
  category?: string;
  tags?: string[];
  isActive?: boolean;
  isSystem?: boolean;
  author?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ComponentResponse {
  components: Component[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ComponentUsage {
  componentId: string;
  componentName: string;
  usageCount: number;
  lastUsed: string;
  pages: Array<{
    path: string;
    count: number;
  }>;
}

export interface ComponentDependency {
  id: string;
  name: string;
  version: string;
  type: 'npm' | 'local' | 'peer';
  isInstalled: boolean;
  isRequired: boolean;
}

export interface ComponentBundle {
  id: string;
  name: string;
  description: string;
  components: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Components API class
export class ComponentsAPI {
  private baseUrl = '/api/components';

  /**
   * Get all components with filters
   */
  async getComponents(filters: ComponentFilters = {}): Promise<ComponentResponse> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.category) params.append('category', filters.category);
    if (filters.tags?.length) params.append('tags', filters.tags.join(','));
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.isSystem !== undefined) params.append('isSystem', filters.isSystem.toString());
    if (filters.author) params.append('author', filters.author);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl;
    
    return apiJson<ComponentResponse>(url);
  }

  /**
   * Get component by ID
   */
  async getComponent(id: string): Promise<Component> {
    return apiJson<Component>(`${this.baseUrl}/${id}`);
  }

  /**
   * Create new component
   */
  async createComponent(component: Omit<Component, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<Component> {
    return apiJson<Component>(`${this.baseUrl}`, {
      method: 'POST',
      body: JSON.stringify(component)
    });
  }

  /**
   * Update component
   */
  async updateComponent(id: string, component: Partial<Component>): Promise<Component> {
    return apiJson<Component>(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(component)
    });
  }

  /**
   * Delete component
   */
  async deleteComponent(id: string): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Toggle component active status
   */
  async toggleComponentStatus(id: string, isActive: boolean): Promise<Component> {
    return apiJson<Component>(`${this.baseUrl}/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive })
    });
  }

  /**
   * Get component categories
   */
  async getCategories(): Promise<ComponentCategory[]> {
    return apiJson<ComponentCategory[]>(`${this.baseUrl}/categories`);
  }

  /**
   * Create new category
   */
  async createCategory(category: Omit<ComponentCategory, 'id' | 'componentCount'>): Promise<ComponentCategory> {
    return apiJson<ComponentCategory>(`${this.baseUrl}/categories`, {
      method: 'POST',
      body: JSON.stringify(category)
    });
  }

  /**
   * Update category
   */
  async updateCategory(id: string, category: Partial<ComponentCategory>): Promise<ComponentCategory> {
    return apiJson<ComponentCategory>(`${this.baseUrl}/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(category)
    });
  }

  /**
   * Delete category
   */
  async deleteCategory(id: string): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/categories/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Get component usage statistics
   */
  async getComponentUsage(componentId?: string): Promise<ComponentUsage[]> {
    const url = componentId ? `${this.baseUrl}/usage/${componentId}` : `${this.baseUrl}/usage`;
    return apiJson<ComponentUsage[]>(url);
  }

  /**
   * Get component dependencies
   */
  async getComponentDependencies(componentId: string): Promise<ComponentDependency[]> {
    return apiJson<ComponentDependency[]>(`${this.baseUrl}/${componentId}/dependencies`);
  }

  /**
   * Install component dependencies
   */
  async installDependencies(componentId: string): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/${componentId}/dependencies/install`, {
      method: 'POST'
    });
  }

  /**
   * Get component bundles
   */
  async getBundles(): Promise<ComponentBundle[]> {
    return apiJson<ComponentBundle[]>(`${this.baseUrl}/bundles`);
  }

  /**
   * Create component bundle
   */
  async createBundle(bundle: Omit<ComponentBundle, 'id' | 'createdAt' | 'updatedAt'>): Promise<ComponentBundle> {
    return apiJson<ComponentBundle>(`${this.baseUrl}/bundles`, {
      method: 'POST',
      body: JSON.stringify(bundle)
    });
  }

  /**
   * Update component bundle
   */
  async updateBundle(id: string, bundle: Partial<ComponentBundle>): Promise<ComponentBundle> {
    return apiJson<ComponentBundle>(`${this.baseUrl}/bundles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(bundle)
    });
  }

  /**
   * Delete component bundle
   */
  async deleteBundle(id: string): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/bundles/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Scan for new components
   */
  async scanComponents(): Promise<{
    found: number;
    added: number;
    updated: number;
    errors: string[];
  }> {
    return apiJson(`${this.baseUrl}/scan`, {
      method: 'POST'
    });
  }

  /**
   * Get component source code
   */
  async getComponentSource(id: string): Promise<{
    content: string;
    language: string;
    size: number;
  }> {
    return apiJson(`${this.baseUrl}/${id}/source`);
  }

  /**
   * Update component source code
   */
  async updateComponentSource(id: string, content: string): Promise<Component> {
    return apiJson<Component>(`${this.baseUrl}/${id}/source`, {
      method: 'PUT',
      body: JSON.stringify({ content })
    });
  }

  /**
   * Validate component
   */
  async validateComponent(id: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    return apiJson(`${this.baseUrl}/${id}/validate`);
  }

  /**
   * Get component preview
   */
  async getComponentPreview(id: string, props: Record<string, any> = {}): Promise<{
    html: string;
    css: string;
    js: string;
  }> {
    return apiJson(`${this.baseUrl}/${id}/preview`, {
      method: 'POST',
      body: JSON.stringify({ props })
    });
  }

  /**
   * Export component
   */
  async exportComponent(id: string, format: 'json' | 'tsx' | 'jsx' = 'json'): Promise<Blob> {
    return apiJson<Blob>(`${this.baseUrl}/${id}/export?format=${format}`);
  }

  /**
   * Import component
   */
  async importComponent(file: File): Promise<Component> {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiJson<Component>(`${this.baseUrl}/import`, {
      method: 'POST',
      body: formData
    });
  }

  /**
   * Get component analytics
   */
  async getComponentAnalytics(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<{
    totalComponents: number;
    activeComponents: number;
    usageStats: Array<{
      date: string;
      count: number;
    }>;
    topComponents: Array<{
      id: string;
      name: string;
      usage: number;
    }>;
  }> {
    return apiJson(`${this.baseUrl}/analytics?period=${period}`);
  }
}

// Export singleton instance
export const componentsAPI = new ComponentsAPI();
