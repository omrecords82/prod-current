export interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  recordType: 'baptism' | 'marriage' | 'funeral';
  status: 'queued' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  error?: string;
  thumbnail?: string;
  jobId?: string;
  isSimulation?: boolean;
}

export interface Church {
  id: number;
  name: string;
  database_name: string;
}

export interface OCRSettings {
  engine: string;
  dpi: number;
  confidenceThreshold: number;
  autoDetectLanguage: boolean;
  forceGrayscale: boolean;
  deskewImages: boolean;
  language: string;
}

export interface DocumentProcessingSettings {
  transcriptionMode: 'exact' | 'fix-spelling';
  textExtractionScope: 'all' | 'handwritten-only';
  formattingMode: 'improve-formatting' | 'preserve-original';
}

export type ExtractionAction = 'full-text' | 'tables' | 'custom-data';

export interface SettingsPanelProps {
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  docSettings: DocumentProcessingSettings;
  setDocSettings: React.Dispatch<React.SetStateAction<DocumentProcessingSettings>>;
  showToast: (message: string, severity: 'success' | 'warning' | 'error' | 'info') => void;
  extractionAction: ExtractionAction;
  setExtractionAction: (v: ExtractionAction) => void;
}

export interface AdvancedOptionsPanelProps {
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  settings: OCRSettings;
  setSettings: React.Dispatch<React.SetStateAction<OCRSettings>>;
  uploadPath: string;
  stickyDefaults: Record<'baptism' | 'marriage' | 'funeral', boolean>;
  setStickyDefaults: React.Dispatch<React.SetStateAction<Record<'baptism' | 'marriage' | 'funeral', boolean>>>;
}
