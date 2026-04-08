

## Tích hợp Cloudflare Turnstile CAPTCHA

### Tổng quan
Thêm Cloudflare Turnstile (CAPTCHA) vào form đăng nhập và đăng ký để chống bot. Widget hiển thị trước nút Submit, token được xác thực phía server qua edge function.

---

### 1. Lưu trữ keys
- **Site Key** (public) → lưu trực tiếp trong code hoặc env `VITE_TURNSTILE_SITE_KEY`
- **Secret Key** (private) → lưu bằng `add_secret` tool với tên `TURNSTILE_SECRET_KEY`, dùng trong edge function

### 2. Tạo component `TurnstileWidget`
**File mới**: `src/components/TurnstileWidget.tsx`
- Load script `https://challenges.cloudflare.com/turnstile/v0/api.js`
- Render widget với site key
- Callback `onVerify(token)` trả token về form cha
- Callback `onExpire()` reset token
- Hỗ trợ theme sáng/tối theo hệ thống

### 3. Tạo edge function xác thực token
**File mới**: `supabase/functions/verify-turnstile/index.ts`
- Nhận `{ token }` từ request body
- Gọi `https://challenges.cloudflare.com/turnstile/v0/siteverify` với secret key
- Trả `{ success: true/false }`

### 4. Tích hợp vào MemberAuthForm
**File sửa**: `src/components/MemberAuthForm.tsx`
- Thêm state `turnstileToken`
- Đặt `<TurnstileWidget>` trước nút Login và trước nút Register
- Trong `handleLogin` và `handleRegister`: gọi edge function `verify-turnstile` trước khi xử lý → nếu fail thì hiện toast lỗi
- Disable nút Submit khi chưa có token

### 5. Cập nhật i18n
**Files sửa**: `src/lib/i18n/en.ts`, `vi.ts`
- Thêm key `captchaRequired`: "Please complete the CAPTCHA" / "Vui lòng hoàn thành CAPTCHA"
- Thêm key `captchaFailed`: "CAPTCHA verification failed" / "Xác minh CAPTCHA thất bại"

---

### Quy trình triển khai
1. Hỏi user cung cấp Site Key và Secret Key
2. Lưu Secret Key bằng tool, Site Key vào code
3. Tạo edge function verify
4. Tạo TurnstileWidget component
5. Tích hợp vào form đăng nhập + đăng ký

### Files thay đổi

| File | Hành động |
|------|-----------|
| `src/components/TurnstileWidget.tsx` | Tạo mới |
| `supabase/functions/verify-turnstile/index.ts` | Tạo mới |
| `src/components/MemberAuthForm.tsx` | Thêm CAPTCHA widget + validation |
| `src/lib/i18n/en.ts` | Thêm translation keys |
| `src/lib/i18n/vi.ts` | Thêm translation keys |

