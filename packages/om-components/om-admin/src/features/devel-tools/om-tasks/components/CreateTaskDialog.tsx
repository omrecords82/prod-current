/**
 * CreateTaskDialog.tsx
 * Dialog for creating new tasks with visibility control
 * Features: Persistent draft state, localStorage, drag-and-drop .md files
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  Stack,
  Divider,
  Alert,
  Autocomplete,
  FormHelperText,
  Backdrop,
  CircularProgress
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  AttachFile as AttachFileIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import type { TaskFormData, TaskRevision } from './createTaskTypes';
import {
  TASK_CATEGORIES, IMPORTANCE_LEVELS, TASK_STATUSES, VISIBILITY_OPTIONS,
  TASK_TYPES, TAG_GROUPS, ALL_PREDEFINED_TAGS, normalizeTag,
  DRAFT_STORAGE_KEY, MAX_FILE_SIZE, DEBOUNCE_DELAY,
} from './createTaskTypes';
import type { CreateTaskDialogProps } from './createTaskTypes';
import { readFileAsText, parseRevisions, parseMetadataFromFile } from './markdownImportUtils';
import DropImportDialog from './DropImportDialog';


const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({ open, onClose, onSave }) => {
  // Load draft from localStorage on mount
  const loadDraft = (): TaskFormData => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate structure
        if (parsed && typeof parsed === 'object') {
          return {
            title: parsed.title || '',
            category: parsed.category || '',
            importance: parsed.importance || 'high',
            details: parsed.details || '',
            tags: Array.isArray(parsed.tags) ? parsed.tags : [],
            attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [],
            status: parsed.status || 1,
            type: parsed.type || ('' as any),
            visibility: parsed.visibility || 'admin',
            assignedTo: parsed.assignedTo || 'Nick Parsells',
            assignedBy: parsed.assignedBy || 'system',
            notes: parsed.notes || '',
            remindMe: parsed.remindMe || false,
            revisions: Array.isArray(parsed.revisions) ? parsed.revisions : undefined
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load draft:', e);
    }
    return {
      title: '',
      category: '',
      importance: 'high', // Default to High
      details: '',
      tags: [],
      attachments: [],
      status: 1,
      type: '' as any,
      visibility: 'admin',
      assignedTo: 'Nick Parsells', // Default
      assignedBy: 'system', // Default
      notes: '',
      remindMe: false,
      revisions: undefined
    };
  };

  const [formData, setFormData] = useState<TaskFormData>(loadDraft);
  const [tagInput, setTagInput] = useState('');
  const [attachmentInput, setAttachmentInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dropDialogOpen, setDropDialogOpen] = useState(false);
  const [droppedFile, setDroppedFile] = useState<{ name: string; content: string } | null>(null);
  const [parsedRevisions, setParsedRevisions] = useState<TaskRevision[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const detailsRef = useRef<HTMLTextAreaElement>(null);

  // Auto-fill date created (locked) - Use ISO string for API, format for display
  const now = new Date();
  const dateCreated = now.toISOString(); // For API: ISO format (YYYY-MM-DDTHH:MM:SS)
  const dateCreatedDisplay = now.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(',', ''); // For display: MM/DD/YYYY HH:MM

  // Debounced save to localStorage
  const saveDraft = useCallback((data: TaskFormData) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
        setHasUnsavedChanges(true);
      } catch (e) {
        console.warn('Failed to save draft:', e);
      }
    }, DEBOUNCE_DELAY);
  }, []);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setHasUnsavedChanges(false);
    } catch (e) {
      console.warn('Failed to clear draft:', e);
    }
  }, []);

  // Restore draft when dialog opens
  useEffect(() => {
    if (open) {
      const draft = loadDraft();
      setFormData(draft);
      setHasUnsavedChanges(Object.values(draft).some(v => {
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === 'string') return v.trim().length > 0;
        if (typeof v === 'number') return v !== 1; // status default is 1
        if (typeof v === 'boolean') return v !== false;
        return v !== '' && v !== null && v !== undefined;
      }));
    }
  }, [open]);

  const handleChange = (field: keyof TaskFormData, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-add default tag based on type
      if (field === 'type' && value) {
        const defaultTags: Record<string, string> = {
          'documentation': 'document-ai',
          'configuration': 'config-ai',
          'reference': 'reference-ai',
          'guide': 'guide-ai'
        };
        
        const defaultTag = defaultTags[value];
        if (defaultTag && !updated.tags.includes(defaultTag)) {
          updated.tags = [...updated.tags, defaultTag];
        }
      }
      
      saveDraft(updated);
      return updated;
    });
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAddTag = (tagValue?: string) => {
    const tagToAdd = normalizeTag(tagValue || tagInput);
    if (tagToAdd && !formData.tags.includes(tagToAdd)) {
      handleChange('tags', [...formData.tags, tagToAdd]);
      setTagInput('');
    }
  };

  const handleTagSelect = (selectedTags: string[]) => {
    // Normalize all tags and remove duplicates
    const normalizedTags = selectedTags
      .map(tag => normalizeTag(tag))
      .filter((tag, index, self) => tag && self.indexOf(tag) === index);
    handleChange('tags', normalizedTags);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleChange('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  const handleAddAttachment = () => {
    if (attachmentInput.trim() && !formData.attachments.includes(attachmentInput.trim())) {
      handleChange('attachments', [...formData.attachments, attachmentInput.trim()]);
      setAttachmentInput('');
    }
  };

  const handleRemoveAttachment = (attachmentToRemove: string) => {
    handleChange('attachments', formData.attachments.filter(att => att !== attachmentToRemove));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.importance) {
      newErrors.importance = 'Importance is required';
    }

    if (!formData.details.trim()) {
      newErrors.details = 'Details are required';
    }

    if (formData.tags.length === 0) {
      newErrors.tags = 'At least one tag is required';
    }

    if (!formData.type) {
      newErrors.type = 'Type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    const emptyForm: TaskFormData = {
      title: '',
      category: '',
      importance: '',
      details: '',
      tags: [],
      attachments: [],
      status: 1,
      type: '' as any,
      visibility: 'admin',
      assignedTo: '',
      assignedBy: '',
      notes: '',
      remindMe: false,
      revisions: undefined
    };
    setFormData(emptyForm);
    setTagInput('');
    setAttachmentInput('');
    setErrors({});
    clearDraft();
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setErrors({}); // Clear previous errors
    try {
      // Prepare task data with date_completed if status is "Task Completed" (6)
      const taskData = {
        ...formData,
        date_created: dateCreated,
        date_completed: formData.status === 7 ? dateCreated : undefined
      };
      
      const result = await onSave(taskData);
      
      // Check if result indicates failure
      if (result && result.success === false) {
        throw new Error(result.error || 'Failed to create task');
      }
      
      // Clear draft and reset form on success
      resetForm();
      onClose();
    } catch (error: any) {
      console.error('Error saving task:', error);
      console.error('Error details:', error.details);
      
      let errorMessage = error.message || 'Failed to create task. Please check your connection and try again.';
      
      // Include SQL error details if available (for debugging)
      if (error.details && error.details.sqlMessage) {
        errorMessage += `\n\nSQL Error: ${error.details.sqlMessage}`;
        if (error.details.code) {
          errorMessage += `\nError Code: ${error.details.code}`;
        }
      }
      
      setErrors({ submit: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    
    // Check if there are unsaved changes
    if (hasUnsavedChanges) {
      setDiscardConfirmOpen(true);
    } else {
      resetForm();
      onClose();
    }
  };

  const handleDiscardConfirm = () => {
    resetForm();
    setDiscardConfirmOpen(false);
    onClose();
  };

  const handleDiscardCancel = () => {
    setDiscardConfirmOpen(false);
  };

  // Drag and drop handlers
  const dragCounterRef = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const mdFile = files.find(f => 
      f.name.endsWith('.md') || 
      f.name.endsWith('.txt') ||
      f.type === 'text/markdown' ||
      f.type === 'text/plain'
    );

    if (!mdFile) {
      setErrors({ submit: 'Please drop a .md or .txt file' });
      return;
    }

    if (mdFile.size > MAX_FILE_SIZE) {
      setErrors({ submit: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` });
      return;
    }

    try {
      const content = await readFileAsText(mdFile);
      
      // Parse metadata from first 13 lines
      const metadata = parseMetadataFromFile(content);
      
      // Apply parsed metadata to form (only if field is empty)
      Object.entries(metadata).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          const currentValue = formData[key as keyof TaskFormData];
          // Only set if current value is empty
          if (!currentValue || (Array.isArray(currentValue) && currentValue.length === 0)) {
            handleChange(key as keyof TaskFormData, value);
          }
        }
      });
      
      const revisions = parseRevisions(content);
      
      // Validate: check if any Title: markers were found
      if (revisions.length === 0) {
        setParseError('No Title: markers found. Import expects Title: lines.');
        setDroppedFile({ name: mdFile.name, content });
        setParsedRevisions([]);
      } else {
        setParseError(null);
        setDroppedFile({ name: mdFile.name, content });
        setParsedRevisions(revisions);
      }
      setDropDialogOpen(true);
    } catch (error: any) {
      setErrors({ submit: `Failed to read file: ${error.message}` });
    }
  };




  const handleDropAction = (action: 'replace' | 'append' | 'attach' | 'import_revisions') => {
    if (!droppedFile) return;

    if (action === 'import_revisions') {
      // Import as revisions - store revisions in form data
      if (parsedRevisions.length > 0) {
        handleChange('revisions', parsedRevisions);
        // Also set details to full content for backward compatibility
        handleChange('details', droppedFile.content);
      }
    } else if (action === 'replace') {
      if (formData.details.trim()) {
        // Confirm replace if details already has content
        if (window.confirm('Replace existing Details content?')) {
          handleChange('details', droppedFile.content);
          // Clear revisions if replacing
          handleChange('revisions', undefined);
        } else {
          setDropDialogOpen(false);
          setDroppedFile(null);
          setParsedRevisions([]);
          setParseError(null);
          return;
        }
      } else {
        handleChange('details', droppedFile.content);
        handleChange('revisions', undefined);
      }
    } else if (action === 'append') {
      const separator = formData.details.trim() ? '\n\n---\n\n' : '';
      handleChange('details', formData.details + separator + droppedFile.content);
      // Don't modify revisions on append
    } else if (action === 'attach') {
      // For now, we'll store the filename in attachments
      // In a real implementation, you'd upload the file and get a URL
      const attachmentUrl = `[Local: ${droppedFile.name}]`;
      if (!formData.attachments.includes(attachmentUrl)) {
        handleChange('attachments', [...formData.attachments, attachmentUrl]);
      }
    }

    setDropDialogOpen(false);
    setDroppedFile(null);
    setParsedRevisions([]);
    setParseError(null);
  };

  const handleDropDialogCancel = () => {
    setDropDialogOpen(false);
    setDroppedFile(null);
    setParsedRevisions([]);
    setParseError(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Check if status is "Task Completed" (status 6)
  const isCompleted = formData.status === 7;

  return (
    <>
      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="md" 
        fullWidth
        disableEscapeKeyDown={hasUnsavedChanges}
        onBackdropClick={(e) => {
          if (hasUnsavedChanges) {
            e.preventDefault();
            handleClose();
          }
        }}
      >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Create New Task</Typography>
          <Chip
            label={formData.visibility === 'admin' ? 'Admin Only' : 'Public'}
            color={formData.visibility === 'admin' ? 'default' : 'primary'}
            size="small"
          />
        </Box>
      </DialogTitle>
      <DialogContent>
        {errors.submit && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrors(prev => ({ ...prev, submit: '' }))}>
            {errors.submit}
          </Alert>
        )}

        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Title - Required */}
          <TextField
            fullWidth
            label="Title"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            error={!!errors.title}
            helperText={errors.title}
            required
          />

          {/* Category - Required */}
          <FormControl fullWidth required error={!!errors.category}>
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              label="Category"
            >
              {TASK_CATEGORIES.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
            {errors.category && <FormHelperText>{errors.category}</FormHelperText>}
          </FormControl>

          {/* Importance - Required */}
          <FormControl fullWidth required error={!!errors.importance}>
            <InputLabel>Importance</InputLabel>
            <Select
              value={formData.importance}
              onChange={(e) => handleChange('importance', e.target.value)}
              label="Importance"
            >
              {IMPORTANCE_LEVELS.map((level) => (
                <MenuItem key={level.value} value={level.value}>
                  {level.label}
                </MenuItem>
              ))}
            </Select>
            {errors.importance && <FormHelperText>{errors.importance}</FormHelperText>}
          </FormControl>

          {/* Details - Required - Large resizable with drag-and-drop */}
          <Box
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
              position: 'relative',
              border: isDragging ? '2px dashed #8c249d' : '1px solid transparent',
              borderRadius: 1,
              bgcolor: isDragging ? 'action.hover' : 'transparent',
              transition: 'all 0.2s',
              minHeight: '400px'
            }}
          >
            {isDragging && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 10,
                  bgcolor: 'rgba(140, 36, 157, 0.15)',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 2,
                  pointerEvents: 'none'
                }}
              >
                <CloudUploadIcon sx={{ fontSize: 48, color: '#8c249d' }} />
                <Typography variant="h6" color="primary" fontWeight="bold">
                  Drop .md file to import
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Release to add content to Details
                </Typography>
              </Box>
            )}
            <TextField
              inputRef={detailsRef}
              fullWidth
              label="Details"
              multiline
              minRows={12}
              maxRows={30}
              value={formData.details}
              onChange={(e) => handleChange('details', e.target.value)}
              error={!!errors.details}
              helperText={errors.details || 'Drag and drop .md or .txt files here to import'}
              required
              sx={{
                '& .MuiInputBase-root': {
                  minHeight: '400px'
                },
                '& textarea': {
                  resize: 'vertical',
                  minHeight: '400px !important',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  lineHeight: 1.6
                }
              }}
            />
          </Box>

          {/* Type - Required */}
          <FormControl fullWidth required error={!!errors.type}>
            <InputLabel>Type</InputLabel>
            <Select
              value={formData.type || ''}
              onChange={(e) => handleChange('type', e.target.value)}
              label="Type"
            >
              {TASK_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  <Box>
                    <Typography variant="body1">{type.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {type.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
            {errors.type && <FormHelperText>{errors.type}</FormHelperText>}
            {!errors.type && (
              <FormHelperText>
                Category = domain (Ingestion, Workflow, etc.). Type = content nature (doc vs guide vs reference).
              </FormHelperText>
            )}
          </FormControl>

          {/* Tags - Required (at least one) - Autocomplete with predefined tags */}
          <Box>
            <Typography variant="body2" gutterBottom>
              Tags <span style={{ color: 'red' }}>*</span>
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
              {formData.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
            <Autocomplete
              multiple
              freeSolo
              options={ALL_PREDEFINED_TAGS}
              value={formData.tags}
              onChange={(_, newValue) => {
                handleTagSelect(newValue);
                setTagInput(''); // Clear input after selection
              }}
              inputValue={tagInput}
              onInputChange={(_, newInputValue, reason) => {
                // Only normalize on input, not on selection
                if (reason === 'input') {
                  setTagInput(newInputValue);
                } else {
                  setTagInput('');
                }
              }}
              groupBy={(option) => {
                // Find which group this tag belongs to
                const group = TAG_GROUPS.find(g => g.tags.includes(option));
                return group ? group.group : 'Custom';
              }}
              renderGroup={(params) => (
                <Box key={params.key}>
                  <Typography
                    variant="caption"
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      fontWeight: 'bold',
                      color: 'text.secondary',
                      bgcolor: 'grey.100',
                      display: 'block'
                    }}
                  >
                    {params.group}
                  </Typography>
                  {params.children}
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder="Type or select tags (kebab-case enforced)"
                  helperText={errors.tags || `${formData.tags.length} tag(s) selected. Tags are normalized to kebab-case.`}
                  error={!!errors.tags}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option}>
                  {option}
                </Box>
              )}
              getOptionLabel={(option) => typeof option === 'string' ? option : option}
              filterOptions={(options, params) => {
                const filtered = options.filter(option =>
                  option.toLowerCase().includes(params.inputValue.toLowerCase())
                );
                
                // If input doesn't match any predefined tag, allow custom entry
                if (params.inputValue && !filtered.includes(params.inputValue)) {
                  const normalized = normalizeTag(params.inputValue);
                  if (normalized && !filtered.includes(normalized)) {
                    filtered.push(normalized);
                  }
                }
                
                return filtered;
              }}
              sx={{ mb: 1 }}
            />
            {errors.tags && (
              <FormHelperText error sx={{ mt: 0.5 }}>
                {errors.tags}
              </FormHelperText>
            )}
          </Box>

          {/* Attachments - Optional */}
          <Box>
            <Typography variant="body2" gutterBottom>
              Attachments (Links to .md or other docs)
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
              {formData.attachments.map((attachment, index) => (
                <Chip
                  key={index}
                  label={attachment.length > 30 ? `${attachment.substring(0, 30)}...` : attachment}
                  onDelete={() => handleRemoveAttachment(attachment)}
                  size="small"
                  icon={<AttachFileIcon />}
                />
              ))}
            </Box>
            <Box display="flex" gap={1}>
              <TextField
                size="small"
                fullWidth
                placeholder="https://example.com/doc.md"
                value={attachmentInput}
                onChange={(e) => setAttachmentInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAttachment();
                  }
                }}
              />
              <Button size="small" onClick={handleAddAttachment} disabled={!attachmentInput.trim()}>
                Add
              </Button>
            </Box>
          </Box>

          {/* Status - Required */}
          <FormControl fullWidth required>
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              label="Status"
            >
              {TASK_STATUSES.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  {status.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Visibility - Required (New Field) */}
          <FormControl fullWidth required>
            <InputLabel>Visibility</InputLabel>
            <Select
              value={formData.visibility}
              onChange={(e) => handleChange('visibility', e.target.value as 'admin' | 'public')}
              label="Visibility"
            >
              {VISIBILITY_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              {formData.visibility === 'admin' 
                ? 'Only admins and superadmins can view this task'
                : 'Anyone can view this task on public pages'}
            </FormHelperText>
          </FormControl>

          <Divider />

          {/* Date Created - Auto-filled and locked */}
          <TextField
            fullWidth
            label="Date Created"
            value={dateCreatedDisplay}
            disabled
            helperText="Automatically set to current date and time"
          />

          {/* Date Completed - Auto-filled when status is "Task Completed" */}
          {isCompleted && (
            <TextField
              fullWidth
              label="Date Completed"
              value={dateCreatedDisplay}
              disabled
              helperText="Automatically set when task is marked as completed"
            />
          )}

          <Divider />

          {/* Optional Fields */}
          <Typography variant="subtitle2" color="text.secondary">
            Optional Fields
          </Typography>

          <TextField
            fullWidth
            label="Assigned To"
            value={formData.assignedTo}
            onChange={(e) => handleChange('assignedTo', e.target.value)}
            placeholder="Email or username"
          />

          <TextField
            fullWidth
            label="Assigned By"
            value={formData.assignedBy}
            onChange={(e) => handleChange('assignedBy', e.target.value)}
            placeholder="Email or username"
          />

          <TextField
            fullWidth
            label="Notes"
            multiline
            rows={3}
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Additional notes or context"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving} startIcon={<CancelIcon />}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || !formData.type}
          startIcon={saving ? null : <SaveIcon />}
          sx={{ bgcolor: '#8c249d', '&:hover': { bgcolor: '#6a1b9a' } }}
        >
          {saving ? 'Creating...' : 'Create Task'}
        </Button>
      </DialogActions>
    </Dialog>

    {/* Discard Confirmation Dialog */}
    <Dialog open={discardConfirmOpen} onClose={handleDiscardCancel}>
      <DialogTitle>Discard Draft?</DialogTitle>
      <DialogContent>
        <Typography>
          You have unsaved changes. Are you sure you want to discard them?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDiscardCancel}>Keep Editing</Button>
        <Button onClick={handleDiscardConfirm} color="error" variant="contained">
          Discard
        </Button>
      </DialogActions>
    </Dialog>

    {/* Drop Action Dialog */}
    <DropImportDialog
      open={dropDialogOpen}
      droppedFile={droppedFile}
      parsedRevisions={parsedRevisions}
      parseError={parseError}
      onAction={handleDropAction}
      onCancel={handleDropDialogCancel}
    />
    </>
  );
};

export default CreateTaskDialog;

