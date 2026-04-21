/**
 * Build Event Emitter
 * Utility for emitting build lifecycle events to the backend
 * 
 * Usage:
 *   const emitter = require('./build-event-emitter');
 *   await emitter.emit('build_started', { runId, env, origin, command, host, pid });
 */

const http = require('http');
const https = require('https');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load .env file if it exists (for build scripts running outside of server context)
// This runs when the module is first required, before the class is instantiated
try {
    const dotenv = require('dotenv');
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        const result = dotenv.config({ path: envPath });
        // dotenv.config() doesn't throw, but result.error indicates issues
        if (result.error) {
            console.warn('⚠️  [build-event-emitter] Failed to load .env:', result.error.message);
        }
    }
} catch (e) {
    // dotenv not available - use process.env as-is
    // Don't warn here as build-all.js will handle it
}

class BuildEventEmitter {
    constructor() {
        this.runId = uuidv4();
        this.baseUrl = process.env.OM_BUILD_EVENT_URL || 'http://127.0.0.1:3001';
        // Read token from env (trim whitespace in case .env has spaces)
        this.token = process.env.OM_BUILD_EVENT_TOKEN ? process.env.OM_BUILD_EVENT_TOKEN.trim() : null;
        this.hostname = os.hostname();
        this.pid = process.pid;
        this.heartbeatInterval = null;
        // Map NODE_ENV to database ENUM values ('prod', 'staging', 'dev')
        const nodeEnv = process.env.NODE_ENV || 'production';
        if (nodeEnv === 'production' || nodeEnv === 'prod') {
            this.env = 'prod';
        } else if (nodeEnv === 'staging' || nodeEnv === 'stage') {
            this.env = 'staging';
        } else {
            this.env = 'dev'; // Default to 'dev' for development, test, etc.
        }
        this.origin = 'server'; // Can be overridden
        this.command = process.argv.join(' '); // Full command line
        this.startTime = Date.now();
        
        // Try to get git info (non-blocking)
        this.gitInfo = this.getGitInfo();

        // Auto-detect origin from script path
        if (process.argv[1]) {
            const scriptPath = process.argv[1];
            if (scriptPath.includes('build-all.js')) {
                this.origin = 'server';
            } else if (scriptPath.includes('build-smart.js')) {
                this.origin = 'server';
            } else if (scriptPath.includes('build-harness.mjs')) {
                this.origin = 'root-harness';
            } else if (scriptPath.includes('front-end')) {
                this.origin = 'frontend';
            }
        }
    }

    /**
     * Get git information (repo, branch, commit)
     * Returns null if git is not available or not in a git repo
     */
    getGitInfo() {
        try {
            const fs = require('fs');
            // Find repo root (go up from current script location)
            let repoRoot = __dirname;
            for (let i = 0; i < 5; i++) {
                if (fs.existsSync(path.join(repoRoot, '.git'))) {
                    break;
                }
                repoRoot = path.dirname(repoRoot);
            }

            const repo = 'orthodoxmetrics'; // Hardcoded repo name
            const branch = execSync('git rev-parse --abbrev-ref HEAD', { 
                cwd: repoRoot, 
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore']
            }).trim();
            const commit = execSync('git rev-parse HEAD', { 
                cwd: repoRoot, 
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore']
            }).trim().substring(0, 7); // Short commit hash

            return { repo, branch, commit };
        } catch (error) {
            // Git not available or not in repo - return null
            return null;
        }
    }

    /**
     * Emit a build event
     * @param {string} event - Event type
     * @param {Object} data - Event data
     * @returns {Promise<boolean>} Success status
     */
    async emit(event, data = {}) {
        // Re-check token (in case .env was loaded after constructor)
        // Also handle quotes/whitespace that might be in .env file
        let token = process.env.OM_BUILD_EVENT_TOKEN;
        if (token) {
            token = token.trim().replace(/^["']|["']$/g, ''); // Remove quotes and whitespace
        }
        if (!token) {
            // Only warn once per run to avoid spam
            if (!this._tokenWarningShown) {
                console.warn('⚠️  OM_BUILD_EVENT_TOKEN not set - build events disabled');
                this._tokenWarningShown = true;
            }
            return false;
        }
        // Update token if it was loaded late or cleaned up
        if (!this.token || this.token !== token) {
            this.token = token;
        }

        const {
            stage = null,
            message = null,
            durationMs = null,
            repo = null,
            branch = null,
            commit = null
        } = data;

        // Use git info if available and not overridden
        const gitInfo = this.gitInfo || {};
        const finalRepo = repo || gitInfo.repo || null;
        const finalBranch = branch || gitInfo.branch || null;
        const finalCommit = commit || gitInfo.commit || null;

        const eventData = {
            runId: this.runId,
            event,
            env: this.env,
            origin: this.origin,
            command: this.command,
            host: this.hostname,
            pid: this.pid,
            stage,
            message,
            durationMs,
            ts: new Date().toISOString(),
            repo: finalRepo,
            branch: finalBranch,
            commit: finalCommit
        };

        try {
            const url = new URL(`${this.baseUrl}/api/internal/build-events`);
            const isHttps = url.protocol === 'https:';
            const httpModule = isHttps ? https : http;

            const postData = JSON.stringify(eventData);

            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'X-OM-BUILD-TOKEN': this.token
                },
                timeout: 2000 // 2 second timeout (reduced to prevent build stalls)
            };

            return new Promise((resolve) => {
                const req = httpModule.request(options, (res) => {
                    let responseData = '';

                    res.on('data', (chunk) => {
                        responseData += chunk;
                    });

                    res.on('end', () => {
                        // 204 No Content means build events are disabled (not an error)
                        if (res.statusCode === 204) {
                            // Silently treat as success (disabled is OK)
                            resolve(true);
                        } else if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(true);
                        } else {
                            // Warn once per run to prevent spam
                            if (!this._buildEventWarningShown) {
                                if (res.statusCode === 404) {
                                    console.warn('⚠️  Build events unavailable (HTTP 404). Continuing without build-event reporting.');
                                } else {
                                    console.warn(`⚠️  Build event failed: ${res.statusCode} - ${responseData}`);
                                }
                                this._buildEventWarningShown = true;
                            }
                            resolve(false);
                        }
                    });
                });

                req.on('error', (error) => {
                    console.warn(`⚠️  Build event error (non-fatal): ${error.message}`);
                    resolve(false); // Don't fail build on event errors
                });

                req.on('timeout', () => {
                    req.destroy();
                    // Warn once per run to prevent spam
                    if (!this._buildEventWarningShown) {
                        console.warn('⚠️  Build event timeout (non-fatal). Continuing without build-event reporting.');
                        this._buildEventWarningShown = true;
                    }
                    resolve(false);
                });

                req.write(postData);
                req.end();
            });
        } catch (error) {
            console.warn(`⚠️  Build event error (non-fatal): ${error.message}`);
            return false;
        }
    }

    /**
     * Start heartbeat (emits heartbeat every 25 seconds)
     */
    startHeartbeat() {
        if (this.heartbeatInterval) {
            return; // Already started
        }

        // Emit initial heartbeat
        this.emit('heartbeat').catch(() => {});

        // Then emit every 25 seconds
        this.heartbeatInterval = setInterval(() => {
            this.emit('heartbeat').catch(() => {});
        }, 25000);
    }

    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Emit build_started and start heartbeat
     */
    async startBuild(data = {}) {
        await this.emit('build_started', data);
        this.startHeartbeat();
    }

    /**
     * Emit stage_started
     */
    async stageStarted(stage, message = null) {
        await this.emit('stage_started', { stage, message });
    }

    /**
     * Emit stage_completed
     */
    async stageCompleted(stage, durationMs, message = null) {
        await this.emit('stage_completed', { stage, durationMs, message });
    }

    /**
     * Wait for backend to be ready (health check)
     * @param {number} maxRetries - Maximum retry attempts (default 10)
     * @param {number} delayMs - Delay between retries in ms (default 1000)
     * @returns {Promise<boolean>} True if backend is ready
     */
    async waitForBackend(maxRetries = 30, delayMs = 1000) {
        const httpModule = http; // Assuming http for localhost
        const url = new URL(`${this.baseUrl}/api/health`);
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                const isReady = await new Promise((resolve) => {
                    const req = httpModule.request({
                        hostname: url.hostname,
                        port: url.port || 3001,
                        path: url.pathname,
                        method: 'GET',
                        timeout: 3000
                    }, (res) => {
                        let data = '';
                        res.on('data', (chunk) => { data += chunk; });
                        res.on('end', () => {
                            resolve(res.statusCode === 200);
                        });
                    });
                    
                    req.on('error', () => resolve(false));
                    req.on('timeout', () => {
                        req.destroy();
                        resolve(false);
                    });
                    req.end();
                });
                
                if (isReady) {
                    return true; // Backend is ready
                }
            } catch (e) {
                // Continue to next retry
            }
            
            // Wait before next retry (except on last attempt)
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
        
        return false; // Backend never became ready
    }

    /**
     * Emit build_completed and stop heartbeat
     * Waits for backend to be ready if needed
     */
    async buildCompleted(data = {}) {
        this.stopHeartbeat();
        const durationMs = Date.now() - this.startTime;
        
        // Wait for backend to be ready (in case PM2 just restarted)
        // PM2 restart can take 5-10 seconds, so wait up to 30 seconds
        const backendReady = await this.waitForBackend(30, 1000);
        
        if (!backendReady) {
            console.warn('⚠️  Backend not ready after waiting, will retry event sending');
        }
        
        // Retry sending the event up to 5 times with increasing delays
        let success = false;
        for (let attempt = 0; attempt < 5 && !success; attempt++) {
            success = await this.emit('build_completed', { ...data, durationMs });
            if (!success && attempt < 4) {
                // Exponential backoff: 1s, 2s, 3s, 4s
                const delay = (attempt + 1) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        if (!success) {
            console.warn('⚠️  Failed to send build_completed event after all retries');
        }
    }

    /**
     * Emit build_failed and stop heartbeat
     */
    async buildFailed(error, stage = null) {
        this.stopHeartbeat();
        const message = error?.message || error?.toString() || 'Build failed';
        await this.emit('build_failed', { message, stage });
    }

    /**
     * Get current runId
     */
    getRunId() {
        return this.runId;
    }
}

// Export singleton instance
module.exports = new BuildEventEmitter();

// Also export class for testing
module.exports.BuildEventEmitter = BuildEventEmitter;
