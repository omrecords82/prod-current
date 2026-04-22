import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Stack,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  PlayArrow as PlayIcon,
  Save as SaveIcon,
  Send as SendIcon,
  Security as SecurityIcon,
  Psychology as PsychologyIcon,
  Timer as TimerIcon,
  Group as GroupIcon
} from '@mui/icons-material';

// Types for questionnaire responses
interface QuestionnaireResponse {
  questionId: string;
  answer: any;
  timestamp: Date;
}

interface QuestionnaireSubmission {
  questionnaireId: string;
  userId?: number;
  responses: QuestionnaireResponse[];
  ageGroup?: string;
  questionnaireTitle?: string;
  progressPercent: number;
  isCompleted: boolean;
}

interface FileUpload {
  id: string;
  name: string;
  content: string;
  isQuestionnaire?: boolean;
  questionnaireMetadata?: {
    id: string;
    fileName: string;
    title: string;
    description: string;
    ageGroup: string;
    type: string;
    version: string;
    author: string;
    estimatedDuration: number;
    questions: any[];
    metadata: any;
  };
}

interface QuestionnairePreviewProps {
  open: boolean;
  onClose: () => void;
  file: FileUpload | null;
  onSubmit: (submission: QuestionnaireSubmission) => void;
}

const QuestionnairePreview: React.FC<QuestionnairePreviewProps> = ({
  open,
  onClose,
  file,
  onSubmit
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [responses, setResponses] = useState<{ [key: string]: any }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [renderError, setRenderError] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Security validation
  const validateTSXContent = (content: string): { isValid: boolean; issues: string[] } => {
    const issues: string[] = [];
    
    // Check for dangerous patterns
    const dangerousPatterns = [
      { pattern: /eval\s*\(/, message: 'eval() calls are not allowed' },
      { pattern: /Function\s*\(/, message: 'Function constructor is not allowed' },
      { pattern: /innerHTML\s*=/, message: 'innerHTML is not allowed' },
      { pattern: /dangerouslySetInnerHTML/, message: 'dangerouslySetInnerHTML is not allowed' },
      { pattern: /document\.write/, message: 'document.write is not allowed' },
      { pattern: /window\./, message: 'Direct window access is restricted' },
      { pattern: /fetch\s*\(/, message: 'fetch calls should be validated' },
      { pattern: /XMLHttpRequest/, message: 'XMLHttpRequest is not allowed' }
    ];

    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(content)) {
        issues.push(message);
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  };

  // Create secure sandbox for component rendering
  const createSecureSandbox = (content: string): string => {
    // Remove dangerous imports and replace with safe alternatives
    const sanitizedContent = content
      .replace(/import\s+.*?from\s+['"][^'"]*?['"];?/g, '') // Remove imports
      .replace(/export\s+default\s+/, '') // Remove export default
      .replace(/export\s+/, ''); // Remove other exports

    // Create sandbox wrapper
    return `
      (function() {
        'use strict';
        
        // Restricted globals
        const window = undefined;
        const document = undefined;
        const global = undefined;
        const process = undefined;
        const require = undefined;
        const module = undefined;
        const exports = undefined;
        
        // Safe React context
        const React = {
          useState: parent.React.useState,
          useEffect: parent.React.useEffect,
          useCallback: parent.React.useCallback,
          useMemo: parent.React.useMemo,
          createElement: parent.React.createElement,
          Fragment: parent.React.Fragment
        };
        
        // Safe UI components (limited subset)
        const { 
          Box, 
          Typography, 
          Button, 
          TextField, 
          Radio, 
          RadioGroup, 
          FormControl, 
          FormLabel, 
          FormControlLabel,
          Checkbox,
          Select,
          MenuItem,
          Slider,
          Stack,
          Card,
          CardContent
        } = parent.MUI;
        
        // Response handler
        const handleResponse = (questionId, answer) => {
          parent.postMessage({
            type: 'QUESTIONNAIRE_RESPONSE',
            data: { questionId, answer }
          }, '*');
        };
        
        // Component code
        ${sanitizedContent}
        
        // Render the component
        try {
          const component = typeof Questionnaire === 'function' 
            ? React.createElement(Questionnaire, { onResponse: handleResponse })
            : React.createElement('div', {}, 'Invalid questionnaire component');
          
          parent.ReactDOM.render(component, document.getElementById('questionnaire-root'));
        } catch (error) {
          parent.postMessage({
            type: 'QUESTIONNAIRE_ERROR',
            data: { message: error.message }
          }, '*');
        }
      })();
    `;
  };

  // Handle component rendering
  const renderComponent = () => {
    if (!file || !file.isQuestionnaire || !file.content) {
      setRenderError('Invalid questionnaire file');
      return;
    }

    const validation = validateTSXContent(file.content);
    if (!validation.isValid) {
      setRenderError(`Security validation failed: ${validation.issues.join(', ')}`);
      return;
    }

    setIsLoading(true);
    setRenderError('');

    try {
      const sandboxCode = createSecureSandbox(file.content);
      
      // Create sandboxed iframe content
      const iframeContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Questionnaire Preview</title>
          <style>
            body { 
              font-family: 'Roboto', sans-serif; 
              margin: 16px; 
              background: #fafafa;
            }
            #questionnaire-root { 
              max-width: 800px; 
              margin: 0 auto; 
              background: white;
              border-radius: 8px;
              padding: 24px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
          </style>
          <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
          <script crossorigin src="https://unpkg.com/@mui/material@latest/umd/material-ui.development.js"></script>
        </head>
        <body>
          <div id="questionnaire-root">
            <div style="text-align: center; padding: 40px;">
              <div style="font-size: 18px; color: #666;">Loading questionnaire...</div>
            </div>
          </div>
          <script>
            // Set up communication
            window.addEventListener('message', function(event) {
              if (event.data.type === 'QUESTIONNAIRE_RESPONSE') {
                parent.postMessage(event.data, '*');
              } else if (event.data.type === 'QUESTIONNAIRE_ERROR') {
                parent.postMessage(event.data, '*');
              }
            });
            
            // Make React and MUI available
            window.React = React;
            window.ReactDOM = ReactDOM;
            window.MUI = MaterialUI;
            
            // Execute sandboxed component
            ${sandboxCode}
          </script>
        </body>
        </html>
      `;

      if (iframeRef.current) {
        const iframe = iframeRef.current;
        iframe.srcdoc = iframeContent;
      }

      setIsLoading(false);
    } catch (error) {
      setRenderError(`Failed to render component: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'QUESTIONNAIRE_RESPONSE') {
        const { questionId, answer } = event.data.data;
        setResponses(prev => ({
          ...prev,
          [questionId]: {
            answer,
            timestamp: new Date()
          }
        }));
      } else if (event.data.type === 'QUESTIONNAIRE_ERROR') {
        setRenderError(event.data.data.message);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Render component when file changes
  useEffect(() => {
    if (open && file && file.isQuestionnaire) {
      renderComponent();
    }
  }, [open, file]);

  // Handle submission
  const handleSubmit = async () => {
    if (!file?.questionnaireMetadata) return;

    setIsSubmitting(true);
    try {
      const submission: QuestionnaireSubmission = {
        questionnaireId: file.questionnaireMetadata.id,
        responses: Object.entries(responses).map(([questionId, response]) => ({
          questionId,
          answer: response.answer,
          timestamp: response.timestamp
        })),
        ageGroup: file.questionnaireMetadata.ageGroup,
        questionnaireTitle: file.questionnaireMetadata.title,
        progressPercent: Object.keys(responses).length > 0 ? 100 : 0,
        isCompleted: true
      };

      await onSubmit(submission);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Submission failed');
    }
    setIsSubmitting(false);
  };

  const responseCount = Object.keys(responses).length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '90vh', display: 'flex', flexDirection: 'column' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PsychologyIcon color="primary" />
          <Typography variant="h6">
            {file?.questionnaireMetadata?.title || 'Questionnaire Preview'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
        {/* Metadata Header */}
        {file?.questionnaireMetadata && (
          <Card sx={{ m: 2, mb: 1 }} variant="outlined">
            <CardContent sx={{ py: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <Chip 
                  icon={<GroupIcon />} 
                  label={file.questionnaireMetadata.ageGroup} 
                  size="small" 
                  color="primary" 
                />
                <Chip 
                  icon={<TimerIcon />} 
                  label={`${file.questionnaireMetadata.estimatedDuration} min`} 
                  size="small" 
                  color="secondary" 
                />
                <Chip 
                  icon={<SecurityIcon />} 
                  label="Sandboxed" 
                  size="small" 
                  color="success" 
                />
                <Typography variant="body2" color="text.secondary">
                  v{file.questionnaireMetadata.version} by {file.questionnaireMetadata.author}
                </Typography>
              </Stack>
              {file.questionnaireMetadata.description && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {file.questionnaireMetadata.description}
                </Typography>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {(error || renderError) && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error || renderError}
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <Stack alignItems="center" spacing={2}>
              <CircularProgress />
              <Typography>Loading questionnaire...</Typography>
            </Stack>
          </Box>
        )}

        {/* Component Preview */}
        {!isLoading && !error && !renderError && (
          <Box sx={{ flex: 1, border: 1, borderColor: 'divider', m: 2, borderRadius: 1 }}>
            <iframe
              ref={iframeRef}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: '4px'
              }}
              sandbox="allow-scripts allow-same-origin"
              title="Questionnaire Preview"
            />
          </Box>
        )}

        {/* Response Summary */}
        {responseCount > 0 && (
          <Card sx={{ m: 2, mt: 0 }} variant="outlined">
            <CardContent sx={{ py: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Responses Collected: {responseCount}
              </Typography>
              <Box sx={{ maxHeight: 100, overflow: 'auto' }}>
                {Object.entries(responses).map(([questionId, response]) => (
                  <Typography key={questionId} variant="body2" color="text.secondary">
                    {questionId}: {JSON.stringify(response.answer).substring(0, 50)}...
                  </Typography>
                ))}
              </Box>
            </CardContent>
          </Card>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={responseCount === 0 || isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={16} /> : <SendIcon />}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Responses'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuestionnairePreview; 