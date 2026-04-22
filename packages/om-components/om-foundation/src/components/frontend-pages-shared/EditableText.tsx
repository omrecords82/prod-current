/**
 * EditableText — Inline-editable text wrapper for the live page editor.
 *
 * In normal mode, renders override text (from DB) or falls back to children.
 * In edit mode (super_admin), text is clickable and editable via contentEditable.
 *
 * IMPORTANT: The contentEditable element must ONLY contain plain text — never
 * React children or sibling elements. Mixing React-managed nodes with
 * contentEditable causes "removeChild" errors when React tries to reconcile
 * a DOM that contentEditable has mutated.
 */

import React, { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';
import { Pencil, RotateCcw, Globe } from 'lucide-react';
import { useEditMode } from '@/context/EditModeContext';
import { useAuth } from '@/hooks/useAuth';

const LANG_LABELS: Record<string, string> = { el: 'Greek', ru: 'Russian', ro: 'Romanian', ka: 'Georgian' };

interface EditableTextProps {
  contentKey: string;
  children: ReactNode;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  multiline?: boolean;
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

const EditableText: React.FC<EditableTextProps> = ({
  contentKey,
  children,
  as: Tag = 'span',
  className = '',
  multiline = false,
}) => {
  const { isEditMode, getContent, updateContent, overrides, pendingChanges, resetToDefault, translationStatuses, resolveTranslation } = useEditMode();
  const { isSuperAdmin } = useAuth();
  const elRef = useRef<HTMLElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showTranslationStatus, setShowTranslationStatus] = useState(false);
  const originalText = useRef('');

  const fallback = childrenToString(children);
  const displayText = getContent(contentKey, fallback);
  const hasOverride = overrides[contentKey] !== undefined || pendingChanges[contentKey] !== undefined;
  const canEdit = isEditMode && isSuperAdmin();

  // Translation status for this key
  const keyStatus = translationStatuses[contentKey];
  const needsUpdateLangs = keyStatus
    ? Object.entries(keyStatus).filter(([, s]) => s.needs_update).map(([lang]) => lang)
    : [];
  const hasTranslationFlags = needsUpdateLangs.length > 0;

  // Sync displayed text via ref — never let React manage contentEditable text nodes.
  // Must also re-run when canEdit changes, because switching to edit mode swaps
  // from a React-children render to the ref-managed element (which starts empty).
  useEffect(() => {
    if (!isEditing && elRef.current) {
      elRef.current.textContent = displayText;
    }
  }, [displayText, isEditing, canEdit]);

  const handleClick = useCallback(() => {
    if (!canEdit || isEditing) return;
    const el = elRef.current;
    if (!el) return;
    originalText.current = el.textContent || '';
    setIsEditing(true);
    el.contentEditable = 'true';
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [canEdit, isEditing]);

  const handleBlur = useCallback(() => {
    const el = elRef.current;
    if (!el) return;
    setIsEditing(false);
    el.contentEditable = 'false';
    const newText = el.textContent || '';
    if (newText !== originalText.current) {
      updateContent(contentKey, newText);
    }
  }, [contentKey, updateContent]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      const el = elRef.current;
      if (el) el.textContent = originalText.current;
      setIsEditing(false);
      if (el) el.contentEditable = 'false';
    } else if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      elRef.current?.blur();
    }
  }, [multiline]);

  const handleReset = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    resetToDefault(contentKey);
  }, [contentKey, resetToDefault]);

  // Non-edit mode: render normally with no extra wrapper overhead
  if (!canEdit) {
    const ElementTag = Tag as any;
    return (
      <ElementTag className={className}>
        {displayText !== fallback ? displayText : children}
      </ElementTag>
    );
  }

  // Edit mode: wrapper div positions icons OUTSIDE the contentEditable element.
  // The contentEditable element contains ONLY plain text (via ref), never React children.
  const ElementTag = Tag as any;
  return (
    <div
      style={{ position: 'relative', display: 'inline' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <ElementTag
        ref={elRef}
        className={`${className} ${isEditing ? 'outline outline-2 outline-[#d4af37] rounded-sm' : ''}`}
        style={{
          cursor: 'text',
          ...(isHovered && !isEditing ? { outline: '2px dashed rgba(212,175,55,0.5)', borderRadius: '2px' } : {}),
        }}
        onClick={handleClick}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        suppressContentEditableWarning
      >
        {displayText}
      </ElementTag>
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

export default EditableText;
