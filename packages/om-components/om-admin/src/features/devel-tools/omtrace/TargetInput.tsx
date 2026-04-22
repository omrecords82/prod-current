import { Box, Button, Checkbox, Chip, FormControlLabel, TextField } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Play, X } from '@/ui/icons';
import React, { useEffect, useState } from 'react';
import { OmtraceRunFlags } from './types.ts';

interface TargetInputProps {
  onAnalyze: (targets: string[], flags: OmtraceRunFlags) => void;
  isLoading?: boolean;
}

export const TargetInput: React.FC<TargetInputProps> = ({ onAnalyze, isLoading = false }) => {
  const theme = useTheme();
  const [targets, setTargets] = useState<string[]>([]);
  const [currentTarget, setCurrentTarget] = useState('');
  const [flags, setFlags] = useState<OmtraceRunFlags>({
    reverse: false,
    deep: false,
    buildIndex: false,
    json: false,
    exact: false,
    listCandidates: false,
    pickFirst: false,
    refactor: false,
    yes: false,
    dryRun: false,
    force: false
  });

  // Load flags from localStorage on mount
  useEffect(() => {
    const savedFlags = localStorage.getItem('omtrace-flags');
    if (savedFlags) {
      try {
        const parsed = JSON.parse(savedFlags);
        setFlags(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.warn('Failed to parse saved flags:', e);
      }
    }
  }, []);

  // Save flags to localStorage when they change
  useEffect(() => {
    localStorage.setItem('omtrace-flags', JSON.stringify(flags));
  }, [flags]);

  const handleAddTarget = () => {
    if (currentTarget.trim() && !targets.includes(currentTarget.trim())) {
      setTargets(prev => [...prev, currentTarget.trim()]);
      setCurrentTarget('');
    }
  };

  const handleRemoveTarget = (targetToRemove: string) => {
    setTargets(prev => prev.filter(t => t !== targetToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTarget();
    }
  };

  const handleAnalyze = () => {
    if (targets.length > 0) {
      onAnalyze(targets, flags);
    }
  };

  const handleClearAll = () => {
    setTargets([]);
    setCurrentTarget('');
  };

  const toggleFlag = (flag: keyof OmtraceRunFlags) => {
    setFlags(prev => ({ ...prev, [flag]: !prev[flag] }));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Target Input */}
      <Box>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: theme.palette.text.primary, marginBottom: '0.5rem' }}>
          Component Targets
        </label>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            value={currentTarget}
            onChange={(e) => setCurrentTarget(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter component name or path (e.g., ChurchSetupWizard, src/components/...)"
          />
          <Button
            variant="contained"
            onClick={handleAddTarget}
            disabled={!currentTarget.trim()}
            sx={{ textTransform: 'none', minWidth: '80px' }}
          >
            Add
          </Button>
        </Box>
      </Box>

      {/* Target Chips */}
      {targets.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: theme.palette.text.primary }}>Targets:</span>
            <Button
              size="small"
              onClick={handleClearAll}
              sx={{ textTransform: 'none', color: 'error.main', minWidth: 'auto', fontSize: '0.875rem' }}
            >
              Clear All
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {targets.map((target, index) => (
              <Chip
                key={index}
                label={target}
                onDelete={() => handleRemoveTarget(target)}
                color="primary"
                size="small"
                deleteIcon={<X size={14} />}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Analysis Flags */}
      <Box>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: theme.palette.text.primary, marginBottom: '0.75rem' }}>
          Analysis Options
        </label>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
          <FormControlLabel
            control={<Checkbox checked={flags.reverse} onChange={() => toggleFlag('reverse')} />}
            label="Reverse Dependencies"
            sx={{ m: 0 }}
          />
          <FormControlLabel
            control={<Checkbox checked={flags.deep} onChange={() => toggleFlag('deep')} />}
            label="Deep Analysis"
            sx={{ m: 0 }}
          />
          <FormControlLabel
            control={<Checkbox checked={flags.buildIndex} onChange={() => toggleFlag('buildIndex')} />}
            label="Build Index"
            sx={{ m: 0 }}
          />
          <FormControlLabel
            control={<Checkbox checked={flags.json} onChange={() => toggleFlag('json')} />}
            label="JSON Output"
            sx={{ m: 0 }}
          />
          <FormControlLabel
            control={<Checkbox checked={flags.exact} onChange={() => toggleFlag('exact')} />}
            label="Exact Match"
            sx={{ m: 0 }}
          />
          <FormControlLabel
            control={<Checkbox checked={flags.listCandidates} onChange={() => toggleFlag('listCandidates')} />}
            label="List Candidates"
            sx={{ m: 0 }}
          />
        </Box>
      </Box>

      {/* Refactor Flags */}
      <Box>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: theme.palette.text.primary, marginBottom: '0.75rem' }}>
          Refactor Options
        </label>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          <FormControlLabel
            control={<Checkbox checked={flags.refactor} onChange={() => toggleFlag('refactor')} color="warning" />}
            label="Refactor Mode"
            sx={{ m: 0 }}
          />
          <FormControlLabel
            control={<Checkbox checked={flags.yes} onChange={() => toggleFlag('yes')} color="warning" />}
            label="Execute Refactor"
            sx={{ m: 0 }}
          />
          <FormControlLabel
            control={<Checkbox checked={flags.dryRun} onChange={() => toggleFlag('dryRun')} color="warning" />}
            label="Dry Run"
            sx={{ m: 0 }}
          />
          <FormControlLabel
            control={<Checkbox checked={flags.force} onChange={() => toggleFlag('force')} color="warning" />}
            label="Force"
            sx={{ m: 0 }}
          />
        </Box>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 1.5, pt: 2 }}>
        <Button
          variant="contained"
          onClick={handleAnalyze}
          disabled={targets.length === 0 || isLoading}
          startIcon={<Play size={18} />}
          sx={{ textTransform: 'none', px: 3, py: 1.5 }}
        >
          {flags.refactor ? 'Analyze & Refactor' : 'Analyze'}
        </Button>
        
        <Button
          variant="outlined"
          onClick={handleClearAll}
          sx={{ textTransform: 'none', px: 3, py: 1.5 }}
        >
          Clear
        </Button>
      </Box>
    </Box>
  );
};
