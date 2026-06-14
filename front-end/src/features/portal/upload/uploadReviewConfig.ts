export type ReviewStatus =
  | 'uploaded'
  | 'ocr_complete'
  | 'agent_extracted'
  | 'ready_to_seed'
  | 'seeded'
  | 'returned'
  | 'pending_review'
  | 'in_review'
  | 'processed';

export interface ReviewStatusMeta {
  label: string;
  color: string;
  description: string;
  step: number;
}

export const REVIEW_STATUS_CONFIG: Record<ReviewStatus, ReviewStatusMeta> = {
  uploaded: { label: 'Uploaded', color: '#9e9e9e', description: 'Image received, queued for OCR', step: 1 },
  ocr_complete: { label: 'OCR Complete', color: '#03a9f4', description: 'Text recognized from image', step: 2 },
  agent_extracted: { label: 'Review Fields', color: '#ff9800', description: 'Agent extracted fields — confirm in Review', step: 3 },
  ready_to_seed: { label: 'Ready to Seed', color: '#673ab7', description: 'Confirmed — ready for database insert', step: 4 },
  seeded: { label: 'Seeded', color: '#4caf50', description: 'Records inserted into parish database', step: 5 },
  returned: { label: 'Returned', color: '#f44336', description: 'Needs attention — see notes', step: 0 },
  pending_review: { label: 'Pending Review', color: '#ff9800', description: 'Legacy status', step: 2 },
  in_review: { label: 'Under Review', color: '#2196f3', description: 'Legacy status', step: 3 },
  processed: { label: 'Processed', color: '#4caf50', description: 'Legacy status', step: 4 },
};

/** Primary OCR pipeline stages shown in portal workflow UI */
export const REVIEW_PIPELINE_STEPS: ReviewStatus[] = [
  'uploaded',
  'ocr_complete',
  'agent_extracted',
  'ready_to_seed',
  'seeded',
];

export function reviewStatusCounts(jobs: { review_status: string }[]): Record<string, number> {
  const counts: Record<string, number> = { all: jobs.length };
  for (const job of jobs) {
    counts[job.review_status] = (counts[job.review_status] || 0) + 1;
  }
  return counts;
}
