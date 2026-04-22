import React from 'react';

interface HistoricalLogItemProps {
  level: 'INFO' | 'WARN' | 'ERROR';
  source: 'frontend' | 'backend' | 'dev';
  description: string;
  firstOccurrence: Date;
  occurrences: number;
  details: string[];
  expanded: boolean;
  onToggleExpand: () => void;
  isDarkMode?: boolean;
}

export const HistoricalLogItem: React.FC<HistoricalLogItemProps> = ({
  level,
  source,
  description,
  firstOccurrence,
  occurrences,
  details,
  expanded,
  onToggleExpand,
  isDarkMode = true
}) => {
  const formatTimestamp = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLevelStyles = (level: string) => {
    if (isDarkMode) {
      switch (level) {
        case 'ERROR':
          return {
            badge: 'text-red-400 bg-red-900/20 border-red-700/50',
            text: 'text-red-400'
          };
        case 'WARN':
          return {
            badge: 'text-yellow-400 bg-yellow-900/20 border-yellow-700/50',
            text: 'text-yellow-400'
          };
        case 'INFO':
          return {
            badge: 'text-blue-400 bg-blue-900/20 border-blue-700/50',
            text: 'text-blue-400'
          };
        default:
          return {
            badge: 'text-gray-400 bg-gray-900/20 border-gray-700/50',
            text: 'text-gray-400'
          };
      }
    } else {
      switch (level) {
        case 'ERROR':
          return {
            badge: 'text-red-600 bg-red-50 border-red-300',
            text: 'text-red-600'
          };
        case 'WARN':
          return {
            badge: 'text-yellow-600 bg-yellow-50 border-yellow-300',
            text: 'text-yellow-600'
          };
        case 'INFO':
          return {
            badge: 'text-blue-600 bg-blue-50 border-blue-300',
            text: 'text-blue-600'
          };
        default:
          return {
            badge: 'text-gray-600 bg-gray-50 border-gray-300',
            text: 'text-gray-600'
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

  const styles = getLevelStyles(level);

  return (
    <div className={`rounded-lg border transition-all duration-200 hover:shadow-lg ${
      isDarkMode 
        ? 'bg-gray-900/50 border-gray-700' 
        : 'bg-white border-gray-300'
    }`}>
      {/* Collapsible Header */}
      <div 
        className={`p-4 cursor-pointer transition-colors ${
          isDarkMode 
            ? 'hover:bg-gray-800/30' 
            : 'hover:bg-gray-50'
        }`}
        onClick={onToggleExpand}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Badges and Meta */}
            <div className="flex items-center space-x-2 mb-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${styles.badge}`}>
                {level}
              </span>
              <span className={`text-xs font-mono ${getSourceColor(source)}`}>
                [{source}]
              </span>
              <span className={`text-xs ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {formatTimestamp(firstOccurrence)}
              </span>
              {occurrences > 1 && (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  isDarkMode 
                    ? 'bg-orange-500/20 text-orange-400' 
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  Occurred {occurrences} times
                </span>
              )}
            </div>
            
            {/* Description */}
            <div className={`font-medium text-sm ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {description}
            </div>
          </div>
          
          {/* Expand/Collapse Chevron */}
          <div className={`ml-4 text-lg transition-transform duration-200 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}
               style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            ▶
          </div>
        </div>
      </div>
      
      {/* Collapsible Content */}
      {expanded && (
        <div className={`border-t p-4 ${
          isDarkMode 
            ? 'border-gray-700 bg-gray-800/30' 
            : 'border-gray-300 bg-gray-50'
        }`}>
          <div className="space-y-3">
            <div className={`text-xs font-medium ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Additional Details:
            </div>
            
            {details.length > 0 ? (
              <div className="space-y-2">
                {details.map((detail, index) => (
                  <div key={index} className={`text-sm p-2 rounded border-l-2 ${
                    isDarkMode 
                      ? 'text-gray-400 bg-gray-900/50 border-gray-600' 
                      : 'text-gray-600 bg-gray-100 border-gray-400'
                  }`}>
                    {detail}
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-sm italic ${
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`}>
                No additional details available
              </div>
            )}
            
            {/* Occurrence Statistics */}
            <div className={`pt-2 border-t ${
              isDarkMode ? 'border-gray-700/50' : 'border-gray-300'
            }`}>
              <div className={`text-xs ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <span className="font-medium">First seen:</span> {formatTimestamp(firstOccurrence)}
              </div>
              <div className={`text-xs ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <span className="font-medium">Total occurrences:</span> {occurrences}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoricalLogItem;