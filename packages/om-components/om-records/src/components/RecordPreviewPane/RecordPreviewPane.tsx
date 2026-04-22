/**
 * Orthodox Metrics - Record Preview Pane Component
 * Real-time preview of church records with applied colors and styling
 */

import React, { useMemo } from 'react';
import {
  Paper,
  Typography,
  Box,
  Divider,
  Chip,
  Alert,
} from '@mui/material';
import {
  Person as PersonIcon,
  Event as EventIcon,
  LocationOn as LocationIcon,
  Group as GroupIcon,
  Description as DescriptionIcon,
  DateRange as DateRangeIcon,
  Place as PlaceIcon,
} from '@mui/icons-material';

import { ChurchRecord, RecordField } from '../../types/church-records-advanced.types.ts';

interface RecordPreviewPaneProps {
  record: ChurchRecord;
  title?: string;
  showValidation?: boolean;
}

/**
 * Get icon for field based on its key
 */
const getFieldIcon = (fieldKey: string) => {
  const key = fieldKey.toLowerCase();
  
  if (key.includes('name') || key.includes('person')) return <PersonIcon fontSize="small" />;
  if (key.includes('date') || key.includes('time')) return <DateRangeIcon fontSize="small" />;
  if (key.includes('location') || key.includes('place') || key.includes('church')) return <LocationIcon fontSize="small" />;
  if (key.includes('event') || key.includes('ceremony')) return <EventIcon fontSize="small" />;
  if (key.includes('parent') || key.includes('godparent') || key.includes('witness')) return <GroupIcon fontSize="small" />;
  if (key.includes('note') || key.includes('comment') || key.includes('description')) return <DescriptionIcon fontSize="small" />;
  if (key.includes('address') || key.includes('origin')) return <PlaceIcon fontSize="small" />;
  
  return <DescriptionIcon fontSize="small" />;
};

/**
 * Format field value for display
 */
const formatFieldValue = (field: RecordField): string => {
  if (!field.value && field.value !== 0) return 'Not specified';
  
  if (typeof field.value === 'boolean') {
    return field.value ? 'Yes' : 'No';
  }
  
  if (field.type === 'date' && typeof field.value === 'string') {
    try {
      const date = new Date(field.value);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return field.value;
    }
  }
  
  return String(field.value);
};

/**
 * Group fields by section
 */
const groupFieldsBySection = (fields: RecordField[]): Record<string, RecordField[]> => {
  const grouped: Record<string, RecordField[]> = {};
  
  fields.forEach(field => {
    const section = field.section || 'General Information';
    if (!grouped[section]) {
      grouped[section] = [];
    }
    grouped[section].push(field);
  });
  
  return grouped;
};

/**
 * Record Preview Pane Component
 */
const RecordPreviewPane: React.FC<RecordPreviewPaneProps> = ({
  record,
  title = 'Record Preview',
  showValidation = true,
}) => {
  // Group fields by section
  const groupedFields = useMemo(() => groupFieldsBySection(record.fields), [record.fields]);
  
  // Calculate validation status
  const validationStatus = useMemo(() => {
    const requiredFields = record.fields.filter(field => field.required);
    const filledRequiredFields = requiredFields.filter(field => 
      field.value !== null && field.value !== undefined && field.value !== ''
    );
    
    const totalFields = record.fields.length;
    const filledFields = record.fields.filter(field => 
      field.value !== null && field.value !== undefined && field.value !== ''
    );
    
    return {
      requiredFieldsTotal: requiredFields.length,
      requiredFieldsFilled: filledRequiredFields.length,
      allFieldsTotal: totalFields,
      allFieldsFilled: filledFields.length,
      isValid: filledRequiredFields.length === requiredFields.length,
      completionPercentage: Math.round((filledFields.length / totalFields) * 100),
    };
  }, [record.fields]);

  return (
    <Paper elevation={1} sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        
        {/* Record Type */}
        <Chip
          label={record.recordType.charAt(0).toUpperCase() + record.recordType.slice(1) + ' Record'}
          color="primary"
          variant="outlined"
          sx={{ mb: 2 }}
        />
        
        {/* Validation Status */}
        {showValidation && (
          <Box sx={{ mb: 2 }}>
            {validationStatus.isValid ? (
              <Alert severity="success" sx={{ mb: 1 }}>
                All required fields completed ({validationStatus.requiredFieldsFilled}/{validationStatus.requiredFieldsTotal})
              </Alert>
            ) : (
              <Alert severity="warning" sx={{ mb: 1 }}>
                Missing required fields ({validationStatus.requiredFieldsFilled}/{validationStatus.requiredFieldsTotal} completed)
              </Alert>
            )}
            
            <Typography variant="body2" color="text.secondary">
              Overall completion: {validationStatus.completionPercentage}% ({validationStatus.allFieldsFilled}/{validationStatus.allFieldsTotal} fields)
            </Typography>
          </Box>
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Record Sections */}
      {Object.entries(groupedFields).map(([sectionName, sectionFields]) => (
        <Box key={sectionName} sx={{ mb: 4 }}>
          {/* Section Header */}
          <Typography variant="h6" color="primary" gutterBottom sx={{ mb: 2 }}>
            {sectionName}
          </Typography>
          
          {/* Section Fields */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {sectionFields.map((field) => (
              <Box key={field.key} sx={{ flex: '1 1 calc(50% - 8px)', minWidth: 250 }}>
                <Box
                  sx={{
                    p: 2,
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    backgroundColor: field.color ? field.color + '10' : 'transparent', // 10% opacity
                    borderColor: field.color || '#e0e0e0',
                    position: 'relative',
                  }}
                >
                  {/* Field Color Indicator */}
                  {field.color && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: 4,
                        height: '100%',
                        backgroundColor: field.color,
                        borderRadius: '4px 0 0 4px',
                      }}
                    />
                  )}
                  
                  {/* Field Header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, pl: field.color ? 1 : 0 }}>
                    {getFieldIcon(field.key)}
                    <Typography
                      variant="subtitle2"
                      sx={{ 
                        ml: 1, 
                        fontWeight: 600,
                        color: field.color || 'text.primary',
                      }}
                    >
                      {field.label}
                      {field.required && (
                        <Typography component="span" color="error" sx={{ ml: 0.5 }}>
                          *
                        </Typography>
                      )}
                    </Typography>
                  </Box>
                  
                  {/* Field Value */}
                  <Typography
                    variant="body2"
                    sx={{
                      pl: field.color ? 1 : 0,
                      color: field.value ? 'text.primary' : 'text.secondary',
                      fontStyle: field.value ? 'normal' : 'italic',
                      wordBreak: 'break-word',
                    }}
                  >
                    {formatFieldValue(field)}
                  </Typography>
                  
                  {/* Validation Error */}
                  {field.required && !field.value && showValidation && (
                    <Typography variant="caption" color="error" sx={{ pl: field.color ? 1 : 0, display: 'block', mt: 0.5 }}>
                      This field is required
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      ))}

      {/* Record Metadata */}
      <Divider sx={{ mt: 4, mb: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Record ID: {record.id}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Last updated: {new Date().toLocaleString()}
        </Typography>
      </Box>
    </Paper>
  );
};

export default RecordPreviewPane;
