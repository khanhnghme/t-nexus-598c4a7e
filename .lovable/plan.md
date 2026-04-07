
Mục tiêu: sửa lỗi “bấm Tạo tài khoản thì bị duyệt thẳng / nhảy qua login rồi văng lại màn auth” để luồng luôn dừng đúng ở bước nhập OTP 6 số.

1. Nguyên nhân gốc đã xác nhận
- Luồng đăng ký hiện tại vẫn tạo session ngay khi submit form.
- Trong lúc session vừa được tạo, hệ thống thấy user đã có phiên nên `/auth` bị một trong các lớp điều hướng cướp mất:
  - `src/pages/Auth.tsx` có thể bật `RememberLoginScreen` nếu còn cờ nhớ đăng nhập.
  - `src/components/MemberAuthForm.tsx` có logic tự điều hướng khi đã có `user + profile`.
- Đồng thời cấu hình hiện tại đang bật cả:
  - `auto_approve_accounts = true`
  - `require_email_verification = true`
- Vì vậy UI bị mâu thuẫn: tài khoản vừa được tạo đã có phiên/được duyệt, trong khi form lại còn muốn chuyển sang OTP. Kết quả là người dùng thấy nhảy khỏi form OTP rồi quay lại màn auth.

2. Hướng sửa đúng gốc
- Không tiếp tục dùng client signup hiện tại cho form thành viên.
- Chuyển đăng ký sang một backend-controlled flow:
  1) tạo user ở trạng thái chưa xác minh email
  2) không đăng nhập tự động vào trình duyệt
  3) gửi OTP 6 số bằng hệ thống email đã cấu hình
  4) mở `OtpVerifyScreen`
  5) chỉ khi nhập đúng OTP mới xác nhận email
  6) sau đó user mới tự đăng nhập

3. Cách triển khai
- `src/components/MemberAuthForm.tsx`
  - thay nhánh `handleRegister` để không còn phụ thuộc vào signup tạo session
  - sau khi backend trả `user_id`, set luôn trạng thái `registerSuccess = 'verify_email'`
  - giữ nguyên màn OTP cho tới khi xác minh xong
  - bỏ pattern “signup xong rồi signOut”
- `supabase/functions/signup-email-otp/index.ts` hoặc tách function mới cho signup
  - thêm action tạo tài khoản pending + gửi OTP trong cùng flow
  - bảo đảm không phát session client ở bước đăng ký
  - giữ verify/resend như hiện tại
- `src/pages/Auth.tsx`
  - thêm guard để `RememberLoginScreen` không chen vào khi đang ở flow đăng ký/OTP
  - đây là lớp bảo vệ phụ để tránh UI bị cướp màn hình
- `src/contexts/AuthContext.tsx`
  - giữ login thông thường
  - nếu cần, tách rõ signup thành viên khỏi auth context hiện tại để tránh reuse logic cũ

4. Logic cũ sẽ bị loại khỏi flow đăng ký
- bỏ dùng client `signUp()` cho member registration
- bỏ trạng thái “vừa tạo tài khoản vừa có session rồi mới sign out”
- chặn remember-login và auto-redirect can thiệp khi OTP chưa hoàn tất

5. Flow mới sau khi sửa
```text
Bấm "Tạo tài khoản"
→ backend tạo tài khoản chưa xác minh (không auto login)
→ gửi OTP 6 số từ sender/domain đã cấu hình
→ hiện màn nhập OTP
→ nhập đúng OTP
→ backend xác minh email
→ hiện "Đăng nhập ngay"
→ user tự đăng nhập
```

6. File dự kiến sửa
- `src/components/MemberAuthForm.tsx`
- `src/pages/Auth.tsx`
- `src/contexts/AuthContext.tsx` (nếu cần tách flow)
- `supabase/functions/signup-email-otp/index.ts` hoặc một function signup mới chuyên biệt

7. Kiểm thử sau khi làm xong
- đang có `t-nexus_remember_login = true` vẫn không được cướp màn OTP
- bật đồng thời auto-duyệt + bắt buộc xác minh email vẫn không auto login
- đăng ký xong luôn ở lại màn OTP
- OTP sai / hết hạn / gửi lại mã hoạt động đúng
- xác minh xong mới đăng nhập được
- không còn hiện tượng nhảy sang login rồi bật lại `/auth`

8. Chi tiết kỹ thuật quan trọng
- Đây không chỉ là lỗi redirect UI; lỗi gốc là signup hiện tại tạo phiên thật quá sớm.
- Nếu chỉ vá giao diện mà vẫn giữ signup cũ, OTP vẫn không phải “cổng xác minh” thật.
- Bản sửa nên ưu tiên biến OTP thành bước xác minh duy nhất và loại hẳn session tự sinh ở bước đăng ký.
