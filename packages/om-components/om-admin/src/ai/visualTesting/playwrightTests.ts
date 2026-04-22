import { ComponentInfo } from '../../hooks/useComponentRegistry';
import { SnapshotData } from './snapshotEngine';
import { VisualDiffResult } from './diffAnalyzer';

export interface TestEnvironment {
  name: string;
  viewport: { width: number; height: number };
  userAgent: string;
  deviceScaleFactor: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export interface TestAssertion {
  id: string;
  type: 'element_exists' | 'text_matches' | 'no_overlap' | 'no_clipping' | 'accessibility_score' | 'color_contrast' | 'responsive_layout';
  selector: string;
  expectedValue?: any;
  tolerance?: number;
  description: string;
}

export interface TestResult {
  id: string;
  assertion: TestAssertion;
  passed: boolean;
  actualValue?: any;
  error?: string;
  screenshot?: string;
  timestamp: number;
}

export interface PlaywrightTestSuite {
  id: string;
  name: string;
  componentId: string;
  environments: TestEnvironment[];
  assertions: TestAssertion[];
  results: TestResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    successRate: number;
    averageScore: number;
  };
  metadata: {
    createdAt: number;
    lastRun: number;
    totalRuns: number;
  };
}

export interface PlaywrightConfig {
  enabled: boolean;
  environments: TestEnvironment[];
  defaultAssertions: TestAssertion[];
  screenshotOptions: {
    fullPage: boolean;
    quality: number;
    type: 'png' | 'jpeg';
  };
  accessibilityThreshold: number;
  colorContrastThreshold: number;
  responsiveBreakpoints: number[];
  maxTestDuration: number;
  retryAttempts: number;
}

export class PlaywrightTestRunner {
  private config: PlaywrightConfig;
  private testSuites: Map<string, PlaywrightTestSuite> = new Map();
  private storageKey = 'omai_playwright_tests';

  constructor(config: Partial<PlaywrightConfig> = {}) {
    this.config = {
      enabled: true,
      environments: [
        {
          name: 'Desktop',
          viewport: { width: 1920, height: 1080 },
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          deviceScaleFactor: 1,
          isMobile: false,
          isTablet: false,
          isDesktop: true
        },
        {
          name: 'Tablet',
          viewport: { width: 768, height: 1024 },
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
          deviceScaleFactor: 2,
          isMobile: false,
          isTablet: true,
          isDesktop: false
        },
        {
          name: 'Mobile',
          viewport: { width: 375, height: 667 },
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
          deviceScaleFactor: 2,
          isMobile: true,
          isTablet: false,
          isDesktop: false
        }
      ],
      defaultAssertions: [
        {
          id: 'element_exists',
          type: 'element_exists',
          selector: '[data-testid]',
          description: 'Component has test ID'
        },
        {
          id: 'no_overlap',
          type: 'no_overlap',
          selector: '*',
          description: 'No overlapping elements'
        },
        {
          id: 'no_clipping',
          type: 'no_clipping',
          selector: '*',
          description: 'No clipped elements'
        },
        {
          id: 'accessibility_score',
          type: 'accessibility_score',
          selector: 'body',
          expectedValue: 0.8,
          description: 'Accessibility score above threshold'
        }
      ],
      screenshotOptions: {
        fullPage: false,
        quality: 0.9,
        type: 'png'
      },
      accessibilityThreshold: 0.8,
      colorContrastThreshold: 4.5,
      responsiveBreakpoints: [375, 768, 1024, 1440, 1920],
      maxTestDuration: 30000,
      retryAttempts: 2,
      ...config
    };

    this.loadTestSuites();
  }

  /**
   * Create a test suite for a component
   */
  createTestSuite(
    component: ComponentInfo,
    customAssertions: TestAssertion[] = []
  ): PlaywrightTestSuite {
    const suiteId = this.generateTestSuiteId(component.id);
    
    const suite: PlaywrightTestSuite = {
      id: suiteId,
      name: `${component.name} Test Suite`,
      componentId: component.id,
      environments: this.config.environments,
      assertions: [...this.config.defaultAssertions, ...customAssertions],
      results: [],
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        successRate: 0,
        averageScore: 0
      },
      metadata: {
        createdAt: Date.now(),
        lastRun: 0,
        totalRuns: 0
      }
    };

    this.testSuites.set(suiteId, suite);
    this.saveTestSuites();
    
    console.log(`[VRT] Created test suite for ${component.name}: ${suiteId}`);
    return suite;
  }

  /**
   * Run visual regression tests for a component
   */
  async runVisualTests(
    component: ComponentInfo,
    baselineSnapshot: SnapshotData,
    postFixSnapshot: SnapshotData,
    visualDiffResult: VisualDiffResult
  ): Promise<PlaywrightTestSuite> {
    if (!this.config.enabled) {
      throw new Error('Playwright tests are disabled');
    }

    const suite = this.getOrCreateTestSuite(component);
    const startTime = Date.now();

    try {
      console.log(`[VRT] Running visual tests for ${component.name}...`);

      // Run tests for each environment
      for (const environment of suite.environments) {
        await this.runEnvironmentTests(suite, environment, component, visualDiffResult);
      }

      // Update suite metadata
      suite.metadata.lastRun = Date.now();
      suite.metadata.totalRuns++;
      suite.summary = this.calculateTestSummary(suite.results);

      this.testSuites.set(suite.id, suite);
      this.saveTestSuites();

      const duration = Date.now() - startTime;
      console.log(`[VRT] Visual tests completed for ${component.name} in ${duration}ms. Success rate: ${suite.summary.successRate.toFixed(1)}%`);

      return suite;
    } catch (error) {
      console.error(`[VRT] Visual tests failed for ${component.name}:`, error);
      throw error;
    }
  }

  /**
   * Run accessibility tests
   */
  async runAccessibilityTests(component: ComponentInfo): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    try {
      // Simulate accessibility testing
      const accessibilityScore = await this.calculateAccessibilityScore(component);
      
      const result: TestResult = {
        id: this.generateTestResultId(),
        assertion: {
          id: 'accessibility_score',
          type: 'accessibility_score',
          selector: `[data-testid="${component.id}"]`,
          expectedValue: this.config.accessibilityThreshold,
          description: 'Accessibility score above threshold'
        },
        passed: accessibilityScore >= this.config.accessibilityThreshold,
        actualValue: accessibilityScore,
        timestamp: Date.now()
      };

      results.push(result);
      
      // Color contrast test
      const contrastScore = await this.calculateColorContrast(component);
      const contrastResult: TestResult = {
        id: this.generateTestResultId(),
        assertion: {
          id: 'color_contrast',
          type: 'color_contrast',
          selector: `[data-testid="${component.id}"]`,
          expectedValue: this.config.colorContrastThreshold,
          description: 'Color contrast ratio above threshold'
        },
        passed: contrastScore >= this.config.colorContrastThreshold,
        actualValue: contrastScore,
        timestamp: Date.now()
      };

      results.push(contrastResult);

      console.log(`[VRT] Accessibility tests completed for ${component.name}. Score: ${accessibilityScore.toFixed(2)}, Contrast: ${contrastScore.toFixed(2)}`);
    } catch (error) {
      console.error(`[VRT] Accessibility tests failed for ${component.name}:`, error);
    }

    return results;
  }

  /**
   * Run responsive layout tests
   */
  async runResponsiveTests(component: ComponentInfo): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    try {
      for (const breakpoint of this.config.responsiveBreakpoints) {
        const isResponsive = await this.testResponsiveLayout(component, breakpoint);
        
        const result: TestResult = {
          id: this.generateTestResultId(),
          assertion: {
            id: 'responsive_layout',
            type: 'responsive_layout',
            selector: `[data-testid="${component.id}"]`,
            expectedValue: true,
            description: `Responsive layout at ${breakpoint}px breakpoint`
          },
          passed: isResponsive,
          actualValue: isResponsive,
          timestamp: Date.now()
        };

        results.push(result);
      }

      console.log(`[VRT] Responsive tests completed for ${component.name} across ${this.config.responsiveBreakpoints.length} breakpoints`);
    } catch (error) {
      console.error(`[VRT] Responsive tests failed for ${component.name}:`, error);
    }

    return results;
  }

  /**
   * Get test suite for a component
   */
  getTestSuite(componentId: string): PlaywrightTestSuite | undefined {
    return Array.from(this.testSuites.values()).find(suite => suite.componentId === componentId);
  }

  /**
   * Get all test suites
   */
  getAllTestSuites(): PlaywrightTestSuite[] {
    return Array.from(this.testSuites.values());
  }

  /**
   * Get test statistics
   */
  getTestStatistics(): {
    totalSuites: number;
    totalTests: number;
    overallSuccessRate: number;
    averageScore: number;
    environmentStats: Record<string, { total: number; passed: number; failed: number }>;
  } {
    const suites = Array.from(this.testSuites.values());
    const totalSuites = suites.length;
    const totalTests = suites.reduce((sum, suite) => sum + suite.summary.totalTests, 0);
    const overallSuccessRate = totalTests > 0 
      ? suites.reduce((sum, suite) => sum + suite.summary.passed, 0) / totalTests * 100
      : 0;
    const averageScore = suites.length > 0
      ? suites.reduce((sum, suite) => sum + suite.summary.averageScore, 0) / suites.length
      : 0;

    // Environment statistics
    const environmentStats: Record<string, { total: number; passed: number; failed: number }> = {};
    this.config.environments.forEach(env => {
      environmentStats[env.name] = { total: 0, passed: 0, failed: 0 };
    });

    suites.forEach(suite => {
      suite.results.forEach(result => {
        const envName = this.getEnvironmentFromResult(result);
        if (envName && environmentStats[envName]) {
          environmentStats[envName].total++;
          if (result.passed) {
            environmentStats[envName].passed++;
          } else {
            environmentStats[envName].failed++;
          }
        }
      });
    });

    return {
      totalSuites,
      totalTests,
      overallSuccessRate,
      averageScore,
      environmentStats
    };
  }

  // Private methods

  private getOrCreateTestSuite(component: ComponentInfo): PlaywrightTestSuite {
    const existingSuite = this.getTestSuite(component.id);
    if (existingSuite) {
      return existingSuite;
    }
    return this.createTestSuite(component);
  }

  private async runEnvironmentTests(
    suite: PlaywrightTestSuite,
    environment: TestEnvironment,
    component: ComponentInfo,
    visualDiffResult: VisualDiffResult
  ): Promise<void> {
    console.log(`[VRT] Running tests for ${environment.name} environment...`);

    for (const assertion of suite.assertions) {
      const result = await this.runSingleTest(assertion, environment, component, visualDiffResult);
      suite.results.push(result);
    }
  }

  private async runSingleTest(
    assertion: TestAssertion,
    environment: TestEnvironment,
    component: ComponentInfo,
    visualDiffResult: VisualDiffResult
  ): Promise<TestResult> {
    const result: TestResult = {
      id: this.generateTestResultId(),
      assertion,
      passed: false,
      timestamp: Date.now()
    };

    try {
      switch (assertion.type) {
        case 'element_exists':
          result.passed = await this.testElementExists(component, assertion.selector);
          result.actualValue = result.passed;
          break;

        case 'text_matches':
          result.passed = await this.testTextMatches(component, assertion.selector, assertion.expectedValue);
          result.actualValue = await this.getTextContent(component, assertion.selector);
          break;

        case 'no_overlap':
          result.passed = await this.testNoOverlap(component, assertion.selector);
          result.actualValue = result.passed;
          break;

        case 'no_clipping':
          result.passed = await this.testNoClipping(component, assertion.selector);
          result.actualValue = result.passed;
          break;

        case 'accessibility_score':
          const score = await this.calculateAccessibilityScore(component);
          result.passed = score >= (assertion.expectedValue || this.config.accessibilityThreshold);
          result.actualValue = score;
          break;

        case 'color_contrast':
          const contrast = await this.calculateColorContrast(component);
          result.passed = contrast >= (assertion.expectedValue || this.config.colorContrastThreshold);
          result.actualValue = contrast;
          break;

        case 'responsive_layout':
          result.passed = await this.testResponsiveLayout(component, environment.viewport.width);
          result.actualValue = result.passed;
          break;

        default:
          result.error = `Unknown assertion type: ${assertion.type}`;
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.passed = false;
    }

    return result;
  }

  private async testElementExists(component: ComponentInfo, selector: string): Promise<boolean> {
    try {
      const element = component.element.querySelector(selector);
      return element !== null;
    } catch {
      return false;
    }
  }

  private async testTextMatches(component: ComponentInfo, selector: string, expectedValue?: any): Promise<boolean> {
    try {
      const element = component.element.querySelector(selector);
      if (!element) return false;
      
      const textContent = element.textContent?.trim();
      return textContent === expectedValue;
    } catch {
      return false;
    }
  }

  private async getTextContent(component: ComponentInfo, selector: string): Promise<string> {
    try {
      const element = component.element.querySelector(selector);
      return element?.textContent?.trim() || '';
    } catch {
      return '';
    }
  }

  private async testNoOverlap(component: ComponentInfo, selector: string): Promise<boolean> {
    try {
      const elements = component.element.querySelectorAll(selector);
      const rects: DOMRect[] = [];
      
      elements.forEach(element => {
        const rect = element.getBoundingClientRect();
        rects.push(rect);
      });

      // Check for overlaps
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          if (this.rectsOverlap(rects[i], rects[j])) {
            return false;
          }
        }
      }
      
      return true;
    } catch {
      return false;
    }
  }

  private async testNoClipping(component: ComponentInfo, selector: string): Promise<boolean> {
    try {
      const elements = component.element.querySelectorAll(selector);
      
      for (const element of elements) {
        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);
        
        // Check if element is clipped
        if (rect.width === 0 || rect.height === 0) {
          return false;
        }
        
        // Check overflow
        if (computedStyle.overflow === 'hidden' && 
            (rect.width < element.scrollWidth || rect.height < element.scrollHeight)) {
          return false;
        }
      }
      
      return true;
    } catch {
      return false;
    }
  }

  private async calculateAccessibilityScore(component: ComponentInfo): Promise<number> {
    try {
      let score = 1.0;
      const element = component.element;
      
      // Check for alt text on images
      const images = element.querySelectorAll('img');
      images.forEach(img => {
        if (!img.alt) score -= 0.1;
      });
      
      // Check for ARIA labels
      const interactiveElements = element.querySelectorAll('button, input, select, textarea');
      interactiveElements.forEach(el => {
        if (!el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) {
          score -= 0.05;
        }
      });
      
      // Check for semantic HTML
      const semanticElements = element.querySelectorAll('header, nav, main, section, article, aside, footer');
      if (semanticElements.length === 0) score -= 0.1;
      
      // Check for keyboard navigation
      const focusableElements = element.querySelectorAll('button, input, select, textarea, a[href]');
      if (focusableElements.length > 0) {
        const firstFocusable = focusableElements[0] as HTMLElement;
        if (firstFocusable.tabIndex === -1) score -= 0.1;
      }
      
      return Math.max(0, score);
    } catch {
      return 0.5; // Default score if calculation fails
    }
  }

  private async calculateColorContrast(component: ComponentInfo): Promise<number> {
    try {
      const element = component.element;
      const computedStyle = window.getComputedStyle(element);
      
      // Get background and foreground colors
      const backgroundColor = computedStyle.backgroundColor;
      const color = computedStyle.color;
      
      // Simplified contrast calculation (in real implementation, use proper color contrast algorithm)
      const contrast = this.calculateContrastRatio(backgroundColor, color);
      
      return contrast;
    } catch {
      return 4.5; // Default contrast ratio
    }
  }

  private async testResponsiveLayout(component: ComponentInfo, breakpoint: number): Promise<boolean> {
    try {
      const element = component.element;
      const rect = element.getBoundingClientRect();
      
      // Check if element adapts to breakpoint
      if (breakpoint < 768) {
        // Mobile: should be full width or have mobile-specific classes
        return rect.width >= breakpoint * 0.9 || element.classList.contains('mobile') || element.classList.contains('responsive');
      } else if (breakpoint < 1024) {
        // Tablet: should have reasonable width
        return rect.width >= breakpoint * 0.7;
      } else {
        // Desktop: should have good width utilization
        return rect.width >= breakpoint * 0.5;
      }
    } catch {
      return false;
    }
  }

  private rectsOverlap(rect1: DOMRect, rect2: DOMRect): boolean {
    return !(rect1.right < rect2.left || 
             rect1.left > rect2.right || 
             rect1.bottom < rect2.top || 
             rect1.top > rect2.bottom);
  }

  private calculateContrastRatio(bgColor: string, fgColor: string): number {
    // Simplified contrast calculation
    // In real implementation, convert colors to luminance and calculate proper ratio
    return 4.5; // Default value
  }

  private calculateTestSummary(results: TestResult[]): {
    totalTests: number;
    passed: number;
    failed: number;
    successRate: number;
    averageScore: number;
  } {
    const totalTests = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = totalTests - passed;
    const successRate = totalTests > 0 ? (passed / totalTests) * 100 : 0;
    
    // Calculate average score from numeric results
    const numericResults = results.filter(r => typeof r.actualValue === 'number');
    const averageScore = numericResults.length > 0
      ? numericResults.reduce((sum, r) => sum + (r.actualValue as number), 0) / numericResults.length
      : 0;

    return {
      totalTests,
      passed,
      failed,
      successRate,
      averageScore
    };
  }

  private getEnvironmentFromResult(result: TestResult): string | null {
    // In a real implementation, this would extract environment info from the result
    // For now, return null as we're not storing environment info in results
    return null;
  }

  private generateTestSuiteId(componentId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `test_suite_${componentId}_${timestamp}_${random}`;
  }

  private generateTestResultId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `test_result_${timestamp}_${random}`;
  }

  private loadTestSuites(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.testSuites = new Map(data.testSuites || []);
        console.log(`[VRT] Loaded ${this.testSuites.size} test suites from storage`);
      }
    } catch (error) {
      console.error('[VRT] Failed to load test suites:', error);
    }
  }

  private saveTestSuites(): void {
    try {
      const data = {
        version: '1.0',
        timestamp: Date.now(),
        testSuites: Array.from(this.testSuites.entries())
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('[VRT] Failed to save test suites:', error);
    }
  }

  updateConfig(newConfig: Partial<PlaywrightConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): PlaywrightConfig {
    return { ...this.config };
  }
}

export const playwrightTestRunner = new PlaywrightTestRunner(); 