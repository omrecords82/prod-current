/**
 * Deployment Fingerprint API
 * GET /api/admin/deployment-fingerprint
 *
 * Returns the running OM backend's build fingerprint (gitSha, builtAt, etc.)
 * so the super_admin DeploymentFingerprintBar can show what code is actually
 * deployed. Pairs with /version.json (frontend), which is a static file
 * stamped by the same deploy script.
 *
 * super_admin only — this is a developer reminder, not user-facing data.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middleware/auth');

const requireSuperAdmin = requireRole(['super_admin']);

// version.json is written by om-deploy.sh into <server>/version.json. The
// compiled file lives at server/dist/routes/admin/deployment-fingerprint.js,
// so '../../../version.json' resolves to server/version.json.
const VERSION_FILE = path.resolve(__dirname, '../../../version.json');

router.get('/deployment-fingerprint', requireAuth, requireSuperAdmin, (req, res) => {
  let fingerprint = {
    app: 'om',
    target: 'backend',
    gitSha: 'unknown',
    gitBranch: 'unknown',
    builtAt: null,
    buildHost: null,
  };

  try {
    if (fs.existsSync(VERSION_FILE)) {
      const raw = fs.readFileSync(VERSION_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      fingerprint = {
        app: parsed.app || 'om',
        target: parsed.target || 'backend',
        gitSha: parsed.gitSha || 'unknown',
        gitBranch: parsed.gitBranch || 'unknown',
        builtAt: parsed.builtAt || null,
        buildHost: parsed.buildHost || null,
      };
    }
  } catch (_err) {
    // Leave defaults — no sensitive info to leak; the bar will show 'unknown'.
  }

  res.set('Cache-Control', 'no-store');
  return res.json({ success: true, fingerprint });
});

module.exports = router;
