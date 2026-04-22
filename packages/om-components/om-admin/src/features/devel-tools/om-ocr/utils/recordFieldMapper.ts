/**
 * Record Field Mapper
 * Maps extracted fields to form fields with validation and transformation
 * Ensures labels are never inserted into value fields
 */

import { ExtractedFields, ExtractedField } from './ocrAnchorExtractor';
import { RecordType } from './ocrAnchorExtractor';
import { getRecordSchema, mapFieldKeyToDbColumn } from '@/shared/recordSchemas/registry';

export interface MappedFormField {
  value: string;
  confidence: number;
  reason: string; // Why this value was mapped (for debugging)
}

export interface MappingResult {
  formPatch: Record<string, MappedFormField>;
  mappingConfidence: number; // Overall confidence (0-1)
  perFieldConfidence: Record<string, number>;
  reasons: Record<string, string>; // Per-field reasons
  extracted: ExtractedFields; // Original extracted fields for reference
}

/**
 * Remove label prefixes from a value
 * E.g., "Child: Stepan" -> "Stepan"
 */
function removeLabelPrefix(value: string): string {
  if (!value) return '';
  
  // Remove common label patterns at the start
  const labelPatterns = [
    /^child\s*:\s*/i,
    /^name\s*:\s*/i,
    /^имя\s*:\s*/i,
    /^ребенок\s*:\s*/i,
    /^[a-zа-яё]+\s*:\s*/i, // Generic label: pattern
  ];
  
  let cleaned = value.trim();
  for (const pattern of labelPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  return cleaned.trim();
}

/**
 * Split a full name into first and last name
 * Handles both English and Cyrillic names
 */
function splitName(fullName: string): { firstName: string; lastName: string } {
  if (!fullName) return { firstName: '', lastName: '' };
  
  // Remove label prefixes first
  const cleaned = removeLabelPrefix(fullName);
  
  if (!cleaned) return { firstName: '', lastName: '' };
  
  // Split by whitespace
  const parts = cleaned.trim().split(/\s+/).filter(p => p.length > 0);
  
  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }
  
  if (parts.length === 1) {
    // Single word - assume it's first name
    return { firstName: parts[0], lastName: '' };
  }
  
  // Multiple parts: first is first name, rest is last name
  // For Cyrillic, keep remainder together (last name might be multiple words)
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  
  return { firstName, lastName };
}

/**
 * Parse date from various formats to YYYY-MM-DD
 * Returns empty string if parsing fails
 */
function parseDate(dateStr: string): { date: string; confidence: number } {
  if (!dateStr) return { date: '', confidence: 0 };
  
  const cleaned = removeLabelPrefix(dateStr.trim());
  if (!cleaned) return { date: '', confidence: 0 };
  
  // Try common date formats
  const formats = [
    // MM/DD/YYYY or M/D/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // YYYY-MM-DD
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // Month DD, YYYY (English)
    /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/,
    // DD Month YYYY (English)
    /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/,
  ];
  
  for (const format of formats) {
    const match = cleaned.match(format);
    if (match) {
      let year: number, month: number, day: number;
      
      if (format === formats[0]) {
        // MM/DD/YYYY
        month = parseInt(match[1], 10);
        day = parseInt(match[2], 10);
        year = parseInt(match[3], 10);
      } else if (format === formats[1]) {
        // YYYY-MM-DD
        year = parseInt(match[1], 10);
        month = parseInt(match[2], 10);
        day = parseInt(match[3], 10);
      } else if (format === formats[2]) {
        // Month DD, YYYY
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
          'july', 'august', 'september', 'october', 'november', 'december'];
        const monthName = match[1].toLowerCase();
        month = monthNames.findIndex(m => m.startsWith(monthName)) + 1;
        if (month === 0) continue; // Invalid month
        day = parseInt(match[2], 10);
        year = parseInt(match[3], 10);
      } else if (format === formats[3]) {
        // DD Month YYYY
        day = parseInt(match[1], 10);
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
          'july', 'august', 'september', 'october', 'november', 'december'];
        const monthName = match[2].toLowerCase();
        month = monthNames.findIndex(m => m.startsWith(monthName)) + 1;
        if (month === 0) continue; // Invalid month
        year = parseInt(match[3], 10);
      } else {
        continue;
      }
      
      // Validate date
      if (year >= 1800 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        // Verify it's a valid date
        const date = new Date(dateStr);
        if (!isNaN(date.getTime()) && date.getFullYear() === year) {
          return { date: dateStr, confidence: 0.9 };
        }
      }
    }
  }
  
  // Try JavaScript Date parser as fallback
  const date = new Date(cleaned);
  if (!isNaN(date.getTime()) && date.getFullYear() >= 1800 && date.getFullYear() <= 2100) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return {
      date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      confidence: 0.7, // Lower confidence for fallback
    };
  }
  
  // Failed to parse
  return { date: '', confidence: 0 };
}

/**
 * Split parents field into father and mother
 */
function splitParents(parentsStr: string): { father: string; mother: string } {
  if (!parentsStr) return { father: '', mother: '' };
  
  const cleaned = removeLabelPrefix(parentsStr.trim());
  if (!cleaned) return { father: '', mother: '' };
  
  // Try "and" separator (English)
  if (cleaned.includes(' and ')) {
    const parts = cleaned.split(/\s+and\s+/i);
    if (parts.length === 2) {
      return {
        father: parts[0].trim(),
        mother: parts[1].trim(),
      };
    }
  }
  
  // Try "&" separator
  if (cleaned.includes(' & ')) {
    const parts = cleaned.split(/\s+&\s+/);
    if (parts.length === 2) {
      return {
        father: parts[0].trim(),
        mother: parts[1].trim(),
      };
    }
  }
  
  // Try "и" separator (Russian)
  if (cleaned.includes(' и ')) {
    const parts = cleaned.split(/\s+и\s+/);
    if (parts.length === 2) {
      return {
        father: parts[0].trim(),
        mother: parts[1].trim(),
      };
    }
  }
  
  // If can't split, return as father (common pattern)
  return { father: cleaned, mother: '' };
}

/**
 * Map extracted fields to form fields
 */
export function mapExtractedFieldsToForm(
  extracted: ExtractedFields,
  recordType: RecordType
): MappingResult {
  const formPatch: Record<string, MappedFormField> = {};
  const perFieldConfidence: Record<string, number> = {};
  const reasons: Record<string, string> = {};
  
  // Use canonical schema registry for field mapping
  const schema = getRecordSchema(recordType);
  
  // Build field mapping from extracted fields to canonical schema keys
  const fieldMapping: Record<RecordType, Record<string, string>> = {
    baptism: {
      child_name_raw: 'child_name', // Canonical key (will be split to first_name/last_name in DB)
      birth_date_raw: 'date_of_birth', // Canonical key
      reception_date_raw: 'date_of_baptism', // Canonical key
      baptism_date_raw: 'date_of_baptism', // Alias
      birthplace_raw: 'place_of_birth', // Canonical key
      entry_type_raw: 'entry_type', // Not in schema, will be handled separately
      sponsors_raw: 'godparents', // Canonical key
      parents_raw: 'parents_name', // Canonical key (will be split)
      father_name_raw: 'father_name', // Canonical key
      mother_name_raw: 'mother_name', // Canonical key
      clergy_raw: 'performed_by', // Canonical key
    },
    marriage: {
      groom_name_raw: 'groom_first', // Will be split
      bride_name_raw: 'bride_first', // Will be split
      marriage_date_raw: 'marriage_date',
      witnesses_raw: 'witnesses',
      clergy_raw: 'clergy',
    },
    funeral: {
      deceased_name_raw: 'first_name', // Will be split
      death_date_raw: 'death_date',
      funeral_date_raw: 'funeral_date',
      burial_location_raw: 'burial_location',
      clergy_raw: 'clergy',
    },
  };
  
  const mapping = fieldMapping[recordType] || {};
  
  // Process child_name / deceased_name -> use canonical key (child_name/deceased_name)
  // Note: The splitting to first_name/last_name happens at DB commit time, not here
  // Here we use the canonical schema keys
  if (recordType === 'baptism' && extracted.child_name_raw) {
    // Use canonical key 'child_name' (not 'first_name')
    formPatch.child_name = {
      value: removeLabelPrefix(extracted.child_name_raw.rawValue),
      confidence: extracted.child_name_raw.confidence,
      reason: `Extracted from "${extracted.child_name_raw.matchedAnchor}" anchor`,
    };
    perFieldConfidence.child_name = extracted.child_name_raw.confidence;
    reasons.child_name = `Extracted: "${extracted.child_name_raw.rawValue}"`;
  } else if (recordType === 'funeral' && extracted.deceased_name_raw) {
    // Use canonical key 'deceased_name' (not 'first_name')
    formPatch.deceased_name = {
      value: removeLabelPrefix(extracted.deceased_name_raw.rawValue),
      confidence: extracted.deceased_name_raw.confidence,
      reason: `Extracted from "${extracted.deceased_name_raw.matchedAnchor}" anchor`,
    };
    perFieldConfidence.deceased_name = extracted.deceased_name_raw.confidence;
    reasons.deceased_name = `Extracted: "${extracted.deceased_name_raw.rawValue}"`;
  }
  
  // Process dates - use canonical keys
  if (extracted.birth_date_raw) {
    const { date, confidence } = parseDate(extracted.birth_date_raw.rawValue);
    if (date) {
      formPatch.date_of_birth = { // Canonical key
        value: date,
        confidence: Math.min(confidence, extracted.birth_date_raw.confidence),
        reason: `Parsed from "${extracted.birth_date_raw.matchedAnchor}" anchor`,
      };
      perFieldConfidence.date_of_birth = Math.min(confidence, extracted.birth_date_raw.confidence);
      reasons.date_of_birth = `Parsed "${extracted.birth_date_raw.rawValue}" -> "${date}"`;
    } else {
      reasons.date_of_birth = `Failed to parse date: "${extracted.birth_date_raw.rawValue}"`;
    }
  }
  
  if (extracted.reception_date_raw) {
    const { date, confidence } = parseDate(extracted.reception_date_raw.rawValue);
    if (date) {
      formPatch.date_of_baptism = { // Canonical key
        value: date,
        confidence: Math.min(confidence, extracted.reception_date_raw.confidence),
        reason: `Parsed from "${extracted.reception_date_raw.matchedAnchor}" anchor`,
      };
      perFieldConfidence.date_of_baptism = Math.min(confidence, extracted.reception_date_raw.confidence);
      reasons.date_of_baptism = `Parsed "${extracted.reception_date_raw.rawValue}" -> "${date}"`;
    }
  }
  
  if (extracted.baptism_date_raw && !formPatch.date_of_baptism) {
    const { date, confidence } = parseDate(extracted.baptism_date_raw.rawValue);
    if (date) {
      formPatch.date_of_baptism = { // Canonical key
        value: date,
        confidence: Math.min(confidence, extracted.baptism_date_raw.confidence),
        reason: `Parsed from "${extracted.baptism_date_raw.matchedAnchor}" anchor`,
      };
      perFieldConfidence.date_of_baptism = Math.min(confidence, extracted.baptism_date_raw.confidence);
    }
  }
  
  // Process parents
  if (extracted.parents_raw) {
    const { father, mother } = splitParents(extracted.parents_raw.rawValue);
    if (father) {
      formPatch.father_name = {
        value: removeLabelPrefix(father),
        confidence: extracted.parents_raw.confidence * 0.9,
        reason: `Split from parents field`,
      };
      perFieldConfidence.father_name = extracted.parents_raw.confidence * 0.9;
    }
    if (mother) {
      formPatch.mother_name = {
        value: removeLabelPrefix(mother),
        confidence: extracted.parents_raw.confidence * 0.9,
        reason: `Split from parents field`,
      };
      perFieldConfidence.mother_name = extracted.parents_raw.confidence * 0.9;
    }
  }
  
  // Process individual parent fields (override if parents_raw exists)
  if (extracted.father_name_raw) {
    formPatch.father_name = {
      value: removeLabelPrefix(extracted.father_name_raw.rawValue),
      confidence: extracted.father_name_raw.confidence,
      reason: `Extracted from "${extracted.father_name_raw.matchedAnchor}" anchor`,
    };
    perFieldConfidence.father_name = extracted.father_name_raw.confidence;
  }
  
  if (extracted.mother_name_raw) {
    formPatch.mother_name = {
      value: removeLabelPrefix(extracted.mother_name_raw.rawValue),
      confidence: extracted.mother_name_raw.confidence,
      reason: `Extracted from "${extracted.mother_name_raw.matchedAnchor}" anchor`,
    };
    perFieldConfidence.mother_name = extracted.mother_name_raw.confidence;
  }
  
  // Process other simple fields (remove label prefixes) - use canonical keys
  const simpleFieldMappings: Array<{ extractedKey: keyof ExtractedFields; canonicalKey: string }> = [
    { extractedKey: 'birthplace_raw', canonicalKey: 'place_of_birth' },
    { extractedKey: 'sponsors_raw', canonicalKey: 'godparents' },
    { extractedKey: 'clergy_raw', canonicalKey: 'performed_by' },
  ];
  
  for (const { extractedKey, canonicalKey } of simpleFieldMappings) {
    const extractedField = extracted[extractedKey] as ExtractedField | undefined;
    if (extractedField) {
      const cleanedValue = removeLabelPrefix(extractedField.rawValue);
      if (cleanedValue) {
        formPatch[canonicalKey] = {
          value: cleanedValue,
          confidence: extractedField.confidence,
          reason: `Extracted from "${extractedField.matchedAnchor}" anchor`,
        };
        perFieldConfidence[canonicalKey] = extractedField.confidence;
        reasons[canonicalKey] = `Cleaned "${extractedField.rawValue}" -> "${cleanedValue}"`;
      }
    }
  }
  
  // Calculate overall mapping confidence
  const confidences = Object.values(perFieldConfidence);
  const mappingConfidence = confidences.length > 0
    ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
    : 0;
  
  return {
    formPatch,
    mappingConfidence,
    perFieldConfidence,
    reasons,
    extracted,
  };
}

