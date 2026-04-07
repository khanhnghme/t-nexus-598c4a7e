

## Redesign Sidebar: Vertical Tree Navigation

### Tổng quan

Chuyển đổi sidebar từ kiểu menu phẳng (flat list với section labels) sang kiểu cây phân cấp dọc (vertical tree) với 3 cấp rõ ràng: **System → Workspace → Project**, hỗ trợ expand/collapse, active state tự động mở nhánh cha, và indent trực quan.

### Cấu trúc cây mới

```text
┌─────────────────────────────┐
│ [Logo] T-Nexus    [🔍🌙🔔] │
│ ⌘K Tìm kiếm...             │
├─────────────────────────────┤
│ ■ Dashboard                 │
│                             │
│ ▼ Workspace A         👑   │
│   ├─ Tổng quan (ws/settings)│
│   ├─ Thành viên (ws/members)│
│   ├─ Cài đặt                │
│   └─▼ Dự án                 │
│      ├─ 🔒 Project 1        │
│      ├─ 🌐 Project 2        │
│      └─ 🌐 Project 3 (Mới) │
│                             │
│ ── PERSONAL ──              │
│ ■ Lịch                      │
│ ■ Trao đổi                  │
│ ■ Tài khoản                 │
│ ■ Mẹo                       │
│ ■ Góp ý                     │
│                             │
│ ── ADMIN ──                 │
│ ■ Thành viên                │
│ ■ Sao lưu                   │
│ ■ Quản trị                  │
│ ■ Tiện ích                  │
├─────────────────────────────┤
│ [Avatar] Tên user     ▾    │
└─────────────────────────────┘
```

### Thay đổi chi tiết

**1. Tạo component `SidebarTreeNav.tsx`** (thay thế inline nav trong DashboardLayout)

Component chính chứa toàn bộ logic cây:
- **Dashboard**: item cấp 1, link `/dashboard`
- **Workspace node** (collapsible): hiển thị tên workspace + role badge
  - Tổng quan → `/workspace/settings`
  - Thành viên → `/workspace/members`
  - **Dự án** (collapsible sub-node):
    - Liệt kê projects từ `SidebarProjects` logic (merged joined + public)
    - Mỗi project link tới `/p/{slug}`
    - Icon visibility (🔒/🌐)
    - Badge "Mới" cho WS Public chưa join
- **Personal section**: Lịch, Trao đổi, Tài khoản, Mẹo, Góp ý
- **Admin section** (chỉ hiện nếu isAdmin): Thành viên, Sao lưu, Quản trị, Tiện ích

Logic expand/collapse:
- State `expandedNodes` (Set) quản lý nodes đang mở
- Auto-expand: khi route hiện tại match 1 node con, tự động mở nhánh cha
  - VD: đang ở `/workspace/members` → auto expand "Workspace A"
  - Đang ở `/p/project-slug` → auto expand "Workspace A" → "Dự án"
- Click chevron toggle expand/collapse
- Click tên item navigates (nếu có href)

**2. Sửa `DashboardLayout.tsx`**

- Xóa `mainNav`, `personalNav`, `adminNav` arrays và `renderNavItem` function
- Xóa inline `WorkspaceSwitcher` và `SidebarProjects` renders
- Thay bằng `<SidebarTreeNav collapsed={sidebarCollapsed} />`
- Giữ nguyên: logo, search, bottom user profile, mobile logic

**3. Xóa `WorkspaceSwitcher.tsx`** (logic merge vào SidebarTreeNav)

Workspace switcher dropdown sẽ được tích hợp trực tiếp vào tree node:
- Click vào tên workspace → expand/collapse
- Dropdown chỉ hiện khi có > 1 workspace (small icon bên cạnh tên)
- Guest mode: hiện tên workspace + "👽 Guest" badge, không dropdown

**4. Refactor `SidebarProjects.tsx` → logic-only hook**

Chuyển fetch logic thành `useWorkspaceProjects()` hook, không render UI riêng. `SidebarTreeNav` sẽ dùng hook này để lấy danh sách projects.

**5. Thêm CSS cho tree navigation**

```text
Indent levels:
- Level 0: padding-left 10px (Dashboard, Personal, Admin items)
- Level 1: padding-left 26px (WS children: Tổng quan, Thành viên, Dự án node)
- Level 2: padding-left 42px (Project items)

Tree branch lines:
- Pseudo-element ::before tạo đường dọc nhẹ (1px, opacity 20%)
- Kết nối từ parent xuống children

Chevron:
- Rotate 0° khi collapsed, 90° khi expanded
- Transition 150ms

Active state:
- Giữ nguyên active bar bên trái (::before)
- Parent node khi có child active: text hơi sáng hơn (semi-active state)
```

**6. Collapsed mode**

Khi sidebar collapsed:
- Level 0 items: hiện icon only (như hiện tại)
- Workspace node: hiện icon Building2 only, click mở dropdown với full tree
- Projects: ẩn, chỉ hiện qua workspace dropdown
- Tooltip hiện tên khi hover

### Files affected

| File | Action |
|------|--------|
| `src/components/SidebarTreeNav.tsx` | Tạo mới — component chính |
| `src/hooks/useWorkspaceProjects.ts` | Tạo mới — extract logic từ SidebarProjects |
| `src/components/layout/DashboardLayout.tsx` | Sửa — thay nav cũ bằng SidebarTreeNav |
| `src/components/SidebarProjects.tsx` | Xóa |
| `src/components/WorkspaceSwitcher.tsx` | Xóa |
| `src/index.css` | Sửa — thêm tree nav styles |

### Không thay đổi

- Routes trong App.tsx
- WorkspaceContext, useWorkspaceMembers
- Logic search (⌘K), theme toggle, notification bell
- Bottom user profile section
- Mobile topbar

