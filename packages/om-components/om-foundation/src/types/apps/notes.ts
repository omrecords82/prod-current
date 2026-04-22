export interface NotesType {
  id: number;
  title: string;
  content: string;
  category: string;
  tags: string[];
  color: string;
  is_pinned: boolean;
  is_archived: boolean;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
  created_by_name: string;
  is_owner: boolean;
  // Legacy fields for backward compatibility
  deleted?: boolean;
  datef?: any | string;
}
