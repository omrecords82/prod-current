import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Paper,
  Stack,
  Collapse,
  Divider,
  FormControl,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  FormLabel,
  Tooltip,
} from '@mui/material';
import {
  IconChevronDown,
  IconChevronUp,
  IconInfoCircle,
  IconSettings,
} from '@tabler/icons-react';
import type { SettingsPanelProps, ExtractionAction } from './types';

/**
 * Inline label with an info tooltip icon. Keeps FormLabel styling and
 * attaches an explanation accessible via hover/tap.
 */
const LabelWithInfo: React.FC<{ label: string; tip: string }> = ({ label, tip }) => (
  <FormLabel sx={{ mb: 1, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
    {label}
    <Tooltip title={tip} arrow placement="right">
      <Box
        component="span"
        sx={{ display: 'inline-flex', color: 'text.secondary', cursor: 'help' }}
        aria-label={`${label} info`}
      >
        <IconInfoCircle size={16} />
      </Box>
    </Tooltip>
  </FormLabel>
);

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  showAdvanced,
  setShowAdvanced,
  docSettings,
  setDocSettings,
  showToast,
  extractionAction,
  setExtractionAction,
}) => (
  <Paper
    elevation={0}
    sx={{
      mb: 3,
      borderRadius: 2,
      border: '1px solid',
      borderColor: 'divider',
      overflow: 'hidden',
    }}
  >
    <Box
      sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        '&:hover': { bgcolor: 'action.hover' }
      }}
      onClick={() => setShowAdvanced(!showAdvanced)}
    >
      <IconSettings size={20} style={{ marginRight: 12 }} />
      <Typography variant="subtitle1" fontWeight={600}>
        Settings
      </Typography>
      <Box sx={{ ml: 'auto' }}>
        {showAdvanced ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
      </Box>
    </Box>

    <Collapse in={showAdvanced}>
      <Divider />
      <Box sx={{ p: 3 }}>
        {/* Document Processing Settings */}
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              Document processing
            </Typography>
            <Chip label="Customize AI" size="small" color="primary" variant="outlined" />
            <Chip label="Experimental" size="small" color="warning" variant="outlined" />
          </Stack>

          <Stack spacing={2.5}>
            <FormControl fullWidth>
              <LabelWithInfo
                label="Transcription mode"
                tip="Choose 'Exactly as written' to preserve original spelling — recommended for historical accuracy and archival transcription. Choose 'Fix spelling' when you want cleaner output for search and export, at the cost of losing the source's original wording."
              />
              <Select
                value={docSettings.transcriptionMode}
                onChange={(e) => {
                  setDocSettings(s => ({ ...s, transcriptionMode: e.target.value as any }));
                  showToast('Settings saved', 'success');
                }}
                size="small"
              >
                <MenuItem value="exact">Transcribe exactly as written</MenuItem>
                <MenuItem value="fix-spelling">Fix spelling mistakes</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <LabelWithInfo
                label="Text extraction scope"
                tip="'Extract all text' captures both printed and handwritten content (recommended). 'Handwritten only' attempts to skip printed header/footer text — note this mode is experimental and not yet supported by the current engine."
              />
              <Select
                value={docSettings.textExtractionScope}
                onChange={(e) => {
                  setDocSettings(s => ({ ...s, textExtractionScope: e.target.value as any }));
                  if (e.target.value === 'handwritten-only') {
                    showToast('Handwritten-only not supported for this engine yet.', 'warning');
                  } else {
                    showToast('Settings saved', 'success');
                  }
                }}
                size="small"
              >
                <MenuItem value="all">Extract all text</MenuItem>
                <MenuItem value="handwritten-only">Extract handwritten text only</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <LabelWithInfo
                label="Formatting mode"
                tip="Applies light post-processing to line breaks, spacing, and paragraph structure for better human readability. Does not change the words themselves."
              />
              <Select
                value={docSettings.formattingMode}
                onChange={(e) => {
                  setDocSettings(s => ({ ...s, formattingMode: e.target.value as any }));
                  showToast('Settings saved', 'success');
                }}
                size="small"
              >
                <MenuItem value="improve-formatting">Improving formatting for better readability</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Action Selector */}
        <Box>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              Choose an action
            </Typography>
            <Tooltip
              title="Controls how OCR output is structured. 'Full Text' is the default and works for most ledger pages. Table and Custom Data extraction are experimental and currently disabled."
              arrow
              placement="right"
            >
              <Box component="span" sx={{ display: 'inline-flex', color: 'text.secondary', cursor: 'help' }} aria-label="Action info">
                <IconInfoCircle size={16} />
              </Box>
            </Tooltip>
          </Stack>
          <RadioGroup
            value={extractionAction}
            onChange={(e) => setExtractionAction(e.target.value as ExtractionAction)}
          >
            <FormControlLabel
              value="full-text"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    Extract Full Text
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Extract all text from the document
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="tables"
              control={<Radio disabled />}
              label={
                <Box>
                  <Typography variant="body2" fontWeight={500} color="text.disabled">
                    Extract Tables
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Coming soon
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="custom-data"
              control={<Radio disabled />}
              label={
                <Box>
                  <Typography variant="body2" fontWeight={500} color="text.disabled">
                    Extract Custom Data
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Coming soon
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </Box>
      </Box>
    </Collapse>
  </Paper>
);

export default SettingsPanel;
