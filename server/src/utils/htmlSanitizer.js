/**
 * htmlSanitizer.js — Allowlist-based HTML sanitizer for rich-text inline editing.
 *
 * Strips all tags except a small allowlist of formatting-only elements.
 * Removes ALL attributes (no styles, no event handlers, no data-*).
 * Removes content inside dangerous tags (script, style, iframe, etc.).
 *
 * This runs server-side before persisting rich_text overrides to page_content.
 * The frontend also limits input via Tiptap's schema (only enabled extensions
 * produce output), so this is a defense-in-depth layer.
 */

'use strict';

/** Tags whose inner content AND the tag itself should be completely removed. */
const STRIP_CONTENT_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'textarea', 'select', 'noscript', 'applet'];

/** Tags allowed in sanitized output (no attributes, self-closing handled). */
const ALLOWED_TAGS = new Set([
  'b', 'strong', 'i', 'em', 'u', 'br', 'p', 'span',
]);

/** Self-closing tags that don't need a closing tag. */
const SELF_CLOSING = new Set(['br']);

/**
 * Sanitize HTML string, keeping only allowed formatting tags.
 * All attributes are stripped. Dangerous tag content is removed.
 *
 * @param {string} html — Raw HTML from the client
 * @returns {string} — Sanitized HTML safe for storage and rendering
 */
function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';

  let result = html;

  // Phase 1: Remove content inside dangerous tags (case-insensitive, handles nesting poorly
  // but that's acceptable — nested scripts inside scripts is not a real concern)
  for (const tag of STRIP_CONTENT_TAGS) {
    const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    result = result.replace(re, '');
    // Also remove self-closing variants: <script/>, <script />
    const selfRe = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi');
    result = result.replace(selfRe, '');
  }

  // Phase 2: Remove HTML comments
  result = result.replace(/<!--[\s\S]*?-->/g, '');

  // Phase 3: Remove any on* event handler attributes that might survive
  // (defense-in-depth — Phase 4 strips all attributes anyway)
  result = result.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Phase 4: Process all HTML tags — keep only allowed tags, strip all attributes
  result = result.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/?>/g, (match, tagName) => {
    const lower = tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(lower)) return '';

    // Detect if this is a closing tag
    if (match.startsWith('</')) {
      return SELF_CLOSING.has(lower) ? '' : `</${lower}>`;
    }

    // Opening tag — strip all attributes, handle self-closing
    if (SELF_CLOSING.has(lower)) {
      return `<${lower} />`;
    }
    return `<${lower}>`;
  });

  // Phase 5: Remove any remaining angle brackets that aren't part of allowed tags
  // This catches malformed/partial tags like "< script" or "<<img"
  // We do this by matching < not followed by an allowed pattern
  const allowedPattern = ALLOWED_TAGS.size > 0
    ? [...ALLOWED_TAGS].join('|')
    : '';
  const safeTagRe = new RegExp(`<(?!\\/?(${allowedPattern})(?:\\s|>|\\/))`, 'gi');
  result = result.replace(safeTagRe, '&lt;');

  // Phase 6: Trim excessive whitespace but preserve intentional line breaks
  result = result.trim();

  return result;
}

/**
 * Check if a string contains any HTML tags (used to auto-detect content type).
 * @param {string} str
 * @returns {boolean}
 */
function containsHtml(str) {
  if (!str || typeof str !== 'string') return false;
  return /<[a-zA-Z][^>]*>/.test(str);
}

module.exports = { sanitizeHtml, containsHtml };
