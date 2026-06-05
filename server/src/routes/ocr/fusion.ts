/**
 * OCR Fusion Workflow Routes
 * Handles fusion drafts lifecycle: create, read, autosave, extract, review.
 * Mounted at /api/church/:churchId/ocr
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router({ mergeParams: true });
import { resolveChurchDb, promisePool, mapFieldsToDbColumns, buildInsertQuery } from './helpers';

const CREATE_FUSED_DRAFTS_TABLE = `
  CREATE TABLE IF NOT EXISTS ocr_fused_drafts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ocr_job_id BIGINT NOT NULL,
    entry_index INT DEFAULT 0,
    record_type ENUM('baptism','marriage','funeral') DEFAULT 'baptism',
    record_number VARCHAR(16) NULL,
    payload_json LONGTEXT,
    bbox_json LONGTEXT NULL,
    status ENUM('draft','committed') DEFAULT 'draft',
    workflow_status VARCHAR(32) DEFAULT 'draft',
    church_id INT NULL,
    committed_record_id BIGINT NULL,
    created_by VARCHAR(255) DEFAULT 'system',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_job_entry (ocr_job_id, entry_index),
    INDEX idx_status (status)
  )
`;

// ---------------------------------------------------------------------------
// 1. POST /test/create-test-job — Create test OCR job and fusion drafts
// ---------------------------------------------------------------------------
router.post('/test/create-test-job', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    console.log(`[OCR Fusion] POST /test/create-test-job for church ${churchId}`);

    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db, dbName } = resolved;

    // Create a test job in ocr_jobs
    const [jobResult]: any = await db.query(
      `INSERT INTO ocr_jobs (church_id, workflow_status, status, file_name, created_by)
       VALUES (?, 'processing', 'processing', 'test-fusion-job.png', 'system')`,
      [churchId]
    );
    const jobId = jobResult.insertId;

    // Ensure ocr_fused_drafts table exists
    await db.query(CREATE_FUSED_DRAFTS_TABLE);

    // Insert 2 test draft records
    const testDrafts = [
      {
        entry_index: 0,
        record_number: 'TEST-001',
        payload: {
          firstName: 'John',
          lastName: 'Doe',
          dateOfBaptism: '2024-01-15',
          priestName: 'Fr. Michael',
          godparentName: 'Jane Smith'
        }
      },
      {
        entry_index: 1,
        record_number: 'TEST-002',
        payload: {
          firstName: 'Maria',
          lastName: 'Ivanova',
          dateOfBaptism: '2024-02-20',
          priestName: 'Fr. Alexei',
          godparentName: 'Peter Johnson'
        }
      }
    ];

    const insertedDrafts: any[] = [];
    for (const draft of testDrafts) {
      const [result]: any = await db.query(
        `INSERT INTO ocr_fused_drafts
           (ocr_job_id, entry_index, record_type, record_number, payload_json,
            workflow_status, church_id, created_by)
         VALUES (?, ?, 'baptism', ?, ?, 'draft', ?, 'system')`,
        [jobId, draft.entry_index, draft.record_number, JSON.stringify(draft.payload), churchId]
      );
      insertedDrafts.push({
        id: result.insertId,
        ocr_job_id: jobId,
        entry_index: draft.entry_index,
        record_type: 'baptism',
        record_number: draft.record_number,
        payload: draft.payload
      });
    }

    return res.json({
      success: true,
      message: `Created test job ${jobId} with ${insertedDrafts.length} fusion drafts`,
      job: { id: jobId, church_id: churchId, workflow_status: 'processing' },
      drafts: insertedDrafts
    });
  } catch (err: any) {
    console.error('[OCR Fusion] Error creating test job:', err);
    return res.status(500).json({ error: 'Failed to create test job', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// 2. GET /jobs/:jobId/fusion/drafts — Get fusion drafts for a job
// ---------------------------------------------------------------------------
router.get('/jobs/:jobId/fusion/drafts', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    console.log(`[OCR Fusion] GET drafts for job ${jobId}, church ${churchId}`);

    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db } = resolved;

    let query = 'SELECT * FROM ocr_fused_drafts WHERE ocr_job_id = ? AND church_id = ?';
    const params: any[] = [jobId, churchId];

    // Optional filters
    if (req.query.status) {
      query += ' AND workflow_status = ?';
      params.push(req.query.status);
    }
    if (req.query.record_type) {
      query += ' AND record_type = ?';
      params.push(req.query.record_type);
    }

    query += ' ORDER BY entry_index ASC';

    const [rows]: any = await db.query(query, params);

    // Normalize drafts: parse JSON fields and map status
    const drafts = rows.map((row: any) => {
      let payload = null;
      let bbox = null;
      try { payload = row.payload_json ? JSON.parse(row.payload_json) : null; } catch (_) { payload = null; }
      try { bbox = row.bbox_json ? JSON.parse(row.bbox_json) : null; } catch (_) { bbox = null; }

      return {
        id: row.id,
        ocr_job_id: row.ocr_job_id,
        entry_index: row.entry_index,
        record_type: row.record_type,
        record_number: row.record_number,
        payload,
        bbox,
        status: row.workflow_status || row.status,
        committed_record_id: row.committed_record_id,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });

    // Build convenience structures
    const entryAreas: any[] = [];
    const entries: any[] = [];
    const fields: Record<string, any> = {};
    const selections: Record<string, any> = {};

    for (const draft of drafts) {
      entries.push({
        entryIndex: draft.entry_index,
        recordType: draft.record_type,
        recordNumber: draft.record_number,
        status: draft.status
      });

      if (draft.bbox && draft.bbox.entryBbox) {
        entryAreas.push({
          entryId: `entry-${draft.entry_index}`,
          bbox: draft.bbox.entryBbox
        });
      }

      if (draft.payload) {
        fields[`entry-${draft.entry_index}`] = draft.payload;
      }

      if (draft.bbox && draft.bbox.selections) {
        selections[`entry-${draft.entry_index}`] = draft.bbox.selections;
      }
    }

    return res.json({ drafts, entryAreas, entries, fields, selections });
  } catch (err: any) {
    console.error('[OCR Fusion] Error fetching drafts:', err);
    return res.status(500).json({ error: 'Failed to fetch drafts', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// 3. PUT /jobs/:jobId/fusion/drafts/:entryIndex — Autosave a draft
// ---------------------------------------------------------------------------
router.put('/jobs/:jobId/fusion/drafts/:entryIndex', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const entryIndex = parseInt(req.params.entryIndex);
    console.log(`[OCR Fusion] PUT autosave draft job=${jobId} entry=${entryIndex} church=${churchId}`);

    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db } = resolved;

    const { record_type, record_number, payload_json, bbox_json, workflow_status } = req.body;
    const payloadStr = typeof payload_json === 'string' ? payload_json : JSON.stringify(payload_json || null);
    const bboxStr = typeof bbox_json === 'string' ? bbox_json : JSON.stringify(bbox_json || null);
    const userEmail = req.session?.user?.email || req.user?.email || 'system';

    // Ensure table exists
    await db.query(CREATE_FUSED_DRAFTS_TABLE);

    // ── Fetch BEFORE values for correction logging ──
    let beforePayload: Record<string, any> | null = null;
    try {
      const [existing]: any = await db.query(
        'SELECT payload_json FROM ocr_fused_drafts WHERE ocr_job_id = ? AND entry_index = ?',
        [jobId, entryIndex],
      );
      if (existing.length > 0 && existing[0].payload_json) {
        beforePayload = typeof existing[0].payload_json === 'string'
          ? JSON.parse(existing[0].payload_json)
          : existing[0].payload_json;
      }
    } catch (_) { /* first save — no prior draft */ }

    // Upsert on (ocr_job_id, entry_index)
    await db.query(
      `INSERT INTO ocr_fused_drafts
         (ocr_job_id, entry_index, record_type, record_number, payload_json, bbox_json, church_id, workflow_status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         record_type = VALUES(record_type),
         record_number = VALUES(record_number),
         payload_json = VALUES(payload_json),
         bbox_json = VALUES(bbox_json),
         workflow_status = COALESCE(VALUES(workflow_status), workflow_status),
         updated_at = CURRENT_TIMESTAMP`,
      [jobId, entryIndex, record_type || 'baptism', record_number || null, payloadStr, bboxStr, churchId, workflow_status || 'draft', userEmail]
    );

    // ── Non-blocking: log field corrections ──
    try {
      const afterPayload: Record<string, any> = typeof payload_json === 'string'
        ? JSON.parse(payload_json)
        : (payload_json || {});

      if (beforePayload) {
        const { buildCorrectionEvent, appendCorrection, correctionsLogPath } = require('../../ocr/preprocessing/correctionLog');

        // Lazy-load provenance/scoring artifacts for this job
        let scoringV2: any = null;
        let provenance: any = null;
        let pageId: number | null = null;
        let templateId: string | null = null;
        try {
          const jobDir = path.join(__dirname, '../../../storage/feeder', `job_${jobId}`);
          const page0Dir = path.join(jobDir, 'page_0');
          const scoringPath = path.join(page0Dir, 'scoring_v2.json');
          const provPath = path.join(page0Dir, 'record_candidates_provenance.json');
          const metricsPath = path.join(page0Dir, 'metrics.json');

          if (fs.existsSync(scoringPath)) scoringV2 = JSON.parse(fs.readFileSync(scoringPath, 'utf8'));
          if (fs.existsSync(provPath)) provenance = JSON.parse(fs.readFileSync(provPath, 'utf8'));
          if (fs.existsSync(metricsPath)) {
            const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
            templateId = metrics.template_id || null;
          }

          // Get page_id from DB (non-blocking best-effort)
          const [pageRows]: any = await db.query(
            'SELECT id FROM ocr_feeder_pages WHERE job_id = ? ORDER BY page_index ASC LIMIT 1',
            [jobId],
          );
          if (pageRows.length > 0) pageId = pageRows[0].id;
        } catch (_) { /* provenance not available — log without it */ }

        const logPath = correctionsLogPath(jobId);
        const allFields = new Set([...Object.keys(beforePayload), ...Object.keys(afterPayload)]);
        let logged = 0;

        for (const fieldName of allFields) {
          const bv = beforePayload[fieldName] ?? null;
          const av = afterPayload[fieldName] ?? null;
          const before = bv === null || bv === undefined ? '' : String(bv);
          const after = av === null || av === undefined ? '' : String(av);

          if (before === after) continue; // No change

          // Find provenance for this field+candidate
          let scoringField: any = null;
          let provField: any = null;
          if (scoringV2?.rows) {
            const row = scoringV2.rows.find((r: any) => r.candidate_index === entryIndex);
            if (row?.fields) {
              scoringField = row.fields.find((f: any) => f.field_name === fieldName) || null;
            }
          }
          if (provenance?.fields) {
            const pf = provenance.fields.find(
              (f: any) => f.candidate_index === entryIndex && f.field_name === fieldName,
            );
            if (pf) provField = pf.provenance || null;
          }

          const event = buildCorrectionEvent({
            jobId,
            pageId,
            candidateIndex: entryIndex,
            rowIndex: entryIndex,
            recordType: record_type || 'baptism',
            templateId,
            userId: userEmail,
            fieldName,
            beforeValue: before,
            afterValue: after,
            editSource: 'autosave' as const,
            scoringField,
            provenanceField: provField,
          });

          if (appendCorrection(logPath, event)) logged++;
        }

        if (logged > 0) {
          console.log(`[OCR Correction] Logged ${logged} field correction(s) for job=${jobId} entry=${entryIndex}`);
        }
      }
    } catch (corrErr: any) {
      // Non-blocking: never fail the autosave due to correction logging
      console.error('[OCR Correction] Error logging corrections:', corrErr.message);
    }

    // Fetch the saved row
    const [saved]: any = await db.query(
      'SELECT * FROM ocr_fused_drafts WHERE ocr_job_id = ? AND entry_index = ?',
      [jobId, entryIndex]
    );

    if (!saved.length) {
      return res.status(500).json({ error: 'Failed to retrieve saved draft' });
    }

    const row = saved[0];
    let parsedPayload = null;
    let parsedBbox = null;
    try { parsedPayload = row.payload_json ? JSON.parse(row.payload_json) : null; } catch (_) { parsedPayload = null; }
    try { parsedBbox = row.bbox_json ? JSON.parse(row.bbox_json) : null; } catch (_) { parsedBbox = null; }

    const draft = {
      id: row.id,
      ocr_job_id: row.ocr_job_id,
      entry_index: row.entry_index,
      record_type: row.record_type,
      record_number: row.record_number,
      payload: parsedPayload,
      bbox: parsedBbox,
      status: row.workflow_status || row.status,
      committed_record_id: row.committed_record_id,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at
    };

    return res.json({
      success: true,
      draft,
      last_saved_at: row.updated_at
    });
  } catch (err: any) {
    console.error('[OCR Fusion] Error autosaving draft:', err);
    return res.status(500).json({ error: 'Failed to autosave draft', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// 4. POST /jobs/:jobId/fusion/extract-layout — Extract fields via layout extractor
// ---------------------------------------------------------------------------
router.post('/jobs/:jobId/fusion/extract-layout', async (req: any, res: any) => {
  try {
    const jobId = parseInt(req.params.jobId);
    console.log(`[OCR Fusion] POST extract-layout for job ${jobId}`);

    const {
      visionResponse,
      imageWidth,
      imageHeight,
      recordType,
      confidenceThreshold,
      entryAreas,
      debug
    } = req.body;

    if (!visionResponse || !imageWidth || !imageHeight) {
      return res.status(400).json({
        error: 'Missing required fields: visionResponse, imageWidth, imageHeight'
      });
    }

    const { extractLayoutFields } = require('../../ocr/layoutExtractor');

    const result = extractLayoutFields(visionResponse, {
      imageWidth,
      imageHeight,
      recordType: recordType || 'baptism',
      confidenceThreshold: confidenceThreshold || 0.6,
      entryAreas: entryAreas || [],
      debug: debug || false
    });

    return res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[OCR Fusion] Error extracting layout fields:', err);
    return res.status(500).json({ error: 'Failed to extract layout fields', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// 5. PATCH /jobs/:jobId/fusion/drafts/:draftId/entry-bbox — Update entry bbox
// ---------------------------------------------------------------------------
router.patch('/jobs/:jobId/fusion/drafts/:draftId/entry-bbox', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const draftId = parseInt(req.params.draftId);
    console.log(`[OCR Fusion] PATCH entry-bbox for draft ${draftId}, church ${churchId}`);

    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db } = resolved;

    const { entryBbox, entryAreas } = req.body;

    // Validate entryBbox if provided
    if (entryBbox) {
      if (
        typeof entryBbox !== 'object' ||
        typeof entryBbox.x !== 'number' ||
        typeof entryBbox.y !== 'number' ||
        typeof entryBbox.w !== 'number' ||
        typeof entryBbox.h !== 'number'
      ) {
        return res.status(400).json({
          error: 'Invalid entryBbox: must be an object with numeric x, y, w, h'
        });
      }
    }

    // Validate entryAreas if provided
    if (entryAreas) {
      if (!Array.isArray(entryAreas)) {
        return res.status(400).json({ error: 'Invalid entryAreas: must be an array' });
      }
      for (const area of entryAreas) {
        if (!area.entryId || !area.bbox) {
          return res.status(400).json({
            error: 'Invalid entryAreas: each item must have entryId and bbox'
          });
        }
      }
    }

    if (!entryBbox && !entryAreas) {
      return res.status(400).json({ error: 'Must provide entryBbox or entryAreas' });
    }

    // Read existing bbox_json
    const [rows]: any = await db.query(
      'SELECT * FROM ocr_fused_drafts WHERE id = ?',
      [draftId]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    const row = rows[0];
    let existingBbox: any = {};
    try { existingBbox = row.bbox_json ? JSON.parse(row.bbox_json) : {}; } catch (_) { existingBbox = {}; }

    // Merge updates
    if (entryBbox) {
      existingBbox.entryBbox = entryBbox;
    }

    if (entryAreas) {
      existingBbox.entryAreas = entryAreas;
    }

    // Ensure selections object exists
    if (!existingBbox.selections) {
      existingBbox.selections = {};
    }

    const updatedBboxStr = JSON.stringify(existingBbox);

    await db.query(
      'UPDATE ocr_fused_drafts SET bbox_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [updatedBboxStr, draftId]
    );

    // Return updated draft
    let parsedPayload = null;
    try { parsedPayload = row.payload_json ? JSON.parse(row.payload_json) : null; } catch (_) { parsedPayload = null; }

    const draft = {
      id: row.id,
      ocr_job_id: row.ocr_job_id,
      entry_index: row.entry_index,
      record_type: row.record_type,
      record_number: row.record_number,
      payload: parsedPayload,
      bbox: existingBbox,
      status: row.workflow_status || row.status,
      committed_record_id: row.committed_record_id,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: new Date()
    };

    return res.json({ success: true, draft });
  } catch (err: any) {
    console.error('[OCR Fusion] Error updating entry bbox:', err);
    return res.status(500).json({ error: 'Failed to update entry bbox', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// 6. POST /jobs/:jobId/fusion/ready-for-review — Mark drafts ready for review
// ---------------------------------------------------------------------------
router.post('/jobs/:jobId/fusion/ready-for-review', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    console.log(`[OCR Fusion] POST ready-for-review job=${jobId} church=${churchId}`);

    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db } = resolved;

    const { entry_indexes } = req.body;

    let query: string;
    let params: any[];

    if (entry_indexes && Array.isArray(entry_indexes) && entry_indexes.length > 0) {
      // Only update specified entries
      const placeholders = entry_indexes.map(() => '?').join(',');
      query = `UPDATE ocr_fused_drafts
               SET workflow_status = 'in_review', updated_at = CURRENT_TIMESTAMP
               WHERE ocr_job_id = ? AND church_id = ? AND workflow_status = 'draft'
                 AND entry_index IN (${placeholders})`;
      params = [jobId, churchId, ...entry_indexes];
    } else {
      // Update all drafts for this job
      query = `UPDATE ocr_fused_drafts
               SET workflow_status = 'in_review', updated_at = CURRENT_TIMESTAMP
               WHERE ocr_job_id = ? AND church_id = ? AND workflow_status = 'draft'`;
      params = [jobId, churchId];
    }

    const [result]: any = await db.query(query, params);

    return res.json({
      success: true,
      message: `Marked ${result.affectedRows} draft(s) as in_review`
    });
  } catch (err: any) {
    console.error('[OCR Fusion] Error marking ready for review:', err);
    return res.status(500).json({ error: 'Failed to mark drafts for review', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// 7. POST /jobs/:jobId/normalize — Normalize OCR transcription
// ---------------------------------------------------------------------------
router.post('/jobs/:jobId/normalize', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const settings = req.body?.settings || {};

    console.log(`[OCR Normalize] POST normalize — churchId=${churchId} jobId=${jobId}`);

    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db } = resolved;

    // Check if request body has OCR data (preferred - skip DB read)
    let ocrResult = req.body?.ocrResult || req.body?.ocr_result || null;
    let sourceUsed = 'request_body';

    // If no OCR data in body, fetch from DB
    if (!ocrResult) {
      const [rows]: any = await db.query('SELECT result_json, ocr_text, ocr_result FROM ocr_jobs WHERE id = ?', [jobId]);
      if (!rows.length) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const job = rows[0];
      const fs = require('fs');
      const path = require('path');

      try {
        // Source 1: result_json
        if (job.result_json) {
          try {
            ocrResult = typeof job.result_json === 'string' ? JSON.parse(job.result_json) : job.result_json;
            sourceUsed = 'result_json';
          } catch (e: any) {
            console.warn(`[OCR Normalize] Failed to parse result_json:`, e.message);
          }
        }

        // Source 2: ocr_text
        if (!ocrResult && job.ocr_text) {
          sourceUsed = 'ocr_text';
        }

        // Source 3: ocr_result
        if (!ocrResult && job.ocr_result) {
          try {
            if (typeof job.ocr_result === 'string' && job.ocr_result.startsWith('{')) {
              ocrResult = JSON.parse(job.ocr_result);
              sourceUsed = 'ocr_result (parsed JSON)';
            } else {
              sourceUsed = 'ocr_result (text)';
            }
          } catch (e: any) {
            console.warn(`[OCR Normalize] Failed to parse ocr_result:`, e.message);
          }
        }

        // Fallback: file system
        if (!ocrResult) {
          const [jobFile]: any = await db.query('SELECT file_path FROM ocr_jobs WHERE id = ?', [jobId]);
          if (jobFile.length && jobFile[0].file_path) {
            const processedDir = path.dirname(jobFile[0].file_path);
            const filenameWithoutExt = path.parse(path.basename(jobFile[0].file_path)).name;
            const jsonFilePath = path.join(processedDir, `${filenameWithoutExt}_ocr.json`);
            try {
              const jsonContent = fs.readFileSync(jsonFilePath, 'utf8');
              ocrResult = JSON.parse(jsonContent);
              sourceUsed = 'file_system';
            } catch (_e) {
              // File doesn't exist or invalid JSON
            }
          }
        }
      } catch (e: any) {
        console.error('[OCR Normalize] Error reading OCR result:', e);
        return res.status(500).json({ error: 'Failed to read OCR result', message: e.message });
      }
    }

    if (!ocrResult) {
      return res.status(400).json({
        error: 'OCR result not found',
        message: 'No OCR data available. Please ensure the job has been processed.',
        jobId,
        sourceUsed: sourceUsed || 'none'
      });
    }

    console.log(`[OCR Normalize] Loaded OCR data from source: ${sourceUsed} for job ${jobId}`);

    const { extractTokensFromVision } = require('../../ocr/transcription/extractTokensFromVision');
    const { normalizeTranscription } = require('../../ocr/transcription/normalizeTranscription');

    const { tokens, lines } = extractTokensFromVision(ocrResult);

    const normalizationSettings = {
      transcriptionMode: settings.transcriptionMode || 'exact',
      textExtractionScope: settings.textExtractionScope || 'all',
      formattingMode: settings.formattingMode || 'improve-formatting',
      confidenceThreshold: settings.confidenceThreshold ?? 0.35,
    };

    const result = normalizeTranscription({ tokens, lines }, normalizationSettings);

    return res.json({
      transcription: {
        text: result.text,
        paragraphs: result.paragraphs,
        diagnostics: result.diagnostics,
      },
    });
  } catch (err: any) {
    console.error('[OCR Normalize] Error:', err);
    return res.status(500).json({ error: 'Failed to normalize transcription', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// 8. POST /jobs/:jobId/fusion/drafts — Batch save fusion drafts
// ---------------------------------------------------------------------------
router.post('/jobs/:jobId/fusion/drafts', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const { entries } = req.body;
    const userEmail = req.session?.user?.email || req.user?.email || 'system';

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'entries array is required' });
    }

    console.log(`[OCR Fusion] POST batch-save ${entries.length} drafts for job ${jobId} church ${churchId}`);

    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db } = resolved;

    // Ensure table exists
    await db.query(CREATE_FUSED_DRAFTS_TABLE);

    const savedDrafts: any[] = [];
    for (const entry of entries) {
      const [result]: any = await db.query(`
        INSERT INTO ocr_fused_drafts
          (ocr_job_id, entry_index, record_type, record_number, payload_json, bbox_json, workflow_status, church_id, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          record_type = VALUES(record_type),
          record_number = VALUES(record_number),
          payload_json = VALUES(payload_json),
          bbox_json = VALUES(bbox_json),
          workflow_status = VALUES(workflow_status),
          updated_at = CURRENT_TIMESTAMP
      `, [
        jobId,
        entry.entry_index,
        entry.record_type,
        entry.record_number || null,
        JSON.stringify(entry.payload_json || {}),
        entry.bbox_json ? JSON.stringify(entry.bbox_json) : null,
        entry.workflow_status || 'draft',
        churchId,
        userEmail,
      ]);

      savedDrafts.push({
        id: entry.entry_index,
        ocr_job_id: jobId,
        entry_index: entry.entry_index,
        record_type: entry.record_type,
        record_number: entry.record_number,
        payload_json: entry.payload_json,
        bbox_json: entry.bbox_json,
        workflow_status: entry.workflow_status || 'draft',
        updated_at: new Date().toISOString(),
      });
    }

    // Optional: Write to bundle (non-blocking)
    (async () => {
      try {
        let jobBundleModule: any;
        try { jobBundleModule = require('../../utils/jobBundle'); } catch { try { jobBundleModule = require('../../../dist/utils/jobBundle'); } catch { return; } }
        if (jobBundleModule?.upsertDraftEntries) {
          await jobBundleModule.upsertDraftEntries(churchId, String(jobId), entries.map((e: any) => ({
            entry_index: e.entry_index,
            record_type: e.record_type,
            record_number: e.record_number,
            payload_json: e.payload_json || {},
            bbox_json: e.bbox_json,
            workflow_status: e.workflow_status || 'draft',
          })));
        }
      } catch (_e) { /* non-blocking */ }
    })();

    return res.json({ success: true, drafts: savedDrafts });
  } catch (err: any) {
    console.error('[OCR Fusion] Batch save error:', err);
    return res.status(500).json({ error: 'Failed to save drafts', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// 9. POST /jobs/:jobId/fusion/validate — Validate drafts before commit
// ---------------------------------------------------------------------------
router.post('/jobs/:jobId/fusion/validate', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);

    console.log(`[OCR Fusion] POST validate for job ${jobId} church ${churchId}`);

    // Need church name for response
    const [churchRows]: any = await promisePool.query('SELECT database_name, name FROM churches WHERE id = ?', [churchId]);
    if (!churchRows.length) return res.status(404).json({ error: 'Church not found' });

    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db } = resolved;

    const [drafts]: any = await db.query(
      `SELECT * FROM ocr_fused_drafts WHERE ocr_job_id = ? AND workflow_status = 'draft' ORDER BY entry_index`,
      [jobId]
    );

    if (drafts.length === 0) {
      return res.json({ valid: false, error: 'No drafts to validate', drafts: [] });
    }

    const requiredFields: Record<string, string[]> = {
      baptism: ['child_name'],
      marriage: ['groom_name', 'bride_name'],
      funeral: ['deceased_name'],
    };

    const validatedDrafts = drafts.map((draft: any) => {
      const payload = typeof draft.payload_json === 'string'
        ? JSON.parse(draft.payload_json)
        : draft.payload_json;

      const recordType = draft.record_type || 'baptism';
      const required = requiredFields[recordType] || [];
      const missingFields: string[] = [];
      const warnings: string[] = [];

      for (const field of required) {
        if (!payload[field] || payload[field].trim() === '') {
          missingFields.push(field);
        }
      }

      if (draft.bbox_json) {
        const bboxData = typeof draft.bbox_json === 'string'
          ? JSON.parse(draft.bbox_json)
          : draft.bbox_json;

        if (bboxData.fieldBboxes) {
          for (const [fieldName, fieldData] of Object.entries(bboxData.fieldBboxes)) {
            const fd = fieldData as any;
            if (fd.confidence && fd.confidence < 0.6) {
              warnings.push(`Low OCR confidence on ${fieldName}`);
            }
          }
        }
      }

      for (const [fieldName, value] of Object.entries(payload)) {
        if (typeof value === 'string' && value.length > 0 && value.length < 2) {
          warnings.push(`${fieldName} appears incomplete`);
        }
      }

      return {
        id: draft.id,
        entry_index: draft.entry_index,
        record_type: recordType,
        record_number: draft.record_number,
        missing_fields: missingFields,
        warnings,
        payload,
      };
    });

    const allValid = validatedDrafts.every((d: any) => d.missing_fields.length === 0);

    return res.json({
      valid: allValid,
      church_name: churchRows[0].name || `Church ${churchId}`,
      church_id: churchId,
      drafts: validatedDrafts,
      summary: {
        total: validatedDrafts.length,
        valid: validatedDrafts.filter((d: any) => d.missing_fields.length === 0).length,
        invalid: validatedDrafts.filter((d: any) => d.missing_fields.length > 0).length,
        warnings: validatedDrafts.reduce((sum: number, d: any) => sum + d.warnings.length, 0),
      },
    });
  } catch (err: any) {
    console.error('[OCR Fusion] Validate error:', err);
    return res.status(500).json({ error: 'Failed to validate drafts', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// 10. POST /jobs/:jobId/fusion/commit — Direct commit drafts to record tables
// ---------------------------------------------------------------------------
router.post('/jobs/:jobId/fusion/commit', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const { draft_ids } = req.body;
    const userEmail = req.session?.user?.email || req.user?.email || 'system';

    if (!Array.isArray(draft_ids) || draft_ids.length === 0) {
      return res.status(400).json({ error: 'draft_ids array is required' });
    }

    console.log(`[OCR Fusion] POST commit ${draft_ids.length} drafts for job ${jobId} church ${churchId}`);

    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db } = resolved;

    const placeholders = draft_ids.map(() => '?').join(',');
    const [drafts]: any = await db.query(
      `SELECT * FROM ocr_fused_drafts WHERE id IN (${placeholders}) AND workflow_status = 'draft'`,
      draft_ids
    );

    if (drafts.length === 0) {
      return res.status(400).json({ error: 'No valid drafts found to commit' });
    }

    const committed: any[] = [];
    const errors: any[] = [];

    for (const draft of drafts) {
      try {
        const payload = typeof draft.payload_json === 'string'
          ? JSON.parse(draft.payload_json)
          : draft.payload_json;

        let recordId: number | null = null;
        const recordType = draft.record_type;

        const tableMap: Record<string, string> = {
          baptism: 'baptism_records',
          marriage: 'marriage_records',
          funeral: 'funeral_records',
        };
        const table = tableMap[recordType];
        if (!table) {
          errors.push({ draft_id: draft.id, error: `Unsupported record_type: ${recordType}` });
          continue;
        }

        if (recordType === 'baptism' && !payload.child_name) {
          errors.push({ draft_id: draft.id, error: 'child_name is required for baptism records' });
          continue;
        } else if (recordType === 'marriage' && (!payload.groom_name || !payload.bride_name)) {
          errors.push({ draft_id: draft.id, error: 'groom_name and bride_name are required for marriage records' });
          continue;
        } else if (recordType === 'funeral' && !payload.deceased_name) {
          errors.push({ draft_id: draft.id, error: 'deceased_name is required for funeral records' });
          continue;
        }

        const mapped = mapFieldsToDbColumns(recordType, payload);
        const { sql, params } = buildInsertQuery(table, churchId, mapped);
        const [result]: any = await db.query(sql, params);
        recordId = result.insertId;

        if (recordId) {
          await db.query(
            `UPDATE ocr_fused_drafts SET status = 'committed', workflow_status = 'committed', committed_record_id = ?, updated_at = NOW() WHERE id = ?`,
            [recordId, draft.id]
          );
          committed.push({ draft_id: draft.id, record_type: recordType, record_id: recordId });
        }
      } catch (recErr: any) {
        console.error(`[OCR Fusion] commit error for draft ${draft.id}:`, recErr);
        errors.push({ draft_id: draft.id, error: recErr.message });
      }
    }

    return res.json({
      success: errors.length === 0,
      committed,
      errors,
      message: `Committed ${committed.length} records, ${errors.length} errors`,
    });
  } catch (err: any) {
    console.error('[OCR Fusion] Commit error:', err);
    return res.status(500).json({ error: 'Failed to commit drafts', message: err.message });
  }
});

module.exports = router;
