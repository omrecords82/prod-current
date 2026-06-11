import type { ReactNode } from 'react';
import { useEffect } from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Accessible label when title is omitted */
  ariaLabel?: string;
}

export function Modal({ open, onClose, title, children, ariaLabel }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="om-ds-modal-backdrop flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="om-ds-modal"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
      >
        {title && <h2 className="om-text-h4 mb-4">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
