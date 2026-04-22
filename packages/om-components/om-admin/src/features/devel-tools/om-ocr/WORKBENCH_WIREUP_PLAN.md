# Workbench Wireup Plan

## Current EnhancedOCRUploader.tsx Render Tree

```
EnhancedOCRUploader
├── Upload Zone (drag-and-drop)
├── Upload Controls (Start/Pause/Clear)
├── Upload Queue (FileCard components)
├── ProcessedImagesTable (when church selected)
└── InspectionPanel (when showInspectionPanel)
    ├── Left: Image viewer + FusionOverlay
    └── Right: Tabs
        ├── Text Tab
        ├── Structured Tab
        ├── Mapping Tab (DUPLICATE)
        ├── Fusion Tab (4-step workflow)
        └── Review Tab
```

## Target EnhancedOCRUploader.tsx Render Tree

```
EnhancedOCRUploader
├── Upload Zone (drag-and-drop) - KEEP
├── Upload Controls (Start/Pause/Clear) - KEEP
└── WorkbenchProvider
    └── OcrWorkbench
        ├── Phase 1: UnifiedJobsList (when no job selected)
        │   └── Shows: Upload Queue + Processed Jobs (unified)
        └── Phase 2: Workbench (when job selected)
            ├── WorkbenchHeader
            └── Split View
                ├── Left: WorkbenchViewer (image + overlays)
                └── Right: WorkbenchStepper
                    ├── Step 1: DetectEntriesStep
                    ├── Step 2: AnchorLabelsStep
                    ├── Step 3: MapFieldsStep
                    └── Step 4: ReviewCommitStep
```

## Migration Strategy

### Step 1: Replace Render Tree
- Remove `ProcessedImagesTable` rendering
- Remove `InspectionPanel` rendering
- Remove `MappingTab` standalone rendering
- Add `WorkbenchProvider` wrapper
- Add `OcrWorkbench` component
- Keep upload functionality (upload zone, controls, queue)

### Step 2: Logic Migration Map

#### DetectEntriesStep
**Source**: `FusionTab.tsx` lines ~850-900
- `detectEntries(ocrResult, ocrText)` from `visionParser.ts`
- `setEntries()` → `workbench.setEntries()`
- `entryAreas` management → `workbench.entryAreas`
- Bbox editing → `workbench.updateEntryArea()`

**State Migration**:
- `entries` → `workbench.state.entries`
- `entryAreas` → `workbench.state.entryAreas`
- `selectedEntryIndex` → `workbench.state.selectedEntryIndex`
- `bboxEditMode` → `workbench.state.bboxEditMode`

#### AnchorLabelsStep
**Source**: `FusionTab.tsx` lines ~520-600
- `detectLabels(entry, recordType)` from `visionParser.ts`
- `setDetectedLabels()` → `workbench.dispatch({ type: 'SET_DETECTED_LABELS' })`
- Label dictionary from registry: `labelDictionary(recordType)`

**State Migration**:
- `detectedLabels` → `workbench.state.detectedLabels`
- `labelCandidates` → `workbench.state.labelCandidates`

#### MapFieldsStep
**Source**: `FusionTab.tsx` lines ~1400-1800
- `autoMapFields()` from `visionParser.ts` (already uses canonical keys)
- `setMappedFields()` → `workbench.setFieldValues()`
- Field schema from registry: `getRecordSchema(recordType)`
- Manual field edits → `workbench.setFieldValue()`

**State Migration**:
- `mappedFields` → `workbench.state.fieldValues` (keyed by canonical schema key)
- `fieldExtractions` → `workbench.state.fieldExtractions`

#### ReviewCommitStep
**Source**: `ReviewFinalizeTab.tsx` lines ~130-400
- `loadDrafts()` → Load from workbench state
- `createDraft()` → `workbench.setDrafts()`
- `commitToDatabase()` → Use `mapFieldKeyToDbColumn()` at API boundary

**State Migration**:
- `drafts` → `workbench.state.drafts`
- Validation → `workbench.state.stepStatus.reviewCommit`

### Step 3: Canonical Keys Audit

**Current Schema** (from registry.ts):
- `child_name` (canonical key) → maps to `first_name` (DB column)
- `date_of_birth` (canonical key) → maps to `birth_date` (DB column)
- `date_of_baptism` (canonical key) → maps to `reception_date` (DB column)

**Decision**: Keep `child_name` as canonical key
- UI shows "Name of Child" field
- Auto-map extracts full name into `child_name`
- At save time, split `child_name` into `first_name` and `last_name` for DB

**Implementation**:
- Add `splitChildName()` helper in `recordFieldMapper.ts`
- Use in ReviewCommitStep before calling `mapFieldKeyToDbColumn()`

### Step 4: File Changes

**New Files**:
1. `context/WorkbenchContext.tsx` - Shared state
2. Updated step components (wire with existing logic)

**Modified Files**:
1. `EnhancedOCRUploader.tsx` - Replace render tree
2. `components/workbench/OcrWorkbench.tsx` - Load job data, handle selection
3. `components/workbench/steps/*.tsx` - Wire with FusionTab/ReviewFinalizeTab logic

**Deprecated Files** (keep but don't render):
1. `components/InspectionPanel.tsx` - Mark as deprecated
2. `components/ProcessedImagesTable.tsx` - Mark as deprecated
3. `components/MappingTab.tsx` - Mark as deprecated (after MapFieldsStep wired)

