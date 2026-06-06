import { formatDbDate } from '../../../routes/ocr/helpers';
import { resolvePrimaryEventDate } from './dateResolvers';

export interface ResolverContext {
  churchId: number;
  recordType: string;
  fields: Record<string, any>;
  entities: any[];
}

/**
 * Parses the parents string to extract the father's surname.
 * Handles both:
 * - Explicit father surname: "George Smith and Anna Grabania" -> "Smith"
 * - Shared parent surname: "George and Anna Robinson" -> "Robinson"
 */
export function extractFatherSurname(parentsStr: string): string | null {
  const p = String(parentsStr || '').trim();
  if (!p) return null;

  // Split by "and" or "&"
  const parts = p.split(/\s+(?:and|\&)\s+/i);
  if (parts.length < 2) {
    // If not split, maybe last word of parent string is a surname
    const words = p.split(/\s+/);
    return words.length >= 2 ? words[words.length - 1] : null;
  }

  const part1 = parts[0].trim().split(/\s+/);
  const part2 = parts[1].trim().split(/\s+/);

  if (part1.length >= 2) {
    // Explicit surname: e.g. ["George", "Smith"]
    return part1[part1.length - 1];
  }
  
  if (part2.length >= 2) {
    // Shared surname: e.g. part1=["George"], part2=["Anna", "Robinson"]
    return part2[part2.length - 1];
  }

  return null;
}

/**
 * Extracts a shared parent surname from the parents string if present.
 * Matches: "George and Anna Robinson" -> "Robinson"
 * Returns null if they have distinct surnames listed: "George Smith and Anna Grabania"
 */
export function extractSharedParentSurname(parentsStr: string): string | null {
  const p = String(parentsStr || '').trim();
  if (!p) return null;

  const parts = p.split(/\s+(?:and|\&)\s+/i);
  if (parts.length < 2) return null;

  const part1 = parts[0].trim().split(/\s+/);
  const part2 = parts[1].trim().split(/\s+/);

  // If first parent has no surname, and second parent has a surname, it's shared
  if (part1.length === 1 && part2.length >= 2) {
    return part2[part2.length - 1];
  }

  return null;
}

/**
 * Registry of safe action value resolvers.
 */
export const ruleResolvers = {
  literal_value: (args: any, action: any): any => {
    return action.value;
  },

  existing_field_value: (args: any, action: any, ctx: ResolverContext): any => {
    const sourceField = action.resolver_args?.source_field;
    return sourceField ? ctx.fields[sourceField] : null;
  },

  normalized_date_value: (args: any, action: any, ctx: ResolverContext): any => {
    const val = ctx.fields[action.field];
    return formatDbDate(val);
  },

  father_surname_from_parents: (args: any, action: any, ctx: ResolverContext): any => {
    const sourceField = action.resolver_args?.source_field || 'parents';
    const parentsVal = ctx.fields[sourceField];
    return extractFatherSurname(parentsVal);
  },

  shared_parent_surname: (args: any, action: any, ctx: ResolverContext): any => {
    const sourceField = action.resolver_args?.source_field || 'parents';
    const parentsVal = ctx.fields[sourceField];
    return extractSharedParentSurname(parentsVal);
  },

  canonical_entity_value: (args: any, action: any, ctx: ResolverContext): any => {
    const entityType = action.resolver_args?.entity_type;
    const matchField = action.resolver_args?.match_field || action.field;
    const searchVal = String(ctx.fields[matchField] || '').trim().toLowerCase();
    if (!searchVal) return null;

    const matched = ctx.entities.find(e => {
      if (e.entity_type !== entityType) return false;
      if (e.canonical_value.toLowerCase() === searchVal) return true;
      let variants: string[] = [];
      try {
        variants = typeof e.variants_json === 'string' 
          ? JSON.parse(e.variants_json) 
          : (Array.isArray(e.variants_json) ? e.variants_json : []);
      } catch (_) {}
      return variants.some(v => String(v).trim().toLowerCase() === searchVal);
    });

    return matched ? matched.canonical_value : null;
  },

  best_matching_clergy_by_tenure_and_variant: (args: any, action: any, ctx: ResolverContext): any => {
    const clergyVal = String(ctx.fields[action.field] || '').trim();
    const eventDateStr = resolvePrimaryEventDate(ctx.recordType, ctx.fields);
    
    const clergyEntities = ctx.entities.filter(e => e.entity_type === 'clergy');
    const matchedClergy: any[] = [];

    const eventTime = eventDateStr ? new Date(eventDateStr).getTime() : null;

    for (const ent of clergyEntities) {
      let isNameMatch = false;
      let matchType: 'canonical' | 'variant' | 'date_only' = 'date_only';

      if (clergyVal) {
        const searchVal = clergyVal.toLowerCase();
        if (ent.canonical_value.toLowerCase() === searchVal) {
          isNameMatch = true;
          matchType = 'canonical';
        } else {
          let variants: string[] = [];
          try {
            variants = typeof ent.variants_json === 'string' 
              ? JSON.parse(ent.variants_json) 
              : (Array.isArray(ent.variants_json) ? ent.variants_json : []);
          } catch (_) {}
          if (variants.some(v => String(v).trim().toLowerCase() === searchVal)) {
            isNameMatch = true;
            matchType = 'variant';
          }
        }
      }

      let isDateMatch = false;
      if (eventTime) {
        const fromTime = ent.active_from ? new Date(ent.active_from).getTime() : -Infinity;
        const toTime = ent.active_to ? new Date(ent.active_to).getTime() : Infinity;
        if (eventTime >= fromTime && eventTime <= toTime) {
          isDateMatch = true;
        }
      }

      // We collect a candidate if:
      // 1. It is a name match (with or without date verification)
      // 2. Or it is a date match (if officiant field is empty)
      if (isNameMatch || (!clergyVal && isDateMatch)) {
        // Calculate a score for ranking:
        // - Exact canonical match: 100
        // - Variant match: 90
        // - Plus date match: +50
        // - Plus role priority (Rector=30, Priest=20, Deacon=10)
        // - Plus tenure specificity (shorter tenure is more specific: +10 max)
        let score = 0;
        if (matchType === 'canonical') score += 100;
        else if (matchType === 'variant') score += 90;

        if (isDateMatch) score += 50;

        const role = String(ent.role || '').toLowerCase();
        if (role.includes('rector')) score += 30;
        else if (role.includes('priest')) score += 20;
        else if (role.includes('deacon')) score += 10;

        if (ent.active_from && ent.active_to) {
          const tenureDays = (new Date(ent.active_to).getTime() - new Date(ent.active_from).getTime()) / (1000 * 60 * 60 * 24);
          if (tenureDays > 0) {
            // shorter tenure gets slightly higher score (capped specificity)
            score += Math.max(0, Math.min(10, 10 - (tenureDays / 365)));
          }
        }

        matchedClergy.push({
          entity: ent,
          score,
          match_type: matchType,
          is_date_match: isDateMatch
        });
      }
    }

    // Sort by score descending
    matchedClergy.sort((a, b) => b.score - a.score);

    if (matchedClergy.length === 0) {
      return null;
    }

    const results = matchedClergy.map(m => {
      const ent = m.entity;
      const tenureStr = ent.active_from && ent.active_to
        ? `served ${ent.active_from} to ${ent.active_to}`
        : (ent.active_from ? `served starting ${ent.active_from}` : 'active tenure');

      const reason = m.match_type !== 'date_only'
        ? `Name matches variation and ${m.is_date_match ? 'date matches active service period' : 'tenure checks skipped'}`
        : `Clergy served during record event date (${eventDateStr})`;

      return {
        canonical_value: ent.canonical_value,
        role: ent.role || 'Clergy',
        tenure: tenureStr,
        reason,
        match_strength: m.score >= 140 ? 'strong' : (m.score >= 90 ? 'medium' : 'weak'),
        score: m.score
      };
    });

    return {
      canonical_value: results[0].canonical_value,
      suggestions: results,
      is_ambiguous: results.length > 1 && results[0].score === results[1].score
    };
  }
};
