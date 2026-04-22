import type { ComponentLog } from '@/api/components.api';

export type HealthStatus = 'healthy' | 'degraded' | 'failed';

export interface HealthDetectionRule {
    pattern: string | RegExp;
    level: ComponentLog['level'][];
    severity: HealthStatus;
    description: string;
}

export const HEALTH_DETECTION_RULES: HealthDetectionRule[] = [
    {
        pattern: /Error: Service temporarily unavailable/i,
        level: ['error'],
        severity: 'degraded',
        description: 'Service availability issues detected'
    },
    {
        pattern: /Warning: Performance degraded/i,
        level: ['warn', 'error'],
        severity: 'degraded',
        description: 'Performance degradation detected'
    },
    {
        pattern: /Connection timeout|Database connection failed|Service crashed|Critical error/i,
        level: ['error'],
        severity: 'failed',
        description: 'Critical system failures detected'
    },
    {
        pattern: /Memory leak|Out of memory|Disk space|Storage full/i,
        level: ['error', 'warn'],
        severity: 'degraded',
        description: 'Resource constraints detected'
    }
];

/**
 * Analyzes component logs to determine health status based on recent errors/warnings
 */
export const getComponentHealthStatus = (logs: ComponentLog[], hoursBack: number = 24): HealthStatus => {
    if (!logs || !Array.isArray(logs) || logs.length === 0) {
        return 'healthy';
    }

    const cutoffTime = new Date(Date.now() - (hoursBack * 60 * 60 * 1000));

    const recentLogs = logs.filter(log => {
        const logTime = new Date(log.timestamp);
        return logTime >= cutoffTime;
    });

    const logsToAnalyze = recentLogs.length > 0 ? recentLogs : logs.slice(-20);

    let worstStatus: HealthStatus = 'healthy';
    const detectedIssues: string[] = [];

    for (const log of logsToAnalyze) {
        for (const rule of HEALTH_DETECTION_RULES) {
            if (!rule.level.includes(log.level)) continue;

            const matches = typeof rule.pattern === 'string'
                ? log.message.includes(rule.pattern)
                : rule.pattern.test(log.message);

            if (matches) {
                detectedIssues.push(`${rule.description} (${log.timestamp})`);

                if (rule.severity === 'failed' ||
                    (rule.severity === 'degraded' && worstStatus === 'healthy')) {
                    worstStatus = rule.severity;
                }
            }
        }
    }

    const errorCount = logsToAnalyze.filter(log => log.level === 'error').length;
    if (errorCount >= 10 && worstStatus === 'degraded') {
        worstStatus = 'failed';
        detectedIssues.push(`High error frequency detected (${errorCount} errors)`);
    }

    if (worstStatus !== 'healthy') {
        console.log(`Health detection for component: ${worstStatus}`, {
            analyzedLogs: logsToAnalyze.length,
            recentLogs: recentLogs.length,
            detectedIssues,
            worstStatus
        });
    }

    return worstStatus;
};

/**
 * Analyzes component logs and returns health issues found
 */
export const getHealthIssues = (logs: ComponentLog[], hoursBack: number = 24): string[] => {
    if (!logs || !Array.isArray(logs) || logs.length === 0) return [];

    const cutoffTime = new Date(Date.now() - (hoursBack * 60 * 60 * 1000));
    const recentLogs = logs.filter(log => new Date(log.timestamp) >= cutoffTime);
    const logsToAnalyze = recentLogs.length > 0 ? recentLogs : logs.slice(-20);

    const issues: string[] = [];

    for (const log of logsToAnalyze) {
        for (const rule of HEALTH_DETECTION_RULES) {
            if (!rule.level.includes(log.level)) continue;

            const matches = typeof rule.pattern === 'string'
                ? log.message.includes(rule.pattern)
                : rule.pattern.test(log.message);

            if (matches) {
                const timeAgo = new Date(Date.now() - new Date(log.timestamp).getTime());
                const hoursAgo = Math.floor(timeAgo.getTime() / (1000 * 60 * 60));
                issues.push(`${rule.description} (${hoursAgo}h ago)`);
            }
        }
    }

    return [...new Set(issues)];
};
