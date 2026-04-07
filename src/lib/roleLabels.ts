/**
 * Centralized role label utilities.
 * 
 * IMPORTANT DISTINCTION:
 * - System roles (user_roles table): admin → "Admin", leader → "Leader", member → "Thành viên"
 * - Project roles (group_members table): 
 *     - Project creator (created_by) → "Trưởng nhóm"
 *     - leader role → "Phó nhóm"
 *     - member role → "Thành viên"
 */

/** Get display label for a system-level role (from user_roles table) */
export function getSystemRoleLabel(role: string): string {
  switch (role) {
    case 'owner_system': return 'OwnerSystem';
    case 'leader': return 'Leader';
    case 'member': return 'Thành viên';
    default: return role;
  }
}

/** 
 * Get display label for a project-level role (from group_members table).
 * @param role - The role from group_members
 * @param isCreator - Whether this member is the project creator (created_by)
 */
export function getProjectRoleLabel(role: string, isCreator: boolean = false): string {
  if (isCreator) return 'Trưởng nhóm';
  switch (role) {
    case 'owner_system': return 'OwnerSystem';
    case 'leader': return 'Phó nhóm';
    case 'member': return 'Thành viên';
    default: return role;
  }
}
