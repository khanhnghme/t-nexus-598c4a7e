

## Kế hoạch: Kết nối Resend Connector và cập nhật API Key

### Vấn đề gốc

`RESEND_API_KEY` đã có trong secrets, nhưng email không gửi được vì **Resend connector chưa được liên kết** với project. Gateway (`connector-gateway.lovable.dev/resend`) yêu cầu connector phải được link trước khi chấp nhận request.

### Bước thực hiện

#### 1. Liên kết Resend connector với project
- Dùng `standard_connectors--connect` với `connector_id: "resend"` để liên kết Resend connector
- Bạn sẽ được yêu cầu chọn hoặc tạo connection mới và nhập Resend API key

#### 2. Xác nhận secrets khả dụng
- Kiểm tra `RESEND_API_KEY` và `LOVABLE_API_KEY` đều có trong environment sau khi link

#### 3. Test gửi email
- Thử đăng ký tài khoản hoặc quên mật khẩu để xác nhận email OTP gửi thành công

### Không thay đổi code
Cả hai edge function `signup-email-otp` và `password-reset-otp` đã sử dụng đúng gateway URL và headers — chỉ cần connector được link là hoạt động.

