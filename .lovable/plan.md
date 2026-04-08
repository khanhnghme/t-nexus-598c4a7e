

## ĐÃ RÕ KIẾN TRÚC T-NEXUS

---

## Kế hoạch Rà soát & Refactor theo System Instructions

### Tổng quan các vi phạm phát hiện

**Vi phạm 1 — Hard-code giới hạn project (NGHIÊM TRỌNG)**
- `src/pages/Groups.tsx` dòng 269: `profile.project_limit ?? 2` → hard-code fallback = 2
- `src/pages/Dashboard.tsx` dòng 66: `DEFAULT_PROJECT_LIMIT = 2`
- `src/pages/PersonalInfo.tsx` dòng 26: `DEFAULT_PROJECT_LIMIT = 2`

**Vi phạm 2 — Logic quyền tạo Project sai**
- `canCreateProject = isAdmin || isLeader` (dùng system role thay vì workspace role)
- Theo kiến trúc: chỉ `workspace_owner` và `workspace_admin` được tạo project; `workspace_member` bị cấm
- Hiện tại `isLeader = isSystemAdmin` → bất kỳ system admin nào đều được tạo (đúng), nhưng workspace_owner/admin không phải system admin thì KHÔNG tạo được (sai)

**Vi phạm 3 — Nhãn UI "Group"/"Nhóm" còn sót**
- `src/pages/Groups.tsx`: "Chưa có nhóm nào", "tạo nhóm nào", "Quản lý các nhóm"
- `src/components/scores/`: "Chấm theo nhóm", "TB nhóm"
- `src/pages/Tips.tsx`: nhiều chỗ dùng "nhóm" thay vì "dự án"
- `src/lib/roleLabels.ts`: "Trưởng nhóm", "Phó nhóm" (đây là label project role — cần giữ hay đổi?)
- Nhiều file khác (~23 file có "nhóm")

**Vi phạm 4 — `workspace_guest` vẫn tồn tại trong type definitions**
- `src/types/database.ts`: `WorkspaceRole` type vẫn có `workspace_guest`
- `src/lib/roleLabels.ts`, `src/components/SidebarTreeNav.tsx`, `src/pages/WorkspaceMembers.tsx` vẫn xử lý `workspace_guest`
- Theo kiến trúc: guest KHÔNG tồn tại trong `workspace_members`, chỉ ở `group_members` với `is_guest = true`

---

### Chi tiết thay đổi

#### Phase 1: Sửa logic quyền tạo Project (quan trọng nhất)

**File: `src/pages/Groups.tsx`**
- Thay `isLeader` bằng logic workspace role: cho phép tạo nếu `workspaceRole` là `workspace_owner` hoặc `workspace_admin`, HOẶC user là `isSystemAdmin`
- Xóa hard-code `profile.project_limit ?? 2` → query `plan_limits` table dựa trên workspace owner's plan. Nếu null → UNLIMITED
- Cập nhật UI disable/enable nút tạo project theo workspace role mới

**File: `src/pages/Dashboard.tsx`**
- Xóa `DEFAULT_PROJECT_LIMIT = 2`
- Sửa `canCreateProject` dùng workspace role thay vì `isAdmin || isLeader`
- Query `plan_limits` cho `max_projects_per_workspace`, fallback UNLIMITED nếu null

**File: `src/pages/PersonalInfo.tsx`**
- Xóa `DEFAULT_PROJECT_LIMIT = 2`
- Sửa `canCreateProject` tương tự Dashboard

#### Phase 2: Xóa `workspace_guest` khỏi hệ thống

**File: `src/types/database.ts`**
- Xóa `'workspace_guest'` khỏi `WorkspaceRole` type

**File: `src/lib/roleLabels.ts`**
- Xóa case `workspace_guest`

**File: `src/components/SidebarTreeNav.tsx`**
- Xóa case `workspace_guest`, default fallback về `workspace_member`

**File: `src/pages/WorkspaceMembers.tsx`**
- Xóa case `workspace_guest`

#### Phase 3: Đổi nhãn UI "Group"/"Nhóm" → "Project"/"Dự án"

Rà soát ~23 file, đổi các chuỗi hiển thị:
- "nhóm" → "dự án" (trong context project)
- Giữ "nhóm" khi nó thực sự chỉ nhóm người (VD: "Chấm theo nhóm" = chấm cả nhóm cùng lúc → giữ nguyên)
- "Trưởng nhóm" / "Phó nhóm" trong roleLabels → đổi thành "Trưởng dự án" / "Phó dự án" (hoặc giữ nếu bạn thích)

Các file chính cần sửa nhãn:
- `src/pages/Groups.tsx` — "Chưa có nhóm nào" → "Chưa có dự án nào", etc.
- `src/pages/Tips.tsx` — nhiều chỗ "trưởng nhóm", "nhóm"
- `src/components/scores/` — "TB nhóm"
- `src/lib/roleLabels.ts` — "Trưởng nhóm" → "Trưởng dự án"

**Lưu ý**: API/Database queries giữ nguyên `groups`, `group_members` — chỉ đổi UI labels.

#### Phase 4: Tạo helper đọc `plan_limits` động

Tạo hook `usePlanLimits` hoặc utility function:
- Query `plan_limits` table theo plan của workspace owner
- Cache kết quả
- Trả về limits với fallback UNLIMITED (null = unlimited)
- Dùng ở Groups.tsx, Dashboard.tsx thay cho hard-code

---

### Không thay đổi
- Database schema (bảng `groups`, `group_members` giữ nguyên tên)
- Edge Functions (không vi phạm nào phát hiện)
- RLS policies (đã đúng logic)

