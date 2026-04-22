/**
 * TableWizard Component
 *
 * 3-step wizard for requesting creation of new dynamic record tables.
 * Step 1: Define table name + columns
 * Step 2: Review SQL preview
 * Step 3: Submit request for super_admin approval
 *
 * Route: /devel-tools/table-wizard
 */

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  Box, Typography, Paper, Stepper, Step, StepLabel, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, IconButton, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Switch, FormControlLabel,
  Alert, CircularProgress, Chip, Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  TableChart as TableIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';

interface ColumnDef {
  name: string;
  type: string;
  length: number | null;
  precision: number | null;
  scale: number | null;
  nullable: boolean;
  defaultValue: string;
}

interface Church {
  id: number;
  name: string;
  church_name: string;
}

const ALLOWED_TYPES = [
  'INT', 'BIGINT', 'TINYINT', 'SMALLINT',
  'VARCHAR', 'TEXT', 'MEDIUMTEXT',
  'DATE', 'DATETIME', 'TIMESTAMP',
  'DECIMAL', 'FLOAT', 'DOUBLE',
  'BOOLEAN', 'JSON',
];

const TABLE_NAME_REGEX = /^[a-z][a-z0-9_]{2,63}$/;
const COLUMN_NAME_REGEX = /^[a-z][a-z0-9_]{0,63}$/;

const RESERVED_WORDS = new Set([
  'select', 'insert', 'update', 'delete', 'drop', 'alter', 'create', 'table',
  'index', 'from', 'where', 'join', 'on', 'and', 'or', 'not', 'null', 'true',
  'false', 'primary', 'key', 'foreign', 'references', 'default', 'constraint',
  'database', 'schema', 'grant', 'revoke', 'user', 'group', 'order', 'by',
  'limit', 'offset', 'having', 'union', 'all', 'distinct', 'as', 'in', 'like',
  'between', 'exists', 'case', 'when', 'then', 'else', 'end', 'is', 'set',
]);

function generateSQLPreview(tableName: string, columns: ColumnDef[]): string {
  const colDefs: string[] = ['  `id` INT AUTO_INCREMENT PRIMARY KEY'];

  for (const col of columns) {
    let typeDef = col.type;
    if (col.type === 'VARCHAR') typeDef = `VARCHAR(${col.length || 255})`;
    if (col.type === 'DECIMAL') typeDef = `DECIMAL(${col.precision || 10},${col.scale || 2})`;

    let line = `  \`${col.name}\` ${typeDef}`;
    if (!col.nullable) line += ' NOT NULL';
    if (col.defaultValue) line += ` DEFAULT '${col.defaultValue}'`;
    colDefs.push(line);
  }

  colDefs.push('  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP');
  colDefs.push('  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

  return `CREATE TABLE \`${tableName}\` (\n${colDefs.join(',\n')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
}

const emptyColumn = (): ColumnDef => ({
  name: '',
  type: 'VARCHAR',
  length: 255,
  precision: null,
  scale: null,
  nullable: true,
  defaultValue: '',
});

const steps = ['Define Table', 'Review', 'Submit'];

const TableWizard: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [churchId, setChurchId] = useState<number | ''>('');
  const [tableName, setTableName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [columns, setColumns] = useState<ColumnDef[]>([emptyColumn()]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Load churches
  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiClient.get<any>('/admin/records-inspector/churches');
        if (data.success) setChurches(data.data.churches || []);
      } catch { /* non-fatal */ }
    };
    load();
  }, []);

  const validate = (): string[] => {
    const errors: string[] = [];

    if (!churchId) errors.push('Please select a church');
    if (!tableName) errors.push('Table name is required');
    else if (!TABLE_NAME_REGEX.test(tableName)) {
      errors.push('Table name must be lowercase letters, numbers, underscores (3-64 chars, start with letter)');
    }
    if (RESERVED_WORDS.has(tableName.toLowerCase())) {
      errors.push(`"${tableName}" is a SQL reserved word`);
    }
    if (columns.length === 0) errors.push('At least one column is required');

    const colNames = new Set<string>();
    columns.forEach((col, i) => {
      if (!col.name) {
        errors.push(`Column ${i + 1}: name is required`);
      } else if (!COLUMN_NAME_REGEX.test(col.name)) {
        errors.push(`Column "${col.name}": must be lowercase letters, numbers, underscores`);
      } else if (RESERVED_WORDS.has(col.name.toLowerCase())) {
        errors.push(`Column "${col.name}" is a SQL reserved word`);
      }
      if (colNames.has(col.name)) errors.push(`Duplicate column name: "${col.name}"`);
      colNames.add(col.name);

      if (col.type === 'VARCHAR' && (!col.length || col.length < 1 || col.length > 65535)) {
        errors.push(`Column "${col.name}": VARCHAR length must be 1-65535`);
      }
    });

    return errors;
  };

  const handleNext = () => {
    if (activeStep === 0) {
      const errs = validate();
      setValidationErrors(errs);
      if (errs.length > 0) return;
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => setActiveStep((prev) => prev - 1);

  const addColumn = () => setColumns([...columns, emptyColumn()]);

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const updateColumn = (index: number, field: keyof ColumnDef, value: any) => {
    const updated = [...columns];
    (updated[index] as any)[field] = value;
    setColumns(updated);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const data = await apiClient.post<any>('/admin/table-requests', {
        church_id: churchId,
        table_name: tableName,
        display_name: displayName || tableName,
        columns,
      });

      if (data.success) {
        setSubmitted(true);
        setSubmitResult(data.data);
      } else {
        setError(data.error || 'Failed to submit request');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setChurchId('');
    setTableName('');
    setDisplayName('');
    setColumns([emptyColumn()]);
    setSubmitted(false);
    setSubmitResult(null);
    setError(null);
    setValidationErrors([]);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <TableIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4">Table Creation Wizard</Typography>
            <Typography variant="body2" color="text.secondary">
              Request a new record table for a church database
            </Typography>
          </Box>
        </Box>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step 1: Define Table */}
        {activeStep === 0 && (
          <Box>
            {validationErrors.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {validationErrors.map((e, i) => <div key={i}>{e}</div>)}
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <FormControl sx={{ minWidth: 250 }}>
                <InputLabel>Church *</InputLabel>
                <Select
                  value={churchId}
                  label="Church *"
                  onChange={(e) => setChurchId(e.target.value as number)}
                >
                  {churches.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.church_name || c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Table Name *"
                value={tableName}
                onChange={(e) => setTableName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                helperText="lowercase, numbers, underscores only"
                sx={{ flex: 1 }}
              />
              <TextField
                label="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                sx={{ flex: 1 }}
              />
            </Box>

            <Divider sx={{ mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 2 }}>
              Columns
              <Typography variant="caption" sx={{ ml: 1 }} color="text.secondary">
                (id, created_at, updated_at are added automatically)
              </Typography>
            </Typography>

            {columns.map((col, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'center' }}>
                <TextField
                  label="Name"
                  value={col.name}
                  onChange={(e) => updateColumn(idx, 'name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  size="small"
                  sx={{ width: 180 }}
                />
                <FormControl size="small" sx={{ width: 150 }}>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={col.type}
                    label="Type"
                    onChange={(e) => updateColumn(idx, 'type', e.target.value)}
                  >
                    {ALLOWED_TYPES.map((t) => (
                      <MenuItem key={t} value={t}>{t}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {col.type === 'VARCHAR' && (
                  <TextField
                    label="Length"
                    type="number"
                    value={col.length || ''}
                    onChange={(e) => updateColumn(idx, 'length', parseInt(e.target.value) || null)}
                    size="small"
                    sx={{ width: 90 }}
                  />
                )}
                {col.type === 'DECIMAL' && (
                  <>
                    <TextField
                      label="Precision"
                      type="number"
                      value={col.precision || ''}
                      onChange={(e) => updateColumn(idx, 'precision', parseInt(e.target.value) || null)}
                      size="small"
                      sx={{ width: 90 }}
                    />
                    <TextField
                      label="Scale"
                      type="number"
                      value={col.scale || ''}
                      onChange={(e) => updateColumn(idx, 'scale', parseInt(e.target.value) || null)}
                      size="small"
                      sx={{ width: 80 }}
                    />
                  </>
                )}
                <FormControlLabel
                  control={
                    <Switch
                      checked={col.nullable}
                      onChange={(e) => updateColumn(idx, 'nullable', e.target.checked)}
                      size="small"
                    />
                  }
                  label="NULL"
                  sx={{ width: 80 }}
                />
                <TextField
                  label="Default"
                  value={col.defaultValue}
                  onChange={(e) => updateColumn(idx, 'defaultValue', e.target.value)}
                  size="small"
                  sx={{ width: 120 }}
                />
                <IconButton onClick={() => removeColumn(idx)} disabled={columns.length <= 1} size="small">
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}

            <Button startIcon={<AddIcon />} onClick={addColumn} sx={{ mt: 1 }}>
              Add Column
            </Button>
          </Box>
        )}

        {/* Step 2: Review */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Table: <Chip label={tableName} color="primary" />
              {displayName && displayName !== tableName && (
                <Typography component="span" variant="body2" sx={{ ml: 1 }} color="text.secondary">
                  ({displayName})
                </Typography>
              )}
            </Typography>

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Church: {churches.find(c => c.id === churchId)?.church_name || churches.find(c => c.id === churchId)?.name || churchId}
            </Typography>

            <TableContainer sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Column</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Nullable</TableCell>
                    <TableCell>Default</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell><strong>id</strong></TableCell>
                    <TableCell>INT AUTO_INCREMENT</TableCell>
                    <TableCell>NO</TableCell>
                    <TableCell>PRIMARY KEY</TableCell>
                  </TableRow>
                  {columns.map((col, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{col.name}</TableCell>
                      <TableCell>
                        {col.type}
                        {col.type === 'VARCHAR' && `(${col.length || 255})`}
                        {col.type === 'DECIMAL' && `(${col.precision || 10},${col.scale || 2})`}
                      </TableCell>
                      <TableCell>{col.nullable ? 'YES' : 'NO'}</TableCell>
                      <TableCell>{col.defaultValue || '-'}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell><strong>created_at</strong></TableCell>
                    <TableCell>DATETIME</TableCell>
                    <TableCell>YES</TableCell>
                    <TableCell>CURRENT_TIMESTAMP</TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell><strong>updated_at</strong></TableCell>
                    <TableCell>DATETIME</TableCell>
                    <TableCell>YES</TableCell>
                    <TableCell>CURRENT_TIMESTAMP ON UPDATE</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Typography variant="subtitle2" sx={{ mb: 1 }}>SQL Preview</Typography>
            <Paper
              variant="outlined"
              sx={{ p: 2, bgcolor: '#1e1e1e', color: '#d4d4d4', fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap', overflow: 'auto' }}
            >
              {generateSQLPreview(tableName, columns)}
            </Paper>
          </Box>
        )}

        {/* Step 3: Submit */}
        {activeStep === 2 && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            {submitted ? (
              <>
                <SuccessIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>Request Submitted</Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Your request to create table "{tableName}" has been submitted for super_admin approval.
                </Typography>
                {submitResult && (
                  <Alert severity="success" sx={{ mb: 2, textAlign: 'left', display: 'inline-block' }}>
                    Request ID: #{submitResult.id} — Status: {submitResult.status}
                  </Alert>
                )}
                <Box>
                  <Button variant="contained" onClick={handleReset}>
                    Create Another Request
                  </Button>
                </Box>
              </>
            ) : (
              <>
                <Typography variant="h5" gutterBottom>Ready to Submit</Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  This will create a table creation request that requires super_admin approval before the table is created.
                </Typography>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                )}

                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleSubmit}
                  disabled={submitting}
                  startIcon={submitting ? <CircularProgress size={20} /> : undefined}
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </>
            )}
          </Box>
        )}

        {/* Navigation */}
        {!submitted && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button disabled={activeStep === 0} onClick={handleBack}>
              Back
            </Button>
            {activeStep < steps.length - 1 && (
              <Button variant="contained" onClick={handleNext}>
                Next
              </Button>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default TableWizard;
