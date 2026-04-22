/**
 * ComponentManager/utils.ts — Health analysis, category breakdown,
 * filtered summary, and degraded log export utilities.
 */

import { componentsAPI, type Component, type ComponentsResponse, type ComponentFilters } from '@/api/components.api';
import { getComponentHealthStatus, getHealthIssues } from './healthUtils';

/* ------------------------------------------------------------------ */
/*  Health Analysis                                                    */
/* ------------------------------------------------------------------ */

const calculateCategoryBreakdown = (components: Component[]) => {
  const breakdown: Record<string, any> = {};
  if (!Array.isArray(components)) return breakdown;

  components.forEach(component => {
    const category = component.category || 'Uncategorized';
    if (!breakdown[category]) {
      breakdown[category] = {
        total: 0, healthy: 0, degraded: 0, failed: 0,
        enabled: 0, disabled: 0, active: 0, inactive: 0, unused: 0,
      };
    }
    breakdown[category].total++;
    breakdown[category][component.health]++;
    breakdown[category][component.enabled ? 'enabled' : 'disabled']++;
    breakdown[category][component.usageStatus]++;
  });

  return breakdown;
};

export const analyzeComponentHealth = async (data: ComponentsResponse): Promise<ComponentsResponse> => {
  try {
    if (!data || !data.components || !Array.isArray(data.components)) return data;

    const analysisPromises = data.components.map(async (component) => {
      try {
        const logsResponse = await componentsAPI.getLogs(component.id);
        const logs = logsResponse.logs || [];
        const analyzedHealth = getComponentHealthStatus(logs);
        const healthIssues = getHealthIssues(logs);

        return {
          ...component,
          health: analyzedHealth,
          healthIssues: healthIssues.length > 0 ? healthIssues : component.healthIssues,
          lastHealthCheck: new Date().toISOString(),
        } as Component;
      } catch {
        return { ...component, lastHealthCheck: new Date().toISOString() } as Component;
      }
    });

    const analyzedComponents = await Promise.all(analysisPromises);

    return {
      components: analyzedComponents,
      meta: {
        ...data.meta,
        categoryBreakdown: calculateCategoryBreakdown(analyzedComponents),
        usageStats: {
          ...data.meta.usageStats,
          healthyComponents: analyzedComponents.filter(c => c.health === 'healthy').length,
          degradedComponents: analyzedComponents.filter(c => c.health === 'degraded').length,
          failedComponents: analyzedComponents.filter(c => c.health === 'failed').length,
        },
      },
    };
  } catch {
    return data;
  }
};

/* ------------------------------------------------------------------ */
/*  Filtered Summary                                                   */
/* ------------------------------------------------------------------ */

export const getFilteredSummary = (componentsData: ComponentsResponse | null) => {
  const components = Array.isArray(componentsData?.components) ? componentsData.components : [];
  const meta = componentsData?.meta;

  return {
    total: meta?.total || components.length,
    healthy: components.filter(c => c.health === 'healthy').length,
    degraded: components.filter(c => c.health === 'degraded').length,
    failed: components.filter(c => c.health === 'failed').length,
    active: components.filter(c => c.usageStatus === 'active').length,
    inactive: components.filter(c => c.usageStatus === 'inactive').length,
    unused: components.filter(c => c.usageStatus === 'unused').length,
    enabled: components.filter(c => c.enabled).length,
    disabled: components.filter(c => !c.enabled).length,
  };
};

/* ------------------------------------------------------------------ */
/*  Export Degraded Logs                                                */
/* ------------------------------------------------------------------ */

export const exportDegradedLogs = async (
  componentsData: ComponentsResponse | null,
): Promise<{ success: boolean; count: number; error?: string }> => {
  const degradedComponents = (Array.isArray(componentsData?.components) ? componentsData!.components : [])
    .filter(c => c.health === 'degraded');

  if (degradedComponents.length === 0) {
    return { success: false, count: 0, error: 'No degraded components found' };
  }

  let exportContent = `DEGRADED COMPONENTS LOG REPORT\n`;
  exportContent += `Generated: ${new Date().toLocaleString()}\n`;
  exportContent += `Total degraded components: ${degradedComponents.length}\n\n`;
  exportContent += `${'='.repeat(60)}\n\n`;

  const logResults = await Promise.all(
    degradedComponents.map(async (component) => {
      try {
        const logsResponse = await componentsAPI.getLogs(component.id);
        return { component, logs: logsResponse.logs || [], success: true };
      } catch (err: any) {
        return { component, logs: [] as any[], success: false, error: err };
      }
    }),
  );

  logResults.forEach((result) => {
    const { component, logs, success, error } = result;
    exportContent += `Component: ${component.name}\n`;
    exportContent += `Health Status: ${component.health.toUpperCase()}\n`;
    exportContent += `Category: ${component.category || 'Uncategorized'}\n`;
    exportContent += `Last Updated: ${component.lastUpdated ? new Date(component.lastUpdated).toLocaleString() : 'Unknown'}\n`;
    if (component.healthIssues?.length) {
      exportContent += `Issues: ${component.healthIssues.join(', ')}\n`;
    }
    exportContent += `${'-'.repeat(30)}\n`;

    if (!success) {
      exportContent += `[ERROR] Failed to retrieve logs: ${error?.response?.data?.message || error?.message || 'Unknown error'}\n`;
    } else if (logs.length === 0) {
      exportContent += `[INFO] No logs available for this component\n`;
    } else {
      const sorted = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      sorted.slice(0, 20).forEach(log => {
        exportContent += `[${log.level.toUpperCase()}] ${new Date(log.timestamp).toLocaleString()} - ${log.message}\n`;
      });
      if (sorted.length > 20) exportContent += `... and ${sorted.length - 20} more log entries\n`;
    }
    exportContent += `\n${'*'.repeat(28)}\n\n`;
  });

  exportContent += `EXPORT SUMMARY\n${'-'.repeat(15)}\n`;
  exportContent += `Total components processed: ${logResults.length}\n`;
  exportContent += `Successful log retrievals: ${logResults.filter(r => r.success).length}\n`;
  exportContent += `Failed log retrievals: ${logResults.filter(r => !r.success).length}\n`;
  exportContent += `Export completed: ${new Date().toLocaleString()}\n`;

  const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const ts = new Date().toISOString().replace(/[:.]/g, '-').split('T');
  link.download = `degraded-components-log-report-${ts[0]}-${ts[1].split('.')[0]}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true, count: degradedComponents.length };
};
