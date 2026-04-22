export interface GalleryImage {
  id?: string;
  name: string;
  path: string;
  url: string;
  created?: string;
  modified?: string;
  size?: number;
  type?: string;
  isUsed?: boolean;
  metadataError?: string;
}

export interface UploadStatus {
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export interface SuggestionStatus {
  status: 'pending' | 'valid' | 'invalid' | 'applied' | 'failed';
  message?: string;
  code?: string;
}
