import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  alpha,
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandIcon,
} from '@mui/icons-material';
import { COLOR } from './constants';
import type { RequirementsPanelProps } from './types';

const RequirementsPanel: React.FC<RequirementsPanelProps> = ({
  pipelineRequirements,
  setReqForm,
  setReqDialogOpen,
  handleDeleteRequirement,
  sampleTemplates,
}) => (
  <>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="subtitle1" fontWeight={700}>Record Structure Requirements ({pipelineRequirements.length})</Typography>
      <Button
        variant="contained" size="small" startIcon={<AddIcon />}
        onClick={() => {
          setReqForm({ record_type: 'baptism', uses_sample: false, sample_template_id: null, custom_required: false, custom_notes: '', review_required: false });
          setReqDialogOpen(true);
        }}
        sx={{ textTransform: 'none', bgcolor: COLOR, '&:hover': { bgcolor: alpha(COLOR, 0.85) } }}
      >
        Add Requirement
      </Button>
    </Box>

    {pipelineRequirements.length === 0 ? (
      <Alert severity="info" sx={{ mb: 3 }}>No record requirements set yet. Add requirements to specify which record types this church needs.</Alert>
    ) : (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
        {pipelineRequirements.map(req => (
          <Paper key={req.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography fontWeight={600} sx={{ textTransform: 'capitalize' }}>{req.record_type}</Typography>
                  {req.uses_sample ? (
                    <Chip label={`Template: ${req.template_name || 'Standard'}`} size="small" color="success" variant="outlined" />
                  ) : req.custom_required ? (
                    <Chip label="Custom Structure" size="small" color="warning" variant="outlined" />
                  ) : null}
                </Box>
                {req.custom_notes && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{req.custom_notes}</Typography>
                )}
              </Box>
              <Tooltip title="Remove">
                <IconButton size="small" color="error" onClick={() => handleDeleteRequirement(req.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Paper>
        ))}
      </Box>
    )}

    {/* Available Templates Preview */}
    {sampleTemplates.length > 0 && (
      <>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Available Sample Templates</Typography>
        <Grid container spacing={2}>
          {sampleTemplates.map(tmpl => (
            <Grid item xs={12} sm={6} key={tmpl.id}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandIcon />}>
                  <Box>
                    <Typography fontWeight={600}>{tmpl.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{tmpl.record_type} · {tmpl.fields.length} fields</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" sx={{ mb: 1 }}>{tmpl.description}</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {tmpl.fields.map(f => (
                      <Typography key={f.name} variant="caption">
                        {f.required ? '●' : '○'} {f.label} ({f.type})
                      </Typography>
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Grid>
          ))}
        </Grid>
      </>
    )}
  </>
);

export default RequirementsPanel;
