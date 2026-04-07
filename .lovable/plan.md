

## Thêm chức năng đổi ngôn ngữ trong trang Tài khoản

### Tổng quan
Cho phép người dùng thay đổi ngôn ngữ (English / Tiếng Việt) ngay trong trang Tài khoản. Ngôn ngữ được lưu vào database theo tài khoản.

---

### 1. Database Migration
Thêm cột `preferred_locale` vào bảng `profiles`:
```sql
ALTER TABLE public.profiles
  ADD COLUMN preferred_locale text NOT NULL DEFAULT 'vi';
```

### 2. Sửa `src/types/database.ts`
Thêm `preferred_locale?: string` vào interface `Profile`.

### 3. Sửa `src/pages/PersonalInfo.tsx`
Thêm một card/section "Ngôn ngữ" vào cột trái (bên dưới NavCustomizationCard), gồm:
- 2 nút chọn ngôn ngữ dạng card: **English** và **Tiếng Việt** (với icon cờ)
- Highlight ngôn ngữ đang chọn
- Khi bấm → cập nhật `profiles.preferred_locale` + navigate sang locale path tương ứng

### 4. Sửa `src/contexts/LanguageContext.tsx`
- Thêm hàm `setLocale(locale)` vào context value
- Trong các route nội bộ (dashboard), đọc `profile.preferred_locale` để xác định locale thay vì chỉ dùng URL path
- Sau khi login, tự động áp dụng locale đã lưu

### 5. Sửa `src/contexts/AuthContext.tsx` (nếu cần)
- Sau `fetchProfile`, nếu `preferred_locale` khác locale hiện tại → navigate sang đúng path

---

### Các file thay đổi

| File | Hành động |
|------|-----------|
| Migration SQL | Thêm cột `preferred_locale` |
| `src/types/database.ts` | Thêm field `preferred_locale` |
| `src/pages/PersonalInfo.tsx` | Thêm UI chọn ngôn ngữ |
| `src/contexts/LanguageContext.tsx` | Thêm `setLocale`, đọc locale từ profile |

