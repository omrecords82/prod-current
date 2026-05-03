// server/src/middleware/serviceTokenAuth.js
// Service-token authentication for the OM platform-provider
// surface (CS-OMSTUDIO-PLATFORM-PROVIDERS-V1).
//
// OMStudio sends X-Service-Token + (optionally) X-On-Behalf-Of-
// Email + X-Source-System on every cross-host call. This
// middleware validates the token and surfaces caller info on
// req.serviceCaller for downstream auditing.
//
// 503 service_token_not_configured  — env not set
// 401 missing_service_token         — header absent
// 401 invalid_service_token         — token mismatch (constant-time compare)

const crypto = require('crypto');

function constantTimeEquals(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

function requireServiceToken(req, res, next) {
  const expected = process.env.OMSTUDIO_SERVICE_TOKEN || '';
  if (!expected) {
    return res.status(503).json({ error: 'service_token_not_configured' });
  }
  const provided = req.headers['x-service-token'];
  if (!provided || typeof provided !== 'string') {
    return res.status(401).json({ error: 'missing_service_token' });
  }
  if (!constantTimeEquals(provided, expected)) {
    return res.status(401).json({ error: 'invalid_service_token' });
  }
  // Capture for audit / downstream filtering. Never trust these
  // for authorization — they're informational only.
  req.serviceCaller = {
    email: typeof req.headers['x-on-behalf-of-email'] === 'string'
      ? req.headers['x-on-behalf-of-email']
      : null,
    sourceSystem: typeof req.headers['x-source-system'] === 'string'
      ? req.headers['x-source-system']
      : 'unknown',
  };
  next();
}

module.exports = { requireServiceToken };
