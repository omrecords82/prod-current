# Workbench Wireup Status

## ✅ Completed

### 1. WorkbenchContext Created
- **File**: `context/WorkbenchContext.tsx`
- **Status**: ✅ Complete
- **Features**:
  - Shared state for all workbench data
  - Reducer-based state management
  - Convenience helpers (setJob, setEntries, setFieldValue, etc.)
  - Type-safe actions

### 2. OcrWorkbench Updated
- **File**: `components/workbench/OcrWorkbench.tsx`
- **Status**: ✅ Complete
- **Changes**:
  - Uses `useWorkbench()` hook
  - Loads job data into workbench state
  - Handles job selection and workbench close
  - Two-phase UI (Jobs List or Workbench)

### 3. WorkbenchStepper Updated
- **File**: `components/workbench/WorkbenchStepper.tsx`
- **Status**: ✅ Complete
- **Changes**:
  - Uses `useWorkbench()` hook
  - Reads `activeStep` from workbench state
  - Step components no longer need job/churchId props

### 4. WorkbenchViewer Updated
- **File**: `components/workbench/WorkbenchViewer.tsx`
- **Status**: ⚠️ Partial (needs import fix)
- **Changes**:
  - Uses `useWorkbench()` hook
  - Reads imageUrl, ocrResult, bboxEditMode from state
  - Renders entryAreas as overlay boxes
- **TODO**: Fix imports (parseVisionResponse, VisionResponse)

## ⏳ Pending

### 1. EnhancedOCRUploader Refactor
- **File**: `EnhancedOCRUploader.tsx`
- **Status**: ⏳ Pending
- **Required Changes**:
  - Wrap with `WorkbenchProvider`
  - Replace `ProcessedImagesTable` with `OcrWorkbench`
  - Remove `InspectionPanel` rendering
  - Remove `MappingTab` standalone rendering
  - Keep upload functionality (upload zone, controls, queue)

### 2. Step Components Wireup

#### DetectEntriesStep
- **File**: `components/workbench/steps/DetectEntriesStep.tsx`
- **Status**: ⏳ Pending
- **Required Changes**:
  - Import `detectEntries` from `visionParser.ts`
  - Use `useWorkbench()` hook
  - Call `workbench.setEntries()` when entries detected
  - Call `workbench.setEntryAreas()` for bbox management
  - Expose bbox edit mode toggle

#### AnchorLabelsStep
- **File**: `components/workbench/steps/AnchorLabelsStep.tsx`
- **Status**: ⏳ Pending
- **Required Changes**:
  - Import `detectLabels` from `visionParser.ts`
  - Use `useWorkbench()` hook
  - Call `workbench.dispatch({ type: 'SET_DETECTED_LABELS' })`
  - Use `labelDictionary()` from registry

#### MapFieldsStep
- **File**: `components/workbench/steps/MapFieldsStep.tsx`
- **Status**: ⏳ Pending
- **Required Changes**:
  - Import `autoMapFields` from `visionParser.ts`
  - Use `useWorkbench()` hook
  - Use `getRecordSchema()` for field definitions
  - Call `workbench.setFieldValues()` for auto-map
  - Call `workbench.setFieldValue()` for manual edits
  - Remove any `FIELD_DEFINITIONS` / `RECORD_FIELDS` references

#### ReviewCommitStep
- **File**: `components/workbench/steps/ReviewCommitStep.tsx`
- **Status**: ⏳ Pending
- **Required Changes**:
  - Move logic from `ReviewFinalizeTab.tsx`
  - Use `useWorkbench()` hook
  - Read `fieldValues` from workbench state
  - Use `mapFieldKeyToDbColumn()` at API boundary
  - Handle `child_name` → `first_name`/`last_name` split

### 3. Canonical Keys Audit
- **Status**: ⏳ Pending
- **Decision Needed**:
  - Keep `child_name` as canonical key?
  - Add `splitChildName()` helper in `recordFieldMapper.ts`?
  - Use in ReviewCommitStep before DB save?

### 4. Remove Dead UI Paths
- **Status**: ⏳ Pending
- **Files to Deprecate**:
  - `components/InspectionPanel.tsx` - Mark as deprecated
  - `components/ProcessedImagesTable.tsx` - Mark as deprecated
  - `components/MappingTab.tsx` - Mark as deprecated (after MapFieldsStep wired)

## Next Steps

1. **Fix WorkbenchViewer imports** (parseVisionResponse, VisionResponse)
2. **Refactor EnhancedOCRUploader** to use Workbench
3. **Wire DetectEntriesStep** with entry detection logic
4. **Wire AnchorLabelsStep** with label detection logic
5. **Wire MapFieldsStep** with field mapping logic
6. **Wire ReviewCommitStep** with review/commit logic
7. **Audit canonical keys** (child_name split)
8. **Remove dead UI paths**

## Migration Map

### FusionTab → Workbench Steps

| FusionTab State | Workbench State | Action |
|----------------|-----------------|--------|
| `entries` | `workbench.state.entries` | `workbench.setEntries()` |
| `entryAreas` | `workbench.state.entryAreas` | `workbench.dispatch({ type: 'SET_ENTRY_AREAS' })` |
| `selectedEntryIndex` | `workbench.state.selectedEntryIndex` | `workbench.setSelectedEntry()` |
| `bboxEditMode` | `workbench.state.bboxEditMode` | `workbench.dispatch({ type: 'SET_BBOX_EDIT_MODE' })` |
| `detectedLabels` | `workbench.state.detectedLabels` | `workbench.dispatch({ type: 'SET_DETECTED_LABELS' })` |
| `mappedFields` | `workbench.state.fieldValues` | `workbench.setFieldValues()` |
| `drafts` | `workbench.state.drafts` | `workbench.setDrafts()` |

### ReviewFinalizeTab → ReviewCommitStep

| ReviewFinalizeTab State | Workbench State | Action |
|------------------------|-----------------|--------|
| `drafts` | `workbench.state.drafts` | `workbench.setDrafts()` |
| `validationResults` | `workbench.state.stepStatus.reviewCommit` | `workbench.dispatch({ type: 'SET_STEP_STATUS' })` |

