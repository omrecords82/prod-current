# OCR Auto-Map Extraction Pipeline - Implementation Summary

## Branch
`feat/ocr-automap-extraction`

## Overview
Implemented a structured extraction pipeline to fix incorrect auto-mapping (e.g., mapping "Child:" into First Name instead of extracting "Stepan" from "Child: Stepan"). The new pipeline uses a three-stage approach: Normalize → Extract → Map.

## Files Added

### 1. `utils/ocrTextNormalizer.ts`
**Purpose**: Normalizes OCR text for structured extraction
- Trims whitespace and normalizes punctuation
- Handles label separators (`:`, `：`, `.-`, etc.)
- Joins wrapped lines (label on one line, value on next)
- Preserves original indices for traceability

**Key Functions**:
- `normalizeOcrLines(lines: FusionLine[]): NormalizedLine[]`
- `normalizeLineText(text: string): string`

### 2. `utils/ocrAnchorExtractor.ts`
**Purpose**: Extracts field values using anchor/label detection
- Language-aware (English + Russian/Cyrillic)
- Anchor dictionaries per record type (baptism, marriage, funeral)
- Handles "Label: Value" same line and "Label:" followed by value on next line
- Returns extracted fields with confidence scores

**Key Functions**:
- `extractFieldsFromAnchors(normalizedLines, recordType, language): ExtractedFields`

**Anchors Supported** (Baptism):
- English: child, birth date, reception date, birthplace, entry type, sponsors, parents, father, mother, clergy
- Russian: ребенок, дата рождения, дата крещения, место рождения, восприемники, родители, отец, мать, священник

### 3. `utils/recordFieldMapper.ts`
**Purpose**: Maps extracted fields to form fields with validation
- **Never allows labels** (e.g., "Child:") to be inserted into name fields
- Splits full names into first/last name
- Parses dates from various formats (MM/DD/YYYY, Month DD YYYY, etc.)
- Splits parents field into father/mother
- Returns mapping result with confidence scores and debug info

**Key Functions**:
- `mapExtractedFieldsToForm(extracted, recordType): MappingResult`

**Features**:
- Label prefix removal (`removeLabelPrefix`)
- Name splitting (handles Cyrillic)
- Date parsing with validation
- Parents field splitting

### 4. Unit Tests
- `utils/__tests__/ocrTextNormalizer.test.ts` - Tests for text normalization
- `utils/__tests__/ocrAnchorExtractor.test.ts` - Tests for anchor extraction
- `utils/__tests__/recordFieldMapper.test.ts` - Tests for field mapping

**Test Coverage**:
- ✅ "Child: Stepan" → first_name="Stepan" (NOT "Child:")
- ✅ Label on next line case
- ✅ Date parsing (MM/DD/YYYY, Month DD YYYY)
- ✅ Name splitting (first/last)
- ✅ Parents splitting

## Files Modified

### 1. `components/MappingTab.tsx`
**Changes**:
- Added imports for new extraction modules
- Added `ocrResult` prop to receive Vision JSON
- Replaced `handleAutoMap` function to use new pipeline:
  1. Get OCR lines (from Vision JSON or plain text)
  2. Normalize lines
  3. Extract fields using anchors
  4. Map to form fields
  5. Apply to mapping state
- Added `mappingConfidence` state
- Added `showExtractionDebug` state (dev only)
- Added UI improvements:
  - Confidence badge showing overall mapping confidence
  - Warning alert when confidence < 60%
  - Debug toggle (dev mode only) showing extraction details
  - Per-field confidence chips (already existed, now populated correctly)

**Fallback**: If extraction fails, falls back to old pattern-based approach

### 2. `components/InspectionPanel.tsx`
**Changes**:
- Passes `ocrResult` prop to `MappingTab` component

## Pipeline Flow

```
OCR Text/Vision JSON
    ↓
[1] Normalize Lines
    - Trim whitespace
    - Normalize punctuation
    - Join wrapped lines
    ↓
[2] Extract Fields (Anchor Detection)
    - Match anchors (language-aware)
    - Extract values (strip labels)
    - Calculate confidence
    ↓
[3] Map to Form Fields
    - Remove label prefixes
    - Split names (first/last)
    - Parse dates
    - Split parents
    - Validate values
    ↓
Form Patch (ready to apply)
```

## Key Improvements

1. **Label Stripping**: Never maps labels like "Child:" into value fields
2. **Name Splitting**: Correctly splits "Stepan Роздольский" → first_name="Stepan", last_name="Роздольский"
3. **Date Parsing**: Handles multiple date formats with validation
4. **Language Support**: English + Russian/Cyrillic anchors
5. **Confidence Scoring**: Per-field and overall confidence scores
6. **Debug Info**: Developer toggle shows extraction details

## Testing

Run unit tests:
```bash
npm test -- ocrTextNormalizer ocrAnchorExtractor recordFieldMapper
```

## Next Steps (Future Enhancements)

1. Add more anchor variants (common misspellings, abbreviations)
2. Support more languages (Greek, Romanian)
3. Improve date parsing (handle more formats, time zones)
4. Add field validation rules
5. Support multi-line values (addresses, notes)

## Commit Plan

1. `feat(ocr): add text normalizer module + tests`
2. `feat(ocr): add anchor extractor module + tests`
3. `feat(ocr): add field mapper module + tests`
4. `feat(ocr): wire extraction pipeline into MappingTab UI`

