import { apiClient } from '@/api/utils/axiosInstance';
import { CustomizerContext } from '@/context/CustomizerContext';
import { ArrowForward, CheckCircle } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    CircularProgress,
    FormControl,
    FormControlLabel,
    FormGroup,
    FormLabel,
    Paper,
    Radio,
    RadioGroup,
    Slider,
    Step,
    StepContent,
    StepLabel,
    Stepper,
    Typography
} from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface SetupState {
  step1?: {
    churchId: number;
    churchName?: string;
    permissionsVerified: boolean;
  };
  step2?: {
    language: string;
    defaultLanguage: string;
    recordTypes: string[];
    confidenceThreshold: number;
  };
  step3?: {
    storagePath: string;
    storageWritable: boolean;
  };
  step4?: {
    visionConfigured: boolean;
  };
  step5?: {
    mappingTemplates: {
      baptism?: boolean;
      marriage?: boolean;
      funeral?: boolean;
    };
  };
}

interface ChecklistItem {
  passed: boolean;
  message: string;
}

interface ValidationResponse {
  checklist: {
    churchContext: ChecklistItem;
    ocrSettings: ChecklistItem;
    storageReady: ChecklistItem;
    visionReady: ChecklistItem;
    mappingReady: ChecklistItem;
  };
  allPassed: boolean;
  percentComplete: number;
}

const steps = [
  'Church Context & Permissions',
  'OCR Settings',
  'Storage & Uploads',
  'Vision Integration',
  'Mapping Baseline',
  'Ready to Launch'
];

export default function OcrSetupWizardPage() {
  const { isLayout } = useContext(CustomizerContext);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const churchId = parseInt(searchParams.get('church_id') || '46');
  
  const [activeStep, setActiveStep] = useState(0);
  const [setupState, setSetupState] = useState<SetupState>({});
  const [percentComplete, setPercentComplete] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load setup state on mount
  useEffect(() => {
    loadSetupState();
    validateSetup();
  }, [churchId]);

  const loadSetupState = async () => {
    try {
      const data = await apiClient.get<any>(`/church/${churchId}/ocr/setup-state`);
      setSetupState(data.state || {});
      setPercentComplete(data.percentComplete || 0);
      setIsComplete(data.isComplete || false);
      
      // Determine active step based on progress
      if (data.percentComplete >= 100) {
        setActiveStep(5);
      } else if (data.percentComplete >= 80) {
        setActiveStep(4);
      } else if (data.percentComplete >= 60) {
        setActiveStep(3);
      } else if (data.percentComplete >= 40) {
        setActiveStep(2);
      } else if (data.percentComplete >= 20) {
        setActiveStep(1);
      }
    } catch (err: any) {
      setError(`Failed to load setup state: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const validateSetup = async () => {
    try {
      const data = await apiClient.post<any>(`/church/${churchId}/ocr/setup-validate`);
      setValidation(data);
    } catch (err) {
      console.error('Validation failed:', err);
    }
  };

  const saveSetupState = async (newState: Partial<SetupState>, stepPercent: number) => {
    setSaving(true);
    try {
      const updatedState = { ...setupState, ...newState };
      const totalPercent = Math.max(percentComplete, stepPercent);
      const complete = totalPercent >= 100;

      await apiClient.put<any>(`/church/${churchId}/ocr/setup-state`, {
        state: updatedState,
        percentComplete: totalPercent,
        isComplete: complete
      });

      setSetupState(updatedState);
      setPercentComplete(totalPercent);
      setIsComplete(complete);
      await validateSetup();
    } catch (err: any) {
      setError(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleStep1Complete = async () => {
    await saveSetupState({
      step1: {
        churchId,
        permissionsVerified: true
      }
    }, 20);
    handleNext();
  };

  const handleStep2Complete = async () => {
    const step2Data = {
      language: setupState.step2?.language || 'eng',
      defaultLanguage: setupState.step2?.defaultLanguage || 'en',
      recordTypes: setupState.step2?.recordTypes || ['baptism'],
      confidenceThreshold: setupState.step2?.confidenceThreshold || 75
    };
    await saveSetupState({ step2: step2Data }, 40);
    handleNext();
  };

  const handleStep3Complete = async () => {
    await validateSetup();
    await saveSetupState({
      step3: {
        storagePath: `/var/www/orthodoxmetrics/data/church/${churchId}/ocr_uploads`,
        storageWritable: validation?.checklist.storageReady.passed || false
      }
    }, 60);
    handleNext();
  };

  const handleStep4Complete = async () => {
    await validateSetup();
    await saveSetupState({
      step4: {
        visionConfigured: validation?.checklist.visionReady.passed || false
      }
    }, 80);
    handleNext();
  };

  const handleStep5Complete = async () => {
    await saveSetupState({
      step5: {
        mappingTemplates: {
          baptism: true,
          marriage: true,
          funeral: true
        }
      }
    }, 100);
    handleNext();
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="body1" gutterBottom>
              Verify church context and permissions for OCR setup.
            </Typography>
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6">Church Information</Typography>
                <Typography>Church ID: {churchId}</Typography>
                <FormGroup sx={{ mt: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={setupState.step1?.permissionsVerified || false}
                        onChange={(e) => {
                          setSetupState({
                            ...setupState,
                            step1: {
                              churchId,
                              permissionsVerified: e.target.checked
                            }
                          });
                        }}
                      />
                    }
                    label="I have permission to configure OCR for this church"
                  />
                </FormGroup>
              </CardContent>
            </Card>
            <Button
              variant="contained"
              onClick={handleStep1Complete}
              disabled={!setupState.step1?.permissionsVerified}
              sx={{ mt: 2 }}
            >
              Continue
            </Button>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="body1" gutterBottom>
              Configure OCR language settings and record types.
            </Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <FormLabel>Default Language</FormLabel>
              <RadioGroup
                value={setupState.step2?.defaultLanguage || 'en'}
                onChange={(e) => {
                  setSetupState({
                    ...setupState,
                    step2: {
                      ...setupState.step2,
                      defaultLanguage: e.target.value,
                      language: e.target.value === 'en' ? 'eng' : e.target.value
                    }
                  });
                }}
              >
                <FormControlLabel value="en" control={<Radio />} label="English" />
                <FormControlLabel value="el" control={<Radio />} label="Greek" />
                <FormControlLabel value="ru" control={<Radio />} label="Russian" />
                <FormControlLabel value="ar" control={<Radio />} label="Arabic" />
              </RadioGroup>
            </FormControl>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <FormLabel>Record Types Enabled</FormLabel>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={setupState.step2?.recordTypes?.includes('baptism') || false}
                      onChange={(e) => {
                        const types = setupState.step2?.recordTypes || [];
                        const newTypes = e.target.checked
                          ? [...types, 'baptism']
                          : types.filter(t => t !== 'baptism');
                        setSetupState({
                          ...setupState,
                          step2: { ...setupState.step2, recordTypes: newTypes }
                        });
                      }}
                    />
                  }
                  label="Baptism"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={setupState.step2?.recordTypes?.includes('marriage') || false}
                      onChange={(e) => {
                        const types = setupState.step2?.recordTypes || [];
                        const newTypes = e.target.checked
                          ? [...types, 'marriage']
                          : types.filter(t => t !== 'marriage');
                        setSetupState({
                          ...setupState,
                          step2: { ...setupState.step2, recordTypes: newTypes }
                        });
                      }}
                    />
                  }
                  label="Marriage"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={setupState.step2?.recordTypes?.includes('funeral') || false}
                      onChange={(e) => {
                        const types = setupState.step2?.recordTypes || [];
                        const newTypes = e.target.checked
                          ? [...types, 'funeral']
                          : types.filter(t => t !== 'funeral');
                        setSetupState({
                          ...setupState,
                          step2: { ...setupState.step2, recordTypes: newTypes }
                        });
                      }}
                    />
                  }
                  label="Funeral"
                />
              </FormGroup>
            </FormControl>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <FormLabel>Confidence Threshold: {setupState.step2?.confidenceThreshold || 75}%</FormLabel>
              <Slider
                value={setupState.step2?.confidenceThreshold || 75}
                onChange={(_, value) => {
                  setSetupState({
                    ...setupState,
                    step2: { ...setupState.step2, confidenceThreshold: value as number }
                  });
                }}
                min={50}
                max={100}
                step={5}
                marks
              />
            </FormControl>
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button onClick={handleBack}>Back</Button>
              <Button
                variant="contained"
                onClick={handleStep2Complete}
                disabled={(setupState.step2?.recordTypes?.length || 0) === 0}
              >
                Save & Continue
              </Button>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="body1" gutterBottom>
              Verify storage paths and upload readiness.
            </Typography>
            {validation && (
              <Alert
                severity={validation.checklist.storageReady.passed ? 'success' : 'warning'}
                sx={{ mt: 2 }}
              >
                {validation.checklist.storageReady.message}
              </Alert>
            )}
            <Button
              variant="outlined"
              onClick={validateSetup}
              sx={{ mt: 2 }}
            >
              Re-check Storage
            </Button>
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button onClick={handleBack}>Back</Button>
              <Button
                variant="contained"
                onClick={handleStep3Complete}
                disabled={!validation?.checklist.storageReady.passed}
              >
                Continue
              </Button>
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="body1" gutterBottom>
              Verify Vision API credentials are configured.
            </Typography>
            {validation && (
              <Alert
                severity={validation.checklist.visionReady.passed ? 'success' : 'error'}
                sx={{ mt: 2 }}
              >
                {validation.checklist.visionReady.message}
              </Alert>
            )}
            <Typography variant="body2" sx={{ mt: 2 }}>
              Note: Credentials are configured server-side. This step only verifies they exist.
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button onClick={handleBack}>Back</Button>
              <Button
                variant="contained"
                onClick={handleStep4Complete}
                disabled={!validation?.checklist.visionReady.passed}
              >
                Continue
              </Button>
            </Box>
          </Box>
        );

      case 4:
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="body1" gutterBottom>
              Create or select mapping templates for record types.
            </Typography>
            <FormGroup sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={setupState.step5?.mappingTemplates?.baptism || false}
                    onChange={(e) => {
                      setSetupState({
                        ...setupState,
                        step5: {
                          mappingTemplates: {
                            ...setupState.step5?.mappingTemplates,
                            baptism: e.target.checked
                          }
                        }
                      });
                    }}
                  />
                }
                label="Baptism Mapping Template"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={setupState.step5?.mappingTemplates?.marriage || false}
                    onChange={(e) => {
                      setSetupState({
                        ...setupState,
                        step5: {
                          mappingTemplates: {
                            ...setupState.step5?.mappingTemplates,
                            marriage: e.target.checked
                          }
                        }
                      });
                    }}
                  />
                }
                label="Marriage Mapping Template"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={setupState.step5?.mappingTemplates?.funeral || false}
                    onChange={(e) => {
                      setSetupState({
                        ...setupState,
                        step5: {
                          mappingTemplates: {
                            ...setupState.step5?.mappingTemplates,
                            funeral: e.target.checked
                          }
                        }
                      });
                    }}
                  />
                }
                label="Funeral Mapping Template"
              />
            </FormGroup>
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button onClick={handleBack}>Back</Button>
              <Button
                variant="contained"
                onClick={handleStep5Complete}
                disabled={
                  !setupState.step5?.mappingTemplates?.baptism &&
                  !setupState.step5?.mappingTemplates?.marriage &&
                  !setupState.step5?.mappingTemplates?.funeral
                }
              >
                Complete Setup
              </Button>
            </Box>
          </Box>
        );

      case 5:
        return (
          <Box sx={{ p: 2 }}>
            <Alert severity="success" sx={{ mb: 2 }}>
              Setup Complete! You're ready to use Enhanced OCR Uploader.
            </Alert>
            <Typography variant="h6" gutterBottom>
              Summary
            </Typography>
            <Typography>Church ID: {churchId}</Typography>
            <Typography>Progress: {percentComplete}%</Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate(`/devel/ocr-studio/upload?church_id=${churchId}`)}
              sx={{ mt: 2 }}
              startIcon={<ArrowForward />}
            >
              Launch Enhanced OCR Uploader
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: isLayout === 'full' ? '100%' : 900, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        OCR Setup Wizard
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Church ID: {churchId} • Progress: {percentComplete}%
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mt: 2 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel
                optional={
                  index === activeStep ? (
                    <Typography variant="caption">Current step</Typography>
                  ) : index < activeStep ? (
                    <CheckCircle color="success" fontSize="small" />
                  ) : null
                }
              >
                {label}
              </StepLabel>
              <StepContent>
                {renderStepContent(index)}
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {saving && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body2">Saving...</Typography>
        </Box>
      )}
    </Box>
  );
}
