import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Collapse,
  Divider,
  Paper,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  IconChevronDown,
  IconChevronUp,
  IconInfoCircle,
  IconSettings,
} from '@tabler/icons-react';
import RecordSchemaInfoPopover from '../components/RecordSchemaInfoPopover';
import type { AdvancedOptionsPanelProps } from './types';

/** Small inline info icon with a tooltip — used beside setting labels. */
const InfoTip: React.FC<{ tip: string; ariaLabel: string }> = ({ tip, ariaLabel }) => (
  <Tooltip title={tip} arrow placement="right">
    <Box
      component="span"
      sx={{ display: 'inline-flex', color: 'text.secondary', cursor: 'help', ml: 0.5 }}
      aria-label={ariaLabel}
    >
      <IconInfoCircle size={16} />
    </Box>
  </Tooltip>
);

const AdvancedOptionsPanel: React.FC<AdvancedOptionsPanelProps> = ({
  showAdvanced,
  setShowAdvanced,
  settings,
  setSettings,
  uploadPath,
  stickyDefaults,
  setStickyDefaults,
}) => (
  <Paper elevation={0} sx={{ mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
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
        Advanced Options
      </Typography>
      <Box sx={{ ml: 'auto' }}>
        {showAdvanced ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
      </Box>
    </Box>

    <Collapse in={showAdvanced}>
      <Divider />
      <Box sx={{ p: 3 }}>
        <Stack spacing={3}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.autoDetectLanguage}
                onChange={(e) => setSettings(s => ({ ...s, autoDetectLanguage: e.target.checked }))}
              />
            }
            label={
              <Box>
                <Stack direction="row" alignItems="center">
                  <Typography variant="body2" fontWeight={500}>Auto-detect Language</Typography>
                  <InfoTip
                    ariaLabel="Auto-detect language info"
                    tip="Lets the engine identify the script and language per page. Recommended when uploading mixed-language ledgers. If all pages share one language, turning this OFF and setting 'OCR Language' explicitly improves accuracy and speed."
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Automatically detect the language in record images
                </Typography>
              </Box>
            }
          />

          <FormControlLabel
            control={
              <Switch
                checked={settings.forceGrayscale}
                onChange={(e) => setSettings(s => ({ ...s, forceGrayscale: e.target.checked }))}
              />
            }
            label={
              <Box>
                <Stack direction="row" alignItems="center">
                  <Typography variant="body2" fontWeight={500}>Force Grayscale Preprocessing</Typography>
                  <InfoTip
                    ariaLabel="Force grayscale info"
                    tip="Drops color information before OCR. Improves accuracy for faded ink, yellowed paper, and low-contrast handwriting. Disable if your source has color-coded annotations you want preserved in the image preview."
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Convert images to grayscale before OCR processing
                </Typography>
              </Box>
            }
          />

          <FormControlLabel
            control={
              <Switch
                checked={settings.deskewImages}
                onChange={(e) => setSettings(s => ({ ...s, deskewImages: e.target.checked }))}
              />
            }
            label={
              <Box>
                <Stack direction="row" alignItems="center">
                  <Typography variant="body2" fontWeight={500}>Deskew Images Before OCR</Typography>
                  <InfoTip
                    ariaLabel="Deskew info"
                    tip="Auto-rotates pages that were scanned at a slight angle. Strongly recommended — even a 2-3° tilt can reduce line detection accuracy significantly. Adds minor processing time per page."
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Automatically correct skewed or rotated images
                </Typography>
              </Box>
            }
          />

          <Box>
            <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="body2" fontWeight={500}>OCR Language</Typography>
              <InfoTip
                ariaLabel="OCR language info"
                tip="Explicit language hint for the OCR engine. Overrides auto-detect when that toggle is off. Pick the primary language of the document — using the wrong language can cut accuracy in half on Cyrillic, Greek, or Romanian scripts."
              />
            </Stack>
            <FormControl sx={{ minWidth: 200 }}>
              <Select
                value={settings.language}
                onChange={(e) => setSettings(s => ({ ...s, language: e.target.value }))}
                size="small"
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="el">Greek</MenuItem>
                <MenuItem value="ru">Russian</MenuItem>
                <MenuItem value="ro">Romanian</MenuItem>
                <MenuItem value="sr">Serbian</MenuItem>
                <MenuItem value="bg">Bulgarian</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Default language from church settings
            </Typography>
          </Box>

          <Box>
            <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>Upload Directory</Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                bgcolor: 'background.paper',
                fontFamily: 'monospace',
                fontSize: '0.875rem'
              }}
            >
              {uploadPath}
            </Paper>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Server path where images will be stored
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Sticky Defaults Section */}
          <Box>
            <Stack direction="row" alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="body2" fontWeight={600}>
                Sticky Default Fields
              </Typography>
              <InfoTip
                ariaLabel="Sticky defaults info"
                tip="When enabled for a record type, the field mapper is locked to that table's canonical columns and will not invent new fields. Leave ON for most users — turning OFF is only useful when experimenting with custom column schemas."
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              Restrict field mapping to default database columns for each record type
            </Typography>

            <Stack spacing={2}>
              {/* Baptism Records */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <RecordSchemaInfoPopover
                  title="baptism_records"
                  imageSrc="/images/schema-previews/baptism_records.png"
                />
                <Typography variant="body2" sx={{ flex: 1 }}>
                  baptism_records
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={stickyDefaults.baptism}
                      onChange={(e) => setStickyDefaults(prev => ({ ...prev, baptism: e.target.checked }))}
                      size="small"
                    />
                  }
                  label="Sticky Defaults"
                  labelPlacement="end"
                />
              </Box>

              {/* Marriage Records */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <RecordSchemaInfoPopover
                  title="marriage_records"
                  imageSrc="/images/schema-previews/marriage_records.png"
                />
                <Typography variant="body2" sx={{ flex: 1 }}>
                  marriage_records
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={stickyDefaults.marriage}
                      onChange={(e) => setStickyDefaults(prev => ({ ...prev, marriage: e.target.checked }))}
                      size="small"
                    />
                  }
                  label="Sticky Defaults"
                  labelPlacement="end"
                />
              </Box>

              {/* Funeral Records */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <RecordSchemaInfoPopover
                  title="funeral_records"
                  imageSrc="/images/schema-previews/funeral_records.png"
                />
                <Typography variant="body2" sx={{ flex: 1 }}>
                  funeral_records
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={stickyDefaults.funeral}
                      onChange={(e) => setStickyDefaults(prev => ({ ...prev, funeral: e.target.checked }))}
                      size="small"
                    />
                  }
                  label="Sticky Defaults"
                  labelPlacement="end"
                />
              </Box>
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Collapse>
  </Paper>
);

export default AdvancedOptionsPanel;
