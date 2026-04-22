/**
 * Admin API Service Layer
 * Handles admin/superadmin-level endpoints for system management
 */

import type {
    ActivityLog,
    ApiResponse,
    Church,
    ChurchFilters,
    CreateChurchData,
    PaginatedResponse,
    ProvisionFilters,
    ProvisionLog,
    ProvisionRequest,
    User,
} from '../types/orthodox-metrics.types';
import { apiClient } from './utils/axiosInstance';
  
  class AdminAPI {
    // ===== CHURCH MANAGEMENT APIs =====
    churches = {
      getAll: (filters?: ChurchFilters): Promise<{ churches: Church[] }> =>
        apiClient.get(`/admin/churches${apiClient.buildQueryString(filters)}`),
  
      getById: (id: number): Promise<Church> =>
        apiClient.get<any>(`/admin/churches/${id}`)
          .then(response => {
            // Handle both response formats:
            // 1. { success: true, church: {...} }
            // 2. { success: true, ...churchData }
            if (response.church) {
              return response.church;
            }
            // If church data is spread directly in response, extract it
            const { success, message, error, ...churchData } = response;
            return churchData as Church;
          }),
  
      create: (church: CreateChurchData): Promise<Church> =>
        apiClient.post('/admin/churches', church),
  
      update: (id: number, church: Partial<Church>): Promise<Church> =>
        apiClient.put(`/admin/churches/${id}`, church),
  
      delete: (id: number, deleteDatabase?: boolean): Promise<ApiResponse> =>
        apiClient.delete(`/admin/churches/${id}`, { 
          data: { delete_database: deleteDatabase || false }
        }),
  
      approve: (id: number, notes?: string): Promise<ApiResponse> =>
        apiClient.post(`/admin/churches/${id}/approve`, { notes }),
  
      suspend: (id: number, reason?: string): Promise<ApiResponse> =>
        apiClient.post(`/admin/churches/${id}/suspend`, { reason }),
  
      activate: (id: number): Promise<ApiResponse> =>
        apiClient.post(`/admin/churches/${id}/activate`),
  
      updateStatus: (id: number, active: boolean): Promise<ApiResponse> =>
        apiClient.patch(`/admin/churches/${id}/status`, { active }),
  
      removeAllUsers: (id: number): Promise<ApiResponse> =>
        apiClient.post(`/admin/churches/${id}/remove-all-users`),
  
      // Additional church endpoints found in direct fetch calls
      getActiveChurches: (): Promise<{ churches: Church[] }> =>
        apiClient.get('/admin/churches?is_active=1'),
  
      getChurchesByLanguage: (language: string): Promise<{ churches: Church[] }> =>
        apiClient.get(`/admin/churches?preferred_language=${language}`),
  
      getChurchUsers: (churchId: number): Promise<User[]> =>
        apiClient.get(`/admin/churches/${churchId}/users`),
  
      getChurchRecordCounts: (churchId: number): Promise<any> =>
        apiClient.get(`/admin/churches/${churchId}/record-counts`),
  
      getChurchDatabaseInfo: (churchId: number): Promise<any> =>
        apiClient.get(`/admin/churches/${churchId}/database-info`),
  
      testChurchConnection: (churchId: number): Promise<ApiResponse> =>
        apiClient.post(`/admin/churches/${churchId}/test-connection`),
  
      manageChurchUser: (churchId: number, userId: number, action: string): Promise<ApiResponse> =>
        apiClient.post(`/admin/churches/${churchId}/users/${userId}/${action}`),
  
      resetChurchUserPassword: (churchId: number, userId: number): Promise<ApiResponse> =>
        apiClient.post(`/admin/churches/${churchId}/users/${userId}/reset-password`),
  
      getChurchTables: (churchId: number): Promise<any> =>
        apiClient.get(`/admin/churches/${churchId}/tables`),
  
      createChurchWizard: (data: any): Promise<ApiResponse> =>
        apiClient.post('/admin/churches/wizard', data),
  
      getChurchOverview: (churchId: number): Promise<any> =>
        apiClient.get(`/admin/church/${churchId}/overview`),
  
      getChurchDatabaseRecordCounts: (churchDbId: number): Promise<any> =>
        apiClient.get(`/admin/church-database/${churchDbId}/record-counts`),

        /**
   * Get table columns for a church (handles multiple backend route shapes).
   * Returns a normalized shape: { columns: string[] }
   */
      exportTemplate: (churchId: number, data: {
        table: string;
        language?: string;
        template_slug?: string;
        template_name?: string;
        overwrite?: boolean;
      }): Promise<{ success: boolean; slug: string; template?: any; message?: string }> =>
        apiClient.post(`/admin/churches/${churchId}/export-template`, data),

      getTableColumns: async (churchId: number, table: string): Promise<{ columns: string[]; via?: string }> => {
    const enc = encodeURIComponent;
    const qs = `?table=${enc(table)}`;

    const candidates = [
    // Preferred (api/admin)
    `/api/admin/churches/${churchId}/tables/${enc(table)}/columns`,
    `/api/admin/churches/${churchId}/columns${qs}`,
    `/api/admin/churches/${churchId}/tables/${enc(table)}`,
    `/api/admin/churches/${churchId}/table-columns${qs}`,
    `/api/admin/churches/${churchId}/schema${qs}`,
    `/api/admin/church/${churchId}/tables/${enc(table)}/columns`,
    // Legacy (admin)
    `/admin/churches/${churchId}/tables/${enc(table)}/columns`,
    `/admin/churches/${churchId}/columns${qs}`,
    `/admin/churches/${churchId}/tables/${enc(table)}`,
    `/admin/churches/${churchId}/table-columns${qs}`,
    `/admin/churches/${churchId}/schema${qs}`,
    `/admin/church/${churchId}/tables/${enc(table)}/columns`,
    ];

      let lastErr: any = null;
  for (const path of candidates) {
    try {
      const res = await apiClient.get(path);
      const raw = (res as any)?.columns ?? (res as any)?.data?.columns ?? res;

      // Accept shapes: string[], { column_name,... }[], { columns: [...] }
      let columns: string[] = [];
      if (Array.isArray(raw)) {
        columns = raw.map((c: any) =>
          typeof c === 'string' ? c :
          c?.column_name ?? c?.COLUMN_NAME ?? c?.name ?? c?.Field ?? ''
        ).filter(Boolean);
      } else if (Array.isArray((raw as any)?.columns)) {
        columns = (raw as any).columns.map((c: any) =>
          typeof c === 'string' ? c : c?.column_name ?? c?.COLUMN_NAME ?? c?.name ?? c?.Field ?? ''
        ).filter(Boolean);
      }

      if (columns.length) return { columns, via: path };
    } catch (e) {
      lastErr = e;
    }
  }

  // 2) Second pass: derive from tables listing if it includes schema info
  try {
    // Prefer api/admin; fall back to admin
    const tablesRes =
      await apiClient.get(`/api/admin/churches/${churchId}/tables`)
        .catch(() => apiClient.get(`/admin/churches/${churchId}/tables`));

    const tables = (tablesRes as any)?.tables ?? tablesRes;

    // Accept shapes: string[] of table names, or [{name, columns:[...]}]
    if (Array.isArray(tables)) {
      // If objects with columns
      const withCols = tables.find((t: any) =>
        (t?.name === table || t?.table_name === table) &&
        Array.isArray(t?.columns)
      );
      if (withCols) {
        const cols = withCols.columns.map((c: any) =>
          typeof c === 'string' ? c : c?.column_name ?? c?.COLUMN_NAME ?? c?.name ?? c?.Field ?? ''
        ).filter(Boolean);
        if (cols.length) return { columns: cols, via: 'tables-listing' };
      }

      // If it's just names, no schema available
      if (tables.includes(table)) {
        throw new Error(`Table "${table}" exists but no column endpoint responded`);
      }
    }
  } catch (e) {
    lastErr = e;
  }

  throw lastErr ?? new Error('No matching columns endpoint responded');
},
    };
  
    // ===== USER MANAGEMENT APIs =====
    users = {
      getAll: (filters?: any): Promise<PaginatedResponse<User>> =>
        apiClient.get(`/admin/users${apiClient.buildQueryString(filters)}`),
  
      getById: (id: number): Promise<User> =>
        apiClient.get(`/admin/users/${id}`),
  
      create: (user: Partial<User>): Promise<User> =>
        apiClient.post('/admin/users', user),
  
      update: (id: number, user: Partial<User>): Promise<User> =>
        apiClient.put(`/admin/users/${id}`, user),
  
      delete: (id: number): Promise<ApiResponse> =>
        apiClient.delete(`/admin/users/${id}`),
  
      toggleStatus: (id: number): Promise<ApiResponse> =>
        apiClient.put(`/admin/users/${id}/toggle-status`),
  
      // Additional user endpoints
      adminResetPassword: (userId: number): Promise<ApiResponse> =>
        apiClient.post(`/auth/admin-reset-password`, { userId }),
    };
  
    // ===== ACTIVITY LOGS APIs =====
    activityLogs = {
      getAll: (filters?: any): Promise<PaginatedResponse<ActivityLog>> =>
        apiClient.get(`/admin/activity-logs${apiClient.buildQueryString(filters)}`),

      getById: (id: number): Promise<ActivityLog> =>
        apiClient.get(`/admin/activity-logs/${id}`),

      getStats: (): Promise<any> =>
        apiClient.get('/admin/activity-logs/stats'),

      cleanup: (daysOld: number): Promise<any> =>
        apiClient.delete('/admin/activity-logs/cleanup', { data: { days_old: daysOld } }),
    };
  
    // ===== PROVISIONING APIs =====
    provisioning = {
      getAll: (filters?: ProvisionFilters): Promise<PaginatedResponse<ProvisionLog>> =>
        apiClient.get(`/provisioning${apiClient.buildQueryString(filters)}`),
  
      getById: (id: number): Promise<ProvisionLog> =>
        apiClient.get(`/provisioning/${id}`),
  
      create: (request: ProvisionRequest): Promise<ProvisionLog> =>
        apiClient.post('/provisioning', request),
  
      update: (id: number, request: Partial<ProvisionRequest>): Promise<ProvisionLog> =>
        apiClient.put(`/provisioning/${id}`, request),
  
      delete: (id: number): Promise<ApiResponse> =>
        apiClient.delete(`/provisioning/${id}`),
  
      approve: (id: number, notes?: string): Promise<ApiResponse> =>
        apiClient.post(`/provisioning/${id}/approve`, { notes }),
  
      reject: (id: number, reason?: string): Promise<ApiResponse> =>
        apiClient.post(`/provisioning/${id}/reject`, { reason }),
  
      getStats: (): Promise<any> =>
        apiClient.get('/provisioning/stats'),
    };
  
    // ===== EMAIL APIs =====
    email = {
      sendTestEmail: (emailData: { to: string; subject: string; message: string }): Promise<ApiResponse> =>
        apiClient.post('/email/test', emailData),
  
      sendBulkEmail: (emailData: { recipients: string[]; subject: string; message: string }): Promise<ApiResponse> =>
        apiClient.post('/email/bulk', emailData),
  
      sendOcrResults: (emailData: any): Promise<ApiResponse> =>
        apiClient.post('/email/send-ocr-results', emailData),
    };
  
    // ===== SYSTEM MANAGEMENT APIs =====
    system = {
      getSystemStats: (): Promise<any> =>
        apiClient.get('/admin/system/system-stats'),
  
      getDatabaseHealth: (): Promise<any> =>
        apiClient.get('/admin/system/database-health'),
  
      getServerMetrics: (): Promise<any> =>
        apiClient.get('/admin/system/server-metrics'),
  
      getSystemInfo: (): Promise<any> =>
        apiClient.get('/admin/system/system-info'),
  
      getBackups: (): Promise<any> =>
        apiClient.get('/admin/system/backups'),
  
      performSystemAction: (url: string): Promise<ApiResponse> =>
        apiClient.post(url),
    };
  
    // ===== SERVICE MANAGEMENT APIs =====
    services = {
      getStatus: (): Promise<any> =>
        apiClient.get('/admin/services/status'),
  
      getHealth: (): Promise<any> =>
        apiClient.get('/admin/services/health'),
  
      getRecentActions: (): Promise<any> =>
        apiClient.get('/admin/services/actions/recent'),
  
      performAction: (serviceName: string, action: string): Promise<ApiResponse> =>
        apiClient.post(`/admin/services/${serviceName}/${action}`),
  
      getBackendLogs: (lines: number = 50): Promise<any> =>
        apiClient.get(`/admin/services/backend/logs?lines=${lines}`),
  
      rebuildFrontend: (): Promise<ApiResponse> =>
        apiClient.post('/admin/services/frontend/rebuild'),
  
      getServiceLogs: (serviceName: string, lines: number = 100): Promise<any> =>
        apiClient.get(`/admin/services/${serviceName}/logs?lines=${lines}`),
  
      // OMAI-specific service methods
      getOmaiStatus: (): Promise<any> =>
        apiClient.get('/api/omai/status'),
  
      getOmaiHealth: (): Promise<any> =>
        apiClient.get('/api/omai/health'),
  
      getOmaiLogs: (maxEntries: number = 1000): Promise<any> =>
        apiClient.get(`/api/omai/logs?max=${maxEntries}`),
  
      getOmaiSettings: (): Promise<any> =>
        apiClient.get('/api/omai/settings'),
  
      updateOmaiSettings: (settings: any): Promise<ApiResponse> =>
        apiClient.put('/api/omai/settings', settings),
  
      performOmaiAction: (action: string): Promise<ApiResponse> =>
        apiClient.post(`/api/omai/control/${action}`),
  
      getOmaiStats: (): Promise<any> =>
        apiClient.get('/api/omai/stats'),
  
      getOmaiAgentResults: (componentId: string): Promise<any> =>
        apiClient.get(`/api/omai/agent-results/${componentId}`),
  
      getOmaiAgentMetrics: (): Promise<any> =>
        apiClient.get('/api/omai/agent-metrics'),
    };
  
    // ===== METRICS APIs =====
    metrics = {
      getOrthodMetrics: (): Promise<any> =>
        apiClient.get('/metrics/orthod'),
    };
  
    // ===== MENU MANAGEMENT APIs =====
    menu = {
      getPermissions: (): Promise<any> =>
        apiClient.get('/menu-management/permissions'),
  
      updatePermissions: (permissions: any): Promise<ApiResponse> =>
        apiClient.put('/menu-management/permissions', permissions),
    };
  
    // ===== MENU PERMISSIONS APIs =====
    menuPermissions = {
      getAll: (): Promise<any[]> =>
        apiClient.get('/menu-permissions'),
  
      getById: (menuId: number): Promise<any> =>
        apiClient.get(`/menu-permissions/${menuId}`),
  
      createMenuItem: (data: any): Promise<ApiResponse> =>
        apiClient.post('/menu-permissions/menu-item', data),
    };
  
    // ===== GLOBAL IMAGES APIs =====
    globalImages = {
      getAll: (): Promise<any[]> =>
        apiClient.get('/admin/global-images'),

      upload: (formData: FormData): Promise<ApiResponse> =>
        apiClient.uploadFile('/admin/global-images/upload', formData as any),

      update: (imageId: number, params: any): Promise<ApiResponse> =>
        apiClient.put(`/admin/global-images/${imageId}`, params),

      saveExtracted: (data: any): Promise<ApiResponse> =>
        apiClient.post('/admin/global-images/save-extracted', data),

      // Directory management APIs
      getDirectories: (): Promise<any[]> =>
        apiClient.get('/admin/global-images/directories'),

      addDirectory: (directory: any): Promise<ApiResponse> =>
        apiClient.post('/admin/global-images/directories', directory),

      updateDirectory: (path: string, directory: any): Promise<ApiResponse> =>
        apiClient.put(`/admin/global-images/directories/${encodeURIComponent(path)}`, directory),

      deleteDirectory: (path: string): Promise<ApiResponse> =>
        apiClient.delete(`/admin/global-images/directories/${encodeURIComponent(path)}`),

      scanDirectory: (path: string): Promise<ApiResponse> =>
        apiClient.post(`/admin/global-images/directories/${encodeURIComponent(path)}/scan`),
    };
  
    // ===== BACKUP APIs =====
    backup = {
      getSettings: (): Promise<any> =>
        apiClient.get('/backup/settings'),
  
      updateSettings: (settings: any): Promise<ApiResponse> =>
        apiClient.put('/backup/settings', settings),
  
      getFiles: (): Promise<any[]> =>
        apiClient.get('/backup/files'),
  
      getStorage: (): Promise<any> =>
        apiClient.get('/backup/storage'),
  
      run: (): Promise<ApiResponse> =>
        apiClient.post('/backup/run'),
  
      download: (backupId: string): Promise<{ url: string }> =>
        apiClient.get(`/backup/download/${backupId}`),
  
      delete: (backupId: string): Promise<ApiResponse> =>
        apiClient.delete(`/backup/delete/${backupId}`),
    };
  
    // ===== NFS BACKUP APIs =====
    nfsBackup = {
      getConfig: (): Promise<any> =>
        apiClient.get('/admin/nfs-backup/config'),
  
      updateConfig: (config: any): Promise<ApiResponse> =>
        apiClient.post('/admin/nfs-backup/config', config),
  
      testConnection: (nfsServerIP: string, remotePath: string): Promise<ApiResponse> =>
        apiClient.post('/admin/nfs-backup/test', { nfsServerIP, remotePath }),
  
      mount: (): Promise<ApiResponse> =>
        apiClient.post('/admin/nfs-backup/mount'),
  
      unmount: (): Promise<ApiResponse> =>
        apiClient.post('/admin/nfs-backup/unmount'),
  
      getStatus: (): Promise<any> =>
        apiClient.get('/admin/nfs-backup/status'),
    };
  
    // ===== LOGS APIs =====
    logs = {
      getComponents: (): Promise<any[]> =>
        apiClient.get('/logs/components'),
  
      getAll: (params?: any): Promise<any> =>
        apiClient.get(`/logs${apiClient.buildQueryString(params)}`),
  
      getComponentLevel: (component: string): Promise<any> =>
        apiClient.get(`/logs/components/${component}/level`),
  
      toggleComponent: (component: string): Promise<ApiResponse> =>
        apiClient.post(`/logs/components/${component}/toggle`),
  
      test: (): Promise<ApiResponse> =>
        apiClient.post('/logs/test'),
  
      getFrontendLogs: (): Promise<ApiResponse> =>
        apiClient.post('/logs/frontend'),
    };
  
  
  
    // ===== SESSIONS APIs =====
    sessions = {
      getAll: (filters?: any): Promise<any> =>
        apiClient.get(`/admin/sessions${apiClient.buildQueryString(filters)}`),

      getStats: (): Promise<any> =>
        apiClient.get('/admin/sessions/stats'),

      terminate: (sessionId: string): Promise<ApiResponse> =>
        apiClient.delete(`/admin/sessions/${sessionId}`),

      terminateAllForUser: (userId: number): Promise<ApiResponse> =>
        apiClient.post(`/admin/sessions/user/${userId}/terminate-all`),

      terminateAll: (): Promise<ApiResponse> =>
        apiClient.post('/admin/sessions/terminate-all'),

      cleanup: (daysOld: number = 7): Promise<ApiResponse> =>
        apiClient.post(`/admin/sessions/cleanup`, { days_old: daysOld }),
    };

    // ===== MESSAGES APIs =====
    messages = {
      send: (userId: number, message: string): Promise<ApiResponse> =>
        apiClient.post('/admin/messages/send', { user_id: userId, message }),

      sendToSession: (sessionId: string, message: string): Promise<ApiResponse> =>
        apiClient.post('/admin/messages/send-to-session', { session_id: sessionId, message }),
    };

    // ===== TEST APIs =====
    test = {
      retryFailedJobs: (): Promise<ApiResponse> =>
        apiClient.post('/admin/test/retry-failed-jobs'),
    };

    // ===== TEMPLATE MANAGEMENT APIs =====
    templates = {
      getAll: (filters?: { record_type?: string; is_global?: boolean; church_id?: number }): Promise<{ success: boolean; templates: any[]; count: number }> =>
        apiClient.get(`/admin/templates${apiClient.buildQueryString(filters)}`),

      getBySlug: (slug: string): Promise<{ success: boolean; template: any }> =>
        apiClient.get(`/admin/templates/${slug}`),

      create: (template: {
        name: string;
        slug?: string;
        record_type: 'baptism' | 'marriage' | 'funeral' | 'custom';
        description?: string;
        fields: any[];
        grid_type?: string;
        theme?: string;
        layout_type?: string;
        language_support?: any;
        is_editable?: boolean;
        church_id?: number | null;
        is_global?: boolean;
      }): Promise<{ success: boolean; message: string; template: any }> =>
        apiClient.post('/admin/templates', template),

      update: (slug: string, template: Partial<{
        name: string;
        record_type: 'baptism' | 'marriage' | 'funeral' | 'custom';
        description?: string;
        fields: any[];
        grid_type?: string;
        theme?: string;
        layout_type?: string;
        language_support?: any;
        is_editable?: boolean;
        church_id?: number | null;
        is_global?: boolean;
      }>): Promise<{ success: boolean; message: string; template: any }> =>
        apiClient.put(`/admin/templates/${slug}`, template),

      delete: (slug: string): Promise<{ success: boolean; message: string }> =>
        apiClient.delete(`/admin/templates/${slug}`),
    };
  }

  // Create and export the Admin API instance
  export const adminAPI = new AdminAPI();
  
  export default adminAPI; 
