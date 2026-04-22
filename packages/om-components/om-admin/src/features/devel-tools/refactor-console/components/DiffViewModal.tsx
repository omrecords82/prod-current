/**
 * Diff View Modal Component
 * 
 * Shows side-by-side comparison of source and target files before restore.
 * Includes dependency warnings and restore confirmation.
 */

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Alert,
  AlertTitle,
  Chip,
  Typography,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  FileText,
  GitCompare,
  Package
} from '@/ui/icons';
import { FilePreview, DependencyCheckResult } from '@/types/refactorConsole';

interface DiffViewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirmRestore: () => void | Promise<void>;
  preview: FilePreview | null;
  dependencies: DependencyCheckResult | null;
  isRestoring?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`diff-tabpanel-${index}`}
      aria-labelledby={`diff-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const DiffViewModal: React.FC<DiffViewModalProps> = ({
  open,
  onClose,
  onConfirmRestore,
  preview,
  dependencies,
  isRestoring = false
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);

  // Calculate diff lines
  const diffLines = useMemo(() => {
    if (!preview) return { source: [], target: [], unified: [] };

    const sourceLines = preview.sourceContent.split('\n');
    const targetLines = preview.targetContent ? preview.targetContent.split('\n') : [];

    // Simple line-by-line comparison
    const maxLines = Math.max(sourceLines.length, targetLines.length);
    const unified: Array<{
      type: 'add' | 'remove' | 'unchanged' | 'empty';
      sourceNum: number | null;
      targetNum: number | null;
      sourceLine: string;
      targetLine: string;
    }> = [];

    for (let i = 0; i < maxLines; i++) {
      const sourceLine = sourceLines[i] || '';
      const targetLine = targetLines[i] || '';
      
      let type: 'add' | 'remove' | 'unchanged' | 'empty' = 'unchanged';
      if (i >= targetLines.length && i < sourceLines.length) {
        type = 'add';
      } else if (i >= sourceLines.length && i < targetLines.length) {
        type = 'remove';
      } else if (sourceLine !== targetLine) {
        type = 'add'; // Changed line
      }

      unified.push({
        type,
        sourceNum: i < sourceLines.length ? i + 1 : null,
        targetNum: i < targetLines.length ? i + 1 : null,
        sourceLine,
        targetLine
      });
    }

    return { source: sourceLines, target: targetLines, unified };
  }, [preview]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (!preview || !dependencies) {
    return null;
  }

  const hasMissingDeps = dependencies.missingCount > 0;
  const isNewFile = !preview.targetExists;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          bgcolor: 'background.paper'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GitCompare className="w-5 h-5" />
            <Typography variant="h6">Preview Restore</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {isNewFile && (
              <Chip label="New File" color="success" size="small" />
            )}
            {preview.diffStats.identical && !isNewFile && (
              <Chip label="Identical" color="info" size="small" />
            )}
            {hasMissingDeps && (
              <Chip 
                label={`${dependencies.missingCount} Missing Dep${dependencies.missingCount > 1 ? 's' : ''}`} 
                color="warning" 
                size="small"
                icon={<AlertTriangle className="w-3 h-3" />}
              />
            )}
          </Box>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, fontFamily: 'monospace' }}>
          {preview.relPath}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {/* Warnings Section */}
        {hasMissingDeps && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>Missing Dependencies Detected</AlertTitle>
            This file imports {dependencies.missingCount} component(s) that don't exist in the target directory.
            Restoring this file may cause runtime errors.
          </Alert>
        )}

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Side-by-Side Diff" icon={<GitCompare className="w-4 h-4" />} iconPosition="start" />
            <Tab label="Dependencies" icon={<Package className="w-4 h-4" />} iconPosition="start" />
            <Tab label="File Info" icon={<FileText className="w-4 h-4" />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* Tab: Diff View */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: 2,
            height: '60vh',
            overflow: 'auto'
          }}>
            {/* Source Column */}
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
              <Box sx={{ 
                bgcolor: alpha(theme.palette.success.main, 0.1), 
                p: 1,
                borderBottom: 1,
                borderColor: 'divider'
              }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Source (Snapshot)
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {preview.sourceSize} bytes • {diffLines.source.length} lines
                </Typography>
              </Box>
              <Box sx={{ 
                fontFamily: 'monospace', 
                fontSize: '0.8rem',
                p: 1,
                bgcolor: 'background.default',
                maxHeight: '100%',
                overflow: 'auto'
              }}>
                {diffLines.source.map((line, i) => {
                  const diffLine = diffLines.unified[i];
                  const isChanged = diffLine?.type === 'add';
                  return (
                    <Box
                      key={i}
                      sx={{
                        display: 'flex',
                        bgcolor: isChanged ? alpha(theme.palette.success.main, 0.1) : 'transparent',
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) }
                      }}
                    >
                      <Box sx={{ 
                        width: 40, 
                        color: 'text.secondary', 
                        textAlign: 'right',
                        pr: 1,
                        flexShrink: 0,
                        userSelect: 'none',
                        borderRight: 1,
                        borderColor: 'divider'
                      }}>
                        {i + 1}
                      </Box>
                      <Box sx={{ flex: 1, pl: 1, whiteSpace: 'pre', overflowX: 'auto' }}>
                        {line || ' '}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* Target Column */}
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
              <Box sx={{ 
                bgcolor: isNewFile ? alpha(theme.palette.info.main, 0.1) : alpha(theme.palette.error.main, 0.1), 
                p: 1,
                borderBottom: 1,
                borderColor: 'divider'
              }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Target (Current)
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {isNewFile ? 'File does not exist' : `${preview.targetSize} bytes • ${diffLines.target.length} lines`}
                </Typography>
              </Box>
              <Box sx={{ 
                fontFamily: 'monospace', 
                fontSize: '0.8rem',
                p: 1,
                bgcolor: 'background.default',
                maxHeight: '100%',
                overflow: 'auto'
              }}>
                {isNewFile ? (
                  <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                    <Typography variant="body2">File will be created</Typography>
                  </Box>
                ) : (
                  diffLines.target.map((line, i) => {
                    const diffLine = diffLines.unified[i];
                    const isChanged = diffLine?.type === 'add';
                    return (
                      <Box
                        key={i}
                        sx={{
                          display: 'flex',
                          bgcolor: isChanged ? alpha(theme.palette.error.main, 0.1) : 'transparent',
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) }
                        }}
                      >
                        <Box sx={{ 
                          width: 40, 
                          color: 'text.secondary', 
                          textAlign: 'right',
                          pr: 1,
                          flexShrink: 0,
                          userSelect: 'none',
                          borderRight: 1,
                          borderColor: 'divider'
                        }}>
                          {i + 1}
                        </Box>
                        <Box sx={{ flex: 1, pl: 1, whiteSpace: 'pre', overflowX: 'auto' }}>
                          {line || ' '}
                        </Box>
                      </Box>
                    );
                  })
                )}
              </Box>
            </Box>
          </Box>
        </TabPanel>

        {/* Tab: Dependencies */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
            {!dependencies.hasImports ? (
              <Alert severity="info">
                <AlertTitle>No Dependencies</AlertTitle>
                This file does not import any other files.
              </Alert>
            ) : (
              <Box>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                  Found {dependencies.totalImports} import{dependencies.totalImports !== 1 ? 's' : ''}
                </Typography>

                {dependencies.missingCount > 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <AlertTitle>⚠️ {dependencies.missingCount} Missing Dependencies</AlertTitle>
                    The following imports could not be resolved in the target directory:
                  </Alert>
                )}

                <List>
                  {dependencies.imports.map((imp, idx) => (
                    <React.Fragment key={idx}>
                      <ListItem>
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                          {imp.exists ? (
                            <CheckCircle className="w-5 h-5" style={{ color: theme.palette.success.main }} />
                          ) : (
                            <XCircle className="w-5 h-5" style={{ color: theme.palette.error.main }} />
                          )}
                          <Box sx={{ flex: 1 }}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontFamily: 'monospace',
                                color: imp.exists ? 'text.primary' : 'error.main'
                              }}
                            >
                              {imp.importPath}
                            </Typography>
                            {imp.resolvedPath && (
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                Line {imp.lineNumber} → {imp.resolvedPath}
                              </Typography>
                            )}
                            {!imp.exists && !imp.resolvedPath && imp.importType !== 'package' && (
                              <Typography variant="caption" sx={{ color: 'error.main' }}>
                                Line {imp.lineNumber} → Not found in target
                              </Typography>
                            )}
                          </Box>
                          <Chip 
                            label={imp.importType} 
                            size="small" 
                            variant="outlined"
                            color={imp.importType === 'package' ? 'default' : 'primary'}
                          />
                        </Box>
                      </ListItem>
                      {idx < dependencies.imports.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* Tab: File Info */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Source File (Snapshot)
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1, fontSize: '0.875rem' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Path:</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{preview.sourcePath}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Size:</Typography>
                <Typography variant="body2">{preview.sourceSize} bytes</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Lines:</Typography>
                <Typography variant="body2">{diffLines.source.length}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Modified:</Typography>
                <Typography variant="body2">{new Date(preview.sourceModified).toLocaleString()}</Typography>
              </Box>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Target File (Current)
              </Typography>
              {isNewFile ? (
                <Alert severity="info">File does not exist in target directory - it will be created</Alert>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1, fontSize: '0.875rem' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>Path:</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{preview.targetPath}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>Size:</Typography>
                  <Typography variant="body2">{preview.targetSize} bytes</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>Lines:</Typography>
                  <Typography variant="body2">{diffLines.target.length}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>Modified:</Typography>
                  <Typography variant="body2">
                    {preview.targetModified ? new Date(preview.targetModified).toLocaleString() : 'N/A'}
                  </Typography>
                </Box>
              )}
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Restore Impact
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Alert severity={isNewFile ? 'info' : preview.diffStats.identical ? 'success' : 'warning'}>
                  {isNewFile && 'New file will be created'}
                  {!isNewFile && preview.diffStats.identical && 'Files are identical - no changes needed'}
                  {!isNewFile && !preview.diffStats.identical && (
                    <>
                      {preview.diffStats.linesAdded > 0 ? `${preview.diffStats.linesAdded} lines will be added` : ''}
                      {preview.diffStats.linesAdded < 0 ? `${Math.abs(preview.diffStats.linesAdded)} lines will be removed` : ''}
                      {preview.diffStats.linesAdded === 0 ? 'Same number of lines, but content differs' : ''}
                    </>
                  )}
                </Alert>
              </Box>
            </Box>
          </Box>
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={isRestoring}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={hasMissingDeps ? 'warning' : 'primary'}
          onClick={onConfirmRestore}
          disabled={isRestoring}
          startIcon={isRestoring ? <CircularProgress size={16} /> : null}
        >
          {isRestoring ? 'Restoring...' : hasMissingDeps ? 'Restore Anyway' : 'Confirm Restore'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DiffViewModal;
