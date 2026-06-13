import React from 'react';
import '../ocr-studio-hub.css';

interface OcrStudioHubPanelProps {
  churchLabel?: string;
  children: React.ReactNode;
}

/** Wraps Figma-styled hub content in a scoped panel inside the native OM shell. */
export function OcrStudioHubPanel({ churchLabel, children }: OcrStudioHubPanelProps) {
  return (
    <div className="ocr-studio-hub">
      <div className="ocr-studio-hub-panel">
        {churchLabel ? (
          <div className="mb-4">
            <span className="hub-church-chip">{churchLabel}</span>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
