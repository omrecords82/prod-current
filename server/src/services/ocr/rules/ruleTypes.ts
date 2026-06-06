export type RecordType = 'baptism' | 'marriage' | 'funeral' | 'chrismation' | 'all';

export type RuleSeverity = 'info' | 'suggestion' | 'warning' | 'error' | 'blocker';

export type ActionType =
  | 'suggest_value'
  | 'normalize_value'
  | 'flag_warning'
  | 'flag_error'
  | 'block_record_completion'
  | 'require_manual_review'
  | 'attach_explanation';

export type OperatorType =
  | 'is_empty'
  | 'is_not_empty'
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'regex_matches'
  | 'is_before_field'
  | 'is_after_field'
  | 'is_same_or_after_field'
  | 'is_same_or_before_field'
  | 'matches_entity_variant'
  | 'within_entity_tenure'
  | 'has_father_surname'
  | 'has_shared_parent_surname'
  | 'has_low_confidence'
  | 'date_exists'
  | 'date_missing';

export type ResolverType =
  | 'literal_value'
  | 'canonical_entity_value'
  | 'father_surname_from_parents'
  | 'shared_parent_surname'
  | 'best_matching_clergy_by_tenure_and_variant'
  | 'normalized_date_value'
  | 'existing_field_value';

export interface RuleCondition {
  field: string;
  operator: OperatorType;
  value?: any;
}

export interface RuleConditionGroup {
  all?: Array<RuleCondition | RuleConditionGroup>;
  any?: Array<RuleCondition | RuleConditionGroup>;
}

export interface RuleAction {
  type: ActionType;
  field: string;
  resolver?: ResolverType;
  resolver_args?: Record<string, any>;
  value?: any;
  auto_apply?: boolean;
  explanation_template: string;
}

export interface Rule {
  id: number | null;
  church_id: number | null;
  scope: 'global' | 'church';
  name: string;
  description: string | null;
  record_type: RecordType;
  conditions: RuleConditionGroup | RuleCondition;
  actions: RuleAction[];
  severity: RuleSeverity;
  is_active: boolean;
  priority: number;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RuleOutcome {
  rule_id: number | null;
  rule_name: string;
  field_path: string | null;
  target_field: string;
  action_type: ActionType;
  severity: RuleSeverity;
  original_value: any;
  suggested_value: any;
  resolved_value: any;
  confidence_score?: number | null;
  explanation: string;
  auto_applied: boolean;
  reviewer_decision: 'pending' | 'accepted' | 'rejected' | 'overridden' | 'auto_applied' | 'corrected_by_user';
  decision_notes?: string | null;
  decided_by?: string | null;
  decided_at?: string | null;
  overridden_by_rule_id?: number | null;
  created_by_engine_version?: string;
}

export interface RuleEvaluationResult {
  fields: Record<string, any>;
  outcomes: RuleOutcome[];
}

export interface ParishConfigurationEntity {
  id: number;
  church_id: number;
  entity_type: 'clergy' | 'location' | 'spelling_variant' | 'family_name_rule';
  canonical_value: string;
  display_label: string | null;
  role: string | null;
  active_from: string | null; // ISO Date YYYY-MM-DD
  active_to: string | null;   // ISO Date YYYY-MM-DD
  confidence_level: number | null;
  source_label: string | null;
  source_notes: string | null;
  metadata_json: string | null;
  variants_json: string | null; // Array of spelling variants
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
