import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import ConsoleCard from '../system/logs/ConsoleCard';
import SystemMessageCard from '../system/logs/SystemMessageCard';

interface SystemMessage {
  id: number;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'service' | 'security' | 'backup' | 'notification' | 'config' | 'performance';
  title: string;
  description: string;
  timestamp: Date;
}

interface SystemMessagesConsoleProps {
  isLive: boolean;
  logFilter?: string;
  showInfoLogs?: boolean;
  isDarkMode?: boolean;
}

export const SystemMessagesConsole: React.FC<SystemMessagesConsoleProps> = ({ isLive, logFilter = 'All Logs', showInfoLogs = false, isDarkMode = true }) => {
  const [messages, setMessages] = useState<SystemMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter messages based on the selected filter
  const getFilteredMessages = () => {
    console.log('SystemMessagesConsole filter:', logFilter, 'Total messages:', messages.length);
    
    if (!logFilter || logFilter === 'All Logs') {
      console.log('Showing all system messages:', messages.length);
      return messages;
    }
    
    let filtered;
    switch (logFilter) {
      case 'Errors Only':
        filtered = []; // System messages console doesn't show ERROR logs
        console.log('Filtered ERROR messages: 0 (system console)');
        break;
      case 'Warnings Only':
        filtered = []; // System messages console doesn't show WARN logs
        console.log('Filtered WARN messages: 0 (system console)');
        break;
      case 'Info Only':
        filtered = messages.filter(message => message.type === 'info');
        console.log('Filtered INFO messages:', filtered.length);
        break;
      case 'Success Only':
        filtered = messages.filter(message => message.type === 'success');
        console.log('Filtered SUCCESS messages:', filtered.length);
        break;
      case 'Debug Only':
        filtered = []; // System messages console doesn't show DEBUG logs
        console.log('Filtered DEBUG messages: 0 (system console)');
        break;
      default:
        filtered = messages;
        break;
    }
    
    return filtered;
  };

  useEffect(() => {
    const fetchSystemMessages = async () => {
      setLoading(true);
      try {
        console.log('SystemMessagesConsole: Fetching from apiClient');
        const data = await apiClient.get<any>('/admin/logs/database?level=INFO,SUCCESS&source=system&limit=15&sort=desc');
        console.log('SystemMessagesConsole: Received data', data);
        
        if (data.logs && Array.isArray(data.logs)) {
          const formattedMessages: SystemMessage[] = data.logs.map((log: any, index: number) => ({
            id: log.id || index,
            type: log.level?.toLowerCase() === 'success' ? 'success' : 'info',
            category: log.service ? getCategory(log.service) : 'service',
            title: extractTitle(log.message),
            description: log.message,
            timestamp: new Date(log.timestamp)
          }));
          console.log('SystemMessagesConsole: Formatted messages', formattedMessages);
          setMessages(formattedMessages);
        } else {
          console.log('SystemMessagesConsole: No logs found, using mock data');
          // Use mock data if no system logs found
          setMessages(getMockMessages());
        }
      } catch (error) {
        console.warn('SystemMessagesConsole: Failed to fetch, using mock data', error);
        setMessages(getMockMessages());
      } finally {
        setLoading(false);
      }
    };

    const getMockMessages = (): SystemMessage[] => {
      return [
        {
          id: 1,
          type: 'success',
          category: 'backup',
          title: 'Database Backup Completed',
          description: 'Daily database backup completed successfully. 2.4GB archived.',
          timestamp: new Date()
        },
        {
          id: 2,
          type: 'info',
          category: 'service',
          title: 'Maintenance Window Started',
          description: 'Weekly maintenance window has begun. Expected duration: 2 hours.',
          timestamp: new Date(Date.now() - 900000)
        },
        {
          id: 3,
          type: 'success',
          category: 'security',
          title: 'SSL Certificates Renewed',
          description: 'All SSL certificates have been automatically renewed. Valid until 2026.',
          timestamp: new Date(Date.now() - 1800000)
        },
        {
          id: 4,
          type: 'info',
          category: 'performance',
          title: 'Cache Optimization Complete',
          description: 'Redis cache optimization finished. Hit rate improved to 98.7%.',
          timestamp: new Date(Date.now() - 3600000)
        }
      ];
    };

    fetchSystemMessages();

    // Setup real-time updates if live
    if (isLive) {
      const interval = setInterval(fetchSystemMessages, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [isLive]);

  const getCategory = (service: string): SystemMessage['category'] => {
    const serviceMap: Record<string, SystemMessage['category']> = {
      'backup-service': 'backup',
      'auth-service': 'security',
      'security': 'security',
      'cache': 'performance',
      'redis': 'performance',
      'scheduler': 'service',
      'maintenance': 'service',
      'notification': 'notification',
      'config': 'config'
    };
    return serviceMap[service] || 'service';
  };

  const extractTitle = (message: string): string => {
    // Extract a title from the message (first sentence or up to 50 chars)
    const firstSentence = message.split('.')[0];
    return firstSentence.length > 50 ? firstSentence.substring(0, 47) + '...' : firstSentence;
  };

  const handleDismiss = (messageId: number) => {
    setMessages(prev => prev.filter(message => message.id !== messageId));
  };

  const icon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );

  return (
    <ConsoleCard
      title="System Messages"
      titleColor={isDarkMode ? "text-blue-400" : "text-blue-600"}
      icon={icon}
      badge={{
        text: `${getFilteredMessages().length} messages`,
        color: isDarkMode
          ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
          : "bg-blue-100 text-blue-700 border-blue-300"
      }}
      isDarkMode={isDarkMode}
    >
      <div className={`h-full overflow-y-auto console-scroll-area ${
        isDarkMode ? '' : 'bg-white'
      }`}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className={`text-center ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <div className="text-sm">Loading system messages...</div>
            </div>
          </div>
        ) : getFilteredMessages().length === 0 ? (
          <div className="flex items-center justify-center h-full p-4">
            <div className={`text-center ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <div className="text-4xl mb-4">📭</div>
              <div className={`text-lg font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {messages.length === 0 ? 'No system messages' : `No ${logFilter?.toLowerCase().replace(' only', '')} system messages`}
              </div>
              <div className="text-sm">
                {messages.length === 0 ? 'All systems operating normally' : 'Try changing the filter or refreshing'}
              </div>
              <div className="text-xs mt-2 opacity-60">System Console Active</div>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {getFilteredMessages().map((message) => (
              <SystemMessageCard
                key={message.id}
                type={message.type}
                category={message.category}
                title={message.title}
                description={message.description}
                timestamp={message.timestamp}
                onDismiss={() => handleDismiss(message.id)}
                isDarkMode={isDarkMode}
              />
            ))}
          </div>
        )}
      </div>
    </ConsoleCard>
  );
};

export default SystemMessagesConsole;