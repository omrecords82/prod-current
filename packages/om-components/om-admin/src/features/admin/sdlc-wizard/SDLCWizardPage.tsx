/**
 * SDLCWizardPage.tsx
 * Unified wizard for SDLC pipeline management with 3 modes:
 * - New Pipeline Work: create items + change set from scratch
 * - Advance Change Set: move an existing CS through its next transition
 * - Fast Forward: bypass staging/review for fully-tested work
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  FastForward as FastForwardIcon,
  Inventory2 as PackageIcon,
  RocketLaunch as RocketIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import {
  alpha,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Paper,
  Step,
  StepLabel,
  Stepper,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '@/shared/lib/apiClient';

// Step components
import AdvanceStep1 from './steps/AdvanceStep1';
import AdvanceStep2, { type TransitionFormData } from './steps/AdvanceStep2';
import AdvanceStep3 from './steps/AdvanceStep3';
import FastForwardStep1 from './steps/FastForwardStep1';
import FastForwardStep2 from './steps/FastForwardStep2';
import NewWorkStep1 from './steps/NewWorkStep1';
import NewWorkStep2, { type ChangeSetFormData } from './steps/NewWorkStep2';
import NewWorkStep3 from './steps/NewWorkStep3';

type WizardMode = 'new-work' | 'advance' | 'fast-forward' | null;

const MODE_STEPS: Record<string, string[]> = {
  'new-work': ['Select Items', 'Change Set Details', 'Review & Create'],
  'advance': ['Select Change Set', 'Transition Form', 'Execute'],
  'fast-forward': ['Select Change Set', 'Confirm & Execute'],
};

const BCrumb = [
  { to: '/', title: 'Home' },
  { to: '/admin/control-panel', title: 'Control Panel' },
  { to: '/admin/control-panel/om-daily', title: 'OM Daily' },
  { to: '/admin/control-panel/om-daily/change-sets', title: 'Change Sets' },
  { title: 'SDLC Wizard' },
];

const SDLCWizardPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Mode & step
  const [mode, setMode] = useState<WizardMode>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  // New Work mode state
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [itemTitles, setItemTitles] = useState<Record<number, string>>({});
  const [csFormData, setCsFormData] = useState<ChangeSetFormData>({
    title: '', change_type: 'feature', priority: 'medium',
    git_branch: '', deployment_strategy: 'stage_then_promote',
    has_db_changes: false, description: '',
  });
  const [createdCsId, setCreatedCsId] = useState<number | null>(null);
  const [createdCsCode, setCreatedCsCode] = useState<string>('');

  // Advance mode state
  const [advanceCs, setAdvanceCs] = useState<any>(null);
  const [transitionForm, setTransitionForm] = useState<TransitionFormData>({
    staging_build_run_id: '', staging_commit_sha: '',
    prod_build_run_id: '', prod_commit_sha: '', review_notes: '',
  });
  const [advanceCompleted, setAdvanceCompleted] = useState(false);

  // Fast-forward mode state
  const [ffCs, setFfCs] = useState<any>(null);
  const [ffCompleted, setFfCompleted] = useState(false);

  // Parse URL params for initial mode + preselected items
  useEffect(() => {
    const urlMode = searchParams.get('mode') as WizardMode;
    const urlItems = searchParams.get('items');
    const urlCs = searchParams.get('cs');

    if (urlMode && MODE_STEPS[urlMode]) {
      setMode(urlMode);
    }

    if (urlItems) {
      const ids = urlItems.split(',').map(Number).filter(n => !isNaN(n));
      setSelectedItemIds(ids);
      // Fetch titles for preselected items
      apiClient.get('/omai-daily/items').then(res => {
        const titleMap: Record<number, string> = {};
        for (const item of (res.data.items || [])) {
          if (ids.includes(item.id)) titleMap[item.id] = item.title;
        }
        setItemTitles(titleMap);
      }).catch(() => {});
    }

    if (urlCs && urlMode === 'advance') {
      const csId = parseInt(urlCs);
      if (!isNaN(csId)) {
        apiClient.get(`/admin/change-sets/${csId}`).then(res => {
          setAdvanceCs(res.data.change_set);
        }).catch(() => {});
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch item titles when selection changes (for new-work mode)
  useEffect(() => {
    if (mode !== 'new-work' || selectedItemIds.length === 0) return;
    apiClient.get('/omai-daily/items').then(res => {
      const titleMap: Record<number, string> = {};
      for (const item of (res.data.items || [])) {
        if (selectedItemIds.includes(item.id)) titleMap[item.id] = item.title;
      }
      setItemTitles(prev => ({ ...prev, ...titleMap }));
    }).catch(() => {});
  }, [selectedItemIds, mode]);

  const steps = mode ? MODE_STEPS[mode] : [];

  const canNext = useMemo(() => {
    if (!mode) return false;
    if (mode === 'new-work') {
      if (activeStep === 0) return selectedItemIds.length > 0;
      if (activeStep === 1) return !!csFormData.title.trim();
    }
    if (mode === 'advance') {
      if (activeStep === 0) return !!advanceCs;
    }
    if (mode === 'fast-forward') {
      if (activeStep === 0) return !!ffCs;
    }
    return true;
  }, [mode, activeStep, selectedItemIds, csFormData, advanceCs, ffCs]);

  const handleNext = () => setActiveStep(prev => prev + 1);
  const handleBack = () => setActiveStep(prev => prev - 1);

  const handleSelectMode = (m: WizardMode) => {
    setMode(m);
    setActiveStep(0);
    setCompleted(false);
  };

  const handleReset = () => {
    setMode(null);
    setActiveStep(0);
    setCompleted(false);
    setSelectedItemIds([]);
    setAdvanceCs(null);
    setFfCs(null);
    setTransitionForm({ staging_build_run_id: '', staging_commit_sha: '', prod_build_run_id: '', prod_commit_sha: '', review_notes: '' });
  };

  // ── Mode selector cards ──
  const renderModeSelector = () => (
    <Box>
      <Typography variant="h5" gutterBottom fontWeight={700}>
        <RocketIcon sx={{ mr: 1, verticalAlign: 'middle', color: theme.palette.primary.main }} />
        SDLC Pipeline Wizard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Choose a workflow to get started.
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        {/* New Pipeline Work */}
        <Card variant="outlined" sx={{ '&:hover': { borderColor: theme.palette.primary.main } }}>
          <CardActionArea onClick={() => handleSelectMode('new-work')} sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <AddIcon sx={{ fontSize: 48, color: theme.palette.primary.main, mb: 1 }} />
              <Typography variant="h6" gutterBottom>New Pipeline Work</Typography>
              <Typography variant="body2" color="text.secondary">
                Create work items and a new change set from scratch, then optionally activate.
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>

        {/* Advance Change Set */}
        <Card variant="outlined" sx={{ '&:hover': { borderColor: theme.palette.info.main } }}>
          <CardActionArea onClick={() => handleSelectMode('advance')} sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <TrendingUpIcon sx={{ fontSize: 48, color: theme.palette.info.main, mb: 1 }} />
              <Typography variant="h6" gutterBottom>Advance Change Set</Typography>
              <Typography variant="body2" color="text.secondary">
                Move an existing change set through its next lifecycle transition step by step.
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>

        {/* Fast Forward */}
        <Card variant="outlined" sx={{ '&:hover': { borderColor: theme.palette.warning.main } }}>
          <CardActionArea onClick={() => handleSelectMode('fast-forward')} sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <FastForwardIcon sx={{ fontSize: 48, color: theme.palette.warning.main, mb: 1 }} />
              <Typography variant="h6" gutterBottom>Fast Forward</Typography>
              <Typography variant="body2" color="text.secondary">
                Bypass all intermediate stages for fully-tested changes. Goes straight to promoted.
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      </Box>
    </Box>
  );

  // ── Step content ──
  const renderStepContent = () => {
    if (!mode) return null;

    if (mode === 'new-work') {
      switch (activeStep) {
        case 0:
          return <NewWorkStep1 selectedItemIds={selectedItemIds} onItemsChange={setSelectedItemIds} />;
        case 1:
          return <NewWorkStep2 formData={csFormData} onChange={setCsFormData} />;
        case 2:
          return (
            <NewWorkStep3
              formData={csFormData}
              selectedItemIds={selectedItemIds}
              itemTitles={itemTitles}
              onComplete={(id, code) => { setCreatedCsId(id); setCreatedCsCode(code); setCompleted(true); }}
            />
          );
      }
    }

    if (mode === 'advance') {
      switch (activeStep) {
        case 0:
          return <AdvanceStep1 selectedCsId={advanceCs?.id || null} onSelect={setAdvanceCs} />;
        case 1:
          return (
            <AdvanceStep2
              csStatus={advanceCs?.status || ''}
              csHasDbChanges={!!advanceCs?.has_db_changes}
              formData={transitionForm}
              onChange={setTransitionForm}
            />
          );
        case 2:
          return (
            <AdvanceStep3
              csId={advanceCs?.id}
              csCode={advanceCs?.code || ''}
              csStatus={advanceCs?.status || ''}
              csBranch={advanceCs?.git_branch || null}
              formData={transitionForm}
              onComplete={(newStatus) => { setAdvanceCompleted(true); setCompleted(true); }}
            />
          );
      }
    }

    if (mode === 'fast-forward') {
      switch (activeStep) {
        case 0:
          return <FastForwardStep1 selectedCsId={ffCs?.id || null} onSelect={setFfCs} />;
        case 1:
          return (
            <FastForwardStep2
              csId={ffCs?.id}
              csCode={ffCs?.code || ''}
              csStatus={ffCs?.status || ''}
              csBranch={ffCs?.git_branch || null}
              onComplete={() => { setFfCompleted(true); setCompleted(true); }}
            />
          );
      }
    }

    return null;
  };

  // Is the last step's action handled by the step component itself?
  const isLastStep = mode ? activeStep === steps.length - 1 : false;

  return (
    <PageContainer title="SDLC Wizard" description="Pipeline management wizard">
      <Breadcrumb title="SDLC Pipeline Wizard" items={BCrumb} />

      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {!mode ? (
          renderModeSelector()
        ) : (
          <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Button size="small" startIcon={<ArrowBackIcon />} onClick={handleReset}>
                Back to Modes
              </Button>
              <Typography variant="h5" fontWeight={700} sx={{ ml: 1 }}>
                {mode === 'new-work' ? 'New Pipeline Work' : mode === 'advance' ? 'Advance Change Set' : 'Fast Forward'}
              </Typography>
            </Box>

            {/* Stepper */}
            <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
              {steps.map((label, idx) => (
                <Step key={label} completed={activeStep > idx || completed}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {/* Content */}
            <Paper sx={{ p: 3, mb: 2 }}>
              {renderStepContent()}
            </Paper>

            {/* Navigation — only show Back/Next when not on last step (last step has its own execute button) */}
            {!completed && !isLastStep && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button
                  disabled={activeStep === 0}
                  onClick={handleBack}
                  startIcon={<ArrowBackIcon />}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={!canNext}
                  endIcon={<ArrowForwardIcon />}
                >
                  Next
                </Button>
              </Box>
            )}

            {/* Completed state — navigation to results */}
            {completed && (
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 2 }}>
                {createdCsId && (
                  <Button
                    variant="contained"
                    onClick={() => navigate(`/admin/control-panel/om-daily/change-sets/${createdCsId}`)}
                    startIcon={<PackageIcon />}
                  >
                    View {createdCsCode}
                  </Button>
                )}
                {advanceCs && advanceCompleted && (
                  <Button
                    variant="contained"
                    onClick={() => navigate(`/admin/control-panel/om-daily/change-sets/${advanceCs.id}`)}
                    startIcon={<PackageIcon />}
                  >
                    View {advanceCs.code}
                  </Button>
                )}
                <Button variant="outlined" onClick={() => navigate('/admin/control-panel/om-daily/change-sets')}>
                  Back to Dashboard
                </Button>
                <Button variant="outlined" onClick={handleReset}>
                  Start Another
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </PageContainer>
  );
};

export default SDLCWizardPage;
