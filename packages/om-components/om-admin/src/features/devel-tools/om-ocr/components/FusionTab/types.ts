import type { BBox, VisionResponse } from '../../types/fusion';

export interface FusionTabProps {
  jobId: number;
  churchId: number;
  ocrText: string | null;
  ocrResult: VisionResponse | null;
  recordType: 'baptism' | 'marriage' | 'funeral';
  imageUrl: string | null;
  onHighlightBbox?: (bbox: BBox | null, color?: string) => void;
  onHighlightMultiple?: (bboxes: { bbox: BBox; color: string; label?: string; completed?: boolean; selected?: boolean; entryIndex?: number }[]) => void;
  onSendToReview?: () => void;
  onBboxEditModeChange?: (enabled: boolean) => void;
  onTokenClick?: (tokenId: string, bbox: BBox, text: string) => void;
  onTokenDoubleClick?: (tokenId: string, bbox: BBox, text: string) => void;
  stickyDefaults?: Record<'baptism' | 'marriage' | 'funeral', boolean>;
}
