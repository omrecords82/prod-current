import { resolvePrimaryEventDate } from './dateResolvers';
import { formatDbDate } from '../../../routes/ocr/helpers';

export interface OperatorContext {
  churchId: number;
  recordType: string;
  fields: Record<string, any>;
  confidenceMetadata?: Record<string, number>;
  entities: any[]; // Preloaded configuration entities
}

/**
 * Registry of safe operators.
 */
export const ruleOperators = {
  is_empty: (val: any): boolean => {
    return val == null || String(val).trim() === '';
  },

  is_not_empty: (val: any): boolean => {
    return val != null && String(val).trim() !== '';
  },

  equals: (val: any, condVal: any): boolean => {
    if (val == null || condVal == null) return val === condVal;
    return String(val).trim().toLowerCase() === String(condVal).trim().toLowerCase();
  },

  not_equals: (val: any, condVal: any): boolean => {
    if (val == null || condVal == null) return val !== condVal;
    return String(val).trim().toLowerCase() !== String(condVal).trim().toLowerCase();
  },

  contains: (val: any, condVal: any): boolean => {
    if (val == null || condVal == null) return false;
    return String(val).toLowerCase().includes(String(condVal).toLowerCase());
  },

  regex_matches: (val: any, condVal: any): boolean => {
    if (val == null || !condVal) return false;
    try {
      const re = new RegExp(condVal, 'i');
      return re.test(String(val));
    } catch {
      return false;
    }
  },

  is_before_field: (val: any, condVal: any, ctx: OperatorContext): boolean => {
    const targetVal = ctx.fields[condVal];
    const d1 = formatDbDate(val);
    const d2 = formatDbDate(targetVal);
    if (!d1 || !d2) return false;
    return new Date(d1).getTime() < new Date(d2).getTime();
  },

  is_after_field: (val: any, condVal: any, ctx: OperatorContext): boolean => {
    const targetVal = ctx.fields[condVal];
    const d1 = formatDbDate(val);
    const d2 = formatDbDate(targetVal);
    if (!d1 || !d2) return false;
    return new Date(d1).getTime() > new Date(d2).getTime();
  },

  is_same_or_after_field: (val: any, condVal: any, ctx: OperatorContext): boolean => {
    const targetVal = ctx.fields[condVal];
    const d1 = formatDbDate(val);
    const d2 = formatDbDate(targetVal);
    if (!d1 || !d2) return false;
    return new Date(d1).getTime() >= new Date(d2).getTime();
  },

  is_same_or_before_field: (val: any, condVal: any, ctx: OperatorContext): boolean => {
    const targetVal = ctx.fields[condVal];
    const d1 = formatDbDate(val);
    const d2 = formatDbDate(targetVal);
    if (!d1 || !d2) return false;
    return new Date(d1).getTime() <= new Date(d2).getTime();
  },

  matches_entity_variant: (val: any, condVal: any, ctx: OperatorContext): boolean => {
    if (val == null) return false;
    const searchVal = String(val).trim().toLowerCase();
    const entityType = condVal?.entity_type;
    
    // Filter entities by type
    const typedEntities = ctx.entities.filter(e => e.entity_type === entityType);
    
    for (const ent of typedEntities) {
      if (ent.canonical_value.toLowerCase() === searchVal) return true;
      let variants: string[] = [];
      try {
        variants = typeof ent.variants_json === 'string' 
          ? JSON.parse(ent.variants_json) 
          : (Array.isArray(ent.variants_json) ? ent.variants_json : []);
      } catch (_) {}
      
      if (variants.some(v => String(v).trim().toLowerCase() === searchVal)) {
        return true;
      }
    }
    return false;
  },

  within_entity_tenure: (val: any, condVal: any, ctx: OperatorContext): boolean => {
    // Check if the record event date is within matched clergy tenure
    const eventDateStr = resolvePrimaryEventDate(ctx.recordType, ctx.fields);
    if (!eventDateStr) return false;
    const eventTime = new Date(eventDateStr).getTime();

    const clergyVal = String(ctx.fields['clergy'] || ctx.fields['officiant'] || '').trim().toLowerCase();
    if (!clergyVal) return false;

    // Find the clergy entity matching this field value
    const clergyEntities = ctx.entities.filter(e => e.entity_type === 'clergy');
    for (const ent of clergyEntities) {
      let isMatch = ent.canonical_value.toLowerCase() === clergyVal;
      if (!isMatch) {
        let variants: string[] = [];
        try {
          variants = typeof ent.variants_json === 'string' 
            ? JSON.parse(ent.variants_json) 
            : (Array.isArray(ent.variants_json) ? ent.variants_json : []);
        } catch (_) {}
        isMatch = variants.some(v => String(v).trim().toLowerCase() === clergyVal);
      }

      if (isMatch) {
        // Check tenure dates
        const fromTime = ent.active_from ? new Date(ent.active_from).getTime() : -Infinity;
        const toTime = ent.active_to ? new Date(ent.active_to).getTime() : Infinity;
        if (eventTime >= fromTime && eventTime <= toTime) {
          return true;
        }
      }
    }
    return false;
  },

  has_father_surname: (val: any, condVal: any, ctx: OperatorContext): boolean => {
    // val is usually the parents string
    const parents = String(val || '').trim();
    if (!parents) return false;
    
    // Check if we can parse a father's surname. 
    // Examples: "George and Anna Robinson" -> Robinson, "George Robinson and Anna Grabania" -> Robinson
    const parts = parents.split(/(?:and|\&)/i);
    if (parts.length >= 2) {
      const fatherPart = parts[0].trim();
      const fatherWords = fatherPart.split(/\s+/);
      if (fatherWords.length >= 2) return true; // Has a surname explicitly listed for father
      
      const motherPart = parts[1].trim();
      const motherWords = motherPart.split(/\s+/);
      if (motherWords.length >= 2) return true; // Shared last name at the end
    }
    return false;
  },

  has_shared_parent_surname: (val: any, condVal: any, ctx: OperatorContext): boolean => {
    const parents = String(val || '').trim();
    if (!parents) return false;
    
    // Matches "George and Anna Robinson"
    const match = parents.match(/^([^\s,]+)\s+(?:and|\&)\s+([^\s,]+)\s+([^\s,]+)$/i);
    if (match) {
      // First is father first name, second is mother first name, third is shared surname
      return true;
    }
    return false;
  },

  has_low_confidence: (val: any, condVal: any, ctx: OperatorContext): boolean => {
    if (!ctx.confidenceMetadata) return false;
    // Get target field name (the key being evaluated)
    const fieldName = condVal || '';
    const score = ctx.confidenceMetadata[fieldName];
    if (score == null) return false;
    return score < 0.85;
  },

  date_exists: (val: any): boolean => {
    return formatDbDate(val) != null;
  },

  date_missing: (val: any): boolean => {
    return formatDbDate(val) == null;
  }
};
