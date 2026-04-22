/**
 * Label Anchoring (Fuzzy Matching) and Value Extraction (Field Mapping)
 * Detects labels in OCR entries and extracts field values
 */

import type {
  BBox,
  FusionEntry,
  FusionToken,
  DetectedLabel,
} from '../types/fusion';
import { LABEL_DICTIONARIES } from '../types/fusion';
import {
  bboxesOverlap,
  isInSameYBand,
  isToRightOf,
  isBelow,
  mergeBBoxes,
} from './bboxUtils';
import { getRecordSchema, validateFieldKeys } from '@/shared/recordSchemas/registry';
import { getDefaultColumns } from '../config/defaultRecordColumns';

// ============================================================================
// Label Anchoring (Fuzzy Matching)
// ============================================================================

/**
 * Normalize text for fuzzy matching
 */
export function normalizeText(text: string): string {
  return text
    .toUpperCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Simple Levenshtein distance for fuzzy matching
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score (0-1) between two strings
 */
export function similarity(a: string, b: string): number {
  const normA = normalizeText(a);
  const normB = normalizeText(b);
  
  if (normA === normB) return 1;
  if (normA.length === 0 || normB.length === 0) return 0;
  
  // Check for contains
  if (normA.includes(normB) || normB.includes(normA)) {
    return 0.9;
  }
  
  // Levenshtein-based similarity
  const maxLen = Math.max(normA.length, normB.length);
  const distance = levenshteinDistance(normA, normB);
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Detect labels in entry lines using fuzzy matching
 */
export function detectLabels(
  entry: FusionEntry,
  recordType: 'baptism' | 'marriage' | 'funeral'
): DetectedLabel[] {
  const dictionary = LABEL_DICTIONARIES[recordType] || {};
  const detectedLabels: DetectedLabel[] = [];
  
  for (const line of entry.lines) {
    const normalizedLine = normalizeText(line.text);
    
    for (const [labelText, fieldName] of Object.entries(dictionary)) {
      const normalizedLabel = normalizeText(labelText);
      const score = similarity(normalizedLine, normalizedLabel);
      
      // Also check for partial matches at line start
      if (normalizedLine.startsWith(normalizedLabel)) {
        const partialScore = Math.min(1, 0.85 + (normalizedLabel.length / normalizedLine.length) * 0.15);
        
        if (partialScore > 0.6) {
          detectedLabels.push({
            label: labelText,
            canonicalField: fieldName,
            bbox: line.bbox,
            confidence: partialScore,
            matchedText: line.text,
          });
        }
      } else if (score > 0.7) {
        detectedLabels.push({
          label: labelText,
          canonicalField: fieldName,
          bbox: line.bbox,
          confidence: score,
          matchedText: line.text,
        });
      }
    }
    
    // Also check individual tokens
    for (const token of line.tokens) {
      const normalizedToken = normalizeText(token.text);
      
      for (const [labelText, fieldName] of Object.entries(dictionary)) {
        const normalizedLabel = normalizeText(labelText);
        const score = similarity(normalizedToken, normalizedLabel);
        
        if (score > 0.8) {
          // Check if we already have this label with higher confidence
          const existing = detectedLabels.find(l => l.canonicalField === fieldName);
          if (!existing || existing.confidence < score) {
            if (existing) {
              existing.confidence = score;
              existing.bbox = token.bbox;
              existing.matchedText = token.text;
            } else {
              detectedLabels.push({
                label: labelText,
                canonicalField: fieldName,
                bbox: token.bbox,
                confidence: score,
                matchedText: token.text,
              });
            }
          }
        }
      }
    }
  }
  
  // Deduplicate by field name, keeping highest confidence
  const deduped: DetectedLabel[] = [];
  const seenFields = new Set<string>();
  
  const sorted = [...detectedLabels].sort((a, b) => b.confidence - a.confidence);
  
  for (const label of sorted) {
    if (!seenFields.has(label.canonicalField)) {
      seenFields.add(label.canonicalField);
      deduped.push(label);
    }
  }
  
  return deduped;
}

// ============================================================================
// Value Extraction (Field Mapping)
// ============================================================================

/**
 * Extract value for a detected label by looking at text to the right or below
 */
export function extractValueForLabel(
  label: DetectedLabel,
  entry: FusionEntry,
  allLabels: DetectedLabel[]
): { value: string; bbox?: BBox; confidence: number } {
  // Find lines/tokens to the right of label in same Y band
  const rightTokens: FusionToken[] = [];
  const belowTokens: FusionToken[] = [];
  
  for (const line of entry.lines) {
    // Skip the label line itself if it's a direct match
    if (line.text === label.matchedText) {
      // Look at tokens after the label within the same line
      let foundLabel = false;
      for (const token of line.tokens) {
        if (foundLabel) {
          rightTokens.push(token);
        } else if (similarity(token.text, label.label) > 0.7 || 
                   similarity(token.text, label.matchedText) > 0.7) {
          foundLabel = true;
        }
      }
      continue;
    }
    
    // Check if line is to the right in same Y band
    if (isInSameYBand(line.bbox, label.bbox, 30) && isToRightOf(line.bbox, label.bbox)) {
      for (const token of line.tokens) {
        rightTokens.push(token);
      }
    }
    
    // Check if line is below (within reasonable distance)
    if (isBelow(line.bbox, label.bbox)) {
      const verticalDistance = line.bbox.y - (label.bbox.y + label.bbox.h);
      if (verticalDistance < 50) {
        // Make sure we're not crossing into another label's territory
        const isAnotherLabel = allLabels.some(
          l => l !== label && bboxesOverlap(line.bbox, l.bbox)
        );
        if (!isAnotherLabel) {
          for (const token of line.tokens) {
            belowTokens.push(token);
          }
        }
      }
    }
  }
  
  // Prefer right tokens, fall back to below tokens
  const tokens = rightTokens.length > 0 ? rightTokens : belowTokens;
  
  if (tokens.length === 0) {
    return { value: '', confidence: 0 };
  }
  
  const value = tokens.map(t => t.text).join(' ').trim();
  const avgConfidence = tokens.reduce((sum, t) => sum + (t.confidence || 0.5), 0) / tokens.length;
  const bbox = tokens.length > 0 ? mergeBBoxes(tokens.map(t => t.bbox)) : undefined;
  
  return { value, bbox, confidence: avgConfidence };
}

/**
 * Helper function to normalize date values
 * Converts various date formats to YYYY-MM-DD
 */
function normalizeDateValue(dateStr: string): string {
  if (!dateStr) return '';
  
  // Try to parse common date formats
  // Example: "January 1, 1920" -> "1920-01-01"
  // Example: "1/1/1920" -> "1920-01-01"
  // Example: "Jan 1, 1920" -> "1920-01-01"
  
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // If parsing fails, return original value
  return dateStr;
}

/**
 * Auto-map all detected labels to field values
 * Uses canonical schema keys (not DB column names)
 */
export function autoMapFields(
  entry: FusionEntry,
  labels: DetectedLabel[],
  recordType?: 'baptism' | 'marriage' | 'funeral',
  stickyDefaults?: Record<'baptism' | 'marriage' | 'funeral', boolean>
): Record<string, { value: string; confidence: number; labelBbox?: BBox; valueBbox?: BBox }> {
  const result: Record<string, { value: string; confidence: number; labelBbox?: BBox; valueBbox?: BBox }> = {};
  
  // If sticky defaults enabled, filter labels to only default columns
  let filteredLabels = labels;
  if (recordType && stickyDefaults?.[recordType]) {
    const defaultColumns = getDefaultColumns(recordType);
    
    // Only process labels that map to default columns
    filteredLabels = labels.filter(label => {
      // Map canonicalField to database column name
      // This is a simple mapping - you may need to adjust based on your field naming
      const dbColumn = label.canonicalField;
      return defaultColumns.includes(dbColumn);
    });
  }
  
  // ============================================================================
  // CUSTOM FIELD MAPPING LOGIC - Uses Canonical Schema Keys
  // ============================================================================
  // Use canonical schema registry keys (not DB column names)
  // The label.canonicalField already matches schema keys from LABEL_DICTIONARIES
  
  // Get schema for validation
  const schema = getRecordSchema(recordType || 'baptism');
  const schemaKeys = new Set(schema.map(f => f.key));
  
  // Process each label - use canonical field key directly
  for (const label of filteredLabels) {
    const { value, bbox, confidence } = extractValueForLabel(label, entry, labels);
    
    // Use canonical field key from label dictionary (matches schema registry)
    const canonicalKey = label.canonicalField;
    
    // Dev-only: validate canonical key exists in schema
    if (process.env.NODE_ENV === 'development' && !schemaKeys.has(canonicalKey)) {
      console.warn(`[autoMapFields] Unknown canonical field key: "${canonicalKey}" for ${recordType}`);
    }
    
    // Apply custom value processing for specific fields
    let processedValue = value;
    let processedConfidence = confidence;
    
    // Date fields: normalize date format
    if (canonicalKey === 'date_of_birth' || canonicalKey === 'date_of_baptism' || 
        canonicalKey === 'date_of_marriage' || canonicalKey === 'date_of_death' ||
        canonicalKey === 'date_of_funeral' || canonicalKey === 'date_of_burial') {
      processedValue = normalizeDateValue(value);
      processedConfidence = Math.min(confidence + 0.1, 1.0);
    }
    
    // Name fields: capitalize first letter
    if (canonicalKey === 'child_name' || canonicalKey === 'deceased_name' ||
        canonicalKey === 'groom_name' || canonicalKey === 'bride_name') {
      // Don't split here - keep full name in canonical key
      // Splitting happens at DB commit time
      processedValue = value.trim();
    } else if (canonicalKey === 'father_name' || canonicalKey === 'mother_name') {
      // Capitalize first letter of each word
      processedValue = value.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }
    
    // Split parents name into father and mother if needed
    if (canonicalKey === 'parents_name' && value.includes(' and ')) {
      const parts = value.split(' and ');
      if (parts.length === 2) {
        result['father_name'] = {
          value: parts[0].trim(),
          confidence: confidence * 0.9,
          labelBbox: label.bbox,
          valueBbox: bbox,
        };
        result['mother_name'] = {
          value: parts[1].trim(),
          confidence: confidence * 0.9,
          labelBbox: label.bbox,
          valueBbox: bbox,
        };
        continue; // Skip adding to 'parents_name' field
      }
    }
    
    // Store the mapped field using canonical key
    result[canonicalKey] = {
      value: processedValue,
      confidence: processedConfidence,
      labelBbox: label.bbox,
      valueBbox: bbox,
    };
  }
  
  // Dev-only: validate all result keys
  if (process.env.NODE_ENV === 'development' && recordType) {
    const resultKeys = Object.keys(result);
    const validation = validateFieldKeys(recordType, resultKeys);
    if (!validation.valid) {
      console.warn('[autoMapFields] Field key validation failed:', validation.errors);
    }
  }
  
  // Also extract record number if found (always include this)
  if (entry.recordNumber && !result.record_number) {
    result.record_number = {
      value: entry.recordNumber,
      confidence: 0.9,
    };
  }
  
  return result;
}
