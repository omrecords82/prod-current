/**
 * Metrics API Service Layer
 * Handles record management, OCR, calendar, invoices, dashboard, and certificates
 */

import type {
  LiturgicalDay,
  CalendarFilters,
  BaptismRecord,
  MarriageRecord,
  FuneralRecord,
  Invoice,
  InvoiceFilters,
  CreateInvoiceData,
  OCRUpload,
  OCRResult,
  OCRFilters,
  DashboardMetrics,
  DropdownOptions,
  AppConfig,
  SupportedLanguage,
  ExportOptions,
  FileUploadProgress,
  ApiResponse,
  PaginatedResponse,
} from '@/types/orthodox-metrics.types';
import { apiClient } from '@/api/utils/axiosInstance';

class MetricsAPI {
  // ===== LITURGICAL CALENDAR APIs =====
  calendar = {
    getCalendar: (filters: CalendarFilters): Promise<LiturgicalDay[]> =>
      apiClient.get(`/calendar${apiClient.buildQueryString(filters)}`),

    getDayData: (date: string, language: SupportedLanguage = 'en'): Promise<LiturgicalDay> =>
      apiClient.get(`/calendar/day/${date}?lang=${language}`),

    getCurrentSeason: (language: SupportedLanguage = 'en'): Promise<{ season: string; description: string }> =>
      apiClient.get(`/calendar/season/current?lang=${language}`),

    getPaschaDate: (year: number): Promise<{ date: string; julian_date: string }> =>
      apiClient.get(`/calendar/pascha/${year}`),

    getFeasts: (year: number, language: SupportedLanguage = 'en'): Promise<any[]> =>
      apiClient.get(`/calendar/feasts/${year}?lang=${language}`),

    getSaints: (date: string, language: SupportedLanguage = 'en'): Promise<any[]> =>
      apiClient.get(`/calendar/saints/${date}?lang=${language}`),
  };

  // ===== RECORDS MANAGEMENT APIs =====
  records = {
    // Baptism Records
    getBaptismRecords: (filters?: any): Promise<PaginatedResponse<BaptismRecord>> =>
      apiClient.get(`/baptism-records${apiClient.buildQueryString(filters)}`),

    getBaptismRecord: (id: number): Promise<BaptismRecord> =>
      apiClient.get(`/baptism-records/${id}`),

    createBaptismRecord: (record: Partial<BaptismRecord>): Promise<BaptismRecord> =>
      apiClient.post('/baptism-records', record),

    updateBaptismRecord: (id: number, record: Partial<BaptismRecord>): Promise<BaptismRecord> =>
      apiClient.put(`/baptism-records/${id}`, record),

    deleteBaptismRecord: (id: number): Promise<ApiResponse> =>
      apiClient.delete(`/baptism-records/${id}`),

    // Marriage Records
    getMarriageRecords: (filters?: any): Promise<PaginatedResponse<MarriageRecord>> =>
      apiClient.get(`/marriage-records${apiClient.buildQueryString(filters)}`),

    getMarriageRecord: (id: number): Promise<MarriageRecord> =>
      apiClient.get(`/marriage-records/${id}`),

    createMarriageRecord: (record: Partial<MarriageRecord>): Promise<MarriageRecord> =>
      apiClient.post('/marriage-records', record),

    updateMarriageRecord: (id: number, record: Partial<MarriageRecord>): Promise<MarriageRecord> =>
      apiClient.put(`/marriage-records/${id}`, record),

    deleteMarriageRecord: (id: number): Promise<ApiResponse> =>
      apiClient.delete(`/marriage-records/${id}`),

    // Funeral Records
    getFuneralRecords: (filters?: any): Promise<PaginatedResponse<FuneralRecord>> =>
      apiClient.get(`/funeral-records${apiClient.buildQueryString(filters)}`),

    getFuneralRecord: (id: number): Promise<FuneralRecord> =>
      apiClient.get(`/funeral-records/${id}`),

    createFuneralRecord: (record: Partial<FuneralRecord>): Promise<FuneralRecord> =>
      apiClient.post('/funeral-records', record),

    updateFuneralRecord: (id: number, record: Partial<FuneralRecord>): Promise<FuneralRecord> =>
      apiClient.put(`/funeral-records/${id}`, record),

    deleteFuneralRecord: (id: number): Promise<ApiResponse> =>
      apiClient.delete(`/funeral-records/${id}`),

    // Generic Record Operations
    getDropdownOptions: (recordType: string, field: string): Promise<DropdownOptions> =>
      apiClient.get(`/${recordType}-records/dropdown-options/${field}`),

    exportRecords: (recordType: string, filters?: any, options?: ExportOptions): Promise<{ url: string }> =>
      apiClient.post(`/${recordType}-records/export`, { filters, options }),

    importRecords: (recordType: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse> =>
      apiClient.uploadFile(`/${recordType}-records/import`, file, undefined, onProgress),
  };

  // ===== INVOICE MANAGEMENT APIs =====
  invoices = {
    getAll: (filters?: InvoiceFilters): Promise<PaginatedResponse<Invoice>> =>
      apiClient.get(`/invoices${apiClient.buildQueryString(filters)}`),

    getById: (id: number): Promise<Invoice> =>
      apiClient.get(`/invoices/${id}`),

    create: (invoice: CreateInvoiceData): Promise<Invoice> =>
      apiClient.post('/invoices', invoice),

    update: (id: number, invoice: Partial<Invoice>): Promise<Invoice> =>
      apiClient.put(`/invoices/${id}`, invoice),

    delete: (id: number): Promise<ApiResponse> =>
      apiClient.delete(`/invoices/${id}`),

    send: (id: number): Promise<ApiResponse> =>
      apiClient.post(`/invoices/${id}/send`),

    markAsPaid: (id: number): Promise<ApiResponse> =>
      apiClient.post(`/invoices/${id}/mark-paid`),

    generatePDF: (id: number): Promise<{ url: string }> =>
      apiClient.post(`/invoices/${id}/pdf`),

    getStats: (): Promise<any> =>
      apiClient.get('/invoices/stats'),
  };

  // ===== OCR APIs =====
  ocr = {
    getAll: (filters?: OCRFilters): Promise<PaginatedResponse<OCRUpload>> =>
      apiClient.get(`/ocr${apiClient.buildQueryString(filters)}`),

    getById: (id: number): Promise<OCRUpload> =>
      apiClient.get(`/ocr/${id}`),

    upload: (file: File, onProgress?: (progress: number) => void): Promise<OCRUpload> =>
      apiClient.uploadFile('/ocr/upload', file, undefined, onProgress),

    process: (id: number): Promise<OCRResult> =>
      apiClient.post(`/ocr/${id}/process`),

    getResults: (id: number): Promise<OCRResult> =>
      apiClient.get(`/ocr/${id}/results`),

    delete: (id: number): Promise<ApiResponse> =>
      apiClient.delete(`/ocr/${id}`),

    getStats: (): Promise<any> =>
      apiClient.get('/ocr/stats'),

    // Additional OCR endpoints found in direct fetch calls
    testOcr: (data: any): Promise<ApiResponse> =>
      apiClient.post('/test-ocr', data),

    processPublic: (data: any): Promise<ApiResponse> =>
      apiClient.post('/public/ocr/process', data),

    // Church-specific OCR endpoints
    getChurchSettings: (churchId: number): Promise<any> =>
      apiClient.get(`/church/${churchId}/ocr/settings`),

    updateChurchSettings: (churchId: number, settings: any): Promise<ApiResponse> =>
      apiClient.put(`/church/${churchId}/ocr/settings`, settings),

    getChurchJobs: (churchId: number): Promise<any[]> =>
      apiClient.get(`/church/${churchId}/ocr/jobs`),

    uploadToChurch: (churchId: number, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse> =>
      apiClient.uploadFile(`/church/${churchId}/ocr/upload`, file, undefined, onProgress),

    retryChurchJob: (churchId: number, jobId: number): Promise<ApiResponse> =>
      apiClient.post(`/church/${churchId}/ocr/jobs/${jobId}/retry`),

    deleteChurchJob: (churchId: number, jobId: number): Promise<ApiResponse> =>
      apiClient.delete(`/church/${churchId}/ocr/jobs/${jobId}`),

    getChurchJob: (churchId: number, jobId: number): Promise<any> =>
      apiClient.get(`/church/${churchId}/ocr/jobs/${jobId}`),

    exportChurchJob: (churchId: number, jobId: number): Promise<{ url: string }> =>
      apiClient.get(`/church/${churchId}/ocr/jobs/${jobId}/export`),
  };

  // ===== DASHBOARD APIs =====
  dashboard = {
    getMetrics: (): Promise<DashboardMetrics> =>
      apiClient.get('/dashboard/metrics'),

    getRecentActivity: (): Promise<any[]> =>
      apiClient.get('/dashboard/recent-activity'),

    getCharts: (): Promise<any> =>
      apiClient.get('/dashboard/charts'),
  };

  // ===== UTILITY APIs =====
  utils = {
    getAppConfig: (): Promise<AppConfig> =>
      apiClient.get('/utils/config'),

    getSupportedLanguages: (): Promise<SupportedLanguage[]> =>
      apiClient.get('/utils/languages'),

    validateEmail: (email: string): Promise<{ valid: boolean }> =>
      apiClient.post('/utils/validate-email', { email }),

    generatePassword: (): Promise<{ password: string }> =>
      apiClient.get('/utils/generate-password'),

    getSystemInfo: (): Promise<any> =>
      apiClient.get('/utils/system-info'),
  };

  // ===== CERTIFICATE APIs =====
  certificates = {
    generateBaptismCertificate: (recordId: number, templateId?: number): Promise<{ url: string }> =>
      apiClient.post(`/certificates/baptism/${recordId}`, { template_id: templateId }),

    generateMarriageCertificate: (recordId: number, templateId?: number): Promise<{ url: string }> =>
      apiClient.post(`/certificates/marriage/${recordId}`, { template_id: templateId }),

    generateFuneralCertificate: (recordId: number, templateId?: number): Promise<{ url: string }> =>
      apiClient.post(`/certificates/funeral/${recordId}`, { template_id: templateId }),
  };
}

// Create and export the Metrics API instance
export const metricsAPI = new MetricsAPI();

export default metricsAPI;
