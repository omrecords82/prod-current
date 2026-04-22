import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import ConsoleCard from '../system/logs/ConsoleCard';
import LogCard from '../system/logs/LogCard';

interface LogEntry {
  id: number;
  timestamp: Date;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'SUCCESS';
  source: 'frontend' | 'backend' | 'dev' | 'browser';
  message: string;
  service?: string;
  origin?: string;
  source_component?: string;
  meta?: any;
}

interface RealTimeConsoleProps {
  isLive: boolean;
  logFilter?: string;
  maxLogs?: number;
  showInfoLogs?: boolean;
  isDarkMode?: boolean;
}

export const RealTimeConsole: React.FC<RealTimeConsoleProps> = ({ isLive, logFilter = 'All Logs', maxLogs = 25, showInfoLogs = false, isDarkMode = true }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Debug: Log when filter changes
  useEffect(() => {
    console.log('RealTimeConsole: Filter changed to:', logFilter);
  }, [logFilter]);

  // Filter logs based on the selected filter
  const getFilteredLogs = () => {
    console.log('RealTimeConsole filter:', logFilter, 'Total logs:', logs.length, 'showInfoLogs:', showInfoLogs);
    
    // Start with all logs
    let baseFilteredLogs = logs;
    
    // Hide INFO logs by default unless showInfoLogs is true
    if (!showInfoLogs) {
      baseFilteredLogs = logs.filter(log => log.level !== 'INFO');
      console.log('Hiding INFO logs, remaining:', baseFilteredLogs.length);
    }
    
    if (!logFilter || logFilter === 'All Logs') {
      console.log('Showing all logs before maxLogs filter:', baseFilteredLogs.length);
      const result = baseFilteredLogs.slice(-maxLogs); // Apply maxLogs limit
      console.log('Final logs after maxLogs filter:', result.length, 'maxLogs:', maxLogs);
      return result;
    }
    
    let filtered;
    switch (logFilter) {
      case 'Errors Only':
        filtered = baseFilteredLogs.filter(log => log.level === 'ERROR');
        console.log('Filtered ERROR logs:', filtered.length);
        break;
      case 'Warnings Only':
        filtered = baseFilteredLogs.filter(log => log.level === 'WARN');
        console.log('Filtered WARN logs:', filtered.length);
        break;
      case 'Info Only':
        // For Info Only filter, always show INFO logs regardless of showInfoLogs setting
        filtered = logs.filter(log => log.level === 'INFO');
        console.log('Filtered INFO logs:', filtered.length);
        break;
      case 'Success Only':
        filtered = baseFilteredLogs.filter(log => log.level === 'SUCCESS');
        console.log('Filtered SUCCESS logs:', filtered.length);
        break;
      case 'Debug Only':
        filtered = baseFilteredLogs.filter(log => log.level === 'DEBUG');
        console.log('Filtered DEBUG logs:', filtered.length);
        break;
      default:
        filtered = baseFilteredLogs;
        break;
    }
    
    return filtered.slice(-maxLogs); // Keep only the most recent maxLogs entries
  };

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current;
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [logs, autoScroll]);

  // Fetch logs from API
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await apiClient.get<any>('/admin/logs/database?limit=100&sort=desc');
        
        if (data.logs && Array.isArray(data.logs)) {
          const formattedLogs: LogEntry[] = data.logs.map((log: any, index: number) => ({
            id: log.id || index,
            timestamp: new Date(log.timestamp),
            level: log.level || 'INFO',
            source: log.source || 'backend',
            message: log.message || 'No message',
            service: log.service,
            meta: log.meta
          }));
          setLogs(formattedLogs.reverse()); // Show newest at bottom
        }
      } catch (error) {
        console.warn('Failed to fetch logs, using mock data');
        // Mock data for demonstration with SUCCESS and DEBUG support
        const mockLogs: LogEntry[] = [
          {
            id: 1,
            timestamp: new Date(),
            level: 'INFO',
            source: 'backend',
            message: 'User authentication successful',
            service: 'auth-service',
            origin: 'server',
            source_component: 'AuthController'
          },
          {
            id: 2,
            timestamp: new Date(Date.now() - 2000),
            level: 'SUCCESS',
            source: 'frontend',
            message: 'Page loaded successfully',
            service: 'ui-service',
            origin: 'browser',
            source_component: 'PageLoader'
          },
          {
            id: 3,
            timestamp: new Date(Date.now() - 4000),
            level: 'WARN',
            source: 'frontend',
            message: 'API response time exceeded threshold',
            service: 'api-gateway',
            origin: 'browser',
            source_component: 'ApiClient'
          },
          {
            id: 4,
            timestamp: new Date(Date.now() - 6000),
            level: 'WARN',
            source: 'backend',
            message: 'Memory usage approaching limit',
            service: 'monitoring',
            origin: 'server',
            source_component: 'MemoryMonitor'
          },
          {
            id: 5,
            timestamp: new Date(Date.now() - 8000),
            level: 'ERROR',
            source: 'backend',
            message: 'Database connection failed',
            service: 'db-service',
            origin: 'server',
            source_component: 'DatabasePool'
          },
          {
            id: 6,
            timestamp: new Date(Date.now() - 10000),
            level: 'ERROR',
            source: 'backend',
            message: 'Payment processing failure',
            service: 'payment-service',
            origin: 'server',
            source_component: 'PaymentProcessor'
          },
          {
            id: 7,
            timestamp: new Date(Date.now() - 12000),
            level: 'SUCCESS',
            source: 'backend',
            message: 'Backup completed successfully',
            service: 'backup-service',
            origin: 'server',
            source_component: 'BackupManager'
          },
          {
            id: 8,
            timestamp: new Date(Date.now() - 14000),
            level: 'DEBUG',
            source: 'browser',
            message: 'Component state updated',
            service: 'ui-service',
            origin: 'browser',
            source_component: 'ReactComponent'
          },
          {
            id: 9,
            timestamp: new Date(Date.now() - 16000),
            level: 'DEBUG',
            source: 'dev',
            message: 'Component mounted and initialized',
            service: 'logger-service',
            origin: 'devtools',
            source_component: 'DevLogger'
          },
          {
            id: 10,
            timestamp: new Date(Date.now() - 18000),
            level: 'SUCCESS',
            source: 'backend',
            message: 'Session cleanup completed',
            service: 'session-service',
            origin: 'server',
            source_component: 'SessionManager'
          },
          {
            id: 11,
            timestamp: new Date(Date.now() - 20000),
            level: 'DEBUG',
            source: 'frontend',
            message: 'Network request initiated',
            service: 'api-client',
            origin: 'browser',
            source_component: 'HttpClient'
          },
          {
            id: 12,
            timestamp: new Date(Date.now() - 22000),
            level: 'INFO',
            source: 'backend',
            message: 'Health check passed',
            service: 'monitoring',
            origin: 'server',
            source_component: 'HealthMonitor'
          }
        ];
        setLogs(mockLogs);
      }
    };

    fetchLogs();

    // Setup real-time updates if live
    if (isLive) {
      const interval = setInterval(fetchLogs, 2000);
      return () => clearInterval(interval);
    }
  }, [isLive]);

  const icon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );

  return (
    <ConsoleCard
      title="Real-Time Logs"
      titleColor={isDarkMode ? "text-green-400" : "text-green-600"}
      icon={icon}
      badge={{
        text: `${getFilteredLogs().length} logs`,
        color: isDarkMode 
          ? "bg-green-500/20 text-green-400 border-green-500/30"
          : "bg-green-100 text-green-700 border-green-300"
      }}
      isDarkMode={isDarkMode}
    >
      <div className="h-full flex flex-col">
        {/* Controls */}
        <div className={`p-4 border-b ${
          isDarkMode 
            ? 'border-gray-700 bg-gray-800/30' 
            : 'border-gray-300 bg-gray-50'
        }`}>
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className={`rounded text-green-500 focus:ring-green-500 ${
                  isDarkMode 
                    ? 'border-gray-600 bg-gray-700' 
                    : 'border-gray-300 bg-white'
                }`}
              />
              <span className={`text-sm ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>Auto-scroll</span>
            </label>
            
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className={`text-xs ${isLive ? 'text-green-400' : 'text-red-400'}`}>
                {isLive ? 'LIVE' : 'PAUSED'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Log Stream */}
        <div 
          ref={scrollAreaRef}
          className={`console-scroll-area flex-1 overflow-y-auto p-4 space-y-1 ${
            isDarkMode ? '' : 'bg-white'
          }`}
        >
          {getFilteredLogs().length === 0 ? (
            <div className={`flex items-center justify-center h-full ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <div className="text-center">
                <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${
                  isDarkMode ? 'bg-gray-700/50' : 'bg-gray-200'
                }`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className={`text-sm font-medium mb-1 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {logs.length === 0 ? (isLive ? 'Waiting for logs...' : 'No logs available') : `No ${logFilter?.toLowerCase().replace(' only', '')} logs`}
                </p>
                <p className={`text-xs ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {logs.length === 0 ? (isLive ? 'New entries will appear automatically' : 'Click refresh to load logs') : 'Try changing the filter or refreshing'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {getFilteredLogs().map((log) => (
                <LogCard
                  key={log.id}
                  timestamp={log.timestamp}
                  level={log.level}
                  source={log.source}
                  message={log.message}
                  service={log.service}
                  meta={log.meta}
                  isDarkMode={isDarkMode}
                />
              ))}
              {/* Terminal cursor effect */}
              {isLive && (
                <div className={`flex items-center space-x-2 opacity-70 ${
                  isDarkMode ? 'text-green-400' : 'text-green-600'
                }`}>
                  <span className="text-xs font-mono">
                    {new Date().toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                  <span className="terminal-cursor">▊</span>
                </div>
              )}
              <div ref={endRef} />
            </>
          )}
        </div>
      </div>
    </ConsoleCard>
  );
};

export default RealTimeConsole;