import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_MESSAGE_WORDS = 100;

interface TaskData {
  id: string;
  short_id: string;
  title: string;
  description: string | null;
  status: string;
  deadline: string | null;
  deadlineFormatted: string | null;
  stageName: string | null;
  assignees: string[];
  createdByName: string;
  createdAt: string | null;
  submissionLink: string | null;
  submissionMethod: string;
  isOverdue: boolean;
  daysUntilDeadline: number | null;
}

interface ResourceData {
  name: string;
  type: string;
  category: string | null;
  description: string | null;
  linkUrl: string | null;
  folderName: string | null;
}

interface MeetingData {
  title: string;
  description: string | null;
  scheduledAt: string;
  scheduledAtFormatted: string;
  durationMinutes: number;
  status: string;
  createdByName: string;
  externalLink: string | null;
  taskTitle: string | null;
  attendeeCount: number;
  isUpcoming: boolean;
  isPast: boolean;
}

interface ScoreData {
  taskTitle: string;
  stageName: string | null;
  baseScore: number;
  latePenalty: number;
  reviewPenalty: number;
  earlyBonus: boolean;
  bugHunterBonus: boolean;
  adjustment: number | null;
  adjustmentReason: string | null;
  finalScore: number | null;
}

interface StageScoreData {
  stageName: string;
  averageScore: number | null;
  lateTaskCount: number;
  earlySubmissionBonus: boolean;
  bugHunterBonus: boolean;
  kCoefficient: number | null;
  adjustedScore: number | null;
  finalStageScore: number | null;
}

interface FinalScoreData {
  weightedAverage: number | null;
  adjustment: number | null;
  finalScore: number | null;
}

interface ProjectContext {
  project: {
    id: string;
    name: string;
    description: string | null;
    classCode: string | null;
    instructorName: string | null;
    instructorEmail: string | null;
    zaloLink: string | null;
    additionalInfo: string | null;
  };
  stages: Array<{
    id: string;
    name: string;
    taskCount: number;
    startDate: string | null;
    endDate: string | null;
  }>;
  members: Array<{
    id: string;
    name: string;
    role: string;
    studentId: string;
    email: string;
    major: string | null;
    skills: string | null;
  }>;
  tasks: TaskData[];
  resources: ResourceData[];
  meetings: MeetingData[];
  currentUser: {
    name: string;
    role: string;
    assignedTasks: string[];
    taskScores: ScoreData[];
    stageScores: StageScoreData[];
    finalScore: FinalScoreData | null;
  };
}

function buildUserScoresSection(currentUser: ProjectContext['currentUser']): string {
  const lines: string[] = [];

  if (currentUser.taskScores.length === 0 && currentUser.stageScores.length === 0 && !currentUser.finalScore) {
    return '(Chưa có dữ liệu điểm)';
  }

  if (currentUser.taskScores.length > 0) {
    lines.push('  [Điểm theo công việc]');
    for (const s of currentUser.taskScores) {
      const bonuses: string[] = [];
      if (s.earlyBonus) bonuses.push('Nộp sớm');
      if (s.bugHunterBonus) bonuses.push('Bug Hunter');
      const bonusStr = bonuses.length > 0 ? ` | Bonus: ${bonuses.join(', ')}` : '';
      const penaltyStr = (s.latePenalty > 0 || s.reviewPenalty > 0)
        ? ` | Trừ: ${s.latePenalty > 0 ? `trễ -${s.latePenalty}` : ''}${s.reviewPenalty > 0 ? ` review -${s.reviewPenalty}` : ''}`
        : '';
      const adjStr = s.adjustment ? ` | Điều chỉnh: ${s.adjustment > 0 ? '+' : ''}${s.adjustment}${s.adjustmentReason ? ` (${s.adjustmentReason})` : ''}` : '';
      const stage = s.stageName ? ` [${s.stageName}]` : '';
      lines.push(`    - "${s.taskTitle}"${stage}: Điểm gốc ${s.baseScore}${penaltyStr}${bonusStr}${adjStr} → Điểm cuối: ${s.finalScore ?? 'Chưa tính'}`);
    }
  }

  if (currentUser.stageScores.length > 0) {
    lines.push('  [Điểm theo giai đoạn]');
    for (const s of currentUser.stageScores) {
      const bonuses: string[] = [];
      if (s.earlySubmissionBonus) bonuses.push('Nộp sớm');
      if (s.bugHunterBonus) bonuses.push('Bug Hunter');
      const bonusStr = bonuses.length > 0 ? ` | Bonus: ${bonuses.join(', ')}` : '';
      const kStr = s.kCoefficient !== null && s.kCoefficient !== 1 ? ` | Hệ số K: ${s.kCoefficient}` : '';
      lines.push(`    - "${s.stageName}": TB ${s.averageScore ?? '?'}${bonusStr}${kStr} → Điểm giai đoạn: ${s.finalStageScore ?? 'Chưa tính'}`);
      if (s.lateTaskCount > 0) lines.push(`      ⚠️ ${s.lateTaskCount} task nộp trễ`);
    }
  }

  if (currentUser.finalScore) {
    const adj = currentUser.finalScore.adjustment
      ? ` | Điều chỉnh: ${currentUser.finalScore.adjustment > 0 ? '+' : ''}${currentUser.finalScore.adjustment}`
      : '';
    lines.push(`  [Điểm tổng kết]`);
    lines.push(`    TB có trọng số: ${currentUser.finalScore.weightedAverage ?? '?'}${adj} → Điểm cuối: ${currentUser.finalScore.finalScore ?? 'Chưa tính'}`);
  }

  return lines.join('\n');
}

function getStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    'TODO': 'Chờ thực hiện',
    'IN_PROGRESS': 'Đang thực hiện',
    'DONE': 'Hoàn thành',
    'VERIFIED': 'Đã duyệt'
  };
  return statusMap[status] || status;
}

function getMeetingStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    'scheduled': 'Đã lên lịch',
    'in_progress': 'Đang diễn ra',
    'completed': 'Đã kết thúc',
    'cancelled': 'Đã hủy'
  };
  return statusMap[status] || status;
}

function buildProjectContext(context: ProjectContext): string {
  const tasksByStatus = {
    waiting: context.tasks.filter(t => t.status === 'TODO'),
    inProgress: context.tasks.filter(t => t.status === 'IN_PROGRESS'),
    done: context.tasks.filter(t => t.status === 'DONE'),
    verified: context.tasks.filter(t => t.status === 'VERIFIED'),
  };
  
  const overdueTasks = context.tasks.filter(t => t.isOverdue);
  const upcomingTasks = context.tasks.filter(t => 
    t.daysUntilDeadline !== null && 
    t.daysUntilDeadline >= 0 && 
    t.daysUntilDeadline <= 3 &&
    !t.isOverdue
  );
  
  const submissionMethodLabel = (m: string) => {
    const map: Record<string, string> = { 'both': 'File và Link', 'file_only': 'Chỉ File', 'link_only': 'Chỉ Link' };
    return map[m] || m;
  };

  const taskListFormatted = context.tasks.map((t, index) => {
    const deadlineInfo = t.deadlineFormatted 
      ? (t.isOverdue 
          ? `⚠️ Quá hạn (${t.deadlineFormatted})` 
          : (t.daysUntilDeadline !== null && t.daysUntilDeadline <= 3 
              ? `⏰ Còn ${t.daysUntilDeadline} ngày (${t.deadlineFormatted})` 
              : `${t.deadlineFormatted}`))
      : 'Không có deadline';
    
    const descLine = t.description 
      ? `\n     - Mô tả: ${t.description.length > 200 ? t.description.substring(0, 200) + '...' : t.description}` 
      : '';
    const submissionLine = t.submissionLink ? `\n     - Link nộp bài: ${t.submissionLink}` : '';
    const methodLine = `\n     - Phương thức nộp: ${submissionMethodLabel(t.submissionMethod)}`;
    const creatorLine = `\n     - Người tạo: ${t.createdByName}`;

    return `  ${index + 1}. "${t.title}"${descLine}
     - Trạng thái: ${getStatusLabel(t.status)}
     - Giai đoạn: ${t.stageName || 'Chưa phân giai đoạn'}
     - Deadline: ${deadlineInfo}
     - Người thực hiện: ${t.assignees.length > 0 ? t.assignees.join(', ') : 'Chưa phân công'}${creatorLine}${submissionLine}${methodLine}`;
  }).join('\n');

  // Build resources section
  const resourcesByCategory = new Map<string, ResourceData[]>();
  for (const r of context.resources) {
    const cat = r.category || 'general';
    if (!resourcesByCategory.has(cat)) resourcesByCategory.set(cat, []);
    resourcesByCategory.get(cat)!.push(r);
  }

  const categoryLabels: Record<string, string> = {
    'general': 'Chung', 'document': 'Tài liệu', 'reference': 'Tham khảo',
    'template': 'Mẫu', 'media': 'Đa phương tiện', 'other': 'Khác'
  };

  let resourcesFormatted = '';
  if (context.resources.length > 0) {
    const lines: string[] = [];
    for (const [cat, items] of resourcesByCategory) {
      lines.push(`  [${categoryLabels[cat] || cat}]`);
      for (const r of items) {
        const typeLabel = r.type === 'link' ? '🔗 Link' : '📄 File';
        const folder = r.folderName ? ` (Thư mục: ${r.folderName})` : '';
        const desc = r.description ? ` - ${r.description}` : '';
        lines.push(`    - ${typeLabel}: "${r.name}"${desc}${folder}`);
      }
    }
    resourcesFormatted = lines.join('\n');
  }

  // Build meetings section
  const upcomingMeetings = context.meetings.filter(m => m.isUpcoming);
  const pastMeetings = context.meetings.filter(m => m.isPast);

  let meetingsFormatted = '';
  if (context.meetings.length > 0) {
    const lines: string[] = [];
    
    if (upcomingMeetings.length > 0) {
      lines.push('  [Sắp diễn ra]');
      for (const m of upcomingMeetings) {
        const taskInfo = m.taskTitle ? ` (Liên kết task: "${m.taskTitle}")` : '';
        const linkInfo = m.externalLink ? ` | Link: ${m.externalLink}` : '';
        lines.push(`    - 📅 "${m.title}" — ${m.scheduledAtFormatted} (${m.durationMinutes} phút)`);
        lines.push(`      Trạng thái: ${getMeetingStatusLabel(m.status)} | Tạo bởi: ${m.createdByName}${taskInfo}${linkInfo}`);
      }
    }

    if (pastMeetings.length > 0) {
      lines.push('  [Đã qua]');
      for (const m of pastMeetings.slice(0, 5)) { // Only show last 5 past meetings
        const taskInfo = m.taskTitle ? ` (Task: "${m.taskTitle}")` : '';
        lines.push(`    - "${m.title}" — ${m.scheduledAtFormatted} (${m.durationMinutes} phút) — ${getMeetingStatusLabel(m.status)}${taskInfo}`);
      }
      if (pastMeetings.length > 5) {
        lines.push(`    ... và ${pastMeetings.length - 5} buổi họp khác`);
      }
    }

    meetingsFormatted = lines.join('\n');
  }

  const extraInfo = [
    context.project.instructorEmail ? `Email GV: ${context.project.instructorEmail}` : '',
    context.project.zaloLink ? `Link Zalo: ${context.project.zaloLink}` : '',
    context.project.additionalInfo ? `Thông tin thêm: ${context.project.additionalInfo}` : '',
  ].filter(Boolean).join('\n');

  return `
=== DỰ ÁN: ${context.project.name} ===
Mô tả: ${context.project.description || 'Không có mô tả'}
Mã lớp: ${context.project.classCode || 'Không có'}
Giảng viên: ${context.project.instructorName || 'Không có'}
${extraInfo}

--- GIAI ĐOẠN ---
${context.stages.map((s, i) => {
  const dateRange = s.startDate || s.endDate 
    ? ` (${s.startDate ? new Date(s.startDate).toLocaleDateString('vi-VN') : '?'} → ${s.endDate ? new Date(s.endDate).toLocaleDateString('vi-VN') : '?'})` 
    : '';
  return `${i + 1}. "${s.name}" - ${s.taskCount} công việc${dateRange}`;
}).join('\n')}

--- THÀNH VIÊN (${context.members.length} người) ---
${context.members.map((m, i) => {
  const role = (m.role === 'project_owner' || m.role === 'project_admin') ? 'Trưởng nhóm' : 'Thành viên';
  const details = [m.studentId ? `MSSV: ${m.studentId}` : '', m.major ? `Ngành: ${m.major}` : ''].filter(Boolean).join(' | ');
  return `${i + 1}. ${m.name} - ${role}${details ? ` (${details})` : ''}`;
}).join('\n')}

--- TỔNG QUAN CÔNG VIỆC ---
Tổng: ${context.tasks.length} công việc
- Chờ thực hiện: ${tasksByStatus.waiting.length}
- Đang thực hiện: ${tasksByStatus.inProgress.length}
- Hoàn thành: ${tasksByStatus.done.length}
- Đã duyệt: ${tasksByStatus.verified.length}

--- DANH SÁCH CÔNG VIỆC ---
${taskListFormatted || '(Chưa có công việc nào)'}

--- CUỘC HỌP NHÓM (${context.meetings.length} buổi, ${upcomingMeetings.length} sắp tới) ---
${meetingsFormatted || '(Chưa có cuộc họp nào)'}

--- TÀI NGUYÊN DỰ ÁN (${context.resources.length} mục) ---
${resourcesFormatted || '(Chưa có tài nguyên nào)'}

--- LƯU Ý ---
${overdueTasks.length > 0 
  ? `🚨 ${overdueTasks.length} công việc quá hạn:\n${overdueTasks.map(t => `   - "${t.title}"`).join('\n')}` 
  : '✅ Không có công việc quá hạn'}
${upcomingTasks.length > 0 
  ? `\n⏰ ${upcomingTasks.length} công việc sắp đến hạn (trong 3 ngày):\n${upcomingTasks.map(t => `   - "${t.title}" - còn ${t.daysUntilDeadline} ngày`).join('\n')}` 
  : ''}
${upcomingMeetings.length > 0 
  ? `\n📅 ${upcomingMeetings.length} cuộc họp sắp tới:\n${upcomingMeetings.map(m => `   - "${m.title}" — ${m.scheduledAtFormatted}`).join('\n')}` 
  : ''}

--- THÔNG TIN CỦA BẠN ---
Tên: ${context.currentUser.name}
Vai trò: ${(context.currentUser.role === 'project_owner' || context.currentUser.role === 'project_admin') ? 'Trưởng nhóm' : 'Thành viên'}
Công việc được giao: ${context.currentUser.assignedTasks.length > 0 ? '\n' + context.currentUser.assignedTasks.join('\n') : 'Chưa có'}

--- ĐIỂM QUÁ TRÌNH CỦA BẠN (CHỈ RIÊNG BẠN) ---
${buildUserScoresSection(context.currentUser)}
`;
}

const SYSTEM_KNOWLEDGE_BASE = `
## KIẾN THỨC VỀ HỆ THỐNG T-NEXUS

### Các trang chính
1. **Dashboard** — Trang chủ hiển thị tất cả dự án đã tham gia, thông báo, lời mời dự án, trạng thái chờ duyệt
2. **Dự án (Projects)** — Quản lý dự án nhóm: tạo/sửa/xóa project, quản lý giai đoạn, thành viên, tài nguyên
3. **Lịch (Calendar)** — Xem tổng hợp deadline và sự kiện từ tất cả dự án trên lịch tháng/tuần/ngày, tạo sự kiện cá nhân, nộp bài trực tiếp từ lịch
4. **Trao đổi (Communication)** — Chat nhóm theo dự án, bình luận trên task, tag thành viên (@mention)
5. **Phản hồi (Feedback)** — Gửi phản hồi/báo lỗi cho admin, theo dõi trạng thái xử lý, bình luận trao đổi
6. **Thông tin cá nhân (Personal Info)** — Chỉnh sửa hồ sơ, avatar, bio, liên kết mạng xã hội, kỹ năng
7. **Tiện ích (Utilities)** — Thành tựu cá nhân, profile công khai, dark mode

### Chức năng quản lý dự án
- **Kanban Board**: kéo thả task giữa các cột trạng thái (Chờ thực hiện → Đang thực hiện → Hoàn thành → Đã duyệt)
- **List View**: xem danh sách task có bộ lọc theo trạng thái, giai đoạn, người thực hiện
- **Giai đoạn (Stages)**: chia dự án thành nhiều giai đoạn, mỗi giai đoạn có thời gian bắt đầu/kết thúc
- **Tài nguyên (Resources)**: upload file, thêm link, tổ chức theo thư mục và danh mục
- **Cuộc họp (Meetings)**: tạo lịch họp, điểm danh, chat trong phòng họp, liên kết với task
- **Chấm điểm quá trình**: leader chấm điểm từng task, hệ thống tính trung bình giai đoạn và tổng kết có trọng số
- **Xuất PDF**: xuất activity log và bằng chứng làm việc dưới dạng PDF
- **Chia sẻ công khai**: bật chế độ public để người ngoài xem thông tin dự án qua link

### Tham gia dự án
- **Mã tham gia**: nhập mã 4 số để join project (có thể yêu cầu duyệt)
- **Lời mời**: leader gửi lời mời, người dùng xem và phản hồi từ Dashboard
- **Giới hạn thành viên**: leader thiết lập số lượng tối đa

### Tính năng đặc biệt
- **Dark mode**: hỗ trợ giao diện tối
- **Profile công khai**: trang cá nhân có thể chia sẻ, hiển thị thành tựu
- **Thông báo**: chuông thông báo realtime cho task, deadline, lời mời
- **Trợ lý AI (Bé Củ Cải)**: hỗ trợ tra cứu thông tin nhanh về dự án và hệ thống

### Admin (Quản trị viên)
- Quản lý tài khoản: duyệt/khóa/xóa người dùng, đặt lại mật khẩu
- Backup & restore dữ liệu
- Cài đặt hệ thống: chế độ bảo trì, tự động duyệt tài khoản, chính sách hệ thống
- Thông báo hệ thống: gửi thông báo bắt buộc đọc cho toàn bộ hoặc nhóm người dùng
`;

function buildSystemPrompt(userName: string, projectContexts: string[], isProjectSpecific: boolean, projectName?: string, systemPolicy?: string | null, userExtraContext?: string): string {
  const now = new Date();
  const dateTimeStr = now.toLocaleString('vi-VN', { 
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const policySection = systemPolicy 
    ? `\n## QUY ĐỊNH HỆ THỐNG\nDưới đây là nội dung quy định/chính sách hệ thống mà admin đã thiết lập:\n\n${systemPolicy}\n`
    : '';

  const contextInstructions = isProjectSpecific
    ? `## PHẠM VI TRẢ LỜI
⚠️ Người dùng đang ở trong dự án: "${projectName}"

NGUYÊN TẮC:
1. CHỈ trả lời về dự án "${projectName}" - KHÔNG đề cập dự án khác
2. Nếu câu hỏi không liên quan, nói: "Câu hỏi này không liên quan đến dự án hiện tại"
3. Nếu không tìm thấy thông tin, nói: "Không tìm thấy thông tin này"`
    : `## PHẠM VI TRẢ LỜI
Người dùng đang ở ngoài phạm vi dự án cụ thể.
- Có thể trả lời tổng quan về tất cả các dự án
- Khi đề cập đến công việc, PHẢI nói rõ thuộc dự án nào`;

  return `Bạn là "Bé Củ Cải" — trợ lý AI thân thiện của hệ thống T-Nexus.

## THÔNG TIN
- Người dùng: ${userName}
- Thời gian: ${dateTimeStr}

${SYSTEM_KNOWLEDGE_BASE}

${contextInstructions}

${policySection}
${projectContexts.length > 0 ? `## DỮ LIỆU
${projectContexts.join('\n---\n')}` : '## Người dùng chưa tham gia dự án nào.'}

${userExtraContext || ''}

## QUY TẮC BẮT BUỘC - CỰC KỲ QUAN TRỌNG

### BẢO VỆ QUYỀN RIÊNG TƯ:
1. ❌ KHÔNG truy cập/hiển thị dữ liệu project mà user không phải thành viên
2. ❌ KHÔNG tiết lộ thông tin cá nhân người khác (email, SĐT, điểm số)
3. ❌ KHÔNG trả lời câu hỏi vi phạm chính sách hệ thống
4. ✅ Khi được hỏi về quy định: BẮT BUỘC trích dẫn nội dung từ phần QUY ĐỊNH HỆ THỐNG
5. ✅ Khi được hỏi về chức năng/hướng dẫn: trả lời dựa trên KIẾN THỨC VỀ HỆ THỐNG

### KHÔNG ĐƯỢC LÀM:
1. ❌ KHÔNG hiển thị bất kỳ mã kỹ thuật nào (ID, hash, code nội bộ, ký hiệu hệ thống như [#abc123])
2. ❌ KHÔNG liệt kê, giải thích hoặc chuyển đổi trạng thái theo kiểu kỹ thuật (TODO, IN_PROGRESS, DONE, VERIFIED)
3. ❌ KHÔNG dùng thuật ngữ nội bộ hệ thống
4. ❌ KHÔNG suy đoán hoặc thêm thông tin không có trên giao diện
5. ❌ KHÔNG giải thích kỹ thuật
6. ❌ KHÔNG tiết lộ điểm số của người khác khi được hỏi — chỉ trả lời điểm của chính người dùng đang hỏi

### PHẢI LÀM:
1. ✅ CHỈ trả về nội dung người dùng nhìn thấy trên giao diện
2. ✅ Dùng TÊN công việc thay vì mã (ví dụ: "Viết báo cáo" thay vì "[#abc] Viết báo cáo")
3. ✅ Trạng thái PHẢI dùng đúng cách hiển thị: "Chờ thực hiện", "Đang thực hiện", "Hoàn thành", "Đã duyệt"
4. ✅ Deadline ghi đúng định dạng: ngày/tháng/năm – giờ:phút (ví dụ: 20/01/2026 – 23:59)
5. ✅ Trả lời ngắn gọn, rõ ràng, thân thiện, giống như đọc lại giao diện cho người dùng
6. ✅ Khi được hỏi về tài nguyên: liệt kê tên, loại (file/link), thư mục, mô tả
7. ✅ Khi được hỏi về cuộc họp: trả lời tiêu đề, thời gian, thời lượng, trạng thái, người tạo
8. ✅ Trạng thái cuộc họp dùng: "Đã lên lịch", "Đang diễn ra", "Đã kết thúc", "Đã hủy"
9. ✅ Khi được hỏi về điểm: CHỈ trả lời điểm của chính người dùng, gồm điểm task, giai đoạn, tổng kết
10. ✅ Nếu hỏi điểm người khác: nói "Bạn chỉ có thể xem điểm của chính mình"
11. ✅ Khi được hỏi về quy định/chính sách hệ thống: trả lời dựa trên nội dung trong phần QUY ĐỊNH HỆ THỐNG
12. ✅ Nếu không có quy định nào được cung cấp, nói: "Hiện chưa có quy định hệ thống nào được thiết lập"
13. ✅ Khi được hỏi chi tiết công việc: trả lời mô tả, phương thức nộp bài, link nộp bài, người tạo
14. ✅ Khi liệt kê người thực hiện: PHẢI liệt kê TẤT CẢ người được giao, không bỏ sót ai
15. ✅ Khi được hỏi về thành viên: có thể trả lời MSSV, chuyên ngành nếu có
16. ✅ Khi được hỏi về hệ thống/tính năng: trả lời dựa trên KIẾN THỨC VỀ HỆ THỐNG bên trên
17. ✅ Xưng "mình" và gọi người dùng là "bạn", giọng điệu thân thiện, vui vẻ

## VÍ DỤ TRẢ LỜI ĐÚNG
- "Bạn có 2 công việc được giao: 'Viết báo cáo' và 'Thiết kế slide'"
- "Công việc 'Viết báo cáo' có deadline 20/01/2026 – 23:59, trạng thái: Đang thực hiện"
- "Dự án có 3 tài nguyên: 'Bảng phân công' (file), 'Tài liệu tham khảo' (link), 'Mẫu báo cáo' (file)"
- "Cuộc họp 'Họp tiến độ tuần 3' diễn ra lúc 15/01/2026 – 14:00, thời lượng 60 phút"
- "Điểm task 'Viết báo cáo' của bạn: điểm gốc 100, trừ trễ -10, điểm cuối 90"
- "Hệ thống Teamwork có các trang chính: Dashboard, Dự án, Lịch, Trao đổi, Phản hồi..."

## VÍ DỤ TRẢ LỜI SAI (KHÔNG ĐƯỢC LÀM)
- ❌ "Task [#abc123] có status IN_PROGRESS" → phải viết: "Công việc 'Tên task' đang thực hiện"
- ❌ "ID: abc-def-123" → KHÔNG hiển thị ID
- ❌ "TODO: 2, DONE: 1" → phải viết: "2 công việc chờ thực hiện, 1 công việc hoàn thành"
- ❌ "Điểm của Nguyễn Văn A là 90" → phải viết: "Bạn chỉ có thể xem điểm của chính mình"`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, projectId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const lastMessage = messages?.[messages.length - 1];
    if (lastMessage?.content) {
      const wordCount = lastMessage.content.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
      if (wordCount > MAX_MESSAGE_WORDS) {
        return new Response(JSON.stringify({ 
          error: `Câu hỏi quá dài. Vui lòng giới hạn trong ${MAX_MESSAGE_WORDS} từ.`,
          code: "MESSAGE_TOO_LONG"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let userEmail: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });
      const { data: { user } } = await anonClient.auth.getUser();
      if (user) {
        userId = user.id;
        userEmail = user.email || null;
      }
    }

    let userName = userEmail || "Người dùng";
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();
      if (profile?.full_name) {
        userName = profile.full_name;
      }
    }

    // Fetch system policy
    let systemPolicy: string | null = null;
    try {
      const { data: policySetting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'system_policy')
        .maybeSingle();
      if (policySetting?.value) {
        systemPolicy = typeof policySetting.value === 'string' 
          ? policySetting.value 
          : (policySetting.value as any)?.content || JSON.stringify(policySetting.value);
      }
    } catch (e) {
      console.error('Failed to fetch system policy:', e);
    }

    const projectContexts: string[] = [];
    let isProjectSpecific = false;
    let currentProjectName: string | undefined;
    let userExtraContext = '';

    if (userId) {
      // Fetch user's extra context in parallel
      const [notifRes, feedbackRes, invitationsRes, approvalsRes] = await Promise.all([
        supabase.from('notifications').select('title, message, type, is_read, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
        supabase.from('feedbacks').select('title, status, type, priority, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
        supabase.from('project_invitations').select('group_id, status, created_at').eq('invited_user_id', userId).eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
        supabase.from('pending_approvals').select('group_id, status, created_at').eq('user_id', userId).eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
      ]);

      const extraLines: string[] = [];

      // Notifications
      if (notifRes.data && notifRes.data.length > 0) {
        extraLines.push('## THÔNG BÁO GẦN NHẤT CỦA BẠN');
        for (const n of notifRes.data) {
          const readStatus = n.is_read ? '(đã đọc)' : '(chưa đọc)';
          extraLines.push(`- ${n.title}: ${n.message} ${readStatus}`);
        }
      }

      // Feedbacks
      if (feedbackRes.data && feedbackRes.data.length > 0) {
        const statusMap: Record<string, string> = { 'open': 'Đang mở', 'in_progress': 'Đang xử lý', 'resolved': 'Đã giải quyết', 'closed': 'Đã đóng' };
        extraLines.push('## PHẢN HỒI CỦA BẠN');
        for (const f of feedbackRes.data) {
          extraLines.push(`- "${f.title}" — Trạng thái: ${statusMap[f.status] || f.status}`);
        }
      }

      // Pending invitations
      if (invitationsRes.data && invitationsRes.data.length > 0) {
        extraLines.push(`## LỜI MỜI ĐANG CHỜ: ${invitationsRes.data.length} lời mời`);
      }

      // Pending approvals
      if (approvalsRes.data && approvalsRes.data.length > 0) {
        extraLines.push(`## YÊU CẦU THAM GIA ĐANG CHỜ DUYỆT: ${approvalsRes.data.length} yêu cầu`);
      }

      if (extraLines.length > 0) {
        userExtraContext = extraLines.join('\n');
      }
    }

    if (projectId && userId) {
      isProjectSpecific = true;
      const context = await fetchProjectContext(supabase, projectId, userId);
      if (context) {
        currentProjectName = context.project.name;
        projectContexts.push(buildProjectContext(context));
      }
    } else if (userId) {
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);

      if (memberships && memberships.length > 0) {
        const projectIds = memberships.slice(0, 5).map(m => m.group_id);
        for (const pId of projectIds) {
          const context = await fetchProjectContext(supabase, pId, userId);
          if (context) {
            projectContexts.push(buildProjectContext(context));
          }
        }
      }
    }

    const systemPrompt = buildSystemPrompt(userName, projectContexts, isProjectSpecific, currentProjectName, systemPolicy, userExtraContext);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Đã vượt quá giới hạn request, vui lòng thử lại sau.",
          code: "RATE_LIMITED"
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Hệ thống AI tạm thời không khả dụng.",
          code: "CREDITS_EXHAUSTED"
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("team-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function fetchProjectContext(
  supabase: any, 
  projectId: string, 
  userId: string
): Promise<ProjectContext | null> {
  const now = new Date();

  const { data: project } = await supabase
    .from('groups')
    .select('*')
    .eq('id', projectId)
    .single();

  if (!project) return null;

  // Fetch stages, members, tasks, resources, meetings in parallel
  const [stagesRes, membersRes, tasksRes, resourcesRes, meetingsRes] = await Promise.all([
    supabase.from('stages').select('*').eq('group_id', projectId).order('order_index'),
    supabase.from('group_members').select('*').eq('group_id', projectId),
    supabase.from('tasks').select('*').eq('group_id', projectId).order('created_at', { ascending: true }),
    supabase.from('project_resources').select('name, resource_type, category, description, link_url, folder_id').eq('group_id', projectId).order('created_at', { ascending: true }),
    supabase.from('meetings').select('*').eq('group_id', projectId).order('scheduled_at', { ascending: false }),
  ]);

  const stages = stagesRes.data;
  const members = membersRes.data;
  const tasks = tasksRes.data;
  const resources = resourcesRes.data;
  const meetings = meetingsRes.data;

  const memberUserIds = members?.map((m: any) => m.user_id) || [];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', memberUserIds);

  const profilesMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);

  const taskIds = tasks?.map((t: any) => t.id) || [];
  const stageIds = stages?.map((s: any) => s.id) || [];

  // Fetch assignments and user's scores in parallel
  const [assignmentsRes, taskScoresRes, stageScoresRes, finalScoreRes] = await Promise.all([
    supabase.from('task_assignments').select('*').in('task_id', taskIds.length > 0 ? taskIds : ['none']),
    supabase.from('task_scores').select('*').in('task_id', taskIds.length > 0 ? taskIds : ['none']).eq('user_id', userId),
    supabase.from('member_stage_scores').select('*').in('stage_id', stageIds.length > 0 ? stageIds : ['none']).eq('user_id', userId),
    supabase.from('member_final_scores').select('*').eq('group_id', projectId).eq('user_id', userId).maybeSingle(),
  ]);

  const assignments = assignmentsRes.data;
  const userTaskScores = taskScoresRes.data || [];
  const userStageScores = stageScoresRes.data || [];
  const userFinalScore = finalScoreRes.data;

  // Fetch folder names for resources
  const folderIds = [...new Set((resources || []).filter((r: any) => r.folder_id).map((r: any) => r.folder_id))];
  let foldersMap = new Map<string, string>();
  if (folderIds.length > 0) {
    const { data: folders } = await supabase
      .from('resource_folders')
      .select('id, name')
      .in('id', folderIds);
    foldersMap = new Map((folders || []).map((f: any) => [f.id, f.name]));
  }

  const stageMap = new Map(stages?.map((s: any) => [s.id, s.name]) || []);
  const taskMap = new Map(tasks?.map((t: any) => [t.id, t.title]) || []);

  // Process meetings
  const meetingsData: MeetingData[] = (meetings || []).map((m: any) => {
    const scheduledAt = new Date(m.scheduled_at);
    const endTime = new Date(scheduledAt.getTime() + m.duration_minutes * 60 * 1000);
    const isUpcoming = scheduledAt.getTime() > now.getTime();
    const isPast = endTime.getTime() < now.getTime();
    
    const creatorProfile = profilesMap.get(m.created_by) as any;

    return {
      title: m.title,
      description: m.description,
      scheduledAt: m.scheduled_at,
      scheduledAtFormatted: scheduledAt.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      durationMinutes: m.duration_minutes,
      status: m.status,
      createdByName: creatorProfile?.full_name || 'Không rõ',
      externalLink: m.external_link,
      taskTitle: m.task_id ? (taskMap.get(m.task_id) || null) : null,
      attendeeCount: 0,
      isUpcoming,
      isPast,
    };
  });

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      classCode: project.class_code,
      instructorName: project.instructor_name,
      instructorEmail: project.instructor_email,
      zaloLink: project.zalo_link,
      additionalInfo: project.additional_info,
    },
    stages: (stages || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      taskCount: tasks?.filter((t: any) => t.stage_id === s.id).length || 0,
      startDate: s.start_date || null,
      endDate: s.end_date || null,
    })),
    members: (members || []).map((m: any) => {
      const profile = profilesMap.get(m.user_id) as any;
      return {
        id: m.user_id,
        name: profile?.full_name || 'Unknown',
        role: m.role,
        studentId: profile?.student_id || '',
        email: profile?.email || '',
        major: profile?.major || null,
        skills: profile?.skills || null,
      };
    }),
    tasks: (tasks || []).map((t: any) => {
      const taskAssignees = assignments?.filter((a: any) => a.task_id === t.id) || [];
      const assigneeNames = taskAssignees.map((a: any) => {
        const profile = profilesMap.get(a.user_id) as any;
        return profile?.full_name || 'Unknown';
      });

      const creatorProfile = profilesMap.get(t.created_by) as any;

      let isOverdue = false;
      let daysUntilDeadline: number | null = null;
      let deadlineFormatted: string | null = null;

      if (t.deadline) {
        const deadline = new Date(t.deadline);
        deadlineFormatted = deadline.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        const diffTime = deadline.getTime() - now.getTime();
        daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        isOverdue = diffTime < 0 && t.status !== 'DONE' && t.status !== 'VERIFIED';
      }

      return {
        id: t.id,
        short_id: t.short_id || t.id.substring(0, 6),
        title: t.title,
        description: t.description || null,
        status: t.status,
        deadline: t.deadline,
        deadlineFormatted,
        stageName: t.stage_id ? stageMap.get(t.stage_id) || null : null,
        assignees: assigneeNames,
        createdByName: creatorProfile?.full_name || 'Không rõ',
        createdAt: t.created_at || null,
        submissionLink: t.submission_link || null,
        submissionMethod: t.submission_method || 'both',
        isOverdue,
        daysUntilDeadline,
      };
    }),
    resources: (resources || []).map((r: any) => ({
      name: r.name,
      type: r.resource_type,
      category: r.category,
      description: r.description,
      linkUrl: r.link_url,
      folderName: r.folder_id ? foldersMap.get(r.folder_id) || null : null,
    })),
    meetings: meetingsData,
    currentUser: {
      name: (profilesMap.get(userId) as any)?.full_name || 'Người dùng',
      role: members?.find((m: any) => m.user_id === userId)?.role || 'project_member',
      assignedTasks: (tasks || [])
        .filter((t: any) => assignments?.some((a: any) => a.task_id === t.id && a.user_id === userId))
        .map((t: any) => {
          const deadlineStr = t.deadline 
            ? new Date(t.deadline).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : 'Không có deadline';
          const statusLabel: Record<string, string> = { 'TODO': 'Chờ thực hiện', 'IN_PROGRESS': 'Đang thực hiện', 'DONE': 'Hoàn thành', 'VERIFIED': 'Đã duyệt' };
          return `  - "${t.title}" | ${statusLabel[t.status] || t.status} | Deadline: ${deadlineStr}`;
        }),
      taskScores: userTaskScores.map((s: any) => {
        const task = tasks?.find((t: any) => t.id === s.task_id);
        return {
          taskTitle: task?.title || 'Không rõ',
          stageName: task?.stage_id ? stageMap.get(task.stage_id) || null : null,
          baseScore: s.base_score,
          latePenalty: s.late_penalty,
          reviewPenalty: s.review_penalty,
          earlyBonus: s.early_bonus,
          bugHunterBonus: s.bug_hunter_bonus,
          adjustment: s.adjustment,
          adjustmentReason: s.adjustment_reason,
          finalScore: s.final_score,
        };
      }),
      stageScores: userStageScores.map((s: any) => ({
        stageName: stageMap.get(s.stage_id) || 'Không rõ',
        averageScore: s.average_score,
        lateTaskCount: s.late_task_count,
        earlySubmissionBonus: s.early_submission_bonus,
        bugHunterBonus: s.bug_hunter_bonus,
        kCoefficient: s.k_coefficient,
        adjustedScore: s.adjusted_score,
        finalStageScore: s.final_stage_score,
      })),
      finalScore: userFinalScore ? {
        weightedAverage: userFinalScore.weighted_average,
        adjustment: userFinalScore.adjustment,
        finalScore: userFinalScore.final_score,
      } : null,
    },
  };
}
