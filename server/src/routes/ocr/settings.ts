/**
 * Church-specific OCR Settings Routes
 * GET/PUT OCR settings for a church, with table auto-creation.
 * Extracted from index.ts lines ~1011-1339.
 */
const express = require('express');
const router = express.Router({ mergeParams: true });
import { resolveChurchDb } from './helpers';

// GET /api/church/:churchId/ocr/settings (also served at /ocr root for legacy clients)
router.get(['/', '/settings'], async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    console.log(`[OCR Settings] GET /api/church/${churchId}/ocr/settings`);

    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db } = resolved;

    const defaultSettings: any = {
      engine: 'google-vision',
      language: 'eng',
      defaultLanguage: 'en',
      dpi: 300,
      deskew: true,
      removeNoise: true,
      preprocessImages: true,
      outputFormat: 'json',
      confidenceThreshold: 75
    };

    try {
      const [settingsRows] = await db.query(`
        SELECT
          engine, language, dpi, deskew, remove_noise, preprocess_images, output_format,
          confidence_threshold, default_language, preprocessing_enabled, auto_rotate, noise_reduction,
          settings_json
        FROM ocr_settings
        WHERE church_id = ?
        ORDER BY updated_at DESC
        LIMIT 1
      `, [churchId]);

      if (settingsRows.length > 0) {
        const s = settingsRows[0];
        const loadedSettings: any = {
          engine: s.engine || defaultSettings.engine,
          language: s.language || defaultSettings.language,
          defaultLanguage: s.default_language || 'en',
          dpi: s.dpi || defaultSettings.dpi,
          deskew: s.deskew !== undefined ? Boolean(s.deskew) : (s.auto_rotate !== undefined ? Boolean(s.auto_rotate) : defaultSettings.deskew),
          removeNoise: s.remove_noise !== undefined ? Boolean(s.remove_noise) : (s.noise_reduction !== undefined ? Boolean(s.noise_reduction) : defaultSettings.removeNoise),
          preprocessImages: s.preprocess_images !== undefined ? Boolean(s.preprocess_images) : (s.preprocessing_enabled !== undefined ? Boolean(s.preprocessing_enabled) : defaultSettings.preprocessImages),
          outputFormat: s.output_format || defaultSettings.outputFormat,
          confidenceThreshold: s.confidence_threshold !== null && s.confidence_threshold !== undefined ? Math.round(Number(s.confidence_threshold) * 100) : defaultSettings.confidenceThreshold
        };

        if (s.settings_json) {
          try {
            const jsonSettings = typeof s.settings_json === 'string'
              ? JSON.parse(s.settings_json)
              : s.settings_json;
            if (jsonSettings.documentProcessing) {
              loadedSettings.documentProcessing = jsonSettings.documentProcessing;
            }
            if (jsonSettings.documentDeletion) {
              loadedSettings.documentDeletion = jsonSettings.documentDeletion;
            }
            if (jsonSettings.recordFieldConfig) {
              loadedSettings.recordFieldConfig = jsonSettings.recordFieldConfig;
            }
          } catch (e) {
            console.warn('[OCR Settings] Failed to parse settings_json:', e);
          }
        }

        if (!loadedSettings.documentProcessing) {
          loadedSettings.documentProcessing = {
            spellingCorrection: 'fix',
            extractAllText: 'yes',
            improveFormatting: 'yes',
          };
        }
        if (!loadedSettings.documentDeletion) {
          loadedSettings.documentDeletion = {
            deleteAfter: 7,
            deleteUnit: 'days',
          };
        }

        console.log(`[OCR Settings] Loaded settings for church ${churchId}:`, loadedSettings);
        return res.json(loadedSettings);
      } else {
        console.log(`[OCR Settings] No saved settings found for church ${churchId}, using defaults`);
      }
    } catch (dbError: any) {
      console.warn('OCR settings table may not exist, using defaults:', dbError.message);
    }

    console.log(`[OCR Settings] Returning default settings for church ${churchId}`);
    const defaultResponse = {
      ...defaultSettings,
      documentProcessing: {
        spellingCorrection: 'fix',
        extractAllText: 'yes',
        improveFormatting: 'yes',
      },
      documentDeletion: {
        deleteAfter: 7,
        deleteUnit: 'days',
      },
    };
    res.json(defaultResponse);
  } catch (error: any) {
    console.error('Error fetching church OCR settings:', error);
    res.status(500).json({ error: 'Failed to fetch OCR settings', message: error.message });
  }
});

// PUT /api/church/:churchId/ocr/settings (also served at /ocr root for legacy clients)
router.put(['/', '/settings'], async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const settings = req.body;

    console.log(`[OCR Settings] PUT /api/church/${churchId}/ocr/settings - settings:`, JSON.stringify(settings));

    if (!churchId) {
      return res.status(400).json({ error: 'Invalid church ID' });
    }

    if (settings.documentProcessing || settings.documentDeletion) {
      // Allow partial updates for document processing/deletion
    } else if (!settings.engine || !settings.language) {
      return res.status(400).json({ error: 'Invalid settings', message: 'Engine and language are required' });
    }

    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db } = resolved;

    // Ensure table exists with canonical schema
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS ocr_settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          church_id INT NOT NULL,
          engine VARCHAR(50) DEFAULT 'google-vision',
          language VARCHAR(10) DEFAULT 'eng',
          default_language CHAR(2) DEFAULT 'en',
          dpi INT DEFAULT 300,
          deskew TINYINT(1) DEFAULT 1,
          remove_noise TINYINT(1) DEFAULT 1,
          preprocess_images TINYINT(1) DEFAULT 1,
          output_format VARCHAR(20) DEFAULT 'json',
          confidence_threshold DECIMAL(5,2) DEFAULT 0.75,
          preprocessing_enabled TINYINT(1) DEFAULT 1,
          auto_contrast TINYINT(1) DEFAULT 1,
          auto_rotate TINYINT(1) DEFAULT 1,
          noise_reduction TINYINT(1) DEFAULT 1,
          settings_json JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_church_settings (church_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } catch (createError) {
      try {
        await db.query(`
          CREATE TABLE IF NOT EXISTS ocr_settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            church_id INT NOT NULL,
            engine VARCHAR(50) DEFAULT 'google-vision',
            language VARCHAR(10) DEFAULT 'eng',
            dpi INT DEFAULT 300,
            deskew TINYINT(1) DEFAULT 1,
            remove_noise TINYINT(1) DEFAULT 1,
            preprocess_images TINYINT(1) DEFAULT 1,
            output_format VARCHAR(20) DEFAULT 'json',
            confidence_threshold DECIMAL(5,2) DEFAULT 0.75,
            default_language CHAR(2) DEFAULT 'en',
            preprocessing_enabled TINYINT(1) DEFAULT 1,
            auto_contrast TINYINT(1) DEFAULT 1,
            auto_rotate TINYINT(1) DEFAULT 1,
            noise_reduction TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_church_settings (church_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      } catch (e) {}
    }

    // Normalize confidenceThreshold: API sends percent (0-100), DB stores fraction (0-1)
    const confidenceThresholdFraction = settings.confidenceThreshold !== null && settings.confidenceThreshold !== undefined
      ? Number(settings.confidenceThreshold) / 100
      : 0.75;

    const languageToDefaultLanguage = (lang: string): string => {
      const mapping: Record<string, string> = {
        'eng': 'en', 'ell': 'el', 'grc': 'gr', 'rus': 'ru',
        'ron': 'ro', 'srp': 'sr', 'bul': 'bg', 'ukr': 'uk'
      };
      return mapping[lang] || lang.substring(0, 2) || 'en';
    };

    const defaultLanguage = settings.defaultLanguage
      ? languageToDefaultLanguage(settings.defaultLanguage)
      : (settings.language ? languageToDefaultLanguage(settings.language) : 'en');

    const languageValue = settings.language !== undefined ? settings.language : null;

    await db.query(`
      INSERT INTO ocr_settings (
        church_id, engine, language, dpi, deskew, remove_noise,
        preprocess_images, output_format, confidence_threshold,
        default_language, preprocessing_enabled, auto_contrast, auto_rotate, noise_reduction,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        engine = COALESCE(VALUES(engine), engine),
        language = COALESCE(IFNULL(VALUES(language), language), language),
        dpi = COALESCE(VALUES(dpi), dpi),
        deskew = COALESCE(VALUES(deskew), deskew),
        remove_noise = COALESCE(VALUES(remove_noise), remove_noise),
        preprocess_images = COALESCE(VALUES(preprocess_images), preprocess_images),
        output_format = COALESCE(VALUES(output_format), output_format),
        confidence_threshold = COALESCE(VALUES(confidence_threshold), confidence_threshold),
        default_language = COALESCE(VALUES(default_language), default_language),
        preprocessing_enabled = COALESCE(VALUES(preprocess_images), preprocessing_enabled),
        auto_rotate = COALESCE(VALUES(deskew), auto_rotate),
        noise_reduction = COALESCE(VALUES(remove_noise), noise_reduction),
        updated_at = NOW()
    `, [
      churchId,
      settings.engine || 'google-vision',
      languageValue || 'eng',
      settings.dpi || 300,
      settings.deskew !== undefined ? (settings.deskew ? 1 : 0) : 1,
      settings.removeNoise !== undefined ? (settings.removeNoise ? 1 : 0) : 1,
      settings.preprocessImages !== undefined ? (settings.preprocessImages ? 1 : 0) : 1,
      settings.outputFormat || 'json',
      confidenceThresholdFraction,
      defaultLanguage,
      settings.preprocessImages !== undefined ? (settings.preprocessImages ? 1 : 0) : 1,
      1,
      settings.deskew !== undefined ? (settings.deskew ? 1 : 0) : 1,
      settings.removeNoise !== undefined ? (settings.removeNoise ? 1 : 0) : 1
    ]);

    // Verify the settings were saved
    const [verifyRows] = await db.query(`
      SELECT engine, language, dpi, deskew, remove_noise, preprocess_images, output_format, confidence_threshold
      FROM ocr_settings
      WHERE church_id = ?
    `, [churchId]);

    if (verifyRows.length > 0) {
      console.log(`✅ Saved OCR settings for church ${churchId}:`, verifyRows[0]);
    } else {
      console.error(`❌ Failed to verify saved settings for church ${churchId}`);
    }

    // Store document processing and deletion settings in JSON column
    if (settings.documentProcessing || settings.documentDeletion || settings.recordFieldConfig) {
      try {
        let existingJson: any = {};
        try {
          const [rows] = await db.query(
            `SELECT settings_json FROM ocr_settings WHERE church_id = ? LIMIT 1`,
            [churchId],
          );
          if (rows?.[0]?.settings_json) {
            existingJson = typeof rows[0].settings_json === 'string'
              ? JSON.parse(rows[0].settings_json)
              : rows[0].settings_json;
          }
        } catch { /* ignore */ }

        const settingsJson = JSON.stringify({
          documentProcessing: settings.documentProcessing ?? existingJson.documentProcessing,
          documentDeletion: settings.documentDeletion ?? existingJson.documentDeletion,
          recordFieldConfig: settings.recordFieldConfig ?? existingJson.recordFieldConfig,
        });

        try {
          await db.query(`
            UPDATE ocr_settings
            SET settings_json = ?
            WHERE church_id = ?
          `, [settingsJson, churchId]);
        } catch (jsonError: any) {
          if (jsonError.code === 'ER_BAD_FIELD_ERROR') {
            await db.query(`ALTER TABLE ocr_settings ADD COLUMN settings_json JSON NULL`);
            await db.query(`
              UPDATE ocr_settings
              SET settings_json = ?
              WHERE church_id = ?
            `, [settingsJson, churchId]);
          } else {
            throw jsonError;
          }
        }
      } catch (jsonError) {
        console.warn('[OCR Settings] Failed to save document processing/deletion settings:', jsonError);
      }
    }

    res.json({ success: true, message: 'OCR settings saved successfully', settings: settings });
  } catch (error: any) {
    console.error('Error saving church OCR settings:', error);
    res.status(500).json({ error: 'Failed to save OCR settings', message: error.message });
  }
});

const RECORD_TYPES = ['baptism', 'marriage', 'funeral'];

const DEFAULT_RECORD_FIELD_CONFIG: Record<string, Array<{
  key: string;
  label: string;
  headerLabel: string;
  required: boolean;
  visible: boolean;
  sortOrder: number;
  type: string;
}>> = {
  baptism: [
    { key: 'record_number', label: 'Record #', headerLabel: 'NUMBER', required: false, visible: true, sortOrder: 0, type: 'text' },
    { key: 'date_of_birth', label: 'Date of Birth', headerLabel: 'BIRTH', required: false, visible: true, sortOrder: 1, type: 'date' },
    { key: 'date_of_baptism', label: 'Date of Baptism', headerLabel: 'BAPTISM', required: true, visible: true, sortOrder: 2, type: 'date' },
    { key: 'child_name', label: 'Name of Child', headerLabel: 'NAME OF CHILD', required: true, visible: true, sortOrder: 3, type: 'text' },
    { key: 'place_of_birth', label: 'City of Birth', headerLabel: 'CITY OF BIRTH', required: false, visible: true, sortOrder: 4, type: 'text' },
    { key: 'father_name', label: "Father's Full Name", headerLabel: "FATHER'S FULL NAME", required: false, visible: true, sortOrder: 5, type: 'text' },
    { key: 'mother_name', label: "Mother's Maiden Name", headerLabel: "MOTHER'S MAIDEN NAME", required: false, visible: true, sortOrder: 6, type: 'text' },
    { key: 'godparents', label: 'Sponsors', headerLabel: 'FULL NAMES OF SPONSORS', required: false, visible: true, sortOrder: 7, type: 'text' },
    { key: 'performed_by', label: "Priest's Name", headerLabel: "PRIEST'S NAME", required: false, visible: true, sortOrder: 8, type: 'text' },
    { key: 'address', label: 'Address', headerLabel: 'ADDRESS', required: false, visible: false, sortOrder: 9, type: 'text' },
    { key: 'church', label: 'Church', headerLabel: 'CHURCH', required: false, visible: false, sortOrder: 10, type: 'text' },
    { key: 'notes', label: 'Notes', headerLabel: 'NOTES', required: false, visible: true, sortOrder: 11, type: 'textarea' },
  ],
  marriage: [
    { key: 'record_number', label: 'Record #', headerLabel: 'NUMBER', required: false, visible: true, sortOrder: 0, type: 'text' },
    { key: 'groom_name', label: 'Groom Name', headerLabel: 'GROOM', required: true, visible: true, sortOrder: 1, type: 'text' },
    { key: 'groom_parents', label: "Groom's Parents First Names", headerLabel: "GROOM'S PARENTS", required: false, visible: true, sortOrder: 2, type: 'text' },
    { key: 'bride_name', label: 'Bride Name', headerLabel: 'BRIDE', required: true, visible: true, sortOrder: 3, type: 'text' },
    { key: 'bride_parents', label: "Bride's Parents First Names", headerLabel: "BRIDE'S PARENTS", required: false, visible: true, sortOrder: 4, type: 'text' },
    { key: 'date_of_marriage', label: 'Date of Marriage', headerLabel: 'DATE OF MARRIAGE', required: true, visible: true, sortOrder: 5, type: 'date' },
    { key: 'marriage_license', label: 'Marriage License #', headerLabel: 'MARRIAGE LICENSE', required: false, visible: true, sortOrder: 6, type: 'text' },
    { key: 'witnesses', label: 'Witnesses', headerLabel: 'WITNESSES', required: false, visible: true, sortOrder: 7, type: 'text' },
    { key: 'best_man', label: 'Best Man', headerLabel: 'BEST MAN', required: false, visible: false, sortOrder: 8, type: 'text' },
    { key: 'maid_of_honor', label: 'Maid of Honor', headerLabel: 'MAID OF HONOR', required: false, visible: false, sortOrder: 9, type: 'text' },
    { key: 'officiant', label: 'Officiant', headerLabel: "PRIEST'S NAME", required: false, visible: true, sortOrder: 10, type: 'text' },
    { key: 'place_of_marriage', label: 'Place of Marriage', headerLabel: 'PLACE OF MARRIAGE', required: false, visible: false, sortOrder: 11, type: 'text' },
    { key: 'church', label: 'Church', headerLabel: 'CHURCH', required: false, visible: false, sortOrder: 12, type: 'text' },
    { key: 'notes', label: 'Notes', headerLabel: 'NOTES', required: false, visible: true, sortOrder: 13, type: 'textarea' },
  ],
  funeral: [
    { key: 'record_number', label: 'Record #', headerLabel: 'NUMBER', required: false, visible: true, sortOrder: 0, type: 'text' },
    { key: 'deceased_name', label: 'Name of Deceased', headerLabel: 'NAME OF DECEASED', required: true, visible: true, sortOrder: 1, type: 'text' },
    { key: 'date_of_death', label: 'Date of Death', headerLabel: 'DATE OF DEATH', required: false, visible: true, sortOrder: 2, type: 'date' },
    { key: 'date_of_funeral', label: 'Date of Funeral', headerLabel: 'DATE OF FUNERAL', required: false, visible: true, sortOrder: 3, type: 'date' },
    { key: 'date_of_burial', label: 'Date of Burial', headerLabel: 'DATE OF BURIAL', required: false, visible: true, sortOrder: 4, type: 'date' },
    { key: 'place_of_burial', label: 'Place of Burial', headerLabel: 'PLACE OF BURIAL', required: false, visible: true, sortOrder: 5, type: 'text' },
    { key: 'age_at_death', label: 'Age at Death', headerLabel: 'AGE', required: false, visible: true, sortOrder: 6, type: 'text' },
    { key: 'cause_of_death', label: 'Cause of Death', headerLabel: 'CAUSE OF DEATH', required: false, visible: false, sortOrder: 7, type: 'text' },
    { key: 'officiant', label: 'Officiant', headerLabel: "PRIEST'S NAME", required: false, visible: true, sortOrder: 8, type: 'text' },
    { key: 'church', label: 'Church', headerLabel: 'CHURCH', required: false, visible: false, sortOrder: 9, type: 'text' },
    { key: 'notes', label: 'Notes', headerLabel: 'NOTES', required: false, visible: true, sortOrder: 10, type: 'textarea' },
  ],
};

function mergeRecordFieldConfig(saved: any): Record<string, any[]> {
  const out: Record<string, any[]> = {};
  for (const rt of RECORD_TYPES) {
    const defaults = DEFAULT_RECORD_FIELD_CONFIG[rt] || [];
    const savedRows = Array.isArray(saved?.[rt]) ? saved[rt] : [];
    const savedByKey = new Map(savedRows.map((r: any) => [r.key, r]));
    const merged = defaults.map((def) => {
      const ovr = savedByKey.get(def.key) || {};
      return {
        ...def,
        label: ovr.label ?? def.label,
        headerLabel: ovr.headerLabel ?? def.headerLabel,
        required: ovr.required ?? def.required,
        visible: ovr.visible ?? def.visible,
        sortOrder: ovr.sortOrder ?? def.sortOrder,
      };
    });
    merged.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    out[rt] = merged;
  }
  return out;
}

async function loadSettingsJson(db: any, churchId: number): Promise<any> {
  try {
    const [rows] = await db.query(
      `SELECT settings_json FROM ocr_settings WHERE church_id = ? LIMIT 1`,
      [churchId],
    );
    if (!rows?.[0]?.settings_json) return {};
    return typeof rows[0].settings_json === 'string'
      ? JSON.parse(rows[0].settings_json)
      : rows[0].settings_json;
  } catch {
    return {};
  }
}

async function saveSettingsJson(db: any, churchId: number, patch: any): Promise<void> {
  const existing = await loadSettingsJson(db, churchId);
  const next = { ...existing, ...patch };
  const settingsJson = JSON.stringify(next);
  try {
    await db.query(
      `UPDATE ocr_settings SET settings_json = ?, updated_at = NOW() WHERE church_id = ?`,
      [settingsJson, churchId],
    );
  } catch (jsonError: any) {
    if (jsonError.code === 'ER_BAD_FIELD_ERROR') {
      await db.query(`ALTER TABLE ocr_settings ADD COLUMN settings_json JSON NULL`);
      await db.query(
        `UPDATE ocr_settings SET settings_json = ?, updated_at = NOW() WHERE church_id = ?`,
        [settingsJson, churchId],
      );
    } else {
      throw jsonError;
    }
  }
}

// GET /api/church/:churchId/ocr/record-fields
router.get('/record-fields', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId, 10);
    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db } = resolved;
    const json = await loadSettingsJson(db, churchId);
    const fields = mergeRecordFieldConfig(json.recordFieldConfig);
    res.json({ fields, defaults: DEFAULT_RECORD_FIELD_CONFIG });
  } catch (error: any) {
    console.error('[OCR Record Fields] GET failed:', error);
    res.status(500).json({ error: 'Failed to load record field configuration', message: error.message });
  }
});

// PUT /api/church/:churchId/ocr/record-fields
router.put('/record-fields', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId, 10);
    const { recordFieldConfig } = req.body || {};
    if (!recordFieldConfig || typeof recordFieldConfig !== 'object') {
      return res.status(400).json({ error: 'recordFieldConfig object is required' });
    }

    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db } = resolved;

    // Ensure base ocr_settings row exists
    await db.query(`
      INSERT INTO ocr_settings (church_id, updated_at)
      VALUES (?, NOW())
      ON DUPLICATE KEY UPDATE updated_at = NOW()
    `, [churchId]);

    const sanitized: Record<string, any[]> = {};
    for (const rt of RECORD_TYPES) {
      const rows = Array.isArray(recordFieldConfig[rt]) ? recordFieldConfig[rt] : [];
      const defaults = DEFAULT_RECORD_FIELD_CONFIG[rt] || [];
      const defaultKeys = new Set(defaults.map((d) => d.key));
      sanitized[rt] = rows
        .filter((r: any) => r?.key && defaultKeys.has(r.key))
        .map((r: any, idx: number) => ({
          key: r.key,
          label: String(r.label || '').slice(0, 120) || undefined,
          headerLabel: String(r.headerLabel || '').slice(0, 160) || undefined,
          required: !!r.required,
          visible: r.visible !== false,
          sortOrder: typeof r.sortOrder === 'number' ? r.sortOrder : idx,
        }));
    }

    await saveSettingsJson(db, churchId, { recordFieldConfig: sanitized });
    const fields = mergeRecordFieldConfig(sanitized);
    res.json({ success: true, fields });
  } catch (error: any) {
    console.error('[OCR Record Fields] PUT failed:', error);
    res.status(500).json({ error: 'Failed to save record field configuration', message: error.message });
  }
});

// POST /api/church/:churchId/ocr/templates
router.post('/templates', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const { name, recordType, columnBands, headerYThreshold, learnedParams } = req.body;

    if (!name || !recordType || !columnBands) {
      return res.status(400).json({ error: 'Missing required fields: name, recordType, columnBands' });
    }

    const { getAppPool } = require('../../config/db');
    const appPool = getAppPool();

    // Ensure the column_bands is saved as a JSON array or object
    const columnBandsStr = typeof columnBands === 'string' ? columnBands : JSON.stringify(columnBands);
    const learnedParamsStr = learnedParams ? (typeof learnedParams === 'string' ? learnedParams : JSON.stringify(learnedParams)) : null;

    const [insertResult] = await appPool.query(
      `INSERT INTO ocr_extractors (name, record_type, church_id, column_bands, header_y_threshold, learned_params, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
      [
        name,
        recordType,
        churchId,
        columnBandsStr,
        headerYThreshold || 0.15,
        learnedParamsStr
      ]
    );

    const templateId = (insertResult as any).insertId;
    console.log(`[OCR Settings] Saved template #${templateId} for church ${churchId}`);
    res.json({ success: true, templateId });
  } catch (error: any) {
    console.error('[OCR Settings] Error saving template:', error);
    res.status(500).json({ error: 'Failed to save template', message: error.message });
  }
});

module.exports = router;
