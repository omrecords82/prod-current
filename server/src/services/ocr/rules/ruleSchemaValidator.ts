import { OperatorType, ResolverType, ActionType, RecordType, RuleSeverity } from './ruleTypes';

const ALLOWED_OPERATORS: Set<OperatorType> = new Set([
  'is_empty',
  'is_not_empty',
  'equals',
  'not_equals',
  'contains',
  'regex_matches',
  'is_before_field',
  'is_after_field',
  'is_same_or_after_field',
  'is_same_or_before_field',
  'matches_entity_variant',
  'within_entity_tenure',
  'has_father_surname',
  'has_shared_parent_surname',
  'has_low_confidence',
  'date_exists',
  'date_missing'
]);

const ALLOWED_RESOLVERS: Set<ResolverType> = new Set([
  'literal_value',
  'canonical_entity_value',
  'father_surname_from_parents',
  'shared_parent_surname',
  'best_matching_clergy_by_tenure_and_variant',
  'normalized_date_value',
  'existing_field_value'
]);

const ALLOWED_ACTIONS: Set<ActionType> = new Set([
  'suggest_value',
  'normalize_value',
  'flag_warning',
  'flag_error',
  'block_record_completion',
  'require_manual_review',
  'attach_explanation'
]);

const ALLOWED_RECORD_TYPES: Set<RecordType> = new Set([
  'baptism',
  'marriage',
  'funeral',
  'chrismation',
  'all'
]);

const ALLOWED_SEVERITIES: Set<RuleSeverity> = new Set([
  'info',
  'suggestion',
  'warning',
  'error',
  'blocker'
]);

const VALID_FIELD_NAMES: Record<string, Set<string>> = {
  baptism: new Set([
    'first_name',
    'last_name',
    'birth_date',
    'reception_date',
    'birthplace',
    'parents',
    'sponsors',
    'clergy',
    'notes'
  ]),
  marriage: new Set([
    'mdate',
    'fname_groom',
    'lname_groom',
    'parentsg',
    'fname_bride',
    'lname_bride',
    'parentsb',
    'witness',
    'mlicense',
    'clergy',
    'notes'
  ]),
  funeral: new Set([
    'name',
    'lastname',
    'deceased_date',
    'burial_date',
    'age',
    'clergy',
    'burial_location',
    'notes'
  ]),
  chrismation: new Set([
    'first_name',
    'last_name',
    'birth_date',
    'reception_date',
    'birthplace',
    'parents',
    'sponsors',
    'clergy',
    'notes'
  ]),
  all: new Set([
    // Union of all fields to support generic matches
    'first_name', 'last_name', 'birth_date', 'reception_date', 'birthplace', 'parents', 'sponsors', 'clergy', 'notes',
    'mdate', 'fname_groom', 'lname_groom', 'parentsg', 'fname_bride', 'lname_bride', 'parentsb', 'witness', 'mlicense',
    'name', 'lastname', 'deceased_date', 'burial_date', 'age', 'burial_location'
  ])
};

/**
 * Validates a single condition object.
 */
function validateCondition(cond: any, recordType: RecordType) {
  if (!cond || typeof cond !== 'object') {
    throw new Error('Condition must be a non-null object');
  }

  // Handle grouping
  if ('all' in cond) {
    if (!Array.isArray(cond.all)) throw new Error('"all" condition group must be an array');
    for (const sub of cond.all) validateCondition(sub, recordType);
    return;
  }
  if ('any' in cond) {
    if (!Array.isArray(cond.any)) throw new Error('"any" condition group must be an array');
    for (const sub of cond.any) validateCondition(sub, recordType);
    return;
  }

  // Validate single rule condition
  const { field, operator, value } = cond;
  if (!field || typeof field !== 'string') {
    throw new Error('Condition is missing a valid "field" string');
  }

  const allowedFields = VALID_FIELD_NAMES[recordType];
  if (allowedFields && !allowedFields.has(field)) {
    throw new Error(`Invalid condition field name "${field}" for record type "${recordType}"`);
  }

  if (!operator || typeof operator !== 'string') {
    throw new Error('Condition is missing a valid "operator" string');
  }

  if (!ALLOWED_OPERATORS.has(operator as OperatorType)) {
    throw new Error(`Unknown condition operator "${operator}"`);
  }

  // If comparing with another field, check that field
  if (
    (operator === 'is_before_field' ||
      operator === 'is_after_field' ||
      operator === 'is_same_or_after_field' ||
      operator === 'is_same_or_before_field') &&
    typeof value === 'string'
  ) {
    if (allowedFields && !allowedFields.has(value)) {
      throw new Error(`Comparison field "${value}" is invalid for record type "${recordType}"`);
    }
  }
}

/**
 * Validates a single action object.
 */
function validateAction(action: any, recordType: RecordType) {
  if (!action || typeof action !== 'object') {
    throw new Error('Action must be a non-null object');
  }

  const { type, field, resolver, auto_apply, explanation_template } = action;

  if (!type || typeof type !== 'string' || !ALLOWED_ACTIONS.has(type as ActionType)) {
    throw new Error(`Invalid action "type": "${type}"`);
  }

  if (!field || typeof field !== 'string') {
    throw new Error('Action is missing a valid "field" string');
  }

  const allowedFields = VALID_FIELD_NAMES[recordType];
  if (allowedFields && !allowedFields.has(field)) {
    throw new Error(`Invalid action field name "${field}" for record type "${recordType}"`);
  }

  if (resolver && !ALLOWED_RESOLVERS.has(resolver as ResolverType)) {
    throw new Error(`Unknown action resolver "${resolver}"`);
  }

  if (auto_apply === true) {
    // Enforce action-level auto-apply validation criteria
    if (type !== 'normalize_value' && type !== 'suggest_value') {
      throw new Error(`Auto-apply is only allowed for "normalize_value" or "suggest_value" actions`);
    }
    // Cannot auto-apply complex name inferences
    if (resolver === 'father_surname_from_parents' || resolver === 'shared_parent_surname') {
      throw new Error(`Surname inference actions cannot be automatically applied`);
    }
  }

  if (!explanation_template || typeof explanation_template !== 'string') {
    throw new Error('Action must specify an "explanation_template" string');
  }
}

/**
 * Validates a rule structure completely. Throws if invalid.
 */
export function validateRuleSchema(rule: any): void {
  if (!rule || typeof rule !== 'object') {
    throw new Error('Rule must be a non-null object');
  }

  const { name, record_type, conditions, actions, severity, is_active, priority } = rule;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('Rule must have a valid non-empty "name"');
  }

  if (!record_type || typeof record_type !== 'string' || !ALLOWED_RECORD_TYPES.has(record_type as RecordType)) {
    throw new Error(`Invalid record type "${record_type}"`);
  }

  if (!severity || typeof severity !== 'string' || !ALLOWED_SEVERITIES.has(severity as RuleSeverity)) {
    throw new Error(`Invalid severity value "${severity}"`);
  }

  if (priority != null && (typeof priority !== 'number' || priority < 0)) {
    throw new Error('Priority must be a positive number');
  }

  if (!conditions) {
    throw new Error('Rule is missing "conditions" object');
  }
  validateCondition(conditions, record_type as RecordType);

  if (!Array.isArray(actions) || actions.length === 0) {
    throw new Error('Rule must specify one or more "actions" as an array');
  }

  for (const action of actions) {
    validateAction(action, record_type as RecordType);
  }
}
