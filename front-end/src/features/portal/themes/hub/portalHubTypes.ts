import type { RefObject, ElementType, ReactNode } from 'react';
import type { LucideIcon } from '@/ui/icons';
import type { PipelineStageCounts } from '@/features/portal/RecordPipelineStatus';
import type { PortalQuickAction } from '@/features/portal/themes/modern/components/PortalQuickActionList';

export interface RecentRecord {
  id: number;
  label: string;
  date: string;
  sub?: string;
  type: 'baptism' | 'marriage' | 'funeral';
}

export interface RecordCounts {
  baptism: number;
  marriage: number;
  funeral: number;
}

export interface SearchResult {
  id: number;
  label: string;
  date: string;
  sub?: string;
  type: 'baptism' | 'marriage' | 'funeral';
}

export type DashboardState = 'onboarding' | 'pipeline' | 'dashboard';
export type ActivityFilter = 'all' | 'baptism' | 'marriage' | 'funeral';

export interface PortalHubViewModel {
  greeting: string;
  pageSubtitle: string;
  dashboardState: DashboardState;
  isAdmin: boolean;
  recordsLoading: boolean;
  pipelineLoading: boolean;
  showPipeline: boolean;
  counts: RecordCounts;
  totalRecords: number;
  recentBaptism: RecentRecord[];
  recentMarriage: RecentRecord[];
  recentFuneral: RecentRecord[];
  pipelineCounts: PipelineStageCounts;
  allActivity: RecentRecord[];
  activityFilter: ActivityFilter;
  setActivityFilter: (f: ActivityFilter) => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  debouncedSearch: string;
  searchResults: SearchResult[];
  searchLoading: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  quickActions: PortalQuickAction[];
  typeLabels: Record<string, string>;
  typeColors: Record<string, string>;
  typeIcons: Record<string, ElementType>;
  t: (key: string) => string;
  formatDate: (dateStr: string) => string;
  formatRelativeTime: (dateStr: string) => string;
  highlightMatch: (text: string, query: string) => ReactNode;
  navigate: (path: string) => void;
  onSearchResultClick: (result: SearchResult) => void;
  onUpload: () => void;
  onAddBaptism: () => void;
  onAddMarriage: () => void;
  onAddFuneral: () => void;
  onRecordsType: (type: 'baptism' | 'marriage' | 'funeral' | 'all') => void;
}

export interface PortalHubLayoutProps {
  hub: PortalHubViewModel;
}

export interface RecordTypeConfig {
  key: 'baptism' | 'marriage' | 'funeral';
  label: string;
  icon: LucideIcon;
  accent: string;
  records: RecentRecord[];
  count: number;
}
