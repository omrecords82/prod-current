export interface TaskLink {
  id: number;
  email: string;
  token: string;
  created_at: string;
  expires_at?: string;
  is_used: boolean;
  used_at?: string;
  notes?: string;
  status?: string;
  ip_address?: string;
}

export interface TaskSubmission {
  id: number;
  email: string;
  tasks_json: string;
  submitted_at: string;
  status: string;
  notes?: string;
  ip_address?: string;
  user_agent?: string;
  submission_type?: string;
  sent_to_nick?: boolean;
  sent_at?: string;
}

export interface TaskLog {
  timestamp: string;
  action: string;
  email: string;
  token?: string;
  data: any;
}

export interface TaskAssignmentData {
  recent_links: TaskLink[];
  recent_submissions: TaskSubmission[];
  recent_logs: TaskLog[];
}
