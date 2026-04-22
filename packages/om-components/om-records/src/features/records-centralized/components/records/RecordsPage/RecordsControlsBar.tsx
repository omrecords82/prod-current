/**
 * RecordsControlsBar — Church/record-type selectors, view-mode toggle,
 * search bar, add-record button, and "more actions" menu.
 * Extracted from RecordsPage.tsx.
 */
import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Collapse,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  BarChart3,
  ChevronUp,
  Clock,
  Download,
  FileBarChart,
  LayoutGrid,
  List,
  MoreVertical,
  Plus,
  Search,
  Settings,
  Upload,
  Users,
  X,
} from '@/shared/ui/icons';
import { Church } from '@/shared/lib/churchService';
import { RECORD_TYPE_CONFIGS } from './utils';

type ViewMode = 'table' | 'card' | 'timeline' | 'analytics';

interface RecordsControlsBarProps {
  churches: Church[];
  selectedChurch: number;
  setSelectedChurch: (id: any) => void;
  selectedRecordType: string;
  onRecordTypeChange: (type: string) => void;
  activeView: ViewMode;
  setActiveView: (view: ViewMode) => void;
  isFiltersCollapsed: boolean;
  setIsFiltersCollapsed: (collapsed: boolean) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  setDebouncedSearch: (term: string) => void;
  searchLoading: boolean;
  searchDebounceRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  loading: boolean;
  onAddRecord: () => void;
  onExport: () => void;
  onGenerateReport: () => void;
  onCollaborativeReport: () => void;
  onOpenAdvancedGrid: () => void;
  useAgGrid: boolean;
  setUseAgGrid: (use: boolean) => void;
  agGridFailed: boolean;
  moreMenuAnchor: HTMLElement | null;
  setMoreMenuAnchor: (el: HTMLElement | null) => void;
  t: (key: string) => string;
}

const RecordsControlsBar: React.FC<RecordsControlsBarProps> = ({
  churches,
  selectedChurch,
  setSelectedChurch,
  selectedRecordType,
  onRecordTypeChange,
  activeView,
  setActiveView,
  isFiltersCollapsed,
  setIsFiltersCollapsed,
  searchTerm,
  setSearchTerm,
  setDebouncedSearch,
  searchLoading,
  searchDebounceRef,
  loading,
  onAddRecord,
  onExport,
  onGenerateReport,
  onCollaborativeReport,
  onOpenAdvancedGrid,
  useAgGrid,
  setUseAgGrid,
  agGridFailed,
  moreMenuAnchor,
  setMoreMenuAnchor,
  t,
}) => (
  <Card
    elevation={0}
    sx={{
      mb: 3,
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 2,
      overflow: 'visible',
    }}
  >
    <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
      <Stack spacing={2}>
        {/* Row 1: Church + Record Type selectors + View toggle + collapse */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          {/* Church selector or static name */}
          {churches.filter(c => c.id !== 0).length === 1 ? (
            <Typography variant="body1" fontWeight={700} sx={{ minWidth: 200 }}>
              {churches.find(c => c.id !== 0)?.church_name || t('records.label_church')}
            </Typography>
          ) : (
            <FormControl sx={{ minWidth: 220 }} size="small">
              <InputLabel>{t('records.label_church')}</InputLabel>
              <Select
                value={selectedChurch}
                label={t('records.label_church')}
                onChange={(e) => setSelectedChurch(e.target.value)}
                disabled={loading}
              >
                {churches.map((church) => {
                  const countKey = `${selectedRecordType}_count` as keyof Church;
                  const count = church.id !== 0 ? church[countKey] : undefined;
                  return (
                    <MenuItem key={church.id} value={church.id}>
                      {church.church_name}
                      {count !== undefined && ` (${count})`}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          )}

          <FormControl sx={{ minWidth: 200 }} size="small">
            <InputLabel>{t('records.label_record_type')}</InputLabel>
            <Select
              value={selectedRecordType}
              label={t('records.label_record_type')}
              onChange={(e) => onRecordTypeChange(e.target.value)}
              disabled={loading}
            >
              {RECORD_TYPE_CONFIGS.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {t(type.labelKey)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* View mode toggle */}
          {selectedRecordType && (
            <Stack direction="row" spacing={0.25} sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.5,
              p: 0.25,
              bgcolor: 'action.hover',
            }}>
              {([
                { key: 'table' as ViewMode, icon: <LayoutGrid size={15} />, label: t('records.view_table') },
                { key: 'card' as ViewMode, icon: <List size={15} />, label: t('records.view_cards') },
                { key: 'timeline' as ViewMode, icon: <Clock size={15} />, label: t('records.view_timeline') },
                { key: 'analytics' as ViewMode, icon: <BarChart3 size={15} />, label: t('records.view_analytics') },
              ]).map(({ key, icon, label }) => {
                const isActive = activeView === key;
                return (
                  <Button
                    key={key}
                    size="small"
                    variant={isActive ? 'contained' : 'text'}
                    onClick={() => setActiveView(key)}
                    startIcon={icon}
                    sx={{
                      textTransform: 'none',
                      fontWeight: isActive ? 600 : 400,
                      px: { xs: 1, sm: 1.5 },
                      py: 0.5,
                      minWidth: 'auto',
                      borderRadius: 1,
                      boxShadow: isActive ? 1 : 0,
                      fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                      ...(isActive ? {} : { color: 'text.secondary', '&:hover': { bgcolor: 'action.selected' } }),
                    }}
                  >
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{label}</Box>
                  </Button>
                );
              })}
            </Stack>
          )}

          {/* Spacer */}
          <Box sx={{ flex: 1, display: { xs: 'none', md: 'block' } }} />

          {/* Collapse toggle */}
          <IconButton
            onClick={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
            size="small"
            sx={{ alignSelf: { xs: 'flex-end', md: 'center' } }}
          >
            <ChevronUp size={20} style={{ transform: isFiltersCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </IconButton>
        </Stack>

        {/* Row 2 (collapsible): Search + Add Record + More Actions */}
        <Collapse in={!isFiltersCollapsed}>
          {selectedRecordType && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
              {/* Search */}
              <TextField
                placeholder={t('records.search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                    setDebouncedSearch(searchTerm);
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} style={{ color: 'inherit' }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchTerm('')} edge="end" aria-label="clear search">
                        <X size={16} />
                      </IconButton>
                    </InputAdornment>
                  ) : searchLoading ? <CircularProgress size={16} /> : null,
                }}
                size="small"
                sx={{ flex: 1, maxWidth: { sm: 400 } }}
              />

              {/* Add Record — prominent primary button */}
              <Button
                variant="contained"
                startIcon={<Plus size={18} />}
                onClick={onAddRecord}
                disabled={loading}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 2.5,
                  borderRadius: 1.5,
                  whiteSpace: 'nowrap',
                }}
              >
                {t('records.add_record')}
              </Button>

              {/* More Actions menu */}
              <Tooltip title={t('records.more_actions')}>
                <IconButton
                  onClick={(e) => setMoreMenuAnchor(e.currentTarget)}
                  size="small"
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                  }}
                >
                  <MoreVertical size={18} />
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={moreMenuAnchor}
                open={Boolean(moreMenuAnchor)}
                onClose={() => setMoreMenuAnchor(null)}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                slotProps={{ paper: { sx: { minWidth: 200, mt: 0.5 } } }}
              >
                <MenuItem onClick={() => { onExport(); setMoreMenuAnchor(null); }}>
                  <ListItemIcon><Download size={18} /></ListItemIcon>
                  <ListItemText>{t('records.export_records')}</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { setMoreMenuAnchor(null); /* TODO: Import */ }}>
                  <ListItemIcon><Upload size={18} /></ListItemIcon>
                  <ListItemText>{t('records.import_records')}</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { onGenerateReport(); setMoreMenuAnchor(null); }} disabled={!selectedRecordType}>
                  <ListItemIcon><FileBarChart size={18} /></ListItemIcon>
                  <ListItemText>{t('records.generate_report')}</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { onCollaborativeReport(); setMoreMenuAnchor(null); }}>
                  <ListItemIcon><Users size={18} /></ListItemIcon>
                  <ListItemText>{t('records.collaboration_link')}</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => { onOpenAdvancedGrid(); setMoreMenuAnchor(null); }}>
                  <ListItemIcon><Settings size={18} /></ListItemIcon>
                  <ListItemText>{t('records.grid_options')}</ListItemText>
                </MenuItem>
                {!agGridFailed && (
                  <MenuItem onClick={() => { setUseAgGrid(!useAgGrid); setMoreMenuAnchor(null); }}>
                    <ListItemIcon><LayoutGrid size={18} /></ListItemIcon>
                    <ListItemText>{useAgGrid ? t('records.use_standard_table') : t('records.use_advanced_grid')}</ListItemText>
                  </MenuItem>
                )}
              </Menu>
            </Stack>
          )}
        </Collapse>
      </Stack>
    </CardContent>
  </Card>
);

export default RecordsControlsBar;
