/**
 * LiveTableDialogs — All confirmation/import dialogs and toast snackbar
 * for the Live Table Builder page.
 * Extracted from LiveTableBuilderPage.tsx
 */
import React from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';

// ── Import Dialog ──────────────────────────────────────────────────────

export function ImportDialog({
  open,
  onClose,
  importJson,
  setImportJson,
  importCsv,
  setImportCsv,
  csvFirstRowIsHeader,
  setCsvFirstRowIsHeader,
  onImportJsonConfirm,
  onImportCsvConfirm,
}: {
  open: boolean;
  onClose: () => void;
  importJson: string;
  setImportJson: (v: string) => void;
  importCsv: string;
  setImportCsv: (v: string) => void;
  csvFirstRowIsHeader: boolean;
  setCsvFirstRowIsHeader: (v: boolean) => void;
  onImportJsonConfirm: () => void;
  onImportCsvConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{importCsv ? 'Import CSV/TSV' : 'Import JSON'}</DialogTitle>
      <DialogContent>
        {importCsv ? (
          <>
            <FormControlLabel
              control={
                <Checkbox
                  checked={csvFirstRowIsHeader}
                  onChange={(e) => setCsvFirstRowIsHeader(e.target.checked)}
                />
              }
              label="First row is headers"
              sx={{ mt: 2, mb: 1 }}
            />
            <TextField
              fullWidth
              multiline
              rows={12}
              value={importCsv}
              onChange={(e) => setImportCsv(e.target.value)}
              placeholder="Paste CSV/TSV data here..."
              sx={{ mt: 1 }}
            />
          </>
        ) : (
          <TextField
            fullWidth
            multiline
            rows={12}
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder="Paste JSON data here..."
            sx={{ mt: 2 }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => {
          onClose();
          setImportJson('');
          setImportCsv('');
        }}>Cancel</Button>
        {importCsv ? (
          <Button onClick={onImportCsvConfirm} variant="contained">
            Import CSV
          </Button>
        ) : (
          <Button onClick={onImportJsonConfirm} variant="contained">
            Import JSON
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ── Reset Dialog ───────────────────────────────────────────────────────

export function ResetDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Reset Table</DialogTitle>
      <DialogContent>
        <Typography>
          Reset to default 10x6 grid? This will lose all current data.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" color="warning">
          Reset
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Save Template Dialog ───────────────────────────────────────────────

export function SaveTemplateDialog({
  open,
  onClose,
  templateName,
  setTemplateName,
  templateRecordType,
  setTemplateRecordType,
  templateDescription,
  setTemplateDescription,
  templateIsGlobal,
  setTemplateIsGlobal,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  templateName: string;
  setTemplateName: (v: string) => void;
  templateRecordType: string;
  setTemplateRecordType: (v: any) => void;
  templateDescription: string;
  setTemplateDescription: (v: string) => void;
  templateIsGlobal: boolean;
  setTemplateIsGlobal: (v: boolean) => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Save Template to Database</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            fullWidth
            label="Template Name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="e.g., Standard Baptism Records"
            required
            autoFocus
          />
          <FormControl fullWidth>
            <InputLabel>Record Type</InputLabel>
            <Select
              value={templateRecordType}
              label="Record Type"
              onChange={(e) => setTemplateRecordType(e.target.value)}
            >
              <MenuItem value="baptism">Baptism</MenuItem>
              <MenuItem value="marriage">Marriage</MenuItem>
              <MenuItem value="funeral">Funeral</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Description (optional)"
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
            placeholder="Template description..."
            multiline
            rows={2}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={templateIsGlobal}
                onChange={(e) => setTemplateIsGlobal(e.target.checked)}
              />
            }
            label="Make this template global (available to all churches)"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => {
          onClose();
          setTemplateName('');
          setTemplateDescription('');
          setTemplateRecordType('custom');
          setTemplateIsGlobal(false);
        }}>Cancel</Button>
        <Button 
          onClick={onSave} 
          variant="contained" 
          disabled={!templateName.trim()}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Overwrite Template Dialog ──────────────────────────────────────────

export function OverwriteTemplateDialog({
  open,
  onClose,
  templateName,
  onOverwrite,
  onCancel,
}: {
  open: boolean;
  onClose: () => void;
  templateName: string;
  onOverwrite: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Update Template?</DialogTitle>
      <DialogContent>
        <Typography>
          Template "{templateName}" already exists in the database. Update it?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={onOverwrite} variant="contained" color="warning">
          Update
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Delete Template Dialog ─────────────────────────────────────────────

export function DeleteTemplateDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Delete Template?</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete this template? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" color="error">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Load Template Dialog ───────────────────────────────────────────────

export function LoadTemplateDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Load Template?</DialogTitle>
      <DialogContent>
        <Typography>
          You have unsaved changes. Loading this template will replace your current table. Continue?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" color="warning">
          Load Template
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Import Templates Dialog ────────────────────────────────────────────

export function ImportTemplatesDialog({
  open,
  onClose,
  importTemplatesJson,
  setImportTemplatesJson,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  importTemplatesJson: string;
  setImportTemplatesJson: (v: string) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Import Templates</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Paste JSON template data. Existing templates with the same name will be overwritten.
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={12}
          value={importTemplatesJson}
          onChange={(e) => setImportTemplatesJson(e.target.value)}
          placeholder="Paste template JSON here..."
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => {
          onClose();
          setImportTemplatesJson('');
        }}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" disabled={!importTemplatesJson.trim()}>
          Import Templates
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Toast Snackbar ─────────────────────────────────────────────────────

export function ToastSnackbar({
  toast,
  onClose,
}: {
  toast: { open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' };
  onClose: () => void;
}) {
  return (
    <Snackbar
      open={toast.open}
      autoHideDuration={12000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'center', horizontal: 'center' }}
      sx={{
        position: 'fixed',
        top: '50% !important',
        left: '50% !important',
        transform: 'translate(-50%, -50%) !important',
        zIndex: 10000,
        '& .MuiSnackbar-root': {
          position: 'fixed',
          top: '50% !important',
          left: '50% !important',
          transform: 'translate(-50%, -50%) !important',
        }
      }}
    >
      <Alert
        onClose={onClose}
        severity={toast.severity}
        sx={{ 
          minWidth: '400px',
          maxWidth: '600px',
          fontSize: '1.1rem',
          padding: '16px 20px',
          '& .MuiAlert-message': {
            fontSize: '1.1rem',
            fontWeight: 500,
          },
          '& .MuiAlert-icon': {
            fontSize: '28px',
          }
        }}
      >
        {toast.message}
      </Alert>
    </Snackbar>
  );
}
