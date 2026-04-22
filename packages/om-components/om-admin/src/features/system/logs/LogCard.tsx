import React from 'react';

interface LogCardProps {
  timestamp: Date;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'SUCCESS';
  source: 'frontend' | 'backend' | 'dev';
  message: string;
  service?: string;
  meta?: any;
  isDarkMode?: boolean;
}

export const LogCard: React.FC<LogCardProps> = ({
  timestamp,
  level,
  source,
  message,
  service,
  meta,
  isDarkMode = true
}) => {
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const getLevelStyles = (level: string) => {
    if (isDarkMode) {
      switch (level) {
        case 'ERROR':
          return 'text-red-400 bg-red-900/20 border-red-700/50';
        case 'WARN':
          return 'text-yellow-400 bg-yellow-900/20 border-yellow-700/50';
        case 'SUCCESS':
          return 'text-green-400 bg-green-900/20 border-green-700/50';
        case 'INFO':
          return 'text-blue-400 bg-blue-900/20 border-blue-700/50';
        case 'DEBUG':
          return 'text-gray-400 bg-gray-900/20 border-gray-700/50';
        default:
          return 'text-gray-400 bg-gray-900/20 border-gray-700/50';
      }
    } else {
      switch (level) {
        case 'ERROR':
          return 'text-red-600 bg-red-50 border-red-300';
        case 'WARN':
          return 'text-yellow-600 bg-yellow-50 border-yellow-300';
        case 'SUCCESS':
          return 'text-green-600 bg-green-50 border-green-300';
        case 'INFO':
          return 'text-blue-600 bg-blue-50 border-blue-300';
        case 'DEBUG':
          return 'text-gray-600 bg-gray-50 border-gray-300';
        default:
          return 'text-gray-600 bg-gray-50 border-gray-300';
      }
    }
  };

  const getSourceStyles = (source: string) => {
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

  return (
    <div className={`log-entry flex items-start space-x-3 p-1 rounded ${
      isDarkMode 
        ? 'text-gray-300 hover:bg-gray-800/50' 
        : 'text-gray-700 hover:bg-gray-100'
    }`}>
      {/* Timestamp */}
      <span className={`text-xs w-20 flex-shrink-0 font-mono ${
        isDarkMode ? 'text-gray-500' : 'text-gray-400'
      }`}>
        {formatTimestamp(timestamp)}
      </span>
      
      {/* Level Badge */}
      <span className={`px-2 py-0.5 rounded text-xs font-medium border w-16 flex-shrink-0 text-center ${getLevelStyles(level)}`}>
        {level}
      </span>
      
      {/* Source */}
      <span className={`text-xs w-16 flex-shrink-0 font-mono ${getSourceStyles(source)}`}>
        [{source}]
      </span>
      
      {/* Message */}
      <div className={`flex-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        <div className="text-sm font-mono leading-relaxed">
          {message}
        </div>
        
        {/* Service Info */}
        {service && (
          <div className={`text-xs mt-1 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            Service: <span className="font-medium">{service}</span>
          </div>
        )}
        
        {/* Meta Data */}
        {meta && (
          <div className={`text-xs mt-1 ${
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          }`}>
            <details className="cursor-pointer">
              <summary className={`hover:opacity-80 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Details</summary>
              <pre className={`mt-1 p-2 rounded text-xs overflow-x-auto ${
                isDarkMode 
                  ? 'bg-gray-800/50' 
                  : 'bg-gray-100'
              }`}>
                {JSON.stringify(meta, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogCard;