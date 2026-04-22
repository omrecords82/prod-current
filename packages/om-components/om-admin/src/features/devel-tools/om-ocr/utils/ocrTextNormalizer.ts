/**
 * OCR Text Normalizer
 * Normalizes OCR text for structured extraction
 * Handles whitespace, punctuation, line wrapping, etc.
 */

import { FusionLine } from '../types/fusion';

export interface NormalizedLine {
  text: string;
  originalIndex: number; // Index in original lines array
  originalLine: FusionLine; // Reference to original line for traceability
  isWrapped?: boolean; // True if this line was joined from multiple lines
  joinedIndices?: number[]; // Original indices if wrapped
}

/**
 * Normalize OCR lines for extraction
 * - Trim whitespace
 * - Normalize punctuation (treat :, ：, .-, etc as label separators)
 * - Join wrapped lines (if a line ends with comma or value appears on next line after a label)
 * - Keep original indices for traceability
 */
export function normalizeOcrLines(
  lines: FusionLine[]
): NormalizedLine[] {
  if (!lines || lines.length === 0) {
    return [];
  }

  const normalized: NormalizedLine[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    let normalizedText = line.text.trim();

    // Normalize whitespace (collapse multiple spaces to single space)
    normalizedText = normalizedText.replace(/\s+/g, ' ');

    // Normalize punctuation - treat various label separators consistently
    // Replace full-width colon (：) with regular colon
    normalizedText = normalizedText.replace(/：/g, ':');
    // Replace ".-" or ". -" with ": "
    normalizedText = normalizedText.replace(/\.\s*-\s*/g, ': ');
    // Normalize multiple colons/spaces after label
    normalizedText = normalizedText.replace(/:\s+/g, ': ');

    // Check if this line looks like a label (ends with colon)
    const isLabelLine = /:\s*$/.test(normalizedText) || /:\s*[A-Z]/.test(normalizedText);
    
    // Check if next line might be a continuation
    let wrappedText = normalizedText;
    const joinedIndices: number[] = [i];
    let j = i + 1;

    // If this line ends with a colon and next line exists, check if it's a value continuation
    if (isLabelLine && j < lines.length) {
      const nextLine = lines[j].text.trim();
      
      // If next line doesn't start with a capital letter (likely a label) and doesn't look like a new entry
      // it might be a continuation of the value
      if (nextLine && 
          !/^[A-ZА-ЯЁ][a-zа-яё]*:/.test(nextLine) && // Not a new label
          !/^\d+$/.test(nextLine) && // Not just a number
          normalizedText.length < 50) { // Current line is short (likely just label)
        wrappedText = `${normalizedText} ${nextLine}`;
        joinedIndices.push(j);
        j++;
      }
    }

    // Check for comma-wrapped lines (value continues on next line after comma)
    if (j < lines.length && /,\s*$/.test(wrappedText)) {
      const nextLine = lines[j].text.trim();
      if (nextLine && !/^[A-ZА-ЯЁ][a-zа-яё]*:/.test(nextLine)) {
        wrappedText = `${wrappedText} ${nextLine}`;
        joinedIndices.push(j);
        j++;
      }
    }

    normalized.push({
      text: wrappedText,
      originalIndex: i,
      originalLine: line,
      isWrapped: joinedIndices.length > 1,
      joinedIndices: joinedIndices.length > 1 ? joinedIndices : undefined,
    });

    i = j;
  }

  return normalized;
}

/**
 * Normalize a single line of text
 */
export function normalizeLineText(text: string): string {
  if (!text) return '';
  
  let normalized = text.trim();
  
  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Normalize punctuation
  normalized = normalized.replace(/：/g, ':');
  normalized = normalized.replace(/\.\s*-\s*/g, ': ');
  normalized = normalized.replace(/:\s+/g, ': ');
  
  return normalized;
}

