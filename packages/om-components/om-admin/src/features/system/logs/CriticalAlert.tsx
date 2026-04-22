import React from 'react';

interface CriticalAlertProps {
  level: 'WARN' | 'ERROR' | 'CRITICAL';
  source: 'frontend' | 'backend' | 'dev' | 'browser';
  message: string;
  icon: string;
  timestamp: Date;
  onDismiss: () => void;
  onCreateGitHubIssue?: () => void;
  canCreateGitHubIssue?: boolean;
  isDarkMode?: boolean;
}

export const CriticalAlert: React.FC<CriticalAlertProps> = ({
  level,
  source,
  message,
  icon,
  timestamp,
  onDismiss,
  onCreateGitHubIssue,
  canCreateGitHubIssue = false,
  isDarkMode = true
}) => {
  const formatTimestamp = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getAlertStyles = (level: string) => {
    if (isDarkMode) {
      switch (level) {
        case 'CRITICAL':
          return {
            container: 'bg-red-950/30 border-red-600/70 border-2 animate-pulse',
            text: 'text-red-300',
            badge: 'bg-red-800 text-red-200 animate-pulse'
          };
        case 'ERROR':
          return {
            container: 'bg-red-900/20 border-red-700/50 border',
            text: 'text-red-400',
            badge: 'bg-red-900 text-red-400'
          };
        case 'WARN':
          return {
            container: 'bg-yellow-900/20 border-yellow-700/50 border',
            text: 'text-yellow-400',
            badge: 'bg-yellow-900 text-yellow-400'
          };
        default:
          return {
            container: 'bg-gray-900/20 border-gray-700/50 border',
            text: 'text-gray-400',
            badge: 'bg-gray-900 text-gray-400'
          };
      }
    } else {
      switch (level) {
        case 'CRITICAL':
          return {
            container: 'bg-red-50 border-red-400 border-2 animate-pulse',
            text: 'text-red-700',
            badge: 'bg-red-200 text-red-800 animate-pulse'
          };
        case 'ERROR':
          return {
            container: 'bg-red-50 border-red-300 border',
            text: 'text-red-600',
            badge: 'bg-red-100 text-red-700'
          };
        case 'WARN':
          return {
            container: 'bg-yellow-50 border-yellow-300 border',
            text: 'text-yellow-600',
            badge: 'bg-yellow-100 text-yellow-700'
          };
        default:
          return {
            container: 'bg-gray-50 border-gray-300 border',
            text: 'text-gray-600',
            badge: 'bg-gray-100 text-gray-700'
          };
      }
    }
  };

  const getSourceColor = (source: string) => {
    if (isDarkMode) {
      switch (source) {
        case 'frontend':
          return 'text-green-400';
        case 'backend':
          return 'text-purple-400';
        case 'dev':
          return 'text-orange-400';
        default:
          return 'text-gray-400';
      }
    } else {
      switch (source) {
        case 'frontend':
          return 'text-green-600';
        case 'backend':
          return 'text-purple-600';
        case 'dev':
          return 'text-orange-600';
        default:
          return 'text-gray-600';
      }
    }
  };

  const styles = getAlertStyles(level);

  return (
    <div className={`rounded-lg p-3 relative group hover:shadow-lg transition-all duration-200 ${styles.container}`}>
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className="text-lg flex-shrink-0">
          {icon}
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Level Badge and Source */}
          <div className="flex items-center space-x-2 mb-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles.badge}`}>
              {level}
            </span>
            <span className={`text-xs font-mono ${getSourceColor(source)}`}>
              [{source}]
            </span>
            <span className="text-xs text-gray-400">
              {formatTimestamp(timestamp)}
            </span>
          </div>
          
          {/* Message */}
          <div className={`font-medium text-sm ${styles.text}`}>
            {message}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-1">
          {/* GitHub Issue Button */}
          {canCreateGitHubIssue && onCreateGitHubIssue && (
            <button
              onClick={onCreateGitHubIssue}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-orange-400 hover:text-orange-300 p-1 rounded"
              title="Create GitHub Issue"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          
          {/* Dismiss Button */}
          <button
            onClick={onDismiss}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-200 p-1 rounded"
            title="Dismiss alert"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CriticalAlert;