export interface OmAssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  workItemId?: number;
  workItemTitle?: string;
}

export interface OmAssistantContext {
  type: 'global' | 'public' | 'user-guide' | 'dashboard';
  churchId?: number;
  churchName?: string;
  guideContent?: string;
  availableActions?: string[];
}

export interface OmAssistantProps {
  pageContext: OmAssistantContext;
}
