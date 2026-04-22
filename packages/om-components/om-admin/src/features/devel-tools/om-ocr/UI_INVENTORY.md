# Enhanced OCR Uploader - Current UI Inventory

## Detailed Component Analysis

### Current Component Structure

### 1. EnhancedOCRUploader.tsx (Main Container)
**Location**: `front-end/src/features/devel-tools/om-ocr/EnhancedOCRUploader.tsx`

**What it renders on the main page**:
1. **Upload Zone** (lines ~500-700):
   - Drag-and-drop area for batch image uploads
   - File input button
   - Shows upload progress and file count
   - Church selector dropdown (SuperAdmin only)
   - OCR settings panel (collapsible) with engine, DPI, confidence threshold, language options

2. **Upload Queue** (lines ~1100-1214):
   - File cards showing:
     - Thumbnail (64x64px)
     - Filename and file size
     - Record type selector (baptism/marriage/funeral)
     - Progress bar for uploading/processing files
     - Status badge (queued/uploading/processing/complete/error)
     - Remove/Retry buttons
   - Batch progress indicator
   - Pause/Resume upload controls

3. **ProcessedImagesTable** (lines ~1218-1233):
   - Always shown when church is selected
   - Table of completed OCR jobs with columns:
     - Filename
     - Record type
     - Status (completed/failed/processing)
     - Confidence score
     - Created date
   - Actions: View, Copy OCR text, Retry, Delete
   - Filter by status and record type
   - Blur-to-reveal functionality for sensitive data
   - Opens InspectionPanel when clicking "View"

4. **InspectionPanel** (lines ~1236-1312):
   - Conditionally rendered when `showInspectionPanel` is true
   - Split view:
     - Left: Image viewer with zoom/pan, FusionOverlay
     - Right: Tabs (Text, Structured, Mapping, Fusion, Review)
   - Can be replaced by standalone MappingTab if `showMappingTab` is true

5. **MappingTab** (lines ~1272-1293):
   - Conditionally rendered when `showMappingTab` is true
   - Separate full-screen mapping interface
   - Left: Clickable OCR tokens
   - Right: Field mapping form
   - Auto-Map, Save, Create Draft, Send to Review buttons

**Issues**:
- **DUPLICATE JOB LISTS**: Upload Queue (for new uploads) and ProcessedImagesTable (for completed jobs) show different views of the same data
- **DUPLICATE MAPPING**: MappingTab and FusionTab Step 3 both do field mapping
- **CLUTTERED LAYOUT**: Multiple competing interfaces (tabs, separate panels, conditional rendering)
- **NO CLEAR WORKFLOW**: User must navigate between Upload Queue → ProcessedImagesTable → InspectionPanel → MappingTab/FusionTab

### 2. ProcessedImagesTable.tsx
**Location**: `front-end/src/features/devel-tools/om-ocr/components/ProcessedImagesTable.tsx`

**What it renders on the main page**:
- **Jobs Table** (lines ~200-600):
  - Columns: Filename, Record Type, Status, Confidence, Date, Actions
  - Each row shows:
    - Blurred OCR text (click to reveal)
    - Status chip (completed/failed/processing)
    - Confidence score chip (color-coded: green ≥80%, yellow ≥50%, red <50%)
    - Action buttons: View, Copy OCR text, Retry, Delete
  - **Filters** (top of table):
    - Status filter dropdown
    - Record type filter dropdown
    - Search by filename
  - **Bulk Actions** (when rows selected):
    - Retry failed jobs
    - Delete selected jobs
  - **Stats** (above table):
    - Completed count
    - Failed count
    - Total jobs

**Behavior**:
- Clicking "View" opens InspectionPanel with job details
- Clicking "Copy OCR text" copies raw OCR text to clipboard
- "Retry" re-processes failed jobs
- "Delete" removes jobs from database

**Issues**:
- **DUPLICATES Upload Queue**: Both show job lists, but in different formats
- **SEPARATE FROM UPLOAD QUEUE**: New uploads go to Upload Queue, completed jobs go to ProcessedImagesTable - confusing separation
- **NO UNIFIED VIEW**: Can't see all jobs (queued + completed) in one place

### 3. InspectionPanel.tsx
**Location**: `front-end/src/features/devel-tools/om-ocr/components/InspectionPanel.tsx`

**What it renders on the main page**:
- **Split View Layout** (50/50):
  - **Left Side** (lines ~850-1000):
    - Image viewer with:
      - Zoom controls (zoom in/out/fit, slider, percentage input)
      - Pan support (scrollable container)
      - FusionOverlay (bounding boxes, labels, OCR tokens)
      - Edit mode toggle (Edit Entry Areas / Show Field Boxes)
    - Image loads from `job.file_path` or `job.filePath`
    - Overlay shows detected entries, labels, and OCR tokens
  
  - **Right Side** (lines ~300-850):
    - **Tab Navigation** (5 tabs):
      1. **Text Tab** (lines ~400-500):
         - Raw OCR text display
         - Search/filter functionality
         - Copy to clipboard button
         - Highlighted search results
      
      2. **Structured Tab** (lines ~500-600):
         - JSON view of Vision API response
         - Expandable/collapsible tree
         - Copy JSON button
         - Syntax highlighting
      
      3. **Mapping Tab** (lines ~600-700):
         - **DUPLICATES FusionTab Step 3**
         - Left: Clickable OCR tokens
         - Right: Field mapping form
         - Auto-Map button
         - Save mapping, Create draft buttons
         - **ISSUE**: References `FIELD_TO_COLUMN_MAP` (undefined)
      
      4. **Fusion Tab** (lines ~700-850):
         - 4-step vertical stepper:
           - Step 1: Detect Entries (multi-record segmentation)
           - Step 2: Anchor Labels (label detection)
           - Step 3: Map Fields (field mapping with auto-map)
           - Step 4: Save Drafts & Commit
         - Entry list with bounding boxes
         - Field mapping forms
         - Auto-save functionality
         - **ISSUE**: Step 3 duplicates Mapping Tab
      
      5. **Review & Finalize Tab** (lines ~850-900):
         - Draft records table
         - Validation status per draft
         - Commit to database button
         - History of committed records

**Issues**:
- **COMPETING TABS**: 5 tabs compete for attention, no clear workflow
- **DUPLICATE MAPPING**: Mapping Tab and Fusion Tab Step 3 both do field mapping
- **NO CLEAR PROGRESSION**: User must manually switch tabs, no guided workflow
- **RUNTIME ERROR**: Mapping Tab references undefined `FIELD_TO_COLUMN_MAP`

### 4. FusionTab.tsx
**Location**: `front-end/src/features/devel-tools/om-ocr/components/FusionTab.tsx`

**What it renders**:
- 4-step stepper workflow:
  1. **Detect Entries**: Multi-record segmentation
  2. **Anchor Labels**: Label detection and anchoring
  3. **Map Fields**: Field mapping with auto-map
  4. **Save Drafts & Commit**: Save and commit to database
- Entry list with bounding boxes
- Field mapping forms
- Auto-save functionality

**Issues**:
- Rendered inside InspectionPanel as a tab (competing with MappingTab)
- Should be the primary workflow, not a tab option

### 5. MappingTab.tsx
**Location**: `front-end/src/features/devel-tools/om-ocr/components/MappingTab.tsx`

**What it renders**:
- Left: Detected text tokens (clickable)
- Right: Field mapping form
- Auto-Map button
- Save mapping, Create draft, Send to Review buttons

**Issues**:
- **DUPLICATES FusionTab's "Map Fields" step**
- Still references `FIELD_TO_COLUMN_MAP` (causing runtime error)
- Should be removed or integrated into Workbench stepper

### 6. ReviewFinalizeTab.tsx
**Location**: `front-end/src/features/devel-tools/om-ocr/components/ReviewFinalizeTab.tsx`

**What it renders**:
- Draft records table
- Validation status
- Commit to database functionality
- History of committed records

**Issues**:
- Rendered as a tab in InspectionPanel
- Should be step 4 of Workbench stepper

## Current Problems

1. **Duplicate Mapping Surfaces**:
   - MappingTab (in InspectionPanel tabs)
   - FusionTab Step 3 "Map Fields" (in InspectionPanel tabs)
   - Both do the same thing, causing confusion

2. **Duplicate Job Lists**:
   - Upload queue in EnhancedOCRUploader
   - ProcessedImagesTable
   - Both show jobs, but in different formats

3. **Runtime Errors**:
   - `FIELD_TO_COLUMN_MAP is not defined` in MappingTab.tsx:463
   - `allFields is not defined` (already fixed)

4. **No Clear Workflow**:
   - Tabs compete for attention
   - No clear progression from upload → process → map → commit

## Proposed Solution: Two-Phase UI

### Phase 1: Upload/Queue
- Single unified jobs list (replaces Upload Queue + Processed Images)
- Filters: status, record type, confidence, date
- Bulk actions: retry failed, send to review

### Phase 2: Workbench (for selected job)
- Clean stepper workflow (replaces tabs)
- Steps: Detect Entries → Anchor Labels → Map Fields → Review/Commit
- Image viewer with overlays (from InspectionPanel)
- Right rail: step status, blocking reasons
- All mapping happens in Workbench (no duplicate MappingTab)

