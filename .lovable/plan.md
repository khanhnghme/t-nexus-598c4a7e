

## Rà soát & Đồng bộ toàn bộ hệ thống với Workspace

### Vấn đề phát hiện

1. **Bug: Nút "+" tạo Workspace** → navigate tới `/workspace/new` nhưng **route này không tồn tại** trong App.tsx → hiển thị trang 404
2. **Dashboard** không lọc projects theo workspace — fetch tất cả groups user tham gia, bất kể workspace nào
3. **Calendar** không lọc theo workspace — hiển thị tasks từ tất cả groups
4. **Không có trang tạo Workspace mới**

### Kế hoạch thực hiện

**Bước 1: Tạo trang CreateWorkspace + route**

- Tạo `src/pages/CreateWorkspace.tsx` — form đơn giản (tên, mô tả)
- Gọi edge function `workspace-management` action `create_workspace`
- Sau khi tạo xong → `refreshWorkspaces()` → switch sang workspace mới → redirect `/workspace/settings`
- Thêm route `/workspace/new` vào App.tsx

**Bước 2: Cải thiện UX nút tạo Workspace trong sidebar**

- Thay nút `+` nhỏ bằng một item rõ ràng hơn: hiển thị dòng "＋ Tạo Workspace" bên dưới danh sách workspace hiện tại (style giống 1 nav item nhưng dùng màu nhạt + border dashed)
- Khi collapsed: hiển thị icon `Plus` với tooltip "Tạo Workspace mới"

**Bước 3: Dashboard lọc theo Workspace**

Sửa `src/pages/Dashboard.tsx`:
- Import `useWorkspace`
- Trong `fetchDashboardData()`: nếu `isAvailable && activeWorkspace`, thêm `.eq('workspace_id', activeWorkspace.id)` vào query groups
- Thêm `activeWorkspace` vào dependency của useEffect fetch data
- Hiển thị tên workspace hiện tại ở header Dashboard (nhỏ, subtitle)

**Bước 4: Calendar lọc theo Workspace**

Sửa `src/pages/Calendar.tsx`:
- Import `useWorkspace`
- Trong query `calendar-tasks`: nếu workspace available, lọc tasks chỉ từ groups thuộc `activeWorkspace.id`
- Thêm `activeWorkspace?.id` vào queryKey để auto-refetch khi switch workspace

**Bước 5: Notification / Communication context**

Kiểm tra và thêm filter workspace_id nếu cần cho:
- `src/pages/Communication.tsx` — messages theo workspace
- Notifications — giữ nguyên (notifications là per-user, không cần filter workspace)

### Files affected

| File | Action |
|------|--------|
| `src/pages/CreateWorkspace.tsx` | Tạo mới |
| `src/App.tsx` | Thêm route `/workspace/new` |
| `src/components/SidebarTreeNav.tsx` | Cải thiện UX nút tạo WS |
| `src/pages/Dashboard.tsx` | Thêm filter workspace |
| `src/pages/Calendar.tsx` | Thêm filter workspace |

### Không thay đổi
- Groups.tsx — đã có filter workspace rồi
- WorkspaceContext, edge functions — giữ nguyên
- Notifications — per-user, không cần workspace filter

