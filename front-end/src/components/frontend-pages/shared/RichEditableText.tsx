/**
 * RichEditableText — Inline rich-text editor for the live page editor.
 *
 * Parallel to EditableText (plain text), this component uses Tiptap to provide
 * basic formatting: bold, italic, underline, line breaks, and clear formatting.
 *
 * In normal mode, renders the override HTML (sanitized) or falls back to children.
 * In edit mode (super_admin), shows a Tiptap editor with a compact floating toolbar.
 *
 * Content is stored as HTML in page_content with content_type='rich_text'.
 * The server sanitizes HTML before persisting (allowlist: b, strong, i, em, u, br, p, span).
 */

import React, { useRef, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Pencil, RotateCcw, Globe, Bold, Italic, Underline as UnderlineIcon, RemoveFormatting, WrapText } from 'lucide-react';
import { useEditMode } from '@/context/EditModeContext';
import { useAuth } from '@/hooks/useAuth';

const LANG_LABELS: Record<string, string> = { el: 'Greek', ru: 'Russian', ro: 'Romanian', ka: 'Georgian' };

/** Client-side HTML sanitizer — mirrors the server allowlist as defense-in-depth. */
const ALLOWED_TAGS = new Set(['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'span']);

function sanitizeHtmlClient(html: string): string {
  if (!html) return '';
  let result = html;
  // Strip dangerous tag content
  for (const tag of ['script', 'style', 'iframe', 'object', 'embed', 'form']) {
    result = result.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), '');
    result = result.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi'), '');
  }
  // Strip comments
  result = result.replace(/<!--[\s\S]*?-->/g, '');
  // Strip event handlers
  result = result.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // Keep only allowed tags, strip all attributes
  result = result.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/?>/g, (match, tagName) => {
    const lower = tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(lower)) return '';
    if (match.startsWith('</')) return lower === 'br' ? '' : `</${lower}>`;
    return lower === 'br' ? '<br />' : `<${lower}>`;
  });
  return result.trim();
}

interface RichEditableTextProps {
  contentKey: string;
  children: ReactNode;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
}

/** Extract plain text from ReactNode children. */
function childrenToString(children: ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(childrenToString).join('');
  if (React.isValidElement(children) && children.props?.children) {
    return childrenToString(children.props.children);
  }
  return '';
}

/** Toolbar button style helper */
function tbBtn(active: boolean): React.CSSProperties {
  return {
    background: active ? 'rgba(212,175,55,0.3)' : 'transparent',
    border: 'none',
    borderRadius: 4,
    padding: '4px 6px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    color: active ? '#d4af37' : '#e2e8f0',
  };
}

const RichEditableText: React.FC<RichEditableTextProps> = ({
  contentKey,
  children,
  as: Tag = 'span',
  className = '',
}) => {
  const { isEditMode, getContent, updateRichContent, overrides, pendingChanges, resetToDefault, contentTypes, translationStatuses, resolveTranslation } = useEditMode();
  const { isSuperAdmin } = useAuth();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showTranslationStatus, setShowTranslationStatus] = useState(false);

  const fallback = childrenToString(children);
  const displayContent = getContent(contentKey, fallback);
  const hasOverride = overrides[contentKey] !== undefined || pendingChanges[contentKey] !== undefined;
  const isRichType = contentTypes[contentKey] === 'rich_text' || hasOverride;
  const canEdit = isEditMode && isSuperAdmin();

  // Translation status for this key
  const keyStatus = translationStatuses[contentKey];
  const needsUpdateLangs = keyStatus
    ? Object.entries(keyStatus).filter(([, s]) => s.needs_update).map(([lang]) => lang)
    : [];
  const hasTranslationFlags = needsUpdateLangs.length > 0;

  // Configure Tiptap with only the formatting we want
  const extensions = useMemo(() => [
    StarterKit.configure({
      // Disable features we don't want
      heading: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      blockquote: false,
      codeBlock: false,
      code: false,
      horizontalRule: false,
      dropcursor: false,
      gapcursor: false,
      // Keep enabled
      bold: {},
      italic: {},
      strike: false,
      hardBreak: {},
      paragraph: {},
      document: {},
      text: {},
      history: {},
    }),
    Underline,
  ], []);

  const editor = useEditor({
    extensions,
    content: displayContent,
    editable: false,
    onUpdate: ({ editor: ed }) => {
      if (isEditing) {
        updateRichContent(contentKey, ed.getHTML());
      }
    },
  });

  // Sync content when displayContent changes externally (e.g., page load, discard)
  useEffect(() => {
    if (editor && !isEditing) {
      const currentHtml = editor.getHTML();
      if (currentHtml !== displayContent) {
        editor.commands.setContent(displayContent, false);
      }
    }
  }, [displayContent, editor, isEditing]);

  // Toggle editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing);
      if (isEditing) {
        // Focus the editor after making it editable
        setTimeout(() => editor.commands.focus('end'), 0);
      }
    }
  }, [isEditing, editor]);

  const handleStartEdit = useCallback(() => {
    if (!canEdit || isEditing) return;
    setIsEditing(true);
  }, [canEdit, isEditing]);

  const handleStopEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  // Close editor when clicking outside
  useEffect(() => {
    if (!isEditing) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        handleStopEdit();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, handleStopEdit]);

  const handleReset = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    resetToDefault(contentKey);
  }, [contentKey, resetToDefault]);

  // ── Non-edit mode: render sanitized HTML or fallback ──
  if (!canEdit) {
    const ElementTag = Tag as any;
    const isHtml = displayContent !== fallback && /<[a-zA-Z]/.test(displayContent);
    if (isHtml) {
      return (
        <ElementTag
          className={className}
          dangerouslySetInnerHTML={{ __html: sanitizeHtmlClient(displayContent) }}
        />
      );
    }
    return (
      <ElementTag className={className}>
        {displayContent !== fallback ? displayContent : children}
      </ElementTag>
    );
  }

  // ── Edit mode ──
  return (
    <div
      ref={wrapperRef}
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Formatting toolbar — shown only when actively editing */}
      {isEditing && editor && (
        <div
          style={{
            position: 'absolute',
            top: -40,
            left: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            background: '#2d1b4e',
            borderRadius: 6,
            padding: '4px 6px',
            zIndex: 60,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            border: '1px solid rgba(212,175,55,0.3)',
            whiteSpace: 'nowrap',
          }}
        >
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            style={tbBtn(editor.isActive('bold'))}
            title="Bold"
            type="button"
          >
            <Bold size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            style={tbBtn(editor.isActive('italic'))}
            title="Italic"
            type="button"
          >
            <Italic size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            style={tbBtn(editor.isActive('underline'))}
            title="Underline"
            type="button"
          >
            <UnderlineIcon size={14} />
          </button>
          <span style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
          <button
            onClick={() => editor.chain().focus().setHardBreak().run()}
            style={tbBtn(false)}
            title="Line break"
            type="button"
          >
            <WrapText size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
            style={tbBtn(false)}
            title="Clear formatting"
            type="button"
          >
            <RemoveFormatting size={14} />
          </button>
        </div>
      )}

      {/* Editor area */}
      <div
        className={`${className} ${isEditing ? 'outline outline-2 outline-[#d4af37] rounded-sm' : ''}`}
        style={{
          cursor: canEdit ? 'text' : 'default',
          ...(isHovered && !isEditing ? { outline: '2px dashed rgba(212,175,55,0.5)', borderRadius: '2px' } : {}),
        }}
        onClick={handleStartEdit}
      >
        <EditorContent
          editor={editor}
          style={{ display: 'inline' }}
        />
      </div>

      {/* Hover icons — pencil, reset, translation */}
      {isHovered && !isEditing && (
        <span
          style={{
            position: 'absolute',
            top: -8,
            right: -8,
            display: 'inline-flex',
            gap: 2,
            zIndex: 10,
            pointerEvents: 'auto',
          }}
        >
          <span
            style={{
              background: '#2d1b4e',
              borderRadius: 4,
              padding: '2px 4px',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            <Pencil size={12} color="#d4af37" />
          </span>
          {hasOverride && (
            <span
              onClick={handleReset}
              title="Reset to default"
              style={{
                background: '#991b1b',
                borderRadius: 4,
                padding: '2px 4px',
                display: 'inline-flex',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={12} color="#fff" />
            </span>
          )}
          {hasTranslationFlags && (
            <span
              onClick={(e) => { e.stopPropagation(); setShowTranslationStatus(!showTranslationStatus); }}
              title={`${needsUpdateLangs.length} translation(s) need update`}
              style={{
                background: '#b45309',
                borderRadius: 4,
                padding: '2px 4px',
                display: 'inline-flex',
                alignItems: 'center',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <Globe size={12} color="#fff" />
              <span style={{ color: '#fff', fontSize: 9, marginLeft: 2, fontFamily: 'Inter, sans-serif' }}>
                {needsUpdateLangs.length}
              </span>
            </span>
          )}
        </span>
      )}

      {/* Translation status popup */}
      {showTranslationStatus && hasTranslationFlags && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 49 }}
            onClick={() => setShowTranslationStatus(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: 24,
              right: 0,
              width: 210,
              background: '#1e1b2e',
              border: '1px solid rgba(212,175,55,0.3)',
              borderRadius: 8,
              padding: '8px 10px',
              zIndex: 50,
              fontFamily: 'Inter, sans-serif',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ fontSize: 11, color: '#d4af37', fontWeight: 600, marginBottom: 6 }}>
              Translations
            </div>
            {(['el', 'ru', 'ro', 'ka'] as const).map((lang) => {
              const status = keyStatus?.[lang];
              const needsUpdate = status?.needs_update ?? false;
              return (
                <div
                  key={lang}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '3px 0',
                    fontSize: 12,
                    color: '#e2e8f0',
                  }}
                >
                  <span>{LANG_LABELS[lang]}</span>
                  {needsUpdate ? (
                    <span
                      onClick={(e) => { e.stopPropagation(); resolveTranslation(contentKey, lang); }}
                      title={`Mark ${LANG_LABELS[lang]} as up to date`}
                      style={{
                        background: '#92400e',
                        color: '#fbbf24',
                        fontSize: 10,
                        padding: '1px 6px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      Needs update
                    </span>
                  ) : status ? (
                    <span style={{ color: '#4ade80', fontSize: 10, fontWeight: 500 }}>
                      Up to date
                    </span>
                  ) : (
                    <span style={{ color: '#64748b', fontSize: 10 }}>—</span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default RichEditableText;
