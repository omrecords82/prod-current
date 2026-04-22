/**
 * AnchorFieldEditor — UI for editing anchor-based field extraction configs.
 *
 * Used in the Layout Template Editor when extraction_mode is 'form' or 'multi_form'.
 * Allows editing anchor phrases, direction, and search zones per field.
 */

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  IconChevronDown,
  IconPlus,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import React, { useCallback, useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AnchorFieldConfig {
  name: string;
  key: string;
  field_type: string;
  column_index: number;
  sort_order: number;
  anchor_phrases: string[] | null;
  anchor_direction: 'below' | 'right' | 'auto' | null;
  search_zone: {
    padding?: { left: number; right: number; top: number; bottom: number };
    extent?: { width: number; height: number };
  } | null;
}

interface AnchorFieldEditorProps {
  fields: AnchorFieldConfig[];
  onChange: (fields: AnchorFieldConfig[]) => void;
  recordType: string;
}

// ── Default field sets per record type ────────────────────────────────────────

const DEFAULT_FIELDS: Record<string, Array<{ name: string; key: string }>> = {
  baptism: [
    { name: 'Record Number', key: 'record_number' },
    { name: 'Child First Name', key: 'child_first_name' },
    { name: 'Child Last Name', key: 'child_last_name' },
    { name: 'Birth Date', key: 'birth_date' },
    { name: 'Baptism Date', key: 'baptism_date' },
    { name: 'Birthplace', key: 'birthplace' },
    { name: 'Sponsors', key: 'sponsors' },
    { name: 'Parents', key: 'parents' },
    { name: 'Clergy', key: 'clergy' },
  ],
  marriage: [
    { name: 'Groom Name', key: 'groom_name' },
    { name: 'Bride Name', key: 'bride_name' },
    { name: 'Date of Marriage', key: 'date_of_marriage' },
    { name: 'Witnesses', key: 'witnesses' },
    { name: 'Officiant', key: 'officiant' },
  ],
  funeral: [
    { name: 'Deceased Name', key: 'deceased_name' },
    { name: 'Date of Death', key: 'date_of_death' },
    { name: 'Date of Funeral', key: 'date_of_funeral' },
    { name: 'Date of Burial', key: 'date_of_burial' },
    { name: 'Place of Burial', key: 'place_of_burial' },
    { name: 'Age at Death', key: 'age_at_death' },
    { name: 'Cause of Death', key: 'cause_of_death' },
    { name: 'Next of Kin', key: 'next_of_kin' },
    { name: 'Officiant', key: 'officiant' },
  ],
};

// ── Component ────────────────────────────────────────────────────────────────

const AnchorFieldEditor: React.FC<AnchorFieldEditorProps> = ({ fields, onChange, recordType }) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [phraseInput, setPhraseInput] = useState('');

  const updateField = useCallback(
    (index: number, updates: Partial<AnchorFieldConfig>) => {
      const newFields = fields.map((f, i) => (i === index ? { ...f, ...updates } : f));
      onChange(newFields);
    },
    [fields, onChange],
  );

  const removeField = useCallback(
    (index: number) => {
      onChange(fields.filter((_, i) => i !== index));
    },
    [fields, onChange],
  );

  const addField = useCallback(() => {
    const idx = fields.length;
    onChange([
      ...fields,
      {
        name: `Field ${idx + 1}`,
        key: `field_${idx + 1}`,
        field_type: 'text',
        column_index: idx,
        sort_order: idx,
        anchor_phrases: [],
        anchor_direction: 'below',
        search_zone: {
          padding: { left: 0, right: 0, top: 0.01, bottom: 0.05 },
          extent: { width: 0.3, height: 0.1 },
        },
      },
    ]);
    setExpanded(idx);
  }, [fields, onChange]);

  const loadDefaults = useCallback(() => {
    const defs = DEFAULT_FIELDS[recordType] || [];
    const newFields: AnchorFieldConfig[] = defs.map((d, i) => ({
      name: d.name,
      key: d.key,
      field_type: 'text',
      column_index: i,
      sort_order: i,
      anchor_phrases: null, // Will use hardcoded defaults from layoutExtractor
      anchor_direction: null,
      search_zone: null,
    }));
    onChange(newFields);
  }, [recordType, onChange]);

  const addPhrase = useCallback(
    (index: number, phrase: string) => {
      const trimmed = phrase.trim().toUpperCase();
      if (!trimmed) return;
      const current = fields[index].anchor_phrases || [];
      if (current.includes(trimmed)) return;
      updateField(index, { anchor_phrases: [...current, trimmed] });
      setPhraseInput('');
    },
    [fields, updateField],
  );

  const removePhrase = useCallback(
    (fieldIndex: number, phraseIndex: number) => {
      const current = fields[fieldIndex].anchor_phrases || [];
      updateField(fieldIndex, {
        anchor_phrases: current.filter((_, i) => i !== phraseIndex),
      });
    },
    [fields, updateField],
  );

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          Anchor Fields ({fields.length})
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Load default fields for this record type">
            <Button size="small" variant="text" onClick={loadDefaults}>
              Defaults
            </Button>
          </Tooltip>
          <Button size="small" variant="outlined" startIcon={<IconPlus size={14} />} onClick={addField}>
            Add
          </Button>
        </Stack>
      </Stack>

      {fields.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          No fields configured. Click "Defaults" to load standard fields for {recordType}, or "Add" for custom.
        </Typography>
      ) : (
        <Stack spacing={0.5}>
          {fields.map((field, i) => (
            <Accordion
              key={i}
              expanded={expanded === i}
              onChange={(_, isExpanded) => setExpanded(isExpanded ? i : null)}
              disableGutters
              sx={{ '&:before': { display: 'none' }, boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
            >
              <AccordionSummary expandIcon={<IconChevronDown size={16} />} sx={{ minHeight: 36, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                  <Chip label={i + 1} size="small" sx={{ minWidth: 24, fontWeight: 700, fontSize: '0.7rem' }} />
                  <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                    {field.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {field.key}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeField(i);
                    }}
                    sx={{ ml: 0.5 }}
                  >
                    <IconTrash size={14} />
                  </IconButton>
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Stack spacing={1.5}>
                  {/* Name + Key */}
                  <Stack direction="row" spacing={1}>
                    <TextField
                      size="small"
                      label="Name"
                      value={field.name}
                      onChange={(e) => updateField(i, { name: e.target.value })}
                      fullWidth
                    />
                    <TextField
                      size="small"
                      label="Key"
                      value={field.key}
                      onChange={(e) => updateField(i, { key: e.target.value })}
                      fullWidth
                    />
                  </Stack>

                  {/* Direction */}
                  <TextField
                    select
                    size="small"
                    label="Anchor Direction"
                    value={field.anchor_direction || 'below'}
                    onChange={(e) => updateField(i, { anchor_direction: e.target.value as any })}
                    fullWidth
                    helperText="Where to look for the field value relative to anchor text"
                  >
                    <MenuItem value="below">Below anchor</MenuItem>
                    <MenuItem value="right">Right of anchor</MenuItem>
                    <MenuItem value="auto">Auto-detect</MenuItem>
                  </TextField>

                  {/* Anchor phrases */}
                  <Box>
                    <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                      Anchor Phrases {!field.anchor_phrases?.length && '(using defaults)'}
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 0.5 }}>
                      {(field.anchor_phrases || []).map((phrase, pi) => (
                        <Chip
                          key={pi}
                          label={phrase}
                          size="small"
                          deleteIcon={<IconX size={12} />}
                          onDelete={() => removePhrase(i, pi)}
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                    <Stack direction="row" spacing={0.5}>
                      <TextField
                        size="small"
                        placeholder="Add phrase (e.g. DATE OF BIRTH)"
                        value={expanded === i ? phraseInput : ''}
                        onChange={(e) => setPhraseInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addPhrase(i, phraseInput);
                          }
                        }}
                        fullWidth
                      />
                      <Button size="small" variant="outlined" onClick={() => addPhrase(i, phraseInput)}>
                        Add
                      </Button>
                    </Stack>
                  </Box>

                  {/* Search zone */}
                  <Box>
                    <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                      Search Zone {!field.search_zone && '(using defaults)'}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <TextField
                        size="small"
                        type="number"
                        label="Width"
                        value={field.search_zone?.extent?.width ?? 0.3}
                        onChange={(e) =>
                          updateField(i, {
                            search_zone: {
                              ...(field.search_zone || {}),
                              extent: {
                                width: parseFloat(e.target.value) || 0.3,
                                height: field.search_zone?.extent?.height ?? 0.1,
                              },
                            },
                          })
                        }
                        inputProps={{ step: 0.05, min: 0.05, max: 1 }}
                        sx={{ width: 100 }}
                      />
                      <TextField
                        size="small"
                        type="number"
                        label="Height"
                        value={field.search_zone?.extent?.height ?? 0.1}
                        onChange={(e) =>
                          updateField(i, {
                            search_zone: {
                              ...(field.search_zone || {}),
                              extent: {
                                width: field.search_zone?.extent?.width ?? 0.3,
                                height: parseFloat(e.target.value) || 0.1,
                              },
                            },
                          })
                        }
                        inputProps={{ step: 0.01, min: 0.02, max: 0.5 }}
                        sx={{ width: 100 }}
                      />
                    </Stack>
                  </Box>
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default AnchorFieldEditor;
