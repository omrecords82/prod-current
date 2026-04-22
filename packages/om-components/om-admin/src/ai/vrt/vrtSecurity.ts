// VRT Security & Access Control Module
// Centralizes authentication, authorization, and audit logging for all VRT operations

export interface VRTUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface VRTAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: VRTAction;
  componentId?: string;
  componentName?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
}

export type VRTAction = 
  | 'SNAPSHOT_CAPTURE'
  | 'DIFF_ANALYSIS'
  | 'CONFIDENCE_ADJUSTMENT'
  | 'PLAYWRIGHT_TEST'
  | 'SETTINGS_UPDATE'
  | 'DASHBOARD_ACCESS'
  | 'EXPORT_PNG'
  | 'EXPORT_JSON'
  | 'LEARNING_FEEDBACK'
  | 'VRT_ENABLE'
  | 'VRT_DISABLE';

export interface VRTSecurityConfig {
  enabledInProduction: boolean;
  requireSuperAdmin: boolean;
  auditLogging: boolean;
  maxSnapshotRetention: number; // days
  maxAuditLogRetention: number; // days
  allowedOrigins: string[];
  rateLimitPerHour: number;
}

export class VRTSecurity {
  private static instance: VRTSecurity;
  private config: VRTSecurityConfig;
  private auditLogs: VRTAuditLog[] = [];
  private actionCounts: Map<string, number> = new Map();
  private lastHourReset: number = Date.now();

  private constructor() {
    this.config = this.loadConfig();
    this.loadAuditLogs();
    this.cleanupOldLogs();
  }

  public static getInstance(): VRTSecurity {
    if (!VRTSecurity.instance) {
      VRTSecurity.instance = new VRTSecurity();
    }
    return VRTSecurity.instance;
  }

  /**
   * Check if VRT operations are allowed for the current user and environment
   */
  public isVRTAllowed(user: VRTUser | null): { allowed: boolean; reason?: string } {
    // Check if user exists
    if (!user) {
      return { allowed: false, reason: 'No authenticated user' };
    }

    // Check super admin requirement
    if (this.config.requireSuperAdmin && user.role !== 'super_admin') {
      return { allowed: false, reason: 'Super admin access required' };
    }

    // Check production environment
    if (this.isProduction() && !this.config.enabledInProduction) {
      return { allowed: false, reason: 'VRT disabled in production environment' };
    }

    // Check rate limiting
    if (!this.checkRateLimit(user.id)) {
      return { allowed: false, reason: 'Rate limit exceeded (max actions per hour)' };
    }

    // Check origin allowlist
    if (!this.isOriginAllowed()) {
      return { allowed: false, reason: 'Origin not in allowlist' };
    }

    return { allowed: true };
  }

  /**
   * Log a VRT action for audit purposes
   */
  public async logAction(
    user: VRTUser,
    action: VRTAction,
    details: Record<string, any> = {},
    componentId?: string,
    componentName?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    if (!this.config.auditLogging) return;

    const auditLog: VRTAuditLog = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: user.name,
      action,
      componentId,
      componentName,
      details: {
        ...details,
        environment: this.isProduction() ? 'production' : 'development',
        sessionId: this.getSessionId()
      },
      ipAddress: await this.getClientIP(),
      userAgent: navigator.userAgent,
      success,
      errorMessage
    };

    this.auditLogs.push(auditLog);
    this.saveAuditLogs();

    // Update rate limiting counter
    this.updateActionCount(user.id);

    // Log to console for immediate feedback
    console.log(`[VRT Audit] ${action} by ${user.name} ${success ? 'SUCCESS' : 'FAILED'}`, auditLog);

    // Also log to existing admin log system if available
    this.logToAdminSystem(auditLog);
  }

  /**
   * Get audit logs with optional filtering
   */
  public getAuditLogs(
    userId?: string,
    action?: VRTAction,
    componentId?: string,
    startDate?: Date,
    endDate?: Date
  ): VRTAuditLog[] {
    let logs = [...this.auditLogs];

    if (userId) {
      logs = logs.filter(log => log.userId === userId);
    }

    if (action) {
      logs = logs.filter(log => log.action === action);
    }

    if (componentId) {
      logs = logs.filter(log => log.componentId === componentId);
    }

    if (startDate) {
      logs = logs.filter(log => new Date(log.timestamp) >= startDate);
    }

    if (endDate) {
      logs = logs.filter(log => new Date(log.timestamp) <= endDate);
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Clear old audit logs based on retention policy
   */
  public cleanupOldLogs(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.maxAuditLogRetention);

    const originalCount = this.auditLogs.length;
    this.auditLogs = this.auditLogs.filter(log => new Date(log.timestamp) > cutoffDate);
    
    if (this.auditLogs.length < originalCount) {
      console.log(`[VRT Security] Cleaned up ${originalCount - this.auditLogs.length} old audit logs`);
      this.saveAuditLogs();
    }
  }

  /**
   * Update VRT security configuration
   */
  public updateConfig(newConfig: Partial<VRTSecurityConfig>, user: VRTUser): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();

    // Log the configuration change
    this.logAction(user, 'SETTINGS_UPDATE', {
      oldConfig,
      newConfig,
      configChanged: Object.keys(newConfig)
    });
  }

  /**
   * Get current security configuration (sanitized for client)
   */
  public getConfig(): Omit<VRTSecurityConfig, 'allowedOrigins'> {
    const { allowedOrigins, ...publicConfig } = this.config;
    return publicConfig;
  }

  // Private helper methods

  private loadConfig(): VRTSecurityConfig {
    const defaultConfig: VRTSecurityConfig = {
      enabledInProduction: false,
      requireSuperAdmin: true,
      auditLogging: true,
      maxSnapshotRetention: 30,
      maxAuditLogRetention: 90,
      allowedOrigins: ['localhost', '127.0.0.1', '::1'],
      rateLimitPerHour: 100
    };

    try {
      const stored = localStorage.getItem('vrt_security_config');
      if (stored) {
        return { ...defaultConfig, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('[VRT Security] Failed to load config, using defaults');
    }

    return defaultConfig;
  }

  private saveConfig(): void {
    try {
      localStorage.setItem('vrt_security_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('[VRT Security] Failed to save config:', error);
    }
  }

  private loadAuditLogs(): void {
    try {
      const stored = localStorage.getItem('vrt_audit_logs');
      if (stored) {
        this.auditLogs = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('[VRT Security] Failed to load audit logs');
      this.auditLogs = [];
    }
  }

  private saveAuditLogs(): void {
    try {
      // Keep only the most recent logs to avoid localStorage bloat
      const recentLogs = this.auditLogs.slice(-1000);
      localStorage.setItem('vrt_audit_logs', JSON.stringify(recentLogs));
    } catch (error) {
      console.error('[VRT Security] Failed to save audit logs:', error);
    }
  }

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;

    // Reset counters if an hour has passed
    if (now - this.lastHourReset > hourInMs) {
      this.actionCounts.clear();
      this.lastHourReset = now;
    }

    const currentCount = this.actionCounts.get(userId) || 0;
    return currentCount < this.config.rateLimitPerHour;
  }

  private updateActionCount(userId: string): void {
    const currentCount = this.actionCounts.get(userId) || 0;
    this.actionCounts.set(userId, currentCount + 1);
  }

  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production' || 
           window.location.hostname !== 'localhost' && 
           !window.location.hostname.includes('127.0.0.1');
  }

  private isOriginAllowed(): boolean {
    const hostname = window.location.hostname;
    return this.config.allowedOrigins.some(origin => 
      hostname === origin || hostname.includes(origin)
    );
  }

  private async getClientIP(): Promise<string> {
    // In a real application, this would come from the server
    // For demo purposes, we'll use a placeholder
    return 'client.ip.not.available';
  }

  private getSessionId(): string {
    // Try to get session ID from various sources
    return sessionStorage.getItem('sessionId') || 
           localStorage.getItem('sessionId') || 
           'session-' + Date.now();
  }

  private generateLogId(): string {
    return 'vrt-audit-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  private logToAdminSystem(auditLog: VRTAuditLog): void {
    // Integration point for existing admin logging system
    // This would typically send to a backend audit service
    try {
      const adminLogs = JSON.parse(localStorage.getItem('admin_audit_logs') || '[]');
      adminLogs.push({
        ...auditLog,
        system: 'VRT',
        category: 'VISUAL_REGRESSION_TESTING'
      });
      
      // Keep only recent admin logs
      const recentAdminLogs = adminLogs.slice(-500);
      localStorage.setItem('admin_audit_logs', JSON.stringify(recentAdminLogs));
    } catch (error) {
      console.warn('[VRT Security] Failed to log to admin system:', error);
    }
  }
}

// Export singleton instance
export const vrtSecurity = VRTSecurity.getInstance();

// Helper function for components to check VRT access
export function checkVRTAccess(user: any): { allowed: boolean; reason?: string } {
  const vrtUser: VRTUser | null = user ? {
    id: user.id || user.user_id || 'unknown',
    name: user.name || user.username || 'Unknown User',
    email: user.email || 'unknown@email.com',
    role: user.role || 'user'
  } : null;

  return vrtSecurity.isVRTAllowed(vrtUser);
}

// Helper function for logging VRT actions
export async function logVRTAction(
  user: any,
  action: VRTAction,
  details: Record<string, any> = {},
  componentId?: string,
  componentName?: string,
  success: boolean = true,
  errorMessage?: string
): Promise<void> {
  if (!user) return;

  const vrtUser: VRTUser = {
    id: user.id || user.user_id || 'unknown',
    name: user.name || user.username || 'Unknown User',
    email: user.email || 'unknown@email.com',
    role: user.role || 'user'
  };

  await vrtSecurity.logAction(user, action, details, componentId, componentName, success, errorMessage);
} 