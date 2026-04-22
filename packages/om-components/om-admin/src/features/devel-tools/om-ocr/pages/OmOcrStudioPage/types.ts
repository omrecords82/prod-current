export interface Church {
  id: number;
  name: string;
  database_name?: string;
}

export type StepStatus = 'not_started' | 'in_progress' | 'completed';

export interface QueuedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed' | 'error';
  progress: number;
  error?: string;
  jobId?: string;
}

export interface ContractCell {
  row_index: number;
  column_index: number;
  content: string;
  confidence?: number | null;
  token_count?: number;
  needs_review?: boolean;
  reasons?: string[];
}

export interface ContractRow {
  row_index: number;
  type: 'header' | 'row';
  cells: ContractCell[];
}

export interface ContractTable {
  table_number: number;
  row_count: number;
  column_count: number;
  has_header_row: boolean;
  header_content: string;
  rows: ContractRow[];
}

export interface TableExtraction {
  layout_id: string;
  page_number: number;
  tables: ContractTable[];
  total_tokens: number;
  data_tokens: number;
  data_rows: number;
  extracted_at: string;
}

export interface OcrJob {
  id: number;
  church_id: number;
  filename: string;
  status: string;
  record_type: string;
  language: string;
  confidence_score: number | null;
  error_regions: string | null;
  ocr_text: string | null;
  ocr_result: any;
  created_at: string;
  has_table_extraction?: boolean;
  table_extraction?: TableExtraction | null;
  artifacts?: string[];
}

export interface ExtractorField {
  id: number;
  extractor_id: number;
  parent_field_id: number | null;
  name: string;
  key: string;
  field_type: string;
  multiple: boolean;
  instructions: string | null;
  sort_order: number;
}

export interface Extractor {
  id: number;
  name: string;
  description: string | null;
  record_type: string;
  page_mode: string;
  fields: ExtractorField[];
}

export interface StepDef {
  step: number;
  label: string;
  status: StepStatus;
}

export interface StepCardProps {
  step: number;
  title: string;
  status: StepStatus;
  children: React.ReactNode;
}
