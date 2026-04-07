

## Kế hoạch kiểm tra & thay thế role cũ → role mới

### Phát hiện: Còn nhiều tham chiếu legacy chưa được cập nhật

Sau khi rà soát toàn bộ codebase, tìm thấy **~40+ dòng code** vẫn dùng role cũ thay vì role mới.

---

### 1. Các file cần sửa (Frontend)

| File | Vấn đề | Sửa thành |
|------|--------|-----------|
| `src/components/MemberDetailDialog.tsx` | `'owner_system'` trong switch/case và badge | `'system_owner'` |
| `src/components/MemberManagementCard.tsx` | `case 'owner_system'`, `role: 'member' as any` | `'system_owner'`, `'project_member'` |
| `src/components/MemberRoleManagementDialog.tsx` | `roles.includes('admin')` | `roles.includes('system_owner')` |
| `src/components/SidebarTreeNav.tsx` | `case 'owner_system'` | `case 'system_owner'` |
| `src/lib/roleLabels.ts` | `'owner_system'`, `'leader'`, `'member'`, `'admin'` trong switch | Đổi sang `system_owner`, `system_admin`, `project_admin`, `project_member` |
| `src/lib/excelExport.ts` | `case 'owner_system'` | `case 'system_owner'` |
| `src/pages/WorkspaceMembers.tsx` | `case 'admin'` (2 chỗ) | `case 'workspace_admin'` |
| `src/pages/MemberManagement.tsx` | `roles.includes('admin')` (4 chỗ) | `roles.includes('system_owner')` hoặc `system_admin` |
| `src/pages/Groups.tsx` | `case 'admin'` | `case 'system_admin'` |
| `src/pages/Tips.tsx` | `id: 'admin'` | Context check — có thể là UI label, cần xem kỹ |

### 2. Edge Functions

| File | Vấn đề | Sửa |
|------|--------|-----|
| `supabase/functions/team-assistant/index.ts` | `role === 'leader'`, fallback `'member'` | Đổi sang `project_admin`/`project_member` |

### 3. Database — `project_invitations.role` column

Bảng `project_invitations` vẫn dùng **`app_role` enum** (`owner_system`, `leader`, `member`) thay vì `project_role`. Cần migration đổi column type sang `project_role` và migrate data.

### 4. Supabase generated types (`types.ts`)

File `src/integrations/supabase/types.ts` vẫn chứa `app_role` enum cũ — file này tự động sinh sau migration. Sau khi sửa DB column `project_invitations.role`, file sẽ tự cập nhật.

---

### Kế hoạch triển khai (3 bước)

**Bước 1: Database migration**
- Đổi `project_invitations.role` từ `app_role` sang `project_role`
- Migrate data: `member` → `project_member`, `leader` → `project_admin`, `owner_system` → `project_owner`

**Bước 2: Edge function**
- Cập nhật `team-assistant/index.ts` — thay `'leader'`/`'member'` bằng `'project_admin'`/`'project_member'`

**Bước 3: Frontend (12 files)**
- `MemberDetailDialog.tsx` — `owner_system` → `system_owner`
- `MemberManagementCard.tsx` — `owner_system` → `system_owner`, bỏ `as any`
- `MemberRoleManagementDialog.tsx` — `'admin'` → `'system_owner'`
- `SidebarTreeNav.tsx` — `owner_system` → `system_owner`
- `roleLabels.ts` — xóa case legacy, chỉ giữ role mới
- `excelExport.ts` — `owner_system` → `system_owner`
- `WorkspaceMembers.tsx` — `'admin'` → `'workspace_admin'`
- `MemberManagement.tsx` — `'admin'` → `'system_owner'`/`'system_admin'`
- `Groups.tsx` — `'admin'` → `'system_admin'`
- `Tips.tsx` — kiểm tra context, cập nhật nếu cần

---

### Không thay đổi
- `AuthContext.tsx` — `isAdmin`/`isLeader` giữ làm deprecated aliases (đã map đúng sang `isSystemAdmin`)
- `ProcessScores.tsx`, `CalendarTaskDetailDialog.tsx` — dùng `isLeader` từ context (đã là alias), không cần sửa
- `DashboardLayout.tsx` — dùng `isAdmin` từ context (đã map đúng)

