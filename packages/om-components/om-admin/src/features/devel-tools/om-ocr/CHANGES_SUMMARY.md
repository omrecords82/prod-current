# OCR Workbench UI Rebuild - Changes Summary

## Branch
`feat/ocr-workbench-ui`

## Runtime Error Fixes

### ✅ Fixed: `FIELD_TO_COLUMN_MAP is not defined`
**File**: `components/MappingTab.tsx:463`
**Issue**: Referenced removed constant `FIELD_TO_COLUMN_MAP`
**Fix**: Replaced with `getRecordSchema()` and `mapFieldKeyToDbColumn()` from registry
**Status**: Fixed

### ✅ Fixed: `allFields is not defined`
**File**: `components/MappingTab.tsx:472`
**Issue**: Referenced removed constant `allFields`
**Fix**: Replaced with `fields` from `getRecordSchema()`
**Status**: Fixed (from previous work)

## Files Created

### Workbench Components
1. **`components/workbench/OcrWorkbench.tsx`**
   - Main workbench container
   - Manages two-phase UI (Jobs List or Workbench)
   - Handles job selection

2. **`components/workbench/WorkbenchHeader.tsx`**
   - Header bar with job info (filename, type, status, confidence)
   - Actions: Copy, Refresh, Close

3. **`components/workbench/WorkbenchViewer.tsx`**
   - Image viewer with zoom/pan
   - FusionOverlay integration
   - Extracted from InspectionPanel

4. **`components/workbench/WorkbenchStepper.tsx`**
   - 4-step vertical stepper
   - Lazy loads step components

5. **`components/workbench/steps/DetectEntriesStep.tsx`**
   - Step 1: Multi-record segmentation
   - Placeholder (will integrate FusionTab Step 1)

6. **`components/workbench/steps/AnchorLabelsStep.tsx`**
   - Step 2: Label detection
   - Placeholder (will integrate FusionTab Step 2)

7. **`components/workbench/steps/MapFieldsStep.tsx`**
   - Step 3: Field mapping
   - Uses canonical schema registry
   - Placeholder (will integrate FusionTab Step 3)

8. **`components/workbench/steps/ReviewCommitStep.tsx`**
   - Step 4: Review and commit
   - Placeholder (will integrate ReviewFinalizeTab)

9. **`components/workbench/UnifiedJobsList.tsx`**
   - Unified jobs list (replaces Upload Queue + ProcessedImagesTable)
   - Filters: status, record type, search
   - Bulk selection and actions

### Documentation
10. **`UI_INVENTORY.md`**
    - Inventory of current UI components
    - Problem analysis
    - Proposed solution

11. **`WORKBENCH_IMPLEMENTATION.md`**
    - Implementation plan
    - File changes
    - Next steps

12. **`CHANGES_SUMMARY.md`** (this file)
    - Summary of all changes

## Files Modified

### 1. `shared/recordSchemas/registry.ts`
**Changes**:
- Added `getLabelDictionary(recordType, language)` - Returns label dictionary
- Added `getLabelVariants(recordType, fieldKey)` - Get label texts for a field
- Added `findSchemaKeyFromLabel(recordType, labelText)` - Fuzzy match label to key
- Integrated with `LABEL_DICTIONARIES` from `types/fusion.ts`

**Purpose**: Centralize field schema + DB mapping + label dictionaries in ONE registry

### 2. `components/MappingTab.tsx`
**Changes**:
- Line 463: Replaced `FIELD_TO_COLUMN_MAP[recordType]` with `getRecordSchema(recordType)`
- Line 472: Replaced `allFields.find()` with `fields.find()` (from schema)
- Uses canonical schema keys throughout

**Status**: Fixed runtime error, will be deprecated in favor of Workbench MapFieldsStep

## Prior Mismatch Cause

### Two Separate Field Definition Sources

1. **FusionTab** used `RECORD_FIELDS` from `config/recordFields.ts`:
   - Keys: `child_name`, `date_of_birth`, `date_of_baptism`
   - Matched `LABEL_DICTIONARIES` canonical fields

2. **MappingTab** used hardcoded `FIELD_DICTIONARIES`:
   - Keys: `first_name`, `last_name`, `dob`, `baptism_date`
   - Different keys entirely!

3. **autoMapFields** returned DB column names:
   - Keys: `first_name`, `birth_date`, `reception_date`
   - Mismatch with both UI components!

### Result
- Field keys didn't match across components
- Labels like "Child:" were mapped into `first_name` field
- Runtime errors from undefined constants

## How Registry Fixes It

1. **Single Source**: All components use `getRecordSchema()` - no duplicate definitions
2. **Canonical Keys**: Keys match `LABEL_DICTIONARIES` (`child_name`, `date_of_birth`, etc.)
3. **Consistent Mapping**: Auto-mapping returns canonical keys, UI expects canonical keys
4. **DB Mapping**: Registry provides `mapFieldKeyToDbColumn()` for database operations
5. **Label Integration**: Registry provides `getLabelDictionary()` for label matching
6. **Validation**: Dev-only validation catches mismatches early

## Next Steps (Pending)

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
   - Connect overlay boxes from stepper steps
   - Handle token clicks for mapping

4. **Remove Deprecated Components**:
   - Mark InspectionPanel as deprecated
   - Mark ProcessedImagesTable as deprecated
   - Remove MappingTab (replaced by MapFieldsStep)

## Testing Checklist

- [x] FIELD_TO_COLUMN_MAP runtime error fixed
- [x] allFields runtime error fixed
- [x] Canonical schema registry created
- [x] Label dictionary integrated into registry
- [x] Workbench skeleton created
- [ ] Step components integrated with logic
- [ ] EnhancedOCRUploader refactored
- [ ] Workbench navigation tested
- [ ] Field mapping tested with registry

