/**
 * Inspection Panel Types
 * Shared types used by InspectionPanel and other components
 */

export interface BoundingBox {
  vertices: Array<{ x: number; y: number }>;
}

export interface TextAnnotation {
  description: string;
  boundingPoly?: BoundingBox;
  confidence?: number;
}

export interface FullTextAnnotation {
  pages?: Array<{
    blocks?: Array<{
      paragraphs?: Array<{
        words?: Array<{
          symbols?: Array<{
            text: string;
            confidence?: number;
          }>;
          boundingBox?: BoundingBox;
          confidence?: number;
        }>;
        boundingBox?: BoundingBox;
      }>;
      boundingBox?: BoundingBox;
      confidence?: number;
    }>;
    confidence?: number;
  }>;
  text?: string;
}

export interface OCRResult {
  textAnnotations?: TextAnnotation[];
  fullTextAnnotation?: FullTextAnnotation;
}

export interface JobDetail {
  id: string;
  filename?: string;
  original_filename?: string;
  originalFilename?: string;
  file_path?: string;
  filePath?: string;
  status: string;
  record_type?: string;
  recordType?: string;
  language?: string;
  confidence_score?: number;
  confidenceScore?: number;
  file_size?: number;
  fileSize?: number;
  mime_type?: string;
  mimeType?: string;
  church_id?: number;
  churchId?: number;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  ocr_text?: string | null;
  ocrText?: string | null;
  ocr_result?: OCRResult | null;
  ocrResultJson?: OCRResult | null;
  mapping?: any | null;
  error?: string | null;
}

