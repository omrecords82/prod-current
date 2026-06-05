/**
 * OCR Review & Commit Routes
 * POST /jobs/:jobId/review/finalize — Finalize drafts (create history snapshot)
 * POST /jobs/:jobId/review/commit   — Commit finalized drafts to record tables
 * GET  /finalize-history             — Get finalization history
 * Mounted at /api/church/:churchId/ocr
 */
const express = require('express');
const router = express.Router({ mergeParams: true });
import { resolveChurchDb, promisePool, mapFieldsToDbColumns, buildInsertQuery } from './helpers';
import { extractAgentFieldsForJob, normalizeBaptismDates } from '../../utils/ocrClassifier';

// ---------------------------------------------------------------------------
// POST /jobs/:jobId/review/finalize
// ---------------------------------------------------------------------------
router.post('/jobs/:jobId/review/finalize', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const { entry_indexes } = req.body || {};
    const userEmail =
      req.session?.user?.email || req.user?.email || 'system';

    console.log(
      `[OCR Review] POST finalize — churchId=${churchId} jobId=${jobId} user=${userEmail}`
    );

    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db } = resolved;

    // Fetch eligible drafts
    let draftSql = `
      SELECT id, entry_index, record_type, record_number, payload_json, workflow_status
      FROM ocr_fused_drafts
      WHERE ocr_job_id = ? AND church_id = ?
        AND workflow_status IN ('draft', 'in_review')
    `;
    const draftParams: any[] = [jobId, churchId];

    if (Array.isArray(entry_indexes) && entry_indexes.length > 0) {
      draftSql += ` AND entry_index IN (${entry_indexes.map(() => '?').join(',')})`;
      draftParams.push(...entry_indexes);
    }

    const [drafts]: any = await db.query(draftSql, draftParams);

    if (!drafts.length) {
      return res
        .status(404)
        .json({ error: 'No eligible drafts found for finalization' });
    }

    // Update workflow_status to 'finalized'
    const draftIds = drafts.map((d: any) => d.id);
    await db.query(
      `UPDATE ocr_fused_drafts SET workflow_status = 'finalized' WHERE id IN (${draftIds.map(() => '?').join(',')})`,
      draftIds
    );

    // Non-blocking: write to jobBundle
    (async () => {
      try {
        let jobBundle: any;
        try {
          jobBundle = require('./utils/jobBundle');
        } catch {
          try {
            jobBundle = require('../dist/utils/jobBundle');
          } catch {
            return;
          }
        }
        if (jobBundle && typeof jobBundle.write === 'function') {
          await jobBundle.write(jobId, { finalized: draftIds });
        }
      } catch (_e) {
        // intentionally swallowed
      }
    })();

    // Non-blocking: create history table + insert records
    (async () => {
      try {
        await db.query(`
          CREATE TABLE IF NOT EXISTS ocr_finalize_history (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            ocr_job_id BIGINT,
            entry_index INT DEFAULT 0,
            record_type ENUM('baptism','marriage','funeral','other'),
            record_number VARCHAR(16),
            payload_json LONGTEXT,
            created_record_id BIGINT NULL,
            finalized_by VARCHAR(255) DEFAULT 'system',
            finalized_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            committed_at DATETIME NULL,
            source_filename VARCHAR(255) NULL,
            INDEX idx_job (ocr_job_id),
            INDEX idx_type (record_type),
            INDEX idx_finalized_at (finalized_at)
          )
        `);

        // Try to get original filename from ocr_jobs
        let sourceFilename: string | null = null;
        try {
          const [jobRows]: any = await db.query(
            'SELECT original_filename FROM ocr_jobs WHERE id = ?',
            [jobId]
          );
          if (jobRows.length) {
            sourceFilename = jobRows[0].original_filename || null;
          }
        } catch (_e) {
          // ocr_jobs may not have original_filename column
        }

        for (const draft of drafts) {
          const payloadJson =
            typeof draft.payload_json === 'string'
              ? draft.payload_json
              : JSON.stringify(draft.payload_json);

          await db.query(
            `INSERT INTO ocr_finalize_history
              (ocr_job_id, entry_index, record_type, record_number, payload_json, finalized_by, source_filename)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              payload_json = VALUES(payload_json),
              finalized_by = VALUES(finalized_by),
              source_filename = VALUES(source_filename)`,
            [
              jobId,
              draft.entry_index ?? 0,
              draft.record_type,
              draft.record_number || null,
              payloadJson,
              userEmail,
              sourceFilename,
            ]
          );
        }
      } catch (histErr) {
        console.error('[OCR Review] History insert error (non-blocking):', histErr);
      }
    })();

    const finalized = drafts.map((d: any) => ({
      entry_index: d.entry_index,
      record_type: d.record_type,
    }));

    return res.json({
      success: true,
      finalized,
      count: finalized.length,
    });
  } catch (err: any) {
    console.error('[OCR Review] finalize error:', err);
    return res.status(500).json({ error: err.message || 'Finalize failed' });
  }
});

// ---------------------------------------------------------------------------
// POST /jobs/:jobId/review/commit
// ---------------------------------------------------------------------------
router.post('/jobs/:jobId/review/commit', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const { entry_indexes } = req.body || {};
    const userEmail =
      req.session?.user?.email || req.user?.email || 'system';

    console.log(
      `[OCR Review] POST commit — churchId=${churchId} jobId=${jobId} user=${userEmail}`
    );

    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db } = resolved;

    // Fetch finalized drafts
    let draftSql = `
      SELECT id, entry_index, record_type, record_number, payload_json
      FROM ocr_fused_drafts
      WHERE ocr_job_id = ? AND church_id = ?
        AND workflow_status = 'finalized'
    `;
    const draftParams: any[] = [jobId, churchId];

    if (Array.isArray(entry_indexes) && entry_indexes.length > 0) {
      draftSql += ` AND entry_index IN (${entry_indexes.map(() => '?').join(',')})`;
      draftParams.push(...entry_indexes);
    }

    const [drafts]: any = await db.query(draftSql, draftParams);

    if (!drafts.length) {
      return res
        .status(404)
        .json({ error: 'No finalized drafts found to commit' });
    }

    const committed: any[] = [];
    const errors: any[] = [];
    const now = new Date();
    const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`;

    for (const draft of drafts) {
      try {
        const payload =
          typeof draft.payload_json === 'string'
            ? JSON.parse(draft.payload_json)
            : draft.payload_json || {};

        const noteSuffix = `Finalized via Review & Finalize on ${dateStr}`;
        const notes = payload.notes
          ? `${payload.notes}\n${noteSuffix}`
          : noteSuffix;

        let insertResult: any;

        switch (draft.record_type) {
          case 'baptism':
            [insertResult] = await db.query(
              `INSERT INTO baptism_records
                (church_id, child_name, date_of_birth, place_of_birth,
                 father_name, mother_name, address, date_of_baptism,
                 godparents, performed_by, notes, created_by, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
              [
                churchId,
                payload.child_name || null,
                payload.date_of_birth || null,
                payload.place_of_birth || null,
                payload.father_name || null,
                payload.mother_name || null,
                payload.address || null,
                payload.date_of_baptism || null,
                payload.godparents || null,
                payload.performed_by || null,
                notes,
                userEmail,
              ]
            );
            break;

          case 'marriage':
            [insertResult] = await db.query(
              `INSERT INTO marriage_records
                (church_id, groom_name, bride_name, date_of_marriage,
                 place_of_marriage, witnesses, officiant, notes,
                 created_by, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
              [
                churchId,
                payload.groom_name || null,
                payload.bride_name || null,
                payload.date_of_marriage || null,
                payload.place_of_marriage || null,
                payload.witnesses || null,
                payload.officiant || null,
                notes,
                userEmail,
              ]
            );
            break;

          case 'funeral':
            [insertResult] = await db.query(
              `INSERT INTO funeral_records
                (church_id, deceased_name, date_of_death, date_of_funeral,
                 date_of_burial, place_of_burial, age_at_death,
                 cause_of_death, next_of_kin, officiant, notes,
                 created_by, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
              [
                churchId,
                payload.deceased_name || null,
                payload.date_of_death || null,
                payload.date_of_funeral || null,
                payload.date_of_burial || null,
                payload.place_of_burial || null,
                payload.age_at_death || null,
                payload.cause_of_death || null,
                payload.next_of_kin || null,
                payload.officiant || null,
                notes,
                userEmail,
              ]
            );
            break;

          default:
            errors.push({
              entry_index: draft.entry_index,
              record_type: draft.record_type,
              error: `Unsupported record_type: ${draft.record_type}`,
            });
            continue;
        }

        const createdRecordId = insertResult?.insertId ?? null;

        // Non-blocking: update finalize history with created_record_id
        (async () => {
          try {
            await db.query(
              `UPDATE ocr_finalize_history
               SET created_record_id = ?, committed_at = NOW()
               WHERE ocr_job_id = ? AND entry_index = ?`,
              [createdRecordId, jobId, draft.entry_index ?? 0]
            );
          } catch (_e) {
            // swallowed
          }
        })();

        // Update draft status to committed
        await db.query(
          `UPDATE ocr_fused_drafts
           SET workflow_status = 'committed', committed_record_id = ?
           WHERE id = ?`,
          [createdRecordId, draft.id]
        );

        committed.push({
          entry_index: draft.entry_index,
          record_type: draft.record_type,
          created_record_id: createdRecordId,
        });
      } catch (recErr: any) {
        console.error(
          `[OCR Review] commit error for draft ${draft.id}:`,
          recErr
        );
        errors.push({
          entry_index: draft.entry_index,
          record_type: draft.record_type,
          error: recErr.message,
        });
      }
    }

    // Non-blocking: write to jobBundle
    (async () => {
      try {
        let jobBundle: any;
        try {
          jobBundle = require('./utils/jobBundle');
        } catch {
          try {
            jobBundle = require('../dist/utils/jobBundle');
          } catch {
            return;
          }
        }
        if (jobBundle && typeof jobBundle.write === 'function') {
          await jobBundle.write(jobId, {
            committed: committed.map((c) => c.created_record_id),
          });
        }
      } catch (_e) {
        // intentionally swallowed
      }
    })();

    return res.json({
      success: true,
      committed,
      errors,
      message: `Committed ${committed.length} record(s)${errors.length ? `, ${errors.length} error(s)` : ''}`,
    });
  } catch (err: any) {
    console.error('[OCR Review] commit error:', err);
    return res.status(500).json({ error: err.message || 'Commit failed' });
  }
});

// ---------------------------------------------------------------------------
// GET /finalize-history
// ---------------------------------------------------------------------------
router.get('/finalize-history', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const record_type = req.query.record_type as string | undefined;
    const days = parseInt(req.query.days as string) || 30;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);

    console.log(
      `[OCR Review] GET finalize-history — churchId=${churchId} days=${days} limit=${limit}`
    );

    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db } = resolved;

    let sql = `
      SELECT
        h.id,
        h.ocr_job_id,
        h.entry_index,
        h.record_type,
        h.record_number,
        h.payload_json,
        h.created_record_id,
        h.finalized_by,
        h.finalized_at,
        h.committed_at,
        h.source_filename,
        j.original_filename AS job_filename
      FROM ocr_finalize_history h
      LEFT JOIN ocr_jobs j ON h.ocr_job_id = j.id
      WHERE h.finalized_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `;
    const params: any[] = [days];

    if (record_type) {
      sql += ' AND h.record_type = ?';
      params.push(record_type);
    }

    sql += ' ORDER BY h.finalized_at DESC LIMIT ?';
    params.push(limit);

    const [history]: any = await db.query(sql, params);

    return res.json({ history });
  } catch (err: any) {
    console.error('[OCR Review] finalize-history error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch history' });
  }
});

// ---------------------------------------------------------------------------
// Agent pipeline — extract → confirm → seed (replaces Workbench/Fusion flow)
// ---------------------------------------------------------------------------

async function loadPlatformJob(churchId: number, jobId: number) {
  const [rows]: any = await promisePool.query(
    `SELECT id, church_id, filename, status, review_status, record_type, language,
            ocr_text, agent_status, agent_extract_json, ready_to_seed, seeded_at, variation_id
     FROM ocr_jobs WHERE id = ? AND church_id = ?`,
    [jobId, churchId]
  );
  return rows[0] || null;
}

router.post('/jobs/:jobId/agent-extract', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const job = await loadPlatformJob(churchId, jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (!job.ocr_text?.trim()) {
      return res.status(400).json({ error: 'OCR text not available — wait for OCR to complete' });
    }

    await promisePool.query(
      `UPDATE ocr_jobs SET agent_status = 'running' WHERE id = ?`,
      [jobId]
    );

    const extract = await extractAgentFieldsForJob(jobId, job.ocr_text, job.record_type);
    const payload = {
      ...extract,
      extracted_at: new Date().toISOString(),
      confirmed: false,
    };

    await promisePool.query(
      `UPDATE ocr_jobs SET
         agent_status = 'complete',
         agent_extract_json = ?,
         review_status = 'agent_extracted',
         record_type = CASE WHEN record_type = 'custom' OR record_type IS NULL THEN ? ELSE record_type END
       WHERE id = ?`,
      [JSON.stringify(payload), extract.record_type !== 'custom' ? extract.record_type : job.record_type, jobId]
    );

    res.json({ ok: true, jobId, extract: payload });
  } catch (err: any) {
    console.error('[OCR Agent] extract error:', err);
    res.status(500).json({ error: err.message || 'Agent extraction failed' });
  }
});

router.get('/jobs/:jobId/agent-extract', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const job = await loadPlatformJob(churchId, jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    let extract = null;
    if (job.agent_extract_json) {
      try {
        extract = typeof job.agent_extract_json === 'string'
          ? JSON.parse(job.agent_extract_json)
          : job.agent_extract_json;
      } catch {
        extract = job.agent_extract_json;
      }
    }

    res.json({
      jobId,
      agent_status: job.agent_status,
      review_status: job.review_status,
      ready_to_seed: !!job.ready_to_seed,
      seeded_at: job.seeded_at,
      extract,
      ocr_text_preview: job.ocr_text ? job.ocr_text.slice(0, 500) : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load agent extract' });
  }
});

router.post('/jobs/:jobId/confirm-extract', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const { fields, records, record_type, finalize, confirmed_indexes } = req.body || {};

    const job = await loadPlatformJob(churchId, jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const recordType = record_type || job.record_type;
    if (!recordType || recordType === 'custom') {
      return res.status(400).json({ error: 'record_type is required (baptism, marriage, or funeral)' });
    }

    const confirmedRecords = Array.isArray(records) && records.length
      ? records
      : fields
        ? [fields]
        : null;

    if (!confirmedRecords?.length) {
      return res.status(400).json({ error: 'fields or records array is required' });
    }

    if (recordType === 'baptism') {
      for (const rec of confirmedRecords) {
        normalizeBaptismDates(rec);
      }
    }

    // finalize defaults to true for backward compatibility. When false, the job
    // stays in review (per-record progress save) and is NOT yet seedable.
    const isFinal = finalize !== false;

    const payload = {
      record_type: recordType,
      fields: confirmedRecords[0],
      records: confirmedRecords,
      confirmed: isFinal,
      confirmed_indexes: Array.isArray(confirmed_indexes) ? confirmed_indexes : undefined,
      confirmed_at: new Date().toISOString(),
      confirmed_by: req.session?.user?.email || req.user?.email || 'system',
      method: 'human_confirmed',
    };

    await promisePool.query(
      `UPDATE ocr_jobs SET
         agent_extract_json = ?,
         review_status = ?,
         ready_to_seed = ?,
         record_type = ?
       WHERE id = ?`,
      [JSON.stringify(payload), isFinal ? 'ready_to_seed' : 'agent_extracted', isFinal ? 1 : 0, recordType, jobId]
    );

    res.json({
      ok: true,
      jobId,
      review_status: isFinal ? 'ready_to_seed' : 'agent_extracted',
      finalized: isFinal,
      extract: payload,
    });
  } catch (err: any) {
    console.error('[OCR Agent] confirm error:', err);
    res.status(500).json({ error: err.message || 'Failed to confirm extraction' });
  }
});

router.post('/jobs/:jobId/seed', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const job = await loadPlatformJob(churchId, jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (!job.ready_to_seed) {
      return res.status(400).json({ error: 'Job is not ready to seed — confirm extraction first' });
    }

    let extract: any = null;
    try {
      extract = typeof job.agent_extract_json === 'string'
        ? JSON.parse(job.agent_extract_json)
        : job.agent_extract_json;
    } catch {
      return res.status(400).json({ error: 'Invalid agent_extract_json on job' });
    }

    const recordType = extract.record_type;
    const records = extract.records || (extract.fields ? [extract.fields] : []);
    if (!records.length) return res.status(400).json({ error: 'No confirmed records to seed' });

    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db } = resolved;

    const tableMap: Record<string, string> = {
      baptism: 'baptism_records',
      marriage: 'marriage_records',
      funeral: 'funeral_records',
    };
    const table = tableMap[recordType];
    if (!table) return res.status(400).json({ error: `Unsupported record_type: ${recordType}` });

    const seedRunId = `ocr_job_${jobId}_${Date.now()}`;
    const userEmail = req.session?.user?.email || req.user?.email || 'system';
    const conn = await db.getConnection();
    const created: any[] = [];

    try {
      await conn.beginTransaction();
      for (const rec of records) {
        const mapped = mapFieldsToDbColumns(recordType, rec);
        const extra: Record<string, any> = {
          source_scan_id: jobId,
          status: 'active',
        };
        try {
          const [cols] = await conn.query(
            `SELECT COLUMN_NAME FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'seed_run_id'`,
            [table]
          );
          if ((cols as any[]).length) extra.seed_run_id = seedRunId;
        } catch (_) { /* optional column */ }

        const merged = { ...mapped, ...extra };
        const { sql, params } = buildInsertQuery(table, churchId, merged);
        const [result] = await conn.query(sql, params);
        created.push({ recordId: result.insertId, fields: rec });
      }
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    await promisePool.query(
      `UPDATE ocr_jobs SET review_status = 'seeded', seeded_at = NOW(), ready_to_seed = 0 WHERE id = ?`,
      [jobId]
    );

    console.log(`OCR_SEED_OK ${JSON.stringify({ jobId, churchId, recordType, count: created.length, seedRunId, by: userEmail })}`);
    res.json({
      ok: true,
      jobId,
      seed_run_id: seedRunId,
      created_records: created,
      review_status: 'seeded',
    });
  } catch (err: any) {
    console.error('[OCR Agent] seed error:', err);
    res.status(500).json({ error: err.message || 'Failed to seed records' });
  }
});

module.exports = router;
