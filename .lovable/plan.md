

## Redesign Toàn bộ Hệ thống Phân quyền & Phân loại Thành viên

### Hiện trạng & Vấn đề

| Tầng | Hiện tại | Vấn đề |
|------|----------|--------|
| System | `app_role` enum: `owner_system`, `leader`, `member` | `leader`/`member` lẫn với project role; thiếu `system_admin` |
| Workspace | `workspace_members.role`: text `admin`/`member` + `owner_id` | Không có enum riêng; thiếu `guest` |
| Project | `group_members.role`: dùng chung `app_role` | Hoàn toàn sai — project role dùng system enum |
| Plan | Chưa tồn tại | — |

**36 files frontend** tham chiếu `isAdmin`/`isLeader`/`isOwnerSystem`/`owner_system`/`leader` cần cập nhật.

---

### 1. Thiết kế Role & Plan mới

#### 1.1 System Roles (`system_role` enum)

| Role | Mô tả | Số lượng |
|------|--------|----------|
| `system_owner` | Toàn quyền hệ thống | 1 duy nhất |
| `system_admin` | Quản trị user, workspace, config | Không giới hạn |

#### 1.2 Workspace Roles (`workspace_role` enum)

| Role | Quyền | Là WS member? |
|------|-------|:-:|
| `workspace_owner` | Toàn quyền WS (via `workspaces.owner_id`) | Có |
| `workspace_admin` | Quản lý settings, members, projects | Có |
| `workspace_member` | Tạo project, xem WS-public projects | Có |
| `workspace_guest` | Chỉ thấy project được mời cụ thể | **Không** |

#### 1.3 Project Roles (`project_role` enum)

| Role | View | Edit task | Manage members | Manage settings | Invite |
|------|:---:|:---:|:---:|:---:|:---:|
| `project_owner` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `project_admin` | ✅ | ✅ | ✅ | Hạn chế | ✅ |
| `project_member` | ✅ | ✅ (assigned) | ❌ | ❌ | ❌ |
| `project_guest` | ✅ (read-only) | ❌ | ❌ | ❌ | ❌ |

#### 1.4 User Plan (`user_plan` enum)

| Plan | Ghi chú |
|------|---------|
| `plan_free` | Mặc định |
| `plan_plus` | Nâng cấp cá nhân |
| `plan_pro` | Premium |
| `plan_business` | Doanh nghiệp |
| `plan_custom` | Tùy chỉnh đặc biệt |

**Áp dụng theo user** (`profiles.user_plan`, default `plan_free`). Giới hạn cụ thể tra từ bảng `plan_limits` (tạo structure, chưa enforce).

---

### 2. Inheritance & Multi-role

```text
system_owner  → tương đương workspace_owner ở MỌI workspace
system_admin  → tương đương workspace_admin ở MỌI workspace
workspace_owner → tương đương project_owner ở MỌI project trong WS
workspace_admin → tương đương project_admin ở MỌI project trong WS
```

Không kế thừa ngược. Multi-role → lấy quyền cao nhất.

---

### 3. Data Migration Mapping

```text
user_roles:
  owner_system → system_owner
  leader       → XÓA (sẽ giữ quyền qua workspace_member)
  member       → XÓA

workspace_members.role (text):
  admin  → workspace_admin
  member → workspace_member

group_members.role (app_role):
  owner_system → project_owner (hoặc map theo groups.created_by)
  leader       → project_admin
  member       → project_member
```

---

### 4. Kế hoạch triển khai (4 phases)

#### Phase 1: Database Migration
1. Tạo 3 enum mới: `system_role`, `workspace_role`, `project_role`, `user_plan`
2. Migrate data trong `user_roles`, `workspace_members`, `group_members`
3. Thêm `user_plan` column vào `profiles` (default `plan_free`)
4. Tạo bảng `plan_limits` (structure only, chưa enforce)
5. Cập nhật tất cả DB functions: `has_role` → `has_system_role`, `is_admin` → `is_system_admin`, `is_owner_system` → `is_system_owner`, `is_group_leader` → `is_project_admin`, `is_moderator`, `is_leader`, `check_project_access`, `get_workspace_role`, `check_admin_user`
6. Cập nhật tất cả RLS policies dùng function mới

#### Phase 2: Edge Functions
1. `workspace-management` — đổi role strings (`admin`→`workspace_admin`, etc.)
2. `manage-users` — đổi sang `system_role`, xóa `leader`/`admin` role options
3. `ensure-owner` — dùng `system_owner`

#### Phase 3: Frontend Types & Context
1. `src/types/database.ts` — đổi `AppRole` → 3 types riêng + `UserPlan`
2. `src/contexts/AuthContext.tsx` — `isSystemOwner`, `isSystemAdmin`, bỏ `isLeader`
3. `src/contexts/WorkspaceContext.tsx` — dùng `workspace_role` enum
4. `src/lib/roleLabels.ts` — labels mới cho 3 tầng + plan
5. `src/hooks/useWorkspaceMembers.ts` — role types mới

#### Phase 4: UI Components (~30+ files)
Tất cả files reference roles cũ → đổi sang enum mới:
- `AdminUsers.tsx`, `Auth.tsx`, `GroupDetail.tsx`, `TaskDetail.tsx`
- `MemberManagementCard.tsx`, `ProfileViewDialog.tsx`, `ProjectTransferDialog.tsx`
- `SidebarTreeNav.tsx`, `FirstTimeOnboarding.tsx`, `CalendarTaskDetailDialog.tsx`
- `TaskSubmissionDialog.tsx`, `Feedback.tsx`, `Dashboard.tsx`
- Và ~17 files khác

---

### 5. Files cần thay đổi

| File | Action |
|------|--------|
| Migration SQL (1 file lớn) | Tạo mới — enums, data migrate, functions, RLS |
| `supabase/functions/workspace-management/index.ts` | Sửa |
| `supabase/functions/manage-users/index.ts` | Sửa |
| `supabase/functions/ensure-owner/index.ts` | Sửa |
| `src/types/database.ts` | Sửa |
| `src/contexts/AuthContext.tsx` | Sửa |
| `src/contexts/WorkspaceContext.tsx` | Sửa |
| `src/lib/roleLabels.ts` | Sửa |
| `src/hooks/useWorkspaceMembers.ts` | Sửa |
| ~30 component/page files | Sửa — role references |

### Không thay đổi
- Routes, WorkspaceContext structure, Supabase client
- Notification/email/storage logic (chỉ đổi role check)
- Plan enforcement (chỉ tạo structure, chưa enforce)

