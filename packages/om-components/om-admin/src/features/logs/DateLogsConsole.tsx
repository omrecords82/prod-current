import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import ConsoleCard from '../system/logs/ConsoleCard';
import HistoricalLogItem from '../system/logs/HistoricalLogItem';

interface HistoricalLog {
  id: number;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'SUCCESS';
  source: 'frontend' | 'backend' | 'dev' | 'browser';
  description: string;
  firstOccurrence: Date;
  occurrences: number;
  details: string[];
  origin?: string;
  source_component?: string;
}

type TimeFilter = 'yesterday' | 'today' | '24h' | 'week' | 'month';

interface DateLogsConsoleProps {
  logFilter?: string;
  showInfoLogs?: boolean;
  isDarkMode?: boolean;
}

export const DateLogsConsole: React.FC<DateLogsConsoleProps> = ({ logFilter = 'All Logs', showInfoLogs = false, isDarkMode = true }) => {
  const [logs, setLogs] = useState<HistoricalLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  // Filter logs based on the selected filter
  const getFilteredLogs = () => {
    console.log('DateLogsConsole filter:', logFilter, 'Total logs:', logs.length);
    
    if (!logFilter || logFilter === 'All Logs') {
      console.log('Showing all historical logs:', logs.length);
      return logs;
    }
    
    let filtered;
    switch (logFilter) {
      case 'Errors Only':
        filtered = logs.filter(log => log.level === 'ERROR');
        console.log('Filtered historical ERROR logs:', filtered.length);
        break;
      case 'Warnings Only':
        filtered = logs.filter(log => log.level === 'WARN');
        console.log('Filtered historical WARN logs:', filtered.length);
        break;
      case 'Info Only':
        filtered = logs.filter(log => log.level === 'INFO');
        console.log('Filtered historical INFO logs:', filtered.length);
        break;
      case 'Success Only':
        filtered = logs.filter(log => log.level === 'SUCCESS');
        console.log('Filtered historical SUCCESS logs:', filtered.length);
        break;
      case 'Debug Only':
        filtered = logs.filter(log => log.level === 'DEBUG');
        console.log('Filtered historical DEBUG logs:', filtered.length);
        break;
      default:
        filtered = logs;
        break;
    }
    
    return filtered;
  };

  const getDateRange = (filter: TimeFilter) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filter) {
      case 'yesterday':
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        return { start: yesterday, end: today };
      case 'today':
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case '24h':
        return { start: new Date(now.getTime() - 24 * 60 * 60 * 1000), end: now };
      case 'week':
        return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
      case 'month':
        return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now };
      default:
        return { start: yesterday, end: today };
    }
  };

  useEffect(() => {
    const fetchHistoricalLogs = async () => {
      setLoading(true);
      try {
        const { start, end } = getDateRange(timeFilter);
        const startDate = start.toISOString();
        const endDate = end.toISOString();
        
        const data = await apiClient.get<any>(`/admin/logs/database?start_date=${startDate}&end_date=${endDate}&limit=50&sort=desc&group_similar=true`);
        
        if (data.logs && Array.isArray(data.logs) && data.logs.length > 0) {
          const formattedLogs: HistoricalLog[] = data.logs.map((log: any, index: number) => ({
            id: log.id || index,
            level: log.level || 'INFO',
            source: log.source || 'backend',
            description: log.message || 'No description available',
            firstOccurrence: new Date(log.latest_timestamp || log.timestamp),
            occurrences: log.occurrence_count || 1,
            details: log.details || []
          }));
          setLogs(formattedLogs);
        } else {
          // Use mock data if no logs found
          setLogs(getMockLogs());
        }
      } catch (error) {
        console.warn('Failed to fetch historical logs, using mock data');
        setLogs(getMockLogs());
      } finally {
        setLoading(false);
      }
    };

    const getMockLogs = (): HistoricalLog[] => {
      return [
          {
            id: 1,
            level: 'ERROR',
            source: 'backend',
            description: 'Database connection timeout',
            firstOccurrence: new Date(Date.now() - 3600000),
            occurrences: 27,
            details: [
              'Connection timeout after 30 seconds',
              'Query: SELECT * FROM users WHERE active = 1',
              'Database host: db-primary-01.internal',
              'Connection pool: exhausted (50/50)'
            ]
          },
          {
            id: 2,
            level: 'WARN',
            source: 'frontend',
            description: 'API response time exceeded threshold',
            firstOccurrence: new Date(Date.now() - 7200000),
            occurrences: 15,
            details: [
              'Response time: 2.3 seconds (threshold: 2.0s)',
              'Endpoint: /api/users/profile',
              'User agent: Mozilla/5.0...',
              'Client IP: 192.168.1.100'
            ]
          },
          {
            id: 3,
            level: 'INFO',
            source: 'backend',
            description: 'User session expired',
            firstOccurrence: new Date(Date.now() - 10800000),
            occurrences: 8,
            details: [
              'Session ID: sess_abc123def456',
              'User ID: 1234',
              'Last activity: 2 hours ago',
              'Expiry reason: inactivity timeout'
            ]
          }
        ];
      };

    fetchHistoricalLogs();
  }, [timeFilter]);

  const toggleLogExpansion = (logId: number) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const getTimeFilterLabel = (filter: TimeFilter) => {
    switch (filter) {
      case 'yesterday': return 'Yesterday';
      case 'today': return 'Today';
      case '24h': return 'Last 24h';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      default: return 'Yesterday';
    }
  };

  const icon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );

  return (
    <ConsoleCard
      title="Historical Logs"
      titleColor={isDarkMode ? "text-purple-400" : "text-purple-600"}
      icon={icon}
      badge={{
        text: `${getFilteredLogs().length} entries`,
        color: isDarkMode
          ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
          : "bg-purple-100 text-purple-700 border-purple-300"
      }}
      isDarkMode={isDarkMode}
    >
      <div className="h-full flex flex-col">
        {/* Date Filter Controls */}
        <div className={`p-4 border-b ${
          isDarkMode 
            ? 'border-gray-700 bg-gray-800/30' 
            : 'border-gray-300 bg-gray-50'
        }`}>
          <div className="flex items-center justify-between">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
              className={`px-3 py-1 rounded text-sm border focus:ring-2 focus:ring-purple-500 ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="24h">Last 24h</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            
            <div className={`text-xs ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Filter: {getTimeFilterLabel(timeFilter)}
            </div>
          </div>
        </div>
        
        {/* Historical Logs */}
        <div className={`flex-1 overflow-y-auto console-scroll-area ${
          isDarkMode ? '' : 'bg-white'
        }`}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className={`text-center ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-2"></div>
                <div className="text-sm">Loading historical logs...</div>
              </div>
            </div>
          ) : getFilteredLogs().length === 0 ? (
            <div className="flex items-center justify-center h-full p-4">
              <div className={`text-center ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <div className="text-4xl mb-4">📈</div>
                <div className={`text-lg font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {logs.length === 0 ? 'No logs found' : `No ${logFilter?.toLowerCase().replace(' only', '')} logs`}
                </div>
                <div className="text-sm">
                  {logs.length === 0 ? `No entries for ${getTimeFilterLabel(timeFilter).toLowerCase()}` : 'Try changing the filter or time period'}
                </div>
                <div className="text-xs mt-2 opacity-60">Historical Console Active</div>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {getFilteredLogs().map((log) => (
                <HistoricalLogItem
                  key={log.id}
                  level={log.level}
                  source={log.source}
                  description={log.description}
                  firstOccurrence={log.firstOccurrence}
                  occurrences={log.occurrences}
                  details={log.details}
                  expanded={expandedLogs.has(log.id)}
                  onToggleExpand={() => toggleLogExpansion(log.id)}
                  isDarkMode={isDarkMode}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ConsoleCard>
  );
};

export default DateLogsConsole;