/**
 * Authentication Service for OrthodMetrics
 * Updated to use direct API calls with session-based authentication
 */

import { apiJson } from './apiClient';
import {
  User,
  AuthResponse,
  LoginCredentials,
} from '@/types/orthodox-metrics.types';

// Legacy auth types for backward compatibility
import {
  RegisterData,
  ForgotPasswordData,
  ResetPasswordData,
} from '@/types/auth/auth';

const OM_LOGGED_OUT_KEY = 'om_logged_out';
const OM_LOGOUT_IN_PROGRESS_KEY = 'om_logout_in_progress';

export class AuthService {
  static isSignedOut(): boolean {
    return sessionStorage.getItem(OM_LOGGED_OUT_KEY) === '1';
  }

  /** Clear browser auth state only — no Keycloak redirect (safe for refreshAuth / 401). */
  static clearLocalAuth(): void {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('orthodoxmetrics_profile_data');
  }

  /**
   * Login user with email and password
   */
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiJson("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: credentials.username, password: credentials.password })
      });

      // Backend returns { success: true, user: {...}, access_token: "...", message: "...", redirectUrl: "..." }
      if ((response.ok || response.success) && response.user) {
        sessionStorage.removeItem(OM_LOGGED_OUT_KEY);
        sessionStorage.removeItem(OM_LOGOUT_IN_PROGRESS_KEY);
        // Store user data
        localStorage.setItem('auth_user', JSON.stringify(response.user));

        // Store access token if provided (for JWT auth)
        if (response.access_token) {
          localStorage.setItem('access_token', response.access_token);
        }

        return response;
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      // Convert technical errors to user-friendly messages
      let friendlyMessage = "Something went wrong. Please try again.";

      // Network/connection errors (server down, no internet, etc.)
      if (error.isNetworkError || error.code === 'NETWORK_ERROR' || !error.status) {
        friendlyMessage = "We're having trouble connecting to the server. Please try again later.";
      }
      // Unauthorized - bad credentials
      else if (error.status === 401) {
        friendlyMessage = "Incorrect email or password.";
      }
      // Server errors (502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout)
      else if (error.status && [502, 503, 504].includes(error.status)) {
        friendlyMessage = "The system is temporarily unavailable. Please try again shortly.";
      }
      // Rate limiting
      else if (error.status === 429) {
        friendlyMessage = "Too many login attempts. Please wait a moment and try again.";
      }
      // Maintenance mode
      else if (error.status === 503) {
        friendlyMessage = "The system is undergoing maintenance. Please try again later.";
      }
      // If we have a custom error message from the backend that's user-friendly, use it
      else if (error.message && !error.message.includes('status code') && !error.message.includes('Network Error')) {
        friendlyMessage = error.message;
      }

      // Log technical details for debugging while showing friendly message to user
      console.error('Login error details:', {
        status: error.status,
        code: error.code,
        isNetworkError: error.isNetworkError,
        originalMessage: error.message,
        friendlyMessage
      });

      throw new Error(friendlyMessage);
    }
  }

  /**
   * Logout user
   */
  static async logout(realm: string = 'orthodoxmetrics'): Promise<void> {
    if (sessionStorage.getItem(OM_LOGOUT_IN_PROGRESS_KEY) === '1') {
      return;
    }
    sessionStorage.setItem(OM_LOGOUT_IN_PROGRESS_KEY, '1');
    sessionStorage.setItem(OM_LOGGED_OUT_KEY, '1');
    document.cookie = 'om_logged_out=1; path=/; max-age=600; SameSite=Lax';
    this.clearLocalAuth();
    try {
      await apiJson("/auth/logout", { method: "POST" });
    } catch (error) {
      console.error('Logout API error:', error);
    }
    const post = encodeURIComponent(`${window.location.origin}/login`);
    window.location.replace(
      `/api/auth/oidc/${realm}/logout?post_logout_redirect_uri=${post}`,
    );
  }

  /**
   * Request password reset
   */
  static async forgotPassword(data: ForgotPasswordData): Promise<void> {
    try {
      await apiJson("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: data.email })
      });
    } catch (error: any) {
      // Convert technical errors to user-friendly messages
      let friendlyMessage = "Unable to send password reset email. Please try again.";

      if (error.isNetworkError || !error.status) {
        friendlyMessage = "We're having trouble connecting to the server. Please try again later.";
      } else if (error.status === 404) {
        friendlyMessage = "No account found with that email address.";
      } else if (error.status === 429) {
        friendlyMessage = "Too many password reset requests. Please wait before trying again.";
      } else if (error.status && [502, 503, 504].includes(error.status)) {
        friendlyMessage = "The system is temporarily unavailable. Please try again shortly.";
      } else if (error.message && !error.message.includes('status code')) {
        friendlyMessage = error.message;
      }

      throw new Error(friendlyMessage);
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(data: ResetPasswordData): Promise<void> {
    try {
      await apiJson("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: data.token, password: data.password })
      });
    } catch (error: any) {
      // Convert technical errors to user-friendly messages
      let friendlyMessage = "Unable to reset password. Please try again.";

      if (error.isNetworkError || !error.status) {
        friendlyMessage = "We're having trouble connecting to the server. Please try again later.";
      } else if (error.status === 400) {
        friendlyMessage = "Invalid or expired reset token. Please request a new password reset.";
      } else if (error.status === 422) {
        friendlyMessage = "Password does not meet security requirements.";
      } else if (error.status && [502, 503, 504].includes(error.status)) {
        friendlyMessage = "The system is temporarily unavailable. Please try again shortly.";
      } else if (error.message && !error.message.includes('status code')) {
        friendlyMessage = error.message;
      }

      throw new Error(friendlyMessage);
    }
  }

  /**
   * Get current user from stored data
   */
  static async getCurrentUser(): Promise<User> {
    try {
      const response = await apiJson("/auth/check", { method: "GET" });

      if (response.authenticated && response.user) {
        return response.user;
      } else {
        throw new Error('User not authenticated');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get current user');
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userData: Partial<User>): Promise<User> {
    try {
      // This would need to be implemented in the userAPI if not already present
      throw new Error('Profile update not implemented in userAPI yet');
    } catch (error: any) {
      throw new Error(error.message || 'Profile update failed');
    }
  }

  /**
   * Change user password
   */
  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      // This would need to be implemented in the userAPI if not already present
      throw new Error('Password change not implemented in userAPI yet');
    } catch (error: any) {
      throw new Error(error.message || 'Password change failed');
    }
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(token: string): Promise<void> {
    try {
      // This would need to be implemented in the userAPI if not already present
      throw new Error('Email verification not implemented in userAPI yet');
    } catch (error: any) {
      throw new Error(error.message || 'Email verification failed');
    }
  }

  /**
   * Resend verification email
   */
  static async resendVerification(): Promise<void> {
    try {
      // This would need to be implemented in the userAPI if not already present
      throw new Error('Resend verification not implemented in userAPI yet');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to resend verification');
    }
  }

  /**
   * Get stored user data from localStorage
   */
  static getStoredUser(): User | null {
    try {
      const stored = localStorage.getItem('auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error parsing stored user data:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated based on stored data
   */
  static isAuthenticated(): boolean {
    return this.getStoredUser() !== null;
  }

  /**
   * Verify authentication with backend server
   * @returns Promise<{authenticated: boolean, user?: User}>
   */
  static async checkAuth(): Promise<{ authenticated: boolean; user?: User }> {
    if (this.isSignedOut()) {
      return { authenticated: false };
    }
    if (!localStorage.getItem('access_token')) {
      return { authenticated: false };
    }
    try {
      console.log('🔍 AuthService: Checking authentication with backend');

      const response = await apiJson("/auth/check", {
        method: "GET"
      });

      const signedIn = Boolean(
        response.authenticated === true
        || (response.user && (response.ok || response.success)),
      );

      if (signedIn) {
        console.log('✅ AuthService: Authentication verified');
        const user = response.user || this.getStoredUser();
        if (user) {
          localStorage.setItem('auth_user', JSON.stringify(user));
        }
        return { authenticated: true, user: user || undefined };
      }

      console.log('❌ AuthService: Authentication check failed');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('access_token');
      return { authenticated: false };
    } catch (error: any) {
      console.error('💥 AuthService: Error checking authentication:', error);

      // On network error, don't clear stored data - might be temporary
      if (error.isNetworkError || !error.status) {
        return {
          authenticated: false
        };
      }

      // On 401/403, clear stored data
      if (error.status === 401 || error.status === 403) {
        localStorage.removeItem('auth_user');
      }

      return {
        authenticated: false
      };
    }
  }
}

export default AuthService;
