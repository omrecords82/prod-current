/**
 * Centralized Configuration Module
 * Loads and validates configuration from environment variables
 * Provides backward-compatible mapping from legacy .env keys
 */

import { configSchema } from './schema';
import { formatConfigForLog } from './redact';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Load environment variables
 * Supports .env.production and .env.development files
 */
function loadEnvironment() {
  // dotenv may have been loaded by index.js, but we ensure it's loaded here
  const env = process.env.NODE_ENV || 'development';
  const envFile = env === 'production' ? '.env.production' : '.env.development';
  const envPath = path.resolve(__dirname, '../../', envFile);

  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath, override: false });
  }

  // Also try root .env
  const rootEnvPath = path.resolve(__dirname, '../../', '.env');
  if (fs.existsSync(rootEnvPath)) {
    require('dotenv').config({ path: rootEnvPath, override: false });
  }
}

/**
 * Map legacy environment variables to canonical config structure
 */
function mapEnvironmentToConfig() {
  const env = process.env;

  // Server config
  const server = {
    env: env.NODE_ENV || 'development',
    port: env.PORT,
    host: env.HOST,
    baseUrl: env.BASE_URL || env.FRONTEND_URL,
    trustProxy: env.TRUST_PROXY !== 'false',
  };

  // Database config - App database
  const dbApp = {
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    port: env.DB_PORT,
  };

  // Database config - Auth database (separate from app DB)
  const dbAuth = {
    host: env.AUTH_DB_HOST || env.DB_HOST, // Fallback to app DB host
    user: env.AUTH_DB_USER || env.DB_USER, // Fallback to app DB user
    password: env.AUTH_DB_PASSWORD || env.DB_PASSWORD, // Fallback to app DB password
    database: env.AUTH_DB_NAME || env.AUTH_DB || env.DB_NAME, // Fallback to app DB name
    port: env.AUTH_DB_PORT || env.DB_PORT,
  };

  // Session config
  const session = {
    secret: env.SESSION_SECRET,
    cookieName: env.SESSION_COOKIE_NAME,
    cookieDomain: env.SESSION_COOKIE_DOMAIN,
    secure: env.SESSION_SECURE,
    sameSite: env.SESSION_SAME_SITE,
    maxAgeMs: env.SESSION_MAX_AGE_MS,
    store: env.SESSION_STORE,
  };

  // CORS config
  const corsOrigins = env.CORS_ORIGINS || env.ALLOWED_ORIGINS || env.FRONTEND_URL;
  const cors = {
    allowedOrigins: corsOrigins ? corsOrigins.split(',').map((s) => s.trim()) : undefined,
    credentials: env.CORS_CREDENTIALS,
  };

  // Paths config
  const paths = {
    imagesRoot: env.IMAGES_ROOT || env.PUBLIC_IMAGES_ROOT,
    docsRoot: env.DOCS_ROOT,
    uploadsRoot: env.UPLOADS_ROOT || env.UPLOAD_BASE_PATH,
    tempRoot: env.TEMP_ROOT || env.TMP_DIR,
  };

  // Features config
  const features = {
    interactiveReports: env.FEATURE_INTERACTIVE_REPORTS,
    notifications: env.FEATURE_NOTIFICATIONS,
    ocr: env.FEATURE_OCR,
    certificates: env.FEATURE_CERTIFICATES,
  };

  return {
    server: Object.fromEntries(Object.entries(server).filter(([_, v]) => v !== undefined)),
    db: {
      app: Object.fromEntries(Object.entries(dbApp).filter(([_, v]) => v !== undefined)),
      auth: Object.fromEntries(Object.entries(dbAuth).filter(([_, v]) => v !== undefined)),
    },
    session: Object.fromEntries(Object.entries(session).filter(([_, v]) => v !== undefined)),
    cors: Object.fromEntries(Object.entries(cors).filter(([_, v]) => v !== undefined)),
    paths: Object.fromEntries(Object.entries(paths).filter(([_, v]) => v !== undefined)),
    features: Object.fromEntries(Object.entries(features).filter(([_, v]) => v !== undefined)),
  };
}

/**
 * Load and validate configuration
 */
function loadConfig(): any {
  // Load environment variables
  loadEnvironment();

  // Map environment to config structure
  const envConfig = mapEnvironmentToConfig();

  // Parse and validate with Zod schema
  const result = configSchema.safeParse(envConfig);

  if (!result.success) {
    console.error('❌ Configuration validation failed:');
    console.error(JSON.stringify(result.error.issues, null, 2));
    throw new Error('Invalid configuration. Check environment variables.');
  }

  return result.data;
}

// Load configuration once at module load time
const config = loadConfig();

// Freeze the config object to prevent mutations
Object.freeze(config);
Object.freeze(config.server);
Object.freeze(config.db);
Object.freeze(config.db.app);
Object.freeze(config.db.auth);
Object.freeze(config.session);
Object.freeze(config.cors);
Object.freeze(config.paths);
Object.freeze(config.features);

// Log configuration at startup (redacted)
console.log('✅ Loaded server configuration:');
console.log(formatConfigForLog(config));

// Export for CommonJS (TypeScript will compile to module.exports)
// Export directly - don't try to add properties to frozen object
module.exports = config;
