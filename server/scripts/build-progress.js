#!/usr/bin/env node

/**
 * Progress Bar Utility for Build Scripts
 * 
 * Provides a simple ASCII progress bar that updates in real-time
 */

class BuildProgress {
  constructor(totalSteps = 100) {
    this.totalSteps = totalSteps;
    this.currentStep = 0;
    this.barWidth = 50;
    this.startTime = Date.now();
    this.steps = [];
    this.currentStageName = '';
  }

  /**
   * Add a step to track
   */
  addStep(name, weight = 1) {
    this.steps.push({ name, weight, completed: false });
    return this.steps.length - 1;
  }

  /**
   * Update progress for a specific step
   */
  updateStep(stepIndex, completed = true) {
    if (stepIndex >= 0 && stepIndex < this.steps.length) {
      this.steps[stepIndex].completed = completed;
      this._updateProgress();
    }
  }

  /**
   * Set overall progress percentage (0-100)
   */
  setProgress(percentage) {
    this.currentStep = Math.max(0, Math.min(100, percentage));
    this._render();
  }

  /**
   * Increment progress by a percentage
   */
  increment(percentage) {
    this.currentStep = Math.max(0, Math.min(100, this.currentStep + percentage));
    this._render();
  }

  /**
   * Calculate progress based on completed steps
   */
  _updateProgress() {
    const totalWeight = this.steps.reduce((sum, step) => sum + step.weight, 0);
    const completedWeight = this.steps
      .filter(step => step.completed)
      .reduce((sum, step) => sum + step.weight, 0);
    
    if (totalWeight > 0) {
      this.currentStep = (completedWeight / totalWeight) * 100;
    }
    this._render();
  }

  /**
   * Set the current stage name
   */
  setStage(stageName) {
    this.currentStageName = stageName;
    this._render();
  }

  /**
   * Render the progress bar (on its own line, no stage text)
   */
  _render() {
    const percentage = Math.round(this.currentStep);
    const filled = Math.round((this.currentStep / 100) * this.barWidth);
    const empty = this.barWidth - filled;
    
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    
    // Print on its own line with newline
    console.log(`[${bar}] ${percentage}%`);
  }

  /**
   * Complete the progress bar (just render, no message)
   */
  complete(message = 'Complete') {
    this.currentStep = 100;
    this._render();
    // Message is printed separately, just render the bar
  }

  /**
   * Clear the progress bar line
   */
  clear() {
    process.stdout.write('\r' + ' '.repeat(80) + '\r');
  }
}

module.exports = BuildProgress;
