export interface registerType {
  title?: string;
  subtitle?: any | any[];
  subtext?: any | any[];
}

export interface loginType {
  title?: string;
  subtitle?: any | any[];
  subtext?: any | any[];
}

export interface signInType {
  title?: string;
}

// Extended Authentication Types for Orthodox Metrics
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  church_id?: string;
  permissions: Permission[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  confirm_password: string;
  first_name: string;
  last_name: string;
  church_name?: string;
  role?: UserRole;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
  confirm_password: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// 🔄 Role type refactored to use unified role system (see utils/roles.ts)
export type UserRole =
  | 'super_admin'      // Global system owner
  | 'admin'            // Platform admin (global config, backups)
  | 'church_admin'     // Church-specific admin
  | 'priest'           // Full clergy privileges
  | 'deacon'           // Partial clergy privileges
  | 'editor'           // Can edit records/content
  | 'viewer'           // Read-only access
  | 'guest';           // Unauthenticated access

export type Permission =
  | 'users.read'
  | 'users.write'
  | 'users.delete'
  | 'churches.read'
  | 'churches.write'
  | 'churches.delete'
  | 'certificates.read'
  | 'certificates.write'
  | 'certificates.delete'
  | 'invoices.read'
  | 'invoices.write'
  | 'invoices.delete'
  | 'liturgical.read'
  | 'liturgical.write'
  | 'ocr.read'
  | 'ocr.write'
  | 'reports.read'
  | 'reports.write'
  | 'system.admin';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  forgotPassword: (data: ForgotPasswordData) => Promise<void>;
  resetPassword: (data: ResetPasswordData) => Promise<void>;
  refreshToken: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  clearError: () => void;
}
