import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? `om-input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="om-text-small font-medium om-text-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={['om-ds-input', error ? 'border-red-500/60' : '', className].filter(Boolean).join(' ')}
          {...props}
        />
        {error && <span className="om-text-caption text-red-600 dark:text-red-400">{error}</span>}
      </div>
    );
  },
);

Input.displayName = 'Input';
