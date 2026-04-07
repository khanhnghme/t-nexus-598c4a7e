/**
 * Centralized role label utilities for 3-tier role system.
 * 
 * System roles (user_roles table): system_owner, system_admin
 * Workspace roles (workspace_members): workspace_owner, workspace_admin, workspace_member, workspace_guest
 * Project roles (group_members): project_owner, project_admin, project_member, project_guest
 */

/** Get display label for a system-level role */
export function getSystemRoleLabel(role: string): string {
  switch (role) {
    case 'system_owner': return 'System Owner';
    case 'system_admin': return 'System Admin';
    // Legacy
    case 'owner_system': return 'System Owner';
    default: return role;
  }
}

/** Get display label for a workspace-level role */
export function getWorkspaceRoleLabel(role: string): string {
  switch (role) {
    case 'workspace_owner': return 'Owner';
    case 'workspace_admin': return 'Admin';
    case 'workspace_member': return 'Thành viên';
    case 'workspace_guest': return 'Khách';
    // Legacy
    case 'owner': return 'Owner';
    case 'admin': return 'Admin';
    case 'member': return 'Thành viên';
    default: return role;
  }
}

/** 
 * Get display label for a project-level role.
 * @param role - The role from group_members
 * @param isCreator - Whether this member is the project creator (created_by)
 */
export function getProjectRoleLabel(role: string, isCreator: boolean = false): string {
  if (isCreator) return 'Trưởng nhóm';
  switch (role) {
    case 'project_owner': return 'Trưởng nhóm';
    case 'project_admin': return 'Phó nhóm';
    case 'project_member': return 'Thành viên';
    case 'project_guest': return 'Khách';
    // Legacy
    case 'system_owner':
    case 'owner_system': return 'System Owner';
    case 'leader': return 'Phó nhóm';
    case 'member': return 'Thành viên';
    default: return role;
  }
}

/** Get display label for a user plan */
export function getUserPlanLabel(plan: string): string {
  switch (plan) {
    case 'plan_free': return 'Free';
    case 'plan_plus': return 'Plus';
    case 'plan_pro': return 'Pro';
    case 'plan_business': return 'Business';
    case 'plan_custom': return 'Custom';
    default: return plan;
  }
}
