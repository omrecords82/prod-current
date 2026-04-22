/**
 * Orthodox Metrics - Editable Record Page
 * Dynamic form interface for church records with color customization and live preview
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  Divider,
  Toolbar,
  IconButton,
  Tooltip,
  Fab,
} from '@mui/material';
import {
  Save as SaveIcon,
  Preview as PreviewIcon,
  Refresh as RefreshIcon,
  ArrowBack as ArrowBackIcon,
  Palette as PaletteIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';

import {
  ChurchRecord,
  RecordType,
  RecordField,
} from '@/types/church-records-advanced.types';
// import {
//   createRecordWithFields,
//   getRecordSchema,
// } from '@/schemas/record-schemas';
// import { devLogStateChange } from '@/utils/devLogger';
// import FieldRenderer from '@/components/FieldRenderer';
// import RecordPreviewPane from '@/components/RecordPreviewPane';
// import ColorPickerPopover from '@/components/ColorPickerPopover';
// import recordService from '@/shared/lib/recordService';
import { useAuth } from '@/context/AuthContext';
// import { ThemedLayout } from '@/components/Theme/ThemedLayout';
// import { useTheme } from '@/context/ThemeContext';

interface EditableRecordPageProps {
  recordType?: RecordType;
  recordId?: string;
  onSave?: (record: ChurchRecord) => void;
  onCancel?: () => void;
  readonly?: boolean;
  showPreview?: boolean;
}

/**
 * Editable Record Page Component
 */
const EditableRecordPage: React.FC<EditableRecordPageProps> = ({
  recordType: propRecordType,
  recordId,
  onSave,
  onCancel,
  readonly = false,
  showPreview = true,
}) => {
  const navigate = useNavigate();
  const params = useParams();
  const { user } = useAuth();
  
  // Determine record type from props or URL params
  const recordType = propRecordType || (params.recordType as RecordType) || 'baptism';
  
  // Check if user has edit permissions
  const canEdit = user && ['super_admin', 'admin', 'manager'].includes(user.role);
  const isReadonly = readonly || !canEdit;
  
  // Initialize record state
  const [record, setRecord] = useState<ChurchRecord>(() => {
    return createRecordWithFields(recordType);
  });
  
  // Additional state for backend integration
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [errors, setErrors] = useState<{ [fieldKey: string]: string }>({});
  const [showPreviewPane, setShowPreviewPane] = useState(showPreview);
  const [isDirty, setIsDirty] = useState(false);

  // Load existing record if recordId is provided
  useEffect(() => {
    if (recordId) {
      loadRecord();
    }
  }, [recordId, recordType]);

  const loadRecord = async () => {
    if (!recordId) return;
    
    setIsLoading(true);
    setLoadError(null);
    
    try {
      const loadedRecord = await recordService.fetchRecordById(recordType, recordId);
      setRecord(loadedRecord);
      devLogStateChange('record', null, loadedRecord, 'EditableRecordPage');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load record';
      setLoadError(errorMessage);
      devLogStateChange('loadError', null, errorMessage, 'EditableRecordPage');
    } finally {
      setIsLoading(false);
    }
  };

  // Get schema for current record type
  const schema = useMemo(() => getRecordSchema(recordType), [recordType]);

  // Group fields by section
  const fieldsBySection = useMemo(() => {
    const grouped: { [sectionId: string]: RecordField[] } = {};
    
    schema.sections.forEach(section => {
      grouped[section.id] = record.fields.filter(field => 
        section.fields.includes(field.key)
      );
    });
    
    return grouped;
  }, [record.fields, schema.sections]);

  // Handle field value change
  const handleFieldChange = useCallback((fieldKey: string, value: any) => {
    setRecord(prevRecord => {
      const newRecord = {
        ...prevRecord,
        fields: prevRecord.fields.map(field =>
          field.key === fieldKey ? { ...field, value } : field
        ),
        metadata: {
          ...prevRecord.metadata,
          updatedAt: new Date(),
          version: prevRecord.metadata.version + 1,
        },
      };
      
      devLogStateChange('Field Value Changed', prevRecord, newRecord, 'EditableRecordPage');
      return newRecord;
    });
    
    setIsDirty(true);
    
    // Clear error for this field if it exists
    if (errors[fieldKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldKey];
        return newErrors;
      });
    }
  }, [errors]);

  // Handle field color change
  const handleFieldColorChange = useCallback((fieldKey: string, color: string) => {
    setRecord(prevRecord => {
      const newRecord = {
        ...prevRecord,
        colorOverrides: {
          ...prevRecord.colorOverrides,
          [fieldKey]: color,
        },
        metadata: {
          ...prevRecord.metadata,
          updatedAt: new Date(),
          version: prevRecord.metadata.version + 1,
        },
      };
      
      devLogStateChange('Field Color Changed', prevRecord.colorOverrides, newRecord.colorOverrides, 'EditableRecordPage');
      return newRecord;
    });
    
    setIsDirty(true);
  }, []);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: { [fieldKey: string]: string } = {};
    
    schema.requiredFields.forEach(fieldKey => {
      const field = record.fields.find(f => f.key === fieldKey);
      if (!field || !field.value || (typeof field.value === 'string' && field.value.trim() === '')) {
        newErrors[fieldKey] = `${field?.label || fieldKey} is required`;
      }
    });
    
    // Additional validation by field type
    record.fields.forEach(field => {
      if (field.value && field.validation) {
        const { min, max, pattern, message } = field.validation;
        
        if (field.type === 'email' && field.value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(field.value as string)) {
            newErrors[field.key] = 'Please enter a valid email address';
          }
        }
        
        if (field.type === 'number' && field.value) {
          const numValue = Number(field.value);
          if (min !== undefined && numValue < min) {
            newErrors[field.key] = message || `Value must be at least ${min}`;
          }
          if (max !== undefined && numValue > max) {
            newErrors[field.key] = message || `Value must be no more than ${max}`;
          }
        }
        
        if (pattern && field.value) {
          const regex = new RegExp(pattern);
          if (!regex.test(field.value as string)) {
            newErrors[field.key] = message || 'Invalid format';
          }
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [record.fields, schema.requiredFields]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      return;
    }
    
    if (!canEdit) {
      setSaveError('You do not have permission to edit records');
      return;
    }
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      // Update record status and metadata
      const finalRecord: ChurchRecord = {
        ...record,
        metadata: {
          ...record.metadata,
          status: 'active',
          updatedAt: new Date(),
        },
      };
      
      devLogStateChange('Record Saved', record, finalRecord, 'EditableRecordPage');
      
      if (onSave) {
        await onSave(finalRecord);
      } else {
        // Save to backend API
        if (recordId) {
          // Update existing record
          const result = await recordService.updateRecord(recordType, recordId, finalRecord);
          console.log('Record updated:', result);
        } else {
          // Create new record
          const result = await recordService.createRecord(recordType, finalRecord);
          console.log('Record created:', result);
          
          // Navigate to the newly created record
          if (result.id) {
            navigate(`/demos/editable-record/${recordType}/${result.id}`);
          }
        }
      }
      
      setIsDirty(false);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save record';
      setSaveError(errorMessage);
      console.error('Error saving record:', error);
    } finally {
      setIsSaving(false);
    }
  }, [record, validateForm, onSave, canEdit, recordType, recordId, navigate]);

  // Handle cancel/back
  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(-1);
    }
  }, [navigate, onCancel]);

  // Reset form to original state
  const handleReset = useCallback(() => {
    const freshRecord = createRecordWithFields(recordType);
    if (recordId) {
      freshRecord.id = recordId;
    }
    setRecord(freshRecord);
    setErrors({});
    setIsDirty(false);
    
    devLogStateChange('Form Reset', record, freshRecord, 'EditableRecordPage');
  }, [recordType, recordId, record]);

  // const { themeConfig } = useTheme();

  return (
    <div>
      <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box mb={3}>
        <Toolbar disableGutters>
          <IconButton onClick={handleCancel} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" component="h1">
              {recordId ? 'Edit' : 'New'} {recordType.charAt(0).toUpperCase() + recordType.slice(1)} Record
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {schema.description}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Toggle Preview">
              <IconButton 
                onClick={() => setShowPreviewPane(!showPreviewPane)}
                color={showPreviewPane ? 'primary' : 'default'}
              >
                <PreviewIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Reset Form">
              <IconButton onClick={handleReset} disabled={!isDirty}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={readonly || isSaving}
              loading={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Record'}
            </Button>
          </Box>
        </Toolbar>
        
        {isDirty && (
          <Alert severity="info" sx={{ mt: 2 }}>
            You have unsaved changes. Don't forget to save your work!
          </Alert>
        )}
        
        {!canEdit && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            You have read-only access. Only priests, deacons, and administrators can edit church records.
          </Alert>
        )}
        
        {loadError && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setLoadError(null)}>
            Failed to load record: {loadError}
          </Alert>
        )}
        
        {saveError && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setSaveError(null)}>
            Failed to save record: {saveError}
          </Alert>
        )}
        
        {Object.keys(errors).length > 0 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Please fix the following errors before saving:
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              {Object.entries(errors).map(([fieldKey, error]) => (
                <li key={fieldKey}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}
      </Box>

      {/* Main Content */}
      <Box sx={{ display: 'flex', gap: 3 }}>
        {/* Form Panel */}
        <Box sx={{ 
          flex: showPreviewPane ? '1 1 60%' : '1 1 100%', 
          minWidth: 0,
          transition: 'flex 0.3s ease'
        }}>
          {schema.sections.map(section => (
            <Card key={section.id} sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PaletteIcon color="primary" />
                  {section.title}
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {fieldsBySection[section.id]?.map(field => (
                    <FieldRenderer
                      key={field.key}
                      field={field}
                      value={field.value}
                      color={record.colorOverrides?.[field.key] || field.color}
                      error={errors[field.key]}
                      readonly={readonly}
                      onValueChange={(value: any) => handleFieldChange(field.key, value)}
                      onColorChange={(color: string) => handleFieldColorChange(field.key, color)}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Preview Panel */}
        {showPreviewPane && (
          <Box sx={{ 
            flex: '1 1 40%', 
            minWidth: '300px',
            position: 'sticky',
            top: '80px',
            height: 'fit-content',
            maxHeight: 'calc(100vh - 100px)',
            overflow: 'auto'
          }}>
            <RecordPreviewPane 
              record={record}
            />
          </Box>
        )}
      </Box>

      {/* Floating Action Button for Mobile */}
      {!showPreviewPane && (
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            display: { xs: 'flex', md: 'none' }
          }}
          onClick={() => setShowPreviewPane(true)}
        >
          <PreviewIcon />
        </Fab>
      )}
    </Container>
    </div>
  );
};

export default EditableRecordPage;
