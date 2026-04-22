/**
 * accountApi.ts — Typed API layer for all Account Hub pages.
 *
 * Centralizes fetch calls, response unpacking, and error extraction so that
 * individual pages don't repeat the same patterns.
 *
 * All functions use session-cookie auth (credentials: 'include') which is
 * consistent with the rest of the Account Hub.
 */

import { extractChurchSettings, getChurchDisplayName } from './accountConstants';
import { apiClient } from '@/api/utils/axiosInstance';

// ── Shared Helpers ──────────────────────────────────────────────────────────

/** Extract a user-safe error message from any API response body. */
export function extractErrorMessage(data: any, fallback = 'An error occurred.'): string {
  return (
    data?.message ||
    data?.data?.message ||
    data?.error?.message ||
    data?.error ||
    fallback
  );
}

/**
 * Thin wrapper around apiClient that maps legacy RequestInit-style calls
 * to the appropriate apiClient method.
 */
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const apiUrl = url.startsWith('/api') ? url.slice(4) : url;
  const method = (init?.method || 'GET').toUpperCase();

  let body: any = undefined;
  if (init?.body) {
    if (init.body instanceof FormData) {
      body = init.body;
    } else if (typeof init.body === 'string') {
      try { body = JSON.parse(init.body); } catch { body = init.body; }
    }
  }

  switch (method) {
    case 'POST': return apiClient.post<T>(apiUrl, body);
    case 'PUT':  return apiClient.put<T>(apiUrl, body);
    case 'DELETE': return apiClient.delete<T>(apiUrl);
    default:     return apiClient.get<T>(apiUrl);
  }
}

// ── Response Types ──────────────────────────────────────────────────────────

/** GET /api/user/profile */
export interface ProfileResponse {
  success: boolean;
  profile: {
    display_name: string;
    email: string;
    phone: string;
    company: string;
    location: string;
    first_name: string;
    last_name: string;
  };
}

/** GET /api/user/profile/security-status */
export interface SecurityStatusResponse {
  success: boolean;
  security: SecurityStatus;
}

export interface SecurityStatus {
  account_created_at: string | null;
  last_login: string | null;
  password_changed_at: string | null;
  email_verified: boolean;
  verification_status: 'none' | 'pending' | 'verified';
  verification_sent_at: string | null;
  active_sessions: number;
  two_factor_enabled: boolean;
}

/** PUT /api/user/profile/password response */
export interface ChangePasswordResponse {
  success: boolean;
  message: string;
  sessions_revoked: number;
}

/** POST /api/user/profile/resend-verification response */
export interface ResendVerificationResponse {
  success: boolean;
  message: string;
  retry_after_seconds?: number;
}

/** GET /api/user/sessions */
export interface SessionData {
  session_id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
}

export interface SessionsResponse {
  success: boolean;
  data: { sessions: SessionData[] };
}

/** POST /api/user/sessions/revoke-others */
export interface RevokeOthersResponse {
  success: boolean;
  message: string;
  data?: { revoked_count: number };
}

/** CRM match data returned alongside church settings. */
export interface CrmMatch {
  id: number;
  jurisdiction: string | null;
  jurisdiction_id: number | null;
  jurisdiction_name: string | null;
  jurisdiction_abbr: string | null;
  jurisdiction_calendar_type: string | null;
}

/** GET /api/my/church-settings — the raw response shape. */
export interface ChurchSettingsRaw {
  success: boolean;
  data?: { settings: Record<string, any>; crm_match?: CrmMatch | null };
  settings?: Record<string, any>;
  crm_match?: CrmMatch | null;
}

/** Notification preference row from GET /api/notifications/preferences */
export interface NotificationPref {
  type_name: string;
  category: string;
  email_enabled: number | boolean;
  push_enabled: number | boolean;
  in_app_enabled: number | boolean;
  sms_enabled: number | boolean;
  frequency: string;
}

export interface NotificationPrefsResponse {
  success: boolean;
  preferences: NotificationPref[];
}

/** OCR preferences shape from GET /api/my/ocr-preferences */
export interface OcrPreferences {
  language: string;
  defaultLanguage: string;
  confidenceThreshold: number;
  deskew: boolean;
  removeNoise: boolean;
  preprocessImages: boolean;
  documentProcessing: {
    spellingCorrection: string;
    extractAllText: string;
    improveFormatting: string;
  };
  documentDeletion: {
    deleteAfter: number;
    deleteUnit: string;
  };
}

export interface OcrPrefsResponse {
  success: boolean;
  preferences: OcrPreferences;
  ocrEnabled: boolean;
}

// ── Profile & Security ──────────────────────────────────────────────────────

export const profileApi = {
  /** GET /api/user/profile */
  async getProfile(): Promise<ProfileResponse> {
    return request<ProfileResponse>('/api/user/profile');
  },

  /** PUT /api/user/profile */
  async updateProfile(fields: {
    display_name: string;
    phone: string;
    company: string;
    location: string;
  }): Promise<{ success: boolean; message?: string }> {
    return request('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(fields),
    });
  },

  /** GET /api/user/profile/security-status */
  async getSecurityStatus(): Promise<SecurityStatusResponse> {
    return request<SecurityStatusResponse>('/api/user/profile/security-status');
  },

  /** PUT /api/user/profile/password */
  async changePassword(payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<ChangePasswordResponse> {
    return request<ChangePasswordResponse>('/api/user/profile/password', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  /** POST /api/user/profile/resend-verification */
  async resendVerification(): Promise<ResendVerificationResponse> {
    return request<ResendVerificationResponse>('/api/user/profile/resend-verification', {
      method: 'POST',
    });
  },
};

// ── Church Settings & Branding ──────────────────────────────────────────────

export const churchApi = {
  /**
   * GET /api/my/church-settings — returns normalized settings object.
   * Uses the shared extractChurchSettings helper to handle response shape variations.
   */
  async getSettings<T = Record<string, any>>(): Promise<T | null> {
    const data = await request<ChurchSettingsRaw>('/api/my/church-settings');
    return extractChurchSettings<T>(data);
  },

  /**
   * GET /api/my/church-settings — returns full response including crm_match.
   */
  async getSettingsWithCrm(): Promise<{ settings: Record<string, any> | null; crm_match: CrmMatch | null }> {
    const data = await request<ChurchSettingsRaw>('/api/my/church-settings');
    const settings = extractChurchSettings<Record<string, any>>(data);
    const crm_match = data?.data?.crm_match || data?.crm_match || null;
    return { settings, crm_match };
  },

  /** PUT /api/my/church-settings */
  async updateSettings(payload: Record<string, any>): Promise<{ success: boolean; message?: string }> {
    return request('/api/my/church-settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  /** POST /api/my/church-branding/:field — upload an image. */
  async uploadBrandingAsset(
    field: string,
    file: File,
  ): Promise<{ success: boolean; path: string }> {
    const formData = new FormData();
    formData.append(field, file);
    return request(`/api/my/church-branding/${field}`, {
      method: 'POST',
      body: formData,
      // No Content-Type header — browser sets multipart boundary automatically
    });
  },

  /** DELETE /api/my/church-branding/:field */
  async deleteBrandingAsset(field: string): Promise<{ success: boolean }> {
    return request(`/api/my/church-branding/${field}`, { method: 'DELETE' });
  },

  /** Convenience: resolve display name from settings object. */
  getDisplayName: getChurchDisplayName,
};

// ── Sessions ────────────────────────────────────────────────────────────────

export const sessionsApi = {
  /** GET /api/user/sessions */
  async getSessions(): Promise<SessionData[]> {
    const data = await request<SessionsResponse>('/api/user/sessions');
    return data.data?.sessions || [];
  },

  /** DELETE /api/user/sessions/:id */
  async revokeSession(sessionId: string): Promise<{ success: boolean; message?: string }> {
    return request(`/api/user/sessions/${sessionId}`, { method: 'DELETE' });
  },

  /** POST /api/user/sessions/revoke-others */
  async revokeOtherSessions(): Promise<RevokeOthersResponse> {
    return request<RevokeOthersResponse>('/api/user/sessions/revoke-others', { method: 'POST' });
  },
};

// ── Notifications ───────────────────────────────────────────────────────────

export const notificationsApi = {
  /** GET /api/notifications/preferences */
  async getPreferences(): Promise<NotificationPref[]> {
    const data = await request<NotificationPrefsResponse>('/api/notifications/preferences');
    return data.preferences || [];
  },

  /** PUT /api/notifications/preferences */
  async updatePreferences(
    preferences: Array<{
      type_name: string;
      email_enabled: boolean;
      push_enabled: boolean;
      in_app_enabled: boolean;
      sms_enabled: boolean;
      frequency: string;
    }>,
  ): Promise<{ success: boolean; message?: string }> {
    return request('/api/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify({ preferences }),
    });
  },
};

// ── OCR Preferences ─────────────────────────────────────────────────────────

export const ocrApi = {
  /** GET /api/my/ocr-preferences */
  async getPreferences(): Promise<OcrPrefsResponse> {
    return request<OcrPrefsResponse>('/api/my/ocr-preferences');
  },

  /** PUT /api/my/ocr-preferences */
  async updatePreferences(prefs: OcrPreferences): Promise<{ success: boolean; message?: string }> {
    return request('/api/my/ocr-preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    });
  },
};
