

## Kiểm tra & Hoàn thiện Workspace Module — Phần còn thiếu

### Trạng thái hiện tại (sau khi đối chiếu 2 file plan với code)

**Đã hoàn thành:**
- Phase 1: Database migration (workspaces, workspace_members, workspace_invites, ALTER groups & group_members) 
- Phase 2: Edge Function `workspace-management` (13 actions) — đã deploy 
- Phase 3: WorkspaceContext, useWorkspaceMembers, types/database.ts
- Phase 4 partial: WorkspaceSettings, WorkspaceMembers, WorkspaceSwitcher, SidebarProjects
- Groups.tsx: filter theo workspace_id, gán workspace_id khi tạo project, visibility badge

### Các vấn đề cần fix

**1. SidebarProjects — Thiếu logic visibility cho WS members**

Hiện tại `SidebarProjects` chỉ hiện projects mà user đã là `group_member`. Theo architecture, WS members phải **tự động thấy** tất cả `workspace_public` và `public_link` projects, kể cả khi chưa join.

Cần sửa: Query thêm groups có `visibility IN ('workspace_public', 'public_link')` thuộc workspace, merge với danh sách projects user đã join, loại trùng.

**2. SidebarProjects — Thiếu Guest mode**

Theo plan Phase 5, khi user là Guest (không có trong `workspace_members`, chỉ có trong `group_members` với `is_guest = true`), sidebar cần:
- Ẩn WorkspaceSwitcher dropdown
- Hiện badge "👽 Guest Access"
- Chỉ hiện project được assign
- Hiện hint banner "You are a guest..."

Cần sửa: Thêm logic kiểm tra `workspaceRole === null` (Guest) trong cả `WorkspaceSwitcher` và `SidebarProjects`.

**3. Groups.tsx — Thiếu hiển thị WS Public projects cho WS members chưa join**

Tương tự sidebar, trang Groups chỉ query projects mà user đã là member. WS members cần thấy tất cả `workspace_public` projects trong workspace (dù chưa join), với badge "Chưa tham gia" và nút tham gia.

**4. WorkspaceMembers — Thiếu tab Guest**

Theo plan Phase 4, trang `WorkspaceMembers` cần có tab "Guests" liệt kê các guest (users trong `group_members` với `is_guest = true`). Hiện tại chỉ có danh sách WS members.

**5. Guest invite UI chưa có trong Project settings**

Theo plan Phase 5, cần dialog "Add People" với 2 tab (Workspace Members / Invite Guest) bên trong project. Hiện chưa được triển khai.

### Kế hoạch thực hiện

**Bước 1: Fix SidebarProjects — Visibility rules**
- Nếu user là WS member/admin/owner: query tất cả groups có `workspace_id = activeWorkspace.id` AND (`visibility IN ('workspace_public', 'public_link')` OR user là `group_member`)
- Nếu user là Guest (`workspaceRole === null`): chỉ query groups user đã join với `is_guest = true`
- Merge & dedup kết quả

**Bước 2: Fix WorkspaceSwitcher — Guest mode**
- Khi `workspaceRole === null` nhưng user vẫn có projects trong workspace (Guest): hiện tên workspace nhưng ẩn dropdown switcher, thêm "👽 Guest" badge

**Bước 3: Fix Groups.tsx — Hiện WS Public projects**
- Thêm query riêng: groups có `workspace_id = activeWorkspace.id` AND `visibility = 'workspace_public'`, merge với danh sách hiện tại
- Projects mà user chưa join: hiện badge "Chưa tham gia", disable click hoặc cho phép xem read-only

**Bước 4: Thêm Guest tab vào WorkspaceMembers**
- Thêm Tabs component (Members / Guests)
- Tab Guests: query `group_members` WHERE `is_guest = true` AND group thuộc workspace, join với profiles để hiện info

**Bước 5: Tạo Project Guest Invite Dialog**
- Component mới với 2 tab: "Thêm từ Workspace" (pick existing WS members) / "Mời Guest" (nhập email)
- Gọi `inviteGuest()` từ `useWorkspaceMembers` hook
- Tích hợp vào trang quản lý thành viên project hiện tại

### Chi tiết kỹ thuật

- **SidebarProjects query**: Dùng 2 query song song (1 cho group_members, 1 cho visibility-based), merge và dedup ở client
- **Guest detection**: `workspaceRole === null` trong WorkspaceContext (user không phải owner, không có record trong workspace_members)
- **WS Public auto-access**: Chỉ ở UI level (hiển thị). Khi user bấm vào WS Public project chưa join, có thể tự động thêm vào group_members hoặc cho phép xem read-only
- **Edge function**: `invite_project_guest` action đã sẵn sàng, chỉ cần build UI gọi nó

