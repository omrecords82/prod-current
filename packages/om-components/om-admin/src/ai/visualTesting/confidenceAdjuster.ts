import { VisualDiffResult, DiffSeverity, DiffType } from './diffAnalyzer';

export interface ConfidenceAdjustment {
  originalConfidence: number;
  adjustedConfidence: number;
  adjustmentFactor: number;
  visualFactors: {
    diffPercentage: number;
    severity: DiffSeverity;
    unexpectedChanges: number;
    intentionalChanges: number;
    layoutStability: number;
  };
  reasoning: string[];
  timestamp: number;
}

export interface ConfidenceModel {
  baseConfidence: number;
  visualMultiplier: number;
  severityPenalties: Record<DiffSeverity, number>;
  typeBonuses: Record<DiffType, number>;
  thresholdAdjustments: {
    criticalThreshold: number;
    majorThreshold: number;
    moderateThreshold: number;
    minorThreshold: number;
  };
  learningFactors: {
    historicalAccuracy: number;
    visualConsistency: number;
    userFeedback: number;
  };
}

export interface ConfidenceConfig {
  enabled: boolean;
  visualWeight: number; // 0-1, how much visual results affect confidence
  severityPenalties: Record<DiffSeverity, number>;
  typeBonuses: Record<DiffType, number>;
  unexpectedChangePenalty: number;
  intentionalChangeBonus: number;
  layoutStabilityBonus: number;
  minConfidence: number;
  maxConfidence: number;
  learningEnabled: boolean;
}

export class ConfidenceAdjuster {
  private config: ConfidenceConfig;
  private model: ConfidenceModel;
  private adjustments: Map<string, ConfidenceAdjustment> = new Map();
  private storageKey = 'omai_confidence_adjustments';

  constructor(config: Partial<ConfidenceConfig> = {}) {
    this.config = {
      enabled: true,
      visualWeight: 0.3, // 30% weight for visual factors
      severityPenalties: {
        [DiffSeverity.NONE]: 0,
        [DiffSeverity.MINOR]: -0.05,
        [DiffSeverity.MODERATE]: -0.15,
        [DiffSeverity.MAJOR]: -0.25,
        [DiffSeverity.CRITICAL]: -0.4
      },
      typeBonuses: {
        [DiffType.LAYOUT_SHIFT]: -0.2, // Penalty for layout shifts
        [DiffType.COLOR_CHANGE]: 0.05, // Small bonus for color improvements
        [DiffType.ELEMENT_MISSING]: -0.3, // Penalty for missing elements
        [DiffType.ELEMENT_ADDED]: 0.1, // Bonus for added elements
        [DiffType.SIZE_CHANGE]: -0.1, // Small penalty for size changes
        [DiffType.POSITION_CHANGE]: -0.15, // Penalty for position changes
        [DiffType.TEXT_CHANGE]: 0.02, // Small bonus for text changes
        [DiffType.STYLE_CHANGE]: 0.05 // Small bonus for style improvements
      },
      unexpectedChangePenalty: -0.1,
      intentionalChangeBonus: 0.05,
      layoutStabilityBonus: 0.1,
      minConfidence: 0.1,
      maxConfidence: 0.95,
      learningEnabled: true,
      ...config
    };

    this.model = this.initializeModel();
    this.loadAdjustments();
  }

  /**
   * Adjust OMAI confidence based on visual regression test results
   */
  adjustConfidence(
    originalConfidence: number,
    visualDiffResult: VisualDiffResult,
    fixContext: {
      fixId: string;
      componentId: string;
      fixType: string;
      expectedChanges: string[];
    }
  ): ConfidenceAdjustment {
    if (!this.config.enabled) {
      return {
        originalConfidence,
        adjustedConfidence: originalConfidence,
        adjustmentFactor: 0,
        visualFactors: {
          diffPercentage: visualDiffResult.diffPercentage,
          severity: visualDiffResult.severity,
          unexpectedChanges: 0,
          intentionalChanges: 0,
          layoutStability: 1
        },
        reasoning: ['Visual confidence adjustment disabled'],
        timestamp: Date.now()
      };
    }

    const visualFactors = this.analyzeVisualFactors(visualDiffResult, fixContext);
    const adjustmentFactor = this.calculateAdjustmentFactor(visualFactors);
    const adjustedConfidence = this.applyAdjustment(originalConfidence, adjustmentFactor);

    const reasoning = this.generateReasoning(visualFactors, adjustmentFactor);

    const adjustment: ConfidenceAdjustment = {
      originalConfidence,
      adjustedConfidence,
      adjustmentFactor,
      visualFactors,
      reasoning,
      timestamp: Date.now()
    };

    // Store adjustment for learning
    this.adjustments.set(`${fixContext.fixId}_${visualDiffResult.id}`, adjustment);
    this.saveAdjustments();

    // Update learning model
    if (this.config.learningEnabled) {
      this.updateLearningModel(adjustment, visualDiffResult);
    }

    console.log(`[VRT] Confidence adjusted: ${originalConfidence.toFixed(3)} → ${adjustedConfidence.toFixed(3)} (${adjustmentFactor > 0 ? '+' : ''}${adjustmentFactor.toFixed(3)})`);
    
    return adjustment;
  }

  /**
   * Batch adjust confidence for multiple visual diff results
   */
  adjustConfidenceBatch(
    originalConfidence: number,
    visualDiffResults: VisualDiffResult[],
    fixContext: {
      fixId: string;
      componentId: string;
      fixType: string;
      expectedChanges: string[];
    }
  ): ConfidenceAdjustment[] {
    return visualDiffResults.map(result => 
      this.adjustConfidence(originalConfidence, result, fixContext)
    );
  }

  /**
   * Get confidence adjustment history for a component
   */
  getAdjustmentHistory(componentId: string): ConfidenceAdjustment[] {
    return Array.from(this.adjustments.values())
      .filter(adjustment => {
        // Extract component ID from the stored key
        const keyParts = Array.from(this.adjustments.keys())
          .find(key => this.adjustments.get(key) === adjustment)?.split('_');
        return keyParts && keyParts[1] === componentId;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get confidence statistics for learning analysis
   */
  getConfidenceStatistics(): {
    totalAdjustments: number;
    averageAdjustment: number;
    accuracyImprovement: number;
    visualConsistency: number;
    severityDistribution: Record<DiffSeverity, number>;
  } {
    const adjustments = Array.from(this.adjustments.values());
    
    if (adjustments.length === 0) {
      return {
        totalAdjustments: 0,
        averageAdjustment: 0,
        accuracyImprovement: 0,
        visualConsistency: 0,
        severityDistribution: {} as Record<DiffSeverity, number>
      };
    }

    const averageAdjustment = adjustments.reduce((sum, adj) => sum + adj.adjustmentFactor, 0) / adjustments.length;
    
    // Calculate accuracy improvement (simplified)
    const accuracyImprovement = adjustments.filter(adj => adj.adjustedConfidence > adj.originalConfidence).length / adjustments.length;
    
    // Calculate visual consistency
    const visualConsistency = adjustments.filter(adj => 
      adj.visualFactors.diffPercentage < 5 && adj.visualFactors.severity === DiffSeverity.NONE
    ).length / adjustments.length;

    // Severity distribution
    const severityDistribution: Record<DiffSeverity, number> = {};
    adjustments.forEach(adj => {
      const severity = adj.visualFactors.severity;
      severityDistribution[severity] = (severityDistribution[severity] || 0) + 1;
    });

    return {
      totalAdjustments: adjustments.length,
      averageAdjustment,
      accuracyImprovement,
      visualConsistency,
      severityDistribution
    };
  }

  /**
   * Export confidence adjustment data for external analysis
   */
  exportAdjustmentData(): string {
    const data = {
      exportDate: new Date().toISOString(),
      config: this.config,
      model: this.model,
      adjustments: Array.from(this.adjustments.entries()),
      statistics: this.getConfidenceStatistics()
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Reset learning model to defaults
   */
  resetLearningModel(): void {
    this.model = this.initializeModel();
    this.adjustments.clear();
    this.saveAdjustments();
    console.log('[VRT] Confidence learning model reset to defaults');
  }

  // Private methods

  private initializeModel(): ConfidenceModel {
    return {
      baseConfidence: 0.7,
      visualMultiplier: 1.0,
      severityPenalties: this.config.severityPenalties,
      typeBonuses: this.config.typeBonuses,
      thresholdAdjustments: {
        criticalThreshold: 0.3,
        majorThreshold: 0.5,
        moderateThreshold: 0.7,
        minorThreshold: 0.9
      },
      learningFactors: {
        historicalAccuracy: 0.5,
        visualConsistency: 0.5,
        userFeedback: 0.5
      }
    };
  }

  private analyzeVisualFactors(
    visualDiffResult: VisualDiffResult,
    fixContext: { fixId: string; componentId: string; fixType: string; expectedChanges: string[] }
  ): {
    diffPercentage: number;
    severity: DiffSeverity;
    unexpectedChanges: number;
    intentionalChanges: number;
    layoutStability: number;
  } {
    const { diffPercentage, severity, regions } = visualDiffResult;
    
    // Analyze unexpected vs intentional changes
    const unexpectedChanges = this.countUnexpectedChanges(regions, fixContext.expectedChanges);
    const intentionalChanges = this.countIntentionalChanges(regions, fixContext.expectedChanges);
    
    // Calculate layout stability (inverse of layout shifts)
    const layoutShifts = regions.filter(r => r.diffType === DiffType.LAYOUT_SHIFT).length;
    const layoutStability = Math.max(0, 1 - (layoutShifts / Math.max(regions.length, 1)));

    return {
      diffPercentage,
      severity,
      unexpectedChanges,
      intentionalChanges,
      layoutStability
    };
  }

  private countUnexpectedChanges(regions: any[], expectedChanges: string[]): number {
    return regions.filter(region => {
      // Check if the change type was expected
      const changeType = region.diffType.toLowerCase();
      return !expectedChanges.some(expected => 
        expected.toLowerCase().includes(changeType) ||
        expected.toLowerCase().includes('layout') && region.diffType === DiffType.LAYOUT_SHIFT ||
        expected.toLowerCase().includes('color') && region.diffType === DiffType.COLOR_CHANGE
      );
    }).length;
  }

  private countIntentionalChanges(regions: any[], expectedChanges: string[]): number {
    return regions.filter(region => {
      const changeType = region.diffType.toLowerCase();
      return expectedChanges.some(expected => 
        expected.toLowerCase().includes(changeType) ||
        expected.toLowerCase().includes('layout') && region.diffType === DiffType.LAYOUT_SHIFT ||
        expected.toLowerCase().includes('color') && region.diffType === DiffType.COLOR_CHANGE
      );
    }).length;
  }

  private calculateAdjustmentFactor(visualFactors: {
    diffPercentage: number;
    severity: DiffSeverity;
    unexpectedChanges: number;
    intentionalChanges: number;
    layoutStability: number;
  }): number {
    let adjustmentFactor = 0;

    // Base severity penalty
    adjustmentFactor += this.config.severityPenalties[visualFactors.severity] || 0;

    // Diff percentage penalty (higher diff = lower confidence)
    const diffPenalty = Math.min(0.2, visualFactors.diffPercentage / 100 * 0.2);
    adjustmentFactor -= diffPenalty;

    // Unexpected changes penalty
    adjustmentFactor += visualFactors.unexpectedChanges * this.config.unexpectedChangePenalty;

    // Intentional changes bonus
    adjustmentFactor += visualFactors.intentionalChanges * this.config.intentionalChangeBonus;

    // Layout stability bonus
    adjustmentFactor += visualFactors.layoutStability * this.config.layoutStabilityBonus;

    // Apply learning model adjustments
    adjustmentFactor *= this.model.visualMultiplier;

    // Apply historical accuracy factor
    adjustmentFactor *= this.model.learningFactors.historicalAccuracy;

    return Math.max(-0.5, Math.min(0.5, adjustmentFactor)); // Clamp between -50% and +50%
  }

  private applyAdjustment(originalConfidence: number, adjustmentFactor: number): number {
    let adjustedConfidence = originalConfidence + adjustmentFactor;
    
    // Apply bounds
    adjustedConfidence = Math.max(this.config.minConfidence, adjustedConfidence);
    adjustedConfidence = Math.min(this.config.maxConfidence, adjustedConfidence);
    
    return adjustedConfidence;
  }

  private generateReasoning(
    visualFactors: {
      diffPercentage: number;
      severity: DiffSeverity;
      unexpectedChanges: number;
      intentionalChanges: number;
      layoutStability: number;
    },
    adjustmentFactor: number
  ): string[] {
    const reasoning: string[] = [];

    // Severity reasoning
    if (visualFactors.severity !== DiffSeverity.NONE) {
      reasoning.push(`${visualFactors.severity} visual changes detected`);
    }

    // Diff percentage reasoning
    if (visualFactors.diffPercentage > 5) {
      reasoning.push(`High visual difference (${visualFactors.diffPercentage.toFixed(1)}%)`);
    } else if (visualFactors.diffPercentage > 1) {
      reasoning.push(`Moderate visual difference (${visualFactors.diffPercentage.toFixed(1)}%)`);
    } else {
      reasoning.push(`Minimal visual difference (${visualFactors.diffPercentage.toFixed(1)}%)`);
    }

    // Unexpected changes reasoning
    if (visualFactors.unexpectedChanges > 0) {
      reasoning.push(`${visualFactors.unexpectedChanges} unexpected changes detected`);
    }

    // Intentional changes reasoning
    if (visualFactors.intentionalChanges > 0) {
      reasoning.push(`${visualFactors.intentionalChanges} intentional changes confirmed`);
    }

    // Layout stability reasoning
    if (visualFactors.layoutStability < 0.8) {
      reasoning.push('Layout stability concerns detected');
    } else if (visualFactors.layoutStability > 0.95) {
      reasoning.push('Excellent layout stability maintained');
    }

    // Overall adjustment reasoning
    if (adjustmentFactor > 0.1) {
      reasoning.push('Significant confidence boost from visual validation');
    } else if (adjustmentFactor < -0.1) {
      reasoning.push('Significant confidence reduction due to visual issues');
    } else if (Math.abs(adjustmentFactor) < 0.05) {
      reasoning.push('Minimal confidence adjustment needed');
    }

    return reasoning;
  }

  private updateLearningModel(adjustment: ConfidenceAdjustment, visualDiffResult: VisualDiffResult): void {
    // Update visual multiplier based on consistency
    const visualConsistency = adjustment.visualFactors.layoutStability;
    this.model.visualMultiplier = Math.max(0.5, Math.min(1.5, 
      this.model.visualMultiplier * (0.9 + visualConsistency * 0.2)
    ));

    // Update historical accuracy
    const accuracy = adjustment.adjustedConfidence > adjustment.originalConfidence ? 1 : 0;
    this.model.learningFactors.historicalAccuracy = 
      this.model.learningFactors.historicalAccuracy * 0.9 + accuracy * 0.1;

    // Update visual consistency
    this.model.learningFactors.visualConsistency = 
      this.model.learningFactors.visualConsistency * 0.9 + visualConsistency * 0.1;

    console.log(`[VRT] Learning model updated: visualMultiplier=${this.model.visualMultiplier.toFixed(3)}, historicalAccuracy=${this.model.learningFactors.historicalAccuracy.toFixed(3)}`);
  }

  private loadAdjustments(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.adjustments = new Map(data.adjustments || []);
        if (data.model) {
          this.model = { ...this.model, ...data.model };
        }
        console.log(`[VRT] Loaded ${this.adjustments.size} confidence adjustments from storage`);
      }
    } catch (error) {
      console.error('[VRT] Failed to load confidence adjustments:', error);
    }
  }

  private saveAdjustments(): void {
    try {
      const data = {
        version: '1.0',
        timestamp: Date.now(),
        model: this.model,
        adjustments: Array.from(this.adjustments.entries())
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('[VRT] Failed to save confidence adjustments:', error);
    }
  }

  updateConfig(newConfig: Partial<ConfidenceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): ConfidenceConfig {
    return { ...this.config };
  }

  getModel(): ConfidenceModel {
    return { ...this.model };
  }
}

export const confidenceAdjuster = new ConfidenceAdjuster(); 