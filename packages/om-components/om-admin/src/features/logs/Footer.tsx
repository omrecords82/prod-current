// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';

interface FooterProps {
  isLive?: boolean;
  activeFilters?: number;
  isDarkMode?: boolean;
}

const Footer: React.FC<FooterProps> = ({ isLive = true, activeFilters = 0, isDarkMode = true }) => {
  return (
    <footer className={`border-t px-4 py-2 flex-shrink-0 ${
      isDarkMode 
        ? 'border-gray-700 bg-gray-900/50' 
        : 'border-gray-300 bg-gray-50'
    }`}>
      <div className={`flex items-center justify-between text-xs ${
        isDarkMode ? 'text-gray-400' : 'text-gray-600'
      }`}>
        <div className="flex items-center gap-4">
          <span>Status: <span className={isLive ? 'text-green-400' : 'text-red-400'}>{isLive ? 'Live' : 'Paused'}</span></span>
          <span>Active filters: {activeFilters}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>OrthodoxMetrics.com</span>
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
