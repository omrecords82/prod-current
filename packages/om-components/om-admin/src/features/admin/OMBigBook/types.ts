export interface FileUpload {
  id: string;
  name: string;
  size: number;
  type: string;
  content?: string;
  uploaded: Date;
  processed: boolean;
  status: 'pending' | 'processing' | 'completed' | 'error';
  encryptedPath?: string;
  isQuestionnaire?: boolean;
  questionnaireMetadata?: {
    title?: string;
    ageGroup?: string;
    estimatedDuration?: number;
  };
  result?: {
    success: boolean;
    output?: string;
    error?: string;
    executionTime?: number;
  };
}

export interface ConsoleOutput {
  id: string;
  timestamp: Date;
  type: 'command' | 'output' | 'error' | 'info' | 'success' | 'warning';
  content: string;
  source?: string;
}

export interface BigBookSettings {
  databaseUser: string;
  databasePassword: string;
  useSudo: boolean;
  sudoPassword: string;
  defaultDatabase: string;
  scriptTimeout: number;
  maxFileSize: number;
}

export interface LearningProgress {
  totalSessions: number;
  completedSessions: number;
  currentPhase: string;
  overallProgress: number;
  lastActivity: string;
  knowledgePoints: number;
  memoriesCreated: number;
  filesProcessed: number;
}

export interface TrainingSession {
  id: string;
  name: string;
  phase: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: string;
  endTime?: string;
  duration?: number;
  results?: {
    filesProcessed: number;
    memoriesCreated: number;
    knowledgeExtracted: number;
    errors: number;
  };
}

export interface KnowledgeMetrics {
  totalMemories: number;
  categoriesDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  usagePatterns: {
    mostUsed: Array<{ title: string; count: number }>;
    recentlyAccessed: Array<{ title: string; lastAccessed: string }>;
    trending: Array<{ title: string; trend: number }>;
  };
  learningVelocity: {
    memoriesPerWeek: number;
    knowledgeGrowthRate: number;
    activeHours: number;
  };
}

export interface EthicalFoundation {
  id: string;
  gradeGroup: 'kindergarten-2nd' | '3rd-5th' | '6th-8th' | '9th-12th';
  category: 'moral_development' | 'ethical_thinking' | 'reasoning_patterns' | 'philosophical_concepts';
  question: string;
  userResponse: string;
  reasoning: string;
  confidence: number;
  weight: number;
  appliedContexts: string[];
  createdAt: string;
  lastReferenced?: string;
}

export interface EthicsProgress {
  totalSurveys: number;
  completedSurveys: number;
  gradeGroupsCompleted: string[];
  ethicalFoundationsCount: number;
  moralComplexityScore: number;
  reasoningMaturityLevel: string;
  lastAssessment: string;
}

export interface OMLearnSurvey {
  id: string;
  gradeGroup: string;
  title: string;
  description: string;
  totalQuestions: number;
  completedQuestions: number;
  status: 'not_started' | 'in_progress' | 'completed';
  ageRange: string;
  focus: string;
}
