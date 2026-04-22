import type { GlobalError } from '../../../hooks/useGlobalErrorStore';

export const getComponentNameFromPath = (pathname: string): string => {
  const pathMap: { [key: string]: string } = {
    '/admin/ai': 'AI Administration Panel',
    '/admin/bigbook': 'OM Big Book Console',
    '/admin/build': 'Build Console',
    '/admin/users': 'User Management',
    '/apps/records-ui': 'Church Records Browser',
    '/apps/records': 'Records Dashboard',
    '/apps/kanban': 'Kanban Board',
    '/omb/editor': 'OMB Editor',
    '/dashboards/modern': 'Modern Dashboard',
    '/admin/orthodox-metrics': 'Orthodox Metrics Dashboard'
  };
  return pathMap[pathname] || 'Unknown Component';
};

export const getDbModelFromPath = (pathname: string): string => {
  if (pathname.includes('records')) return 'church_records';
  if (pathname.includes('users')) return 'users';
  if (pathname.includes('church')) return 'churches';
  if (pathname.includes('ai')) return 'ai_metrics';
  if (pathname.includes('kanban')) return 'orthodoxmetrics_db';
  return 'orthodoxmetrics_db';
};

export const getPageDescription = (pathname: string): string => {
  const descriptions: { [key: string]: string } = {
    '/admin/ai': 'AI system monitoring and configuration',
    '/admin/bigbook': 'Big Book content management and AI learning',
    '/admin/build': 'Frontend build and deployment console',
    '/admin/users': 'User account and permission management',
    '/apps/records-ui': 'Professional church records browser with filtering',
    '/apps/records': 'Card-based records dashboard',
    '/omb/editor': 'Visual component editor and builder'
  };
  return descriptions[pathname] || 'OrthodoxMetrics application page';
};

export const getSeverityColor = (severity: GlobalError['severity']): string => {
  switch (severity) {
    case 'critical': return '#d32f2f';
    case 'high': return '#f57c00';
    case 'medium': return '#1976d2';
    case 'low': return '#388e3c';
    default: return '#757575';
  }
};

export const determinePriorityFromSeverity = (severity: GlobalError['severity']): 'low' | 'medium' | 'high' | 'urgent' => {
  switch (severity) {
    case 'critical': return 'urgent';
    case 'high': return 'high';
    case 'medium': return 'medium';
    case 'low': return 'low';
    default: return 'medium';
  }
};

export const generateTaskDescription = (error: GlobalError): string => {
  return `## 🐛 Bug Report

**Error Hash:** \`${error.hash}\`
**Severity:** ${error.severity.toUpperCase()}
**Occurrences:** ${error.occurrenceCount}

### 📍 Location
- **Component:** ${error.component || 'Unknown'}
- **Route:** \`${error.route}\`
- **File:** \`${error.filename || 'N/A'}\`${error.lineno ? `:${error.lineno}` : ''}

### 💬 Error Message
\`\`\`
${error.message}
\`\`\`

### 🔍 Stack Trace
\`\`\`
${error.stack || 'No stack trace available'}
\`\`\`

### ⏰ Timeline
- **First:** ${new Date(error.firstOccurrence).toLocaleString()}
- **Last:** ${new Date(error.lastOccurrence).toLocaleString()}
- **Count:** ${error.occurrenceCount} occurrence${error.occurrenceCount !== 1 ? 's' : ''}

### 🎯 Action Items
- [ ] Investigate root cause
- [ ] Reproduce error in dev environment
- [ ] Implement fix
- [ ] Test fix thoroughly
- [ ] Deploy and monitor

### 🏷️ Tags
${error.tags?.join(', ') || 'None'}

### 🌐 Context
- **URL:** ${error.context?.url || 'N/A'}
- **User Role:** ${error.userRole || 'N/A'}
- **Viewport:** ${error.context?.viewport || 'N/A'}

---
*Auto-generated from OMAI Error Console*`;
};
