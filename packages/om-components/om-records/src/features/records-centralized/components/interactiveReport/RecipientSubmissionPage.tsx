/**
 * RecipientSubmissionPage Component
 * 
 * Public-facing page for recipients to submit interactive reports.
 * Accessed via a unique token URL: /r/interactive/:token
 * 
 * Route: /r/interactive/:token
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { CheckCircle, Error as ErrorIcon } from '@mui/icons-material';

interface ReportFormData {
  [key: string]: any;
}

const RecipientSubmissionPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<ReportFormData>({});
  const [reportConfig, setReportConfig] = useState<any>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const fetchReportConfig = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/interactive-reports/config/${token}`);
        // if (!response.ok) {
        //   throw new Error('Invalid or expired token');
        // }
        // const data = await response.json();
        // setReportConfig(data);
        
        // Placeholder: Set a default config
        setReportConfig({
          title: 'Interactive Report Submission',
          fields: [
            { name: 'name', label: 'Name', type: 'text', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'comments', label: 'Comments', type: 'textarea', required: false },
          ],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report form');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchReportConfig();
    }
  }, [token]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/interactive-reports/submit/${token}`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData),
      // });
      // if (!response.ok) {
      //   throw new Error('Failed to submit report');
      // }
      
      // Simulate success
      setTimeout(() => {
        setSuccess(true);
        setLoading(false);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report');
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  if (loading && !reportConfig) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !reportConfig) {
    return (
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Alert severity="error" icon={<ErrorIcon />}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (success) {
    return (
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Report Submitted Successfully
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Thank you for your submission. Your report has been received and will be reviewed.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/')}>
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {reportConfig?.title || 'Interactive Report Submission'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Please fill out the form below to submit your report.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {reportConfig?.fields?.map((field: any) => (
            <Grid item xs={12} key={field.name}>
              <TextField
                fullWidth
                label={field.label}
                type={field.type === 'textarea' ? undefined : field.type}
                multiline={field.type === 'textarea'}
                rows={field.type === 'textarea' ? 4 : undefined}
                required={field.required}
                value={formData[field.name] || ''}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
              />
            </Grid>
          ))}
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Submit Report'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default RecipientSubmissionPage;
