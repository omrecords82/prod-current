// HTTP probing module for omtrace with curl execution
import { spawn } from 'child_process';
import * as fs from 'fs';
import { AuthResult } from './auth.js';
import { log } from '../core/logger.js';

export interface ProbeOptions {
  urlPath: string;
  baseUrl: string;
  auth: AuthResult;
  jarPath: string;
  timeoutMs?: number;
  bodyLimit?: number;
  userAgent?: string;
}

export interface ProbeTimings {
  ip: string;
  proto: string;
  dns: number;
  connect: number;
  tls: number;
  ttfb: number; // Time to first byte
  total: number;
  speed: number; // bytes/sec
  size: number; // bytes downloaded
}

export interface ProbeResult {
  status: number;
  headers: Record<string, string>;
  contentType?: string;
  encoding?: string;
  bodySample?: string;
  timings?: ProbeTimings;
  redirects: string[];
  cookies: string[];
  securityHeaders: Record<string, string>;
}

export interface HttpProbeData {
  baseUrl: string;
  requestedPath: string;
  auth: {
    mode: string;
    cookiesInitial: string[];
    cookiesAfterLogin: string[];
    csrfToken?: string;
  };
  results: {
    html?: ProbeResult;
    json?: ProbeResult;
    head?: ProbeResult;
    options?: ProbeResult;
  };
  errors: string[];
}

export class HttpProber {
  private options: ProbeOptions;

  constructor(options: ProbeOptions) {
    this.options = {
      timeoutMs: 10000,
      bodyLimit: 8192,
      userAgent: 'omtrace/2.0.0',
      ...options,
    };
  }

  /**
   * Execute all probe types and return comprehensive data
   */
  async probeEndpoint(): Promise<HttpProbeData> {
    const fullUrl = new URL(this.options.urlPath, this.options.baseUrl).toString();
    
    log.debug('Starting HTTP probe', { 
      url: fullUrl,
      authMode: this.options.auth.mode 
    });

    const results: HttpProbeData['results'] = {};
    const errors: string[] = [];

    // Define probe types with their configurations
    const probes = [
      {
        name: 'html' as const,
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      },
      {
        name: 'json' as const,
        method: 'GET',
        headers: {
          'Accept': 'application/json,*/*;q=0.8',
        },
      },
      {
        name: 'head' as const,
        method: 'HEAD',
        headers: {
          'Accept': '*/*',
        },
      },
      {
        name: 'options' as const,
        method: 'OPTIONS',
        headers: {
          'Accept': '*/*',
        },
      },
    ];

    // Execute each probe
    for (const probe of probes) {
      try {
        log.debug(`Executing ${probe.name.toUpperCase()} probe`);
        
        const result = await this.executeSingleProbe({
          method: probe.method,
          url: fullUrl,
          headers: {
            ...probe.headers,
            'User-Agent': this.options.userAgent!,
            'X-OMTrace': '1',
          },
        });

        results[probe.name] = result;
      } catch (error) {
        const errorMsg = `${probe.name.toUpperCase()} probe failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        
        log.debug(errorMsg);
        errors.push(errorMsg);
      }
    }

    return {
      baseUrl: this.options.baseUrl,
      requestedPath: this.options.urlPath,
      auth: {
        mode: this.options.auth.mode,
        cookiesInitial: this.options.auth.cookiesInitial,
        cookiesAfterLogin: this.options.auth.cookiesAfterLogin,
        csrfToken: this.options.auth.csrfToken,
      },
      results,
      errors,
    };
  }

  /**
   * Execute a single probe with timing metrics
   */
  private async executeSingleProbe(options: {
    method: string;
    url: string;
    headers: Record<string, string>;
  }): Promise<ProbeResult> {
    // First, get the response with headers and body
    const response = await this.curlResponse(options);
    
    // Then, get detailed timing metrics
    const timings = await this.curlTimings(options);

    return {
      ...response,
      timings,
    };
  }

  /**
   * Execute curl for response data (headers, body, status)
   */
  private async curlResponse(options: {
    method: string;
    url: string;
    headers: Record<string, string>;
  }): Promise<Omit<ProbeResult, 'timings'>> {
    const args = [
      '-sS',                    // Silent with errors
      '-L',                     // Follow redirects
      '--http2',               // Prefer HTTP/2
      '-D', '-',               // Dump headers to stdout
      '-c', this.options.jarPath,  // Write cookies
      '-b', this.options.jarPath,  // Read cookies
      '-X', options.method,
      '--max-time', Math.floor(this.options.timeoutMs! / 1000).toString(),
    ];

    // Add headers
    for (const [key, value] of Object.entries(options.headers)) {
      args.push('-H', `${key}: ${value}`);
    }

    args.push(options.url);

    const { stdout } = await this.spawnCurl(args);
    
    return this.parseResponse(stdout);
  }

  /**
   * Execute curl for timing metrics only
   */
  private async curlTimings(options: {
    method: string;
    url: string;
    headers: Record<string, string>;
  }): Promise<ProbeTimings> {
    const writeFormat = JSON.stringify({
      ip: '%{remote_ip}',
      proto: '%{http_version}',
      code: '%{response_code}',
      type: '%{content_type}',
      size: '%{size_download}',
      speed: '%{speed_download}',
      dns: '%{time_namelookup}',
      connect: '%{time_connect}',
      tls: '%{time_appconnect}',
      ttfb: '%{time_starttransfer}',
      total: '%{time_total}',
      redir: '%{redirect_url}',
    });

    const args = [
      '-sS',
      '-o', '/dev/null',       // Discard response body
      '--http2',
      '-L',
      '-c', this.options.jarPath,
      '-b', this.options.jarPath,
      '-w', writeFormat,
      '-X', options.method,
      '--max-time', Math.floor(this.options.timeoutMs! / 1000).toString(),
    ];

    // Add headers
    for (const [key, value] of Object.entries(options.headers)) {
      args.push('-H', `${key}: ${value}`);
    }

    args.push(options.url);

    const { stdout } = await this.spawnCurl(args);
    
    try {
      const metrics = JSON.parse(stdout.trim());
      return {
        ip: metrics.ip || '',
        proto: metrics.proto || '',
        dns: parseFloat(metrics.dns) || 0,
        connect: parseFloat(metrics.connect) || 0,
        tls: parseFloat(metrics.tls) || 0,
        ttfb: parseFloat(metrics.ttfb) || 0,
        total: parseFloat(metrics.total) || 0,
        speed: parseFloat(metrics.speed) || 0,
        size: parseFloat(metrics.size) || 0,
      };
    } catch (error) {
      log.debug('Failed to parse timing metrics', { stdout });
      throw new Error(`Invalid timing JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Spawn curl process and return stdout/stderr
   */
  private async spawnCurl(args: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const curl = spawn('curl', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: this.options.timeoutMs,
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
          reject(new Error(`curl failed with exit code ${code}: ${stderr}`));
          return;
        }

        resolve({ stdout, stderr });
      });

      curl.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Parse curl response with headers and body
   */
  private parseResponse(response: string): Omit<ProbeResult, 'timings'> {
    const parts = response.split('\r\n\r\n');
    const headerSection = parts[0] || '';
    const bodySection = parts.slice(1).join('\r\n\r\n');

    // Extract status from first header line
    const statusMatch = headerSection.match(/HTTP\/[\d.]+\s+(\d+)/);
    const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;

    // Parse headers
    const headers = this.parseHeaders(headerSection);
    const securityHeaders = this.extractSecurityHeaders(headers);
    const redirects = this.extractRedirects(response);
    const cookies = this.extractCookieNames(headerSection);

    // Extract content info
    const contentType = headers['content-type'] || headers['Content-Type'];
    const encoding = this.extractEncoding(headers);

    // Process body sample with size limit and redaction
    const bodySample = this.processBodySample(bodySection);

    return {
      status,
      headers,
      contentType,
      encoding,
      bodySample,
      redirects,
      cookies,
      securityHeaders,
    };
  }

  /**
   * Parse headers from curl response
   */
  private parseHeaders(headerSection: string): Record<string, string> {
    const headers: Record<string, string> = {};
    const lines = headerSection.split('\r\n');

    for (const line of lines) {
      if (line.includes(':')) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();
        if (key && value) {
          headers[key.trim()] = value;
        }
      }
    }

    return headers;
  }

  /**
   * Extract security-relevant headers
   */
  private extractSecurityHeaders(headers: Record<string, string>): Record<string, string> {
    const securityHeaderNames = [
      'cache-control',
      'pragma',
      'content-security-policy',
      'x-frame-options',
      'x-content-type-options',
      'strict-transport-security',
      'x-xss-protection',
      'referrer-policy',
      'permissions-policy',
      'x-forwarded-proto',
      'server',
    ];

    const securityHeaders: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (securityHeaderNames.includes(lowerKey)) {
        securityHeaders[lowerKey] = value;
      }
    }

    return securityHeaders;
  }

  /**
   * Extract redirect chain from response
   */
  private extractRedirects(response: string): string[] {
    const redirects: string[] = [];
    const locationRegex = /Location:\s*([^\r\n]+)/gi;
    let match;

    while ((match = locationRegex.exec(response)) !== null) {
      const location = match[1].trim();
      if (location && !redirects.includes(location)) {
        redirects.push(location);
      }
    }

    return redirects;
  }

  /**
   * Extract cookie names from Set-Cookie headers
   */
  private extractCookieNames(headerSection: string): string[] {
    const cookies: string[] = [];
    const setCookieRegex = /Set-Cookie:\s*([^=]+)=/gi;
    let match;

    while ((match = setCookieRegex.exec(headerSection)) !== null) {
      const cookieName = match[1].trim();
      if (!cookies.includes(cookieName)) {
        cookies.push(cookieName);
      }
    }

    return cookies;
  }

  /**
   * Extract encoding from headers
   */
  private extractEncoding(headers: Record<string, string>): string | undefined {
    const contentType = headers['content-type'] || headers['Content-Type'];
    if (contentType) {
      const charsetMatch = contentType.match(/charset=([^;\s]+)/i);
      if (charsetMatch) {
        return charsetMatch[1];
      }
    }

    const contentEncoding = headers['content-encoding'] || headers['Content-Encoding'];
    return contentEncoding;
  }

  /**
   * Process body sample with size limit and security redaction
   */
  private processBodySample(body: string): string {
    if (!body) return '';

    // Truncate to size limit
    let sample = body.substring(0, this.options.bodyLimit);
    
    // Add truncation indicator if needed
    if (body.length > this.options.bodyLimit!) {
      sample += `\n... [truncated, ${body.length - this.options.bodyLimit!} more bytes]`;
    }

    // Security redaction
    sample = this.redactSecrets(sample);

    return sample;
  }

  /**
   * Redact potential secrets from content
   */
  private redactSecrets(content: string): string {
    let redacted = content;

    // JWT-like tokens (long base64 segments)
    redacted = redacted.replace(
      /[A-Za-z0-9+/]{32,}={0,2}/g,
      '<redacted-token>'
    );

    // API keys and similar patterns
    redacted = redacted.replace(
      /(api[_-]?key|access[_-]?token|bearer\s+|authorization:\s*)['"]\s*[^'"]{16,}/gi,
      '$1<redacted>'
    );

    // Session IDs
    redacted = redacted.replace(
      /(session[_-]?id|sessionid|sid)['":\s=]*[^'",\s]{16,}/gi,
      '$1=<redacted>'
    );

    // Password fields (in JSON/forms)
    redacted = redacted.replace(
      /(["']password["']:\s*["'])[^"']{3,}(["'])/gi,
      '$1<redacted>$2'
    );

    return redacted;
  }

  /**
   * Static factory method for easy usage
   */
  static async probe(options: ProbeOptions): Promise<HttpProbeData> {
    const prober = new HttpProber(options);
    return prober.probeEndpoint();
  }
}
