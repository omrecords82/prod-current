// Authentication module for omtrace HTTP probing
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { log } from '../core/logger.js';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  mode: 'superadmin' | 'cookie' | 'none';
  cookiesInitial: string[];
  cookiesAfterLogin: string[];
  csrfToken?: string;
}

export interface AuthOptions {
  baseUrl: string;
  jarPath: string;
  credentials?: AuthCredentials;
  timeoutMs?: number;
  skipAuth?: boolean;
}

export class AuthManager {
  private baseUrl: string;
  private jarPath: string;
  private timeoutMs: number;

  constructor(options: AuthOptions) {
    this.baseUrl = options.baseUrl;
    this.jarPath = options.jarPath;
    this.timeoutMs = options.timeoutMs || 10000;
    
    this.ensureJarDirectory();
  }

  /**
   * Main authentication flow
   */
  async authenticate(credentials?: AuthCredentials, skipAuth = false): Promise<AuthResult> {
    log.debug('Starting authentication flow', { 
      hasCredentials: !!credentials,
      skipAuth,
      jarPath: this.jarPath 
    });

    // If skipping auth, try to use existing jar
    if (skipAuth) {
      const existingCookies = await this.getExistingCookies();
      return {
        mode: existingCookies.length > 0 ? 'cookie' : 'none',
        cookiesInitial: existingCookies,
        cookiesAfterLogin: existingCookies,
      };
    }

    // If no credentials, try existing jar or fallback to none
    if (!credentials) {
      const existingCookies = await this.getExistingCookies();
      if (existingCookies.length > 0) {
        log.debug('Using existing cookie jar for authentication');
        return {
          mode: 'cookie',
          cookiesInitial: existingCookies,
          cookiesAfterLogin: existingCookies,
        };
      }
      
      log.info('No credentials provided and no existing cookies, proceeding unauthenticated');
      return {
        mode: 'none',
        cookiesInitial: [],
        cookiesAfterLogin: [],
      };
    }

    try {
      // Step 1: CSRF preflight to seed initial cookies
      const csrfResult = await this.performCSRFPreflight();
      
      // Step 2: Attempt login with discovered CSRF token
      const loginResult = await this.performLogin(credentials, csrfResult.csrfToken);
      
      const finalCookies = await this.getExistingCookies();
      
      return {
        mode: 'superadmin',
        cookiesInitial: csrfResult.cookies,
        cookiesAfterLogin: finalCookies,
        csrfToken: csrfResult.csrfToken,
      };
    } catch (error) {
      log.warn('Authentication failed, proceeding unauthenticated', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        mode: 'none',
        cookiesInitial: [],
        cookiesAfterLogin: [],
      };
    }
  }

  /**
   * Perform CSRF preflight to seed cookies
   */
  private async performCSRFPreflight(): Promise<{ cookies: string[]; csrfToken?: string }> {
    const csrfEndpoints = [
      '/api/auth/csrf',
      '/api/csrf-token',
      '/',
    ];

    for (const endpoint of csrfEndpoints) {
      try {
        log.debug(`Trying CSRF preflight: ${endpoint}`);
        
        const result = await this.executeCurl({
          method: 'GET',
          url: `${this.baseUrl}${endpoint}`,
          headers: {
            'Accept': 'application/json,text/html,*/*;q=0.8',
            'User-Agent': 'omtrace-auth/2.0.0',
          },
        });

        const cookies = this.extractCookieNames(result.headers);
        const csrfToken = this.extractCSRFToken(result.headers, result.body);

        if (cookies.length > 0 || csrfToken) {
          log.debug('CSRF preflight successful', { endpoint, cookies, hasToken: !!csrfToken });
          return { cookies, csrfToken };
        }
      } catch (error) {
        log.debug(`CSRF preflight failed for ${endpoint}`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        continue;
      }
    }

    return { cookies: [] };
  }

  /**
   * Attempt login with credentials
   */
  private async performLogin(credentials: AuthCredentials, csrfToken?: string): Promise<void> {
    const loginEndpoints = [
      { path: '/api/auth/login', jsonField: 'email' },
      { path: '/auth/login', jsonField: 'email' },
      { path: '/login', jsonField: 'username' },
    ];

    for (const endpoint of loginEndpoints) {
      try {
        log.debug(`Trying login endpoint: ${endpoint.path}`);
        
        const loginData: any = {
          [endpoint.jsonField]: credentials.email,
          password: credentials.password,
        };
        
        if (csrfToken) {
          loginData.csrfToken = csrfToken;
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'omtrace-auth/2.0.0',
        };

        if (csrfToken) {
          headers['X-CSRF-Token'] = csrfToken;
        }

        const result = await this.executeCurl({
          method: 'POST',
          url: `${this.baseUrl}${endpoint.path}`,
          headers,
          body: JSON.stringify(loginData),
        });

        // Check for success (2xx status code)
        if (result.status >= 200 && result.status < 300) {
          log.debug('Login successful', { endpoint: endpoint.path, status: result.status });
          return;
        } else {
          log.debug('Login failed', { endpoint: endpoint.path, status: result.status });
        }
      } catch (error) {
        log.debug(`Login failed for ${endpoint.path}`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        continue;
      }
    }

    throw new Error('All login endpoints failed');
  }

  /**
   * Execute curl command and parse response
   */
  private async executeCurl(options: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
  }): Promise<{
    status: number;
    headers: string;
    body: string;
  }> {
    const args = [
      '-sS',           // Silent with errors
      '-L',            // Follow redirects
      '-D', '-',       // Dump headers to stdout
      '-c', this.jarPath,  // Write cookies to jar
      '-b', this.jarPath,  // Read cookies from jar
      '-X', options.method,
    ];

    // Add headers
    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        args.push('-H', `${key}: ${value}`);
      }
    }

    // Add body for POST requests
    if (options.body && options.method === 'POST') {
      args.push('--data', options.body);
    }

    args.push(options.url);

    return new Promise((resolve, reject) => {
      const curl = spawn('curl', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: this.timeoutMs,
      });

      let stdout = '';
      let stderr = '';

      curl.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      curl.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      curl.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`curl failed with code ${code}: ${stderr}`));
          return;
        }

        // Parse response - headers and body are combined in stdout
        const parts = stdout.split('\r\n\r\n');
        const headers = parts[0] || '';
        const body = parts.slice(1).join('\r\n\r\n');

        // Extract status code from first line of headers
        const statusMatch = headers.match(/HTTP\/[\d.]+\s+(\d+)/);
        const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;

        resolve({ status, headers, body });
      });

      curl.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Extract cookie names from Set-Cookie headers
   */
  private extractCookieNames(headers: string): string[] {
    const cookies: string[] = [];
    const setCookieRegex = /Set-Cookie:\s*([^=]+)=/gi;
    let match;

    while ((match = setCookieRegex.exec(headers)) !== null) {
      const cookieName = match[1].trim();
      if (!cookies.includes(cookieName)) {
        cookies.push(cookieName);
      }
    }

    return cookies;
  }

  /**
   * Extract CSRF token from headers or body
   */
  private extractCSRFToken(headers: string, body: string): string | undefined {
    // Try header first
    const headerMatch = headers.match(/X-CSRF-Token:\s*([^\r\n]+)/i);
    if (headerMatch) {
      return headerMatch[1].trim();
    }

    // Try body (JSON)
    try {
      const jsonBody = JSON.parse(body);
      if (jsonBody.csrfToken) {
        return jsonBody.csrfToken;
      }
      if (jsonBody.token) {
        return jsonBody.token;
      }
    } catch {
      // Not JSON, try HTML
      const htmlMatch = body.match(/name="csrf[_-]?token"[^>]*value="([^"]+)"/i) ||
                       body.match(/name="_token"[^>]*value="([^"]+)"/i);
      if (htmlMatch) {
        return htmlMatch[1];
      }
    }

    return undefined;
  }

  /**
   * Get existing cookies from jar file
   */
  private async getExistingCookies(): Promise<string[]> {
    try {
      if (!fs.existsSync(this.jarPath)) {
        return [];
      }

      const content = fs.readFileSync(this.jarPath, 'utf-8');
      const cookies: string[] = [];
      
      // Parse Netscape cookie format
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.startsWith('#') || !line.trim()) continue;
        
        const parts = line.split('\t');
        if (parts.length >= 6) {
          const cookieName = parts[5];
          if (cookieName && !cookies.includes(cookieName)) {
            cookies.push(cookieName);
          }
        }
      }

      return cookies;
    } catch (error) {
      log.debug('Failed to read existing cookies', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Ensure cookie jar directory exists with proper permissions
   */
  private ensureJarDirectory(): void {
    const dir = path.dirname(this.jarPath);
    
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      }

      // Ensure jar file has restricted permissions if it exists
      if (fs.existsSync(this.jarPath)) {
        fs.chmodSync(this.jarPath, 0o600);
      }
    } catch (error) {
      log.warn('Failed to set up cookie jar directory', {
        dir,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Clean up cookie jar
   */
  cleanup(persistCookies = false): void {
    if (!persistCookies && fs.existsSync(this.jarPath)) {
      try {
        fs.unlinkSync(this.jarPath);
        log.debug('Cookie jar cleaned up', { jarPath: this.jarPath });
      } catch (error) {
        log.debug('Failed to clean up cookie jar', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Get jar path for external use
   */
  getJarPath(): string {
    return this.jarPath;
  }
}
