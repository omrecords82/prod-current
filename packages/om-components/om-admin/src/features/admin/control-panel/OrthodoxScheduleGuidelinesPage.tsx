/**
 * OrthodoxScheduleGuidelinesPage
 *
 * Admin page replacing the old SacramentalRestrictionsPage.
 * Provides Calendar, Timeline, and Table views of liturgical
 * scheduling restrictions, powered by DB when available or
 * the client-side restriction engine as fallback.
 */

import React, { useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import ScheduleHeader from './schedule-guidelines/ScheduleHeader';
import ScheduleFilterPanel from './schedule-guidelines/ScheduleFilterPanel';
import ScheduleCalendarView from './schedule-guidelines/ScheduleCalendarView';
import ScheduleTimelineView from './schedule-guidelines/ScheduleTimelineView';
import ScheduleTableView from './schedule-guidelines/ScheduleTableView';
import ScheduleDayDrawer from './schedule-guidelines/ScheduleDayDrawer';
import { useScheduleData } from './schedule-guidelines/useScheduleData';
import type { ViewMode, CalendarType, SacramentType } from './schedule-guidelines/scheduleTypes';

// Default church ID for global (non-church-specific) view
const DEFAULT_CHURCH_ID = 0;

const OrthodoxScheduleGuidelinesPage: React.FC = () => {
  // Core state
  const [year, setYear] = useState(new Date().getFullYear());
  const [calendar, setCalendar] = useState<CalendarType>('new');
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');

  // Filter state
  const [sacramentType, setSacramentType] = useState<SacramentType>('marriage');
  const [highlightFeasts, setHighlightFeasts] = useState(true);
  const [highlightFasts, setHighlightFasts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Data loading
  const { data, source, loading } = useScheduleData(DEFAULT_CHURCH_ID, year, calendar);

  const handleQuickFilter = (filter: string) => {
    setSearchQuery(filter === 'major-feasts' ? '' : filter.replace(/-/g, ' '));
  };

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
  };

  const handleCloseDrawer = () => {
    setSelectedDate(null);
  };

  return (
    <PageContainer title="Orthodox Schedule Guidelines" description="Liturgical calendar and sacramental scheduling">
      <Breadcrumb
        title="Orthodox Schedule Guidelines"
        items={[
          { to: '/admin/control-panel', title: 'Control Panel' },
          { to: '/admin/control-panel/church-management', title: 'Church Management' },
          { title: 'Schedule Guidelines' },
        ]}
      />

      <ScheduleHeader
        year={year}
        onYearChange={setYear}
        calendar={calendar}
        onCalendarChange={setCalendar}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        source={source}
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ px: 3, py: 4 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '300px 1fr' },
              gap: 4,
            }}
          >
            {/* Left Sidebar */}
            <Box component="aside">
              <ScheduleFilterPanel
                sacramentType={sacramentType}
                onSacramentTypeChange={setSacramentType}
                highlightFeasts={highlightFeasts}
                onHighlightFeastsChange={setHighlightFeasts}
                highlightFasts={highlightFasts}
                onHighlightFastsChange={setHighlightFasts}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                onQuickFilter={handleQuickFilter}
              />
            </Box>

            {/* Main Content */}
            <Box component="section">
              {viewMode === 'calendar' && (
                <ScheduleCalendarView
                  year={year}
                  data={data}
                  sacramentType={sacramentType}
                  highlightFeasts={highlightFeasts}
                  highlightFasts={highlightFasts}
                  onDateClick={handleDateClick}
                />
              )}
              {viewMode === 'timeline' && (
                <ScheduleTimelineView year={year} data={data} />
              )}
              {viewMode === 'table' && (
                <ScheduleTableView data={data} searchQuery={searchQuery} sacramentType={sacramentType} />
              )}
            </Box>
          </Box>
        </Box>
      )}

      {/* Day Detail Drawer */}
      <ScheduleDayDrawer
        open={selectedDate !== null}
        date={selectedDate}
        scheduleDay={selectedDate ? data.days.get(selectedDate) : undefined}
        onClose={handleCloseDrawer}
      />
    </PageContainer>
  );
};

export default OrthodoxScheduleGuidelinesPage;
