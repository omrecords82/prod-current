import { Rule } from './ruleTypes';

/**
 * Built-in platform global fallback rules.
 * Handled if no parish-specific overrides exist.
 */
export const defaultRules: Rule[] = [
  {
    id: -1,
    church_id: null,
    scope: 'global',
    name: 'Baptism Date preceding Birth Date check',
    description: 'Ensures the baptism/reception date is not before the birth date.',
    record_type: 'baptism',
    conditions: {
      all: [
        {
          field: 'reception_date',
          operator: 'is_before_field',
          value: 'birth_date'
        }
      ]
    },
    actions: [
      {
        type: 'block_record_completion',
        field: 'reception_date',
        explanation_template: 'Baptism/reception date cannot occur before the birth date.'
      }
    ],
    severity: 'blocker',
    is_active: true,
    priority: 10
  },
  {
    id: -2,
    church_id: null,
    scope: 'global',
    name: 'Funeral Date preceding Death Date check',
    description: 'Ensures the funeral/burial date is not before the death date.',
    record_type: 'funeral',
    conditions: {
      all: [
        {
          field: 'burial_date',
          operator: 'is_before_field',
          value: 'deceased_date'
        }
      ]
    },
    actions: [
      {
        type: 'block_record_completion',
        field: 'burial_date',
        explanation_template: 'Funeral or burial date cannot occur before the death date.'
      }
    ],
    severity: 'blocker',
    is_active: true,
    priority: 10
  },
  {
    id: -3,
    church_id: null,
    scope: 'global',
    name: 'Infer Child Surname from Father',
    description: 'Suggests child surname from the father\'s surname listed in the parents field.',
    record_type: 'baptism',
    conditions: {
      all: [
        {
          field: 'last_name',
          operator: 'is_empty'
        },
        {
          field: 'parents',
          operator: 'has_father_surname'
        }
      ]
    },
    actions: [
      {
        type: 'suggest_value',
        field: 'last_name',
        resolver: 'father_surname_from_parents',
        resolver_args: {
          source_field: 'parents'
        },
        auto_apply: false,
        explanation_template: 'Suggested child surname from the father\'s surname listed in the parents field.'
      }
    ],
    severity: 'suggestion',
    is_active: true,
    priority: 20
  },
  {
    id: -4,
    church_id: null,
    scope: 'global',
    name: 'Infer Child Surname from Shared Parent Surname',
    description: 'Suggests child surname because both parents appear to share the same surname.',
    record_type: 'baptism',
    conditions: {
      all: [
        {
          field: 'last_name',
          operator: 'is_empty'
        },
        {
          field: 'parents',
          operator: 'has_shared_parent_surname'
        }
      ]
    },
    actions: [
      {
        type: 'suggest_value',
        field: 'last_name',
        resolver: 'shared_parent_surname',
        resolver_args: {
          source_field: 'parents'
        },
        auto_apply: false,
        explanation_template: 'Suggested child surname because both parents appear to share the same surname.'
      }
    ],
    severity: 'suggestion',
    is_active: true,
    priority: 25
  },
  {
    id: -5,
    church_id: null,
    scope: 'global',
    name: 'Suggest Clergy from Tenure and Variants',
    description: 'Suggests or normalizes canonical clergy name based on event date and configured variants.',
    record_type: 'all',
    conditions: {
      any: [
        {
          field: 'clergy',
          operator: 'is_empty'
        },
        {
          field: 'clergy',
          operator: 'matches_entity_variant',
          value: {
            entity_type: 'clergy'
          }
        }
      ]
    },
    actions: [
      {
        type: 'suggest_value',
        field: 'clergy',
        resolver: 'best_matching_clergy_by_tenure_and_variant',
        auto_apply: false,
        explanation_template: 'Suggested officiant based on record event date and clergy active service periods.'
      }
    ],
    severity: 'suggestion',
    is_active: true,
    priority: 30
  }
];
