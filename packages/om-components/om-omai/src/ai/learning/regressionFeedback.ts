import { VisualDiffResult, DiffSeverity, DiffType } from '../visualTesting/diffAnalyzer';
import { ConfidenceAdjustment } from '../visualTesting/confidenceAdjuster';
import { PlaywrightTestSuite, TestResult } from '../visualTesting/playwrightTests';
import { ComponentInfo } from '../../hooks/useComponentRegistry';

export interface RegressionFeedback {
  id: string;
  componentId: string;
  componentName: string;
  fixId: string;
  timestamp: number;
  visualDiffResult: VisualDiffResult;
  confidenceAdjustment: ConfidenceAdjustment;
  testResults: TestResult[];
  userFeedback?: {
    rating: number; // 1-5 scale
    comments: string;
    approved: boolean;
    manualIntervention: boolean;
  };
  learningMetrics: {
    visualAccuracy: number;
    confidenceAccuracy: number;
    testAccuracy: number;
    overallScore: number;
  };
  metadata: {
    fixType: string;
    expectedChanges: string[];
    actualChanges: string[];
    environment: string;
    browser: string;
    viewport: { width: number; height: number };
  };
}

export interface LearningModel {
  version: string;
  lastUpdated: number;
  totalSamples: number;
  accuracyMetrics: {
    visualPrediction: number;
    confidencePrediction: number;
    testPrediction: number;
    overallAccuracy: number;
  };
  featureWeights: {
    diffPercentage: number;
    severity: number;
    unexpectedChanges: number;
    intentionalChanges: number;
    layoutStability: number;
    accessibilityScore: number;
    responsiveScore: number;
  };
  thresholds: {
    visualThreshold: number;
    confidenceThreshold: number;
    testThreshold: number;
  };
}

export interface LearningConfig {
  enabled: boolean;
  minSamplesForTraining: number;
  trainingInterval: number; // milliseconds
  featureExtraction: {
    includeVisualFeatures: boolean;
    includeConfidenceFeatures: boolean;
    includeTestFeatures: boolean;
    includeUserFeedback: boolean;
  };
  modelUpdate: {
    autoUpdate: boolean;
    validationSplit: number;
    learningRate: number;
    maxIterations: number;
  };
  storage: {
    maxSamples: number;
    retentionDays: number;
    compressionEnabled: boolean;
  };
}

export class RegressionFeedbackLearner {
  private config: LearningConfig;
  private model: LearningModel;
  private feedbackSamples: Map<string, RegressionFeedback> = new Map();
  private storageKey = 'omai_regression_feedback';
  private modelStorageKey = 'omai_learning_model';

  constructor(config: Partial<LearningConfig> = {}) {
    this.config = {
      enabled: true,
      minSamplesForTraining: 50,
      trainingInterval: 24 * 60 * 60 * 1000, // 24 hours
      featureExtraction: {
        includeVisualFeatures: true,
        includeConfidenceFeatures: true,
        includeTestFeatures: true,
        includeUserFeedback: true
      },
      modelUpdate: {
        autoUpdate: true,
        validationSplit: 0.2,
        learningRate: 0.01,
        maxIterations: 1000
      },
      storage: {
        maxSamples: 1000,
        retentionDays: 90,
        compressionEnabled: true
      },
      ...config
    };

    this.model = this.initializeModel();
    this.loadFeedbackSamples();
    this.loadModel();
  }

  /**
   * Store feedback from a visual regression test
   */
  storeFeedback(
    component: ComponentInfo,
    fixId: string,
    visualDiffResult: VisualDiffResult,
    confidenceAdjustment: ConfidenceAdjustment,
    testResults: TestResult[],
    userFeedback?: {
      rating: number;
      comments: string;
      approved: boolean;
      manualIntervention: boolean;
    }
  ): RegressionFeedback {
    const feedback: RegressionFeedback = {
      id: this.generateFeedbackId(component.id, fixId),
      componentId: component.id,
      componentName: component.name,
      fixId,
      timestamp: Date.now(),
      visualDiffResult,
      confidenceAdjustment,
      testResults,
      userFeedback,
      learningMetrics: this.calculateLearningMetrics(visualDiffResult, confidenceAdjustment, testResults),
      metadata: {
        fixType: 'auto-fix', // This would come from the fix context
        expectedChanges: [], // This would come from the fix context
        actualChanges: this.extractActualChanges(visualDiffResult),
        environment: visualDiffResult.metadata.deviceType,
        browser: navigator.userAgent,
        viewport: visualDiffResult.metadata.viewportSize
      }
    };

    this.feedbackSamples.set(feedback.id, feedback);
    this.saveFeedbackSamples();
    this.cleanupOldSamples();

    console.log(`[VRT] Stored feedback for ${component.name}: ${feedback.learningMetrics.overallScore.toFixed(3)} overall score`);

    // Trigger model update if conditions are met
    if (this.shouldUpdateModel()) {
      this.updateLearningModel();
    }

    return feedback;
  }

  /**
   * Get feedback samples for analysis
   */
  getFeedbackSamples(query?: {
    componentId?: string;
    dateRange?: { start: number; end: number };
    minScore?: number;
    maxScore?: number;
    severity?: DiffSeverity[];
  }): RegressionFeedback[] {
    let samples = Array.from(this.feedbackSamples.values());

    if (query) {
      if (query.componentId) {
        samples = samples.filter(s => s.componentId === query.componentId);
      }
      if (query.dateRange) {
        samples = samples.filter(s => 
          s.timestamp >= query.dateRange!.start && s.timestamp <= query.dateRange!.end
        );
      }
      if (query.minScore !== undefined) {
        samples = samples.filter(s => s.learningMetrics.overallScore >= query.minScore!);
      }
      if (query.maxScore !== undefined) {
        samples = samples.filter(s => s.learningMetrics.overallScore <= query.maxScore!);
      }
      if (query.severity) {
        samples = samples.filter(s => 
          query.severity!.includes(s.visualDiffResult.severity)
        );
      }
    }

    return samples.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get learning statistics
   */
  getLearningStatistics(): {
    totalSamples: number;
    averageScore: number;
    scoreDistribution: Record<string, number>;
    componentStats: Record<string, { samples: number; averageScore: number }>;
    severityDistribution: Record<DiffSeverity, number>;
    improvementTrend: { recent: number; historical: number };
  } {
    const samples = Array.from(this.feedbackSamples.values());
    
    if (samples.length === 0) {
      return {
        totalSamples: 0,
        averageScore: 0,
        scoreDistribution: {},
        componentStats: {},
        severityDistribution: {} as Record<DiffSeverity, number>,
        improvementTrend: { recent: 0, historical: 0 }
      };
    }

    const averageScore = samples.reduce((sum, s) => sum + s.learningMetrics.overallScore, 0) / samples.length;
    
    // Score distribution (buckets)
    const scoreDistribution: Record<string, number> = {
      '0.0-0.2': 0,
      '0.2-0.4': 0,
      '0.4-0.6': 0,
      '0.6-0.8': 0,
      '0.8-1.0': 0
    };

    samples.forEach(sample => {
      const score = sample.learningMetrics.overallScore;
      if (score < 0.2) scoreDistribution['0.0-0.2']++;
      else if (score < 0.4) scoreDistribution['0.2-0.4']++;
      else if (score < 0.6) scoreDistribution['0.4-0.6']++;
      else if (score < 0.8) scoreDistribution['0.6-0.8']++;
      else scoreDistribution['0.8-1.0']++;
    });

    // Component statistics
    const componentStats: Record<string, { samples: number; averageScore: number }> = {};
    const componentGroups = samples.reduce((groups, sample) => {
      if (!groups[sample.componentId]) {
        groups[sample.componentId] = [];
      }
      groups[sample.componentId].push(sample);
      return groups;
    }, {} as Record<string, RegressionFeedback[]>);

    Object.entries(componentGroups).forEach(([componentId, componentSamples]) => {
      const avgScore = componentSamples.reduce((sum, s) => sum + s.learningMetrics.overallScore, 0) / componentSamples.length;
      componentStats[componentId] = {
        samples: componentSamples.length,
        averageScore: avgScore
      };
    });

    // Severity distribution
    const severityDistribution: Record<DiffSeverity, number> = {};
    samples.forEach(sample => {
      const severity = sample.visualDiffResult.severity;
      severityDistribution[severity] = (severityDistribution[severity] || 0) + 1;
    });

    // Improvement trend (recent vs historical)
    const recentCutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    const recentSamples = samples.filter(s => s.timestamp >= recentCutoff);
    const historicalSamples = samples.filter(s => s.timestamp < recentCutoff);

    const recentAvg = recentSamples.length > 0 
      ? recentSamples.reduce((sum, s) => sum + s.learningMetrics.overallScore, 0) / recentSamples.length
      : 0;
    const historicalAvg = historicalSamples.length > 0
      ? historicalSamples.reduce((sum, s) => sum + s.learningMetrics.overallScore, 0) / historicalSamples.length
      : 0;

    return {
      totalSamples: samples.length,
      averageScore,
      scoreDistribution,
      componentStats,
      severityDistribution,
      improvementTrend: { recent: recentAvg, historical: historicalAvg }
    };
  }

  /**
   * Export learning data for external analysis
   */
  exportLearningData(): string {
    const data = {
      exportDate: new Date().toISOString(),
      config: this.config,
      model: this.model,
      samples: Array.from(this.feedbackSamples.values()),
      statistics: this.getLearningStatistics()
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Manually trigger model update
   */
  forceModelUpdate(): void {
    console.log('[VRT] Forcing learning model update...');
    this.updateLearningModel();
  }

  /**
   * Reset learning model to defaults
   */
  resetLearningModel(): void {
    this.model = this.initializeModel();
    this.feedbackSamples.clear();
    this.saveFeedbackSamples();
    this.saveModel();
    console.log('[VRT] Learning model reset to defaults');
  }

  /**
   * Get current learning model
   */
  getCurrentModel(): LearningModel {
    return { ...this.model };
  }

  // Private methods

  private calculateLearningMetrics(
    visualDiffResult: VisualDiffResult,
    confidenceAdjustment: ConfidenceAdjustment,
    testResults: TestResult[]
  ): {
    visualAccuracy: number;
    confidenceAccuracy: number;
    testAccuracy: number;
    overallScore: number;
  } {
    // Visual accuracy based on diff percentage and severity
    const visualAccuracy = Math.max(0, 1 - (visualDiffResult.diffPercentage / 100)) * 
      (visualDiffResult.severity === DiffSeverity.NONE ? 1 : 0.8);

    // Confidence accuracy based on adjustment factor
    const confidenceAccuracy = Math.max(0, 1 - Math.abs(confidenceAdjustment.adjustmentFactor));

    // Test accuracy based on test results
    const testAccuracy = testResults.length > 0 
      ? testResults.filter(r => r.passed).length / testResults.length
      : 1;

    // Overall score (weighted average)
    const overallScore = (
      visualAccuracy * 0.4 +
      confidenceAccuracy * 0.3 +
      testAccuracy * 0.3
    );

    return {
      visualAccuracy,
      confidenceAccuracy,
      testAccuracy,
      overallScore
    };
  }

  private extractActualChanges(visualDiffResult: VisualDiffResult): string[] {
    const changes: string[] = [];
    
    visualDiffResult.regions.forEach(region => {
      changes.push(`${region.diffType.toLowerCase()}: ${region.description}`);
    });

    return changes;
  }

  private shouldUpdateModel(): boolean {
    if (!this.config.modelUpdate.autoUpdate) return false;
    if (this.feedbackSamples.size < this.config.minSamplesForTraining) return false;
    
    const lastUpdate = this.model.lastUpdated;
    const timeSinceUpdate = Date.now() - lastUpdate;
    
    return timeSinceUpdate >= this.config.trainingInterval;
  }

  private updateLearningModel(): void {
    console.log('[VRT] Updating learning model...');
    
    try {
      const samples = Array.from(this.feedbackSamples.values());
      if (samples.length < this.config.minSamplesForTraining) {
        console.log(`[VRT] Insufficient samples for training (${samples.length}/${this.config.minSamplesForTraining})`);
        return;
      }

      // Extract features and targets
      const features = samples.map(sample => this.extractFeatures(sample));
      const targets = samples.map(sample => sample.learningMetrics.overallScore);

      // Simple linear regression update (in real implementation, use more sophisticated ML)
      this.updateModelWeights(features, targets);

      // Update model metadata
      this.model.version = this.incrementVersion(this.model.version);
      this.model.lastUpdated = Date.now();
      this.model.totalSamples = samples.length;

      // Calculate new accuracy metrics
      const predictions = features.map(f => this.predictScore(f));
      const accuracy = this.calculateAccuracy(predictions, targets);
      
      this.model.accuracyMetrics = {
        visualPrediction: accuracy.visual,
        confidencePrediction: accuracy.confidence,
        testPrediction: accuracy.test,
        overallAccuracy: accuracy.overall
      };

      this.saveModel();
      console.log(`[VRT] Model updated successfully. New accuracy: ${accuracy.overall.toFixed(3)}`);
    } catch (error) {
      console.error('[VRT] Model update failed:', error);
    }
  }

  private extractFeatures(sample: RegressionFeedback): number[] {
    const features: number[] = [];

    if (this.config.featureExtraction.includeVisualFeatures) {
      features.push(
        sample.visualDiffResult.diffPercentage / 100,
        this.severityToNumber(sample.visualDiffResult.severity),
        sample.visualDiffResult.regions.length / 100,
        sample.learningMetrics.visualAccuracy
      );
    }

    if (this.config.featureExtraction.includeConfidenceFeatures) {
      features.push(
        sample.confidenceAdjustment.originalConfidence,
        sample.confidenceAdjustment.adjustmentFactor,
        sample.confidenceAdjustment.visualFactors.layoutStability,
        sample.learningMetrics.confidenceAccuracy
      );
    }

    if (this.config.featureExtraction.includeTestFeatures) {
      features.push(
        sample.testResults.length / 10,
        sample.testResults.filter(r => r.passed).length / Math.max(sample.testResults.length, 1),
        sample.learningMetrics.testAccuracy
      );
    }

    if (this.config.featureExtraction.includeUserFeedback && sample.userFeedback) {
      features.push(
        sample.userFeedback.rating / 5,
        sample.userFeedback.approved ? 1 : 0,
        sample.userFeedback.manualIntervention ? 1 : 0
      );
    }

    return features;
  }

  private severityToNumber(severity: DiffSeverity): number {
    const severityMap = {
      [DiffSeverity.NONE]: 0,
      [DiffSeverity.MINOR]: 0.25,
      [DiffSeverity.MODERATE]: 0.5,
      [DiffSeverity.MAJOR]: 0.75,
      [DiffSeverity.CRITICAL]: 1
    };
    return severityMap[severity] || 0;
  }

  private updateModelWeights(features: number[][], targets: number[]): void {
    // Simple gradient descent update (simplified)
    const learningRate = this.config.modelUpdate.learningRate;
    
    // Update feature weights based on prediction errors
    features.forEach((feature, index) => {
      const prediction = this.predictScore(feature);
      const error = targets[index] - prediction;
      
      // Update weights (simplified)
      feature.forEach((value, featureIndex) => {
        const weightKey = Object.keys(this.model.featureWeights)[featureIndex];
        if (weightKey && this.model.featureWeights[weightKey as keyof typeof this.model.featureWeights] !== undefined) {
          (this.model.featureWeights as any)[weightKey] += learningRate * error * value;
        }
      });
    });
  }

  private predictScore(features: number[]): number {
    // Simple linear prediction
    let prediction = 0;
    features.forEach((feature, index) => {
      const weightKey = Object.keys(this.model.featureWeights)[index];
      if (weightKey && this.model.featureWeights[weightKey as keyof typeof this.model.featureWeights] !== undefined) {
        prediction += feature * (this.model.featureWeights as any)[weightKey];
      }
    });
    return Math.max(0, Math.min(1, prediction));
  }

  private calculateAccuracy(predictions: number[], targets: number[]): {
    visual: number;
    confidence: number;
    test: number;
    overall: number;
  } {
    const errors = predictions.map((pred, index) => Math.abs(pred - targets[index]));
    const mae = errors.reduce((sum, error) => sum + error, 0) / errors.length;
    const accuracy = Math.max(0, 1 - mae);

    return {
      visual: accuracy,
      confidence: accuracy,
      test: accuracy,
      overall: accuracy
    };
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const major = parseInt(parts[0]) || 1;
    const minor = parseInt(parts[1]) || 0;
    const patch = parseInt(parts[2]) || 0;
    return `${major}.${minor}.${patch + 1}`;
  }

  private cleanupOldSamples(): void {
    const cutoffTime = Date.now() - (this.config.storage.retentionDays * 24 * 60 * 60 * 1000);
    const oldSamples = Array.from(this.feedbackSamples.entries())
      .filter(([_, sample]) => sample.timestamp < cutoffTime);

    oldSamples.forEach(([id]) => {
      this.feedbackSamples.delete(id);
    });

    // Limit total samples
    if (this.feedbackSamples.size > this.config.storage.maxSamples) {
      const samples = Array.from(this.feedbackSamples.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = samples.slice(0, this.feedbackSamples.size - this.config.storage.maxSamples);
      toRemove.forEach(([id]) => {
        this.feedbackSamples.delete(id);
      });
    }

    if (oldSamples.length > 0) {
      this.saveFeedbackSamples();
      console.log(`[VRT] Cleaned up ${oldSamples.length} old feedback samples`);
    }
  }

  private initializeModel(): LearningModel {
    return {
      version: '1.0.0',
      lastUpdated: Date.now(),
      totalSamples: 0,
      accuracyMetrics: {
        visualPrediction: 0.5,
        confidencePrediction: 0.5,
        testPrediction: 0.5,
        overallAccuracy: 0.5
      },
      featureWeights: {
        diffPercentage: 0.1,
        severity: 0.2,
        unexpectedChanges: 0.15,
        intentionalChanges: 0.1,
        layoutStability: 0.25,
        accessibilityScore: 0.1,
        responsiveScore: 0.1
      },
      thresholds: {
        visualThreshold: 0.7,
        confidenceThreshold: 0.8,
        testThreshold: 0.9
      }
    };
  }

  private generateFeedbackId(componentId: string, fixId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `feedback_${componentId}_${fixId}_${timestamp}_${random}`;
  }

  private loadFeedbackSamples(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.feedbackSamples = new Map(data.samples || []);
        console.log(`[VRT] Loaded ${this.feedbackSamples.size} feedback samples from storage`);
      }
    } catch (error) {
      console.error('[VRT] Failed to load feedback samples:', error);
    }
  }

  private saveFeedbackSamples(): void {
    try {
      const data = {
        version: '1.0',
        timestamp: Date.now(),
        samples: Array.from(this.feedbackSamples.entries())
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('[VRT] Failed to save feedback samples:', error);
    }
  }

  private loadModel(): void {
    try {
      const stored = localStorage.getItem(this.modelStorageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.model = { ...this.model, ...data };
        console.log(`[VRT] Loaded learning model v${this.model.version} from storage`);
      }
    } catch (error) {
      console.error('[VRT] Failed to load learning model:', error);
    }
  }

  private saveModel(): void {
    try {
      const data = {
        version: '1.0',
        timestamp: Date.now(),
        model: this.model
      };
      localStorage.setItem(this.modelStorageKey, JSON.stringify(data));
    } catch (error) {
      console.error('[VRT] Failed to save learning model:', error);
    }
  }

  updateConfig(newConfig: Partial<LearningConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): LearningConfig {
    return { ...this.config };
  }
}

export const regressionFeedbackLearner = new RegressionFeedbackLearner(); 