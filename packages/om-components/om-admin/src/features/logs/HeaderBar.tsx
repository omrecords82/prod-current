import React from 'react';

interface HeaderBarProps {
  title: string;
  isLive: boolean;
  onToggleLive: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: (value: boolean) => void;
  activeFilters: number;
  onPause: () => void;
  onRefresh: () => void;
  isPaused: boolean;
  logFilter: string;
  onLogFilterChange: (filter: string) => void;
  realTimeLogCount?: number;
  onRealTimeLogCountChange?: (count: number) => void;
  debugMode?: boolean;
  onDebugModeToggle?: (enabled: boolean) => void;
  showInfoLogs?: boolean;
  onShowInfoLogsToggle?: (show: boolean) => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  title,
  isLive,
  onToggleLive,
  isDarkMode,
  onToggleDarkMode,
  activeFilters,
  onPause,
  onRefresh,
  isPaused,
  logFilter,
  onLogFilterChange,
  realTimeLogCount = 25,
  onRealTimeLogCountChange,
  debugMode = false,
  onDebugModeToggle,
  showInfoLogs = false,
  onShowInfoLogsToggle
}) => {
  return (
    <header className={`border-b backdrop-blur-sm sticky top-0 z-50 ${
      isDarkMode 
        ? 'border-gray-700 bg-gray-900/50' 
        : 'border-gray-300 bg-gray-100/90'
    }`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Title & Live Status */}
          <div className="flex items-center space-x-4">
            <h1 className={`text-2xl font-mono font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {title}
            </h1>
            
            {/* Live Status Badge */}
            <button
              onClick={onToggleLive}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isLive 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              <div 
                className={`w-2 h-2 rounded-full ${
                  isLive ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                }`} 
              />
              <span>{isLive ? 'LIVE' : 'OFFLINE'}</span>
            </button>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center space-x-4">
            {/* Log Filter Dropdown */}
            <select 
              value={logFilter}
              onChange={(e) => onLogFilterChange(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm border bg-gray-800 border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              style={{ 
                color: 'white',
                backgroundColor: '#1f2937',
                borderColor: '#4b5563'
              }}
            >
              <option value="All Logs" style={{ color: 'white', backgroundColor: '#1f2937' }}>All Logs</option>
              <option value="Errors Only" style={{ color: 'white', backgroundColor: '#1f2937' }}>Errors Only</option>
              <option value="Warnings Only" style={{ color: 'white', backgroundColor: '#1f2937' }}>Warnings Only</option>
              <option value="Info Only" style={{ color: 'white', backgroundColor: '#1f2937' }}>Info Only</option>
              <option value="Success Only" style={{ color: 'white', backgroundColor: '#1f2937' }}>Success Only</option>
              <option value="Debug Only" style={{ color: 'white', backgroundColor: '#1f2937' }}>Debug Only</option>
            </select>

            {/* Pause Button */}
            <button
              onClick={onPause}
              className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors border ${
                isPaused
                  ? 'bg-red-500 hover:bg-red-600 border-red-600'
                  : isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 border-gray-600'
                  : 'bg-gray-600 hover:bg-gray-700 border-gray-700'
              }`}
              style={{ 
                color: 'white',
                fontWeight: 'bold'
              }}
            >
              {isPaused ? '▶️ Resume' : '⏸️ Pause'}
            </button>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors border ${
                isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 border-gray-600'
                  : 'bg-gray-600 hover:bg-gray-700 border-gray-700'
              }`}
              style={{ 
                color: 'white',
                fontWeight: 'bold'
              }}
            >
              🔄 Refresh
            </button>

            {/* Real-Time Log Count Selector */}
            <select
              value={realTimeLogCount}
              onChange={(e) => onRealTimeLogCountChange && onRealTimeLogCountChange(Number(e.target.value))}
              className="px-3 py-2 rounded-lg text-sm border bg-gray-800 border-gray-600 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              style={{ 
                color: 'white',
                backgroundColor: '#1f2937',
                borderColor: '#4b5563'
              }}
              title="Real-Time Log Count"
            >
              <option value={5} style={{ color: 'white', backgroundColor: '#1f2937' }}>5 logs</option>
              <option value={10} style={{ color: 'white', backgroundColor: '#1f2937' }}>10 logs</option>
              <option value={25} style={{ color: 'white', backgroundColor: '#1f2937' }}>25 logs</option>
              <option value={50} style={{ color: 'white', backgroundColor: '#1f2937' }}>50 logs</option>
            </select>

            {/* Debug Mode Toggle */}
            <button
              onClick={() => onDebugModeToggle && onDebugModeToggle(!debugMode)}
              className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors border ${
                debugMode
                  ? 'bg-orange-500 hover:bg-orange-600 border-orange-600 animate-pulse'
                  : isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 border-gray-600'
                  : 'bg-gray-600 hover:bg-gray-700 border-gray-700'
              }`}
              style={{ 
                color: 'white',
                fontWeight: 'bold'
              }}
              title="Toggle Debug Mode Capture"
            >
              {debugMode ? '🟠 Debug ON' : '🔧 Debug OFF'}
            </button>

            {/* Show Info Logs Toggle */}
            <button
              onClick={() => onShowInfoLogsToggle && onShowInfoLogsToggle(!showInfoLogs)}
              className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors border ${
                showInfoLogs
                  ? 'bg-blue-500 hover:bg-blue-600 border-blue-600'
                  : isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 border-gray-600'
                  : 'bg-gray-600 hover:bg-gray-700 border-gray-700'
              }`}
              style={{ 
                color: 'white',
                fontWeight: 'bold'
              }}
              title={showInfoLogs ? 'Hide INFO logs' : 'Show INFO logs (hidden by default)'}
            >
              {showInfoLogs ? '📄 Info ON' : '📄 Info OFF'}
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => onToggleDarkMode(!isDarkMode)}
              className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors border ${
                isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 border-gray-600'
                  : 'bg-gray-600 hover:bg-gray-700 border-gray-700'
              }`}
              style={{ 
                color: 'white',
                fontWeight: 'bold'
              }}
            >
              {isDarkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderBar;