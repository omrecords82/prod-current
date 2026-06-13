/**
 * Shared chip render helpers for OM Daily items.
 */

import React from 'react';
import { alpha, Chip, Tooltip } from '@mui/material';
import { SmartToy as AgentIcon } from '@mui/icons-material';
import {
  STATUS_LABELS, STATUS_COLORS,
  PRIORITY_COLORS,
  AGENT_TOOL_LABELS, AGENT_TOOL_COLORS,
} from '../omDailyTypes';

export const StatusChip: React.FC<{ status: string }> = ({ status }) => (
  <Chip size="small" label={STATUS_LABELS[status] || status}
    sx={{ bgcolor: alpha(STATUS_COLORS[status] || '#999', 0.15), color: STATUS_COLORS[status] || '#999', fontWeight: 600, fontSize: '0.68rem', height: 22 }} />
);

export const PriorityChip: React.FC<{ priority: string }> = ({ priority }) => (
  <Chip size="small" label={priority}
    sx={{ bgcolor: alpha(PRIORITY_COLORS[priority] || '#999', 0.15), color: PRIORITY_COLORS[priority] || '#999', fontWeight: 600, fontSize: '0.68rem', height: 20, textTransform: 'capitalize' }} />
);

export const AgentChip: React.FC<{ agentTool: string }> = ({ agentTool }) => {
  const color = AGENT_TOOL_COLORS[agentTool] || '#666';
  return (
    <Tooltip title={`Agent: ${AGENT_TOOL_LABELS[agentTool] || agentTool}`}>
      <Chip size="small" icon={<AgentIcon sx={{ fontSize: 13 }} />} label={AGENT_TOOL_LABELS[agentTool] || agentTool}
        sx={{ bgcolor: alpha(color, 0.12), color, fontWeight: 600, fontSize: '0.65rem', height: 20, '& .MuiChip-icon': { color } }} />
    </Tooltip>
  );
};

/** Mini horizontal bar chart for dashboards */
export const HBar: React.FC<{ label: string; value: number; max: number; color: string; isDark: boolean; suffix?: string }> = ({ label, value, max, color, isDark, suffix }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
    <span style={{ width: 80, textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.72rem', flexShrink: 0 }}>{label}</span>
    <div style={{ flex: 1, height: 18, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
      <div style={{ width: max > 0 ? `${Math.max((value / max) * 100, 2)}%` : '0%', height: '100%', background: alpha(color, 0.7), borderRadius: 4, transition: 'width 0.4s ease' }} />
    </div>
    <span style={{ width: 32, fontWeight: 700, color, fontSize: '0.75rem', flexShrink: 0 }}>{value}{suffix}</span>
  </div>
);

/** Mini spark line for velocity charts */
export const SparkLine: React.FC<{ data: { date: string; count: number }[]; color: string; height?: number }> = ({ data, color, height = 40 }) => {
  if (data.length < 2) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = height - (d.count / max) * (height - 4);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = height - (d.count / max) * (height - 4);
        return <circle key={i} cx={x} cy={y} r="2" fill={color} vectorEffect="non-scaling-stroke" />;
      })}
    </svg>
  );
};
