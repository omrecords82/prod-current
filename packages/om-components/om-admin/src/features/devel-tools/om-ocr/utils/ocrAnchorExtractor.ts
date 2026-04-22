/**
 * OCR Anchor Extractor
 * Extracts field values using anchor/label detection
 * Language-aware (English + Russian/Cyrillic)
 */

import { NormalizedLine } from './ocrTextNormalizer';
import { FusionLine } from '../types/fusion';

export type RecordType = 'baptism' | 'marriage' | 'funeral';
export type Language = 'en' | 'ru' | 'auto';

export interface ExtractedField {
  rawValue: string;
  confidence: number;
  sourceLineIndices: number[];
  matchedAnchor: string;
  anchorLanguage: 'en' | 'ru';
}

export interface ExtractedFields {
  child_name_raw?: ExtractedField;
  birth_date_raw?: ExtractedField;
  reception_date_raw?: ExtractedField;
  baptism_date_raw?: ExtractedField;
  birthplace_raw?: ExtractedField;
  entry_type_raw?: ExtractedField;
  sponsors_raw?: ExtractedField;
  parents_raw?: ExtractedField;
  clergy_raw?: ExtractedField;
  father_name_raw?: ExtractedField;
  mother_name_raw?: ExtractedField;
  confidence_by_field: Record<string, number>;
  debug: {
    matched_anchor: Record<string, string>;
    source_line_indexes: Record<string, number[]>;
    language_detected?: Language;
  };
}

/**
 * Anchor dictionary per language and record type
 */
const ANCHOR_DICTIONARIES: Record<RecordType, Record<Language, Record<string, string[]>>> = {
  baptism: {
    en: {
      child_name: ['child', 'name of child', 'child name', 'name', 'infant', 'baby'],
      birth_date: ['birth date', 'born', 'date of birth', 'dob', 'b.', 'born on'],
      reception_date: ['reception date', 'received', 'date of reception', 'reception'],
      baptism_date: ['baptism date', 'baptized', 'date of baptism', 'baptism', 'baptized on'],
      birthplace: ['birthplace', 'place of birth', 'born at', 'location'],
      entry_type: ['entry type', 'type', 'sacrament'],
      sponsors: ['sponsors', 'godparents', 'god parents', 'godfather', 'godmother'],
      parents: ['parents', 'father and mother', 'mother and father'],
      father_name: ['father', 'father name', 'father\'s name', 'dad'],
      mother_name: ['mother', 'mother name', 'mother\'s name', 'mom'],
      clergy: ['clergy', 'priest', 'officiating', 'performed by', 'by', 'father', 'fr.'],
    },
    ru: {
      child_name: ['ребенок', 'имя ребенка', 'дитя', 'младенец', 'имя'],
      birth_date: ['дата рождения', 'родился', 'рождён', 'родилась', 'рождена', 'р.'],
      reception_date: ['дата принятия', 'принят', 'принята', 'принятие'],
      baptism_date: ['дата крещения', 'крещен', 'крещена', 'крещение', 'крещён'],
      birthplace: ['место рождения', 'родился в', 'родилась в'],
      entry_type: ['тип записи', 'таинство'],
      sponsors: ['восприемники', 'крестные', 'крестный', 'крестная', 'восприемник'],
      parents: ['родители', 'отец и мать', 'мать и отец'],
      father_name: ['отец', 'имя отца', 'отца'],
      mother_name: ['мать', 'имя матери', 'матери'],
      clergy: ['священник', 'клир', 'совершил', 'совершила', 'иерей'],
    },
    auto: {}, // Will be populated from en + ru
  },
  marriage: {
    en: {
      groom_name: ['groom', 'groom name', 'bridegroom'],
      bride_name: ['bride', 'bride name'],
      marriage_date: ['marriage date', 'married', 'date of marriage', 'wedding date'],
      witnesses: ['witnesses', 'witness'],
      clergy: ['clergy', 'priest', 'officiating', 'performed by'],
    },
    ru: {
      groom_name: ['жених', 'имя жениха'],
      bride_name: ['невеста', 'имя невесты'],
      marriage_date: ['дата брака', 'брак', 'венчание', 'дата венчания'],
      witnesses: ['свидетели', 'свидетель'],
      clergy: ['священник', 'клир', 'совершил'],
    },
    auto: {},
  },
  funeral: {
    en: {
      deceased_name: ['deceased', 'name', 'deceased name'],
      death_date: ['death date', 'died', 'date of death', 'deceased on'],
      funeral_date: ['funeral date', 'funeral', 'burial date'],
      burial_location: ['burial location', 'buried at', 'cemetery'],
      clergy: ['clergy', 'priest', 'officiating'],
    },
    ru: {
      deceased_name: ['умерший', 'имя', 'имя умершего'],
      death_date: ['дата смерти', 'умер', 'умерла', 'скончался', 'скончалась'],
      funeral_date: ['дата похорон', 'похороны', 'погребение'],
      burial_location: ['место погребения', 'кладбище'],
      clergy: ['священник', 'клир', 'совершил'],
    },
    auto: {},
  },
};

// Populate auto dictionaries
Object.keys(ANCHOR_DICTIONARIES).forEach((recordType) => {
  const type = recordType as RecordType;
  const en = ANCHOR_DICTIONARIES[type].en;
  const ru = ANCHOR_DICTIONARIES[type].ru;
  const auto: Record<string, string[]> = {};
  
  Object.keys(en).forEach((key) => {
    auto[key] = [...(en[key] || []), ...(ru[key] || [])];
  });
  
  ANCHOR_DICTIONARIES[type].auto = auto;
});

/**
 * Detect language from text (simple heuristic)
 */
function detectLanguage(text: string): Language {
  // Check for Cyrillic characters
  const cyrillicPattern = /[А-Яа-яЁё]/;
  const hasCyrillic = cyrillicPattern.test(text);
  
  // Check for English patterns
  const englishPattern = /[A-Za-z]/;
  const hasEnglish = englishPattern.test(text);
  
  if (hasCyrillic && hasEnglish) {
    return 'auto'; // Mixed
  } else if (hasCyrillic) {
    return 'ru';
  } else if (hasEnglish) {
    return 'en';
  }
  
  return 'auto'; // Default
}

/**
 * Normalize text for matching (lowercase, remove accents, etc.)
 */
function normalizeForMatching(text: string): string {
  return text.toLowerCase().trim();
}

/**
 * Calculate similarity between two strings (simple Levenshtein-based)
 */
function similarity(str1: string, str2: string): number {
  const s1 = normalizeForMatching(str1);
  const s2 = normalizeForMatching(str2);
  
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  // Simple character overlap
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  const matches = shorter.split('').filter(char => longer.includes(char)).length;
  
  return matches / Math.max(longer.length, 1);
}

/**
 * Extract value from a line after a matched anchor
 */
function extractValueAfterAnchor(
  line: NormalizedLine,
  anchor: string,
  anchorIndex: number
): string {
  const text = line.text;
  const anchorLower = anchor.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Find anchor position in text
  const anchorPos = textLower.indexOf(anchorLower);
  if (anchorPos === -1) return '';
  
  // Extract text after anchor
  let valueStart = anchorPos + anchor.length;
  
  // Skip colon and whitespace after anchor
  while (valueStart < text.length && (text[valueStart] === ':' || /\s/.test(text[valueStart]))) {
    valueStart++;
  }
  
  const value = text.substring(valueStart).trim();
  
  // Remove trailing punctuation that might be part of the label
  return value.replace(/^[:\-\.\s]+/, '').trim();
}

/**
 * Extract value from next line if current line is just a label
 */
function extractValueFromNextLine(
  lines: NormalizedLine[],
  currentIndex: number
): string {
  if (currentIndex + 1 >= lines.length) return '';
  
  const nextLine = lines[currentIndex + 1];
  const nextText = nextLine.text.trim();
  
  // If next line looks like a value (not a label), return it
  if (!/^[A-ZА-ЯЁ][a-zа-яё]*:/.test(nextText) && // Not a label
      !/^\d+$/.test(nextText)) { // Not just a number
    return nextText;
  }
  
  return '';
}

/**
 * Extract fields from normalized OCR lines
 */
export function extractFieldsFromAnchors(
  normalizedLines: NormalizedLine[],
  recordType: RecordType,
  language: Language = 'auto'
): ExtractedFields {
  const result: ExtractedFields = {
    confidence_by_field: {},
    debug: {
      matched_anchor: {},
      source_line_indexes: {},
    },
  };

  if (!normalizedLines || normalizedLines.length === 0) {
    return result;
  }

  // Detect language if auto
  if (language === 'auto') {
    const sampleText = normalizedLines.slice(0, 5).map(l => l.text).join(' ');
    const detected = detectLanguage(sampleText);
    result.debug.language_detected = detected;
    language = detected === 'auto' ? 'en' : detected; // Default to en if mixed
  }

  // Get anchor dictionary for this record type and language
  const anchors = ANCHOR_DICTIONARIES[recordType][language] || {};
  
  // Also check auto dictionary for fallback
  const autoAnchors = ANCHOR_DICTIONARIES[recordType].auto || {};

  // Process each normalized line
  for (let i = 0; i < normalizedLines.length; i++) {
    const line = normalizedLines[i];
    const lineText = normalizeForMatching(line.text);
    
    // Check each field's anchors
    for (const [fieldKey, anchorList] of Object.entries(anchors)) {
      // Skip if already extracted
      const fieldName = `${fieldKey}_raw` as keyof ExtractedFields;
      if (result[fieldName]) continue;
      
      // Try each anchor variant
      for (const anchor of anchorList) {
        const anchorLower = normalizeForMatching(anchor);
        
        // Check if line contains this anchor
        if (lineText.includes(anchorLower)) {
          // Extract value
          let value = extractValueAfterAnchor(line, anchor, i);
          
          // If value is empty or very short, check next line
          if (!value || value.length < 2) {
            const nextValue = extractValueFromNextLine(normalizedLines, i);
            if (nextValue) {
              value = nextValue;
              // Include next line index in source
              const sourceIndices = [line.originalIndex];
              if (normalizedLines[i + 1]) {
                sourceIndices.push(normalizedLines[i + 1].originalIndex);
              }
              result.debug.source_line_indexes[fieldKey] = sourceIndices;
            }
          } else {
            result.debug.source_line_indexes[fieldKey] = [line.originalIndex];
          }
          
          if (value) {
            // Calculate confidence based on anchor match quality
            const matchQuality = similarity(lineText, anchorLower);
            const confidence = Math.min(0.7 + (matchQuality * 0.3), 1.0);
            
            const extracted: ExtractedField = {
              rawValue: value,
              confidence,
              sourceLineIndices: result.debug.source_line_indexes[fieldKey] || [line.originalIndex],
              matchedAnchor: anchor,
              anchorLanguage: language as 'en' | 'ru',
            };
            
            (result as any)[fieldName] = extracted;
            result.confidence_by_field[fieldKey] = confidence;
            result.debug.matched_anchor[fieldKey] = anchor;
            
            break; // Found this field, move to next
          }
        }
      }
    }
    
    // Also check auto dictionary for fields not found in primary language
    for (const [fieldKey, anchorList] of Object.entries(autoAnchors)) {
      const fieldName = `${fieldKey}_raw` as keyof ExtractedFields;
      if (result[fieldName]) continue; // Already found
      
      for (const anchor of anchorList) {
        const anchorLower = normalizeForMatching(anchor);
        if (lineText.includes(anchorLower)) {
          let value = extractValueAfterAnchor(line, anchor, i);
          
          if (!value || value.length < 2) {
            const nextValue = extractValueFromNextLine(normalizedLines, i);
            if (nextValue) value = nextValue;
          }
          
          if (value) {
            const matchQuality = similarity(lineText, anchorLower);
            const confidence = Math.min(0.6 + (matchQuality * 0.3), 0.9); // Lower confidence for auto
            
            const extracted: ExtractedField = {
              rawValue: value,
              confidence,
              sourceLineIndices: [line.originalIndex],
              matchedAnchor: anchor,
              anchorLanguage: language as 'en' | 'ru',
            };
            
            (result as any)[fieldName] = extracted;
            result.confidence_by_field[fieldKey] = confidence;
            result.debug.matched_anchor[fieldKey] = anchor;
            break;
          }
        }
      }
    }
  }

  return result;
}

