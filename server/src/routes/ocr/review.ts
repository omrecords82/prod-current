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
import {
  extractAgentFieldsForJob,
  extractAgent2FieldsForJob,
  compareAgentFieldDiffs,
  normalizeBaptismDates,
} from '../../utils/ocrClassifier';
import { ParishRulesEngine } from '../../services/ocr/rules/ParishRulesEngine';

let agent2SchemaReady = false;
async function ensureAgent2Schema() {
  if (agent2SchemaReady) return;
  await promisePool.query('ALTER TABLE ocr_jobs ADD COLUMN IF NOT EXISTS agent2_extract_json LONGTEXT NULL');
  await promisePool.query('ALTER TABLE ocr_jobs ADD COLUMN IF NOT EXISTS agent2_status VARCHAR(32) NULL');
  agent2SchemaReady = true;
}

function parseJsonColumn(raw: unknown): any {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw as string);
  } catch {
    return raw;
  }
}

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

        const tableMap: Record<string, string> = {
          baptism: 'baptism_records',
          marriage: 'marriage_records',
          funeral: 'funeral_records',
        };
        const table = tableMap[draft.record_type];
        if (!table) {
          errors.push({
            entry_index: draft.entry_index,
            record_type: draft.record_type,
            error: `Unsupported record_type: ${draft.record_type}`,
          });
          continue;
        }

        const mapped = mapFieldsToDbColumns(draft.record_type, {
          ...payload,
          notes,
        });
        const { sql, params } = buildInsertQuery(table, churchId, mapped);
        const [insertResult]: any = await db.query(sql, params);

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
  await ensureAgent2Schema();
  const [rows]: any = await promisePool.query(
    `SELECT id, church_id, filename, status, review_status, record_type, language,
            ocr_text, agent_status, agent_extract_json, agent2_extract_json, agent2_status,
            ready_to_seed, seeded_at, variation_id
     FROM ocr_jobs WHERE id = ? AND church_id = ?`,
    [jobId, churchId]
  );
  return rows[0] || null;
}

async function runAndPersistAgent2(job: any, jobId: number) {
  await promisePool.query(`UPDATE ocr_jobs SET agent2_status = 'running' WHERE id = ?`, [jobId]);
  const agent2 = await extractAgent2FieldsForJob(jobId, job.record_type, job.ocr_text);
  if (agent2) {
    const payload = {
      ...agent2,
      extracted_at: new Date().toISOString(),
      confirmed: false,
    };
    await promisePool.query(
      `UPDATE ocr_jobs SET agent2_status = 'complete', agent2_extract_json = ? WHERE id = ?`,
      [JSON.stringify(payload), jobId],
    );
    return payload;
  }
  await promisePool.query(`UPDATE ocr_jobs SET agent2_status = 'unavailable' WHERE id = ?`, [jobId]);
  return null;
}

async function evaluateAndPersistRulesForJob(churchId: number, jobId: number, payload: any, recordType: string) {
  try {
    const engine = new ParishRulesEngine(churchId);
    await engine.init();

    const recordsList = payload.records || (payload.fields ? [payload.fields] : []);
    const evaluatedRecords: any[] = [];
    let hasBlockers = false;
    let hasWarnings = false;

    // Clear previous outcomes for this job to prevent duplicates
    await promisePool.query(
      `DELETE FROM ocr_rule_evaluation_logs WHERE ocr_job_id = ?`,
      [jobId]
    );

    for (let i = 0; i < recordsList.length; i++) {
      const rec = recordsList[i];
      const evalResult = await engine.evaluateRecord(recordType, rec, {
        ocrJobId: jobId,
        recordIndex: i
      });
      
      await ParishRulesEngine.persistEvaluationLogs(churchId, jobId, null, i, evalResult.outcomes);
      evaluatedRecords.push(evalResult.fields);

      if (evalResult.has_blockers) hasBlockers = true;
      if (evalResult.has_warnings) hasWarnings = true;
    }

    if (payload.records) payload.records = evaluatedRecords;
    if (payload.fields && evaluatedRecords.length > 0) payload.fields = evaluatedRecords[0];

    // Fetch the persisted logs with DB IDs
    const [dbOutcomes]: any = await promisePool.query(
      `SELECT * FROM ocr_rule_evaluation_logs WHERE ocr_job_id = ? ORDER BY record_index ASC, id ASC`,
      [jobId]
    );

    const outcomesByRecord = new Map<number, any[]>();
    for (const log of dbOutcomes) {
      let suggested = log.suggested_value;
      if (typeof suggested === 'string' && (suggested.startsWith('[') || suggested.startsWith('{'))) {
        try {
          suggested = JSON.parse(suggested);
        } catch (_) {}
      }
      let resolved = log.resolved_value;
      if (typeof resolved === 'string' && (resolved.startsWith('[') || resolved.startsWith('{'))) {
        try {
          resolved = JSON.parse(resolved);
        } catch (_) {}
      }

      const parsedLog = {
        id: log.id,
        rule_id: log.rule_id,
        rule_name: log.rule_name,
        target_field: log.target_field,
        action_type: log.action_type,
        severity: log.severity,
        original_value: log.original_value,
        suggested_value: suggested,
        resolved_value: resolved,
        explanation: log.explanation,
        auto_applied: log.auto_applied === 1,
        reviewer_decision: log.reviewer_decision
      };

      const idx = log.record_index ?? 0;
      if (!outcomesByRecord.has(idx)) outcomesByRecord.set(idx, []);
      outcomesByRecord.get(idx)!.push(parsedLog);
    }

    const allOutcomes: any[] = [];
    for (const [idx, list] of outcomesByRecord.entries()) {
      allOutcomes.push({ record_index: idx, outcomes: list });
    }

    payload.rules = {
      has_blockers: hasBlockers,
      has_warnings: hasWarnings,
      outcomes: allOutcomes
    };
  } catch (err: any) {
    console.error('[OCR Rules Engine] Helper evaluation failed:', err);
  }
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
    const payload: any = {
      ...extract,
      agent: 'agent1' as const,
      extracted_at: new Date().toISOString(),
      confirmed: false,
    };

    // Evaluate rules and persist outcomes
    await evaluateAndPersistRulesForJob(churchId, jobId, payload, extract.record_type !== 'custom' ? extract.record_type : job.record_type);

    await promisePool.query(
      `UPDATE ocr_jobs SET
         agent_status = 'complete',
         agent_extract_json = ?,
         review_status = 'agent_extracted',
         record_type = CASE WHEN record_type = 'custom' OR record_type IS NULL THEN ? ELSE record_type END
       WHERE id = ?`,
      [JSON.stringify(payload), extract.record_type !== 'custom' ? extract.record_type : job.record_type, jobId]
    );

    const recordIndex = typeof payload.candidate_index === 'number' ? payload.candidate_index : 0;

    // Agent 2 (LlamaParse + LLM) can take 30–90s — run in background so the UI is not blocked.
    runAndPersistAgent2(job, jobId).catch((agent2Err: any) => {
      console.warn('[OCR Agent2] background extract error:', agent2Err.message);
    });

    res.json({
      ok: true,
      jobId,
      extract: payload,
      agent2_status: 'running',
      agent2_extract: parseJsonColumn(job.agent2_extract_json),
      comparison: compareAgentFieldDiffs(payload, parseJsonColumn(job.agent2_extract_json), recordIndex),
    });
  } catch (err: any) {
    console.error('[OCR Agent] extract error:', err);
    res.status(500).json({ error: err.message || 'Agent extraction failed' });
  }
});

router.post('/jobs/:jobId/agent2-extract', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const job = await loadPlatformJob(churchId, jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const agent2Extract = await runAndPersistAgent2(job, jobId);
    if (!agent2Extract) {
      return res.status(400).json({
        error: 'Agent 2 extraction unavailable — enable LlamaParse and ensure OCR artifacts exist',
      });
    }

    const extract = parseJsonColumn(job.agent_extract_json);
    const recordIndex = parseInt(req.query.record_index as string, 10) || 0;
    res.json({
      ok: true,
      jobId,
      agent2_extract: agent2Extract,
      comparison: compareAgentFieldDiffs(extract, agent2Extract, recordIndex),
    });
  } catch (err: any) {
    console.error('[OCR Agent2] extract error:', err);
    res.status(500).json({ error: err.message || 'Agent 2 extraction failed' });
  }
});

router.get('/jobs/:jobId/agent-extract', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    const jobId = parseInt(req.params.jobId);
    const job = await loadPlatformJob(churchId, jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const extract = parseJsonColumn(job.agent_extract_json);
    
    // Dynamically evaluate rules on GET to ensure rules reflect current DB configs/entities
    if (extract) {
      await evaluateAndPersistRulesForJob(churchId, jobId, extract, extract.record_type || job.record_type);
    }

    const agent2Extract = parseJsonColumn(job.agent2_extract_json);
    const recordIndex = parseInt(req.query.record_index as string, 10) || 0;

    const llamaparse = require('../../services/llamaParseService');
    const llamaparseMarkdown = llamaparse.readLlamaParseMarkdownForJob(jobId);

    res.json({
      jobId,
      agent_status: job.agent_status,
      agent2_status: job.agent2_status,
      review_status: job.review_status,
      ready_to_seed: !!job.ready_to_seed,
      seeded_at: job.seeded_at,
      extract,
      agent2_extract: agent2Extract,
      comparison: compareAgentFieldDiffs(extract, agent2Extract, recordIndex),
      llamaparse_available: !!llamaparseMarkdown?.trim(),
      llamaparse_preview: llamaparseMarkdown ? llamaparseMarkdown.slice(0, 800) : null,
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

    const payload: any = {
      record_type: recordType,
      fields: confirmedRecords[0],
      records: confirmedRecords,
      confirmed: isFinal,
      confirmed_indexes: Array.isArray(confirmed_indexes) ? confirmed_indexes : undefined,
      confirmed_at: new Date().toISOString(),
      confirmed_by: req.session?.user?.email || req.user?.email || 'system',
      method: 'human_confirmed',
    };

    // Evaluate rules and persist outcomes
    await evaluateAndPersistRulesForJob(churchId, jobId, payload, recordType);

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

    // Validate unresolved blockers
    const [unresolvedBlockers]: any = await promisePool.query(
      `SELECT COUNT(*) as count FROM ocr_rule_evaluation_logs 
       WHERE ocr_job_id = ? AND severity = 'blocker' AND reviewer_decision = 'pending'`,
      [jobId]
    );
    if (unresolvedBlockers[0]?.count > 0) {
      return res.status(400).json({
        error: 'Cannot seed records: Job has unresolved date or data sequence blockers. Correct the invalid dates or resolve blockers before seeding.'
      });
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

      // Fetch valid columns for the target table
      const [columnRows] = await conn.query(
        `SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [table]
      );
      const validColumns = new Map<string, string>();
      for (const row of columnRows as any[]) {
        validColumns.set(row.COLUMN_NAME.toLowerCase(), row.DATA_TYPE.toLowerCase());
      }

      for (const rec of records) {
        const mapped = mapFieldsToDbColumns(recordType, rec);
        const extra: Record<string, any> = {};

        if (validColumns.has('source_scan_id')) {
          extra.source_scan_id = jobId;
        }
        if (validColumns.has('status')) {
          extra.status = 'active';
        }
        if (validColumns.has('seed_run_id')) {
          const dataType = validColumns.get('seed_run_id');
          if (dataType && (dataType.includes('int') || dataType === 'number' || dataType === 'decimal')) {
            extra.seed_run_id = jobId;
          } else {
            extra.seed_run_id = seedRunId;
          }
        }

        const merged = { ...mapped, ...extra };
        const filteredMerged: Record<string, any> = {};
        for (const [key, val] of Object.entries(merged)) {
          if (validColumns.has(key.toLowerCase())) {
            filteredMerged[key] = val;
          }
        }

        const { sql, params } = buildInsertQuery(table, churchId, filteredMerged);
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
