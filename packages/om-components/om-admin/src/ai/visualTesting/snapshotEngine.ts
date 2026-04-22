import { ComponentInfo } from '../../hooks/useComponentRegistry';
import { checkVRTAccess, logVRTAction, VRTUser } from '../vrt/vrtSecurity';

export interface SnapshotMetadata {
  componentId: string;
  componentName: string;
  timestamp: number;
  dimensions: { width: number; height: number };
  viewport: { width: number; height: number };
  deviceType: 'desktop' | 'tablet' | 'mobile';
  fixId?: string;
  confidence?: number;
  userAgent: string;
  url: string;
}

export interface SnapshotData {
  id: string;
  metadata: SnapshotMetadata;
  imageData: string; // Base64 encoded screenshot
  elementBounds: { x: number; y: number; width: number; height: number };
  componentState: Record<string, any>;
}

export interface SnapshotConfig {
  enabled: boolean;
  retentionDays: number;
  breakpoints: {
    desktop: { width: number; height: number };
    tablet: { width: number; height: number };
    mobile: { width: number; height: number };
  };
  quality: number; // 0-1
  format: 'png' | 'jpeg';
}

export class SnapshotEngine {
  private config: SnapshotConfig;
  private snapshots: Map<string, SnapshotData> = new Map();
  private storageKey = 'omai_vrt_snapshots';
  private currentUser: VRTUser | null = null;

  constructor(config: Partial<SnapshotConfig> = {}, user?: VRTUser) {
    this.config = {
      enabled: true,
      retentionDays: 30,
      breakpoints: {
        desktop: { width: 1920, height: 1080 },
        tablet: { width: 768, height: 1024 },
        mobile: { width: 375, height: 667 }
      },
      quality: 0.9,
      format: 'png',
      ...config
    };
    this.currentUser = user || null;
    this.loadSnapshots();
  }

  /**
   * Set the current user for security checks and logging
   */
  setUser(user: VRTUser | null): void {
    this.currentUser = user;
  }

  /**
   * Capture a baseline snapshot before applying fixes
   */
  async captureBaselineSnapshot(
    component: ComponentInfo,
    deviceType: 'desktop' | 'tablet' | 'mobile' = 'desktop'
  ): Promise<SnapshotData | null> {
    // Security check
    const accessCheck = checkVRTAccess(this.currentUser);
    if (!accessCheck.allowed) {
      console.warn(`[VRT] Snapshot capture denied: ${accessCheck.reason}`);
      await logVRTAction(this.currentUser, 'SNAPSHOT_CAPTURE', {
        reason: accessCheck.reason,
        type: 'baseline'
      }, component.id, component.name, false, accessCheck.reason);
      return null;
    }

    if (!this.config.enabled) {
      await logVRTAction(this.currentUser, 'SNAPSHOT_CAPTURE', {
        reason: 'VRT disabled in config',
        type: 'baseline'
      }, component.id, component.name, false, 'VRT disabled in config');
      return null;
    }

    try {
      const viewport = this.config.breakpoints[deviceType];
      const metadata: SnapshotMetadata = {
        componentId: component.id,
        componentName: component.name,
        timestamp: Date.now(),
        dimensions: {
          width: component.position.width,
          height: component.position.height
        },
        viewport,
        deviceType,
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      const imageData = await this.captureElementScreenshot(component.element, viewport);
      const snapshotData: SnapshotData = {
        id: this.generateSnapshotId(component.id, 'baseline'),
        metadata,
        imageData,
        elementBounds: component.position,
        componentState: this.captureComponentState(component)
      };

      this.snapshots.set(snapshotData.id, snapshotData);
      this.saveSnapshots();
      
      // Log successful capture
      await logVRTAction(this.currentUser, 'SNAPSHOT_CAPTURE', {
        snapshotId: snapshotData.id,
        type: 'baseline',
        deviceType,
        dimensions: metadata.dimensions,
        viewport: metadata.viewport
      }, component.id, component.name, true);
      
      console.log(`[VRT] Baseline snapshot captured for ${component.name}`, snapshotData.id);
      return snapshotData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[VRT] Failed to capture baseline snapshot:', error);
      
      // Log failed capture
      await logVRTAction(this.currentUser, 'SNAPSHOT_CAPTURE', {
        type: 'baseline',
        deviceType,
        error: errorMessage
      }, component.id, component.name, false, errorMessage);
      
      return null;
    }
  }

  /**
   * Capture a post-fix snapshot after applying fixes
   */
  async capturePostFixSnapshot(
    component: ComponentInfo,
    fixId: string,
    confidence: number,
    deviceType: 'desktop' | 'tablet' | 'mobile' = 'desktop'
  ): Promise<SnapshotData | null> {
    // Security check
    const accessCheck = checkVRTAccess(this.currentUser);
    if (!accessCheck.allowed) {
      console.warn(`[VRT] Snapshot capture denied: ${accessCheck.reason}`);
      await logVRTAction(this.currentUser, 'SNAPSHOT_CAPTURE', {
        reason: accessCheck.reason,
        type: 'postfix',
        fixId
      }, component.id, component.name, false, accessCheck.reason);
      return null;
    }

    if (!this.config.enabled) {
      await logVRTAction(this.currentUser, 'SNAPSHOT_CAPTURE', {
        reason: 'VRT disabled in config',
        type: 'postfix',
        fixId
      }, component.id, component.name, false, 'VRT disabled in config');
      return null;
    }

    try {
      const viewport = this.config.breakpoints[deviceType];
      const metadata: SnapshotMetadata = {
        componentId: component.id,
        componentName: component.name,
        timestamp: Date.now(),
        dimensions: {
          width: component.position.width,
          height: component.position.height
        },
        viewport,
        deviceType,
        fixId,
        confidence,
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      const imageData = await this.captureElementScreenshot(component.element, viewport);
      const snapshotData: SnapshotData = {
        id: this.generateSnapshotId(component.id, 'postfix', fixId),
        metadata,
        imageData,
        elementBounds: component.position,
        componentState: this.captureComponentState(component)
      };

      this.snapshots.set(snapshotData.id, snapshotData);
      this.saveSnapshots();
      
      // Log successful capture
      await logVRTAction(this.currentUser, 'SNAPSHOT_CAPTURE', {
        snapshotId: snapshotData.id,
        type: 'postfix',
        fixId,
        confidence,
        deviceType,
        dimensions: metadata.dimensions,
        viewport: metadata.viewport
      }, component.id, component.name, true);
      
      console.log(`[VRT] Post-fix snapshot captured for ${component.name}`, snapshotData.id);
      return snapshotData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[VRT] Failed to capture post-fix snapshot:', error);
      
      // Log failed capture
      await logVRTAction(this.currentUser, 'SNAPSHOT_CAPTURE', {
        type: 'postfix',
        fixId,
        confidence,
        deviceType,
        error: errorMessage
      }, component.id, component.name, false, errorMessage);
      
      return null;
    }
  }

  /**
   * Capture screenshots for all configured breakpoints
   */
  async captureMultiBreakpointSnapshots(
    component: ComponentInfo,
    fixId?: string,
    confidence?: number
  ): Promise<SnapshotData[]> {
    const snapshots: SnapshotData[] = [];
    
    for (const deviceType of ['desktop', 'tablet', 'mobile'] as const) {
      const snapshot = fixId 
        ? await this.capturePostFixSnapshot(component, fixId, confidence || 0, deviceType)
        : await this.captureBaselineSnapshot(component, deviceType);
      
      if (snapshot) {
        snapshots.push(snapshot);
      }
    }

    return snapshots;
  }

  /**
   * Get snapshots for a specific component
   */
  getComponentSnapshots(componentId: string): SnapshotData[] {
    return Array.from(this.snapshots.values())
      .filter(snapshot => snapshot.metadata.componentId === componentId)
      .sort((a, b) => b.metadata.timestamp - a.metadata.timestamp);
  }

  /**
   * Get baseline and post-fix snapshots for comparison
   */
  getComparisonSnapshots(componentId: string, fixId: string): {
    baseline?: SnapshotData;
    postFix?: SnapshotData;
  } {
    const componentSnapshots = this.getComponentSnapshots(componentId);
    
    const baseline = componentSnapshots.find(s => s.id.includes('baseline'));
    const postFix = componentSnapshots.find(s => s.metadata.fixId === fixId);

    return { baseline, postFix };
  }

  /**
   * Clean up old snapshots based on retention policy
   */
  cleanupOldSnapshots(): number {
    const cutoffTime = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
    const oldSnapshots = Array.from(this.snapshots.entries())
      .filter(([_, snapshot]) => snapshot.metadata.timestamp < cutoffTime);

    oldSnapshots.forEach(([id]) => {
      this.snapshots.delete(id);
    });

    if (oldSnapshots.length > 0) {
      this.saveSnapshots();
      console.log(`[VRT] Cleaned up ${oldSnapshots.length} old snapshots`);
    }

    return oldSnapshots.length;
  }

  /**
   * Export snapshots for external analysis
   */
  exportSnapshots(componentId?: string): string {
    const snapshotsToExport = componentId 
      ? this.getComponentSnapshots(componentId)
      : Array.from(this.snapshots.values());

    return JSON.stringify({
      exportDate: new Date().toISOString(),
      totalSnapshots: snapshotsToExport.length,
      snapshots: snapshotsToExport
    }, null, 2);
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): { totalSnapshots: number; totalSize: number; oldestSnapshot: number } {
    const snapshots = Array.from(this.snapshots.values());
    const totalSize = snapshots.reduce((size, snapshot) => {
      return size + (snapshot.imageData.length * 0.75); // Approximate size in bytes
    }, 0);

    const oldestSnapshot = snapshots.length > 0 
      ? Math.min(...snapshots.map(s => s.metadata.timestamp))
      : 0;

    return {
      totalSnapshots: snapshots.length,
      totalSize,
      oldestSnapshot
    };
  }

  // Private methods

  private async captureElementScreenshot(
    element: HTMLElement,
    viewport: { width: number; height: number }
  ): Promise<string> {
    // In a real implementation, this would use Playwright or similar
    // For now, we'll simulate screenshot capture
    return new Promise((resolve) => {
      // Simulate screenshot capture with a canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Create a mock screenshot (in real implementation, this would be actual screenshot)
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add some visual elements to simulate the component
        ctx.fillStyle = '#333';
        ctx.font = '16px Arial';
        ctx.fillText(`Component Screenshot - ${new Date().toLocaleTimeString()}`, 10, 30);
        
        ctx.strokeStyle = '#666';
        ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
        
        resolve(canvas.toDataURL(`image/${this.config.format}`, this.config.quality));
      } else {
        // Fallback to a simple data URL
        resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
      }
    });
  }

  private captureComponentState(component: ComponentInfo): Record<string, any> {
    return {
      props: component.props,
      position: component.position,
      cssClasses: component.cssClasses,
      tailwindClasses: component.tailwindClasses,
      computedStyles: this.getComputedStyles(component.element)
    };
  }

  private getComputedStyles(element: HTMLElement): Record<string, string> {
    const computed = window.getComputedStyle(element);
    const styles: Record<string, string> = {};
    
    // Capture key visual styles
    const importantStyles = [
      'width', 'height', 'margin', 'padding', 'border', 'background',
      'color', 'font-size', 'font-weight', 'display', 'position',
      'top', 'left', 'right', 'bottom', 'z-index', 'opacity'
    ];

    importantStyles.forEach(style => {
      styles[style] = computed.getPropertyValue(style);
    });

    return styles;
  }

  private generateSnapshotId(componentId: string, type: 'baseline' | 'postfix', fixId?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${componentId}_${type}_${timestamp}_${random}${fixId ? `_${fixId}` : ''}`;
  }

  private loadSnapshots(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.snapshots = new Map(data.snapshots || []);
        console.log(`[VRT] Loaded ${this.snapshots.size} snapshots from storage`);
      }
    } catch (error) {
      console.error('[VRT] Failed to load snapshots:', error);
    }
  }

  private saveSnapshots(): void {
    try {
      const data = {
        version: '1.0',
        timestamp: Date.now(),
        snapshots: Array.from(this.snapshots.entries())
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('[VRT] Failed to save snapshots:', error);
    }
  }

  updateConfig(newConfig: Partial<SnapshotConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): SnapshotConfig {
    return { ...this.config };
  }
}

export const snapshotEngine = new SnapshotEngine(); 