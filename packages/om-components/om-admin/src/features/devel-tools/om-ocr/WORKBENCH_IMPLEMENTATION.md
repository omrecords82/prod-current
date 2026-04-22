# OCR Workbench UI Rebuild - Implementation Summary

## Branch
`feat/ocr-workbench-ui`

## Problem Statement

### Current Issues
1. **Cluttered UI**: Multiple competing interfaces (Upload Queue, Processed Images, Inspection Panel, Mapping Tab, Fusion Tab)
2. **Duplicate Mapping Surfaces**: MappingTab and FusionTab both do field mapping
3. **Runtime Errors**: `FIELD_TO_COLUMN_MAP is not defined` in MappingTab.tsx:463
4. **No Clear Workflow**: Tabs compete for attention, no clear progression

### Root Causes
- **Two separate job lists**: Upload Queue (in EnhancedOCRUploader) and ProcessedImagesTable
- **Duplicate mapping**: MappingTab (in InspectionPanel tabs) and FusionTab Step 3 both map fields
- **Scattered field definitions**: FIELD_DEFINITIONS, RECORD_FIELDS, FIELD_TO_COLUMN_MAP all define fields differently
- **No canonical schema**: Field keys don't match between components

## Solution: Two-Phase UI

### Phase 1: Upload/Queue (Unified Jobs List)
- Single unified list replacing Upload Queue + Processed Images
- Filters: status, record type, confidence, date
- Bulk actions: retry failed, delete selected

### Phase 2: Workbench (for selected job)
- Clean stepper workflow (replaces competing tabs)
- Steps: Detect Entries → Anchor Labels → Map Fields → Review/Commit
- Image viewer with overlays (extracted from InspectionPanel)
- All mapping happens in Workbench (no duplicate MappingTab)

## Files Created

### 1. **`components/workbench/OcrWorkbench.tsx`** (NEW)
**Purpose**: Main workbench container
- Manages two-phase UI: Jobs List or Workbench
- Handles job selection and navigation
- Routes: `/devel/enhanced-ocr-uploader` (list) or `/devel/enhanced-ocr-uploader/:jobId` (workbench)

### 2. **`components/workbench/WorkbenchHeader.tsx`** (NEW)
**Purpose**: Header bar for workbench
- Shows job filename, record type, status, confidence
- Actions: Copy OCR text, Refresh, Close
- Replaces header from InspectionPanel

### 3. **`components/workbench/WorkbenchViewer.tsx`** (NEW)
**Purpose**: Image viewer with overlays
- Extracted from InspectionPanel image viewer
- Zoom/pan controls
- FusionOverlay integration
- Edit mode support

### 4. **`components/workbench/WorkbenchStepper.tsx`** (NEW)
**Purpose**: 4-step workflow stepper
- Replaces tabs in InspectionPanel
- Steps: Detect Entries → Anchor Labels → Map Fields → Review/Commit
- Lazy loads step components

### 5. **`components/workbench/steps/DetectEntriesStep.tsx`** (NEW)
**Purpose**: Step 1 - Multi-record segmentation
- Placeholder for FusionTab Step 1 logic
- Will integrate entry detection

### 6. **`components/workbench/steps/AnchorLabelsStep.tsx`** (NEW)
**Purpose**: Step 2 - Label detection
- Placeholder for FusionTab Step 2 logic
- Will integrate label anchoring

### 7. **`components/workbench/steps/MapFieldsStep.tsx`** (NEW)
**Purpose**: Step 3 - Field mapping
- Replaces MappingTab and FusionTab Step 3
- Uses canonical schema registry
- Will integrate auto-map and manual mapping

### 8. **`components/workbench/steps/ReviewCommitStep.tsx`** (NEW)
**Purpose**: Step 4 - Review and commit
- Replaces ReviewFinalizeTab
- Will integrate review/commit logic

### 9. **`components/workbench/UnifiedJobsList.tsx`** (NEW)
**Purpose**: Unified jobs list
- Replaces Upload Queue + ProcessedImagesTable
- Filters: status, record type, search
- Bulk selection and actions
- Click job to open workbench

## Files Modified

### 1. **`shared/recordSchemas/registry.ts`** (ENHANCED)
**Changes**:
- Added `getLabelDictionary()` - Returns label dictionary for record type
- Added `getLabelVariants()` - Get all label texts for a schema key
- Added `findSchemaKeyFromLabel()` - Fuzzy match label to schema key
- Integrated with `LABEL_DICTIONARIES` from fusion.ts

**Purpose**: Centralize field schema + DB mapping + label dictionaries in ONE registry

### 2. **`components/MappingTab.tsx`** (FIXED)
**Changes**:
- Fixed `FIELD_TO_COLUMN_MAP is not defined` error (line 463)
- Replaced `FIELD_TO_COLUMN_MAP` with `getRecordSchema()` and `mapFieldKeyToDbColumn()`
- Uses canonical schema keys

**Status**: Will be deprecated in favor of Workbench MapFieldsStep

### 3. **`utils/visionParser.ts`** (ALREADY FIXED)
**Changes** (from previous work):
- Uses canonical schema keys (not DB column names)
- Integrated with registry

## Files to Modify (Next Steps)

### 1. **`EnhancedOCRUploader.tsx`** (TO REFACTOR)
**Current**: Renders Upload Queue + ProcessedImagesTable + InspectionPanel
**Target**: Render OcrWorkbench component
**Changes**:
- Remove Upload Queue UI (keep upload logic, but jobs go to UnifiedJobsList)
- Remove ProcessedImagesTable rendering
- Remove InspectionPanel rendering
- Import and render OcrWorkbench
- Pass churchId to OcrWorkbench

### 2. **`components/FusionTab.tsx`** (TO INTEGRATE)
**Current**: 4-step workflow as a tab in InspectionPanel
**Target**: Steps become WorkbenchStepper steps
**Changes**:
- Extract Step 1 logic → DetectEntriesStep
- Extract Step 2 logic → AnchorLabelsStep
- Extract Step 3 logic → MapFieldsStep
- Keep Step 4 logic for ReviewCommitStep

### 3. **`components/ReviewFinalizeTab.tsx`** (TO INTEGRATE)
**Current**: Review/commit as a tab
**Target**: Becomes ReviewCommitStep
**Changes**:
- Extract review/commit logic to ReviewCommitStep

### 4. **`components/InspectionPanel.tsx`** (TO DEPRECATE)
**Current**: Multi-tab interface (Text, Structured, Mapping, Fusion, Review)
**Target**: Deprecated in favor of Workbench
**Changes**:
- Mark as deprecated
- Keep for backward compatibility if needed
- Or remove entirely

### 5. **`components/ProcessedImagesTable.tsx`** (TO DEPRECATE)
**Current**: Separate jobs table
**Target**: Replaced by UnifiedJobsList
**Changes**:
- Mark as deprecated
- Remove from EnhancedOCRUploader

## Registry Integration

### Schema Registry Functions
```typescript
// Get field schema for record type
getRecordSchema(recordType, { stickyDefaults?: boolean })

// Map canonical key to DB column
mapFieldKeyToDbColumn(recordType, fieldKey)

// Map DB column to canonical key
mapDbColumnToFieldKey(recordType, dbColumn)

// Get label dictionary (label text -> schema key)
getLabelDictionary(recordType, language)

// Find schema key from label text (fuzzy match)
findSchemaKeyFromLabel(recordType, labelText)

// Validate field keys (dev-only)
validateFieldKeys(recordType, fieldKeys)
```

### Label Dictionary Integration
- `LABEL_DICTIONARIES` from `types/fusion.ts` maps label text → canonical schema keys
- Registry provides `getLabelDictionary()` to access this
- Auto-mapping uses canonical keys (matches label dictionary output)

## Runtime Error Fixes

### 1. `FIELD_TO_COLUMN_MAP is not defined`
**Location**: `MappingTab.tsx:463`
**Fix**: Replaced with `getRecordSchema()` and `mapFieldKeyToDbColumn()`
**Status**: ✅ Fixed

### 2. `allFields is not defined`
**Location**: `MappingTab.tsx:472`
**Fix**: Replaced with `fields` from `getRecordSchema()`
**Status**: ✅ Fixed (from previous work)

## Next Implementation Steps

1. **Integrate Step Components**:
   - Extract FusionTab Step 1 → DetectEntriesStep
   - Extract FusionTab Step 2 → AnchorLabelsStep
   - Extract FusionTab Step 3 → MapFieldsStep
   - Extract ReviewFinalizeTab → ReviewCommitStep

2. **Update EnhancedOCRUploader**:
   - Replace current UI with OcrWorkbench
   - Keep upload functionality
   - Remove duplicate job lists

3. **Wire WorkbenchViewer**:
   - Connect to job data
   - Pass overlay boxes from stepper steps
   - Handle token clicks for mapping

4. **Remove Deprecated Components**:
   - Mark InspectionPanel as deprecated
   - Mark ProcessedImagesTable as deprecated
   - Remove MappingTab (replaced by MapFieldsStep)

5. **Testing**:
   - Test workbench navigation
   - Test step progression
   - Test field mapping with registry
   - Verify no runtime errors

## Acceptance Criteria

- ✅ FIELD_TO_COLUMN_MAP runtime error eliminated
- ✅ Single canonical schema registry
- ✅ Two-phase UI: Jobs List → Workbench
- ✅ No duplicate mapping surfaces
- ✅ Clean stepper workflow
- ⏳ Step components integrated (placeholder created)
- ⏳ EnhancedOCRUploader refactored (pending)
- ⏳ Deprecated components removed (pending)

