/**
 * OCR Schema Resolver
 * Single source of truth for determining record type and mapping schema
 * from job metadata (layoutId, recordType, templateId).
 */

export type ResolvedRecordType = 'baptism' | 'marriage' | 'funeral' | 'unknown';
export type MappingSchemaKey = 'baptism_record_v1' | 'marriage_record_v1' | 'funeral_record_v1';

export interface ResolveInput {
  recordType?: string | null;
  layoutId?: string | null;
  templateId?: string | null;
}

export interface ResolveResult {
  recordType: ResolvedRecordType;
  source: 'layout' | 'explicit' | 'template' | 'none';
  conflict: boolean;
  conflictMessage?: string;
}

function inferFromLayoutId(layoutId: string): ResolvedRecordType | null {
  const lower = layoutId.toLowerCase();
  if (lower.startsWith('marriage') || lower.includes('marriage')) return 'marriage';
  if (lower.startsWith('baptism') || lower.includes('baptism')) return 'baptism';
  if (lower.startsWith('funeral') || lower.includes('funeral')) return 'funeral';
  return null;
}

function normalizeRecordType(rt: string): ResolvedRecordType {
  const lower = rt.toLowerCase().trim();
  if (lower === 'baptism') return 'baptism';
  if (lower === 'marriage') return 'marriage';
  if (lower === 'funeral') return 'funeral';
  return 'unknown';
}

export function resolveRecordType(input: ResolveInput): ResolveResult {
  const { recordType, layoutId, templateId } = input;

  const layoutInferred = layoutId ? inferFromLayoutId(layoutId) : null;
  const explicit = recordType ? normalizeRecordType(recordType) : null;

  // Layout takes precedence for conflict detection
  if (layoutInferred && explicit && explicit !== 'unknown' && layoutInferred !== explicit) {
    return {
      recordType: layoutInferred,
      source: 'layout',
      conflict: true,
      conflictMessage: `Layout "${layoutId}" suggests ${layoutInferred}, but job record_type is "${recordType}". Using layout-derived type.`,
    };
  }

  if (layoutInferred) {
    return { recordType: layoutInferred, source: 'layout', conflict: false };
  }

  if (explicit && explicit !== 'unknown') {
    return { recordType: explicit, source: 'explicit', conflict: false };
  }

  // Template-based inference (future use)
  if (templateId) {
    const lower = templateId.toLowerCase();
    if (lower.includes('marriage')) return { recordType: 'marriage', source: 'template', conflict: false };
    if (lower.includes('baptism')) return { recordType: 'baptism', source: 'template', conflict: false };
    if (lower.includes('funeral')) return { recordType: 'funeral', source: 'template', conflict: false };
  }

  return { recordType: 'unknown', source: 'none', conflict: false };
}

export function resolveMappingSchemaKey(recordType: ResolvedRecordType): MappingSchemaKey | null {
  switch (recordType) {
    case 'baptism': return 'baptism_record_v1';
    case 'marriage': return 'marriage_record_v1';
    case 'funeral': return 'funeral_record_v1';
    default: return null;
  }
}

export function recordTypeLabel(recordType: ResolvedRecordType): string {
  switch (recordType) {
    case 'baptism': return 'Baptism';
    case 'marriage': return 'Marriage';
    case 'funeral': return 'Funeral';
    default: return 'Unknown';
  }
}
