/**
 * Orthodox Church Icon Component
 * 
 * A reusable SVG component for displaying Orthodox church icons throughout the application.
 * Used in menu items and other UI elements.
 */

import React from 'react';
import { SvgIcon, SvgIconProps } from '@mui/material';

interface OrthodoxChurchIconProps extends SvgIconProps {
  /** Whether the church is active/enabled - affects coloring */
  isActive?: boolean;
  /** Unique ID for gradients to avoid conflicts when multiple icons are on same page */
  uniqueId?: string | number;
}

const OrthodoxChurchIcon: React.FC<OrthodoxChurchIconProps> = ({
  isActive = true,
  uniqueId = 'default',
  ...props
}) => {
  const gradientId = `orthodox-church-${uniqueId}`;

  return (
    <SvgIcon {...props} viewBox="0 0 24 24" sx={{ ...props.sx }}>
      <defs>
        <linearGradient id={`blueGradient-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: isActive ? '#4A90E2' : '#888', stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: isActive ? '#2171B5' : '#666', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: isActive ? '#1653A0' : '#444', stopOpacity: 1 }} />
        </linearGradient>
        <linearGradient id={`whiteGradient-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#FFFFFF', stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: '#F8F8FF', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#E8E8E8', stopOpacity: 1 }} />
        </linearGradient>
        <linearGradient id={`goldGradient-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: isActive ? '#FFD700' : '#CCC', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: isActive ? '#DAA520' : '#999', stopOpacity: 1 }} />
        </linearGradient>
        <radialGradient id={`domeGradient-${gradientId}`} cx="50%" cy="30%" r="60%">
          <stop offset="0%" style={{ stopColor: isActive ? '#87CEEB' : '#AAA', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: isActive ? '#4A90E2' : '#666', stopOpacity: 1 }} />
        </radialGradient>
      </defs>

      {/* Shadow */}
      <ellipse cx="12" cy="22" rx="8" ry="1.5" fill="rgba(0,0,0,0.1)" />

      {/* Main church building */}
      <rect x="5" y="14" width="14" height="8" fill={`url(#whiteGradient-${gradientId})`} rx="0.5" stroke="#DDD" strokeWidth="0.2" />

      {/* Church steps/platform */}
      <rect x="4" y="20" width="16" height="2" fill={`url(#whiteGradient-${gradientId})`} rx="0.3" />

      {/* Central tower */}
      <rect x="8" y="10" width="8" height="6" fill={`url(#whiteGradient-${gradientId})`} rx="0.3" stroke="#DDD" strokeWidth="0.2" />

      {/* Top tower */}
      <rect x="9.5" y="7" width="5" height="5" fill={`url(#whiteGradient-${gradientId})`} rx="0.3" stroke="#DDD" strokeWidth="0.2" />

      {/* Main dome */}
      <path d="M 8 10 Q 12 4 16 10 Z" fill={`url(#domeGradient-${gradientId})`} stroke={isActive ? '#2171B5' : '#666'} strokeWidth="0.3" />

      {/* Smaller dome on tower */}
      <path d="M 9.5 7 Q 12 3.5 14.5 7 Z" fill={`url(#domeGradient-${gradientId})`} stroke={isActive ? '#2171B5' : '#666'} strokeWidth="0.3" />

      {/* Cross on main dome */}
      <rect x="11.7" y="2.5" width="0.6" height="4" fill={`url(#goldGradient-${gradientId})`} />
      <rect x="10.5" y="3.8" width="3" height="0.6" fill={`url(#goldGradient-${gradientId})`} />
      <rect x="10.8" y="5.5" width="2.4" height="0.4" fill={`url(#goldGradient-${gradientId})`} />

      {/* Main entrance door */}
      <rect x="10.5" y="16" width="3" height="6" fill="#2C3E50" rx="1.5" />
      <circle cx="12.8" cy="19" r="0.3" fill="#DAA520" />

      {/* Windows */}
      <rect x="6.5" y="16" width="1.5" height="2.5" fill="#2C3E50" rx="0.7" />
      <rect x="16" y="16" width="1.5" height="2.5" fill="#2C3E50" rx="0.7" />

      {/* Tower windows */}
      <rect x="10" y="12" width="1" height="1.5" fill="#2C3E50" rx="0.5" />
      <rect x="13" y="12" width="1" height="1.5" fill="#2C3E50" rx="0.5" />

      {/* Decorative elements */}
      <rect x="5" y="14" width="14" height="0.5" fill={`url(#goldGradient-${gradientId})`} />
      <rect x="8" y="10" width="8" height="0.3" fill={`url(#goldGradient-${gradientId})`} />
    </SvgIcon>
  );
};

export default OrthodoxChurchIcon;
