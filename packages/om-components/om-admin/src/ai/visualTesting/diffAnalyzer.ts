import { SnapshotData } from './snapshotEngine';
import { checkVRTAccess, logVRTAction, VRTUser } from '../vrt/vrtSecurity';

export enum DiffType {
  LAYOUT_SHIFT = 'LAYOUT_SHIFT',
  COLOR_CHANGE = 'COLOR_CHANGE',
  ELEMENT_MISSING = 'ELEMENT_MISSING',
  ELEMENT_ADDED = 'ELEMENT_ADDED',
  SIZE_CHANGE = 'SIZE_CHANGE',
  POSITION_CHANGE = 'POSITION_CHANGE',
  TEXT_CHANGE = 'TEXT_CHANGE',
  STYLE_CHANGE = 'STYLE_CHANGE'
}

export enum DiffSeverity {
  NONE = 'NONE',
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  MAJOR = 'MAJOR',
  CRITICAL = 'CRITICAL'
}

export interface DiffRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  diffType: DiffType;
  severity: DiffSeverity;
  confidence: number;
  description: string;
}

export interface VisualDiffResult {
  id: string;
  baselineSnapshotId: string;
  postFixSnapshotId: string;
  componentId: string;
  timestamp: number;
  diffPercentage: number;
  severity: DiffSeverity;
  regions: DiffRegion[];
  summary: {
    totalRegions: number;
    regionsByType: Record<DiffType, number>;
    regionsBySeverity: Record<DiffSeverity, number>;
    averageConfidence: number;
  };
  metadata: {
    viewportSize: { width: number; height: number };
    deviceType: string;
    processingTime: number;
  };
}

export interface DiffConfig {
  sensitivity: number; // 0.01 to 0.20 (1% to 20%)
  minRegionSize: number; // Minimum pixel area to consider a diff region
  maxRegions: number; // Maximum number of diff regions to return
  colorThreshold: number; // RGB difference threshold
  layoutThreshold: number; // Position/size change threshold
  enableTextDetection: boolean;
  enableStyleDetection: boolean;
}

export class DiffAnalyzer {
  private config: DiffConfig;
  private diffs: Map<string, DiffResult> = new Map();
  private storageKey = 'omai_vrt_diffs';
  private currentUser: VRTUser | null = null;

  constructor(config: Partial<DiffConfig> = {}, user?: VRTUser) {
    this.config = {
      sensitivity: 0.05,
      minRegionSize: 100, // 100 pixels minimum
      maxRegions: 50,
      colorThreshold: 30, // RGB difference threshold
      layoutThreshold: 5, // 5px threshold for layout changes
      enableTextDetection: true,
      enableStyleDetection: true,
      ...config
    };
    this.currentUser = user || null;
    this.loadDiffs();
  }

  /**
   * Set the current user for security checks and logging
   */
  setUser(user: VRTUser | null): void {
    this.currentUser = user;
  }

  /**
   * Analyze differences between baseline and post-fix snapshots
   */
  async analyzeDiff(
    baseline: SnapshotData,
    postFix: SnapshotData,
    componentId?: string
  ): Promise<DiffResult | null> {
    // Security check
    const accessCheck = checkVRTAccess(this.currentUser);
    if (!accessCheck.allowed) {
      console.warn(`[VRT] Diff analysis denied: ${accessCheck.reason}`);
      await logVRTAction(this.currentUser, 'DIFF_ANALYSIS', {
        reason: accessCheck.reason,
        baselineId: baseline.id,
        postFixId: postFix.id
      }, componentId, baseline.metadata.componentName, false, accessCheck.reason);
      return null;
    }

    try {
      // Start timing the analysis
      const startTime = Date.now();
      
      // Create canvas elements for image processing
      const baselineCanvas = await this.createCanvas(baseline.imageData);
      const postFixCanvas = await this.createCanvas(postFix.imageData);

      if (!baselineCanvas || !postFixCanvas) {
        const errorMessage = 'Failed to create canvas elements for diff analysis';
        await logVRTAction(this.currentUser, 'DIFF_ANALYSIS', {
          baselineId: baseline.id,
          postFixId: postFix.id,
          error: errorMessage
        }, componentId, baseline.metadata.componentName, false, errorMessage);
        return null;
      }

      // Perform pixel-level comparison
      const diffData = this.performPixelComparison(baselineCanvas, postFixCanvas);
      const diffPercentage = this.calculateDiffPercentage(diffData);
      const regions = this.identifyDiffRegions(diffData, baselineCanvas.width, baselineCanvas.height);
      const severity = this.classifyDiffSeverity(diffPercentage, regions);

      const diffResult: DiffResult = {
        id: this.generateDiffId(baseline.id, postFix.id),
        baselineId: baseline.id,
        postFixId: postFix.id,
        timestamp: Date.now(),
        diffPercentage,
        severity,
        regions,
        diffImageData: this.generateDiffImage(baselineCanvas, postFixCanvas, diffData),
        metadata: {
          baselineTimestamp: baseline.metadata.timestamp,
          postFixTimestamp: postFix.metadata.timestamp,
          componentId: baseline.metadata.componentId,
          componentName: baseline.metadata.componentName,
          fixId: postFix.metadata.fixId,
          analysisTime: Date.now() - startTime,
          config: { ...this.config }
        }
      };

      // Store the diff result
      this.diffs.set(diffResult.id, diffResult);
      this.saveDiffs();

      // Log successful analysis
      await logVRTAction(this.currentUser, 'DIFF_ANALYSIS', {
        diffId: diffResult.id,
        baselineId: baseline.id,
        postFixId: postFix.id,
        diffPercentage,
        severity,
        regionsCount: regions.length,
        analysisTimeMs: diffResult.metadata.analysisTime
      }, componentId, baseline.metadata.componentName, true);

      console.log(`[VRT] Diff analysis completed for ${baseline.metadata.componentName}`, {
        diffId: diffResult.id,
        diffPercentage: `${diffPercentage.toFixed(2)}%`,
        severity,
        regions: regions.length
      });

      return diffResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[VRT] Failed to analyze diff:', error);
      
      // Log failed analysis
      await logVRTAction(this.currentUser, 'DIFF_ANALYSIS', {
        baselineId: baseline.id,
        postFixId: postFix.id,
        error: errorMessage
      }, componentId, baseline.metadata.componentName, false, errorMessage);
      
      return null;
    }
  }

  /**
   * Compare snapshots across multiple breakpoints
   */
  async analyzeMultiBreakpointDiff(
    baselineSnapshots: SnapshotData[],
    postFixSnapshots: SnapshotData[]
  ): Promise<VisualDiffResult[]> {
    const results: VisualDiffResult[] = [];
    
    for (const baseline of baselineSnapshots) {
      const postFix = postFixSnapshots.find(s => 
        s.metadata.deviceType === baseline.metadata.deviceType
      );
      
      if (postFix) {
        try {
          const result = await this.analyzeVisualDiff(baseline, postFix);
          results.push(result);
        } catch (error) {
          console.error(`[VRT] Failed to analyze diff for ${baseline.metadata.deviceType}:`, error);
        }
      }
    }

    return results;
  }

  /**
   * Get diff statistics for a component
   */
  getDiffStatistics(componentId: string, results: VisualDiffResult[]): {
    totalDiffs: number;
    averageDiffPercentage: number;
    severityDistribution: Record<DiffSeverity, number>;
    typeDistribution: Record<DiffType, number>;
    successRate: number; // Percentage of diffs below threshold
  } {
    const componentResults = results.filter(r => r.componentId === componentId);
    
    if (componentResults.length === 0) {
      return {
        totalDiffs: 0,
        averageDiffPercentage: 0,
        severityDistribution: {} as Record<DiffSeverity, number>,
        typeDistribution: {} as Record<DiffType, number>,
        successRate: 0
      };
    }

    const totalDiffs = componentResults.length;
    const averageDiffPercentage = componentResults.reduce((sum, r) => sum + r.diffPercentage, 0) / totalDiffs;
    
    const severityDistribution: Record<DiffSeverity, number> = {};
    const typeDistribution: Record<DiffType, number> = {};
    
    componentResults.forEach(result => {
      // Count severity
      result.summary.regionsBySeverity.forEach((count, severity) => {
        severityDistribution[severity] = (severityDistribution[severity] || 0) + count;
      });
      
      // Count types
      result.summary.regionsByType.forEach((count, type) => {
        typeDistribution[type] = (typeDistribution[type] || 0) + count;
      });
    });

    const successRate = componentResults.filter(r => r.diffPercentage < this.config.sensitivity * 100).length / totalDiffs * 100;

    return {
      totalDiffs,
      averageDiffPercentage,
      severityDistribution,
      typeDistribution,
      successRate
    };
  }

  // Private methods

  private validateSnapshots(baseline: SnapshotData, postFix: SnapshotData): boolean {
    return (
      baseline.metadata.componentId === postFix.metadata.componentId &&
      baseline.metadata.deviceType === postFix.metadata.deviceType &&
      baseline.metadata.viewport.width === postFix.metadata.viewport.width &&
      baseline.metadata.viewport.height === postFix.metadata.viewport.height
    );
  }

  private async loadImageData(imageData: string): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          resolve(imageData);
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageData;
    });
  }

  private async comparePixels(baseline: ImageData, postFix: ImageData): Promise<Array<{x: number; y: number; diff: number}>> {
    const diffs: Array<{x: number; y: number; diff: number}> = [];
    const { data: baselineData, width, height } = baseline;
    const { data: postFixData } = postFix;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        
        const baselineR = baselineData[index];
        const baselineG = baselineData[index + 1];
        const baselineB = baselineData[index + 2];
        
        const postFixR = postFixData[index];
        const postFixG = postFixData[index + 1];
        const postFixB = postFixData[index + 2];
        
        const diff = Math.sqrt(
          Math.pow(baselineR - postFixR, 2) +
          Math.pow(baselineG - postFixG, 2) +
          Math.pow(baselineB - postFixB, 2)
        );
        
        if (diff > this.config.colorThreshold) {
          diffs.push({ x, y, diff });
        }
      }
    }

    return diffs;
  }

  private groupPixelsIntoRegions(pixelDiffs: Array<{x: number; y: number; diff: number}>): Array<{x: number; y: number; width: number; height: number; pixels: Array<{x: number; y: number; diff: number}>}> {
    const regions: Array<{x: number; y: number; width: number; height: number; pixels: Array<{x: number; y: number; diff: number}>}> = [];
    const visited = new Set<string>();
    
    for (const pixel of pixelDiffs) {
      const key = `${pixel.x},${pixel.y}`;
      if (visited.has(key)) continue;
      
      const region = this.floodFill(pixelDiffs, pixel, visited);
      if (region.pixels.length >= this.config.minRegionSize) {
        regions.push(region);
      }
    }
    
    return regions.slice(0, this.config.maxRegions);
  }

  private floodFill(
    pixelDiffs: Array<{x: number; y: number; diff: number}>,
    startPixel: {x: number; y: number; diff: number},
    visited: Set<string>
  ): {x: number; y: number; width: number; height: number; pixels: Array<{x: number; y: number; diff: number}>} {
    const pixels: Array<{x: number; y: number; diff: number}> = [];
    const queue = [startPixel];
    const minX = startPixel.x, maxX = startPixel.x;
    const minY = startPixel.y, maxY = startPixel.y;
    
    while (queue.length > 0) {
      const pixel = queue.shift()!;
      const key = `${pixel.x},${pixel.y}`;
      
      if (visited.has(key)) continue;
      visited.add(key);
      pixels.push(pixel);
      
      // Check neighboring pixels
      const neighbors = [
        { x: pixel.x + 1, y: pixel.y },
        { x: pixel.x - 1, y: pixel.y },
        { x: pixel.x, y: pixel.y + 1 },
        { x: pixel.x, y: pixel.y - 1 }
      ];
      
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(neighborKey)) {
          const neighborPixel = pixelDiffs.find(p => p.x === neighbor.x && p.y === neighbor.y);
          if (neighborPixel) {
            queue.push(neighborPixel);
          }
        }
      }
    }
    
    const bounds = this.calculateRegionBounds(pixels);
    return {
      x: bounds.minX,
      y: bounds.minY,
      width: bounds.maxX - bounds.minX + 1,
      height: bounds.maxY - bounds.minY + 1,
      pixels
    };
  }

  private calculateRegionBounds(pixels: Array<{x: number; y: number; diff: number}>): {minX: number; minY: number; maxX: number; maxY: number} {
    let minX = pixels[0].x, maxX = pixels[0].x;
    let minY = pixels[0].y, maxY = pixels[0].y;
    
    for (const pixel of pixels) {
      minX = Math.min(minX, pixel.x);
      maxX = Math.max(maxX, pixel.x);
      minY = Math.min(minY, pixel.y);
      maxY = Math.max(maxY, pixel.y);
    }
    
    return { minX, minY, maxX, maxY };
  }

  private async analyzeRegions(
    regions: Array<{x: number; y: number; width: number; height: number; pixels: Array<{x: number; y: number; diff: number}>}>,
    baseline: SnapshotData,
    postFix: SnapshotData
  ): Promise<DiffRegion[]> {
    const analyzedRegions: DiffRegion[] = [];
    
    for (const region of regions) {
      const diffType = this.classifyRegionType(region, baseline, postFix);
      const severity = this.calculateRegionSeverity(region, diffType);
      const confidence = this.calculateRegionConfidence(region, diffType);
      const description = this.generateRegionDescription(region, diffType, severity);
      
      analyzedRegions.push({
        x: region.x,
        y: region.y,
        width: region.width,
        height: region.height,
        diffType,
        severity,
        confidence,
        description
      });
    }
    
    return analyzedRegions;
  }

  private classifyRegionType(
    region: {x: number; y: number; width: number; height: number; pixels: Array<{x: number; y: number; diff: number}>},
    baseline: SnapshotData,
    postFix: SnapshotData
  ): DiffType {
    const { width, height } = region;
    const aspectRatio = width / height;
    const area = width * height;
    
    // Check for layout shifts (large areas with moderate changes)
    if (area > 1000 && aspectRatio > 0.5 && aspectRatio < 2) {
      return DiffType.LAYOUT_SHIFT;
    }
    
    // Check for size changes (significant dimension differences)
    if (Math.abs(width - height) > this.config.layoutThreshold * 10) {
      return DiffType.SIZE_CHANGE;
    }
    
    // Check for color changes (small areas with high pixel differences)
    const avgDiff = region.pixels.reduce((sum, p) => sum + p.diff, 0) / region.pixels.length;
    if (avgDiff > this.config.colorThreshold * 2) {
      return DiffType.COLOR_CHANGE;
    }
    
    // Check for position changes
    if (region.x > this.config.layoutThreshold || region.y > this.config.layoutThreshold) {
      return DiffType.POSITION_CHANGE;
    }
    
    // Default to style change
    return DiffType.STYLE_CHANGE;
  }

  private calculateRegionSeverity(
    region: {x: number; y: number; width: number; height: number; pixels: Array<{x: number; y: number; diff: number}>},
    diffType: DiffType
  ): DiffSeverity {
    const area = region.width * region.height;
    const avgDiff = region.pixels.reduce((sum, p) => sum + p.diff, 0) / region.pixels.length;
    
    // Critical: Large areas with major changes
    if (area > 5000 && avgDiff > 100) {
      return DiffSeverity.CRITICAL;
    }
    
    // Major: Large areas or high diff values
    if (area > 2000 || avgDiff > 80) {
      return DiffSeverity.MAJOR;
    }
    
    // Moderate: Medium areas or moderate diff values
    if (area > 500 || avgDiff > 50) {
      return DiffSeverity.MODERATE;
    }
    
    // Minor: Small areas with low diff values
    if (area > 100 || avgDiff > 20) {
      return DiffSeverity.MINOR;
    }
    
    return DiffSeverity.NONE;
  }

  private calculateRegionConfidence(
    region: {x: number; y: number; width: number; height: number; pixels: Array<{x: number; y: number; diff: number}>},
    diffType: DiffType
  ): number {
    const area = region.width * region.height;
    const avgDiff = region.pixels.reduce((sum, p) => sum + p.diff, 0) / region.pixels.length;
    const pixelDensity = region.pixels.length / area;
    
    // Higher confidence for larger, more consistent regions
    let confidence = Math.min(1, area / 1000) * 0.4; // Area factor
    confidence += Math.min(1, avgDiff / 100) * 0.3; // Diff factor
    confidence += Math.min(1, pixelDensity) * 0.3; // Density factor
    
    return Math.min(1, confidence);
  }

  private generateRegionDescription(
    region: {x: number; y: number; width: number; height: number; pixels: Array<{x: number; y: number; diff: number}>},
    diffType: DiffType,
    severity: DiffSeverity
  ): string {
    const area = region.width * region.height;
    const avgDiff = region.pixels.reduce((sum, p) => sum + p.diff, 0) / region.pixels.length;
    
    const descriptions = {
      [DiffType.LAYOUT_SHIFT]: `Layout shift detected (${area}px², ${avgDiff.toFixed(1)} avg diff)`,
      [DiffType.COLOR_CHANGE]: `Color change detected (${avgDiff.toFixed(1)} avg diff)`,
      [DiffType.SIZE_CHANGE]: `Size change detected (${region.width}x${region.height})`,
      [DiffType.POSITION_CHANGE]: `Position change detected (${region.x}, ${region.y})`,
      [DiffType.STYLE_CHANGE]: `Style change detected (${avgDiff.toFixed(1)} avg diff)`,
      [DiffType.ELEMENT_MISSING]: 'Element appears to be missing',
      [DiffType.ELEMENT_ADDED]: 'New element detected',
      [DiffType.TEXT_CHANGE]: 'Text content change detected'
    };
    
    return `${descriptions[diffType]} - ${severity} severity`;
  }

  private calculateDiffPercentage(pixelDiffs: Array<{x: number; y: number; diff: number}>): number {
    // This would be calculated based on the total image area
    // For now, we'll use a simplified calculation
    const totalPixels = 1920 * 1080; // Assuming standard viewport
    return (pixelDiffs.length / totalPixels) * 100;
  }

  private calculateOverallSeverity(regions: DiffRegion[]): DiffSeverity {
    if (regions.length === 0) return DiffSeverity.NONE;
    
    const severityScores = {
      [DiffSeverity.NONE]: 0,
      [DiffSeverity.MINOR]: 1,
      [DiffSeverity.MODERATE]: 2,
      [DiffSeverity.MAJOR]: 3,
      [DiffSeverity.CRITICAL]: 4
    };
    
    const totalScore = regions.reduce((sum, region) => {
      return sum + severityScores[region.severity];
    }, 0);
    
    const averageScore = totalScore / regions.length;
    
    if (averageScore >= 3.5) return DiffSeverity.CRITICAL;
    if (averageScore >= 2.5) return DiffSeverity.MAJOR;
    if (averageScore >= 1.5) return DiffSeverity.MODERATE;
    if (averageScore >= 0.5) return DiffSeverity.MINOR;
    return DiffSeverity.NONE;
  }

  private generateSummary(regions: DiffRegion[]): {
    totalRegions: number;
    regionsByType: Record<DiffType, number>;
    regionsBySeverity: Record<DiffSeverity, number>;
    averageConfidence: number;
  } {
    const regionsByType: Record<DiffType, number> = {};
    const regionsBySeverity: Record<DiffSeverity, number> = {};
    
    regions.forEach(region => {
      regionsByType[region.diffType] = (regionsByType[region.diffType] || 0) + 1;
      regionsBySeverity[region.severity] = (regionsBySeverity[region.severity] || 0) + 1;
    });
    
    const averageConfidence = regions.length > 0 
      ? regions.reduce((sum, r) => sum + r.confidence, 0) / regions.length
      : 0;
    
    return {
      totalRegions: regions.length,
      regionsByType,
      regionsBySeverity,
      averageConfidence
    };
  }

  private generateDiffId(baselineId: string, postFixId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `diff_${baselineId}_${postFixId}_${timestamp}_${random}`;
  }

  updateConfig(newConfig: Partial<DiffConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): DiffConfig {
    return { ...this.config };
  }

  /**
   * Load stored diffs from localStorage
   */
  private loadDiffs(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsedDiffs = JSON.parse(stored);
        this.diffs = Array.isArray(parsedDiffs) ? parsedDiffs : [];
      } else {
        this.diffs = [];
      }
    } catch (error) {
      console.warn('[DiffAnalyzer] Failed to load stored diffs:', error);
      this.diffs = [];
    }
  }
}

export const diffAnalyzer = new DiffAnalyzer(); 