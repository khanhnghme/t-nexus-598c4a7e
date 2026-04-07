import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { Group, GroupMember, Task, Stage } from '@/types/database';
import ettLogoImage from '@/assets/t-nexus-logo.png';

// ETT Brand Colors
const ETT_TEAL: [number, number, number] = [26, 107, 109];
const ETT_ORANGE: [number, number, number] = [224, 123, 57];
const ETT_TEAL_LIGHT: [number, number, number] = [230, 243, 243];

// Remove Vietnamese diacritics for PDF compatibility
export const removeVietnameseDiacritics = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

interface ActivityLog {
  id: string;
  action: string;
  action_type: string;
  description: string | null;
  user_name: string;
  created_at: string;
  metadata?: any;
}

interface ProjectResource {
  id: string;
  name: string;
  category: string | null;
  file_size: number;
  created_at: string;
  uploaded_by: string;
}

interface TaskScore {
  id: string;
  task_id: string;
  user_id: string;
  base_score: number;
  early_bonus: boolean;
  bug_hunter_bonus: boolean;
  late_penalty: number;
  review_count: number;
  review_penalty: number;
  adjustment: number | null;
  adjustment_reason: string | null;
  final_score: number | null;
}

interface StageScore {
  id: string;
  stage_id: string;
  user_id: string;
  average_score: number | null;
  k_coefficient: number | null;
  adjusted_score: number | null;
  final_stage_score: number | null;
  late_task_count: number;
  early_submission_bonus: boolean;
  bug_hunter_bonus: boolean;
}

interface FinalScore {
  id: string;
  user_id: string;
  weighted_average: number | null;
  adjustment: number | null;
  final_score: number | null;
}

interface ScoreAppeal {
  id: string;
  user_id: string;
  task_score_id: string | null;
  stage_score_id: string | null;
  reason: string;
  status: string;
  reviewer_id: string | null;
  reviewer_response: string | null;
  created_at: string;
}

interface MeetingExport {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  created_by: string;
  external_link: string | null;
  notes: string | null;
}

interface MeetingAttendanceExport {
  meeting_id: string;
  user_id: string;
  status: string;
  joined_at: string | null;
}

interface SubmissionExport {
  id: string;
  task_id: string;
  user_id: string;
  submission_link: string;
  submission_type: string | null;
  file_name: string | null;
  submitted_at: string;
  note: string | null;
}

interface StageWeightExport {
  stage_id: string;
  weight: number;
}

export interface ExportOptions {
  includeMembers: boolean;
  includeTasks: boolean;
  includeScores: boolean;
  includeResources: boolean;
  includeLogs: boolean;
  includeMeetings: boolean;
  includeSubmissions: boolean;
}

export interface ExportData {
  project: Group;
  members: GroupMember[];
  stages: Stage[];
  tasks: Task[];
  taskScores: TaskScore[];
  stageScores: StageScore[];
  finalScores: FinalScore[];
  scoreAppeals: ScoreAppeal[];
  resources: ProjectResource[];
  activityLogs: ActivityLog[];
  meetings: MeetingExport[];
  meetingAttendance: MeetingAttendanceExport[];
  submissions: SubmissionExport[];
  stageWeights: StageWeightExport[];
  options: ExportOptions;
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  member: 'Thanh vien',
  stage: 'Giai doan',
  task: 'Task',
  resource: 'Tai nguyen',
  score: 'Diem',
  project: 'Du an',
  setting: 'Cai dat',
  meeting: 'Hop mat',
  submission: 'Nop bai',
};

const formatAction = (action: string): string => {
  const actionMap: Record<string, string> = {
    'ADD_MEMBER': 'Them thanh vien',
    'REMOVE_MEMBER': 'Xoa thanh vien',
    'UPDATE_MEMBER': 'Cap nhat thanh vien',
    'CREATE_AND_ADD_MEMBER': 'Tao va them thanh vien',
    'CREATE_STAGE': 'Tao giai doan',
    'UPDATE_STAGE': 'Cap nhat giai doan',
    'DELETE_STAGE': 'Xoa giai doan',
    'CREATE_TASK': 'Tao task',
    'UPDATE_TASK': 'Cap nhat task',
    'DELETE_TASK': 'Xoa task',
    'SUBMISSION': 'Nop bai',
    'LATE_SUBMISSION': 'Nop bai tre',
    'SCORE_ADJUSTMENT': 'Dieu chinh diem',
    'APPEAL_SUBMITTED': 'Gui phuc khao',
    'APPEAL_REVIEWED': 'Xu ly phuc khao',
  };
  return actionMap[action] || action;
};

const formatStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'TODO': 'Cho xu ly',
    'IN_PROGRESS': 'Dang lam',
    'DONE': 'Hoan thanh',
    'VERIFIED': 'Da xac nhan',
  };
  return statusMap[status] || status;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const formatRole = (role: string): string => {
  return role === 'project_admin' ? 'Leader' : 'Thanh vien';
};

const formatAppealStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'pending': 'Cho xu ly',
    'approved': 'Chap nhan',
    'rejected': 'Tu choi',
  };
  return statusMap[status] || status;
};

const formatMeetingStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'scheduled': 'Da len lich',
    'in_progress': 'Dang dien ra',
    'completed': 'Da ket thuc',
    'cancelled': 'Da huy',
  };
  return statusMap[status] || status;
};

const formatAttendanceStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'present': 'Co mat',
    'absent': 'Vang',
    'late': 'Di tre',
    'excused': 'Co phep',
  };
  return statusMap[status] || status;
};

// Table of Contents structure
interface TOCEntry {
  title: string;
  page: number;
  level: number;
}

// Add cover page with ETT Logo
type PdfImage = { dataUrl: string; width: number; height: number };

const addCoverPage = (
  doc: jsPDF, 
  pageWidth: number, 
  pageHeight: number,
  project: Group,
  ettLogo: PdfImage | null
) => {
  // ETT Logo at top - maintain proper aspect ratio (original logo is wider than tall)
  if (ettLogo?.dataUrl) {
    try {
      // Keep original aspect ratio to avoid squishing
      let logoWidth = 80;
      let logoHeight = logoWidth * (ettLogo.height / ettLogo.width);

      // Cap height to keep layout stable while preserving ratio
      const maxLogoHeight = 30;
      if (logoHeight > maxLogoHeight) {
        logoHeight = maxLogoHeight;
        logoWidth = logoHeight * (ettLogo.width / ettLogo.height);
      }

      const logoY = 22;
      doc.addImage(ettLogo.dataUrl, 'PNG', (pageWidth - logoWidth) / 2, logoY, logoWidth, logoHeight);
    } catch (e) {
      // Fallback to text if image fails
      doc.setFontSize(32);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...ETT_TEAL);
      doc.text('ETT', pageWidth / 2, 45, { align: 'center' });
      doc.setFontSize(12);
      doc.setTextColor(...ETT_ORANGE);
      doc.text('SYSTEM', pageWidth / 2, 55, { align: 'center' });
    }
  } else {
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ETT_TEAL);
    doc.text('ETT', pageWidth / 2, 45, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(...ETT_ORANGE);
    doc.text('SYSTEM', pageWidth / 2, 55, { align: 'center' });
  }

  // Main title - adjusted position for proper logo spacing
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ETT_TEAL);
  doc.text('BAO CAO MINH CHUNG DU AN', pageWidth / 2, 75, { align: 'center' });

  // Decorative lines
  doc.setDrawColor(...ETT_TEAL);
  doc.setLineWidth(1);
  doc.line(40, 85, pageWidth - 40, 85);
  doc.setDrawColor(...ETT_ORANGE);
  doc.setLineWidth(2);
  doc.line(pageWidth / 2 - 30, 88, pageWidth / 2 + 30, 88);

  // Project name
  doc.setFontSize(18);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  const projectName = removeVietnameseDiacritics(project.name);
  doc.text(projectName, pageWidth / 2, 110, { align: 'center' });

  // Info box
  const boxY = 130;
  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(...ETT_TEAL);
  doc.setLineWidth(0.5);
  doc.roundedRect(30, boxY, pageWidth - 60, 50, 3, 3, 'FD');

  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  
  const infoItems = [
    ['Ma lop:', project.class_code || '-'],
    ['Giang vien HD:', removeVietnameseDiacritics(project.instructor_name || '-')],
    ['Email GV:', project.instructor_email || '-'],
    ['Ngay xuat:', format(new Date(), 'dd/MM/yyyy HH:mm')],
  ];

  let infoY = boxY + 12;
  infoItems.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 40, infoY);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value), 85, infoY);
    infoY += 10;
  });

  // Footer note
  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.text('Tai lieu nay duoc tao tu dong boi he thong quan ly du an nhom ETT', pageWidth / 2, pageHeight - 20, { align: 'center' });
};

// Add Table of Contents
const addTableOfContents = (doc: jsPDF, pageWidth: number, toc: TOCEntry[]) => {
  doc.addPage();
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ETT_TEAL);
  doc.text('MUC LUC', pageWidth / 2, 30, { align: 'center' });

  // Decorative line
  doc.setDrawColor(...ETT_ORANGE);
  doc.setLineWidth(1);
  doc.line(pageWidth / 2 - 20, 35, pageWidth / 2 + 20, 35);

  let yPos = 50;
  doc.setFontSize(11);

  toc.forEach((entry) => {
    const indent = entry.level === 1 ? 20 : entry.level === 2 ? 35 : 50;
    
    if (entry.level === 1) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...ETT_TEAL);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
    }

    // Title
    doc.text(entry.title, indent, yPos);

    // Dotted line
    doc.setDrawColor(180, 180, 180);
    doc.setLineDashPattern([1, 2], 0);
    const titleWidth = doc.getTextWidth(entry.title);
    doc.line(indent + titleWidth + 5, yPos, pageWidth - 35, yPos);
    doc.setLineDashPattern([], 0);

    // Page number
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(entry.page.toString(), pageWidth - 25, yPos, { align: 'right' });

    yPos += entry.level === 1 ? 10 : 7;
  });

  return doc.getNumberOfPages();
};

// Add chapter heading
const addChapterHeading = (doc: jsPDF, title: string, yPos: number, pageWidth: number): number => {
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ETT_TEAL);
  doc.text(removeVietnameseDiacritics(title), 14, yPos);
  
  // Underline
  doc.setDrawColor(...ETT_ORANGE);
  doc.setLineWidth(1);
  doc.line(14, yPos + 3, 80, yPos + 3);
  
  return yPos + 15;
};

// Add section heading
const addSectionHeading = (doc: jsPDF, title: string, yPos: number): number => {
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text(removeVietnameseDiacritics(title), 14, yPos);
  return yPos + 8;
};

// Add sub-section heading
const addSubSectionHeading = (doc: jsPDF, title: string, yPos: number): number => {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text(removeVietnameseDiacritics(title), 20, yPos);
  return yPos + 6;
};

// Add footer with page number
const addFooter = (doc: jsPDF, pageWidth: number, pageHeight: number, pageNumber: number, totalPages: number) => {
  // Footer line
  doc.setDrawColor(...ETT_TEAL);
  doc.setLineWidth(0.3);
  doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
  
  // ETT branding
  doc.setFontSize(8);
  doc.setTextColor(...ETT_TEAL);
  doc.setFont('helvetica', 'bold');
  doc.text('ETT', 14, pageHeight - 8);
  
  doc.setTextColor(...ETT_ORANGE);
  doc.setFontSize(6);
  doc.text('SYSTEM', 24, pageHeight - 8);
  
  // Page number (prominently displayed)
  doc.setTextColor(...ETT_TEAL);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Trang ${pageNumber} / ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  
  // Date
  doc.setTextColor(128, 128, 128);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(format(new Date(), 'dd/MM/yyyy'), pageWidth - 14, pageHeight - 8, { align: 'right' });
};

// Check if we need a new page
const checkNewPage = (doc: jsPDF, yPos: number, pageHeight: number, minSpace: number = 40): number => {
  if (yPos > pageHeight - minSpace) {
    doc.addPage();
    return 25;
  }
  return yPos;
};

// Get member name by user_id
const getMemberName = (userId: string, members: GroupMember[]): string => {
  const member = members.find(m => m.user_id === userId);
  return removeVietnameseDiacritics(member?.profiles?.full_name || 'N/A');
};

const getMemberStudentId = (userId: string, members: GroupMember[]): string => {
  const member = members.find(m => m.user_id === userId);
  return member?.profiles?.student_id || 'N/A';
};

// Convert image to base64
const loadImageAsBase64 = async (imageSrc: string): Promise<PdfImage | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
        });
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageSrc;
  });
};

const generateProjectEvidencePdf = async (data: ExportData, includeTimestampInName: boolean) => {
  const { project, members, stages, tasks, taskScores, stageScores, finalScores, scoreAppeals, resources, activityLogs, meetings, meetingAttendance, submissions, stageWeights, options } = data;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Load ETT logo
  const ettLogo = await loadImageAsBase64(ettLogoImage);

  // Build TOC entries
  const toc: TOCEntry[] = [];
  let currentPage = 3; // Start after cover + TOC

  // Always include general info
  toc.push({ title: 'CHUONG 1: THONG TIN CHUNG', page: currentPage, level: 1 });
  toc.push({ title: '1.1 Thong tin du an', page: currentPage, level: 2 });
  toc.push({ title: '1.2 Thong tin giang vien', page: currentPage, level: 2 });
  toc.push({ title: '1.3 Thong tin nhom', page: currentPage, level: 2 });
  currentPage++;

  if (options.includeMembers && members.length > 0) {
    toc.push({ title: 'CHUONG 2: DANH SACH THANH VIEN', page: currentPage, level: 1 });
    toc.push({ title: '2.1 Danh sach thanh vien', page: currentPage, level: 2 });
    currentPage++;
  }

  if (options.includeTasks && tasks.length > 0) {
    toc.push({ title: 'CHUONG 3: TIEN DO THUC HIEN', page: currentPage, level: 1 });
    toc.push({ title: '3.1 Thong ke tong quan', page: currentPage, level: 2 });
    toc.push({ title: '3.2 Tien do theo giai doan', page: currentPage, level: 2 });
    currentPage++;
    toc.push({ title: 'CHUONG 4: CHI TIET CONG VIEC', page: currentPage, level: 1 });
    toc.push({ title: '4.1 Bang chi tiet cong viec', page: currentPage, level: 2 });
    currentPage++;
  }

  if (options.includeScores && members.length > 0) {
    toc.push({ title: 'CHUONG 5: DIEM QUA TRINH', page: currentPage, level: 1 });
    toc.push({ title: '5.1 Diem theo task', page: currentPage, level: 2 });
    toc.push({ title: '5.2 Diem theo giai doan', page: currentPage, level: 2 });
    if (stageWeights.length > 0) {
      toc.push({ title: '5.3 Trong so giai doan', page: currentPage, level: 2 });
    }
    toc.push({ title: '5.4 Bang diem tong ket', page: currentPage, level: 2 });
    toc.push({ title: '5.5 Chi tiet dieu chinh diem', page: currentPage, level: 2 });
    toc.push({ title: '5.6 Phuc khao diem', page: currentPage, level: 2 });
    currentPage += 2;
  }

  let chapterNum = 6;

  if (options.includeMeetings && meetings.length > 0) {
    toc.push({ title: `CHUONG ${chapterNum}: CUOC HOP NHOM`, page: currentPage, level: 1 });
    toc.push({ title: `${chapterNum}.1 Danh sach cuoc hop`, page: currentPage, level: 2 });
    toc.push({ title: `${chapterNum}.2 Diem danh`, page: currentPage, level: 2 });
    currentPage++;
    chapterNum++;
  }

  if (options.includeSubmissions && submissions.length > 0) {
    toc.push({ title: `CHUONG ${chapterNum}: LICH SU NOP BAI`, page: currentPage, level: 1 });
    currentPage++;
    chapterNum++;
  }

  if (options.includeResources && resources.length > 0) {
    toc.push({ title: `CHUONG ${chapterNum}: TAI NGUYEN DU AN`, page: currentPage, level: 1 });
    currentPage++;
    chapterNum++;
  }

  if (options.includeLogs && activityLogs.length > 0) {
    toc.push({ title: `CHUONG ${chapterNum}: NHAT KY HOAT DONG`, page: currentPage, level: 1 });
  }

  // ============ COVER PAGE ============
  addCoverPage(doc, pageWidth, pageHeight, project, ettLogo);

  // ============ TABLE OF CONTENTS ============
  addTableOfContents(doc, pageWidth, toc);

  // ============ CHAPTER 1: GENERAL INFO ============
  doc.addPage();
  let yPos = 25;
  yPos = addChapterHeading(doc, 'CHUONG 1: THONG TIN CHUNG', yPos, pageWidth);

  // 1.1 Project Info
  yPos = addSectionHeading(doc, '1.1 Thong tin du an', yPos);
  
  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(...ETT_TEAL);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, yPos, pageWidth - 28, 35, 3, 3, 'FD');
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Ten du an:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(removeVietnameseDiacritics(project.name), 55, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'bold');
  doc.text('Mo ta:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  const desc = removeVietnameseDiacritics(project.description || 'Khong co mo ta').substring(0, 100);
  doc.text(desc, 55, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'bold');
  doc.text('Ma lop:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(project.class_code || '-', 55, yPos);
  doc.setFont('helvetica', 'bold');
  doc.text('Link Zalo:', 100, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(project.zalo_link ? 'Co' : 'Khong co', 130, yPos);
  
  yPos += 20;

  // 1.2 Instructor Info
  yPos = addSectionHeading(doc, '1.2 Thong tin giang vien huong dan', yPos);
  
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(14, yPos, pageWidth - 28, 20, 3, 3, 'FD');
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Ho ten:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(removeVietnameseDiacritics(project.instructor_name || '-'), 50, yPos);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Email:', 110, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(project.instructor_email || '-', 130, yPos);
  
  yPos += 18;

  // 1.3 Group Info
  yPos = addSectionHeading(doc, '1.3 Thong tin nhom', yPos);
  
  const totalMembers = members.length;
  const leader = members.find(m => m.role === 'project_admin');
  
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(14, yPos, pageWidth - 28, 20, 3, 3, 'FD');
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('So thanh vien:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(totalMembers.toString(), 60, yPos);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Leader:', 80, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(removeVietnameseDiacritics(leader?.profiles?.full_name || '-'), 105, yPos);

  // ============ CHAPTER 2: MEMBERS ============
  if (options.includeMembers && members.length > 0) {
    doc.addPage();
    yPos = 25;
    yPos = addChapterHeading(doc, 'CHUONG 2: DANH SACH THANH VIEN', yPos, pageWidth);
    yPos = addSectionHeading(doc, '2.1 Danh sach thanh vien', yPos);
    
    const memberData = members.map((m, index) => [
      (index + 1).toString(),
      m.profiles?.student_id || '-',
      removeVietnameseDiacritics(m.profiles?.full_name || '-'),
      m.profiles?.email || '-',
      formatRole(m.role),
      format(new Date(m.joined_at), 'dd/MM/yyyy'),
    ]);
    
    autoTable(doc, {
      head: [['STT', 'MSSV', 'Ho ten', 'Email', 'Vai tro', 'Ngay tham gia']],
      body: memberData,
      startY: yPos,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: ETT_TEAL, textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 45 },
        3: { cellWidth: 50 },
        4: { cellWidth: 22, halign: 'center' },
        5: { cellWidth: 28, halign: 'center' },
      },
      alternateRowStyles: { fillColor: ETT_TEAL_LIGHT },
    });
  }

  // ============ CHAPTER 3: PROGRESS ============
  if (options.includeTasks && tasks.length > 0) {
    doc.addPage();
    yPos = 25;
    yPos = addChapterHeading(doc, 'CHUONG 3: TIEN DO THUC HIEN', yPos, pageWidth);
    
    // 3.1 Stats overview
    yPos = addSectionHeading(doc, '3.1 Thong ke tong quan', yPos);
    
    const totalTasks = tasks.length;
    const verifiedTasks = tasks.filter(t => t.status === 'VERIFIED').length;
    const doneTasks = tasks.filter(t => t.status === 'DONE').length;
    const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const todoTasks = tasks.filter(t => t.status === 'TODO').length;
    const completedTasks = verifiedTasks + doneTasks;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Stats box
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14, yPos, pageWidth - 28, 30, 3, 3, 'FD');
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    
    // Row 1
    doc.setFont('helvetica', 'bold');
    doc.text('Tong so task:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(totalTasks.toString(), 55, yPos);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Tien do:', 80, yPos);
    doc.setTextColor(...ETT_TEAL);
    doc.text(`${progressPercent}%`, 105, yPos);
    
    yPos += 10;
    doc.setTextColor(60, 60, 60);
    
    // Row 2
    doc.text(`Da xac nhan: ${verifiedTasks}`, 20, yPos);
    doc.text(`Hoan thanh: ${doneTasks}`, 60, yPos);
    doc.text(`Dang lam: ${inProgressTasks}`, 100, yPos);
    doc.text(`Cho xu ly: ${todoTasks}`, 140, yPos);
    
    yPos += 18;
    
    // 3.2 Progress by stage
    yPos = addSectionHeading(doc, '3.2 Tien do theo giai doan', yPos);
    
    stages.forEach((stage, stageIndex) => {
      const stageTasks = tasks.filter(t => t.stage_id === stage.id);
      const stageCompleted = stageTasks.filter(t => t.status === 'DONE' || t.status === 'VERIFIED').length;
      const stageProgress = stageTasks.length > 0 ? Math.round((stageCompleted / stageTasks.length) * 100) : 0;
      
      yPos = checkNewPage(doc, yPos, pageHeight, 50);
      
      // Stage header with progress
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...ETT_TEAL);
      doc.text(`3.2.${stageIndex + 1} ${removeVietnameseDiacritics(stage.name)}`, 20, yPos);
      
      // Progress indicator
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...ETT_ORANGE);
      doc.text(`[${stageCompleted}/${stageTasks.length} - ${stageProgress}%]`, 120, yPos);
      
      yPos += 6;
      
      // Date range if available
      if (stage.start_date || stage.end_date) {
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        const dateRange = [
          stage.start_date ? format(new Date(stage.start_date), 'dd/MM/yyyy') : '...',
          stage.end_date ? format(new Date(stage.end_date), 'dd/MM/yyyy') : '...'
        ].join(' - ');
        doc.text(`Thoi gian: ${dateRange}`, 24, yPos);
        yPos += 5;
      }
      
      // Tasks in stage
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      
      stageTasks.forEach(task => {
        yPos = checkNewPage(doc, yPos, pageHeight, 20);
        
        const assignees = task.task_assignments?.map(a => removeVietnameseDiacritics(a.profiles?.full_name?.split(' ').pop() || '')).join(', ') || '-';
        const deadline = task.deadline ? format(new Date(task.deadline), 'dd/MM/yyyy') : '-';
        const statusColor = task.status === 'VERIFIED' ? ETT_TEAL : 
                           task.status === 'DONE' ? [0, 150, 0] as [number, number, number] :
                           task.status === 'IN_PROGRESS' ? ETT_ORANGE : [150, 150, 150] as [number, number, number];
        
        doc.setTextColor(80, 80, 80);
        doc.text(`• ${removeVietnameseDiacritics(task.title.substring(0, 35))}`, 28, yPos);
        
        doc.setTextColor(...statusColor);
        doc.text(`[${formatStatus(task.status)}]`, 130, yPos);
        
        doc.setTextColor(80, 80, 80);
        doc.text(`DL: ${deadline}`, 165, yPos);
        
        yPos += 5;
      });
      
      yPos += 5;
    });
    
    // Unassigned tasks
    const unstagedTasks = tasks.filter(t => !t.stage_id);
    if (unstagedTasks.length > 0) {
      yPos = checkNewPage(doc, yPos, pageHeight, 40);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text('Chua phan giai doan', 20, yPos);
      yPos += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      unstagedTasks.forEach(task => {
        yPos = checkNewPage(doc, yPos, pageHeight, 15);
        const deadline = task.deadline ? format(new Date(task.deadline), 'dd/MM/yyyy') : '-';
        doc.text(`• ${removeVietnameseDiacritics(task.title.substring(0, 40))} | ${formatStatus(task.status)} | DL: ${deadline}`, 28, yPos);
        yPos += 5;
      });
    }
  }

  // ============ CHAPTER 4: TASK DETAILS ============
  if (options.includeTasks && tasks.length > 0) {
    doc.addPage();
    yPos = 25;
    yPos = addChapterHeading(doc, 'CHUONG 4: CHI TIET CONG VIEC', yPos, pageWidth);
    yPos = addSectionHeading(doc, '4.1 Bang chi tiet cong viec', yPos);
    
    const taskData = tasks.map((t, index) => {
      const stageName = stages.find(s => s.id === t.stage_id)?.name || 'Chua phan';
      const assignees = t.task_assignments?.map(a => removeVietnameseDiacritics(a.profiles?.full_name?.split(' ').pop() || '')).join(', ') || '-';
      return [
        (index + 1).toString(),
        removeVietnameseDiacritics(t.title.substring(0, 28)),
        removeVietnameseDiacritics(stageName.substring(0, 12)),
        formatStatus(t.status),
        t.deadline ? format(new Date(t.deadline), 'dd/MM HH:mm') : '-',
        assignees.substring(0, 20),
      ];
    });
    
    autoTable(doc, {
      head: [['STT', 'Ten task', 'Giai doan', 'Trang thai', 'Deadline', 'Nguoi thuc hien']],
      body: taskData,
      startY: yPos,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: ETT_TEAL, textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 55 },
        2: { cellWidth: 25 },
        3: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 28, halign: 'center' },
        5: { cellWidth: 35 },
      },
      alternateRowStyles: { fillColor: ETT_TEAL_LIGHT },
    });
  }

  // ============ CHAPTER 5: DETAILED SCORES ============
  if (options.includeScores && members.length > 0) {
    doc.addPage();
    yPos = 25;
    yPos = addChapterHeading(doc, 'CHUONG 5: DIEM QUA TRINH', yPos, pageWidth);
    
    // 5.1 Task scores per member
    yPos = addSectionHeading(doc, '5.1 Diem theo task (chi tiet tung thanh vien)', yPos);
    
    if (taskScores.length > 0) {
      members.forEach((member, memberIdx) => {
        const memberTaskScores = taskScores.filter(ts => ts.user_id === member.user_id);
        if (memberTaskScores.length === 0) return;
        
        yPos = checkNewPage(doc, yPos, pageHeight, 60);
        
        // Member name header
        yPos = addSubSectionHeading(doc, `5.1.${memberIdx + 1} ${getMemberName(member.user_id, members)} (${getMemberStudentId(member.user_id, members)})`, yPos);
        
        const memberTaskData = memberTaskScores.map((ts, idx) => {
          const task = tasks.find(t => t.id === ts.task_id);
          const bonuses = [
            ts.early_bonus ? 'Som' : null,
            ts.bug_hunter_bonus ? 'Bug' : null,
          ].filter(Boolean).join(', ') || '-';
          const penalties = [
            ts.late_penalty > 0 ? `Tre: -${ts.late_penalty}` : null,
            ts.review_penalty > 0 ? `Review: -${ts.review_penalty}` : null,
          ].filter(Boolean).join(', ') || '-';
          
          return [
            (idx + 1).toString(),
            removeVietnameseDiacritics(task?.title?.substring(0, 20) || '-'),
            ts.base_score.toFixed(1),
            bonuses,
            penalties,
            ts.adjustment?.toFixed(1) || '-',
            ts.final_score?.toFixed(1) || '-',
          ];
        });
        
        autoTable(doc, {
          head: [['#', 'Task', 'Diem goc', 'Bonus', 'Tru diem', 'Dieu chinh', 'Diem cuoi']],
          body: memberTaskData,
          startY: yPos,
          styles: { fontSize: 7, cellPadding: 1.5 },
          headStyles: { fillColor: ETT_TEAL, textColor: 255, fontStyle: 'bold', halign: 'center' },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 45 },
            2: { cellWidth: 18, halign: 'center' },
            3: { cellWidth: 25 },
            4: { cellWidth: 35 },
            5: { cellWidth: 20, halign: 'center' },
            6: { cellWidth: 20, halign: 'center' },
          },
          alternateRowStyles: { fillColor: ETT_TEAL_LIGHT },
        });
        
        yPos = (doc as any).lastAutoTable?.finalY + 10 || yPos + 30;
      });
    } else {
      doc.setFontSize(9);
      doc.setTextColor(128, 128, 128);
      doc.text('Chua co du lieu diem task.', 20, yPos);
      yPos += 10;
    }
    
    // 5.2 Stage scores
    yPos = checkNewPage(doc, yPos, pageHeight, 80);
    yPos = addSectionHeading(doc, '5.2 Diem theo giai doan', yPos);
    
    if (stageScores.length > 0 && stages.length > 0) {
      const stageScoreHeaders = ['STT', 'MSSV', 'Ho ten', ...stages.map((s, i) => `GD${i+1}`)];
      
      const stageScoreData = members.map((m, index) => {
        const row = [
          (index + 1).toString(),
          m.profiles?.student_id || '-',
          removeVietnameseDiacritics(m.profiles?.full_name?.substring(0, 18) || '-'),
        ];
        
        stages.forEach(stage => {
          const score = stageScores.find(ss => ss.stage_id === stage.id && ss.user_id === m.user_id);
          row.push(score?.final_stage_score?.toFixed(1) || '-');
        });
        
        return row;
      });
      
      autoTable(doc, {
        head: [stageScoreHeaders],
        body: stageScoreData,
        startY: yPos,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: ETT_TEAL, textColor: 255, fontStyle: 'bold', halign: 'center' },
        alternateRowStyles: { fillColor: ETT_TEAL_LIGHT },
      });
      
      yPos = (doc as any).lastAutoTable?.finalY + 10 || yPos + 30;
    }
    
    // 5.3 Stage weights
    if (stageWeights.length > 0) {
      yPos = checkNewPage(doc, yPos, pageHeight, 60);
      yPos = addSectionHeading(doc, '5.3 Trong so giai doan', yPos);
      
      const weightData = stages.map((s, idx) => {
        const w = stageWeights.find(sw => sw.stage_id === s.id);
        return [
          (idx + 1).toString(),
          removeVietnameseDiacritics(s.name.substring(0, 35)),
          w ? `${(w.weight * 100).toFixed(0)}%` : '-',
        ];
      });
      
      autoTable(doc, {
        head: [['STT', 'Giai doan', 'Trong so']],
        body: weightData,
        startY: yPos,
        styles: { fontSize: 9, cellPadding: 2.5 },
        headStyles: { fillColor: ETT_TEAL, textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 100 },
          2: { cellWidth: 30, halign: 'center' },
        },
        alternateRowStyles: { fillColor: ETT_TEAL_LIGHT },
      });
      
      yPos = (doc as any).lastAutoTable?.finalY + 10 || yPos + 30;
    }

    // 5.4 Final scores
    yPos = checkNewPage(doc, yPos, pageHeight, 60);
    yPos = addSectionHeading(doc, '5.4 Bang diem tong ket', yPos);
    
    if (finalScores.length > 0) {
      const finalScoreData = members.map((m, index) => {
        const fs = finalScores.find(f => f.user_id === m.user_id);
        return [
          (index + 1).toString(),
          m.profiles?.student_id || '-',
          removeVietnameseDiacritics(m.profiles?.full_name || '-'),
          fs?.weighted_average?.toFixed(2) || '-',
          fs?.adjustment?.toFixed(2) || '-',
          fs?.final_score?.toFixed(2) || '-',
        ];
      });
      
      autoTable(doc, {
        head: [['STT', 'MSSV', 'Ho ten', 'Diem TB co trong so', 'Dieu chinh', 'Diem cuoi cung']],
        body: finalScoreData,
        startY: yPos,
        styles: { fontSize: 9, cellPadding: 2.5 },
        headStyles: { fillColor: ETT_TEAL, textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 28, halign: 'center' },
          2: { cellWidth: 50 },
          3: { cellWidth: 35, halign: 'center' },
          4: { cellWidth: 25, halign: 'center' },
          5: { cellWidth: 30, halign: 'center' },
        },
        alternateRowStyles: { fillColor: ETT_TEAL_LIGHT },
      });
      
      yPos = (doc as any).lastAutoTable?.finalY + 10 || yPos + 30;
    }
    
    // 5.5 Score adjustments detail
    yPos = checkNewPage(doc, yPos, pageHeight, 60);
    yPos = addSectionHeading(doc, '5.5 Chi tiet dieu chinh diem', yPos);
    
    const adjustedScores = taskScores.filter(ts => ts.adjustment && ts.adjustment !== 0);
    if (adjustedScores.length > 0) {
      const adjustmentData = adjustedScores.map((ts, idx) => {
        const task = tasks.find(t => t.id === ts.task_id);
        const memberName = getMemberName(ts.user_id, members);
        return [
          (idx + 1).toString(),
          removeVietnameseDiacritics(task?.title?.substring(0, 22) || '-'),
          memberName.substring(0, 15),
          ts.adjustment?.toFixed(1) || '-',
          removeVietnameseDiacritics(ts.adjustment_reason?.substring(0, 35) || '-'),
        ];
      });
      
      autoTable(doc, {
        head: [['#', 'Task', 'Thanh vien', 'Dieu chinh', 'Ly do']],
        body: adjustmentData,
        startY: yPos,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: ETT_TEAL, textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 45 },
          2: { cellWidth: 30 },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 75 },
        },
        alternateRowStyles: { fillColor: ETT_TEAL_LIGHT },
      });
      
      yPos = (doc as any).lastAutoTable?.finalY + 10 || yPos + 30;
    } else {
      doc.setFontSize(9);
      doc.setTextColor(128, 128, 128);
      doc.text('Khong co dieu chinh diem nao.', 20, yPos);
      yPos += 10;
    }
    
    // 5.6 Score appeals
    yPos = checkNewPage(doc, yPos, pageHeight, 60);
    yPos = addSectionHeading(doc, '5.6 Phuc khao diem', yPos);
    
    if (scoreAppeals.length > 0) {
      const appealData = scoreAppeals.map((appeal, idx) => {
        const memberName = getMemberName(appeal.user_id, members);
        const task = appeal.task_score_id ? tasks.find(t => taskScores.find(ts => ts.id === appeal.task_score_id)?.task_id === t.id) : null;
        const stage = appeal.stage_score_id ? stages.find(s => stageScores.find(ss => ss.id === appeal.stage_score_id)?.stage_id === s.id) : null;
        const target = task ? removeVietnameseDiacritics(task.title.substring(0, 15)) : 
                       stage ? removeVietnameseDiacritics(stage.name.substring(0, 15)) : '-';
        
        return [
          (idx + 1).toString(),
          memberName.substring(0, 15),
          target,
          removeVietnameseDiacritics(appeal.reason.substring(0, 25)),
          formatAppealStatus(appeal.status),
          removeVietnameseDiacritics(appeal.reviewer_response?.substring(0, 25) || '-'),
        ];
      });
      
      autoTable(doc, {
        head: [['#', 'Thanh vien', 'Doi tuong', 'Ly do phuc khao', 'Trang thai', 'Phan hoi']],
        body: appealData,
        startY: yPos,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: ETT_TEAL, textColor: 255, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 30 },
          2: { cellWidth: 30 },
          3: { cellWidth: 45 },
          4: { cellWidth: 22, halign: 'center' },
          5: { cellWidth: 45 },
        },
        alternateRowStyles: { fillColor: ETT_TEAL_LIGHT },
      });
    } else {
      doc.setFontSize(9);
      doc.setTextColor(128, 128, 128);
      doc.text('Khong co yeu cau phuc khao nao.', 20, yPos);
    }
  }

  // Dynamic chapter numbering
  let chapNum = 6;

  // ============ MEETINGS ============
  if (options.includeMeetings && meetings.length > 0) {
    doc.addPage();
    yPos = 25;
    yPos = addChapterHeading(doc, `CHUONG ${chapNum}: CUOC HOP NHOM`, yPos, pageWidth);
    yPos = addSectionHeading(doc, `${chapNum}.1 Danh sach cuoc hop`, yPos);
    
    const meetingData = meetings.map((m, index) => [
      (index + 1).toString(),
      removeVietnameseDiacritics(m.title.substring(0, 30)),
      format(new Date(m.scheduled_at), 'dd/MM/yyyy HH:mm'),
      `${m.duration_minutes} phut`,
      formatMeetingStatus(m.status),
      removeVietnameseDiacritics(getMemberName(m.created_by, members).substring(0, 15)),
    ]);
    
    autoTable(doc, {
      head: [['STT', 'Tieu de', 'Thoi gian', 'Thoi luong', 'Trang thai', 'Nguoi tao']],
      body: meetingData,
      startY: yPos,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: ETT_TEAL, textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 50 },
        2: { cellWidth: 35, halign: 'center' },
        3: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 30 },
      },
      alternateRowStyles: { fillColor: ETT_TEAL_LIGHT },
    });
    
    yPos = (doc as any).lastAutoTable?.finalY + 10 || yPos + 30;

    // Attendance summary
    if (meetingAttendance.length > 0) {
      yPos = checkNewPage(doc, yPos, pageHeight, 80);
      yPos = addSectionHeading(doc, `${chapNum}.2 Diem danh cuoc hop`, yPos);
      
      // Build attendance matrix: rows = members, columns = meetings
      const attendanceHeaders = ['STT', 'Ho ten', ...meetings.slice(0, 8).map((_, i) => `Hop ${i + 1}`)];
      const attendanceBody = members.map((m, idx) => {
        const row = [
          (idx + 1).toString(),
          removeVietnameseDiacritics(m.profiles?.full_name?.substring(0, 18) || '-'),
        ];
        meetings.slice(0, 8).forEach(meeting => {
          const att = meetingAttendance.find(a => a.meeting_id === meeting.id && a.user_id === m.user_id);
          row.push(att ? formatAttendanceStatus(att.status) : '-');
        });
        return row;
      });
      
      autoTable(doc, {
        head: [attendanceHeaders],
        body: attendanceBody,
        startY: yPos,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: ETT_TEAL, textColor: 255, fontStyle: 'bold', halign: 'center' },
        alternateRowStyles: { fillColor: ETT_TEAL_LIGHT },
      });
    }
    
    chapNum++;
  }

  // ============ SUBMISSIONS ============
  if (options.includeSubmissions && submissions.length > 0) {
    doc.addPage();
    yPos = 25;
    yPos = addChapterHeading(doc, `CHUONG ${chapNum}: LICH SU NOP BAI`, yPos, pageWidth);
    
    const submissionData = submissions.slice(0, 200).map((s, index) => {
      const task = tasks.find(t => t.id === s.task_id);
      const memberName = getMemberName(s.user_id, members);
      const submissionType = s.submission_type === 'file' ? 'File' : s.submission_type === 'link' ? 'Link' : (s.file_name ? 'File' : 'Link');
      return [
        (index + 1).toString(),
        removeVietnameseDiacritics(task?.title?.substring(0, 25) || '-'),
        memberName.substring(0, 15),
        submissionType,
        removeVietnameseDiacritics(s.file_name?.substring(0, 20) || s.submission_link?.substring(0, 20) || '-'),
        format(new Date(s.submitted_at), 'dd/MM/yyyy HH:mm'),
      ];
    });
    
    autoTable(doc, {
      head: [['STT', 'Cong viec', 'Nguoi nop', 'Loai', 'Ten file / Link', 'Thoi gian']],
      body: submissionData,
      startY: yPos,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: ETT_TEAL, textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 45 },
        2: { cellWidth: 30 },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 40 },
        5: { cellWidth: 35, halign: 'center' },
      },
      alternateRowStyles: { fillColor: ETT_TEAL_LIGHT },
    });
    
    if (submissions.length > 200) {
      const lastY = (doc as any).lastAutoTable?.finalY || yPos + 20;
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`... va ${submissions.length - 200} lan nop bai khac`, 14, lastY + 8);
    }
    
    chapNum++;
  }

  // ============ RESOURCES ============
  if (options.includeResources && resources.length > 0) {
    doc.addPage();
    yPos = 25;
    yPos = addChapterHeading(doc, `CHUONG ${chapNum}: TAI NGUYEN DU AN`, yPos, pageWidth);
    
    const resourceData = resources.map((r, index) => [
      (index + 1).toString(),
      removeVietnameseDiacritics(r.name.substring(0, 40)),
      r.category || '-',
      formatFileSize(r.file_size),
      format(new Date(r.created_at), 'dd/MM/yyyy'),
    ]);
    
    autoTable(doc, {
      head: [['STT', 'Ten file', 'Danh muc', 'Kich thuoc', 'Ngay upload']],
      body: resourceData,
      startY: yPos,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: ETT_TEAL, textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 75 },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 30, halign: 'center' },
      },
      alternateRowStyles: { fillColor: ETT_TEAL_LIGHT },
    });
    
    chapNum++;
  }

  // ============ ACTIVITY LOGS ============
  if (options.includeLogs && activityLogs.length > 0) {
    doc.addPage();
    yPos = 25;
    yPos = addChapterHeading(doc, `CHUONG ${chapNum}: NHAT KY HOAT DONG`, yPos, pageWidth);
    
    // Show first 150 logs
    const logData = activityLogs.slice(0, 150).map((log, index) => [
      (index + 1).toString(),
      format(new Date(log.created_at), 'dd/MM/yyyy'),
      format(new Date(log.created_at), 'HH:mm'),
      removeVietnameseDiacritics(log.user_name.split('@')[0].substring(0, 15)),
      ACTION_TYPE_LABELS[log.action_type] || log.action_type,
      removeVietnameseDiacritics(formatAction(log.action)),
    ]);
    
    autoTable(doc, {
      head: [['STT', 'Ngay', 'Gio', 'Nguoi thuc hien', 'Loai', 'Hanh dong']],
      body: logData,
      startY: yPos,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: ETT_TEAL, textColor: 255, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 35 },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 65 },
      },
      alternateRowStyles: { fillColor: ETT_TEAL_LIGHT },
    });
    
    if (activityLogs.length > 150) {
      const lastY = (doc as any).lastAutoTable?.finalY || yPos + 20;
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`... va ${activityLogs.length - 150} hoat dong khac`, 14, lastY + 8);
    }
  }

  // Add footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, pageWidth, pageHeight, i, totalPages);
  }

  const slug = project.slug || project.short_id || 'project';
  const base = `minh-chung-${removeVietnameseDiacritics(slug).toLowerCase().replace(/\s+/g, '-')}`;
  const fileName = includeTimestampInName
    ? `${base}-${format(new Date(), 'yyyyMMdd-HHmmss')}.pdf`
    : `${base}.pdf`;

  return { doc, fileName };
};

export const exportProjectEvidencePdf = async (data: ExportData) => {
  const { doc, fileName } = await generateProjectEvidencePdf(data, true);
  doc.save(fileName);
  return fileName;
};

// Export as Blob for backup integration (does not auto-download)
export const generateProjectEvidencePdfBlob = async (data: ExportData): Promise<{ blob: Blob; fileName: string }> => {
  const { doc, fileName } = await generateProjectEvidencePdf(data, false);
  const blob = doc.output('blob');
  return { blob, fileName };
};
