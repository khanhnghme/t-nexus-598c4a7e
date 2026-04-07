

## Fix build errors + Triển khai Phase 4 & 5 còn lại (Workspace ↔ Project integration)

### Vấn đề hiện tại

Build bị lỗi TS2589/TS2769 tại `WorkspaceContext.tsx` vì bảng `workspaces` và `workspace_members` chưa có trong file `types.ts` auto-generated. Supabase types chưa được regenerate sau khi migration chạy.

### Kế hoạch thực hiện

**Bước 1: Fix build errors — WorkspaceContext.tsx**
- Thay thế `supabase.from('workspaces')` và `supabase.from('workspace_members')` bằng cách ép kiểu (type cast) hoặc dùng `.from('workspaces' as any)` để bypass lỗi TypeScript cho đến khi types được regenerate.
- Cách tiếp cận: cast kết quả query thủ công vì ta không thể sửa `types.ts`.

**Bước 2: Fix tương tự cho các file khác dùng Supabase client query workspace tables**
- `src/pages/WorkspaceSettings.tsx` — kiểm tra và fix nếu cần
- `src/hooks/useWorkspaceMembers.ts` — kiểm tra và fix nếu cần

**Bước 3: Sửa `src/pages/Groups.tsx` — Filter projects theo active workspace**
- Import `useWorkspace` context
- Khi `activeWorkspace` tồn tại, filter query `.eq('workspace_id', activeWorkspace.id)`
- Khi tạo project mới, tự động gán `workspace_id = activeWorkspace.id`
- Thêm visibility badge (🔒 Private, 🌐 WS Public, 🌍 Public) trên card

**Bước 4: Sửa Sidebar (`DashboardLayout.tsx`) — Hiển thị project list theo workspace**
- Dưới WorkspaceSwitcher, thêm section liệt kê projects thuộc active workspace
- Phân loại theo visibility: WS Public hiện cho tất cả WS members, Private chỉ hiện cho project members
- Guest mode: chỉ hiện project được gán

**Bước 5: Guest invite flow**
- Đảm bảo `useWorkspaceMembers.inviteGuest()` hoạt động đúng với edge function `workspace-management`
- Thêm UI invite guest vào trang quản lý thành viên project (nếu chưa có)

### Chi tiết kỹ thuật

- **Type bypass pattern**: Dùng `(supabase as any).from('workspaces')` hoặc tạo helper function wrapper để tránh lỗi TS cho đến khi types tự regenerate.
- **Sidebar project list**: Query `groups` WHERE `workspace_id = activeWorkspace.id`, áp dụng visibility rules ở client side dựa trên `workspaceRole` và `group_members` membership.
- **Groups.tsx filter**: Thêm điều kiện `.eq('workspace_id', activeWorkspace.id)` vào query fetch groups hiện tại, fallback về query cũ nếu workspace chưa available (`isAvailable = false`).

