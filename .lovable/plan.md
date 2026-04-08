

## Hiện loading ngay khi bấm Login/Đăng ký (trước CAPTCHA)

### Vấn đề
Hiện tại khi `turnstileToken` chưa có, cả `handleLogin` và `handleRegister` đều `return` sớm để chờ CAPTCHA xác thực — nhưng **không bật `isLoading`**. Kết quả: người dùng bấm nút → không thấy phản hồi gì → spam bấm.

### Giải pháp
Đơn giản: bật `setIsLoading(true)` **trước** khi gọi `turnstileRef.current?.execute()`, và tắt loading nếu CAPTCHA lỗi.

### Chi tiết thay đổi

**File: `src/components/MemberAuthForm.tsx`**

1. **handleLogin** (dòng ~242-247): Thêm `setIsLoading(true)` trước khi execute CAPTCHA
2. **handleRegister** (dòng ~439-443): Tương tự, thêm `setIsLoading(true)` trước execute
3. **onError callback của TurnstileWidget**: Thêm `setIsLoading(false)` để tắt loading nếu CAPTCHA thất bại
4. Đảm bảo `onVerify` callback không bật lại loading trùng (vì đã bật sẵn)

Kết quả: Người dùng bấm → loading spinner hiện ngay → CAPTCHA chạy ngầm → xác thực xong → tiếp tục đăng nhập/đăng ký.

