/**
 * WorkbenchRightPanel — Tabbed right panel with Transcription, Field Mapping,
 * Templates, Artifacts, and Corrections tabs.
 * Extracted from OcrWorkbench.tsx
 */

import React from 'react';
import {
  Box,
  Tab,
  Tabs,
} from '@mui/material';
import TranscriptionPanel from '../TranscriptionPanel';
import FieldMappingPanel from '../FieldMappingPanel';
import TemplateBuilder from '../TemplateBuilder';
import ArtifactInspector from './ArtifactInspector';
import CorrectionsViewer from './CorrectionsViewer';
import type { SuggestionResult } from '../../utils/fieldSuggestions';

interface WorkbenchRightPanelProps {
  rightTab: number;
  onRightTabChange: (tab: number) => void;
  // Transcription tab props
  ocrText: string | null;
  normalizedText: string | null;
  ocrTextLoading: boolean;
  normalizing: boolean;
  onCopy: () => void;
  onDownload: () => void;
  onNormalize?: () => void;
  onRerunOcr?: () => void;
  rerunning: boolean;
  onDownloadArtifact?: () => void;
  // Field Mapping tab props
  selectedJobId: number | null;
  churchId: number;
  ocrTextForMapping: string | null;
  jobOcrResult: any;
  tableExtraction: any;
  recordCandidates: any;
  initialRecordType: string;
  jobIsFinalized: boolean;
  jobFinalizedMeta: { finalizedAt: string; createdRecordId: number } | null;
  selectedRecordIndex: number | null;
  onRecordSelect: (idx: number | null) => void;
  focusedField: string | null;
  onFieldFocus: (field: string | null) => void;
  externalFieldUpdate: { fieldKey: string; text: string; mode: 'append' | 'replace' } | null;
  onExternalFieldUpdateHandled: () => void;
  onOpenLayoutWizard: () => void;
  autoExtracting: boolean;
  fieldSuggestions: SuggestionResult | null;
  scoringV2: any;
  onRejectRecord: (sourceRowIndex: number) => void;
  onFinalized: (result: any) => void;
  // Templates tab
  onTemplateCreated: (templateId: number) => void;
  // Artifacts tab
  currentFeederPage: any;
  tableExtractionJson: any;
  onHighlightBbox: (bbox: [number, number, number, number], label: string) => void;
}

const WorkbenchRightPanel: React.FC<WorkbenchRightPanelProps> = ({
  rightTab,
  onRightTabChange,
  ocrText,
  normalizedText,
  ocrTextLoading,
  normalizing,
  onCopy,
  onDownload,
  onNormalize,
  onRerunOcr,
  rerunning,
  onDownloadArtifact,
  selectedJobId,
  churchId,
  ocrTextForMapping,
  jobOcrResult,
  tableExtraction,
  recordCandidates,
  initialRecordType,
  jobIsFinalized,
  jobFinalizedMeta,
  selectedRecordIndex,
  onRecordSelect,
  focusedField,
  onFieldFocus,
  externalFieldUpdate,
  onExternalFieldUpdateHandled,
  onOpenLayoutWizard,
  autoExtracting,
  fieldSuggestions,
  scoringV2,
  onRejectRecord,
  onFinalized,
  onTemplateCreated,
  currentFeederPage,
  tableExtractionJson,
  onHighlightBbox,
}) => {
  return (
    <Box sx={{ width: '50%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Tabs
        value={rightTab}
        onChange={(_, v) => onRightTabChange(v)}
        variant="fullWidth"
        sx={{
          minHeight: 40,
          borderBottom: '1px solid',
          borderColor: 'divider',
          '& .MuiTab-root': { minHeight: 40, fontSize: '0.8rem', textTransform: 'none', fontWeight: 600 },
        }}
      >
        <Tab label="Transcription" />
        <Tab label="Field Mapping" />
        <Tab label="Templates" />
        <Tab label="Artifacts" />
        <Tab label="Corrections" />
      </Tabs>
      <Box sx={{ flex: 1, overflow: 'hidden', p: 2 }}>
        {rightTab === 0 && (
          <TranscriptionPanel
            ocrText={ocrText}
            serverNormalizedText={normalizedText}
            loading={ocrTextLoading}
            normalizing={normalizing}
            onCopy={onCopy}
            onDownload={onDownload}
            onNormalize={onNormalize}
            onRerunOcr={onRerunOcr}
            rerunning={rerunning}
            onDownloadArtifact={onDownloadArtifact}
          />
        )}
        {rightTab === 1 && selectedJobId && (
          <FieldMappingPanel
            jobId={selectedJobId}
            churchId={churchId}
            ocrText={ocrTextForMapping}
            ocrResult={jobOcrResult}
            tableExtraction={tableExtraction}
            recordCandidates={recordCandidates}
            initialRecordType={initialRecordType}
            isFinalized={jobIsFinalized}
            finalizedMeta={jobFinalizedMeta}
            selectedRecordIndex={selectedRecordIndex}
            onRecordSelect={onRecordSelect}
            focusedField={focusedField}
            onFieldFocus={onFieldFocus}
            externalFieldUpdate={externalFieldUpdate}
            onExternalFieldUpdateHandled={onExternalFieldUpdateHandled}
            onOpenLayoutWizard={onOpenLayoutWizard}
            autoExtracting={autoExtracting}
            fieldSuggestions={fieldSuggestions}
            scoringV2={scoringV2}
            onRejectRecord={onRejectRecord}
            onFinalized={onFinalized}
          />
        )}
        {rightTab === 2 && (
          <TemplateBuilder
            churchId={churchId}
            onTemplateCreated={onTemplateCreated}
          />
        )}
        {rightTab === 3 && (
          <Box sx={{ height: '100%', mx: -2, mt: -2 }}>
            <ArtifactInspector
              page={currentFeederPage}
              scoringV2={scoringV2}
              recordCandidates={recordCandidates}
              tableExtraction={tableExtractionJson}
              onHighlightBbox={onHighlightBbox}
            />
          </Box>
        )}
        {rightTab === 4 && selectedJobId && (
          <Box sx={{ height: '100%', mx: -2, mt: -2 }}>
            <CorrectionsViewer
              churchId={churchId}
              jobId={selectedJobId}
              onHighlightBbox={onHighlightBbox}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default WorkbenchRightPanel;
