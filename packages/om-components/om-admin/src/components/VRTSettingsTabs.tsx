/**
 * VRTSettingsTabs — All 6 tab panel components for VRTSettingsPanel.
 * Extracted from VRTSettingsPanel.tsx
 */

import React from 'react';
import {
  Grid,
  Switch,
  FormControlLabel,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  Card,
  CardContent,
  Typography,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { SnapshotConfig } from '../ai/visualTesting/snapshotEngine.ts';
import { DiffConfig } from '../ai/visualTesting/diffAnalyzer.ts';
import { ConfidenceConfig } from '../ai/visualTesting/confidenceAdjuster.ts';
import { PlaywrightConfig } from '../ai/visualTesting/playwrightTests.ts';
import { LearningConfig } from '../ai/learning/regressionFeedback.ts';
import type { VRTSettings } from './vrtSettingsDefaults';

export const SnapshotSettingsTab: React.FC<{
  settings: SnapshotConfig;
  onChange: (key: string, value: any) => void;
  onNestedChange: (parentKey: string, childKey: string, value: any) => void;
}> = ({ settings, onChange, onNestedChange }) => (
  <Grid container spacing={3}>
    <Grid item xs={12}>
      <FormControlLabel
        control={
          <Switch
            checked={settings.enabled}
            onChange={(e) => onChange('enabled', e.target.checked)}
          />
        }
        label="Enable Snapshot Engine"
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Retention Days"
        type="number"
        value={settings.retentionDays}
        onChange={(e) => onChange('retentionDays', parseInt(e.target.value))}
        inputProps={{ min: 1, max: 365 }}
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <FormControl fullWidth>
        <InputLabel>Image Format</InputLabel>
        <Select
          value={settings.format}
          onChange={(e) => onChange('format', e.target.value)}
          label="Image Format"
        >
          <MenuItem value="png">PNG</MenuItem>
          <MenuItem value="jpeg">JPEG</MenuItem>
        </Select>
      </FormControl>
    </Grid>

    <Grid item xs={12}>
      <Typography variant="subtitle1" gutterBottom>
        Image Quality
      </Typography>
      <Slider
        value={settings.quality}
        onChange={(e, value) => onChange('quality', value)}
        min={0.1}
        max={1}
        step={0.1}
        marks={[
          { value: 0.1, label: '10%' },
          { value: 0.5, label: '50%' },
          { value: 1, label: '100%' }
        ]}
        valueLabelDisplay="auto"
      />
    </Grid>

    <Grid item xs={12}>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Breakpoint Configuration</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {Object.entries(settings.breakpoints).map(([device, dimensions]) => (
              <Grid item xs={12} md={4} key={device}>
                <Typography variant="subtitle2" gutterBottom>
                  {device.charAt(0).toUpperCase() + device.slice(1)}
                </Typography>
                <TextField
                  fullWidth
                  label="Width"
                  type="number"
                  value={dimensions.width}
                  onChange={(e) => onNestedChange('breakpoints', device, { ...dimensions, width: parseInt(e.target.value) })}
                  size="small"
                  sx={{ mb: 1 }}
                />
                <TextField
                  fullWidth
                  label="Height"
                  type="number"
                  value={dimensions.height}
                  onChange={(e) => onNestedChange('breakpoints', device, { ...dimensions, height: parseInt(e.target.value) })}
                  size="small"
                />
              </Grid>
            ))}
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Grid>
  </Grid>
);

export const DiffSettingsTab: React.FC<{
  settings: DiffConfig;
  onChange: (key: string, value: any) => void;
}> = ({ settings, onChange }) => (
  <Grid container spacing={3}>
    <Grid item xs={12}>
      <Typography variant="subtitle1" gutterBottom>
        Diff Sensitivity
      </Typography>
      <Slider
        value={settings.sensitivity}
        onChange={(e, value) => onChange('sensitivity', value)}
        min={0.01}
        max={0.20}
        step={0.01}
        marks={[
          { value: 0.01, label: '1%' },
          { value: 0.05, label: '5%' },
          { value: 0.10, label: '10%' },
          { value: 0.20, label: '20%' }
        ]}
        valueLabelDisplay="auto"
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Minimum Region Size (pixels)"
        type="number"
        value={settings.minRegionSize}
        onChange={(e) => onChange('minRegionSize', parseInt(e.target.value))}
        inputProps={{ min: 1 }}
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Maximum Regions"
        type="number"
        value={settings.maxRegions}
        onChange={(e) => onChange('maxRegions', parseInt(e.target.value))}
        inputProps={{ min: 1, max: 1000 }}
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Color Threshold"
        type="number"
        value={settings.colorThreshold}
        onChange={(e) => onChange('colorThreshold', parseInt(e.target.value))}
        inputProps={{ min: 0, max: 255 }}
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Layout Threshold (px)"
        type="number"
        value={settings.layoutThreshold}
        onChange={(e) => onChange('layoutThreshold', parseInt(e.target.value))}
        inputProps={{ min: 0 }}
      />
    </Grid>

    <Grid item xs={12}>
      <FormControlLabel
        control={
          <Switch
            checked={settings.enableTextDetection}
            onChange={(e) => onChange('enableTextDetection', e.target.checked)}
          />
        }
        label="Enable Text Detection"
      />
    </Grid>

    <Grid item xs={12}>
      <FormControlLabel
        control={
          <Switch
            checked={settings.enableStyleDetection}
            onChange={(e) => onChange('enableStyleDetection', e.target.checked)}
          />
        }
        label="Enable Style Detection"
      />
    </Grid>
  </Grid>
);

export const ConfidenceSettingsTab: React.FC<{
  settings: ConfidenceConfig;
  onChange: (key: string, value: any) => void;
  onNestedChange: (parentKey: string, childKey: string, value: any) => void;
}> = ({ settings, onChange, onNestedChange }) => (
  <Grid container spacing={3}>
    <Grid item xs={12}>
      <FormControlLabel
        control={
          <Switch
            checked={settings.enabled}
            onChange={(e) => onChange('enabled', e.target.checked)}
          />
        }
        label="Enable Confidence Adjustment"
      />
    </Grid>

    <Grid item xs={12}>
      <Typography variant="subtitle1" gutterBottom>
        Visual Weight
      </Typography>
      <Slider
        value={settings.visualWeight}
        onChange={(e, value) => onChange('visualWeight', value)}
        min={0}
        max={1}
        step={0.1}
        marks={[
          { value: 0, label: '0%' },
          { value: 0.5, label: '50%' },
          { value: 1, label: '100%' }
        ]}
        valueLabelDisplay="auto"
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Unexpected Change Penalty"
        type="number"
        value={settings.unexpectedChangePenalty}
        onChange={(e) => onChange('unexpectedChangePenalty', parseFloat(e.target.value))}
        inputProps={{ step: 0.01, min: -1, max: 0 }}
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Intentional Change Bonus"
        type="number"
        value={settings.intentionalChangeBonus}
        onChange={(e) => onChange('intentionalChangeBonus', parseFloat(e.target.value))}
        inputProps={{ step: 0.01, min: 0, max: 1 }}
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Layout Stability Bonus"
        type="number"
        value={settings.layoutStabilityBonus}
        onChange={(e) => onChange('layoutStabilityBonus', parseFloat(e.target.value))}
        inputProps={{ step: 0.01, min: 0, max: 1 }}
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <FormControlLabel
        control={
          <Switch
            checked={settings.learningEnabled}
            onChange={(e) => onChange('learningEnabled', e.target.checked)}
          />
        }
        label="Enable Learning"
      />
    </Grid>

    <Grid item xs={12}>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Severity Penalties</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {Object.entries(settings.severityPenalties).map(([severity, penalty]) => (
              <Grid item xs={12} md={6} key={severity}>
                <TextField
                  fullWidth
                  label={severity}
                  type="number"
                  value={penalty}
                  onChange={(e) => onNestedChange('severityPenalties', severity, parseFloat(e.target.value))}
                  inputProps={{ step: 0.01, min: -1, max: 1 }}
                  size="small"
                />
              </Grid>
            ))}
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Grid>
  </Grid>
);

export const PlaywrightSettingsTab: React.FC<{
  settings: PlaywrightConfig;
  onChange: (key: string, value: any) => void;
  onNestedChange: (parentKey: string, childKey: string, value: any) => void;
}> = ({ settings, onChange, onNestedChange }) => (
  <Grid container spacing={3}>
    <Grid item xs={12}>
      <FormControlLabel
        control={
          <Switch
            checked={settings.enabled}
            onChange={(e) => onChange('enabled', e.target.checked)}
          />
        }
        label="Enable Playwright Tests"
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Accessibility Threshold"
        type="number"
        value={settings.accessibilityThreshold}
        onChange={(e) => onChange('accessibilityThreshold', parseFloat(e.target.value))}
        inputProps={{ step: 0.1, min: 0, max: 1 }}
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Color Contrast Threshold"
        type="number"
        value={settings.colorContrastThreshold}
        onChange={(e) => onChange('colorContrastThreshold', parseFloat(e.target.value))}
        inputProps={{ step: 0.1, min: 1, max: 21 }}
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Max Test Duration (ms)"
        type="number"
        value={settings.maxTestDuration}
        onChange={(e) => onChange('maxTestDuration', parseInt(e.target.value))}
        inputProps={{ min: 1000, max: 60000 }}
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Retry Attempts"
        type="number"
        value={settings.retryAttempts}
        onChange={(e) => onChange('retryAttempts', parseInt(e.target.value))}
        inputProps={{ min: 0, max: 10 }}
      />
    </Grid>

    <Grid item xs={12}>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Screenshot Options</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.screenshotOptions.fullPage}
                    onChange={(e) => onNestedChange('screenshotOptions', 'fullPage', e.target.checked)}
                  />
                }
                label="Full Page Screenshots"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Quality"
                type="number"
                value={settings.screenshotOptions.quality}
                onChange={(e) => onNestedChange('screenshotOptions', 'quality', parseFloat(e.target.value))}
                inputProps={{ step: 0.1, min: 0.1, max: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Format</InputLabel>
                <Select
                  value={settings.screenshotOptions.type}
                  onChange={(e) => onNestedChange('screenshotOptions', 'type', e.target.value)}
                  label="Format"
                >
                  <MenuItem value="png">PNG</MenuItem>
                  <MenuItem value="jpeg">JPEG</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Grid>
  </Grid>
);

export const LearningSettingsTab: React.FC<{
  settings: LearningConfig;
  onChange: (key: string, value: any) => void;
  onNestedChange: (parentKey: string, childKey: string, value: any) => void;
}> = ({ settings, onChange, onNestedChange }) => (
  <Grid container spacing={3}>
    <Grid item xs={12}>
      <FormControlLabel
        control={
          <Switch
            checked={settings.enabled}
            onChange={(e) => onChange('enabled', e.target.checked)}
          />
        }
        label="Enable Learning System"
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Min Samples for Training"
        type="number"
        value={settings.minSamplesForTraining}
        onChange={(e) => onChange('minSamplesForTraining', parseInt(e.target.value))}
        inputProps={{ min: 10, max: 1000 }}
      />
    </Grid>

    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Training Interval (hours)"
        type="number"
        value={settings.trainingInterval / (60 * 60 * 1000)}
        onChange={(e) => onChange('trainingInterval', parseInt(e.target.value) * 60 * 60 * 1000)}
        inputProps={{ min: 1, max: 168 }}
      />
    </Grid>

    <Grid item xs={12}>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Feature Extraction</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {Object.entries(settings.featureExtraction).map(([feature, enabled]) => (
              <Grid item xs={12} md={6} key={feature}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={enabled}
                      onChange={(e) => onNestedChange('featureExtraction', feature, e.target.checked)}
                    />
                  }
                  label={feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                />
              </Grid>
            ))}
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Grid>

    <Grid item xs={12}>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Model Update</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.modelUpdate.autoUpdate}
                    onChange={(e) => onNestedChange('modelUpdate', 'autoUpdate', e.target.checked)}
                  />
                }
                label="Auto Update Model"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Validation Split"
                type="number"
                value={settings.modelUpdate.validationSplit}
                onChange={(e) => onNestedChange('modelUpdate', 'validationSplit', parseFloat(e.target.value))}
                inputProps={{ step: 0.1, min: 0.1, max: 0.5 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Learning Rate"
                type="number"
                value={settings.modelUpdate.learningRate}
                onChange={(e) => onNestedChange('modelUpdate', 'learningRate', parseFloat(e.target.value))}
                inputProps={{ step: 0.001, min: 0.001, max: 0.1 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Max Iterations"
                type="number"
                value={settings.modelUpdate.maxIterations}
                onChange={(e) => onNestedChange('modelUpdate', 'maxIterations', parseInt(e.target.value))}
                inputProps={{ min: 100, max: 10000 }}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Grid>

    <Grid item xs={12}>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Storage</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Max Samples"
                type="number"
                value={settings.storage.maxSamples}
                onChange={(e) => onNestedChange('storage', 'maxSamples', parseInt(e.target.value))}
                inputProps={{ min: 100, max: 10000 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Retention Days"
                type="number"
                value={settings.storage.retentionDays}
                onChange={(e) => onNestedChange('storage', 'retentionDays', parseInt(e.target.value))}
                inputProps={{ min: 1, max: 365 }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.storage.compressionEnabled}
                    onChange={(e) => onNestedChange('storage', 'compressionEnabled', e.target.checked)}
                  />
                }
                label="Enable Compression"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Grid>
  </Grid>
);

export const SecuritySettingsTab: React.FC<{
  settings: VRTSettings;
  onChange: (key: string, value: any) => void;
  onNestedChange: (parentKey: string, childKey: string, value: any) => void;
}> = ({ settings, onChange, onNestedChange }) => (
  <Grid container spacing={3}>
    <Grid item xs={12}>
      <Alert severity="info">
        <Typography variant="subtitle2" gutterBottom>
          Security & Privacy Settings
        </Typography>
        <Typography variant="body2">
          These settings control how VRT data is handled and stored to ensure compliance with privacy regulations.
        </Typography>
      </Alert>
    </Grid>

    <Grid item xs={12}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Data Retention
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <InfoIcon />
              </ListItemIcon>
              <ListItemText
                primary="Snapshot Retention"
                secondary="Snapshots are automatically deleted after the configured retention period"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <InfoIcon />
              </ListItemIcon>
              <ListItemText
                primary="Learning Data"
                secondary="Feedback samples are retained for model training and automatically cleaned up"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Grid>

    <Grid item xs={12}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Access Control
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <SecurityIcon />
              </ListItemIcon>
              <ListItemText
                primary="Super Admin Only"
                secondary="VRT features are restricted to super_admin users only"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <SecurityIcon />
              </ListItemIcon>
              <ListItemText
                primary="Local Storage"
                secondary="All VRT data is stored locally in the browser, not transmitted to external servers"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Grid>

    <Grid item xs={12}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Compliance
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon />
              </ListItemIcon>
              <ListItemText
                primary="GDPR Compliant"
                secondary="No personal data is collected or stored by the VRT system"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon />
              </ListItemIcon>
              <ListItemText
                primary="Audit Trail"
                secondary="All VRT operations are logged for compliance and debugging purposes"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Grid>
  </Grid>
);
