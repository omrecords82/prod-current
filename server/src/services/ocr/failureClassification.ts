/**
 * Classify OCR job failures for operator-actionable error messages.
 */

export type OcrFailureCategory =
  | 'image_quality'
  | 'unknown_layout'
  | 'rule_blocker'
  | 'vision_api'
  | 'worker_error';

const PATTERNS: { category: OcrFailureCategory; re: RegExp }[] = [
  { category: 'unknown_layout', re: /unknown layout|no (approved )?template|extractor/i },
  { category: 'vision_api', re: /vision|gemini|openai|api error|429|503/i },
  { category: 'image_quality', re: /rotation|unreadable|blur|dpi|image quality/i },
  { category: 'rule_blocker', re: /rule|blocker|blocked by/i },
];

export function classifyOcrFailure(message: string, hint?: OcrFailureCategory): OcrFailureCategory {
  if (hint) return hint;
  const text = message || '';
  for (const { category, re } of PATTERNS) {
    if (re.test(text)) return category;
  }
  return 'worker_error';
}

export function formatClassifiedError(category: OcrFailureCategory, message: string): string {
  const base = (message || 'Unknown error').replace(/^\[[\w_]+\]\s*/, '');
  return `[${category}] ${base}`;
}
