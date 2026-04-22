/**
 * Record Type and Metadata Detector
 * Automatically detects record type, year, and other metadata from OCR text
 */

export type RecordType = 'baptism' | 'marriage' | 'funeral';

export interface DetectedMetadata {
  recordType: RecordType | null;
  year: number | null;
  confidence: number;
}

/**
 * Normalize text for matching (lowercase, remove accents, etc.)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Detect record type from OCR text
 */
export function detectRecordType(ocrText: string | null | undefined): { type: RecordType | null; confidence: number } {
  if (!ocrText) {
    return { type: null, confidence: 0 };
  }

  const normalized = normalizeText(ocrText);
  
  // Keywords for each record type (case-insensitive, multilingual)
  const marriageKeywords = [
    'marriage', 'marriages', 'брак', 'бракосочетание', 'бракосочетавшихся',
    'groom', 'bride', 'wedding', 'жених', 'невеста',
    'marry', 'married', 'wed', 'wedded',
    'метрической книги', 'часть вторая', // Russian: "metrical book, part two" (marriages)
  ];
  
  const baptismKeywords = [
    'baptism', 'baptisms', 'крещение', 'крещений',
    'child', 'infant', 'baby', 'ребенок', 'младенец',
    'godparent', 'godparents', 'sponsor', 'sponsors', 'крестный', 'крестная',
    'born', 'birth', 'рождение', 'родился',
    'метрической книги', 'часть первая', // Russian: "metrical book, part one" (baptisms)
  ];
  
  const funeralKeywords = [
    'funeral', 'funerals', 'похороны', 'погребение',
    'death', 'died', 'deceased', 'death', 'смерть', 'умер', 'покойный',
    'burial', 'buried', 'cemetery', 'погребение', 'кладбище',
    'метрической книги', 'часть третья', // Russian: "metrical book, part three" (funerals)
  ];

  // Count matches for each type
  let marriageScore = 0;
  let baptismScore = 0;
  let funeralScore = 0;

  for (const keyword of marriageKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = normalized.match(regex);
    if (matches) {
      marriageScore += matches.length;
    }
  }

  for (const keyword of baptismKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = normalized.match(regex);
    if (matches) {
      baptismScore += matches.length;
    }
  }

  for (const keyword of funeralKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = normalized.match(regex);
    if (matches) {
      funeralScore += matches.length;
    }
  }

  // Calculate confidence based on score and text length
  const totalScore = marriageScore + baptismScore + funeralScore;
  const maxScore = Math.max(marriageScore, baptismScore, funeralScore);
  
  if (totalScore === 0) {
    return { type: null, confidence: 0 };
  }

  let detectedType: RecordType | null = null;
  if (marriageScore > baptismScore && marriageScore > funeralScore) {
    detectedType = 'marriage';
  } else if (baptismScore > funeralScore) {
    detectedType = 'baptism';
  } else if (funeralScore > 0) {
    detectedType = 'funeral';
  }

  // Confidence is based on how dominant the winning type is
  const confidence = totalScore > 0 ? Math.min(1, maxScore / Math.max(1, totalScore * 0.5)) : 0;

  return { type: detectedType, confidence };
}

/**
 * Extract year from OCR text
 * Looks for patterns like "YEAR 86", "YEAR 1986", "86", "1986", etc.
 */
export function extractYear(ocrText: string | null | undefined): number | null {
  if (!ocrText) {
    return null;
  }

  // Patterns to match:
  // - "YEAR 86", "YEAR 1986"
  // - "YEAR: 86", "YEAR: 1986"
  // - "86", "1986" (standalone years)
  // - "19XX", "20XX" (4-digit years)
  // - "ГОД 86", "ГОД 1986" (Russian: "YEAR")
  
  const patterns = [
    /(?:year|год)[\s:]*(\d{2,4})/gi,
    /\b(19\d{2}|20\d{2})\b/, // 4-digit years 1900-2099
    /\b(\d{2})\b(?=\s|$)/, // 2-digit years (less reliable)
  ];

  for (const pattern of patterns) {
    const matches = ocrText.match(pattern);
    if (matches && matches.length > 0) {
      // Extract the year number
      const yearMatch = matches[0].match(/\d{2,4}/);
      if (yearMatch) {
        let year = parseInt(yearMatch[0], 10);
        
        // If 2-digit year, assume 1900s if > 50, 2000s if <= 50
        if (year < 100) {
          year = year > 50 ? 1900 + year : 2000 + year;
        }
        
        // Validate year is reasonable (1800-2100)
        if (year >= 1800 && year <= 2100) {
          return year;
        }
      }
    }
  }

  return null;
}

/**
 * Detect both record type and year from OCR text
 */
export function detectMetadata(ocrText: string | null | undefined): DetectedMetadata {
  const recordType = detectRecordType(ocrText);
  const year = extractYear(ocrText);

  return {
    recordType: recordType.type,
    year,
    confidence: recordType.confidence,
  };
}

