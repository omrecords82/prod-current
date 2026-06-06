import { promisePool } from '../../../config/db';
import { Rule, RuleOutcome, ParishConfigurationEntity, RuleCondition, RuleConditionGroup } from './ruleTypes';
import { defaultRules } from './defaultRules';
import { ruleOperators, OperatorContext } from './ruleOperators';
import { ruleResolvers, ResolverContext } from './ruleResolvers';
import { validateRuleSchema } from './ruleSchemaValidator';

export class ParishRulesEngine {
  private churchId: number;
  private entities: ParishConfigurationEntity[] = [];
  private rules: Rule[] = [];

  constructor(churchId: number) {
    this.churchId = churchId;
  }

  /**
   * Preloads configuration entities and active rules for the church.
   */
  async init(): Promise<void> {
    // 1. Load active parish configuration entities
    const [entityRows]: any = await promisePool.query(
      `SELECT * FROM ocr_parish_configuration_entities 
       WHERE church_id = ? AND is_active = 1`,
      [this.churchId]
    );
    this.entities = entityRows as ParishConfigurationEntity[];

    // 2. Load active platform and church rules from database
    const [ruleRows]: any = await promisePool.query(
      `SELECT * FROM ocr_parish_rules 
       WHERE (church_id IS NULL OR church_id = ?) AND is_active = 1
       ORDER BY priority ASC`,
      [this.churchId]
    );

    const dbRules: Rule[] = (ruleRows as any[]).map(r => {
      let conditionsObj = {};
      let actionsObj = [];
      try {
        conditionsObj = typeof r.conditions_json === 'string' ? JSON.parse(r.conditions_json) : r.conditions_json;
        actionsObj = typeof r.actions_json === 'string' ? JSON.parse(r.actions_json) : r.actions_json;
      } catch (_) {}

      return {
        id: r.id,
        church_id: r.church_id,
        scope: r.scope,
        name: r.name,
        description: r.description,
        record_type: r.record_type,
        conditions: conditionsObj,
        actions: actionsObj,
        severity: r.severity,
        is_active: r.is_active === 1,
        priority: r.priority
      } as Rule;
    });

    // Merge default rules with database rules (database rules override defaults by ID or name)
    const ruleMap = new Map<string, Rule>();
    
    // Add default rules first
    for (const rule of defaultRules) {
      ruleMap.set(`default_${rule.name}`, rule);
    }
    
    // Add DB rules, overriding by name
    for (const rule of dbRules) {
      ruleMap.set(rule.name, rule);
    }

    this.rules = Array.from(ruleMap.values()).sort((a, b) => a.priority - b.priority);

    // Validate rules schema to avoid runtime errors
    for (const rule of this.rules) {
      try {
        validateRuleSchema(rule);
      } catch (err: any) {
        console.warn(`[Rules Engine] Skipping invalid rule "${rule.name}": ${err.message}`);
      }
    }
  }

  /**
   * Evaluates a record's fields against the active rules list.
   */
  async evaluateRecord(
    recordType: string,
    extractedFields: Record<string, any>,
    options: {
      ocrJobId?: number;
      draftId?: number;
      recordIndex?: number;
      confidenceMetadata?: Record<string, number>;
    } = {}
  ): Promise<{
    fields: Record<string, any>;
    outcomes: RuleOutcome[];
    has_blockers: boolean;
    has_warnings: boolean;
  }> {
    const workingFields = { ...extractedFields };
    const outcomes: RuleOutcome[] = [];

    const optRecordIndex = options.recordIndex ?? 0;
    const optConfidence = options.confidenceMetadata || {};

    const opContext: OperatorContext = {
      churchId: this.churchId,
      recordType,
      fields: workingFields,
      confidenceMetadata: optConfidence,
      entities: this.entities
    };

    const resContext: ResolverContext = {
      churchId: this.churchId,
      recordType,
      fields: workingFields,
      entities: this.entities
    };

    // Keep track of fields that have been auto-applied to handle conflicts
    const autoAppliedFields = new Map<string, { value: any; ruleId: number | null }>();

    for (const rule of this.rules) {
      // Check record type match
      if (rule.record_type !== 'all' && rule.record_type !== recordType) {
        continue;
      }

      // Evaluate condition tree
      const match = this.evaluateCondition(rule.conditions, workingFields, opContext);
      if (!match) continue;

      for (const action of rule.actions) {
        // Resolve target action value
        let resolvedValue: any = action.value;
        let originalValue = workingFields[action.field];
        let suggestedValue: any = null;
        let displayExplanation = action.explanation_template;
        let isAmbiguous = false;
        let suggestionList: any[] | null = null;

        if (action.resolver) {
          const resolverFn = ruleResolvers[action.resolver];
          if (resolverFn) {
            const res = resolverFn({}, action, resContext);
            if (res && typeof res === 'object' && 'canonical_value' in res && 'suggestions' in res) {
              resolvedValue = res.canonical_value;
              suggestionList = res.suggestions;
              isAmbiguous = res.is_ambiguous;
              
              if (suggestionList && suggestionList.length > 0) {
                // If it is clergy tenure with concurrent options, do not auto-apply
                suggestedValue = suggestionList;
                displayExplanation = `Suggested officiant: ${suggestionList[0].canonical_value} (${suggestionList[0].role}). Reason: ${suggestionList[0].reason}`;
              }
            } else {
              resolvedValue = res;
              suggestedValue = res;
            }
          }
        } else {
          suggestedValue = action.value;
        }

        // Check Server-Side Auto-Apply Allowlist conditions:
        let canAutoApply = false;
        
        if (
          action.auto_apply === true &&
          (action.type === 'normalize_value' || action.type === 'suggest_value') &&
          !isAmbiguous
        ) {
          // 1. Resolver must not be surname inference
          const isSurnameResolver = action.resolver === 'father_surname_from_parents' || action.resolver === 'shared_parent_surname';
          // 2. OCR confidence must be high
          const score = optConfidence[action.field];
          const isHighConfidence = score == null || score >= 0.85;

          if (!isSurnameResolver && isHighConfidence && resolvedValue !== null) {
            canAutoApply = true;
          }
        }

        // Handle auto-apply conflict
        let autoApplied = false;
        let decision: RuleOutcome['reviewer_decision'] = 'pending';

        if (canAutoApply) {
          const existingApply = autoAppliedFields.get(action.field);
          if (existingApply) {
            if (existingApply.value !== resolvedValue) {
              // CONFLICT: Multiple rules auto-applying different values.
              // Downgrade to manual review and log conflict.
              console.warn(`[Rules Engine] Auto-apply conflict on field "${action.field}" between rule ${rule.id} and rule ${existingApply.ruleId}. Bypassing auto-apply.`);
              autoApplied = false;
              decision = 'pending';
              displayExplanation = `Conflict: Multiple rules tried to auto-apply different values for ${action.field}. Human review required.`;
            } else {
              // Already auto-applied the same value
              autoApplied = true;
              decision = 'auto_applied';
            }
          } else {
            // Apply mutation
            workingFields[action.field] = resolvedValue;
            autoAppliedFields.set(action.field, { value: resolvedValue, ruleId: rule.id });
            autoApplied = true;
            decision = 'auto_applied';
          }
        }

        const outcome: RuleOutcome = {
          rule_id: rule.id,
          rule_name: rule.name,
          field_path: `fields.${action.field}`,
          target_field: action.field,
          action_type: action.type,
          severity: rule.severity,
          original_value: originalValue ?? null,
          suggested_value: suggestedValue ?? null,
          resolved_value: autoApplied ? resolvedValue : null,
          explanation: displayExplanation,
          auto_applied: autoApplied,
          reviewer_decision: decision,
          created_by_engine_version: '1.0.0'
        };

        outcomes.push(outcome);
      }
    }

    const has_blockers = outcomes.some(o => o.severity === 'blocker' && o.reviewer_decision === 'pending');
    const has_warnings = outcomes.some(o => o.severity === 'warning' || o.severity === 'error');

    return {
      fields: workingFields,
      outcomes,
      has_blockers,
      has_warnings
    };
  }

  /**
   * Helper to write execution results to database for auditing
   */
  static async persistEvaluationLogs(
    churchId: number,
    ocrJobId: number | null,
    draftId: number | null,
    recordIndex: number,
    outcomes: RuleOutcome[]
  ): Promise<void> {
    if (!outcomes.length) return;

    const values: any[] = [];
    const placeholders = outcomes.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())').join(', ');

    for (const o of outcomes) {
      values.push(
        churchId,
        ocrJobId,
        draftId,
        recordIndex,
        o.rule_id,
        o.rule_name,
        o.field_path,
        o.target_field,
        o.action_type,
        o.severity,
        typeof o.original_value === 'object' ? JSON.stringify(o.original_value) : String(o.original_value ?? ''),
        typeof o.suggested_value === 'object' ? JSON.stringify(o.suggested_value) : String(o.suggested_value ?? ''),
        typeof o.resolved_value === 'object' ? JSON.stringify(o.resolved_value) : String(o.resolved_value ?? ''),
        o.confidence_score ?? null,
        o.explanation,
        o.auto_applied ? 1 : 0,
        o.reviewer_decision,
        o.decision_notes ?? null,
        o.decided_by ?? (o.auto_applied ? 'system' : null),
        o.created_by_engine_version ?? '1.0.0'
      );
    }

    await promisePool.query(
      `INSERT INTO ocr_rule_evaluation_logs (
        church_id, ocr_job_id, ocr_draft_id, record_index, rule_id, rule_name,
        field_path, target_field, action_type, severity, original_value,
        suggested_value, resolved_value, confidence_score, explanation,
        auto_applied, reviewer_decision, decision_notes, decided_by,
        created_by_engine_version, created_at
      ) VALUES ${placeholders}`,
      values
    );
  }

  /**
   * Helper to evaluate a structured rule condition group or leaf condition.
   */
  private evaluateCondition(
    cond: RuleConditionGroup | RuleCondition,
    fields: Record<string, any>,
    ctx: OperatorContext
  ): boolean {
    if ('all' in cond && cond.all) {
      for (const sub of cond.all) {
        if (!this.evaluateCondition(sub, fields, ctx)) return false;
      }
      return true;
    }

    if ('any' in cond && cond.any) {
      for (const sub of cond.any) {
        if (this.evaluateCondition(sub, fields, ctx)) return true;
      }
      return false;
    }

    // Leaf condition
    const leaf = cond as RuleCondition;
    const val = fields[leaf.field];
    const operatorFn = ruleOperators[leaf.operator];
    if (!operatorFn) {
      console.warn(`[Rules Engine] Unknown condition operator "${leaf.operator}"`);
      return false;
    }

    return operatorFn(val, leaf.value, ctx);
  }
}
