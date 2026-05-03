/**
 * Certificate Templates API — CRUD + resolution + generation
 * Mounted at /api/certificate-templates
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { getAppPool } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { resolveTemplate, determineBaptismVariant } = require('../certificates/template-resolver');
const { mapFieldValues } = require('../certificates/field-mapper');

const ADMIN_ROLES = ['super_admin', 'admin'];
const TEMPLATE_MGMT_ROLES = ['super_admin'];
const TEMPLATE_UPLOAD_ROLES = ['super_admin', 'admin', 'church_admin', 'priest'];

// Frontend uses simplified card labels; backend stores adult/child variants.
// "baptism" without a suffix maps to baptism_child as the canonical variant
// (the more common case in real parish data).
const TEMPLATE_TYPE_ALIAS = {
  baptism: 'baptism_child',
};
function normalizeTemplateType(t) {
  return TEMPLATE_TYPE_ALIAS[t] || t;
}
const VALID_TEMPLATE_TYPES = new Set([
  'baptism_adult', 'baptism_child', 'marriage', 'reception', 'funeral', 'chrismation', 'recognition',
]);

/* ══════════════════════════════════════════════════════════
   Template Groups — List / Get
   ══════════════════════════════════════════════════════════ */

// GET /api/certificate-templates/groups — List all template groups
router.get('/groups', requireAuth, async (req, res) => {
  try {
    const { jurisdiction, type } = req.query;
    let query = `SELECT g.*, j.name as jurisdiction_name,
      (SELECT COUNT(*) FROM certificate_templates t WHERE t.template_group_id = g.id) as template_count
      FROM certificate_template_groups g
      LEFT JOIN jurisdictions j ON j.id = g.jurisdiction_id
      WHERE 1=1`;
    const params = [];

    if (jurisdiction) { query += ' AND g.jurisdiction_code = ?'; params.push(jurisdiction); }
    if (type) { query += ' AND g.template_type = ?'; params.push(type); }
    query += ' ORDER BY g.jurisdiction_code, g.template_type';

    const [rows] = await getAppPool().query(query, params);
    res.json({ groups: rows });
  } catch (err) {
    console.error('[certificate-templates] GET /groups error:', err.message);
    res.status(500).json({ error: 'Failed to list template groups' });
  }
});

/* ══════════════════════════════════════════════════════════
   Templates — CRUD
   ══════════════════════════════════════════════════════════ */

// GET /api/certificate-templates — List templates with optional filters
router.get('/', requireAuth, async (req, res) => {
  try {
    const { group_id, jurisdiction, type, church_id, active_only } = req.query;
    let query = `SELECT t.*, g.jurisdiction_code, g.template_type, g.name as group_name,
      g.is_system_default, j.name as jurisdiction_name,
      (SELECT COUNT(*) FROM certificate_template_fields f WHERE f.template_id = t.id) as field_count
      FROM certificate_templates t
      JOIN certificate_template_groups g ON g.id = t.template_group_id
      LEFT JOIN jurisdictions j ON j.id = g.jurisdiction_id
      WHERE 1=1`;
    const params = [];

    if (group_id) { query += ' AND t.template_group_id = ?'; params.push(group_id); }
    if (jurisdiction) { query += ' AND g.jurisdiction_code = ?'; params.push(jurisdiction); }
    if (type) { query += ' AND g.template_type = ?'; params.push(type); }
    if (church_id) { query += ' AND t.church_id = ?'; params.push(church_id); }
    if (active_only === 'true') { query += ' AND t.is_active = TRUE AND g.is_active = TRUE'; }
    query += ' ORDER BY g.jurisdiction_code, g.template_type, t.church_id IS NULL DESC, t.created_at DESC';

    const [rows] = await getAppPool().query(query, params);
    res.json({ templates: rows });
  } catch (err) {
    console.error('[certificate-templates] GET / error:', err.message);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

// GET /api/certificate-templates/:id — Get single template with fields
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const [templates] = await getAppPool().query(
      `SELECT t.*, g.jurisdiction_code, g.template_type, g.name as group_name,
        g.is_system_default, j.name as jurisdiction_name
       FROM certificate_templates t
       JOIN certificate_template_groups g ON g.id = t.template_group_id
       LEFT JOIN jurisdictions j ON j.id = g.jurisdiction_id
       WHERE t.id = ?`,
      [req.params.id]
    );
    if (!templates.length) return res.status(404).json({ error: 'Template not found' });

    const [fields] = await getAppPool().query(
      'SELECT * FROM certificate_template_fields WHERE template_id = ? ORDER BY sort_order',
      [req.params.id]
    );

    res.json({ template: templates[0], fields });
  } catch (err) {
    console.error('[certificate-templates] GET /:id error:', err.message);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// PUT /api/certificate-templates/:id — Update template (superadmin only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (!TEMPLATE_MGMT_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Only superadmins can edit templates' });
    }

    const { version_label, is_active, styling_json, field_schema_json } = req.body;
    const updates = [];
    const params = [];

    if (version_label !== undefined) { updates.push('version_label = ?'); params.push(version_label); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }
    if (styling_json !== undefined) { updates.push('styling_json = ?'); params.push(JSON.stringify(styling_json)); }
    if (field_schema_json !== undefined) { updates.push('field_schema_json = ?'); params.push(JSON.stringify(field_schema_json)); }

    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

    params.push(req.params.id);
    await getAppPool().query(`UPDATE certificate_templates SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ success: true });
  } catch (err) {
    console.error('[certificate-templates] PUT /:id error:', err.message);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

/* ══════════════════════════════════════════════════════════
   Template Fields — CRUD
   ══════════════════════════════════════════════════════════ */

// PUT /api/certificate-templates/:id/fields/:fieldId — Update a field
router.put('/:id/fields/:fieldId', requireAuth, async (req, res) => {
  try {
    if (!TEMPLATE_MGMT_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Only superadmins can edit template fields' });
    }

    const allowedFields = ['x', 'y', 'width', 'height', 'font_family', 'font_size', 'font_weight',
      'text_align', 'color', 'text_transform', 'is_required', 'is_multiline', 'sort_order', 'label', 'source_path'];
    const updates = [];
    const params = [];

    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates.push(`${key} = ?`);
        params.push(req.body[key]);
      }
    }

    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

    params.push(req.params.fieldId, req.params.id);
    await getAppPool().query(
      `UPDATE certificate_template_fields SET ${updates.join(', ')} WHERE id = ? AND template_id = ?`,
      params
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[certificate-templates] PUT /:id/fields/:fieldId error:', err.message);
    res.status(500).json({ error: 'Failed to update field' });
  }
});

/* ══════════════════════════════════════════════════════════
   Template Resolution — Determine which template to use
   ══════════════════════════════════════════════════════════ */

// GET /api/certificate-templates/resolve?churchId=X&templateType=Y
router.get('/resolve/match', requireAuth, async (req, res) => {
  try {
    const { churchId, templateType, jurisdictionCode } = req.query;
    if (!templateType) return res.status(400).json({ error: 'templateType is required' });

    const result = await resolveTemplate({
      churchId: churchId ? parseInt(churchId) : null,
      templateType,
      jurisdictionCode,
    });

    if (!result) return res.status(404).json({ error: 'No matching template found' });

    res.json({
      resolution: result.resolution,
      template: result.template,
      fields: result.fields,
    });
  } catch (err) {
    console.error('[certificate-templates] GET /resolve/match error:', err.message);
    res.status(500).json({ error: 'Failed to resolve template' });
  }
});

/* ══════════════════════════════════════════════════════════
   Certificate Generation — Produce PDF from record + template
   ══════════════════════════════════════════════════════════ */

// POST /api/certificate-templates/generate
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { churchId, recordType, recordId, templateType: explicitType } = req.body;
    if (!churchId || !recordType || !recordId) {
      return res.status(400).json({ error: 'churchId, recordType, and recordId are required' });
    }

    const pool = getAppPool();

    // 1. Load the record from the church database
    const { getTenantPool } = require('../config/db');
    const tenantPool = getTenantPool(churchId);
    const tableMap = { baptism: 'baptism_records', marriage: 'marriage_records', funeral: 'funeral_records' };
    const table = tableMap[recordType];
    if (!table) return res.status(400).json({ error: 'Invalid recordType' });

    const [records] = await tenantPool.query(`SELECT * FROM ${table} WHERE id = ?`, [recordId]);
    if (!records.length) return res.status(404).json({ error: 'Record not found' });
    const record = records[0];

    // 2. Determine template type
    let templateType = explicitType;
    if (!templateType) {
      if (recordType === 'baptism') {
        templateType = determineBaptismVariant(record);
      } else {
        templateType = recordType;
      }
    }

    // 3. Resolve template
    const resolved = await resolveTemplate({ churchId: parseInt(churchId), templateType });
    if (!resolved) return res.status(404).json({ error: `No template found for type: ${templateType}` });

    // 4. Load church metadata
    const [churches] = await pool.query(
      'SELECT name, rector_name, seal_image_path, signature_image_path FROM churches WHERE id = ?',
      [churchId]
    );
    const church = churches[0] || { name: 'Orthodox Church' };

    // 5. Map fields
    const fieldValues = mapFieldValues(resolved.fields, record, church);

    // 6. Generate PDF
    const { generateFromTemplate } = require('../certificates/pdf-generator-v2');
    const pdfBytes = await generateFromTemplate(resolved.template, resolved.fields, fieldValues);

    // 7. Store generated certificate record
    const fileName = `${recordType}-${recordId}-${Date.now()}.pdf`;
    const filePath = `certificates/generated/${churchId}/${fileName}`;
    const fullPath = path.join(__dirname, '../../storage', filePath);

    // Ensure directory exists
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, Buffer.from(pdfBytes));

    const [insertResult] = await pool.query(
      `INSERT INTO generated_certificates (church_id, record_type, record_id, template_id, file_path, file_size, generated_by, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [churchId, recordType, recordId, resolved.template.id, filePath, pdfBytes.length,
       req.user.id, JSON.stringify({ fieldValues, resolution: resolved.resolution })]
    );

    res.json({
      success: true,
      certificateId: insertResult.insertId,
      filePath,
      templateUsed: resolved.template.group_name,
      resolution: resolved.resolution,
    });
  } catch (err) {
    console.error('[certificate-templates] POST /generate error:', err.message);
    res.status(500).json({ error: 'Failed to generate certificate: ' + err.message });
  }
});

// GET /api/certificate-templates/generate/:certId/download — Download generated certificate
router.get('/generate/:certId/download', requireAuth, async (req, res) => {
  try {
    const [rows] = await getAppPool().query(
      'SELECT * FROM generated_certificates WHERE id = ?',
      [req.params.certId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Certificate not found' });

    const cert = rows[0];
    const fullPath = path.join(__dirname, '../../storage', cert.file_path);
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Certificate file not found' });

    // Update status to downloaded
    await getAppPool().query(
      "UPDATE generated_certificates SET status = 'downloaded' WHERE id = ?",
      [cert.id]
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${cert.record_type}-${cert.record_id}.pdf"`);
    res.send(fs.readFileSync(fullPath));
  } catch (err) {
    console.error('[certificate-templates] GET /generate/:certId/download error:', err.message);
    res.status(500).json({ error: 'Failed to download certificate' });
  }
});

// GET /api/certificate-templates/generated — List generated certificates
router.get('/generated/list', requireAuth, async (req, res) => {
  try {
    const { church_id, record_type, limit = 50 } = req.query;
    const user = req.user;
    const churchId = church_id || user.active_church_id || user.church_id;

    let query = `SELECT gc.*, ct.version_label, g.name as template_name, g.jurisdiction_code
      FROM generated_certificates gc
      JOIN certificate_templates ct ON ct.id = gc.template_id
      JOIN certificate_template_groups g ON g.id = ct.template_group_id
      WHERE 1=1`;
    const params = [];

    if (churchId && !ADMIN_ROLES.includes(user.role)) {
      query += ' AND gc.church_id = ?'; params.push(churchId);
    } else if (church_id) {
      query += ' AND gc.church_id = ?'; params.push(church_id);
    }
    if (record_type) { query += ' AND gc.record_type = ?'; params.push(record_type); }

    query += ' ORDER BY gc.generated_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const [rows] = await getAppPool().query(query, params);
    res.json({ certificates: rows });
  } catch (err) {
    console.error('[certificate-templates] GET /generated/list error:', err.message);
    res.status(500).json({ error: 'Failed to list generated certificates' });
  }
});

/* ══════════════════════════════════════════════════════════
   Jurisdictions Summary — Available jurisdictions with template counts
   ══════════════════════════════════════════════════════════ */

router.get('/jurisdictions/summary', requireAuth, async (req, res) => {
  try {
    const [rows] = await getAppPool().query(
      `SELECT g.jurisdiction_code, j.name as jurisdiction_name,
        COUNT(DISTINCT g.id) as group_count,
        COUNT(DISTINCT t.id) as template_count
       FROM certificate_template_groups g
       LEFT JOIN jurisdictions j ON j.id = g.jurisdiction_id
       LEFT JOIN certificate_templates t ON t.template_group_id = g.id
       WHERE g.is_active = TRUE
       GROUP BY g.jurisdiction_code, j.name
       ORDER BY j.name`
    );
    res.json({ jurisdictions: rows });
  } catch (err) {
    console.error('[certificate-templates] GET /jurisdictions/summary error:', err.message);
    res.status(500).json({ error: 'Failed to list jurisdictions' });
  }
});

/* ══════════════════════════════════════════════════════════
   Per-Type Preview + Upload — used by /portal/certificates UI
   ══════════════════════════════════════════════════════════ */

// Multer config for template PDF uploads. PDFs only, max 10 MB. Files are
// staged in a per-church folder under storage so the deploy-tree treats
// them like any other artifact.
const TEMPLATE_UPLOAD_MAX_SIZE = 10 * 1024 * 1024; // 10 MB
function templateUploadDir(churchId) {
  const dir = path.resolve(__dirname, '../../storage/certificates/templates/church-' + Number(churchId));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}
const templateUpload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const cid = Number(req.user && req.user.church_id);
      if (!Number.isFinite(cid) || cid <= 0) {
        return cb(new Error('No church context on request'));
      }
      cb(null, templateUploadDir(cid));
    },
    filename: (req, file, cb) => {
      const t = normalizeTemplateType(req.params.templateType || 'unknown').replace(/[^a-z0-9_]/gi, '');
      const ext = path.extname(file.originalname).toLowerCase() === '.pdf' ? '.pdf' : '.pdf';
      cb(null, `${t}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: TEMPLATE_UPLOAD_MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    // Trust nothing — we re-validate the magic bytes after upload below.
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      return cb(null, true);
    }
    cb(new Error('Only PDF files are allowed'));
  },
}).single('file');

// Wraps multer to surface friendly JSON errors instead of HTML 500s.
function handleTemplateUpload(req, res, next) {
  templateUpload(req, res, (err) => {
    if (err) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ success: false, error: err.message || 'Upload failed' });
    }
    next();
  });
}

// Verify a freshly uploaded file is actually a PDF (magic bytes %PDF-).
function isLikelyPdf(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(5);
    fs.readSync(fd, buf, 0, 5, 0);
    fs.closeSync(fd);
    return buf.toString('latin1').startsWith('%PDF-');
  } catch {
    return false;
  }
}

// GET /api/certificate-templates/by-type/:templateType
// Returns the canonical template the user's church will use for this type.
// Combines church-specific override (if any) with the system default.
router.get('/by-type/:templateType', requireAuth, async (req, res) => {
  try {
    const churchId = Number(req.user && req.user.church_id);
    if (!Number.isFinite(churchId) || churchId <= 0) {
      return res.status(400).json({ success: false, error: 'No church context on request' });
    }
    const templateType = normalizeTemplateType(req.params.templateType);
    if (!VALID_TEMPLATE_TYPES.has(templateType)) {
      return res.status(400).json({ success: false, error: `Unknown template type: ${req.params.templateType}` });
    }

    const resolved = await resolveTemplate({ churchId, templateType });
    if (!resolved) {
      return res.status(404).json({ success: false, error: `No template registered for ${templateType}` });
    }

    const tpl = resolved.template;
    res.json({
      success: true,
      requestedType: req.params.templateType,
      resolvedType: templateType,
      resolution: resolved.resolution || (tpl.church_id ? 'church_specific' : 'system_default'),
      template: {
        id: tpl.id,
        templateType: tpl.template_type || templateType,
        groupName: tpl.group_name || null,
        jurisdictionCode: tpl.jurisdiction_code || null,
        versionLabel: tpl.version_label || null,
        churchId: tpl.church_id || null,
        backgroundAssetPath: tpl.background_asset_path || null,
        pageWidth: Number(tpl.page_width) || 612,
        pageHeight: Number(tpl.page_height) || 792,
        renderMode: tpl.render_mode || 'pdf_overlay',
        isActive: !!tpl.is_active,
        updatedAt: tpl.updated_at || null,
      },
      fieldCount: Array.isArray(resolved.fields) ? resolved.fields.length : 0,
      previewUrl: `/api/certificate-templates/${tpl.id}/background.pdf`,
    });
  } catch (err) {
    console.error('[certificate-templates] GET /by-type error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to resolve template' });
  }
});

// GET /api/certificate-templates/:id/background.pdf
// Streams the template's background PDF for inline preview. Read-only.
// No church scoping — anyone authenticated can preview any registered
// template (templates aren't sensitive; per-record certs are).
router.get('/:id/background.pdf', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid template id' });

    const [rows] = await getAppPool().query(
      'SELECT id, background_asset_path FROM certificate_templates WHERE id = ?',
      [id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Template not found' });
    const tpl = rows[0];
    if (!tpl.background_asset_path) {
      return res.status(404).json({ error: 'Template has no background asset' });
    }

    const fullPath = path.isAbsolute(tpl.background_asset_path)
      ? tpl.background_asset_path
      : path.resolve(__dirname, '../../storage', tpl.background_asset_path);

    // Confine reads to the storage tree — defence against any future
    // background_asset_path that contains '..' or absolute paths outside
    // the allowed root.
    const storageRoot = path.resolve(__dirname, '../../storage');
    if (!fullPath.startsWith(storageRoot + path.sep) && fullPath !== storageRoot) {
      return res.status(403).json({ error: 'Template asset path is outside the storage root' });
    }
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Template asset missing on disk' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="template-${id}.pdf"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    fs.createReadStream(fullPath).pipe(res);
  } catch (err) {
    console.error('[certificate-templates] GET /:id/background.pdf error:', err.message);
    res.status(500).json({ error: 'Failed to read template background' });
  }
});

// POST /api/certificate-templates/by-type/:templateType/upload
// Multipart file upload (field: "file"). Creates a church-specific
// override row if one doesn't already exist for this church + group;
// otherwise updates the existing override's background_asset_path.
//
// Field positions are NOT migrated automatically — when an override is
// first created the church inherits the system default's field shape via
// resolveTemplate's fall-through. If the operator wants to fine-tune
// positions for the new artwork they can do so via the existing
// PUT /:id/fields/:fieldId endpoint.
router.post(
  '/by-type/:templateType/upload',
  requireAuth,
  requireRole(TEMPLATE_UPLOAD_ROLES),
  handleTemplateUpload,
  async (req, res) => {
    let uploadedAbsPath = null;
    try {
      const churchId = Number(req.user && req.user.church_id);
      if (!Number.isFinite(churchId) || churchId <= 0) {
        return res.status(400).json({ success: false, error: 'No church context on request' });
      }
      const templateType = normalizeTemplateType(req.params.templateType);
      if (!VALID_TEMPLATE_TYPES.has(templateType)) {
        return res.status(400).json({ success: false, error: `Unknown template type: ${req.params.templateType}` });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded (expected multipart field "file")' });
      }
      uploadedAbsPath = req.file.path;

      // Hard-validate the magic bytes — fileFilter only checked MIME/ext.
      if (!isLikelyPdf(uploadedAbsPath)) {
        try { fs.unlinkSync(uploadedAbsPath); } catch {}
        return res.status(400).json({ success: false, error: 'Uploaded file is not a valid PDF' });
      }

      const pool = getAppPool();

      // Find the system / jurisdiction template_group for this type.
      // We assume the OCA group is the active one for this type — pick
      // the most recently-created active group as a fallback.
      const [groupRows] = await pool.query(
        `SELECT id FROM certificate_template_groups
          WHERE template_type = ? AND is_active = TRUE
          ORDER BY (jurisdiction_code = 'OCA') DESC, id DESC
          LIMIT 1`,
        [templateType],
      );
      if (!groupRows.length) {
        try { fs.unlinkSync(uploadedAbsPath); } catch {}
        return res.status(404).json({ success: false, error: `No template group registered for ${templateType}` });
      }
      const groupId = groupRows[0].id;

      // Path stored in DB is RELATIVE to server/storage so dist + restore
      // round-trip cleanly. The disk path multer wrote is absolute.
      const storageRoot = path.resolve(__dirname, '../../storage');
      const relativePath = path.relative(storageRoot, uploadedAbsPath).split(path.sep).join('/');

      // Upsert the church override. UNIQUE constraint on
      // (template_group_id, church_id) isn't declared in the schema, so
      // we look up + UPDATE or INSERT manually.
      const [existing] = await pool.query(
        `SELECT id, background_asset_path FROM certificate_templates
          WHERE template_group_id = ? AND church_id = ?
          ORDER BY id DESC LIMIT 1`,
        [groupId, churchId],
      );

      let templateId;
      let action;
      let prevAssetAbs = null;
      if (existing.length) {
        templateId = existing[0].id;
        action = 'updated';
        if (existing[0].background_asset_path) {
          prevAssetAbs = path.resolve(storageRoot, existing[0].background_asset_path);
        }
        await pool.query(
          `UPDATE certificate_templates
              SET background_asset_path = ?, is_active = TRUE, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
          [relativePath, templateId],
        );
      } else {
        action = 'created';
        const [insertResult] = await pool.query(
          `INSERT INTO certificate_templates
             (template_group_id, church_id, version_label, background_asset_path,
              page_width, page_height, render_mode, is_active, created_by)
           VALUES (?, ?, ?, ?, 612, 792, 'pdf_overlay', TRUE, ?)`,
          [groupId, churchId, '1.0-custom', relativePath, req.user.id || null],
        );
        templateId = insertResult.insertId;
      }

      // Best-effort: remove the previous custom asset if we just replaced
      // it with a different filename. Never delete a system default
      // asset (those are shared across churches).
      if (action === 'updated' && prevAssetAbs && prevAssetAbs !== uploadedAbsPath) {
        const churchScopedRoot = path.resolve(storageRoot, 'certificates/templates/church-' + churchId);
        if (prevAssetAbs.startsWith(churchScopedRoot + path.sep)) {
          try { fs.unlinkSync(prevAssetAbs); } catch {}
        }
      }

      res.json({
        success: true,
        action,
        templateId,
        templateType,
        churchId,
        backgroundAssetPath: relativePath,
        fileSize: req.file.size || null,
        previewUrl: `/api/certificate-templates/${templateId}/background.pdf`,
      });
    } catch (err) {
      // If anything blew up after a successful disk write, clean up the
      // orphan file so storage doesn't accumulate dead PDFs.
      if (uploadedAbsPath) {
        try { fs.unlinkSync(uploadedAbsPath); } catch {}
      }
      console.error('[certificate-templates] POST /by-type/:templateType/upload error:', err.message);
      res.status(500).json({ success: false, error: 'Failed to save template upload' });
    }
  },
);

module.exports = router;
