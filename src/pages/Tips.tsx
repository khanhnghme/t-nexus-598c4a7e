import { useRef, useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  BookOpen, LayoutDashboard, FolderKanban, ClipboardCheck, Calendar,
  MessageSquare, UserCircle, Lightbulb, Users, Shield, FolderArchive,
  Wrench, BarChart3, Share2, Video, Layers, FileUp, User, Crown, Lock,
  List, CheckCircle2, Info, ArrowRight
} from 'lucide-react';

const tip1 = '/tips/tip-1.jpg';
const tip2 = '/tips/tip-2.jpg';
const tip3 = '/tips/tip-3.jpg';
const tip4 = '/tips/tip-4.jpg';
const tip5 = '/tips/tip-5.jpg';
const tip6 = '/tips/tip-6.jpg';
const tip7 = '/tips/tip-7.jpg';
const tip8 = '/tips/tip-8.jpg';
const tip9 = '/tips/tip-9.jpg';
const tip10 = '/tips/tip-10.jpg';
const tip11 = '/tips/tip-11.jpg';
const tip12 = '/tips/tip-12.jpg';
const tip13 = '/tips/tip-13.jpg';
const tip14 = '/tips/tip-14.jpg';
const tip15 = '/tips/tip-15.jpg';
const tip16 = '/tips/tip-16.jpg';
const tip17 = '/tips/tip-17.jpg';
const tip18 = '/tips/tip-18.jpg';

interface ChapterItem {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  image: string;
  description: string;
  details: string;
  steps: string[];
  tips?: string[];
}

interface SectionData {
  id: string;
  label: string;
  roleLabel: string;
  roleIcon: React.ComponentType<{ className?: string }>;
  gradientClass: string;
  badgeClass: string;
  notice?: string;
  chapters: ChapterItem[];
}

const sections: SectionData[] = [
  {
    id: 'member',
    label: 'Phần I — Thành viên',
    roleLabel: 'Dành cho tất cả thành viên',
    roleIcon: User,
    gradientClass: 'from-primary/80 to-primary',
    badgeClass: 'bg-primary/15 text-primary',
    chapters: [
      {
        id: 'dashboard', title: 'Dashboard — Tổng quan', icon: LayoutDashboard, image: tip1,
        description: 'Trang chủ hiển thị toàn cảnh hoạt động của bạn trong hệ thống.',
        details: 'Dashboard là trang đầu tiên bạn thấy khi đăng nhập. Tại đây, bạn có cái nhìn tổng quan về tất cả dự án đang tham gia, số lượng task được phân công, tiến độ hoàn thành và các deadline sắp đến hạn. Mỗi dự án được hiển thị dưới dạng card với ảnh bìa, tên dự án, mã lớp và số thành viên. Phần thống kê nhanh giúp bạn nắm bắt tình hình công việc chỉ trong vài giây.',
        steps: [
          'Xem danh sách tất cả dự án đang tham gia — mỗi card hiển thị tên, mã lớp, số thành viên',
          'Kiểm tra thống kê task tổng hợp: tổng số task, đang thực hiện, đã hoàn thành',
          'Theo dõi cảnh báo deadline sắp đến hạn để không bỏ lỡ công việc quan trọng',
          'Bấm vào card dự án để truy cập nhanh vào chi tiết dự án đó',
        ],
        tips: ['Card dự án hiển thị trạng thái real-time — bạn luôn nắm được tiến độ mới nhất'],
      },
      {
        id: 'projects', title: 'Dự án — Danh sách & tham gia', icon: FolderKanban, image: tip2,
        description: 'Tạo dự án mới hoặc tham gia dự án bằng mã mời từ trưởng nhóm.',
        details: 'Trang Dự án cho phép bạn quản lý tất cả project. Bạn có thể tạo dự án mới (nếu có quyền) hoặc tham gia vào dự án đã có bằng cách nhập mã tham gia (Join Code) do trưởng nhóm cung cấp. Hệ thống hỗ trợ tìm kiếm dự án theo tên hoặc mã lớp, giúp bạn nhanh chóng tìm đúng dự án cần tham gia. Ngoài ra, bạn có thể ẩn các dự án cũ để dashboard gọn gàng hơn.',
        steps: [
          'Bấm nút "Tạo dự án" để khởi tạo project mới — đặt tên, mô tả, mã lớp',
          'Sử dụng mã tham gia (Join Code) để gia nhập dự án có sẵn',
          'Tìm kiếm dự án bằng thanh tìm kiếm theo tên hoặc mã lớp',
          'Ẩn dự án cũ khỏi dashboard để tập trung vào công việc hiện tại',
        ],
        tips: ['Mã tham gia (Join Code) do trưởng nhóm hoặc admin cung cấp — hỏi nhóm trưởng nếu chưa có'],
      },
      {
        id: 'kanban', title: 'Kanban Board — Quản lý task', icon: ClipboardCheck, image: tip3,
        description: 'Theo dõi tiến độ công việc trực quan với bảng Kanban kéo-thả.',
        details: 'Kanban Board là công cụ quản lý task trực quan nhất trong hệ thống. Các task được chia thành các cột trạng thái: "Cần làm", "Đang làm", "Đang review" và "Hoàn thành". Bạn có thể kéo thả task giữa các cột để cập nhật trạng thái nhanh chóng. Bấm vào task để mở chi tiết: mô tả, ghi chú, file đính kèm, lịch sử nộp bài. Chuyển sang chế độ List View để xem dạng bảng với nhiều thông tin hơn. Hệ thống cũng hỗ trợ bộ lọc theo giai đoạn, trạng thái và người được giao.',
        steps: [
          'Kéo thả task giữa các cột trạng thái để cập nhật tiến độ',
          'Bấm vào task để mở chi tiết: mô tả, deadline, ghi chú, file đính kèm',
          'Chuyển giữa Kanban View và List View bằng nút toggle phía trên',
          'Sử dụng bộ lọc giai đoạn, trạng thái hoặc người được giao để tìm task nhanh',
        ],
        tips: ['Kéo thả task rất nhanh — chỉ cần giữ chuột và kéo sang cột mong muốn'],
      },
      {
        id: 'submission', title: 'Nộp bài — Upload & theo dõi', icon: FileUp, image: tip4,
        description: 'Nộp file bài làm, theo dõi trạng thái duyệt và lịch sử nộp.',
        details: 'Chức năng nộp bài cho phép bạn upload file hoặc dán link bài làm cho từng task. Hệ thống hỗ trợ nhiều phương thức nộp: upload file trực tiếp (PDF, Word, ZIP...) hoặc dán link Google Drive, GitHub... Sau khi nộp, trưởng nhóm sẽ xem xét và duyệt bài. Bạn có thể theo dõi trạng thái nộp bài (chờ duyệt / đã duyệt / yêu cầu sửa) và xem toàn bộ lịch sử nộp. Nộp bài trước deadline để tránh bị trừ điểm trễ.',
        steps: [
          'Mở chi tiết task → bấm nút "Nộp bài" để bắt đầu',
          'Chọn phương thức: upload file trực tiếp hoặc dán link bài làm',
          'Thêm ghi chú mô tả ngắn về bài nộp (nếu cần) rồi xác nhận nộp',
          'Theo dõi trạng thái duyệt và xem lịch sử tất cả lần nộp',
        ],
        tips: ['Nộp bài trước deadline để đạt điểm tối đa — nộp trễ sẽ bị trừ điểm tự động!'],
      },
      {
        id: 'calendar', title: 'Lịch — Tổng hợp công việc', icon: Calendar, image: tip5,
        description: 'Xem toàn bộ deadline và sự kiện cá nhân trên lịch tháng/tuần/ngày.',
        details: 'Trang Lịch tổng hợp tất cả task deadline từ mọi dự án bạn tham gia, cùng với các sự kiện cá nhân bạn tự tạo. Hỗ trợ 3 chế độ xem: Tháng (nhìn tổng quan), Tuần (chi tiết theo từng ngày trong tuần) và Ngày (lịch trình chi tiết từng giờ). Bấm vào ô ngày để xem danh sách chi tiết task + sự kiện. Bấm vào pill task trên lịch để mở popup chi tiết và nộp bài ngay. Bạn cũng có thể tạo sự kiện cá nhân (lịch học, nhắc nhở...) trực tiếp trên lịch.',
        steps: [
          'Chuyển đổi giữa chế độ xem Tháng, Tuần, Ngày bằng tab phía trên',
          'Bấm vào ô ngày để xem danh sách chi tiết task và sự kiện',
          'Bấm vào pill task để mở popup — có thể nộp bài ngay tại lịch',
          'Tạo sự kiện cá nhân bằng cách bấm vào ô ngày trống',
        ],
        tips: ['Tạo sự kiện cá nhân (lịch học, nhắc nhở) để quản lý thời gian hiệu quả hơn'],
      },
      {
        id: 'communication', title: 'Trao đổi — Chat nhóm', icon: MessageSquare, image: tip6,
        description: 'Nhắn tin trực tiếp với thành viên, tag người, gửi file trong dự án.',
        details: 'Kênh trao đổi giúp các thành viên trong dự án chat trực tiếp mà không cần rời hệ thống. Chọn dự án muốn chat ở sidebar trái, sau đó gõ tin nhắn. Dùng @ để tag thành viên cụ thể — người được tag sẽ nhận thông báo. Bạn cũng có thể gửi file đính kèm, trả lời tin nhắn cũ (reply) và xem bình luận theo từng task cụ thể. Tất cả lịch sử chat được lưu lại để tham khảo sau.',
        steps: [
          'Chọn dự án muốn chat ở danh sách bên trái',
          'Gõ tin nhắn trong ô chat — dùng @tên để tag thành viên',
          'Gửi file đính kèm bằng nút paperclip trong ô chat',
          'Reply tin nhắn cũ bằng cách bấm nút trả lời trên tin nhắn',
        ],
      },
      {
        id: 'personal', title: 'Cá nhân — Thông tin tài khoản', icon: UserCircle, image: tip7,
        description: 'Cập nhật thông tin cá nhân, avatar và thiết lập profile công khai.',
        details: 'Trang Cá nhân cho phép bạn quản lý toàn bộ thông tin tài khoản: họ tên, MSSV, đơn vị đào tạo, chuyên ngành, năm khóa, số điện thoại. Bạn có thể upload avatar mới (tối đa 5MB) và thêm liên kết mạng xã hội (Facebook, GitHub, LinkedIn...). Thiết lập username để có profile công khai — người khác có thể xem profile của bạn qua link công khai. Ngoài ra, bạn có thể quản lý thành tích và chứng chỉ để showcase trên profile.',
        steps: [
          'Chỉnh sửa thông tin cơ bản: họ tên, MSSV, đơn vị đào tạo, chuyên ngành',
          'Upload avatar mới — hỗ trợ JPG, PNG, tối đa 5MB',
          'Thêm liên kết mạng xã hội: Facebook, GitHub, LinkedIn...',
          'Thiết lập username để kích hoạt trang profile công khai',
        ],
      },
      {
        id: 'feedback', title: 'Góp ý — Phản hồi hệ thống', icon: Lightbulb, image: tip8,
        description: 'Gửi ý kiến đóng góp, báo lỗi hoặc đề xuất tính năng mới.',
        details: 'Trang Góp ý là nơi bạn có thể gửi phản hồi trực tiếp cho admin hệ thống. Hỗ trợ nhiều loại góp ý: báo lỗi (bug), đề xuất tính năng mới, câu hỏi thắc mắc. Mỗi góp ý có trạng thái theo dõi (mới gửi / đang xử lý / đã phản hồi) để bạn biết admin đã đọc và phản hồi chưa. Bạn cũng có thể bình luận trên các góp ý khác và react bằng emoji.',
        steps: [
          'Bấm "Gửi góp ý" → chọn loại: báo lỗi, đề xuất tính năng hoặc câu hỏi',
          'Viết tiêu đề ngắn gọn và nội dung chi tiết mô tả vấn đề',
          'Gửi đi và theo dõi trạng thái phản hồi từ admin',
          'Bình luận hoặc react trên góp ý của thành viên khác',
        ],
      },
    ],
  },
  {
    id: 'advanced',
    label: 'Phần II — Nâng cao',
    roleLabel: 'Thành viên Nâng cao',
    roleIcon: Crown,
    gradientClass: 'from-amber-500 to-orange-500',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    notice: '⚡ Các chức năng nâng cao dành cho Thành viên NC (Trưởng nhóm). Bạn cần được phân quyền bởi Admin để sử dụng.',
    chapters: [
      {
        id: 'task-manage', title: 'Quản lý task nâng cao', icon: ClipboardCheck, image: tip9,
        description: 'Tạo, chỉnh sửa, phân công task và duyệt bài nộp từ thành viên.',
        details: 'Với vai trò Thành viên NC (Trưởng nhóm), bạn có toàn quyền quản lý task trong dự án. Tạo task mới với đầy đủ thông tin: tên, mô tả chi tiết, deadline, giai đoạn, phương thức nộp bài. Phân công task cho một hoặc nhiều thành viên cụ thể. Duyệt bài nộp từ thành viên: chấp nhận, yêu cầu sửa lại hoặc chấm điểm. Bạn cũng có thể chỉnh sửa, ẩn hoặc xóa task đã tạo.',
        steps: [
          'Tạo task mới: nhập tên, mô tả, chọn deadline và giai đoạn',
          'Phân công task cho thành viên — chọn 1 hoặc nhiều người',
          'Duyệt bài nộp: xem file, chấp nhận hoặc yêu cầu chỉnh sửa',
          'Chỉnh sửa task đã tạo: cập nhật mô tả, gia hạn deadline',
        ],
      },
      {
        id: 'stages', title: 'Giai đoạn dự án (Stages)', icon: Layers, image: tip10,
        description: 'Chia dự án thành các giai đoạn với mốc thời gian rõ ràng.',
        details: 'Giai đoạn (Stage) giúp bạn tổ chức dự án theo timeline rõ ràng. Mỗi giai đoạn có tên, mô tả, ngày bắt đầu và kết thúc. Bạn có thể tạo nhiều giai đoạn (ví dụ: Nghiên cứu → Thiết kế → Triển khai → Báo cáo) và gán task vào từng giai đoạn. Giai đoạn cũng ảnh hưởng đến cách tính điểm quá trình — mỗi giai đoạn có trọng số riêng.',
        steps: [
          'Vào phần quản lý dự án → tab "Giai đoạn" để tạo stage mới',
          'Đặt tên, mô tả, ngày bắt đầu và kết thúc cho giai đoạn',
          'Sắp xếp thứ tự giai đoạn bằng cách kéo thả',
          'Gán task vào giai đoạn phù hợp khi tạo hoặc chỉnh sửa task',
        ],
      },
      {
        id: 'resources', title: 'Tài nguyên dự án', icon: FolderKanban, image: tip11,
        description: 'Upload tài liệu, file tham khảo và tổ chức theo thư mục.',
        details: 'Kho tài nguyên dự án cho phép upload và quản lý tất cả tài liệu liên quan: file PDF, Word, PowerPoint, ảnh, code... Bạn có thể tạo thư mục để phân loại tài liệu (ví dụ: "Tài liệu tham khảo", "Biên bản họp", "Bài nộp cuối kỳ"). Hỗ trợ thêm link tham khảo (Google Drive, GitHub, website) bên cạnh file upload. Tất cả thành viên trong dự án đều có thể truy cập kho tài nguyên này.',
        steps: [
          'Bấm "Upload tài liệu" để đăng file (PDF, Word, ảnh, ZIP...)',
          'Tạo thư mục để phân loại tài liệu theo chủ đề',
          'Thêm link tham khảo: Google Drive, GitHub, website...',
          'Tải về hoặc xem trước file trực tiếp trong hệ thống',
        ],
      },
      {
        id: 'meetings', title: 'Cuộc họp nhóm', icon: Video, image: tip12,
        description: 'Tạo và tham gia cuộc họp trực tuyến ngay trong hệ thống.',
        details: 'Chức năng cuộc họp cho phép bạn tạo và quản lý họp nhóm trực tuyến. Mỗi cuộc họp có tiêu đề, thời gian, thời lượng dự kiến và phòng họp video tích hợp (Jitsi Meet). Bạn có thể ghi chú nội dung họp, điểm danh thành viên tham gia, và gắn cuộc họp với task cụ thể. Cuộc họp cũng hiển thị trên Lịch để mọi người theo dõi.',
        steps: [
          'Tạo cuộc họp mới: đặt tiêu đề, chọn thời gian và thời lượng',
          'Chia sẻ link phòng họp Jitsi Meet cho thành viên',
          'Ghi chú nội dung buổi họp trong phần Notes',
          'Điểm danh thành viên tham gia và theo dõi lịch sử họp',
        ],
      },
      {
        id: 'scores', title: 'Bảng điểm quá trình', icon: BarChart3, image: tip13,
        description: 'Hệ thống tự động tính điểm dựa trên task, deadline và trọng số.',
        details: 'Bảng điểm quá trình tự động tính toán dựa trên nhiều yếu tố: số task hoàn thành, chất lượng bài nộp, nộp đúng hạn hay trễ, bonus nộp sớm. Điểm được tính theo trọng số từng giai đoạn — giai đoạn quan trọng hơn sẽ có trọng số cao hơn. Trưởng nhóm có thể điều chỉnh điểm và ghi lý do. Thành viên có quyền gửi khiếu nại điểm trong thời hạn quy định.',
        steps: [
          'Xem bảng điểm trong phần chi tiết dự án → tab "Điểm"',
          'Điểm tự động tính: base score + bonus - penalty',
          'Xem chi tiết từng task: điểm cơ bản, trễ hạn, bonus nộp sớm',
          'Gửi khiếu nại điểm nếu thấy không hợp lý (trong thời hạn)',
        ],
      },
      {
        id: 'sharing', title: 'Chia sẻ dự án', icon: Share2, image: tip14,
        description: 'Tạo link công khai để giảng viên hoặc bên ngoài theo dõi dự án.',
        details: 'Chức năng chia sẻ cho phép bạn tạo link công khai để người bên ngoài (giảng viên, khách mời) xem dự án mà không cần đăng nhập. Bạn chọn nội dung nào được hiển thị công khai: danh sách task, thành viên, tài nguyên, bảng điểm, nhật ký hoạt động. Mỗi dự án có thể có slug riêng tạo URL đẹp. Link chia sẻ phù hợp để gửi cho giảng viên báo cáo tiến độ.',
        steps: [
          'Vào cài đặt dự án → phần "Chia sẻ công khai"',
          'Bật chế độ chia sẻ và chọn nội dung muốn hiển thị',
          'Tùy chỉnh slug URL cho dự án (tùy chọn)',
          'Copy link chia sẻ và gửi cho giảng viên hoặc bên liên quan',
        ],
      },
    ],
  },
  {
    id: 'admin',
    label: 'Phần III — Admin',
    roleLabel: 'OwnerSystem',
    roleIcon: Lock,
    gradientClass: 'from-destructive/80 to-destructive',
    badgeClass: 'bg-destructive/15 text-destructive',
    notice: '🔒 Chức năng quản trị chỉ dành cho Admin. Thành viên thường không có quyền truy cập.',
    chapters: [
      {
        id: 'user-management', title: 'Quản lý thành viên', icon: Users, image: tip15,
        description: 'Quản lý toàn bộ người dùng: phê duyệt, phân quyền, khóa tài khoản.',
        details: 'Admin có quyền quản lý toàn bộ user trong hệ thống. Phê duyệt tài khoản mới đăng ký trước khi họ có thể đăng nhập. Phân vai trò cho user: Member (thành viên thường), Thành viên NC (trưởng nhóm, có quyền quản lý task), Admin (quản trị viên). Có thể tạm khóa (suspend) tài khoản vi phạm với lý do cụ thể và thời hạn, hoặc xóa tài khoản vĩnh viễn. Hỗ trợ tìm kiếm user theo tên, MSSV, email.',
        steps: [
          'Xem danh sách tất cả thành viên — tìm kiếm theo tên, MSSV hoặc email',
          'Phê duyệt tài khoản mới đăng ký để cho phép đăng nhập',
          'Phân vai trò: Member → Thành viên NC → Admin',
          'Tạm khóa hoặc xóa tài khoản vi phạm kèm lý do',
        ],
      },
      {
        id: 'system-admin', title: 'Quản trị hệ thống', icon: Shield, image: tip16,
        description: 'Cài đặt toàn cục: bảo trì, chính sách, thông báo hệ thống.',
        details: 'Trang quản trị hệ thống cho phép admin cấu hình toàn bộ thiết lập. Bật/tắt chế độ bảo trì (Maintenance Mode) khi cần nâng cấp hệ thống — lúc này user thường sẽ thấy thông báo bảo trì. Cấu hình chính sách: giới hạn dung lượng file upload cho user, số dự án tối đa mỗi người. Gửi thông báo hệ thống (mandatory notification) đến toàn bộ hoặc một nhóm user cụ thể. Xem log lỗi hệ thống để debug.',
        steps: [
          'Bật/tắt chế độ bảo trì (Maintenance Mode) khi cần nâng cấp',
          'Cấu hình chính sách: giới hạn dung lượng, số dự án tối đa mỗi user',
          'Gửi thông báo hệ thống đến toàn bộ hoặc nhóm user cụ thể',
          'Theo dõi log lỗi hệ thống để phát hiện và xử lý sự cố',
        ],
      },
      {
        id: 'backup', title: 'Sao lưu dữ liệu', icon: FolderArchive, image: tip17,
        description: 'Backup và restore dữ liệu dự án, đảm bảo an toàn thông tin.',
        details: 'Chức năng sao lưu giúp admin bảo vệ dữ liệu dự án. Xuất toàn bộ dữ liệu của một dự án ra file JSON (bao gồm task, giai đoạn, thành viên, bài nộp, điểm...). Khi cần, có thể khôi phục (restore) dữ liệu từ bản sao lưu trước đó. Hệ thống cũng hỗ trợ di chuyển dữ liệu giữa các dự án (data migration) để tái sử dụng cấu trúc.',
        steps: [
          'Chọn dự án cần sao lưu từ danh sách',
          'Bấm "Xuất dữ liệu" để download file JSON backup',
          'Khôi phục dữ liệu bằng cách upload file backup và xác nhận',
          'Sử dụng Data Migration để copy cấu trúc giữa các dự án',
        ],
      },
      {
        id: 'utilities', title: 'Tiện ích Admin', icon: Wrench, image: tip18,
        description: 'Công cụ hỗ trợ: chỉnh profile hàng loạt, quản lý thành tích.',
        details: 'Các tiện ích admin bao gồm nhiều công cụ hỗ trợ quản lý. Chỉnh sửa thông tin profile của bất kỳ user nào (khi user yêu cầu hỗ trợ). Quản lý thành tích và chứng chỉ cho user: thêm, sửa, xóa các mục thành tích hiển thị trên profile công khai. Đặt lại mật khẩu cho user khi họ quên. Các công cụ hệ thống khác giúp admin vận hành nền tảng suôn sẻ.',
        steps: [
          'Chỉnh sửa thông tin profile của user khi cần hỗ trợ',
          'Quản lý thành tích và chứng chỉ cho user',
          'Đặt lại mật khẩu cho user quên mật khẩu',
          'Truy cập các công cụ hệ thống hỗ trợ vận hành',
        ],
      },
    ],
  },
];

const allChapterIds = sections.flatMap(s => s.chapters.map(c => c.id));

function TOCContent({ activeId, onSelect }: { activeId: string; onSelect?: () => void }) {
  return (
    <nav className="space-y-5">
      {sections.map((section, sIdx) => {
        const SIcon = section.roleIcon;
        return (
          <div key={section.id}>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5 px-1">
              <SIcon className="w-3.5 h-3.5" />
              {section.label}
            </p>
            <ul className="space-y-0.5 ml-1 border-l-2 border-border pl-3">
              {section.chapters.map((ch, cIdx) => {
                const isActive = activeId === ch.id;
                const globalIdx = sections.slice(0, sIdx).reduce((a, s) => a + s.chapters.length, 0) + cIdx + 1;
                return (
                  <li key={ch.id}>
                    <button
                      onClick={() => {
                        document.getElementById(`chapter-${ch.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        onSelect?.();
                      }}
                      className={`w-full text-left text-[13px] py-2 px-3 rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      }`}
                    >
                      <span className={`mr-1.5 text-xs ${isActive ? 'text-primary-foreground/70' : 'opacity-50'}`}>{globalIdx}.</span>
                      {ch.title.split('—')[0].trim()}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export default function Tips() {
  const [activeId, setActiveId] = useState(allChapterIds[0]);
  const [tocOpen, setTocOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const handleIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    const visible = entries.filter(e => e.isIntersecting);
    if (visible.length > 0) {
      const id = visible[0].target.id.replace('chapter-', '');
      setActiveId(id);
    }
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: '-80px 0px -60% 0px',
      threshold: 0.1,
    });
    allChapterIds.forEach(id => {
      const el = document.getElementById(`chapter-${id}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [handleIntersect]);

  let globalIdx = 0;

  return (
    <>
      <div className="flex gap-0 relative">
        {/* Fixed TOC sidebar — desktop */}
        {!isMobile && (
          <div className="hidden lg:block w-56 xl:w-64 shrink-0">
            <aside className="fixed top-[84px] w-56 xl:w-64 h-[calc(100vh-84px)] overflow-y-auto pr-3 py-4 border-r border-border bg-background z-10">
              <div className="flex items-center gap-2 mb-4 px-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <span className="font-bold text-sm text-foreground">Mục lục</span>
              </div>
              <TOCContent activeId={activeId} />
            </aside>
          </div>
        )}

        {/* Mobile TOC button */}
        {isMobile && (
          <Sheet open={tocOpen} onOpenChange={setTocOpen}>
            <SheetTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="fixed bottom-20 right-4 z-40 rounded-full shadow-lg w-12 h-12 bg-primary text-primary-foreground border-0 hover:bg-primary/90"
              >
                <List className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4 overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Mục lục
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <TOCContent activeId={activeId} onSelect={() => setTocOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Main content */}
        <div ref={contentRef} className="flex-1 min-w-0 py-4 lg:pl-8">
          {/* Page header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Hướng dẫn sử dụng T-Nexus</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Tài liệu chi tiết từng chức năng — 18 chương · 3 phần</p>
            </div>
          </div>

          {/* Sections */}
          {sections.map((section) => {
            const SIcon = section.roleIcon;
            return (
              <div key={section.id} className="mb-12">
                {/* Section header */}
                <div className={`rounded-2xl bg-gradient-to-r ${section.gradientClass} px-6 py-5 mb-6 shadow-sm`}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <SIcon className="w-5 h-5 text-white" />
                      </div>
                      <h2 className="text-xl font-bold text-white">{section.label}</h2>
                    </div>
                    <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-xs px-3 py-1">
                      {section.roleLabel}
                    </Badge>
                  </div>
                </div>

                {section.notice && (
                  <div className={`rounded-xl px-4 py-3 mb-6 text-sm flex items-start gap-2.5 ${
                    section.id === 'advanced'
                      ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                      : 'bg-destructive/5 border border-destructive/20 text-destructive dark:text-red-400'
                  }`}>
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{section.notice}</span>
                  </div>
                )}

                {/* Chapters */}
                {section.chapters.map((chapter) => {
                  globalIdx++;
                  const CIcon = chapter.icon;
                  return (
                    <article
                      key={chapter.id}
                      id={`chapter-${chapter.id}`}
                      className="mb-10 scroll-mt-20"
                    >
                      {/* Chapter card */}
                      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                        {/* Chapter header bar */}
                        <div className={`bg-gradient-to-r ${section.gradientClass} px-5 py-3 flex items-center gap-3`}>
                          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                            <CIcon className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-white/70 font-medium">Chương {globalIdx}</span>
                            <h3 className="text-base font-bold text-white leading-tight truncate">{chapter.title}</h3>
                          </div>
                        </div>

                        {/* AI illustration */}
                        <div className="bg-muted/30 flex items-center justify-center p-4 border-b border-border">
                          <img
                            src={chapter.image}
                            alt={chapter.title}
                            className="max-h-44 w-auto object-contain rounded-lg"
                            loading="lazy"
                          />
                        </div>

                        {/* Content */}
                        <div className="px-5 py-5 space-y-4">
                          {/* Short description */}
                          <p className="text-sm font-medium text-foreground">{chapter.description}</p>

                          {/* Detailed description */}
                          <div className="bg-muted/40 rounded-xl px-4 py-3 border border-border/50">
                            <p className="text-sm text-muted-foreground leading-relaxed">{chapter.details}</p>
                          </div>

                          {/* Steps */}
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              <ArrowRight className="w-3.5 h-3.5" />
                              Hướng dẫn từng bước
                            </p>
                            <div className="space-y-2.5">
                              {chapter.steps.map((step, i) => (
                                <div key={i} className="flex items-start gap-3 group">
                                  <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/20 transition-colors">
                                    {i + 1}
                                  </span>
                                  <span className="text-sm text-foreground/85 leading-relaxed pt-0.5">{step}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Tips */}
                          {chapter.tips && chapter.tips.length > 0 && (
                            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
                              {chapter.tips.map((t, i) => (
                                <p key={i} className="text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
                                  <Lightbulb className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                                  <span>{t}</span>
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            );
          })}

          {/* Footer */}
          <div className="text-center py-10">
            <div className="inline-flex items-center gap-2 bg-primary/5 text-primary rounded-full px-6 py-3">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">Hết hướng dẫn — Chúc bạn sử dụng hệ thống hiệu quả!</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
