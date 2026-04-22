/**
 * createTaskTypes — Shared constants, interfaces, and utility functions
 * for the CreateTaskDialog component.
 * Extracted from CreateTaskDialog.tsx
 */

// Categories from requirements
export const TASK_CATEGORIES = [
  'Ingestion & Digitization',
  'Data Structuring & Accuracy',
  'Workflow & User Experience',
  'Platform & Infrastructure',
  'Analytics & Intelligence'
];

// Importance levels (B12-15 list - using common task priority levels)
export const IMPORTANCE_LEVELS = [
  { value: 'critical', label: 'Critical', color: 'error' },
  { value: 'high', label: 'High', color: 'warning' },
  { value: 'medium', label: 'Medium', color: 'info' },
  { value: 'low', label: 'Low', color: 'default' }
];

// Status levels (1-7, including Assigned)
export const TASK_STATUSES = [
  { value: 1, label: 'Not Started' },
  { value: 2, label: 'Assigned' },
  { value: 3, label: 'In Progress' },
  { value: 4, label: 'In Review' },
  { value: 5, label: 'Blocked' },
  { value: 6, label: 'On Hold' },
  { value: 7, label: 'Task Completed' }
];

// Visibility options
export const VISIBILITY_OPTIONS = [
  { value: 'admin', label: 'Admin Only' },
  { value: 'public', label: 'Public' }
];

// Type options (required field)
export const TASK_TYPES = [
  { value: 'documentation', label: 'Documentation', description: 'Descriptive overview of a feature/system (what it is, how it works at a high level)' },
  { value: 'configuration', label: 'Configuration', description: 'Setup, env vars, flags, settings, install/runtime configuration' },
  { value: 'reference', label: 'Reference', description: 'Authoritative, technical, exhaustive details (APIs, schemas, fields, rules, edge cases)' },
  { value: 'guide', label: 'Guide', description: 'Step-by-step, task-oriented instructions (how to do X)' }
];

// Predefined tag groups (seed list)
export const TAG_GROUPS = [
  {
    group: 'OCR & Ingestion',
    tags: [
      'ocr',
      'google-vision',
      'document-ai',
      'handwriting',
      'printed-text',
      'language-filtering',
      'bounding-box',
      'anchors',
      'layout-detection',
      'entry-detection',
      'confidence-threshold',
      'preprocessing',
      'image-quality',
      'dpi'
    ]
  },
  {
    group: 'Data & Records',
    tags: [
      'baptism',
      'marriage',
      'funeral',
      'clergy',
      'parish',
      'records',
      'schema',
      'field-mapping',
      'normalization',
      'validation',
      'duplicates',
      'historical-data'
    ]
  },
  {
    group: 'Workflow & UI',
    tags: [
      'fusion',
      'inspection-panel',
      'review-finalize',
      'drafts',
      'overlays',
      'highlights',
      'entry-editor',
      'empty-state',
      'autosave',
      'modal',
      'ux',
      'ui'
    ]
  },
  {
    group: 'Platform & Backend',
    tags: [
      'api',
      'database',
      'migrations',
      'auth',
      'roles',
      'permissions',
      'logging',
      'error-handling',
      'performance',
      'security',
      'backups',
      'infrastructure'
    ]
  },
  {
    group: 'Analytics & Intelligence',
    tags: [
      'analytics',
      'reports',
      'trends',
      'dashboards',
      'charts',
      'metrics',
      'omai',
      'bigbook',
      'search',
      'summarization',
      'insights'
    ]
  },
  {
    group: 'Documentation Meta',
    tags: [
      'docs',
      'reference',
      'guide',
      'configuration',
      'legacy',
      'task-history',
      'public',
      'admin-only'
    ]
  },
  {
    group: 'Status / Process',
    tags: [
      'blocked',
      'needs-review',
      'needs-design',
      'needs-backend',
      'needs-frontend',
      'high-risk',
      'breaking-change',
      'cleanup',
      'tech-debt'
    ]
  }
];

// Flatten all predefined tags for autocomplete
export const ALL_PREDEFINED_TAGS = TAG_GROUPS.flatMap(group => group.tags);

/**
 * Normalize tag to kebab-case
 * Converts spaces, underscores, and other separators to hyphens
 * Converts to lowercase
 */
export const normalizeTag = (tag: string): string => {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')  // Replace spaces and underscores with hyphens
    .replace(/[^a-z0-9-]/g, '')  // Remove invalid characters
    .replace(/-+/g, '-')  // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '');  // Remove leading/trailing hyphens
};

// ─── Interfaces ─────────────────────────────────────────────────────────────
export interface TaskRevision {
  rev_index: number;
  rev_number: number | null;
  title: string;
  markdown: string;
}

export interface TaskFormData {
  title: string;
  category: string;
  importance: string;
  details: string;
  tags: string[];
  attachments: string[];
  status: number;
  type: 'documentation' | 'configuration' | 'reference' | 'guide';
  visibility: 'admin' | 'public';
  date_created?: string;
  date_completed?: string;
  assignedTo?: string;
  assignedBy?: string;
  notes?: string;
  remindMe?: boolean;
  revisions?: TaskRevision[];
}

export interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (taskData: TaskFormData) => Promise<void>;
}

// ─── Storage Constants ──────────────────────────────────────────────────────
export const DRAFT_STORAGE_KEY = 'om_tasks:create_task_draft:v1';
export const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
export const DEBOUNCE_DELAY = 300; // ms
