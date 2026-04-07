

## Phase 1: Đổi admin → owner_system (Database + Edge Functions + RLS)

Đây là phase đầu tiên, tập trung vào nền tảng database và backend. Giữ nguyên role `leader` và `member`.

### Mô hình role mới

| Cũ | Mới | Ghi chú |
|----|-----|---------|
| `admin` | `owner_system` | Chỉ 1 tài khoản duy nhất |
| `leader` | `leader` | Giữ nguyên |
| `member` | `member` | Giữ nguyên |

### Bước 1: Database Migration

**1 migration file** thực hiện:

1. **Đổi enum `app_role`**: Thêm giá trị `owner_system`, migrate data từ `admin` → `owner_system`, xóa giá trị `admin` cũ
   - Vì Postgres không cho xóa enum value trực tiếp → tạo enum mới, đổi cột, drop enum cũ
   
2. **Cập nhật tất cả DB functions** dùng `'admin'` → `'owner_system'`:
   - `is_admin()` → đổi tên thành `is_owner_system()`, check role `owner_system`
   - `is_moderator()` → check `owner_system` thay vì `admin`
   - `is_group_leader()` → thay `admin` bằng `owner_system`
   - `has_role()` → giữ nguyên (generic)
   - `check_admin_user()` → đổi thành `check_owner_system_user()`
   - `check_project_access()` → cập nhật

3. **Cập nhật tất cả RLS policies** tham chiếu `is_admin()` → `is_owner_system()`

4. **Reset tất cả user_roles**: DELETE tất cả records có role `admin` (hoặc `owner_system` sau khi migrate)

### Bước 2: Cập nhật Edge Functions (7 files)

| File | Thay đổi |
|------|----------|
| `ensure-admin/index.ts` | Đổi tên → `ensure-owner` hoặc giữ tên, đổi role insert thành `owner_system` |
| `manage-users/index.ts` | Thay `'admin'` → `'owner_system'` trong tất cả action handlers |
| `workspace-management/index.ts` | Thay references `admin` → `owner_system` |
| `auth-email-hook/index.ts` | Kiểm tra & đổi nếu có |
| `signup-email-otp/index.ts` | Kiểm tra & đổi nếu có |
| Các functions khác | Scan & fix |

### Bước 3: Frontend — AuthContext + Types

1. **`src/types/database.ts`**: `AppRole = 'owner_system' | 'leader' | 'member'`
2. **`src/contexts/AuthContext.tsx`**: 
   - `isAdmin` → `isOwnerSystem` (check `roles.includes('owner_system')`)
   - Giữ `isLeader` = `roles.includes('leader') || isOwnerSystem`
3. **`src/lib/roleLabels.ts`**: `admin` → `owner_system`, label "OwnerSystem"

### Bước 4: Frontend — UI Labels + Access Control (27+ files)

Tất cả file dùng `isAdmin`:
- Thay `isAdmin` → `isOwnerSystem` 
- Thay text "Admin" / "Quản trị viên" → "OwnerSystem"
- Thay "Dành cho Admin / Leader" → "Dành cho OwnerSystem"

### Bước 5: Xóa trang AdminAuthForm + route /admin-auth

- Xóa `src/components/AdminAuthForm.tsx`
- Xóa route `/admin-auth` trong `App.tsx`
- OwnerSystem đăng nhập chung qua `/auth`

### Bước 6: Setup Owner mới

Sau khi reset xong (tất cả admin role bị xóa):
- Khi vào app lần đầu, nếu DB không có bất kỳ `owner_system` nào → hiển thị "Setup OwnerSystem" flow
- Flow này gọi edge function `ensure-admin` (đã đổi logic) để tạo owner_system từ ADMIN_EMAIL secret
- Hoặc: hiển thị form setup trên Landing page (đã có nút "Initialize Admin" → đổi thành "Setup OwnerSystem")

### Kết quả Phase 1
- DB chỉ còn 3 role: `owner_system`, `leader`, `member`
- Tất cả tài khoản admin cũ bị reset về không có role
- Hệ thống yêu cầu setup lại OwnerSystem mới
- UI + logic hoàn toàn đồng bộ

### Lưu ý quan trọng
- Phase này rất lớn (~50+ files), sẽ chia thành nhiều lần commit
- Bắt đầu từ migration → edge functions → frontend context → UI files
- Không thay đổi logic Workspace, project, hoặc các tính năng khác

