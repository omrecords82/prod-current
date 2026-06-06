import { Router } from 'express';
import { promisePool } from '../../config/db';
import { validateChurchAccess, resolveChurchDb } from './helpers';
import { validateRuleSchema } from '../../services/ocr/rules/ruleSchemaValidator';
import { ParishRulesEngine } from '../../services/ocr/rules/ParishRulesEngine';

const router = Router({ mergeParams: true });

// Middleware to verify church access
const checkAccess = (req: any, res: any, next: any) => {
  const churchId = parseInt(req.params.churchId, 10);
  if (!validateChurchAccess(req, churchId)) {
    return res.status(403).json({ error: 'Access denied to this church' });
  }
  next();
};

router.use(checkAccess);

// -------------------------------------------------------------------------
// Configuration Entities APIs
// -------------------------------------------------------------------------

// GET /rules/config/entities
router.get('/rules/config/entities', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId, 10);
    const [rows] = await promisePool.query(
      `SELECT * FROM ocr_parish_configuration_entities WHERE church_id = ? AND is_active = 1`,
      [churchId]
    );
    res.json({ ok: true, entities: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /rules/config/entities
router.post('/rules/config/entities', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId, 10);
    const { entity_type, canonical_value, display_label, role, active_from, active_to, variants_json, source_notes } = req.body || {};

    if (!entity_type || !canonical_value) {
      return res.status(400).json({ error: 'entity_type and canonical_value are required' });
    }

    const userEmail = req.session?.user?.email || req.user?.email || 'system';

    const [result]: any = await promisePool.query(
      `INSERT INTO ocr_parish_configuration_entities 
       (church_id, entity_type, canonical_value, display_label, role, active_from, active_to, variants_json, source_notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        churchId,
        entity_type,
        canonical_value,
        display_label || null,
        role || null,
        active_from || null,
        active_to || null,
        typeof variants_json === 'object' ? JSON.stringify(variants_json) : (variants_json || null),
        source_notes || null,
        userEmail
      ]
    );

    res.json({ ok: true, id: result.insertId, message: 'Entity created successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /rules/config/entities/:id
router.patch('/rules/config/entities/:id', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId, 10);
    const entityId = parseInt(req.params.id, 10);

    const [entRows]: any = await promisePool.query(
      `SELECT id FROM ocr_parish_configuration_entities WHERE id = ? AND church_id = ?`,
      [entityId, churchId]
    );
    if (!entRows.length) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    const updates = req.body || {};
    const allowedKeys = ['canonical_value', 'display_label', 'role', 'active_from', 'active_to', 'variants_json', 'source_notes', 'is_active'];
    const setClause: string[] = [];
    const params: any[] = [];

    for (const key of allowedKeys) {
      if (key in updates) {
        setClause.push(`${key} = ?`);
        let val = updates[key];
        if (key === 'variants_json' && typeof val === 'object') {
          val = JSON.stringify(val);
        }
        params.push(val);
      }
    }

    if (!setClause.length) {
      return res.status(400).json({ error: 'No valid update parameters provided' });
    }

    params.push(entityId, churchId);
    await promisePool.query(
      `UPDATE ocr_parish_configuration_entities SET ${setClause.join(', ')} WHERE id = ? AND church_id = ?`,
      params
    );

    res.json({ ok: true, message: 'Entity updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /rules/config/entities/:id
router.delete('/rules/config/entities/:id', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId, 10);
    const entityId = parseInt(req.params.id, 10);

    const [result]: any = await promisePool.query(
      `DELETE FROM ocr_parish_configuration_entities WHERE id = ? AND church_id = ?`,
      [entityId, churchId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    res.json({ ok: true, message: 'Entity deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------------------
// Rules Configuration APIs
// -------------------------------------------------------------------------

// GET /rules
router.get('/rules', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId, 10);
    const [rows] = await promisePool.query(
      `SELECT * FROM ocr_parish_rules WHERE (church_id IS NULL OR church_id = ?) ORDER BY priority ASC`,
      [churchId]
    );
    res.json({ ok: true, rules: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /rules
router.post('/rules', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId, 10);
    const { name, description, record_type, conditions_json, actions_json, severity, priority } = req.body || {};

    const ruleObj = {
      name,
      description,
      record_type,
      conditions: typeof conditions_json === 'string' ? JSON.parse(conditions_json) : conditions_json,
      actions: typeof actions_json === 'string' ? JSON.parse(actions_json) : actions_json,
      severity: severity || 'suggestion',
      priority: priority ?? 100
    };

    // Strict validation
    try {
      validateRuleSchema(ruleObj);
    } catch (valErr: any) {
      return res.status(400).json({ error: `Rule schema validation failed: ${valErr.message}` });
    }

    const userEmail = req.session?.user?.email || req.user?.email || 'system';

    const [result]: any = await promisePool.query(
      `INSERT INTO ocr_parish_rules 
       (church_id, scope, name, description, record_type, conditions_json, actions_json, severity, priority, created_by)
       VALUES (?, 'church', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        churchId,
        name,
        description || null,
        record_type,
        JSON.stringify(ruleObj.conditions),
        JSON.stringify(ruleObj.actions),
        ruleObj.severity,
        ruleObj.priority,
        userEmail
      ]
    );

    res.json({ ok: true, id: result.insertId, message: 'Rule created successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /rules/:id
router.patch('/rules/:id', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId, 10);
    const ruleId = parseInt(req.params.id, 10);

    const [ruleRows]: any = await promisePool.query(
      `SELECT id, church_id FROM ocr_parish_rules WHERE id = ?`,
      [ruleId]
    );
    if (!ruleRows.length) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    if (ruleRows[0].church_id !== null && ruleRows[0].church_id !== churchId) {
      return res.status(403).json({ error: 'Access denied: Cannot edit another parish rule' });
    }

    const updates = req.body || {};
    const allowedKeys = ['name', 'description', 'record_type', 'conditions_json', 'actions_json', 'severity', 'priority', 'is_active'];
    const setClause: string[] = [];
    const params: any[] = [];

    for (const key of allowedKeys) {
      if (key in updates) {
        setClause.push(`${key} = ?`);
        let val = updates[key];
        if ((key === 'conditions_json' || key === 'actions_json') && typeof val === 'object') {
          val = JSON.stringify(val);
        }
        params.push(val);
      }
    }

    if (!setClause.length) {
      return res.status(400).json({ error: 'No valid update parameters provided' });
    }

    params.push(ruleId);
    await promisePool.query(
      `UPDATE ocr_parish_rules SET ${setClause.join(', ')} WHERE id = ?`,
      params
    );

    res.json({ ok: true, message: 'Rule updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /rules/:id
router.delete('/rules/:id', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId, 10);
    const ruleId = parseInt(req.params.id, 10);

    const [ruleRows]: any = await promisePool.query(
      `SELECT id, church_id FROM ocr_parish_rules WHERE id = ?`,
      [ruleId]
    );
    if (!ruleRows.length) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    if (ruleRows[0].church_id !== null && ruleRows[0].church_id !== churchId) {
      return res.status(403).json({ error: 'Access denied: Cannot delete platform-level global rules' });
    }

    await promisePool.query(`DELETE FROM ocr_parish_rules WHERE id = ?`, [ruleId]);
    res.json({ ok: true, message: 'Rule deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------------------
// Evaluation & Seeding Integration APIs
// -------------------------------------------------------------------------

// POST /rules/evaluate
router.post('/rules/evaluate', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId, 10);
    const { record_type, fields, confidence } = req.body || {};

    if (!record_type || !fields) {
      return res.status(400).json({ error: 'record_type and fields object are required' });
    }

    const engine = new ParishRulesEngine(churchId);
    await engine.init();

    const result = await engine.evaluateRecord(record_type, fields, {
      confidenceMetadata: confidence
    });

    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /rules/outcomes/:id/accept
router.post('/rules/outcomes/:id/accept', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId, 10);
    const logId = parseInt(req.params.id, 10);
    const userEmail = req.session?.user?.email || req.user?.email || 'reviewer';

    // 1. Fetch the log outcome
    const [logs]: any = await promisePool.query(
      `SELECT * FROM ocr_rule_evaluation_logs WHERE id = ? AND church_id = ?`,
      [logId, churchId]
    );
    if (!logs.length) {
      return res.status(404).json({ error: 'Evaluation log entry not found' });
    }
    const log = logs[0];

    // 2. Fetch the corresponding job
    const [jobs]: any = await promisePool.query(
      `SELECT id, agent_extract_json FROM ocr_jobs WHERE id = ? AND church_id = ?`,
      [log.ocr_job_id, churchId]
    );
    if (!jobs.length) {
      return res.status(404).json({ error: 'OCR Job not found' });
    }
    const job = jobs[0];

    // 3. Update the value inside agent_extract_json
    let extractPayload: any = {};
    try {
      extractPayload = typeof job.agent_extract_json === 'string' 
        ? JSON.parse(job.agent_extract_json) 
        : job.agent_extract_json;
    } catch (_) {
      return res.status(400).json({ error: 'Invalid agent_extract_json in job' });
    }

    const index = log.record_index ?? 0;
    const records = extractPayload.records || [];
    if (records[index]) {
      // Clean target value before updating
      let valToApply = log.suggested_value;
      // Handle array structure for clergy concurrency
      if (typeof valToApply === 'string' && valToApply.startsWith('[')) {
        try {
          const parsed = JSON.parse(valToApply);
          if (Array.isArray(parsed) && parsed.length > 0) {
            valToApply = parsed[0].canonical_value || valToApply;
          }
        } catch (_) {}
      }

      records[index][log.target_field] = valToApply;
      
      // Keep main fields in sync if updating record index 0
      if (index === 0) {
        extractPayload.fields = extractPayload.fields || {};
        extractPayload.fields[log.target_field] = valToApply;
      }
    }

    // 4. Update the DB records
    await promisePool.query(
      `UPDATE ocr_jobs SET agent_extract_json = ? WHERE id = ?`,
      [JSON.stringify(extractPayload), job.id]
    );

    await promisePool.query(
      `UPDATE ocr_rule_evaluation_logs 
       SET reviewer_decision = 'accepted', resolved_value = ?, decided_by = ?, decided_at = NOW() 
       WHERE id = ?`,
      [log.suggested_value, userEmail, logId]
    );

    res.json({ ok: true, message: 'Suggestion accepted and draft updated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /rules/outcomes/:id/reject
router.post('/rules/outcomes/:id/reject', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId, 10);
    const logId = parseInt(req.params.id, 10);
    const userEmail = req.session?.user?.email || req.user?.email || 'reviewer';

    const [result]: any = await promisePool.query(
      `UPDATE ocr_rule_evaluation_logs 
       SET reviewer_decision = 'rejected', decided_by = ?, decided_at = NOW() 
       WHERE id = ? AND church_id = ?`,
      [userEmail, logId, churchId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Evaluation log entry not found' });
    }

    res.json({ ok: true, message: 'Suggestion rejected' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /rules/outcomes/:id/override
router.post('/rules/outcomes/:id/override', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId, 10);
    const logId = parseInt(req.params.id, 10);
    const { reason } = req.body || {};
    const userEmail = req.session?.user?.email || req.user?.email || 'reviewer';

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: 'An override reason is required' });
    }

    const [result]: any = await promisePool.query(
      `UPDATE ocr_rule_evaluation_logs 
       SET reviewer_decision = 'overridden', decision_notes = ?, decided_by = ?, decided_at = NOW() 
       WHERE id = ? AND church_id = ?`,
      [reason, userEmail, logId, churchId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Evaluation log entry not found' });
    }

    res.json({ ok: true, message: 'Warning/error overridden successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /rules/revalidate-record
router.post('/rules/revalidate-record', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId, 10);
    const { job_id, record_index, fields } = req.body || {};

    if (!job_id || !fields) {
      return res.status(400).json({ error: 'job_id and fields object are required' });
    }

    const [jobs]: any = await promisePool.query(
      `SELECT record_type FROM ocr_jobs WHERE id = ? AND church_id = ?`,
      [job_id, churchId]
    );
    if (!jobs.length) {
      return res.status(404).json({ error: 'OCR Job not found' });
    }
    const recordType = jobs[0].record_type;

    const engine = new ParishRulesEngine(churchId);
    await engine.init();

    const evalResult = await engine.evaluateRecord(recordType, fields, {
      ocrJobId: job_id,
      recordIndex: record_index
    });

    // Clear previous outcomes for this record to prevent duplications
    await promisePool.query(
      `DELETE FROM ocr_rule_evaluation_logs WHERE ocr_job_id = ? AND record_index = ?`,
      [job_id, record_index]
    );

    // Persist new outcomes
    await ParishRulesEngine.persistEvaluationLogs(churchId, job_id, null, record_index, evalResult.outcomes);

    res.json({ ok: true, ...evalResult });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
