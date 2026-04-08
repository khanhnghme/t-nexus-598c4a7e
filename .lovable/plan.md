

## Chuyển Cloudflare Turnstile sang Managed + interaction-only

### Tổng quan
Thay đổi widget từ `invisible` sang `managed` với appearance `interaction-only`. Widget sẽ tự động render khi form load, chỉ hiển thị challenge khi Cloudflare nghi ngờ. Không cần `execute()` thủ công nữa — widget tự xử lý và gọi callback khi có token.

### Thay đổi

**File 1: `src/components/TurnstileWidget.tsx`**
- Bỏ `size: 'invisible'` và `execution: 'execute'`
- Đổi sang `size: 'compact'`, `appearance: 'interaction-only'`
- Bỏ `useImperativeHandle` (không cần `execute()` nữa)
- Bỏ `forwardRef` — component đơn giản hơn
- Container div: bỏ `display: none`, thêm styling nhỏ gọn (chỉ hiện khi cần challenge)

**File 2: `src/components/MemberAuthForm.tsx`**
- Bỏ `turnstileRef`, `pendingActionRef`, và logic `execute()` thủ công
- Đơn giản hóa `handleLogin`/`handleRegister`: chỉ cần check `turnstileToken` có chưa → nếu chưa thì báo lỗi "Vui lòng chờ xác minh"
- Widget sẽ tự động cấp token khi render xong (người dùng bình thường) hoặc sau khi hoàn thành challenge
- Giữ nguyên verify token phía backend
- Giữ nguyên loading states và error handling

### Flow mới
1. Form load → Turnstile render (ẩn hoàn toàn nếu user bình thường)
2. Cloudflare nghi ngờ → hiện challenge nhỏ (compact)
3. Token tự động cấp qua `onVerify` callback
4. User bấm Login/Register → check token → tiếp tục flow bình thường
5. Nếu chưa có token → hiện thông báo "Đang xác minh bảo mật, vui lòng thử lại"

### Kết quả
- Không còn box lớn chiếm diện tích
- 95%+ user sẽ không thấy Turnstile
- Chỉ hiện compact challenge khi cần
- Code đơn giản hơn (bỏ execute pattern)

