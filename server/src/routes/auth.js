// JWT-based auth routes using orthodoxmetrics_db
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const router = express.Router();

// Create connection pool for orthodoxmetrics_db
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'orthodoxapps',
  password: process.env.DB_PASSWORD || 'Summerof1982@!',
  database: process.env.DB_DATABASE || 'orthodoxmetrics_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// JWT configuration
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'change_me_access_256bit';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'change_me_refresh_256bit';
const ACCESS_TOKEN_TTL = parseInt(process.env.ACCESS_TOKEN_TTL || '900'); // 15 minutes
const REFRESH_TOKEN_TTL = parseInt(process.env.REFRESH_TOKEN_TTL || '2592000'); // 30 days

// Helper functions
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const generateRefreshToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const verifyRecaptchaToken = async (token, ip) => {
  const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  if (isLocal) {
    console.log(`[RECAPTCHA] Bypassing verification for localhost request from IP: ${ip}`);
    return true;
  }
  
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret && !token) {
    console.log('[RECAPTCHA] Bypassing verification since no secret key is set and no token provided');
    return true;
  }

  const verifySecret = secret || '6LeIxAcTAAAAAGG-vFI1TnFTxWb0N-C026336z1N';
  if (!token) {
    console.warn('[RECAPTCHA] Verification failed: missing token');
    return false;
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: verifySecret,
        response: token,
        remoteip: ip
      })
    });
    const data = await response.json();
    console.log('[RECAPTCHA] verification response success:', data.success);
    return !!data.success;
  } catch (err) {
    console.error('[RECAPTCHA] verification error:', err);
    return false;
  }
};

// POST /api/auth/login - User login with JWT
router.post('/login', async (req, res) => {
  try {
    console.log('[AUTH] Login attempt - Body:', JSON.stringify(req.body));
    console.log('[AUTH] Content-Type:', req.headers['content-type']);
    
    // Handle both 'email' and 'username' fields for compatibility
    const { email, username, password, recaptchaToken } = req.body;
    const loginEmail = email || username;

    // Verify Google reCAPTCHA
    const isValidRecaptcha = await verifyRecaptchaToken(recaptchaToken, req.ip);
    if (!isValidRecaptcha) {
      return res.status(400).json({
        success: false,
        message: 'reCAPTCHA verification failed. Please try again.'
      });
    }

    if (!loginEmail || !password) {
      console.log('[AUTH] Missing credentials - email/username:', !!loginEmail, 'password:', !!password);
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user in orthodoxmetrics_db
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ? AND is_active = 1',
      [loginEmail]
    );

    const user = users[0];
    if (!user) {
      console.log('[AUTH] User not found for email:', loginEmail);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is locked
    if (user.is_locked) {
      return res.status(401).json({
        success: false,
        message: 'Account is locked. Please contact support.'
      });
    }

    // Parish onboard accounts authenticate via Keycloak (orthodoxmetrics realm).
    if (user.onboarding_request_id) {
      return res.status(403).json({
        success: false,
        message: 'Parish accounts must sign in at orthodoxmetrics.com/auth/login2 using your organization credentials.',
        keycloak_required: true,
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      churchId: user.church_id
    };

    const accessToken = jwt.sign(tokenPayload, JWT_ACCESS_SECRET, {
      expiresIn: ACCESS_TOKEN_TTL
    });

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000);

    // Housekeeping: purge revoked and expired tokens for this user
    await pool.execute(
      `DELETE FROM refresh_tokens WHERE user_id = ? AND (revoked_at IS NOT NULL OR expires_at <= NOW())`,
      [user.id]
    ).catch(err => console.error('[AUTH] Token cleanup failed:', err.message));

    // Enforce session limits: super_admin = 5 sessions, others = 3 sessions
    const maxSessions = user.role === 'super_admin' ? 5 : 3;

    // Get current active sessions for this user
    const [activeSessions] = await pool.execute(
      `SELECT id FROM refresh_tokens
       WHERE user_id = ? AND expires_at > NOW() AND revoked_at IS NULL
       ORDER BY expires_at ASC`,
      [user.id]
    );

    // Delete oldest sessions if limit exceeded
    if (activeSessions.length >= maxSessions) {
      const sessionsToDelete = activeSessions.length - maxSessions + 1;
      const idsToDelete = activeSessions.slice(0, sessionsToDelete).map(s => s.id);

      if (idsToDelete.length > 0) {
        await pool.execute(
          `DELETE FROM refresh_tokens WHERE id IN (${idsToDelete.map(() => '?').join(',')})`,
          idsToDelete
        );
        console.log(`[AUTH] Evicted ${idsToDelete.length} oldest session(s) for user ${user.email} (limit: ${maxSessions})`);
      }
    }

    // Save refresh token
    await pool.execute(
      `INSERT INTO refresh_tokens 
       (user_id, token_hash, expires_at, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?)`,
      [user.id, refreshTokenHash, expiresAt, req.ip || null, req.headers['user-agent'] || null]
    );

    // Update last login
    await pool.execute(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    // Set refresh token as httpOnly cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    // Set session data for backward compatibility
    if (!req.session) {
      console.error('[AUTH] CRITICAL: req.session is not available - session middleware may not be configured correctly');
      return res.status(500).json({
        success: false,
        message: 'Session middleware not configured'
      });
    }

    // Regenerate session to get a fresh session ID and Set-Cookie header
    // This ensures stale cookies from previous sessions are replaced
    // CRITICAL: Save user data before regenerate, restore after
    const userData = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      church_id: user.church_id,
      account_expires_at: user.account_expires_at || null,
      last_login: user.last_login || null
    };

    await new Promise((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) {
          console.error('[AUTH] CRITICAL: Session regenerate failed:', err.message);
          // Don't reject - continue with existing session
          // But log the issue for debugging
          console.warn('[AUTH] Continuing with existing session (regenerate failed)');
        } else {
          console.log('[AUTH] ✅ Session regenerated successfully');
        }
        resolve();
      });
    });

    // Explicitly set session data (restore after regenerate)
    req.session.user = userData;
    req.session.userId = user.id; // Explicit userId for session lookups
    req.session.loginTime = new Date();
    req.session.lastActivity = new Date();
    
    // Mark session as modified to ensure it's saved
    req.session.touch();
    
    // CRITICAL: Explicitly save session before responding
    // This ensures session is persisted to store before response is sent
    console.log('[AUTH] Saving session with user data:', {
      sessionID: req.sessionID,
      userId: req.session.user.id,
      email: req.session.user.email,
      role: req.session.user.role
    });
    
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('[AUTH] CRITICAL: Failed to save session:', err);
          console.error('[AUTH] Session save error details:', {
            error: err.message,
            stack: err.stack,
            sessionID: req.sessionID,
            userId: user.id
          });
          reject(err);
        } else {
          console.log(`✅ Session saved for user ${user.id} (${user.email}), sessionID: ${req.sessionID}`);
          // Verify session was saved by checking store
          if (req.sessionStore && req.sessionStore.get) {
            req.sessionStore.get(req.sessionID, (storeErr, storedSession) => {
              if (storeErr) {
                console.error('[AUTH] CRITICAL: Could not verify session in store:', storeErr.message);
              } else if (storedSession && storedSession.user) {
                console.log(`✅ Session verified in store for user ${storedSession.user.email}`);
                console.log(`✅ Stored session data:`, {
                  userId: storedSession.user.id,
                  email: storedSession.user.email,
                  role: storedSession.user.role
                });
              } else {
                console.error('[AUTH] CRITICAL: Session saved but user data NOT found in store');
                console.error('[AUTH] Stored session keys:', storedSession ? Object.keys(storedSession) : 'NULL');
              }
              resolve();
            });
          } else {
            console.warn('[AUTH] Session store not available for verification');
            resolve();
          }
        }
      });
    });

    // Log login activity (non-blocking)
    pool.execute(
      `INSERT INTO activity_log (user_id, action, details, ip_address, user_agent, created_at)
       VALUES (?, 'login', ?, ?, ?, NOW())`,
      [
        user.id,
        JSON.stringify({ email: user.email, role: user.role }),
        req.ip || 'unknown',
        (req.get('User-Agent') || 'unknown').substring(0, 255)
      ]
    ).catch(err => console.error('Failed to log login activity:', err.message));

    console.log(`✅ JWT Authentication successful for: ${loginEmail} Role: ${user.role}`);
    console.log(`✅ Session ID: ${req.sessionID}, User ID: ${user.id}`);
    console.log(`✅ Session cookie will be sent with name: orthodoxmetrics.sid`);

    return res.json({
      success: true,
      message: 'Login successful',
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        church_id: user.church_id,
        nick: user.Nick || user.nick || user.display_name || null,
        last_login: user.last_login,
        must_change_password: !!user.must_change_password,
        onboarding_request_id: user.onboarding_request_id || null,
      },
      onboarding_redirect: user.must_change_password
        ? '/onboarding/change-password'
        : (user.onboarding_request_id ? await (async () => {
            try {
              const onboardingService = require('../services/onboardingService');
              const ob = await onboardingService.getByPublicId(user.onboarding_request_id);
              if (ob && ob.status !== 'active') {
                if (!ob.first_login_completed || ob.status === 'awaiting_first_login') {
                  return '/onboarding/change-password';
                }
                if (!ob.table_configuration_completed) {
                  return '/onboarding/record-tables';
                }
                if (!ob.layout_configuration_completed) {
                  return '/onboarding/record-layouts';
                }
              }
            } catch (_) { /* ignore */ }
            return null;
          })() : null),
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    console.error('[AUTH] Error stack:', error.stack);
    
    // If session save failed, still try to respond
    return res.status(500).json({
      success: false,
      message: 'Internal server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies?.refresh_token || req.body?.refresh_token;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token provided'
      });
    }

    const tokenHash = hashToken(refreshToken);
    
    // Find valid refresh token
    const [tokens] = await pool.execute(
      `SELECT * FROM refresh_tokens 
       WHERE token_hash = ? 
       AND expires_at > NOW() 
       AND revoked_at IS NULL`,
      [tokenHash]
    );

    const storedToken = tokens[0];
    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Get user
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE id = ? AND is_active = 1',
      [storedToken.user_id]
    );

    const user = users[0];
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Delete the consumed token (not just revoke — keep the table clean)
    await pool.execute(
      'DELETE FROM refresh_tokens WHERE id = ?',
      [storedToken.id]
    );

    // Housekeeping: purge revoked and expired tokens for this user
    await pool.execute(
      `DELETE FROM refresh_tokens WHERE user_id = ? AND (revoked_at IS NOT NULL OR expires_at <= NOW())`,
      [user.id]
    ).catch(err => console.error('[AUTH] Token cleanup failed:', err.message));

    // Generate new tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      churchId: user.church_id
    };

    const newAccessToken = jwt.sign(tokenPayload, JWT_ACCESS_SECRET, {
      expiresIn: ACCESS_TOKEN_TTL
    });

    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000);

    // Enforce session limits: super_admin = 5, others = 3
    const maxSessions = user.role === 'super_admin' ? 5 : 3;

    const [activeSessions] = await pool.execute(
      `SELECT id FROM refresh_tokens
       WHERE user_id = ? AND expires_at > NOW() AND revoked_at IS NULL
       ORDER BY expires_at ASC`,
      [user.id]
    );

    if (activeSessions.length >= maxSessions) {
      const sessionsToDelete = activeSessions.length - maxSessions + 1;
      const idsToDelete = activeSessions.slice(0, sessionsToDelete).map(s => s.id);

      if (idsToDelete.length > 0) {
        await pool.execute(
          `DELETE FROM refresh_tokens WHERE id IN (${idsToDelete.map(() => '?').join(',')})`,
          idsToDelete
        );
        console.log(`[AUTH] Evicted ${idsToDelete.length} oldest session(s) for ${user.email} during refresh (limit: ${maxSessions})`);
      }
    }

    // Save new refresh token
    await pool.execute(
      `INSERT INTO refresh_tokens 
       (user_id, token_hash, expires_at, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?)`,
      [user.id, newRefreshTokenHash, expiresAt, req.ip || null, req.headers['user-agent'] || null]
    );

    // Set new refresh token as httpOnly cookie
    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    return res.json({
      success: true,
      message: 'Token refreshed successfully',
      access_token: newAccessToken
    });
  } catch (error) {
    console.error('Refresh error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/auth/check - Check authentication status
router.get('/check', async (req, res) => {
  try {
    // Check for JWT token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
        
        // Get fresh user data from database
        const [users] = await pool.execute(
          'SELECT id, email, first_name, last_name, role, church_id, last_login FROM users WHERE id = ? AND is_active = 1',
          [decoded.userId]
        );
        
        if (users[0]) {
          return res.json({
            success: true,
            authenticated: true,
            user: {
              id: users[0].id,
              email: users[0].email,
              first_name: users[0].first_name,
              last_name: users[0].last_name,
              role: users[0].role,
              church_id: users[0].church_id,
              last_login: users[0].last_login
            }
          });
        }
      } catch (error) {
        console.log('[AUTH] Invalid token in check:', error.message);
      }
    }
    
    // Check session as fallback
    if (req.session && req.session.user) {
      return res.json({
        success: true,
        authenticated: true,
        user: req.session.user
      });
    }
    
    return res.json({
      success: true,
      authenticated: false
    });
  } catch (error) {
    console.error('[AUTH] Error checking auth status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check authentication status'
    });
  }
});

// POST /api/auth/logout - User logout
router.post('/logout', async (req, res) => {
  try {
    // Get user from session or JWT
    let userId = null;
    
    // Check Authorization header for JWT
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const payload = jwt.verify(token, JWT_ACCESS_SECRET);
        userId = payload.userId;
      } catch (err) {
        // Token invalid, check session
      }
    }

    // Fall back to session
    if (!userId && req.session?.user) {
      userId = req.session.user.id;
    }

    // Revoke all user tokens if we have a userId
    if (userId) {
      await pool.execute(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
        [userId]
      );

      // Log logout activity (non-blocking)
      pool.execute(
        `INSERT INTO activity_log (user_id, action, details, ip_address, user_agent, created_at)
         VALUES (?, 'logout', ?, ?, ?, NOW())`,
        [
          userId,
          JSON.stringify({ email: req.session?.user?.email || 'unknown' }),
          req.ip || 'unknown',
          (req.get('User-Agent') || 'unknown').substring(0, 255)
        ]
      ).catch(err => console.error('Failed to log logout activity:', err.message));
    }

    // Clear cookies
    res.clearCookie('refresh_token');
    res.clearCookie('orthodoxmetrics.sid', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    });

    // Destroy session, then respond
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destroy error:', err);
          return res.status(500).json({ success: false, message: 'Failed to destroy session' });
        }
        return res.json({ success: true, message: 'Logged out successfully' });
      });
    } else {
      return res.json({ success: true, message: 'Logged out successfully' });
    }
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/auth/verify - Verify token
router.get('/verify', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const payload = jwt.verify(token, JWT_ACCESS_SECRET);

    return res.json({
      success: true,
      user: payload
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
});

// ============================================================================
// Session Validation Endpoint (for nginx/environment gating)
// ============================================================================
router.get('/validate-session', (req, res) => {
  try {
    const session = req.session;
    const user = session && session.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        valid: false,
        message: 'No valid session',
        environment: 'stable'
      });
    }

    const checkSuperAdmin = req.query.check_super_admin === 'true';
    const environment = user.role === 'super_admin' ? 'latest' : 'stable';
    const isSuperAdmin = user.role === 'super_admin';

    if (checkSuperAdmin && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        valid: true,
        message: 'Access denied: super_admin role required',
        role: user.role,
        environment: 'stable',
        isSuperAdmin: false
      });
    }

    res.setHeader('X-Environment', environment);
    res.setHeader('X-User-Role', user.role);
    res.setHeader('X-User-Id', user.id);

    return res.json({
      success: true,
      valid: true,
      role: user.role,
      environment,
      isSuperAdmin,
      userId: user.id,
      email: user.email
    });
  } catch (error) {
    console.error('Session validation error:', error);
    return res.status(500).json({
      success: false,
      valid: false,
      message: 'Internal server error',
      environment: 'stable'
    });
  }
});

// POST /forgot-password — generate temp password and email it
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Look up user (always return success to avoid user enumeration)
    const [rows] = await pool.query(
      'SELECT id, email, first_name, role FROM users WHERE LOWER(email) = ? AND is_active = 1',
      [normalizedEmail]
    );

    if (rows.length === 0) {
      // Don't reveal that the email doesn't exist
      console.log(`[forgot-password] No active user found for: ${normalizedEmail}`);
      return res.json({ success: true, message: 'If an account exists with that email, a password reset link has been sent.' });
    }

    const user = rows[0];

    // Generate a secure temporary password
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let tempPassword = '';
    tempPassword += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    tempPassword += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    tempPassword += '0123456789'[Math.floor(Math.random() * 10)];
    tempPassword += '!@#$%^&*'[Math.floor(Math.random() * 8)];
    for (let i = 4; i < 16; i++) {
      tempPassword += charset[Math.floor(Math.random() * charset.length)];
    }
    tempPassword = tempPassword.split('').sort(() => Math.random() - 0.5).join('');

    // Hash and store
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    await pool.query(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [passwordHash, user.id]
    );

    // Send email
    const { sendPasswordResetEmail } = require('../utils/emailService');
    await sendPasswordResetEmail(user.email, tempPassword, user.first_name);

    console.log(`✅ [forgot-password] Password reset email sent to ${user.email}`);
    return res.json({ success: true, message: 'If an account exists with that email, a password reset link has been sent.' });
  } catch (err) {
    console.error('[forgot-password] Error:', err.message);
    return res.status(500).json({ success: false, message: 'An error occurred. Please try again later.' });
  }
});

// POST /api/auth/bind-refresh — set httpOnly cookie from SPA-stored refresh token (OIDC handoff)
router.post('/bind-refresh', async (req, res) => {
  try {
    const refreshToken =
      req.cookies?.refresh_token
      || req.body?.refresh_token
      || req.headers['x-refresh-token'];
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }
    const tokenHash = hashToken(String(refreshToken));
    const [rows] = await pool.execute(
      `SELECT id, user_id, expires_at, revoked_at FROM refresh_tokens
       WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > NOW() LIMIT 1`,
      [tokenHash],
    );
    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }
    const ua = (req.headers['user-agent'] || '').substring(0, 255);
    await pool.execute(
      'UPDATE refresh_tokens SET ip_address = ?, user_agent = ? WHERE id = ?',
      [req.ip || null, ua || null, rows[0].id],
    );
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_TTL * 1000,
    });
    return res.json({ success: true, message: 'Session bound' });
  } catch (error) {
    console.error('[AUTH] bind-refresh error:', error);
    return res.status(500).json({ success: false, message: 'Failed to bind session' });
  }
});

// Environment info endpoint
router.get('/environment', (req, res) => {
  const session = req.session;
  const user = session && session.user;

  if (!user) {
    return res.json({
      authenticated: false,
      environment: 'stable',
      features: {
        latestAccess: false,
        highRiskFeatures: false
      }
    });
  }

  const environment = user.role === 'super_admin' ? 'latest' : 'stable';

  return res.json({
    authenticated: true,
    environment,
    role: user.role,
    features: {
      latestAccess: environment === 'latest',
      highRiskFeatures: environment === 'latest',
      interactiveReports: true,
      ocrStudio: true,
      recordsV2: true
    }
  });
});

module.exports = router;
