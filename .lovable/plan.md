

## Tách route ngôn ngữ: Public dùng URL prefix, Internal dùng account setting + Dịch toàn bộ UI nội bộ sang English

### Tổng quan

Hiện tại `LanguageContext` dùng URL prefix (`/vi/...`) cho mọi route. Cần tách:
- **Public routes** (Landing, Auth, Pricing, Download, Terms): giữ nguyên URL prefix `/vi/...`, `/en/...`
- **Internal routes** (Dashboard, Groups, Calendar...): bỏ prefix, locale lấy từ `profile.preferred_locale`

Đồng thời, toàn bộ UI nội bộ hiện đang hardcode tiếng Việt → cần dịch sang English và dùng translation system.

---

### 1. Refactor `LanguageContext.tsx`

**Logic mới:**
- Thêm helper `isPublicRoute(pathname)` → check nếu path là `/`, `/auth`, `/pricing`, `/download`, `/terms` (hoặc `/vi/...` versions)
- Nếu **public route**: locale = URL-based (giữ nguyên logic hiện tại)
- Nếu **internal route**: locale = `profile.preferred_locale` (bỏ qua URL path)
- `localizedPath()`: chỉ thêm prefix cho public routes, internal routes luôn trả path gốc
- `setLocale()`: nếu đang ở internal route → chỉ update DB, KHÔNG navigate sang `/vi/...`
- Xóa logic auto-redirect sang `/vi/dashboard` (dòng 52-62)

**Hàm `isPublicRoute`:**
```
const PUBLIC_PATHS = ['/', '/auth', '/pricing', '/download', '/terms'];
function isPublicRoute(pathname: string): boolean {
  const canonical = stripLocalePrefix(pathname);
  return PUBLIC_PATHS.includes(canonical) || pathname.startsWith('/vi/') || pathname === '/vi';
}
```

---

### 2. Thêm translation keys cho internal UI

Mở rộng `en.ts` và `vi.ts` với section `app` cho toàn bộ UI nội bộ:

```typescript
app: {
  sidebar: {
    home: 'Home' / 'Trang chủ',
    projects: 'Projects' / 'Dự án',
    calendar: 'Calendar' / 'Lịch',
    communication: 'Communication' / 'Trao đổi',
    account: 'Account' / 'Tài khoản',
    tips: 'Tips' / 'Mẹo',
    feedback: 'Feedback' / 'Góp ý',
    members: 'Members' / 'Thành viên',
    backup: 'Backup' / 'Sao lưu',
    admin: 'Admin' / 'Quản trị',
    utilities: 'Utilities' / 'Tiện ích',
    workspaceOverview: 'WS Overview' / 'Tổng quan WS',
    workspaceMembers: 'WS Members' / 'Thành viên WS',
    createWorkspace: 'Create Workspace' / 'Tạo Workspace',
    personal: 'Personal' / 'Cá nhân',
    system: 'System' / 'Hệ thống',
    noWorkspace: 'No workspace' / 'Chưa có workspace',
    ...
  },
  dashboard: { ... },  // ~50 keys cho Dashboard page
  groups: { ... },      // ~30 keys cho Groups page
  workspace: { ... },   // ~40 keys cho Workspace settings/members
  memberMgmt: { ... },  // ~30 keys cho Member Management
  calendar: { ... },
  communication: { ... },
  personalInfo: { ... },
  tips: { ... },
  feedback: { ... },
  // ... other internal pages
}
```

**Ước tính: ~300-400 translation keys** cho toàn bộ UI nội bộ.

---

### 3. Cập nhật SidebarTreeNav.tsx

- Import `useLanguage` → lấy `translations.app.sidebar`
- Thay tất cả hardcoded Vietnamese strings bằng translation keys
- Ví dụ: `'Trang chủ'` → `t.sidebar.home`

---

### 4. Cập nhật các trang nội bộ (ưu tiên cao)

Mỗi trang cần: import `useLanguage`, thay hardcoded strings bằng `t.app.xxx`

| Trang | Ước tính keys |
|-------|---------------|
| `Dashboard.tsx` | ~50 |
| `SidebarTreeNav.tsx` | ~20 |
| `Groups.tsx` | ~20 |
| `GroupDetail.tsx` | ~40 |
| `WorkspaceSettings.tsx` | ~30 |
| `WorkspaceMembers.tsx` | ~30 |
| `MemberManagement.tsx` | ~25 |
| `PersonalInfo.tsx` | ~25 |
| `Calendar.tsx` | ~20 |
| `Communication.tsx` | ~15 |
| `Feedback.tsx` | ~10 |
| `Tips.tsx` | ~10 |
| `AdminSystem.tsx` | ~15 |
| `AdminBackup.tsx` | ~10 |
| `Utilities.tsx` | ~10 |
| Shared components (~15 files) | ~50 |

---

### 5. Cập nhật MemberAuthForm.tsx

Hiện tại dùng `localizedPath('/terms')` → nếu đang ở auth (public route), vẫn OK. Không cần thay đổi.

---

### 6. Các file cần thay đổi

| File | Hành động |
|------|-----------|
| `src/contexts/LanguageContext.tsx` | Refactor: tách logic public/internal |
| `src/lib/i18n/en.ts` | Thêm ~300 keys section `app` |
| `src/lib/i18n/vi.ts` | Thêm ~300 keys section `app` |
| `src/components/SidebarTreeNav.tsx` | Dùng translations |
| `src/pages/Dashboard.tsx` | Dùng translations |
| `src/pages/Groups.tsx` | Dùng translations |
| `src/pages/GroupDetail.tsx` | Dùng translations |
| `src/pages/WorkspaceSettings.tsx` | Dùng translations |
| `src/pages/WorkspaceMembers.tsx` | Dùng translations |
| `src/pages/MemberManagement.tsx` | Dùng translations |
| `src/pages/PersonalInfo.tsx` | Dùng translations |
| `src/pages/Calendar.tsx` | Dùng translations |
| `src/pages/Communication.tsx` | Dùng translations |
| `src/pages/Feedback.tsx` | Dùng translations |
| `src/pages/Tips.tsx` | Dùng translations |
| `src/pages/AdminSystem.tsx` | Dùng translations |
| `src/pages/AdminBackup.tsx` | Dùng translations |
| `src/pages/Utilities.tsx` | Dùng translations |
| ~15 shared components | Dùng translations |

---

### 7. Thứ tự triển khai

Do khối lượng lớn (~30+ files, ~600 translation keys), sẽ chia thành các batch:

1. **Batch 1**: LanguageContext refactor + translation structure (`en.ts`, `vi.ts` section `app`)
2. **Batch 2**: SidebarTreeNav + Dashboard + Groups
3. **Batch 3**: Workspace pages + MemberManagement
4. **Batch 4**: Personal pages (Calendar, Communication, PersonalInfo, Feedback, Tips)
5. **Batch 5**: Admin pages + Utilities + shared components

---

### Không thay đổi
- Routes trong `App.tsx` (internal routes đã không có `/vi/` prefix)
- Public route structure (`/vi/auth`, `/vi/pricing`...)
- Translation files cho public pages (đã có đầy đủ)
- Supabase client, AuthContext structure

