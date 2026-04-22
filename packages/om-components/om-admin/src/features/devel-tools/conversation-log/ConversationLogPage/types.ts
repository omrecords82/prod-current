export interface ConversationSummary {
  filename: string;
  fileDate: string;
  sessionId: string;
  date: string;
  size: number;
  isAgent: boolean;
  preview: string;
  messageCount: number;
  userMessages: number;
  assistantMessages: number;
  source: string;
  format: string;
  title: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ConversationDetail {
  filename: string;
  sessionId: string;
  date: string;
  size: number;
  messages: ConversationMessage[];
  source: string;
  format: string;
  title: string;
}

export interface SearchMatch {
  index: number;
  role: string;
  snippet: string;
}

export interface SearchResult {
  filename: string;
  sessionId: string;
  date: string;
  matchCount: number;
  matches: SearchMatch[];
  source: string;
}

export interface Stats {
  totalConversations: number;
  totalMessages: number;
  totalUserMessages: number;
  totalAssistantMessages: number;
  totalSizeMB: string;
  uniqueDates: number;
  dateRange: { first: string | null; last: string | null };
  agentConversations: number;
  directConversations: number;
}

export interface Task {
  id: string;
  text: string;
  source: string;
  category: string;
  completed: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationInsights {
  decisions: string[];
  tasks: { text: string; source: string; messageIndex: number }[];
  filesChanged: string[];
  featuresBuilt: string[];
  bugsFixed: string[];
  architecturalNotes: string[];
  followUps: string[];
  keyExchanges: { userMessage: string; assistantMessage: string; messageIndex: number }[];
  summary: string;
}

export interface ReviewResult {
  filename: string;
  title: string;
  date: string;
  source: string;
  format: string;
  size: number;
  messageCount: number;
  insights: ConversationInsights;
  selected?: boolean;
}

export interface PipelineExportItem {
  title: string;
  description: string;
  horizon: string;
  priority: string;
  category: string;
  task_type: string;
  status: string;
  enabled: boolean;
}

export const AGENT_TOOLS_CONV = ['windsurf', 'claude_cli', 'cursor'] as const;
export const AGENT_TOOL_LABELS_CONV: Record<string, string> = { windsurf: 'Windsurf', claude_cli: 'Claude CLI', cursor: 'Cursor' };
export const AGENT_TOOL_COLORS_CONV: Record<string, string> = { windsurf: '#00b4d8', claude_cli: '#d4a574', cursor: '#7c3aed' };
export const HORIZON_OPTIONS = [
  { value: '1', label: '24 Hour' },
  { value: '2', label: '48 Hour' },
  { value: '7', label: '7 Day' },
  { value: '14', label: '14 Day' },
  { value: '30', label: '30 Day' },
  { value: '60', label: '60 Day' },
  { value: '90', label: '90 Day' },
];
