export interface OMAICommand {
  id: string;
  command: string;
  timestamp: string;
  result?: string;
  status: 'pending' | 'success' | 'error';
  context?: string;
}

export interface PageContext {
  pathname: string;
  componentName?: string;
  dbModel?: string;
  userRole: string;
  churchId?: string;
  description?: string;
}

export interface OMAISettings {
  // Core Assistant Settings
  handsOnModeEnabled: boolean;
  destructiveCommandsWarning: boolean;
  defaultAIMode: 'passive' | 'assistive' | 'hands-on';
  defaultLanguage: string;
  uiTheme: 'light' | 'dark' | 'orthodox-blue' | 'custom';

  // OMAI Behavior Settings
  autonomousActions: boolean;
  errorRecoveryMode: 'auto-refresh' | 'retry' | 'report';
  verbosityLevel: 'minimal' | 'normal' | 'debug';
  agentPersonality: 'classic' | 'liturgical' | 'debugging-expert' | 'project-manager' | 'orthodox-educator';

  // Backend Integration
  databaseContextOverride: string;
  serviceEnvironment: 'prod' | 'dev' | 'sandbox';

  // Logs & Analytics
  showMetrics: boolean;
  exportLogsFormat: 'json' | 'csv' | 'txt';
  trackExecutionTime: boolean;
  trackQueryCount: boolean;
  trackSuccessRate: boolean;
}
