import React, { useState, useCallback, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import HeaderBar from '@/features/logs/HeaderBar';
import RealTimeConsole from '@/features/logs/RealTimeConsole';
import CriticalConsole from '@/features/logs/CriticalConsole';
import SystemMessagesConsole from '@/features/logs/SystemMessagesConsole';
import DateLogsConsole from '@/features/logs/DateLogsConsole';
import Footer from '@/features/logs/Footer';

export interface LoggerDashboardProps {
  autoScroll?: boolean;
  defaultFilter?: any;
  refreshInterval?: number;
}

export const LoggerDashboard: React.FC<LoggerDashboardProps> = ({
  autoScroll = true,
  defaultFilter = {},
  refreshInterval = 30000
}) => {
  const [isLive, setIsLive] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeFilters, setActiveFilters] = useState(0);
  const [logFilter, setLogFilter] = useState('All Logs');
  const [activeTab, setActiveTab] = useState('realtime'); // For mobile tabs
  const [realTimeLogCount, setRealTimeLogCount] = useState(25);
  const [debugMode, setDebugMode] = useState(false);
  const [showInfoLogs, setShowInfoLogs] = useState(false); // Hide INFO logs by default

  // Create Material-UI theme based on dark/light mode
  const muiTheme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDarkMode ? 'dark' : 'light',
          primary: {
            main: isDarkMode ? '#3b82f6' : '#2563eb',
          },
          background: {
            default: isDarkMode ? '#0f172a' : '#f8fafc',
            paper: isDarkMode ? '#1e293b' : '#ffffff',
          },
          text: {
            primary: isDarkMode ? '#f1f5f9' : '#0f172a',
            secondary: isDarkMode ? '#94a3b8' : '#64748b',
          },
        },
      }),
    [isDarkMode]
  );

  // Dark mode effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleToggleLive = useCallback(() => {
    setIsLive(prev => !prev);
  }, []);

  const handleTogglePause = useCallback(() => {
    setIsPaused(prev => !prev);
    // Also toggle live when pausing
    if (!isPaused) {
      setIsLive(false);
    } else {
      setIsLive(true);
    }
  }, [isPaused]);

  const handleRefresh = useCallback(() => {
    // Trigger refresh for all components
    window.dispatchEvent(new CustomEvent('logsRefresh'));
  }, []);

  const handleToggleDarkMode = useCallback((value: boolean) => {
    setIsDarkMode(value);
  }, []);

  const handleLogFilterChange = useCallback((filter: string) => {
    setLogFilter(filter);
    // Update active filters count based on selected filter and INFO log visibility
    const filterCount = (filter === 'All Logs' ? 0 : 1) + (showInfoLogs ? 0 : 1);
    setActiveFilters(filterCount);
  }, [showInfoLogs]);

  const handleShowInfoLogsToggle = useCallback((show: boolean) => {
    setShowInfoLogs(show);
    // Update active filters count
    const filterCount = (logFilter === 'All Logs' ? 0 : 1) + (show ? 0 : 1);
    setActiveFilters(filterCount);
  }, [logFilter]);

  const handleRealTimeLogCountChange = useCallback((count: number) => {
    console.log('LoggerDashboard: Real-time log count changed to:', count);
    setRealTimeLogCount(count);
  }, []);

  const handleDebugModeToggle = useCallback((enabled: boolean) => {
    console.log('LoggerDashboard: Debug mode toggled:', enabled);
    setDebugMode(enabled);
    
    if (enabled) {
      startDebugCapture();
    } else {
      stopDebugCapture();
    }
  }, []);

  const startDebugCapture = () => {
    console.log('🟠 Starting debug capture mode...');
    // Store in session storage that debug mode is active
    sessionStorage.setItem('omaiDebugMode', 'true');
    sessionStorage.setItem('omaiDebugStartTime', Date.now().toString());
    
    // Initialize debug logs array
    sessionStorage.setItem('omaiDebugLogs', JSON.stringify([]));
    
    // Store performance mark
    if (performance && performance.mark) {
      performance.mark('debug-capture-start');
    }
  };

  const stopDebugCapture = () => {
    console.log('⏹️ Stopping debug capture mode...');
    sessionStorage.setItem('omaiDebugMode', 'false');
    
    // TODO: Upload batch debug logs to backend
    const debugLogs = JSON.parse(sessionStorage.getItem('omaiDebugLogs') || '[]');
    if (debugLogs.length > 0) {
      console.log(`Uploading ${debugLogs.length} debug logs...`);
      // Batch upload implementation will be added
    }
  };

  const captureDebugLog = (level: string, message: string) => {
    if (!debugMode) return;
    
    // Store in session storage for batch upload
    const debugLogs = JSON.parse(sessionStorage.getItem('omaiDebugLogs') || '[]');
    debugLogs.push({
      timestamp: Date.now(),
      level,
      message,
      url: window.location.href,
      userAgent: navigator.userAgent,
      source_component: 'DebugCapture'
    });
    sessionStorage.setItem('omaiDebugLogs', JSON.stringify(debugLogs));
  };

  // Mobile tab configuration
  const tabs = [
    { id: 'realtime', name: 'Real-Time', component: <RealTimeConsole isLive={isLive && !isPaused} /> },
    { id: 'critical', name: 'Critical', component: <CriticalConsole isLive={isLive && !isPaused} /> },
    { id: 'system', name: 'System', component: <SystemMessagesConsole isLive={isLive && !isPaused} /> },
    { id: 'historical', name: 'Historical', component: <DateLogsConsole /> }
  ];

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <div className={`h-screen flex flex-col logger-page-container ${
        isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-gray-900'
      }`}>
        {/* Header */}
        <HeaderBar
          title="OMAI Ultimate Logger"
          isLive={isLive}
          onToggleLive={handleToggleLive}
          isDarkMode={isDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
          activeFilters={activeFilters}
          onPause={handleTogglePause}
          onRefresh={handleRefresh}
          isPaused={isPaused}
          logFilter={logFilter}
          onLogFilterChange={handleLogFilterChange}
          realTimeLogCount={realTimeLogCount}
          onRealTimeLogCountChange={handleRealTimeLogCountChange}
          debugMode={debugMode}
          onDebugModeToggle={handleDebugModeToggle}
          showInfoLogs={showInfoLogs}
          onShowInfoLogsToggle={handleShowInfoLogsToggle}
        />

        {/* Main Content - Flex-grow to fill remaining space */}
        <main className="flex-1 flex flex-col p-4 min-h-0">
          {/* Always show 4-console grid layout */}
          <div className="grid grid-cols-2 grid-rows-2 gap-4 h-full min-h-0 logger-grid">
            {/* Top Left: Real-Time Logs */}
            <RealTimeConsole isLive={isLive && !isPaused} logFilter={logFilter} maxLogs={realTimeLogCount} showInfoLogs={showInfoLogs} isDarkMode={isDarkMode} />
            
            {/* Top Right: Critical Events */}
            <CriticalConsole isLive={isLive && !isPaused} logFilter={logFilter} showInfoLogs={showInfoLogs} isDarkMode={isDarkMode} />
            
            {/* Bottom Left: System Messages */}
            <SystemMessagesConsole isLive={isLive && !isPaused} logFilter={logFilter} showInfoLogs={showInfoLogs} isDarkMode={isDarkMode} />
            
            {/* Bottom Right: Historical Logs */}
            <DateLogsConsole logFilter={logFilter} showInfoLogs={showInfoLogs} isDarkMode={isDarkMode} />
          </div>

        {/* Mobile: Tabbed Interface (hidden for now) */}
        <div className="hidden flex flex-col h-full">
          {/* Tab Navigation */}
          <div className="border-b border-gray-700 mb-4 flex-shrink-0">
            <nav className="flex space-x-1 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
          
          {/* Tab Content - Takes remaining height */}
          <div className="flex-1 min-h-0">
            {activeTab === 'realtime' && <RealTimeConsole isLive={isLive && !isPaused} logFilter={logFilter} maxLogs={realTimeLogCount} showInfoLogs={showInfoLogs} />}
            {activeTab === 'critical' && <CriticalConsole isLive={isLive && !isPaused} logFilter={logFilter} showInfoLogs={showInfoLogs} />}
            {activeTab === 'system' && <SystemMessagesConsole isLive={isLive && !isPaused} logFilter={logFilter} showInfoLogs={showInfoLogs} />}
            {activeTab === 'historical' && <DateLogsConsole logFilter={logFilter} showInfoLogs={showInfoLogs} />}
          </div>
        </div>
      </main>

        {/* Footer - Fixed at bottom */}
        <Footer isLive={isLive} activeFilters={activeFilters} isDarkMode={isDarkMode} />
      </div>
    </ThemeProvider>
  );
};

export default LoggerDashboard;

