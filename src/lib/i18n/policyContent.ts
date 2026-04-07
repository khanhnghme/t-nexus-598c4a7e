export const POLICY_CONTENT_VI = `# 📜 Điều khoản dịch vụ T-Nexus

> Phiên bản **1.0** — Cập nhật lần cuối: Tháng 4/2026
>
> Chính sách này quy định các điều khoản, quyền hạn, trách nhiệm và ràng buộc áp dụng cho tất cả người dùng khi sử dụng nền tảng T-Nexus. Bằng việc đăng nhập hoặc đăng ký tài khoản, bạn đồng ý tuân thủ toàn bộ các điều khoản dưới đây.

---

## 1. Định nghĩa & Phạm vi áp dụng

### 1.1. Định nghĩa thuật ngữ
- **Nền tảng / Hệ thống**: Ứng dụng web T-Nexus và toàn bộ dịch vụ liên quan (cơ sở dữ liệu, lưu trữ tệp, edge function, email).
- **Người dùng**: Bất kỳ cá nhân nào tương tác với Hệ thống, bao gồm khách truy cập, thành viên đã đăng ký, và quản trị viên.
- **Tài khoản**: Hồ sơ xác thực gắn với một email và MSSV duy nhất trong Hệ thống.
- **OwnerSystem**: Người dùng có vai trò \`admin\`, sở hữu quyền hạn cao nhất trong Hệ thống.
- **Leader (Trưởng nhóm)**: Người dùng có vai trò \`leader\` hoặc được chỉ định làm trưởng nhóm trong một project cụ thể.
- **Member (Thành viên)**: Người dùng có vai trò \`member\`, là cấp quyền cơ bản nhất.
- **Project / Nhóm**: Một không gian làm việc chung, chứa task, stage, tài nguyên và thành viên.
- **Task**: Một đơn vị công việc được giao trong project, có trạng thái, deadline và người thực hiện.
- **Stage (Giai đoạn)**: Khoảng thời gian phân chia tiến trình của project, dùng để tính điểm.

### 1.2. Phạm vi áp dụng
Chính sách này áp dụng cho:
- Tất cả người dùng đã đăng ký hoặc được tạo tài khoản trên T-Nexus.
- Mọi hoạt động trên Hệ thống bao gồm nhưng không giới hạn: đăng nhập, quản lý project, giao/nộp task, tải tệp, nhắn tin, và truy cập trang quản trị.
- Người dùng chưa đăng nhập khi truy cập các trang công khai (trang chủ, bảng giá, chính sách, trang chia sẻ project).

---

## 2. Đăng ký & Xác thực Tài khoản

### 2.1. Đăng ký tài khoản
- Người dùng phải cung cấp đầy đủ: **MSSV**, **họ tên**, **trường/đơn vị**, **email** và **mật khẩu**.
- MSSV phải duy nhất trong toàn Hệ thống. Mỗi MSSV chỉ được gắn với một tài khoản.
- Email phải hợp lệ và duy nhất. Hệ thống không cho phép đăng ký nhiều tài khoản cùng email.
- Mật khẩu phải có tối thiểu **6 ký tự**.
- Khi tính năng **xác thực email** được bật bởi Admin (theo Điều 10.5), người đăng ký phải xác thực email qua mã OTP trước khi tài khoản được kích hoạt.

### 2.2. Phê duyệt tài khoản
- Tài khoản mới đăng ký có trạng thái **chưa được duyệt** (\`is_approved = false\`).
- Tài khoản chưa được duyệt **không thể truy cập** bất kỳ chức năng nào sau đăng nhập (dashboard, project, v.v.).
- Chỉ **Admin** có quyền duyệt hoặc từ chối tài khoản (xem Điều 5.1).
- Admin có thể tạo tài khoản thủ công cho thành viên mà không cần quy trình đăng ký.

### 2.3. Đăng nhập
- Người dùng có thể đăng nhập bằng **email** hoặc **MSSV** kết hợp mật khẩu.
- Khi đăng nhập, người dùng phải **đồng ý với chính sách hệ thống** hiện hành (theo Điều 1.2).
- Hệ thống hỗ trợ tùy chọn **"Ghi nhớ đăng nhập"**: nếu bật, phiên đăng nhập sẽ được duy trì giữa các lần truy cập.
- Tài khoản bị đình chỉ hoặc Hệ thống đang bảo trì sẽ bị chặn đăng nhập (theo Điều 6 và Điều 10.1).

### 2.4. Quên mật khẩu & Đặt lại mật khẩu
- Người dùng có thể yêu cầu đặt lại mật khẩu thông qua MSSV hoặc email.
- Hệ thống gửi mã OTP đến email đã đăng ký để xác minh danh tính.
- Mật khẩu mới phải đáp ứng yêu cầu tối thiểu 6 ký tự.
- Admin có thể yêu cầu người dùng **bắt buộc đổi mật khẩu** khi đăng nhập lần tới (\`must_change_password\`).

---

## 3. Vai trò & Phân quyền

### 3.1. Hệ thống vai trò
T-Nexus sử dụng hệ thống phân quyền ba cấp, kế thừa từ trên xuống:

| Vai trò | Ký hiệu | Mức quyền |
|---------|----------|-----------|
| **Admin** | \`admin\` | Cao nhất — bao gồm toàn bộ quyền của Leader và Member |
| **Leader** | \`leader\` | Trung bình — quản lý project, giao task, chấm điểm |
| **Member** | \`member\` | Cơ bản — xem task, nộp bài, tham gia project |

### 3.2. Quyền của Admin
Admin sở hữu toàn bộ quyền hạn trong Hệ thống, bao gồm nhưng không giới hạn:
- Phê duyệt/từ chối tài khoản mới (Điều 2.2).
- Tạo, chỉnh sửa, xóa tài khoản thành viên.
- Gán/thu hồi vai trò \`leader\` hoặc \`member\` cho bất kỳ tài khoản nào.
- Đình chỉ (suspend) tài khoản (Điều 6).
- Xem toàn bộ profile đã duyệt và chưa duyệt.
- Truy cập mọi project, task, tài nguyên mà không cần là thành viên.
- Quản trị hệ thống: bảo trì, ghi lỗi, email, thông báo (Điều 10).
- Xuất/nhập dữ liệu hệ thống (backup/restore).
- Xem nhật ký hoạt động (activity logs) toàn hệ thống.
- **Admin không bị ảnh hưởng** bởi chế độ bảo trì (Điều 10.1).

### 3.3. Quyền của Leader
- Tạo project/nhóm mới.
- Quản lý thành viên trong project mình lãnh đạo: mời, thêm, xóa, chuyển vai trò nhóm.
- Tạo, chỉnh sửa, xóa task trong project.
- Giao task cho thành viên và quản lý deadline.
- Tạo/quản lý stage (giai đoạn) trong project.
- Chấm điểm, duyệt bài nộp, giám sát tiến độ.
- Xem nhật ký hoạt động của project.
- Xử lý yêu cầu tham gia project (pending approvals).

### 3.4. Quyền của Member
- Xem thông tin project mà mình là thành viên.
- Xem task được giao và chi tiết task.
- Nộp bài cho task được giao (submission).
- Xem điểm cá nhân trong project.
- Cập nhật thông tin cá nhân (profile).
- Gửi/nhận tin nhắn trong project.
- Yêu cầu tham gia project (pending approval).

### 3.5. Ràng buộc về vai trò
- Chỉ **Admin** mới có quyền thêm/xóa vai trò hệ thống (\`user_roles\`).
- Người dùng có thể thuộc **nhiều project** đồng thời với các vai trò khác nhau ở mỗi project.
- Leader trong một project **không có quyền Leader** ở project khác trừ khi được gán riêng.
- Vai trò Admin hoạt động **toàn cục** trên toàn Hệ thống, không giới hạn theo project.

---

## 4. Quản lý Project & Nhóm

### 4.1. Tạo project
- Chỉ **Leader** và **Admin** mới có quyền tạo project mới (theo Điều 3.2 và 3.3).
- Người tạo project tự động trở thành thành viên và trưởng nhóm.
- Project phải có **tên** bắt buộc; các trường mã lớp, giảng viên, link Zalo là tùy chọn.

### 4.2. Quản lý thành viên project
- **Trưởng nhóm project** hoặc **Admin** có quyền thêm/xóa thành viên.
- Thành viên muốn tham gia project có thể:
  - Được mời trực tiếp bởi trưởng nhóm.
  - Gửi yêu cầu tham gia (pending approval) — phải được trưởng nhóm/Admin duyệt.
  - Nhập mã tham gia (join by code) nếu project cho phép.
- Việc xóa thành viên khỏi project không ảnh hưởng đến tài khoản hệ thống của người đó.

### 4.3. Chuyển quyền project
- Trưởng nhóm có thể chuyển quyền quản lý project cho thành viên khác.
- Admin có thể chuyển quyền bất kỳ project nào.

### 4.4. Xóa project
- Chỉ **trưởng nhóm** hoặc **Admin** mới có quyền xóa project.
- Khi project bị xóa, **toàn bộ dữ liệu liên quan** (task, stage, điểm, tài nguyên, lịch sử nộp bài, nhật ký hoạt động) sẽ bị xóa vĩnh viễn (cascade delete).

---

## 5. Quản lý Task & Nộp bài

### 5.1. Tạo & quản lý task
- Chỉ **trưởng nhóm project** hoặc **Admin** mới có quyền tạo task.
- Task phải có **tiêu đề** bắt buộc; mô tả, deadline, giai đoạn (stage) là tùy chọn.
- Trưởng nhóm có thể giao task cho một hoặc nhiều thành viên.
- Trạng thái task: \`TODO\` → \`IN_PROGRESS\` → \`DONE\` → \`VERIFIED\`.
  - Thành viên được giao có thể chuyển trạng thái task (trừ \`VERIFIED\`).
  - Chỉ **trưởng nhóm** mới có quyền chuyển sang trạng thái \`VERIFIED\` (duyệt bài).
- Sửa/xóa task: chỉ trưởng nhóm hoặc Admin.

### 5.2. Nộp bài (Submission)
- Chỉ thành viên **được giao task** mới có quyền nộp bài.
- Nộp bài hỗ trợ: link URL và/hoặc tải lên tệp đính kèm.
- Mỗi lần nộp bài được ghi lại trong **lịch sử nộp bài** (\`submission_history\`), không thể xóa.
- Nộp bài sau deadline sẽ bị đánh dấu **trễ hạn**, ảnh hưởng đến điểm (Điều 7).

### 5.3. Ghi chú task (Task Notes)
- Thành viên và trưởng nhóm có thể thêm ghi chú vào task.
- Ghi chú hỗ trợ đính kèm tệp.

---

## 6. Đình chỉ Tài khoản

### 6.1. Quyền đình chỉ
- Chỉ **Admin** mới có quyền đình chỉ tài khoản người dùng.
- Admin **không thể bị đình chỉ** bởi bất kỳ ai.

### 6.2. Cơ chế đình chỉ
- Admin chỉ định **thời hạn đình chỉ** (\`suspended_until\`) và **lý do** (\`suspension_reason\`).
- Tài khoản bị đình chỉ sẽ **không thể đăng nhập** cho đến khi hết thời hạn.
- Hệ thống tự động kiểm tra trạng thái đình chỉ tại thời điểm đăng nhập.
- Khi hết hạn đình chỉ, tài khoản tự động được khôi phục mà không cần can thiệp thủ công.

### 6.3. Hệ quả đình chỉ
- Mọi phiên đăng nhập đang hoạt động sẽ bị chặn.
- Người dùng sẽ nhận thông báo rõ ràng về lý do và thời hạn đình chỉ.
- Dữ liệu của người dùng bị đình chỉ **không bị xóa**, và sẽ nguyên vẹn khi tài khoản được khôi phục.

---

## 7. Chấm điểm & Đánh giá

### 7.1. Hệ thống điểm
- Điểm cơ bản mặc định: **100 điểm** cho mỗi task.
- Hệ thống áp dụng các loại trừ/cộng điểm:
  - **Late penalty**: trừ điểm khi nộp bài sau deadline.
  - **Review penalty**: trừ điểm khi bài nộp bị yêu cầu sửa lại nhiều lần.
  - **Early bonus**: cộng điểm khi nộp bài sớm hơn deadline.
  - **Bug hunter bonus**: cộng điểm khi phát hiện lỗi.

### 7.2. Tính điểm theo stage
- Mỗi stage tổng hợp điểm trung bình của các task thuộc stage đó.
- Các chỉ số bổ sung: số task trễ, bonus sớm, bonus bug hunter.
- Hệ số **K** (\`k_coefficient\`, mặc định 1.0) được áp dụng để điều chỉnh điểm cuối cùng theo stage.

### 7.3. Quyền chấm điểm
- Chỉ **trưởng nhóm project** hoặc **Admin** mới có quyền chấm/chỉnh sửa điểm.
- Thành viên chỉ có quyền **xem** điểm của mình trong project mình tham gia.
- Mọi thay đổi điểm đều được ghi lại qua thông báo cho người liên quan.

---

## 8. Lưu trữ Tệp & Tài nguyên

### 8.1. Hệ thống lưu trữ
T-Nexus sử dụng dịch vụ lưu trữ đám mây (Cloudflare R2) với các bucket phân loại như sau:

| Bucket | Mô tả |
|--------|-------|
| \`avatars\` | Ảnh đại diện người dùng |
| \`task-submissions\` | Tệp nộp bài task |
| \`task-note-attachments\` | Tệp đính kèm ghi chú task |
| \`project-resources\` | Tài liệu, tài nguyên project |
| \`group-images\` | Hình ảnh nhóm/project |
| \`appeal-attachments\` | Tệp đính kèm khiếu nại |
| \`system-assets\` | Tài nguyên hệ thống (Admin) |
| \`profile-achievements\` | Huy hiệu/thành tích cá nhân |
| \`background-music\` | Nhạc nền hệ thống (Admin) |

### 8.2. Quyền truy cập tệp
- **Upload**: Chỉ người dùng đã xác thực mới có quyền tải lên.
- **Download**: Yêu cầu xác thực, trừ tệp thuộc project công khai (public share).
- **Xóa**: Chỉ chủ sở hữu tệp, trưởng nhóm hoặc Admin mới có quyền xóa.
- Mọi thao tác tải lên/xóa đều thông qua Edge Function proxy có kiểm tra phiên.

### 8.3. Giới hạn
- Hệ thống có thể áp dụng giới hạn kích thước tệp theo cấu hình của Admin.
- Các loại tệp không được hỗ trợ có thể bị từ chối khi tải lên.

---

## 9. Thông báo & Email

### 9.1. Thông báo trong ứng dụng
Hệ thống tự động gửi thông báo khi:
- Task được giao, cập nhật, hoặc sắp hết hạn.
- Bài nộp mới từ thành viên (thông báo cho trưởng nhóm).
- Task được duyệt (\`VERIFIED\`).
- Vai trò bị thay đổi (nâng cấp/hạ cấp).
- Lời mời tham gia project và phản hồi lời mời.
- Điểm được cập nhật.

### 9.2. Thông báo bắt buộc (Mandatory Notification)
- Admin có thể tạo **thư thông báo bắt buộc** xuất hiện cho người dùng.
- Thông báo bắt buộc yêu cầu người dùng phải xem tối thiểu một khoảng thời gian (tính bằng giây) trước khi có thể đóng.
- Có thể thiết lập hiển thị **trước** hoặc **sau** đăng nhập.
- Có thể nhắm đến **toàn bộ** hoặc **nhóm người dùng cụ thể**.
- Có ngày hết hạn tùy chọn.

### 9.3. Email Digest hàng ngày
- Khi được bật, Hệ thống gửi **một email tổng hợp/ngày** cho mỗi người dùng.
- Nội dung gồm: deadline sắp hết hạn và task mới được giao.
- Admin cấu hình giờ gửi và khoảng thời gian nhắc deadline.
- Giới hạn **100 email/ngày** theo quy định dịch vụ email.

### 9.4. Email xác thực
- Khi tính năng xác thực email được bật, người đăng ký nhận mã OTP qua email.
- Email đặt lại mật khẩu cũng sử dụng mã OTP.
- Email hệ thống được gửi từ địa chỉ chính thức của T-Nexus.

---

## 10. Quản trị Hệ thống (Chỉ dành cho Admin)

### 10.1. Chế độ Bảo trì (Maintenance Mode)
- Admin có thể **khóa hệ thống** toàn bộ hoặc một phần (sau đăng nhập/toàn bộ).
- Khi bảo trì, **toàn bộ thành viên (trừ Admin)** bị chặn truy cập.
- Admin thiết lập: thông báo bảo trì, thời lượng (theo giờ hoặc vĩnh viễn), phạm vi khóa.
- Hệ thống tự động mở lại khi hết thời hạn bảo trì (\`end_at\`).
- Trạng thái bảo trì được kiểm tra **mỗi 30 giây** cho tất cả phiên đang hoạt động.
- **Liên hệ Điều 2.3**: Người dùng không thể đăng nhập khi Hệ thống đang bảo trì (trừ Admin).
- **Liên hệ Điều 3.2**: Admin được miễn trừ bảo trì.

### 10.2. Ghi lỗi Hệ thống (Error Logging)
- Khi bật, Hệ thống tự động ghi lại: lỗi runtime, promise rejection, console error.
- Mỗi lỗi được ghi kèm: thông báo lỗi, loại, stack trace, URL, user agent, user ID.
- Lỗi trùng lặp được gộp (dedup) và đếm số lần xuất hiện.
- Admin có thể bật/tắt tính năng này.

### 10.3. Video nền & Nhạc nền
- Admin có thể cấu hình video nền cho trang landing, dashboard, và màn hình loading.
- Admin quản lý thư viện nhạc nền hệ thống.
- Cấu hình độ trong suốt (opacity) cho từng vùng hiển thị.

### 10.4. Xác thực Email khi đăng ký
- Admin có thể bật/tắt yêu cầu xác thực email cho tài khoản mới đăng ký.
- Khi bật: người đăng ký phải xác thực email qua OTP trước khi hoàn tất (liên hệ Điều 2.1).
- Khi tắt: tài khoản được tạo ngay mà không cần xác thực.
- **Không ảnh hưởng** tài khoản do Admin tạo thủ công.

### 10.5. Sao lưu & Di dời Dữ liệu
- Admin có quyền **xuất toàn bộ** dữ liệu hệ thống (tất cả bảng + bucket storage).
- Admin có quyền **nhập dữ liệu** từ bản sao lưu để khôi phục hoặc di dời hệ thống.

---

## 11. Bảo mật & Quyền riêng tư Dữ liệu

### 11.1. Bảo mật truy cập
- Tất cả bảng dữ liệu quan trọng đều được bảo vệ bằng **Row Level Security (RLS)**.
- Mỗi truy vấn dữ liệu đều được kiểm tra quyền dựa trên vai trò và tư cách thành viên.
- Phiên đăng nhập được quản lý qua token JWT, tự động làm mới khi hết hạn.
- Mọi thao tác lưu trữ tệp (upload, download, delete) đều yêu cầu xác thực qua Bearer Token.

### 11.2. Bảo mật dữ liệu cá nhân
- Người dùng chỉ có thể xem profile của **chính mình** hoặc của **tài khoản đã duyệt**.
- Admin có quyền xem toàn bộ profile bao gồm cả tài khoản chưa duyệt.
- Mật khẩu được mã hóa và **không bao giờ** lưu dưới dạng văn bản thuần.
- Email và MSSV được sử dụng làm định danh duy nhất, không được chia sẻ cho bên thứ ba.

### 11.3. Phân quyền dữ liệu theo nhóm
- **Task**: Chỉ thành viên cùng project mới xem được task trong project đó (hoặc Admin).
- **Điểm**: Chỉ thành viên cùng project mới xem được điểm (hoặc Admin).
- **Lịch sử nộp bài**: Chỉ thành viên cùng project mới xem được (hoặc Admin).
- **Nhật ký hoạt động**: Chỉ Leader và Admin mới xem/quản lý được.
- **Vai trò hệ thống**: Người dùng chỉ xem được vai trò của chính mình (hoặc Admin xem tất cả).

### 11.4. Chia sẻ công khai
- Trưởng nhóm có thể bật **chia sẻ công khai** cho project thông qua link hoặc slug.
- Trang chia sẻ công khai chỉ hiển thị thông tin **chỉ đọc** và giới hạn.
- Task preview công khai không hiển thị thông tin nhạy cảm (điểm, ghi chú nội bộ).
- Người dùng có thể tạo **trang cá nhân công khai** (public profile) qua username.

---

## 12. Nhật ký Hoạt động & Giám sát

### 12.1. Activity Logging
- Mọi hoạt động quan trọng đều được ghi lại: tạo/sửa/xóa task, thay đổi thành viên, chấm điểm, cài đặt hệ thống, quản lý cuộc họp, v.v.
- Mỗi bản ghi gồm: người thực hiện, hành động, loại hành động, mô tả, project liên quan, thời gian.
- Trưởng nhóm có thể **bật/tắt** ghi log hoạt động cho từng project.
- Leader và Admin có quyền xem, Admin có quyền xóa nhật ký.

### 12.2. Login Streak (Chuỗi đăng nhập)
- Hệ thống theo dõi **chuỗi đăng nhập liên tục** hàng ngày cho mỗi người dùng.
- Bỏ lỡ 1 ngày: chuỗi vẫn tiếp tục (cho phép gap 2 ngày).
- Bỏ lỡ 2+ ngày: chuỗi bị đứt, được chọn **khôi phục** (tối đa 3 lần).
- Hệ thống ghi nhận chuỗi dài nhất (\`longest_streak\`) cho mỗi tài khoản.

### 12.3. User Presence
- Hệ thống theo dõi trạng thái online/offline của người dùng.

---

## 13. Trang công khai & Đa ngôn ngữ

### 13.1. Trang công khai
Các trang sau không yêu cầu đăng nhập:
- **Trang chủ** (\`/\`): Giới thiệu T-Nexus.
- **Bảng giá** (\`/pricing\`): Thông tin các gói dịch vụ.
- **Chính sách** (\`/policy\`): Nội dung chính sách hệ thống (tài liệu này).
- **Trang chia sẻ project** (\`/project/:slug\`, \`/s/:token\`): Xem project công khai.
- **Trang cá nhân công khai** (\`/u/:username\`): Profile công khai.
- **Đăng nhập / Đăng ký** (\`/auth\`): Xác thực tài khoản.

### 13.2. Đa ngôn ngữ
- Hệ thống hỗ trợ **Tiếng Anh** (mặc định, \`/\`) và **Tiếng Việt** (\`/vi\`).
- Các trang công khai (landing, pricing, auth, policy) hỗ trợ chuyển đổi ngôn ngữ.
- Giao diện sau đăng nhập (dashboard, project, admin) chủ yếu sử dụng Tiếng Việt.

---

## 14. Hành vi bị cấm & Xử lý vi phạm

### 14.1. Hành vi bị cấm
Người dùng **không được**:
- Chia sẻ tài khoản hoặc mật khẩu cho người khác.
- Tạo nhiều tài khoản với cùng một người.
- Can thiệp, khai thác lỗ hổng, hoặc phá hoại Hệ thống.
- Tải lên nội dung vi phạm pháp luật, đồi trụy, hoặc spam.
- Sử dụng Hệ thống cho mục đích ngoài phạm vi được phép.
- Cố tình truy cập dữ liệu không thuộc quyền của mình.

### 14.2. Xử lý vi phạm
- Admin có quyền **đình chỉ tài khoản** tạm thời hoặc vĩnh viễn (Điều 6).
- Admin có quyền **từ chối duyệt** hoặc **xóa tài khoản** vi phạm.
- Mọi quyết định xử lý vi phạm thuộc thẩm quyền của Admin và là quyết định cuối cùng.

---

## 15. Miễn trừ Trách nhiệm

### 15.1. Giới hạn trách nhiệm
- T-Nexus cung cấp dịch vụ **nguyên trạng** ("as is"). Hệ thống không đảm bảo hoạt động 100% không gián đoạn.
- Hệ thống không chịu trách nhiệm cho mất mát dữ liệu do lỗi người dùng hoặc sự kiện bất khả kháng.
- Admin giữ quyền bảo trì, cập nhật hoặc thay đổi Hệ thống mà không cần thông báo trước.

### 15.2. Thay đổi chính sách
- Chính sách này có thể được cập nhật bất kỳ lúc nào.
- Ngày cập nhật sẽ được hiển thị rõ ràng và ghi nhận trong Hệ thống.
- Việc tiếp tục sử dụng Hệ thống sau khi chính sách cập nhật đồng nghĩa với việc người dùng chấp nhận phiên bản mới.

---

> **📌 Lưu ý**: Bằng việc sử dụng T-Nexus, bạn xác nhận đã đọc, hiểu và đồng ý tuân thủ toàn bộ các điều khoản trong chính sách này. Mọi thắc mắc xin liên hệ Admin qua hệ thống.`;

export const POLICY_CONTENT_EN = `# 📜 T-Nexus Terms of Service

> Version **1.0** — Last updated: April 2026
>
> This policy defines the terms, permissions, responsibilities, and restrictions that apply to all users of the T-Nexus platform. By logging in or registering an account, you agree to comply with all the terms below.

---

## 1. Definitions & Scope

### 1.1. Definitions
- **Platform / System**: The T-Nexus web application and all associated services (database, file storage, edge functions, email).
- **User**: Any individual interacting with the System, including visitors, registered members, and administrators.
- **Account**: System authenticated profile tied to a unique email and Student ID.
- **Admin**: Users with the \`admin\` role, possessing the highest privileges in the System.
- **Leader**: Users with the \`leader\` role or designated as project leaders.
- **Member**: Users with the \`member\` role, which is the baseline permission level.
- **Project**: A shared workspace containing tasks, stages, resources, and members.
- **Task**: A work unit assigned in a project, having a status, deadline, and assignee.
- **Stage**: A timeframe partitioning the project's progress, used for grading.

### 1.2. Scope
This policy applies to:
- All users who register or have accounts created for them on T-Nexus.
- All operations on the System including, but not limited to: logging in, managing projects, assigning/submitting tasks, uploading files, messaging, and accessing admin pages.
- Unauthenticated users accessing public pages (landing, pricing, policy, shared project pages).

---

## 2. Registration & Account Verification

### 2.1. Account Registration
- Users must provide complete information: **Student ID (MSSV)**, **full name**, **institution**, **email**, and **password**.
- Student ID must be unique system-wide. Each Student ID is bound to a single account.
- Email must be valid and unique.
- Passwords must be at least **6 characters** long.
- If **email verification** is enabled by the Admin (cf. Article 10.5), users must verify their email with an OTP to complete registration.

### 2.2. Account Approval
- Newly registered accounts are initially in a **pending approval** state (\`is_approved = false\`).
- Unapproved accounts **cannot access** post-login functions (dashboard, projects, etc.).
- Only **Admins** have the right to approve or reject accounts (cf. Article 5.1).
- Admins may manually create accounts without going through the registration flow.

### 2.3. Login
- Users may log in using their **email** or **Student ID** and password.
- By logging in, users must **agree to the current system policy**.
- The system supports a **"Remember Login"** option to persist sessions.
- Accounts that are suspended, or if the System is under maintenance, will be blocked from logging in (cf. Article 6 and 10.1).

### 2.4. Password Reset
- Users can request a password reset using their Student ID or email.
- The system will send an OTP verify code to the registered email.
- Passwords must be at least 6 characters long.
- Admins may require users to **change password** on their next login (\`must_change_password\`).

---

## 3. Roles & Permissions

### 3.1. Role System
T-Nexus uses a top-down structural permission system:

| Role | Key | Permissions |
|---------|----------|-----------|
| **Admin** | \`admin\` | Highest — inherits all Leader and Member privileges |
| **Leader** | \`leader\` | Medium — manages projects, assigns tasks, grades submissions |
| **Member** | \`member\` | Basic — views tasks, submits work, accesses projects |

### 3.2. Admin Permissions
Admins possess full power over the System, including:
- Approving/rejecting account registrations.
- Creating, editing, or deleting accounts.
- Granting/revoking \`leader\` or \`member\` roles.
- Suspending accounts.
- Viewing all profiles including unapproved ones.
- Accessing any project, task, or resource regardless of project membership.
- System management: maintenance, errors, email, notifications (cf. Article 10).
- Data import/export and activity log access.
- **Exempt from maintenance constraints** (cf. Article 10.1).

### 3.3. Leader Permissions
- Creating new projects/teams.
- Managing members within their project (inviting, adding, removing, changing roles).
- Managing tasks in the project.
- Setting deadlines and stages.
- Grading, reviewing submissions, and tracking progress.
- Managing project activity logs and approval requests.

### 3.4. Member Permissions
- Viewing information about their joined projects.
- Viewing assigned task details.
- Submitting task outputs.
- Viewing personal grades inside their project.
- Sending/receiving project messages.
- Requesting to join projects.

### 3.5. Role Constraints
- Only **Admins** can change system level roles (\`user_roles\`).
- Users can be part of **multiple projects** with different roles in each.
- A project Leader does **not** inherit Leader rights in other projects they belong to.
- Adming roles are **global** across the entire System.

---

## 4. Project Management

### 4.1. Project Creation
- Only **Leaders** and **Admins** can create a new project.
- The creator automatically becomes a member and the project leader.
- Projects require a **name**; other fields (class code, instructor, links) are optional.

### 4.2. Member Management
- The **project leader** or **Admin** can add/remove members.
- Members join via:
  - Invites from leaders.
  - Join requests requiring leader/Admin approval.
  - Join code (if permitted).
- Being removed from a project does not affect the global user account.

### 4.3. Changing Leadership
- Leaders can transfer project management rights to another member.
- Admins can transfer ownership of any project.

### 4.4. Deleting a Project
- Only **leaders** or **Admins** can delete projects.
- Deletion cascades across **all associated data** (tasks, resources, logs, grades) permanently.

---

## 5. Task & Submission Management

### 5.1. Task Management
- Only **leaders** and **Admins** can create tasks.
- Tasks require a **title**; description, deadline, and stage are optional.
- Task states: \`TODO\` → \`IN_PROGRESS\` → \`DONE\` → \`VERIFIED\`.
  - Assigned members update states up to \`DONE\`.
  - Only **leaders** can transition tasks to \`VERIFIED\`.

### 5.2. Task Submission
- Only **assigned members** can submit answers to a task.
- Supported methods: URLs or attached files.
- All submissions are registered to a non-deletable **submission history** (\`submission_history\`).
- Late submissions receive a **late flag** and affect grades (cf. Article 7).

### 5.3. Task Notes
- Members and leaders can attach notes and files to tasks for collaborative context.

---

## 6. Account Suspension

### 6.1. Authority to Suspend
- Only **Admins** can suspend accounts.
- Admins **cannot be suspended**.

### 6.2. Suspension Mechanics
- Admins specify a **suspended until** date and a **reason**.
- Suspended users **cannot log in** until the time expires.
- Suspension status is checked directly at login.
- Access is restored automatically upon time expiration.

### 6.3. Consequences
- Active sessions are blocked.
- Suspendees receive clear notification of the reason and duration.
- Personal data is **not deleted** and remains intact.

---

## 7. Grading Assessment

### 7.1. Scoring System
- Base default score: **100 points** per task.
- System metrics:
  - **Late penalty**: Deduction for over-deadline submissions.
  - **Review penalty**: Deduction for frequently rejected outputs.
  - **Early bonus**: Bonus for early submissions.
  - **Bug hunter bonus**: Bonus for finding critical bugs.

### 7.2. Stage Evaluation
- Stage scores aggregate average metrics from the tasks within it.
- **K coefficient** adjusts the final stage score.

### 7.3. Privacy of Grades
- Only **Leaders** and **Admins** can grade/edit scores.
- Members can only **see their own** scores.
- All changes push notifications to the user.

---

## 8. File Storage

### 8.1. Storage Subsystems
T-Nexus leverages cloud storage components categorized below:
- \`avatars\`: User profile images.
- \`task-submissions\`: Task files.
- \`task-note-attachments\`: Files in task notes.
- \`project-resources\`: Project documents.
- \`group-images\`: Project display pictures.
- \`appeal-attachments\`: Complaints/appeal files.
- \`system-assets\`: Admin UI files.
- \`profile-achievements\`: Personal certification badges.
- \`background-music\`: Admin configured soundtracks.

### 8.2. File Permissions
- **Upload**: Restricted to authenticated users.
- **Download**: Restricted to authenticated users, minus public project domains.
- **Delete**: Handled by the owner, leader, or Admin.
- Handled through proxy Edge Functions with session validation.

---

## 9. Notification & Email

### 9.1. App Notifications
System automates alerts upon:
- Task assignments, reviews, or deadline approaching.
- Role modifications.
- Project invitations.
- Grade updates.

### 9.2. Mandatory Alerts
- Admins can push **mandatory notifications** requiring minimum view durations.
- Can be targeted globally or per-group.

### 9.3. Daily Email Digest
- Triggers one recap per day summing up deadlines and assignments.
- Admins configure the dispatch timeline.
- Hardcap of **100 emails/day** via service constraints.

### 9.4. Auth Emails
- Handles OTP-based validations and resets via official T-Nexus relays.

---

## 10. System Administration

### 10.1. Maintenance Mode
- Admins can lock partial or total system access.
- Halts all non-Admin sessions.
- Admins configure messages and timeframes.
- System unblocks automatically based on the \`end_at\` config.

### 10.2. Error Logging
- Captures runtime/promise rejection bugs and logs deduplicated instances.

### 10.3. Visual & Audio Assets
- Admins configure background aesthetics and ambient instrumentals for landing and dashboards.

### 10.4. Email Verification
- Admins control the registration switch forcing OTP on onboarding.

### 10.5. Data Migration
- Admins are delegated tools to backup or restore full schema architectures.

---

## 11. Security & Privacy

### 11.1. Access Protections
- All tables are protected by tight **Row Level Security (RLS)** constraints.
- Session authorization runs through automatically refreshed JWT logic.

### 11.2. Info Transparency
- Passwords are encrypted and inaccessible in plaintext.
- Student IDs and Emails form unique indices, kept private.

### 11.3. Object Level Data Separation
- **Tasks & Grades**: Accessible exclusively inside the project container by joined members.
- **Logs**: Restricted downstream to leaders and admins.

### 11.4. Public Shares
- Leaders can switch projects tracking pipelines to **public shares** (read-only) hiding sensitive grades and internals.

---

## 12. Monitoring & Logging

### 12.1. Activity Journals
- Commits a ledger entry for project actions (task updates, reviews, settings) viewable to leaders for auditing.

### 12.2. Login Streaks
- The system gamifies consistent access with streak counts permitting limited gaps.

---

## 13. Public Pages & Multi-Language

### 13.1. Public Surface
Open directories (no auth required):
- **Home** (\`/\`), **Pricing** (\`/pricing\`), **Policy** (\`/policy\`), **Public Project** (\`/project/:slug\`).
- **Auth** (\`/auth\`).

### 13.2. Localization Support
- Supports English (default) and Vietnamese.
- Switches cascade through pre-login surfaces while core authenticated components target primarily Vietnamese logic.

---

## 14. Restrictions & Penalties

### 14.1. Prohibited Action
Users **must not**:
- Expose passwords to third parties.
- Forge multiple identities.
- Sabotage, breach, or exploit the platform.
- Upload explicit content or malware.

### 14.2. Accountability
- Admin arbitration rules apply unilaterally terminating, suspending or rejecting accounts defying standards.

---

## 15. Disclaimers

### 15.1. System Reliability
- Formulated "as is". Outages may occur.
- Total data persistence relies on database best-efforts minus acts of force majeure.

### 15.2. Iteration of Policy
- Adjustments are logged per updated revision timestamp.
- Continuation implies acceptance of these stipulations.

---

> **📌 Notice**: Accessing T-Nexus registers your formal agreement to navigate operations abiding by standard conditions detailed above.`;
