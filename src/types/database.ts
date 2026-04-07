export type AppRole = 'admin' | 'leader' | 'member';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'VERIFIED';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  student_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  is_approved: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
  // Extended profile fields
  year_batch: string | null;
  major: string | null;
  phone: string | null;
  skills: string | null;
  bio: string | null;
  // Suspension fields
  suspended_until: string | null;
  suspension_reason: string | null;
  suspended_at: string | null;
  suspended_by: string | null;
  // Limits
  project_limit: number | null;
  onboarding_completed: boolean;
  institution: string | null;
  nav_hidden_pages: any;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

// ═══════════════════════════════════════════════════════
// Workspace Types
// ═══════════════════════════════════════════════════════

export type WorkspaceRole = 'owner' | 'admin' | 'member';
export type ProjectVisibility = 'private' | 'workspace_public' | 'public_link';
export type InviteScope = 'workspace' | 'project';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  owner_id: string;
  plan: 'free' | 'plus' | 'pro' | 'business' | 'enterprise';
  max_projects: number;
  max_members: number;
  max_storage_mb: number;
  created_at: string;
  updated_at: string;
  // Joined data
  my_role?: WorkspaceRole;
  member_count?: number;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: 'admin' | 'member';
  invited_by: string | null;
  joined_at: string;
  // Joined data
  profiles?: Profile;
}

export interface WorkspaceInvite {
  id: string;
  scope: InviteScope;
  workspace_id: string;
  group_id: string | null;
  invitee_email: string;
  invitee_user_id: string | null;
  role_granted: string;
  is_guest: boolean;
  invited_by: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expires_at: string;
  created_at: string;
  // Joined data
  workspaces?: Workspace;
  groups?: Group;
  inviter_profile?: Profile;
}

// ═══════════════════════════════════════════════════════
// Group (Project) Types
// ═══════════════════════════════════════════════════════

export interface Group {
  id: string;
  short_id: string;
  slug: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  image_url?: string | null;
  class_code?: string | null;
  instructor_name?: string | null;
  instructor_email?: string | null;
  zalo_link?: string | null;
  additional_info?: string | null;
  is_public?: boolean;
  share_token?: string | null;
  show_activity_public?: boolean;
  show_members_public?: boolean;
  leader_id?: string | null;
  // Workspace fields
  workspace_id?: string | null;
  visibility?: ProjectVisibility;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: AppRole;
  joined_at: string;
  is_guest?: boolean;
  profiles?: Profile;
}

export type SubmissionMethod = 'both' | 'file_only' | 'link_only';

export interface Task {
  id: string;
  short_id: string;
  slug: string;
  group_id: string;
  stage_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  deadline: string | null;
  submission_link: string | null;
  submission_method: SubmissionMethod;
  created_by: string;
  created_at: string;
  updated_at: string;
  task_assignments?: TaskAssignment[];
  groups?: Group;
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  user_id: string;
  assigned_at: string;
  profiles?: Profile;
}

export interface PendingApproval {
  id: string;
  user_id: string;
  group_id: string;
  status: ApprovalStatus;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
  profiles?: Profile;
  groups?: Group;
}

export interface Stage {
  id: string;
  group_id: string;
  name: string;
  description: string | null;
  order_index: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface ProjectInvitation {
  id: string;
  group_id: string;
  invited_user_id: string;
  invited_by: string;
  role: AppRole;
  status: InvitationStatus;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  profiles?: Profile;
  groups?: Group;
  inviter_profile?: Profile;
}
