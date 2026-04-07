import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { r2Storage } from '@/lib/r2Storage';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Download, 
  Upload, 
  Loader2, 
  FolderArchive,
  AlertTriangle,
  CheckCircle,
  File,
  MessageSquare,
  FileText,
  History,
  FolderOpen,
  MessageCircle,
  Award,
  Settings,
  Filter,
  ChevronDown,
  Shield,
  Bug,
  HelpCircle,
  XCircle,
  Clock,
  HardDrive,
  Package,
  Users
} from 'lucide-react';
import JSZip from 'jszip';
import { generateProjectEvidencePdfBlob, ExportData as EvidenceExportData, ExportOptions as EvidenceExportOptions } from '@/lib/projectEvidencePdf';

interface Group {
  id: string;
  name: string;
  description: string | null;
  class_code: string | null;
  instructor_name: string | null;
  instructor_email: string | null;
  additional_info: string | null;
  zalo_link: string | null;
  leader_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  image_url: string | null;
  is_public: boolean | null;
  share_token: string | null;
  show_activity_public: boolean | null;
  show_members_public: boolean | null;
  show_resources_public: boolean | null;
}

interface FileSubmission {
  original_path: string;
  file_name: string;
  file_size: number;
  zip_path: string;
  bucket: string;
}

interface BackupMessage {
  student_id: string;
  content: string;
  source_type: string;
  created_at: string;
}

interface BackupTaskNote {
  task_title: string;
  version_name: string;
  content: string | null;
  created_by_student_id: string;
  created_at: string;
  attachments: Array<{
    file_name: string;
    file_size: number;
    original_path: string;
  }>;
}

interface BackupTaskComment {
  task_title: string;
  student_id: string;
  content: string;
  parent_index: number | null;
  created_at: string;
}

interface BackupResource {
  name: string;
  description: string | null;
  file_path: string | null;
  file_size: number;
  file_type: string | null;
  category: string | null;
  folder_name: string | null;
  uploaded_by_student_id: string;
  created_at: string;
  resource_type: string;
  link_url: string | null;
  storage_name: string | null;
}

interface BackupResourceFolder {
  name: string;
  description: string | null;
  created_by_student_id: string;
  created_at: string;
}

interface BackupActivityLog {
  action: string;
  action_type: string;
  description: string | null;
  user_name: string;
  student_id: string;
  created_at: string;
  metadata: any;
}

interface BackupStageWeight {
  stage_name: string;
  weight: number;
}

interface BackupMemberStageScore {
  student_id: string;
  stage_name: string;
  average_score: number | null;
  k_coefficient: number | null;
  adjusted_score: number | null;
  final_stage_score: number | null;
  late_task_count: number;
  early_submission_bonus: boolean;
  bug_hunter_bonus: boolean;
}

interface BackupMemberFinalScore {
  student_id: string;
  weighted_average: number | null;
  adjustment: number | null;
  final_score: number | null;
}

interface BackupScoreAppeal {
  student_id: string;
  task_title: string | null;
  stage_name: string | null;
  reason: string;
  status: string;
  reviewer_student_id: string | null;
  reviewer_response: string | null;
  created_at: string;
}

interface BackupScoreAdjustment {
  student_id: string;
  adjustment_type: string;
  previous_score: number | null;
  new_score: number | null;
  adjustment_value: number | null;
  reason: string | null;
  adjusted_by_student_id: string;
  created_at: string;
}

interface BackupFeedback {
  student_id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  status: string;
  admin_response: string | null;
  responded_by_student_id: string | null;
  responded_at: string | null;
  created_at: string;
  comments: BackupFeedbackComment[];
}

interface BackupFeedbackComment {
  student_id: string;
  content: string;
  is_admin: boolean;
  created_at: string;
}

interface BackupManifest {
  version: string;
  exported_at: string;
  project_name: string;
  record_counts: Record<string, number>;
  file_count: number;
  total_file_size: number;
  checksum: string;
}

interface BackupData {
  version: string;
  exported_at: string;
  project_name: string;
  group: Omit<Group, 'id'>;
  members: Array<{ user_id: string; role: string; joined_at: string; profile: { student_id: string; full_name: string; email: string } }>;
  stages: Array<{ 
    name: string; 
    description: string | null; 
    order_index: number; 
    start_date: string | null; 
    end_date: string | null; 
    weight: number | null;
    is_hidden: boolean | null;
  }>;
  tasks: Array<{
    title: string;
    description: string | null;
    status: string;
    deadline: string | null;
    extended_deadline: string | null;
    submission_link: string | null;
    stage_name: string | null;
    max_file_size: number | null;
    is_hidden: boolean | null;
    assignments: Array<{ student_id: string }>;
    scores: Array<any>;
    submissions: Array<any>;
  }>;
  messages?: BackupMessage[];
  task_notes?: BackupTaskNote[];
  task_comments?: BackupTaskComment[];
  resources?: BackupResource[];
  resource_folders?: BackupResourceFolder[];
  activity_logs?: BackupActivityLog[];
  stage_weights?: BackupStageWeight[];
  member_stage_scores?: BackupMemberStageScore[];
  member_final_scores?: BackupMemberFinalScore[];
  score_appeals?: BackupScoreAppeal[];
  score_adjustments?: BackupScoreAdjustment[];
  feedbacks?: BackupFeedback[];
  files?: FileSubmission[];
  manifest?: BackupManifest;
  raw_data?: {
    group: any;
    group_members: any[];
    profiles: any[];
    stages: any[];
    tasks: any[];
    task_assignments: any[];
    task_scores: any[];
    submission_history: any[];
    project_messages: any[];
    task_notes: any[];
    task_note_attachments: any[];
    task_comments: any[];
    project_resources: any[];
    resource_folders: any[];
    activity_logs: any[];
    stage_weights: any[];
    member_stage_scores: any[];
    member_final_scores: any[];
    score_appeals: any[];
    score_adjustment_history: any[];
    feedbacks: any[];
    feedback_comments: any[];
    meetings: any[];
    meeting_attendance: any[];
    meeting_messages: any[];
  };
}

interface ExportOptions {
  includeMessages: boolean;
  includeTaskNotes: boolean;
  includeTaskComments: boolean;
  includeResources: boolean;
  includeActivityLogs: boolean;
  includeScores: boolean;
  includeFeedbacks: boolean;
}

interface BackupReport {
  status: 'success' | 'error';
  projectName: string;
  duration: number; // ms
  recordCounts: Record<string, number>;
  fileCount: number;
  zipSize: number; // bytes
  checksum?: string;
  errors: string[];
}

interface StepInfo {
  label: string;
  timestamp: number;
}

export default function AdminBackupRestore() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string>('');
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Dialog & step tracking state
  const [exportStepLabel, setExportStepLabel] = useState('');
  const [importStepLabel, setImportStepLabel] = useState('');
  const [exportReport, setExportReport] = useState<BackupReport | null>(null);
  const [importReport, setImportReport] = useState<BackupReport | null>(null);
  const [exportSteps, setExportSteps] = useState<StepInfo[]>([]);
  const [importSteps, setImportSteps] = useState<StepInfo[]>([]);
  const [importProgressPercent, setImportProgressPercent] = useState(0);
  const exportStartTime = useRef<number>(0);
  const importStartTime = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showMainDialog, setShowMainDialog] = useState(false);
  const [activePage, setActivePage] = useState<'backup' | 'restore'>('backup');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const cancelRef = useRef(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeMessages: true,
    includeTaskNotes: true,
    includeTaskComments: true,
    includeResources: true,
    includeActivityLogs: true,
    includeScores: true,
    includeFeedbacks: true,
  });

  const selectedCount = Object.values(exportOptions).filter(v => v).length;

  const selectAllOptions = () => {
    setExportOptions({
      includeMessages: true,
      includeTaskNotes: true,
      includeTaskComments: true,
      includeResources: true,
      includeActivityLogs: true,
      includeScores: true,
      includeFeedbacks: true,
    });
  };

  const deselectAllOptions = () => {
    setExportOptions({
      includeMessages: false,
      includeTaskNotes: false,
      includeTaskComments: false,
      includeResources: false,
      includeActivityLogs: false,
      includeScores: false,
      includeFeedbacks: false,
    });
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAllGroups();
    }
  }, [isAdmin]);

  const fetchAllGroups = async () => {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('name');
    
    if (data && !error) {
      setGroups(data as Group[]);
    }
  };

  const generateNewId = () => crypto.randomUUID();

  // Paginated fetch to handle >1000 rows (Supabase default limit)
  const paginatedFetch = async <T = any>(
    table: string,
    filters: { column: string; value: any; operator?: string }[],
    orderBy?: { column: string; ascending?: boolean }
  ): Promise<T[]> => {
    const PAGE_SIZE = 1000;
    let allData: T[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      let query = (supabase.from as any)(table).select('*').range(from, from + PAGE_SIZE - 1);
      
      for (const filter of filters) {
        if (filter.operator === 'in') {
          query = query.in(filter.column, filter.value);
        } else {
          query = query.eq(filter.column, filter.value);
        }
      }

      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      }

      const { data, error } = await query;
      
      if (error) {
        console.warn(`Paginated fetch error on ${table}:`, error);
        break;
      }

      if (data && data.length > 0) {
        allData = [...allData, ...(data as T[])];
        from += PAGE_SIZE;
        hasMore = data.length === PAGE_SIZE;
      } else {
        hasMore = false;
      }
    }

    return allData;
  };

  const parseFileSubmissions = (submissionLink: string | null): { file_path: string; file_name: string; file_size: number }[] => {
    if (!submissionLink) return [];
    try {
      const parsed = JSON.parse(submissionLink);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(item => item.file_path)
          .map(item => ({
            file_path: item.file_path,
            file_name: item.file_name || 'file',
            file_size: item.file_size || 0
          }));
      }
    } catch {
      return [];
    }
    return [];
  };

  const parseStorageUrl = (url: string): { bucket: string; path: string } | null => {
    if (!url) return null;
    const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
    if (match) return { bucket: match[1], path: decodeURIComponent(match[2]) };
    return null;
  };

  // Generate a simple checksum for integrity verification
  const generateChecksum = (data: string): string => {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  };

  // Step tracking helpers
  const addExportStep = (label: string) => {
    setExportStepLabel(label);
    setExportSteps(prev => [...prev, { label, timestamp: Date.now() }]);
  };

  const addImportStep = (label: string, percent: number) => {
    setImportStepLabel(label);
    setImportProgressPercent(percent);
    setImportSteps(prev => [...prev, { label, timestamp: Date.now() }]);
  };

  const checkCancelled = () => {
    if (cancelRef.current) throw new Error('CANCELLED');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const exportProject = async () => {
    if (!selectedGroupId) {
      toast({ title: 'Lỗi', description: 'Vui lòng chọn project để sao lưu', variant: 'destructive' });
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportSteps([]);
    setExportReport(null);
    setShowMainDialog(true);
    cancelRef.current = false;
    exportStartTime.current = Date.now();
    
    try {
      const group = groups.find(g => g.id === selectedGroupId);
      if (!group) throw new Error('Không tìm thấy project');

      addExportStep('Đang tải thông tin project...');
      setExportProgress(5);

      // Fetch core data with pagination
      const [membersData, stagesData, tasksData] = await Promise.all([
        paginatedFetch('group_members', [{ column: 'group_id', value: selectedGroupId }]),
        paginatedFetch('stages', [{ column: 'group_id', value: selectedGroupId }], { column: 'order_index' }),
        paginatedFetch('tasks', [{ column: 'group_id', value: selectedGroupId }]),
      ]);

      addExportStep('Đang tải hồ sơ thành viên...');
      setExportProgress(15);

      // Fetch profiles for members
      const memberUserIds = membersData.map((m: any) => m.user_id);
      const profilesData = memberUserIds.length > 0 
        ? await paginatedFetch('profiles', [{ column: 'id', value: memberUserIds, operator: 'in' }])
        : [];

      const userIdToStudentId = new Map<string, string>();
      (profilesData as any[]).forEach(p => userIdToStudentId.set(p.id, p.student_id));

      // Fetch task-related data with pagination
      const taskIds = tasksData.map((t: any) => t.id);
      const stageIds = stagesData.map((s: any) => s.id);

      const [assignmentsData, scoresData, submissionsData] = await Promise.all([
        taskIds.length > 0 ? paginatedFetch('task_assignments', [{ column: 'task_id', value: taskIds, operator: 'in' }]) : [],
        taskIds.length > 0 ? paginatedFetch('task_scores', [{ column: 'task_id', value: taskIds, operator: 'in' }]) : [],
        taskIds.length > 0 ? paginatedFetch('submission_history', [{ column: 'task_id', value: taskIds, operator: 'in' }]) : [],
      ]);

      addExportStep('Đang tải dữ liệu task & điểm số...');
      setExportProgress(25);

      // Fetch optional data based on export options
      let messagesData: any[] = [];
      let taskNotesData: any[] = [];
      let noteAttachmentsData: any[] = [];
      let taskCommentsData: any[] = [];
      let resourcesData: any[] = [];
      let resourceFoldersData: any[] = [];
      let activityLogsData: any[] = [];
      let stageWeightsData: any[] = [];
      let memberStageScoresData: any[] = [];
      let memberFinalScoresData: any[] = [];
      let scoreAppealsData: any[] = [];
      let scoreAdjustmentsData: any[] = [];
      let feedbacksData: any[] = [];
      let feedbackCommentsData: any[] = [];

      let meetingsData: any[] = [];
      let meetingAttendanceData: any[] = [];
      let meetingMessagesData: any[] = [];

      const optionalFetches: Promise<void>[] = [];

      // Always fetch meetings for raw_data
      optionalFetches.push(
        (async () => {
          meetingsData = await paginatedFetch('meetings', 
            [{ column: 'group_id', value: selectedGroupId }]
          );
        })()
      );

      if (exportOptions.includeMessages) {
        optionalFetches.push(
          (async () => {
            messagesData = await paginatedFetch('project_messages', 
              [{ column: 'group_id', value: selectedGroupId }],
              { column: 'created_at' }
            );
          })()
        );
      }

      if (exportOptions.includeTaskNotes && taskIds.length > 0) {
        optionalFetches.push(
          (async () => {
            taskNotesData = await paginatedFetch('task_notes', 
              [{ column: 'task_id', value: taskIds, operator: 'in' }],
              { column: 'created_at' }
            );
          })()
        );
      }

      if (exportOptions.includeTaskComments && taskIds.length > 0) {
        optionalFetches.push(
          (async () => {
            taskCommentsData = await paginatedFetch('task_comments', 
              [{ column: 'task_id', value: taskIds, operator: 'in' }],
              { column: 'created_at' }
            );
          })()
        );
      }

      if (exportOptions.includeResources) {
        optionalFetches.push(
          (async () => {
            resourcesData = await paginatedFetch('project_resources', 
              [{ column: 'group_id', value: selectedGroupId }]
            );
          })(),
          (async () => {
            resourceFoldersData = await paginatedFetch('resource_folders', 
              [{ column: 'group_id', value: selectedGroupId }]
            );
          })()
        );
      }

      if (exportOptions.includeActivityLogs) {
        optionalFetches.push(
          (async () => {
            activityLogsData = await paginatedFetch('activity_logs', 
              [{ column: 'group_id', value: selectedGroupId }],
              { column: 'created_at', ascending: false }
            );
          })()
        );
      }

      if (exportOptions.includeScores) {
        if (stageIds.length > 0) {
          optionalFetches.push(
            (async () => {
              stageWeightsData = await paginatedFetch('stage_weights', 
                [{ column: 'group_id', value: selectedGroupId }]
              );
            })(),
            (async () => {
              memberStageScoresData = await paginatedFetch('member_stage_scores', 
                [{ column: 'stage_id', value: stageIds, operator: 'in' }]
              );
            })(),
            (async () => {
              memberFinalScoresData = await paginatedFetch('member_final_scores', 
                [{ column: 'group_id', value: selectedGroupId }]
              );
            })()
          );
        }

        // Score adjustment history - fetch for all member user IDs
        if (memberUserIds.length > 0) {
          optionalFetches.push(
            (async () => {
              scoreAdjustmentsData = await paginatedFetch('score_adjustment_history', 
                [{ column: 'user_id', value: memberUserIds, operator: 'in' }]
              );
            })()
          );
        }
      }

      if (exportOptions.includeFeedbacks) {
        optionalFetches.push(
          (async () => {
            feedbacksData = await paginatedFetch('feedbacks', 
              [{ column: 'group_id', value: selectedGroupId }],
              { column: 'created_at' }
            );
          })()
        );
      }

      await Promise.all(optionalFetches);

      checkCancelled();
      addExportStep('Đang tải dữ liệu tùy chọn...');
      setExportProgress(35);

      // Fetch note attachments if task notes exist
      if (taskNotesData.length > 0) {
        const noteIds = taskNotesData.map((n: any) => n.id);
        noteAttachmentsData = await paginatedFetch('task_note_attachments', 
          [{ column: 'note_id', value: noteIds, operator: 'in' }]
        );
      }

      // Fetch feedback comments
      if (feedbacksData.length > 0) {
        const feedbackIds = feedbacksData.map((f: any) => f.id);
        feedbackCommentsData = await paginatedFetch('feedback_comments', 
          [{ column: 'feedback_id', value: feedbackIds, operator: 'in' }]
        );
      }

      // Fetch score appeals
      if (exportOptions.includeScores && taskIds.length > 0) {
        const taskScoreIds = (scoresData as any[]).map(s => s.id);
        const stageScoreIds = memberStageScoresData.map((s: any) => s.id);
        
        if (taskScoreIds.length > 0 || stageScoreIds.length > 0) {
          const allAppeals = await paginatedFetch('score_appeals', []);
          scoreAppealsData = allAppeals.filter((a: any) => 
            (a.task_score_id && taskScoreIds.includes(a.task_score_id)) ||
            (a.stage_score_id && stageScoreIds.includes(a.stage_score_id))
          );
        }
      }

      addExportStep('Đang kiểm tra liên kết dữ liệu...');
      setExportProgress(45);

      // Collect all files to download
      const filesToDownload: { path: string; name: string; size: number; bucket: string }[] = [];
      
      // Task submission files
      (tasksData as any[]).forEach(task => {
        const files = parseFileSubmissions(task.submission_link);
        files.forEach(f => filesToDownload.push({ path: f.file_path, name: f.file_name, size: f.file_size, bucket: 'task-submissions' }));
      });
      
      (submissionsData as any[]).forEach(sub => {
        if (sub.file_path && sub.file_name) {
          filesToDownload.push({ path: sub.file_path, name: sub.file_name, size: sub.file_size || 0, bucket: 'task-submissions' });
        }
        const files = parseFileSubmissions(sub.submission_link);
        files.forEach(f => filesToDownload.push({ path: f.file_path, name: f.file_name, size: f.file_size, bucket: 'task-submissions' }));
      });

      // Task note attachments
      noteAttachmentsData.forEach((att: any) => {
        filesToDownload.push({ path: att.file_path, name: att.file_name, size: att.file_size, bucket: 'task-note-attachments' });
      });

      // Project resources (only file-type resources)
      (resourcesData as any[]).forEach(res => {
        if (res.resource_type === 'file' && res.storage_name) {
          filesToDownload.push({ path: res.storage_name, name: res.name, size: res.file_size, bucket: 'project-resources' });
        }
      });

      // Group image
      if (group.image_url) {
        const parsedImg = parseStorageUrl(group.image_url);
        if (parsedImg) {
          filesToDownload.push({ path: parsedImg.path, name: 'group-image', size: 0, bucket: parsedImg.bucket });
        }
      }

      // Member avatars
      (profilesData as any[]).forEach(p => {
        if (p.avatar_url) {
          const parsedAvatar = parseStorageUrl(p.avatar_url);
          if (parsedAvatar) {
            filesToDownload.push({ path: parsedAvatar.path, name: `avatar-${p.student_id}`, size: 0, bucket: parsedAvatar.bucket });
          }
        }
      });

      // Remove duplicates
      const uniqueFiles = Array.from(new Map(filesToDownload.map(f => [`${f.bucket}/${f.path}`, f])).values());

      checkCancelled();
      addExportStep('Đang chuẩn bị dữ liệu sao lưu...');
      setExportProgress(50);

      // Build backup data
      const membersWithProfiles = (membersData as any[]).map(m => {
        const profile = (profilesData as any[]).find(p => p.id === m.user_id);
        return {
          user_id: m.user_id,
          role: m.role,
          joined_at: m.joined_at,
          profile: {
            student_id: profile?.student_id || '',
            full_name: profile?.full_name || '',
            email: profile?.email || '',
            avatar_url: profile?.avatar_url || null
          }
        };
      });

      const stagesMap = new Map<string, string>();
      (stagesData as any[]).forEach(s => stagesMap.set(s.id, s.name));

      const taskIdToTitle = new Map<string, string>();
      (tasksData as any[]).forEach(t => taskIdToTitle.set(t.id, t.title));

      const tasksWithDetails = (tasksData as any[]).map(task => {
        const taskAssignments = (assignmentsData as any[]).filter(a => a.task_id === task.id);
        const taskScores = (scoresData as any[]).filter(s => s.task_id === task.id);
        const taskSubmissions = (submissionsData as any[]).filter(s => s.task_id === task.id);

        return {
          title: task.title,
          description: task.description,
          status: task.status,
          deadline: task.deadline,
          extended_deadline: task.extended_deadline,
          submission_link: task.submission_link,
          stage_name: task.stage_id ? stagesMap.get(task.stage_id) || null : null,
          max_file_size: task.max_file_size,
          is_hidden: task.is_hidden,
          assignments: taskAssignments.map(a => ({
            student_id: userIdToStudentId.get(a.user_id) || ''
          })),
          scores: taskScores.map(s => ({
            student_id: userIdToStudentId.get(s.user_id) || '',
            base_score: s.base_score,
            late_penalty: s.late_penalty,
            review_penalty: s.review_penalty,
            review_count: s.review_count,
            early_bonus: s.early_bonus,
            bug_hunter_bonus: s.bug_hunter_bonus,
            final_score: s.final_score,
            adjustment: s.adjustment,
            adjustment_reason: s.adjustment_reason
          })),
          submissions: taskSubmissions.map(s => ({
            student_id: userIdToStudentId.get(s.user_id) || '',
            submission_link: s.submission_link,
            note: s.note,
            submitted_at: s.submitted_at,
            submission_type: s.submission_type,
            file_path: s.file_path,
            file_name: s.file_name,
            file_size: s.file_size
          }))
        };
      });

      // Process messages
      const messagesForBackup: BackupMessage[] = messagesData.map((msg: any) => ({
        student_id: userIdToStudentId.get(msg.user_id) || '',
        content: msg.content,
        source_type: msg.source_type,
        created_at: msg.created_at
      }));

      // Process task notes
      const taskNotesForBackup: BackupTaskNote[] = taskNotesData.map((note: any) => ({
        task_title: taskIdToTitle.get(note.task_id) || '',
        version_name: note.version_name,
        content: note.content,
        created_by_student_id: userIdToStudentId.get(note.created_by) || '',
        created_at: note.created_at,
        attachments: noteAttachmentsData
          .filter((att: any) => att.note_id === note.id)
          .map((att: any) => ({
            file_name: att.file_name,
            file_size: att.file_size,
            original_path: att.file_path
          }))
      }));

      // Process task comments
      const commentIdToIndex = new Map<string, number>();
      taskCommentsData.forEach((c: any, idx: number) => commentIdToIndex.set(c.id, idx));

      const taskCommentsForBackup: BackupTaskComment[] = taskCommentsData.map((comment: any) => ({
        task_title: taskIdToTitle.get(comment.task_id) || '',
        student_id: userIdToStudentId.get(comment.user_id) || '',
        content: comment.content,
        parent_index: comment.parent_id ? commentIdToIndex.get(comment.parent_id) ?? null : null,
        created_at: comment.created_at
      }));

      // Process resource folders
      const folderIdToName = new Map<string, string>();
      resourceFoldersData.forEach((f: any) => folderIdToName.set(f.id, f.name));

      const resourceFoldersForBackup: BackupResourceFolder[] = resourceFoldersData.map((folder: any) => ({
        name: folder.name,
        description: folder.description,
        created_by_student_id: userIdToStudentId.get(folder.created_by) || '',
        created_at: folder.created_at
      }));

      // Process resources
      const resourcesForBackup: BackupResource[] = resourcesData.map((res: any) => ({
        name: res.name,
        description: res.description,
        file_path: res.file_path,
        file_size: res.file_size,
        file_type: res.file_type,
        category: res.category,
        folder_name: res.folder_id ? folderIdToName.get(res.folder_id) || null : null,
        uploaded_by_student_id: userIdToStudentId.get(res.uploaded_by) || '',
        created_at: res.created_at,
        resource_type: res.resource_type || 'file',
        link_url: res.link_url,
        storage_name: res.storage_name
      }));

      // Process activity logs
      const activityLogsForBackup: BackupActivityLog[] = activityLogsData.map((log: any) => ({
        action: log.action,
        action_type: log.action_type,
        description: log.description,
        user_name: log.user_name,
        student_id: userIdToStudentId.get(log.user_id) || '',
        created_at: log.created_at,
        metadata: log.metadata
      }));

      // Process stage weights
      const stageWeightsForBackup: BackupStageWeight[] = stageWeightsData.map((sw: any) => ({
        stage_name: stagesMap.get(sw.stage_id) || '',
        weight: sw.weight
      }));

      // Process member stage scores
      const memberStageScoresForBackup: BackupMemberStageScore[] = memberStageScoresData.map((mss: any) => ({
        student_id: userIdToStudentId.get(mss.user_id) || '',
        stage_name: stagesMap.get(mss.stage_id) || '',
        average_score: mss.average_score,
        k_coefficient: mss.k_coefficient,
        adjusted_score: mss.adjusted_score,
        final_stage_score: mss.final_stage_score,
        late_task_count: mss.late_task_count,
        early_submission_bonus: mss.early_submission_bonus,
        bug_hunter_bonus: mss.bug_hunter_bonus
      }));

      // Process member final scores
      const memberFinalScoresForBackup: BackupMemberFinalScore[] = memberFinalScoresData.map((mfs: any) => ({
        student_id: userIdToStudentId.get(mfs.user_id) || '',
        weighted_average: mfs.weighted_average,
        adjustment: mfs.adjustment,
        final_score: mfs.final_score
      }));

      // Process score appeals
      const taskScoreIdToTaskTitle = new Map<string, string>();
      const stageScoreIdToStageName = new Map<string, string>();
      (scoresData as any[]).forEach(s => {
        const taskTitle = taskIdToTitle.get(s.task_id);
        if (taskTitle) taskScoreIdToTaskTitle.set(s.id, taskTitle);
      });
      memberStageScoresData.forEach((s: any) => {
        const stageName = stagesMap.get(s.stage_id);
        if (stageName) stageScoreIdToStageName.set(s.id, stageName);
      });

      const scoreAppealsForBackup: BackupScoreAppeal[] = scoreAppealsData.map((appeal: any) => ({
        student_id: userIdToStudentId.get(appeal.user_id) || '',
        task_title: appeal.task_score_id ? taskScoreIdToTaskTitle.get(appeal.task_score_id) || null : null,
        stage_name: appeal.stage_score_id ? stageScoreIdToStageName.get(appeal.stage_score_id) || null : null,
        reason: appeal.reason,
        status: appeal.status,
        reviewer_student_id: appeal.reviewer_id ? userIdToStudentId.get(appeal.reviewer_id) || null : null,
        reviewer_response: appeal.reviewer_response,
        created_at: appeal.created_at
      }));

      // Process score adjustments
      const scoreAdjustmentsForBackup: BackupScoreAdjustment[] = scoreAdjustmentsData.map((adj: any) => ({
        student_id: userIdToStudentId.get(adj.user_id) || '',
        adjustment_type: adj.adjustment_type,
        previous_score: adj.previous_score,
        new_score: adj.new_score,
        adjustment_value: adj.adjustment_value,
        reason: adj.reason,
        adjusted_by_student_id: userIdToStudentId.get(adj.adjusted_by) || '',
        created_at: adj.created_at
      }));

      // Process feedbacks with comments
      const feedbacksForBackup: BackupFeedback[] = feedbacksData.map((fb: any) => ({
        student_id: userIdToStudentId.get(fb.user_id) || '',
        title: fb.title,
        content: fb.content,
        type: fb.type,
        priority: fb.priority,
        status: fb.status,
        admin_response: fb.admin_response,
        responded_by_student_id: fb.responded_by ? userIdToStudentId.get(fb.responded_by) || null : null,
        responded_at: fb.responded_at,
        created_at: fb.created_at,
        comments: feedbackCommentsData
          .filter((c: any) => c.feedback_id === fb.id)
          .map((c: any) => ({
            student_id: userIdToStudentId.get(c.user_id) || '',
            content: c.content,
            is_admin: c.is_admin,
            created_at: c.created_at
          }))
      }));

      checkCancelled();
      addExportStep('Đang xử lý & đóng gói dữ liệu...');
      setExportProgress(55);

      // Create ZIP file with organized folder structure
      const zip = new JSZip();
      const fileMapping: FileSubmission[] = [];

      // Create organized folders
      const submissionsFolder = zip.folder('files/submissions');
      const resourcesFolder = zip.folder('files/resources');
      const noteAttachmentsFolder = zip.folder('files/note-attachments');

      // Download and add files to ZIP with organized structure
      if (uniqueFiles.length > 0) {
        let filesProcessed = 0;
        
        for (const file of uniqueFiles) {
          try {
            const { data } = r2Storage
              .from(file.bucket)
              .getPublicUrl(file.path);
            
            if (data?.publicUrl) {
              const response = await fetch(data.publicUrl);
              if (response.ok) {
                const blob = await response.blob();
                const safeFileName = `${file.path.replace(/\//g, '_')}`;
                
                // Organize by bucket type
                let targetFolder: JSZip | null = null;
                let zipSubPath = '';
                
                switch (file.bucket) {
                  case 'task-submissions':
                    targetFolder = submissionsFolder;
                    zipSubPath = `files/submissions/${safeFileName}`;
                    break;
                  case 'project-resources':
                    targetFolder = resourcesFolder;
                    zipSubPath = `files/resources/${safeFileName}`;
                    break;
                  case 'task-note-attachments':
                    targetFolder = noteAttachmentsFolder;
                    zipSubPath = `files/note-attachments/${safeFileName}`;
                    break;
                  case 'group-images':
                    targetFolder = zip.folder('files/group-images');
                    zipSubPath = `files/group-images/${safeFileName}`;
                    break;
                  case 'avatars':
                    targetFolder = zip.folder('files/avatars');
                    zipSubPath = `files/avatars/${safeFileName}`;
                    break;
                  default:
                    targetFolder = zip.folder('files/other');
                    zipSubPath = `files/other/${safeFileName}`;
                }
                
                targetFolder?.file(safeFileName, blob);
                fileMapping.push({
                  original_path: file.path,
                  file_name: file.name,
                  file_size: file.size,
                  zip_path: zipSubPath,
                  bucket: file.bucket
                });
              }
            }
          } catch (err) {
            console.warn(`Could not download file: ${file.path}`, err);
          }
          
          filesProcessed++;
          const fileProgress = 55 + Math.round((filesProcessed / uniqueFiles.length) * 30);
          setExportProgress(fileProgress);
          setExportStepLabel(`Đang tải file ${filesProcessed}/${uniqueFiles.length}...`);
        }
      }

      addExportStep('Đang tạo file JSON & manifest...');
      setExportProgress(88);

      // Fetch meeting sub-data
      if (meetingsData.length > 0) {
        const meetingIds = meetingsData.map((m: any) => m.id);
        const [attData, msgData] = await Promise.all([
          paginatedFetch('meeting_attendance', [{ column: 'meeting_id', value: meetingIds, operator: 'in' }]),
          paginatedFetch('meeting_messages', [{ column: 'meeting_id', value: meetingIds, operator: 'in' }]),
        ]);
        meetingAttendanceData = attData;
        meetingMessagesData = msgData;
      }

      const backupData: BackupData = {
        version: '6.0',
        exported_at: new Date().toISOString(),
        project_name: group.name,
        group: {
          name: group.name,
          description: group.description,
          class_code: group.class_code,
          instructor_name: group.instructor_name,
          instructor_email: group.instructor_email,
          additional_info: group.additional_info,
          zalo_link: group.zalo_link,
          leader_id: null,
          created_by: group.created_by,
          created_at: group.created_at,
          updated_at: group.updated_at,
          image_url: group.image_url,
          is_public: group.is_public,
          share_token: null,
          show_activity_public: group.show_activity_public,
          show_members_public: group.show_members_public,
          show_resources_public: group.show_resources_public
        },
        members: membersWithProfiles,
        stages: (stagesData as any[]).map(s => ({
          name: s.name,
          description: s.description,
          order_index: s.order_index,
          start_date: s.start_date,
          end_date: s.end_date,
          weight: s.weight,
          is_hidden: s.is_hidden
        })),
        tasks: tasksWithDetails,
        messages: exportOptions.includeMessages ? messagesForBackup : undefined,
        task_notes: exportOptions.includeTaskNotes ? taskNotesForBackup : undefined,
        task_comments: exportOptions.includeTaskComments ? taskCommentsForBackup : undefined,
        resources: exportOptions.includeResources ? resourcesForBackup : undefined,
        resource_folders: exportOptions.includeResources ? resourceFoldersForBackup : undefined,
        activity_logs: exportOptions.includeActivityLogs ? activityLogsForBackup : undefined,
        stage_weights: exportOptions.includeScores ? stageWeightsForBackup : undefined,
        member_stage_scores: exportOptions.includeScores ? memberStageScoresForBackup : undefined,
        member_final_scores: exportOptions.includeScores ? memberFinalScoresForBackup : undefined,
        score_appeals: exportOptions.includeScores ? scoreAppealsForBackup : undefined,
        score_adjustments: exportOptions.includeScores ? scoreAdjustmentsForBackup : undefined,
        feedbacks: exportOptions.includeFeedbacks ? feedbacksForBackup : undefined,
        files: fileMapping,
        raw_data: {
          group: { ...group, id: selectedGroupId },
          group_members: membersData as any[],
          profiles: profilesData as any[],
          stages: stagesData as any[],
          tasks: tasksData as any[],
          task_assignments: assignmentsData as any[],
          task_scores: scoresData as any[],
          submission_history: submissionsData as any[],
          project_messages: messagesData,
          task_notes: taskNotesData,
          task_note_attachments: noteAttachmentsData,
          task_comments: taskCommentsData,
          project_resources: resourcesData,
          resource_folders: resourceFoldersData,
          activity_logs: activityLogsData,
          stage_weights: stageWeightsData,
          member_stage_scores: memberStageScoresData,
          member_final_scores: memberFinalScoresData,
          score_appeals: scoreAppealsData,
          score_adjustment_history: scoreAdjustmentsData,
          feedbacks: feedbacksData,
          feedback_comments: feedbackCommentsData,
          meetings: meetingsData,
          meeting_attendance: meetingAttendanceData,
          meeting_messages: meetingMessagesData,
        }
      };

      // Generate integrity manifest
      const backupJson = JSON.stringify(backupData, null, 2);
      const recordCounts: Record<string, number> = {
        members: membersWithProfiles.length,
        stages: backupData.stages.length,
        tasks: tasksWithDetails.length,
        messages: messagesForBackup.length,
        task_notes: taskNotesForBackup.length,
        task_comments: taskCommentsForBackup.length,
        resources: resourcesForBackup.length,
        resource_folders: resourceFoldersForBackup.length,
        activity_logs: activityLogsForBackup.length,
        stage_weights: stageWeightsForBackup.length,
        member_stage_scores: memberStageScoresForBackup.length,
        member_final_scores: memberFinalScoresForBackup.length,
        score_appeals: scoreAppealsForBackup.length,
        score_adjustments: scoreAdjustmentsForBackup.length,
        feedbacks: feedbacksForBackup.length,
      };

      const totalFileSize = fileMapping.reduce((sum, f) => sum + f.file_size, 0);

      const manifest: BackupManifest = {
        version: '6.0',
        exported_at: new Date().toISOString(),
        project_name: group.name,
        record_counts: recordCounts,
        file_count: fileMapping.length,
        total_file_size: totalFileSize,
        checksum: generateChecksum(backupJson),
      };

      backupData.manifest = manifest;

      // Write files to ZIP
      zip.file('backup.json', JSON.stringify(backupData, null, 2));
      zip.file('manifest.json', JSON.stringify(manifest, null, 2));

      addExportStep('Đang tạo báo cáo PDF minh chứng...');
      setExportProgress(92);

      // Generate evidence PDF and add to ZIP
      try {
        const membersFull = (membersData as any[]).map(m => {
          const profile = (profilesData as any[]).find(p => p.id === m.user_id);
          return { ...m, profiles: profile };
        });

        const tasksFull = (tasksData as any[]).map(task => {
          const taskAssignments = (assignmentsData as any[]).filter(a => a.task_id === task.id);
          const assigneeProfilesLocal = taskAssignments.map(a => {
            const prof = (profilesData as any[]).find(p => p.id === a.user_id);
            return { ...a, profiles: prof };
          });
          return { ...task, task_assignments: assigneeProfilesLocal };
        });

        const evidenceOptions: EvidenceExportOptions = {
          includeMembers: true,
          includeTasks: true,
          includeScores: exportOptions.includeScores,
          includeResources: exportOptions.includeResources,
          includeLogs: exportOptions.includeActivityLogs,
          includeMeetings: true,
          includeSubmissions: true,
        };

        const evidenceData: EvidenceExportData = {
          project: group as any,
          members: membersFull as any,
          stages: stagesData as any,
          tasks: tasksFull as any,
          taskScores: scoresData as any[],
          stageScores: memberStageScoresData,
          finalScores: memberFinalScoresData,
          scoreAppeals: scoreAppealsData,
          resources: resourcesData,
          activityLogs: activityLogsData,
          meetings: [],
          meetingAttendance: [],
          submissions: [],
          stageWeights: [],
          options: evidenceOptions,
        };

        const { blob: pdfBlob, fileName: pdfFileName } = await generateProjectEvidencePdfBlob(evidenceData);
        zip.file(pdfFileName, pdfBlob);
      } catch (pdfError) {
        console.warn('Could not generate evidence PDF:', pdfError);
      }

      addExportStep('Đang nén file ZIP...');
      setExportProgress(95);

      const blob = await zip.generateAsync({ type: 'blob' });
      const fileName = `${group.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.zip`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addExportStep('Hoàn tất sao lưu!');
      setExportProgress(100);

      // Generate report
      setExportReport({
        status: 'success',
        projectName: group.name,
        duration: Date.now() - exportStartTime.current,
        recordCounts,
        fileCount: fileMapping.length,
        zipSize: blob.size,
        checksum: manifest.checksum,
        errors: [],
      });

    } catch (error) {
      const isCancelled = String(error) === 'Error: CANCELLED' || cancelRef.current;
      if (!isCancelled) {
        console.error('Export error:', error);
        addExportStep(`Lỗi: ${String(error)}`);
        setExportReport({
          status: 'error',
          projectName: groups.find(g => g.id === selectedGroupId)?.name || '',
          duration: Date.now() - exportStartTime.current,
          recordCounts: {},
          fileCount: 0,
          zipSize: 0,
          errors: [String(error)],
        });
        toast({ title: 'Lỗi xuất dữ liệu', description: String(error), variant: 'destructive' });
      }
    } finally {
      setIsExporting(false);
    }
  };

  const importProject = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress('Đang đọc file...');
    setImportSteps([]);
    setImportReport(null);
    setImportProgressPercent(0);
    setShowMainDialog(true);
    cancelRef.current = false;
    importStartTime.current = Date.now();
    addImportStep('Đang đọc file ZIP...', 2);

    try {
      const zip = await JSZip.loadAsync(file);
      const backupFile = zip.file('backup.json');
      if (!backupFile) {
        throw new Error('File backup.json không tồn tại trong tệp ZIP');
      }

      const content = await backupFile.async('string');
      const backupData: BackupData = JSON.parse(content);

      if (!backupData.version || !backupData.group) {
        throw new Error('Định dạng file backup không hợp lệ');
      }

      // Verify integrity if manifest exists
      if (backupData.manifest) {
        addImportStep('Đang kiểm tra tính toàn vẹn dữ liệu...', 5);
        
        const manifest = backupData.manifest;
        const integrityIssues: string[] = [];

        // Check record counts
        const countChecks: [string, any[] | undefined][] = [
          ['members', backupData.members],
          ['stages', backupData.stages],
          ['tasks', backupData.tasks],
          ['messages', backupData.messages],
          ['task_notes', backupData.task_notes],
          ['task_comments', backupData.task_comments],
          ['resources', backupData.resources],
          ['resource_folders', backupData.resource_folders],
          ['activity_logs', backupData.activity_logs],
          ['feedbacks', backupData.feedbacks],
          ['score_adjustments', backupData.score_adjustments],
        ];

        for (const [key, arr] of countChecks) {
          const expected = manifest.record_counts[key] || 0;
          const actual = arr?.length || 0;
          if (expected > 0 && actual !== expected) {
            integrityIssues.push(`${key}: mong đợi ${expected}, thực tế ${actual}`);
          }
        }

        // Check file count
        const actualFiles = backupData.files?.length || 0;
        if (manifest.file_count > 0 && actualFiles !== manifest.file_count) {
          integrityIssues.push(`files: mong đợi ${manifest.file_count}, thực tế ${actualFiles}`);
        }

        if (integrityIssues.length > 0) {
          console.warn('Integrity issues:', integrityIssues);
          toast({
            title: 'Cảnh báo toàn vẹn dữ liệu',
            description: `Phát hiện ${integrityIssues.length} vấn đề: ${integrityIssues.join('; ')}. Tiếp tục khôi phục...`,
          });
        } else {
          console.log('Integrity check passed ✓');
        }
      }

      checkCancelled();

      // ============ V6.0 EXACT RESTORATION ============
      if (backupData.raw_data) {
        const raw = backupData.raw_data;
        const STORAGE_BUCKETS = ['avatars', 'task-submissions', 'appeal-attachments', 'task-note-attachments', 'group-images', 'project-resources', 'system-assets', 'profile-achievements'];

        const remapValue = (val: any): any => {
          if (typeof val === 'string') {
            return val.replace(
              /https?:\/\/[^/]+\/storage\/v1\/object\/public\/([^/]+)\/(.+?)(?=["'\s,}\]]|$)/g,
              (_match: string, bucket: string, path: string) => {
                if (STORAGE_BUCKETS.includes(bucket)) {
                  const { data } = r2Storage.from(bucket).getPublicUrl(decodeURIComponent(path));
                  return data.publicUrl;
                }
                return _match;
              }
            );
          }
          if (Array.isArray(val)) return val.map(remapValue);
          if (val && typeof val === 'object') {
            const out: any = {};
            for (const k of Object.keys(val)) out[k] = remapValue(val[k]);
            return out;
          }
          return val;
        };

        // 0. Restore members - create accounts if needed
        addImportStep('Đang khôi phục thành viên & tạo tài khoản...', 8);
        let userIdMapping: Record<string, string> = {};
        let membersCreated = 0;
        let membersExisting = 0;

        if (raw.profiles && raw.profiles.length > 0) {
          try {
            const { data: restoreResult, error: restoreError } = await supabase.functions.invoke('manage-users', {
              body: {
                action: 'restore_members',
                profiles: raw.profiles,
              }
            });

            if (restoreError) {
              console.error('restore_members error:', restoreError);
            } else if (restoreResult?.mapping) {
              userIdMapping = restoreResult.mapping;
              membersCreated = restoreResult.created || 0;
              membersExisting = restoreResult.existing || 0;
              console.log(`Members restored: ${membersCreated} created, ${membersExisting} existing`);
            }
          } catch (err) {
            console.error('Failed to restore members:', err);
          }
        }

        // Helper to remap a user_id field
        const remapUserId = (id: string | null | undefined): string | null | undefined => {
          if (!id) return id;
          return userIdMapping[id] || id;
        };

        // Remap user IDs across all raw data tables
        const hasRemapping = Object.entries(userIdMapping).some(([oldId, newId]) => oldId !== newId);
        
        if (hasRemapping) {
          addImportStep('Đang ánh xạ lại ID thành viên...', 12);

          if (raw.group) {
            raw.group.leader_id = remapUserId(raw.group.leader_id);
            raw.group.created_by = remapUserId(raw.group.created_by);
          }
          if (raw.group_members) {
            raw.group_members = raw.group_members.map((m: any) => ({ ...m, user_id: remapUserId(m.user_id) }));
          }
          if (raw.profiles) {
            raw.profiles = raw.profiles.map((p: any) => ({ ...p, id: remapUserId(p.id) }));
          }
          if (raw.tasks) {
            raw.tasks = raw.tasks.map((t: any) => ({ ...t, created_by: remapUserId(t.created_by) }));
          }
          if (raw.task_assignments) {
            raw.task_assignments = raw.task_assignments.map((a: any) => ({ ...a, user_id: remapUserId(a.user_id) }));
          }
          if (raw.task_scores) {
            raw.task_scores = raw.task_scores.map((s: any) => ({ ...s, user_id: remapUserId(s.user_id), adjusted_by: remapUserId(s.adjusted_by) }));
          }
          if (raw.submission_history) {
            raw.submission_history = raw.submission_history.map((s: any) => ({ ...s, user_id: remapUserId(s.user_id) }));
          }
          if (raw.project_messages) {
            raw.project_messages = raw.project_messages.map((m: any) => ({ ...m, user_id: remapUserId(m.user_id) }));
          }
          if (raw.task_notes) {
            raw.task_notes = raw.task_notes.map((n: any) => ({ ...n, created_by: remapUserId(n.created_by) }));
          }
          if (raw.task_comments) {
            raw.task_comments = raw.task_comments.map((c: any) => ({ ...c, user_id: remapUserId(c.user_id) }));
          }
          if (raw.project_resources) {
            raw.project_resources = raw.project_resources.map((r: any) => ({ ...r, uploaded_by: remapUserId(r.uploaded_by) }));
          }
          if (raw.resource_folders) {
            raw.resource_folders = raw.resource_folders.map((f: any) => ({ ...f, created_by: remapUserId(f.created_by) }));
          }
          if (raw.activity_logs) {
            raw.activity_logs = raw.activity_logs.map((l: any) => ({ ...l, user_id: remapUserId(l.user_id) }));
          }
          if (raw.member_stage_scores) {
            raw.member_stage_scores = raw.member_stage_scores.map((s: any) => ({ ...s, user_id: remapUserId(s.user_id) }));
          }
          if (raw.member_final_scores) {
            raw.member_final_scores = raw.member_final_scores.map((s: any) => ({ ...s, user_id: remapUserId(s.user_id) }));
          }
          if (raw.score_appeals) {
            raw.score_appeals = raw.score_appeals.map((a: any) => ({ ...a, user_id: remapUserId(a.user_id), reviewer_id: remapUserId(a.reviewer_id) }));
          }
          if (raw.score_adjustment_history) {
            raw.score_adjustment_history = raw.score_adjustment_history.map((a: any) => ({ ...a, user_id: remapUserId(a.user_id), adjusted_by: remapUserId(a.adjusted_by) }));
          }
          if (raw.feedbacks) {
            raw.feedbacks = raw.feedbacks.map((f: any) => ({ ...f, user_id: remapUserId(f.user_id), responded_by: remapUserId(f.responded_by) }));
          }
          if (raw.feedback_comments) {
            raw.feedback_comments = raw.feedback_comments.map((c: any) => ({ ...c, user_id: remapUserId(c.user_id) }));
          }
          if (raw.meetings) {
            raw.meetings = raw.meetings.map((m: any) => ({ ...m, created_by: remapUserId(m.created_by) }));
          }
          if (raw.meeting_attendance) {
            raw.meeting_attendance = raw.meeting_attendance.map((a: any) => ({ ...a, user_id: remapUserId(a.user_id), marked_by: remapUserId(a.marked_by) }));
          }
          if (raw.meeting_messages) {
            raw.meeting_messages = raw.meeting_messages.map((m: any) => ({ ...m, user_id: remapUserId(m.user_id) }));
          }
        }

        // 1. Upload files to original paths
        addImportStep('Đang khôi phục file đính kèm...', 15);
        let filesUploaded = 0;
        if (backupData.files && backupData.files.length > 0) {
          for (const fileInfo of backupData.files) {
            try {
              const zipPath = fileInfo.zip_path.startsWith('files/') ? fileInfo.zip_path : `files/${fileInfo.zip_path}`;
              let fileContent = await zip.file(zipPath)?.async('blob');
              if (!fileContent) {
                const oldPath = `files/${fileInfo.zip_path.replace('files/', '').replace(/^(submissions|resources|note-attachments)\//, '')}`;
                fileContent = await zip.file(oldPath)?.async('blob');
              }
              if (fileContent) {
                const bucket = fileInfo.bucket || 'task-submissions';
                await r2Storage.from(bucket).upload(fileInfo.original_path, fileContent, { upsert: true });
                filesUploaded++;
              }
            } catch (err) {
              console.warn(`Could not restore file: ${fileInfo.file_name}`, err);
            }
            setImportProgressPercent(15 + Math.round(((filesUploaded) / backupData.files.length) * 20));
            setImportStepLabel(`Đang tải file ${filesUploaded}/${backupData.files.length}...`);
          }
        }

        // 2. Upsert profiles first (with remapped IDs)
        addImportStep('Đang cập nhật hồ sơ thành viên...', 38);
        if (raw.profiles && raw.profiles.length > 0) {
          const remappedProfiles = raw.profiles.map((p: any) => remapValue(p));
          for (let i = 0; i < remappedProfiles.length; i += 500) {
            const chunk = remappedProfiles.slice(i, i + 500);
            const { error } = await (supabase.from as any)('profiles').upsert(chunk, { onConflict: 'id' });
            if (error) console.warn('Upsert profiles error:', error);
          }
        }

        // 3. Upsert all tables in dependency order
        const upsertTable = async (table: string, rows: any[] | undefined, step: string, percent: number) => {
          if (!rows || rows.length === 0) return;
          checkCancelled();
          addImportStep(step, percent);
          const remapped = rows.map(row => remapValue(row));
          for (let i = 0; i < remapped.length; i += 500) {
            const chunk = remapped.slice(i, i + 500);
            const { error } = await (supabase.from as any)(table).upsert(chunk, { onConflict: 'id' });
            if (error) console.warn(`Upsert ${table} error:`, error);
          }
        };

        // Delete existing group if exists (cascade will clean children)
        addImportStep('Đang chuẩn bị khôi phục...', 40);
        if (raw.group?.id) {
          await supabase.from('groups').delete().eq('id', raw.group.id);
        }

        // Insert group with current user as owner
        addImportStep('Đang khôi phục project...', 42);
        const groupRow = remapValue({ ...raw.group });
        groupRow.leader_id = user!.id;
        groupRow.created_by = user!.id;
        await (supabase.from as any)('groups').upsert(groupRow, { onConflict: 'id' });

        // Ensure current user is a member
        const currentUserMember = raw.group_members?.find((m: any) => m.user_id === user!.id);
        if (!currentUserMember) {
          await supabase.from('group_members').upsert({
            group_id: raw.group.id,
            user_id: user!.id,
            role: 'leader'
          }, { onConflict: 'id' } as any);
        }

        await upsertTable('group_members', raw.group_members, 'Đang khôi phục thành viên...', 45);
        await upsertTable('stages', raw.stages, 'Đang khôi phục giai đoạn...', 50);
        await upsertTable('stage_weights', raw.stage_weights, 'Đang khôi phục trọng số...', 53);
        await upsertTable('tasks', raw.tasks, 'Đang khôi phục task...', 55);
        await upsertTable('task_assignments', raw.task_assignments, 'Đang khôi phục phân công...', 58);
        await upsertTable('task_scores', raw.task_scores, 'Đang khôi phục điểm task...', 60);
        await upsertTable('submission_history', raw.submission_history, 'Đang khôi phục nộp bài...', 63);
        await upsertTable('task_notes', raw.task_notes, 'Đang khôi phục ghi chú...', 65);
        await upsertTable('task_note_attachments', raw.task_note_attachments, 'Đang khôi phục file ghi chú...', 68);
        await upsertTable('task_comments', raw.task_comments, 'Đang khôi phục bình luận...', 70);
        await upsertTable('resource_folders', raw.resource_folders, 'Đang khôi phục thư mục...', 73);
        await upsertTable('project_resources', raw.project_resources, 'Đang khôi phục tài nguyên...', 75);
        await upsertTable('project_messages', raw.project_messages, 'Đang khôi phục tin nhắn...', 78);
        await upsertTable('activity_logs', raw.activity_logs, 'Đang khôi phục nhật ký...', 80);
        await upsertTable('member_stage_scores', raw.member_stage_scores, 'Đang khôi phục điểm GĐ...', 83);
        await upsertTable('member_final_scores', raw.member_final_scores, 'Đang khôi phục điểm TK...', 85);
        await upsertTable('score_appeals', raw.score_appeals, 'Đang khôi phục khiếu nại...', 88);
        await upsertTable('score_adjustment_history', raw.score_adjustment_history, 'Đang khôi phục điều chỉnh...', 90);
        await upsertTable('feedbacks', raw.feedbacks, 'Đang khôi phục phản hồi...', 93);
        await upsertTable('feedback_comments', raw.feedback_comments, 'Đang khôi phục bình luận PH...', 95);
        await upsertTable('meetings', raw.meetings, 'Đang khôi phục cuộc họp...', 96);
        await upsertTable('meeting_attendance', raw.meeting_attendance, 'Đang khôi phục điểm danh...', 97);
        await upsertTable('meeting_messages', raw.meeting_messages, 'Đang khôi phục tin nhắn họp...', 98);

        if (membersCreated > 0) {
          addImportStep(`Hoàn tất! Đã tạo ${membersCreated} tài khoản mới, ${membersExisting} tài khoản đã có.`, 100);
        } else {
          addImportStep('Hoàn tất khôi phục!', 100);
        }

        // Count records
        const importRecordCounts: Record<string, number> = {};
        for (const [key, val] of Object.entries(raw)) {
          if (Array.isArray(val)) importRecordCounts[key] = val.length;
        }
        importRecordCounts.files = filesUploaded;
        if (membersCreated > 0) importRecordCounts.members_created = membersCreated;
        if (membersExisting > 0) importRecordCounts.members_existing = membersExisting;

        setImportReport({
          status: 'success',
          projectName: backupData.project_name,
          duration: Date.now() - importStartTime.current,
          recordCounts: importRecordCounts,
          fileCount: filesUploaded,
          zipSize: file.size,
          errors: [],
        });

        fetchAllGroups();
        return;
      }

      // ============ LEGACY V5.0 IMPORT (backward compatible) ============
      addImportStep('Đang tạo project mới...', 10);

      // Create new group
      const { data: newGroup, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: `${backupData.group.name} (Bản sao)`,
          description: backupData.group.description,
          class_code: backupData.group.class_code,
          instructor_name: backupData.group.instructor_name,
          instructor_email: backupData.group.instructor_email,
          additional_info: backupData.group.additional_info,
          zalo_link: backupData.group.zalo_link,
          leader_id: user!.id,
          created_by: user!.id,
          image_url: backupData.group.image_url,
          is_public: false,
          show_activity_public: backupData.group.show_activity_public ?? true,
          show_members_public: backupData.group.show_members_public ?? true,
          show_resources_public: backupData.group.show_resources_public ?? true,
          slug: '',
        })
        .select()
        .single();

      if (groupError || !newGroup) {
        throw new Error(`Không thể tạo project: ${groupError?.message}`);
      }

      const newGroupId = newGroup.id;

      // Add current user as leader
      await supabase.from('group_members').insert({
        group_id: newGroupId,
        user_id: user!.id,
        role: 'leader'
      });

      addImportStep('Đang xử lý thành viên...', 15);

      // Map student IDs to user IDs
      const studentIdToUserId = new Map<string, string>();
      studentIdToUserId.set(
        backupData.members.find(m => m.user_id === backupData.group.created_by)?.profile.student_id || '',
        user!.id
      );

      for (const member of backupData.members) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, student_id')
          .eq('student_id', member.profile.student_id)
          .maybeSingle();

        if (existingProfile) {
          studentIdToUserId.set(member.profile.student_id, existingProfile.id);
          
          if (existingProfile.id !== user!.id) {
            await supabase.from('group_members').insert({
              group_id: newGroupId,
              user_id: existingProfile.id,
              role: member.role as 'owner_system' | 'leader' | 'member'
            }).then(() => {});
          }
        }
      }

      // Upload files from ZIP
      addImportStep('Đang khôi phục file đính kèm...', 20);
      const oldToNewPath = new Map<string, { path: string; bucket: string }>();

      const generateSafeStorageName = (fileName: string): string => {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const ext = fileName.includes('.') ? '.' + fileName.split('.').pop() : '';
        const baseName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 50);
        return `${timestamp}_${random}_${baseName}${ext ? '' : ''}`;
      };

      if (backupData.files && backupData.files.length > 0) {
        for (const fileInfo of backupData.files) {
          try {
            // Support both old flat structure (files/xxx) and new organized structure (files/submissions/xxx)
            const zipPath = fileInfo.zip_path.startsWith('files/') ? fileInfo.zip_path : `files/${fileInfo.zip_path}`;
            let fileContent = await zip.file(zipPath)?.async('blob');
            
            // Fallback: try old flat structure
            if (!fileContent) {
              const oldPath = `files/${fileInfo.zip_path.replace('files/', '').replace(/^(submissions|resources|note-attachments)\//, '')}`;
              fileContent = await zip.file(oldPath)?.async('blob');
            }
            
            if (fileContent) {
              const safeStorageName = generateSafeStorageName(fileInfo.file_name);
              const bucket = fileInfo.bucket || 'task-submissions';
              const newPath = `${user!.id}/${newGroupId}/${safeStorageName}`;
              
              const { error: uploadError } = await r2Storage
                .from(bucket)
                .upload(newPath, fileContent);
              
              if (!uploadError) {
                oldToNewPath.set(`${bucket}/${fileInfo.original_path}`, { path: newPath, bucket });
                oldToNewPath.set(fileInfo.original_path, { path: newPath, bucket });
              }
            }
          } catch (err) {
            console.warn(`Could not restore file: ${fileInfo.file_name}`, err);
          }
        }
      }

      // Update group image URL if it was backed up
      if (backupData.group.image_url) {
        const parsedImg = parseStorageUrl(backupData.group.image_url);
        if (parsedImg) {
          const newPathInfo = oldToNewPath.get(parsedImg.path) || oldToNewPath.get(`${parsedImg.bucket}/${parsedImg.path}`);
          if (newPathInfo) {
            const { data: publicUrlData } = r2Storage.from(newPathInfo.bucket).getPublicUrl(newPathInfo.path);
            if (publicUrlData?.publicUrl) {
              await supabase.from('groups').update({ image_url: publicUrlData.publicUrl }).eq('id', newGroupId);
            }
          }
        }
      }

      // Update member avatar URLs if they were backed up
      for (const member of backupData.members) {
        const avatarUrl = (member.profile as any)?.avatar_url;
        if (avatarUrl) {
          const parsedAvatar = parseStorageUrl(avatarUrl);
          if (parsedAvatar) {
            const newPathInfo = oldToNewPath.get(parsedAvatar.path) || oldToNewPath.get(`${parsedAvatar.bucket}/${parsedAvatar.path}`);
            if (newPathInfo) {
              const memberId = studentIdToUserId.get(member.profile.student_id);
              if (memberId) {
                const { data: pubUrl } = r2Storage.from(newPathInfo.bucket).getPublicUrl(newPathInfo.path);
                if (pubUrl?.publicUrl) {
                  await supabase.from('profiles').update({ avatar_url: pubUrl.publicUrl }).eq('id', memberId);
                }
              }
            }
          }
        }
      }

      checkCancelled();
      addImportStep('Đang tạo các giai đoạn...', 30);

      // Create stages
      const stageNameToId = new Map<string, string>();
      for (const stage of backupData.stages) {
        const newStageId = generateNewId();
        await supabase
          .from('stages')
          .insert({
            id: newStageId,
            group_id: newGroupId,
            name: stage.name,
            description: stage.description,
            order_index: stage.order_index,
            start_date: stage.start_date,
            end_date: stage.end_date,
            weight: stage.weight,
            is_hidden: stage.is_hidden
          });
        stageNameToId.set(stage.name, newStageId);
      }

      checkCancelled();
      addImportStep('Đang khôi phục các task...', 35);

      // Helper function to update file paths
      const updateFilePaths = (submissionLink: string | null): string | null => {
        if (!submissionLink) return null;
        try {
          const parsed = JSON.parse(submissionLink);
          if (Array.isArray(parsed)) {
            const updated = parsed.map(item => {
              if (item.file_path) {
                const newPathInfo = oldToNewPath.get(item.file_path);
                if (newPathInfo) {
                  return { ...item, file_path: newPathInfo.path };
                }
              }
              return item;
            });
            return JSON.stringify(updated);
          }
        } catch {
          return submissionLink;
        }
        return submissionLink;
      };

      // Create tasks
      const taskTitleToId = new Map<string, string>();
      for (const task of backupData.tasks) {
        const { data: newTask } = await supabase
          .from('tasks')
          .insert({
            group_id: newGroupId,
            stage_id: task.stage_name ? stageNameToId.get(task.stage_name) || null : null,
            title: task.title,
            description: task.description,
            status: task.status as 'TODO' | 'IN_PROGRESS' | 'DONE' | 'VERIFIED',
            deadline: task.deadline,
            extended_deadline: task.extended_deadline,
            submission_link: updateFilePaths(task.submission_link),
            max_file_size: task.max_file_size,
            is_hidden: task.is_hidden,
            created_by: user!.id,
            slug: '',
          })
          .select()
          .single();
        
        const newTaskId = newTask?.id;
        if (!newTaskId) continue;

        taskTitleToId.set(task.title, newTaskId);

        // Create task assignments
        const assignmentInserts = task.assignments
          .filter(a => studentIdToUserId.has(a.student_id))
          .map(a => ({
            task_id: newTaskId,
            user_id: studentIdToUserId.get(a.student_id)!
          }));

        if (assignmentInserts.length > 0) {
          await supabase.from('task_assignments').insert(assignmentInserts);
        }

        // Create task scores
        const scoreInserts = task.scores
          .filter(s => studentIdToUserId.has(s.student_id))
          .map(s => ({
            task_id: newTaskId,
            user_id: studentIdToUserId.get(s.student_id)!,
            base_score: s.base_score,
            late_penalty: s.late_penalty,
            review_penalty: s.review_penalty,
            review_count: s.review_count,
            early_bonus: s.early_bonus,
            bug_hunter_bonus: s.bug_hunter_bonus,
            final_score: s.final_score,
            adjustment: s.adjustment,
            adjustment_reason: s.adjustment_reason
          }));

        if (scoreInserts.length > 0) {
          await supabase.from('task_scores').insert(scoreInserts);
        }

        // Create submission history
        const submissionInserts = task.submissions
          .filter(s => studentIdToUserId.has(s.student_id))
          .map(s => {
            const newPathInfo = s.file_path ? oldToNewPath.get(s.file_path) : null;
            
            return {
              task_id: newTaskId,
              user_id: studentIdToUserId.get(s.student_id)!,
              submission_link: updateFilePaths(s.submission_link),
              note: s.note,
              submitted_at: s.submitted_at,
              submission_type: s.submission_type || 'link',
              file_path: newPathInfo?.path || s.file_path,
              file_name: s.file_name,
              file_size: s.file_size
            };
          });

        if (submissionInserts.length > 0) {
          await supabase.from('submission_history').insert(submissionInserts);
        }
      }

      // Restore messages
      let messagesRestored = 0;
      if (backupData.messages && backupData.messages.length > 0) {
        checkCancelled();
        addImportStep('Đang khôi phục tin nhắn...', 50);
        
        const messageInserts = backupData.messages
          .filter(msg => studentIdToUserId.has(msg.student_id))
          .map(msg => ({
            group_id: newGroupId,
            user_id: studentIdToUserId.get(msg.student_id)!,
            content: msg.content,
            source_type: msg.source_type || 'direct',
            created_at: msg.created_at
          }));

        if (messageInserts.length > 0) {
          const { error: msgError } = await supabase.from('project_messages').insert(messageInserts);
          if (!msgError) messagesRestored = messageInserts.length;
        }
      }

      // Restore task notes
      let notesRestored = 0;
      if (backupData.task_notes && backupData.task_notes.length > 0) {
        addImportStep('Đang khôi phục ghi chú task...', 55);
        
        for (const note of backupData.task_notes) {
          const taskId = taskTitleToId.get(note.task_title);
          const userId = studentIdToUserId.get(note.created_by_student_id);
          if (!taskId || !userId) continue;

          const { data: newNote } = await supabase
            .from('task_notes')
            .insert({
              task_id: taskId,
              version_name: note.version_name,
              content: note.content,
              created_by: userId,
              created_at: note.created_at
            })
            .select()
            .single();

          if (newNote && note.attachments.length > 0) {
            const attachmentInserts = note.attachments
              .map(att => {
                const newPathInfo = oldToNewPath.get(`task-note-attachments/${att.original_path}`) || 
                                   oldToNewPath.get(att.original_path);
                if (!newPathInfo) return null;
                return {
                  note_id: newNote.id,
                  file_name: att.file_name,
                  file_path: newPathInfo.path,
                  file_size: att.file_size,
                  storage_name: att.file_name
                };
              })
              .filter(Boolean);

            if (attachmentInserts.length > 0) {
              await supabase.from('task_note_attachments').insert(attachmentInserts);
            }
          }
          notesRestored++;
        }
      }

      // Restore task comments
      let commentsRestored = 0;
      if (backupData.task_comments && backupData.task_comments.length > 0) {
        checkCancelled();
        addImportStep('Đang khôi phục bình luận task...', 60);
        
        const commentIndexToId = new Map<number, string>();
        
        for (let i = 0; i < backupData.task_comments.length; i++) {
          const comment = backupData.task_comments[i];
          const taskId = taskTitleToId.get(comment.task_title);
          const userId = studentIdToUserId.get(comment.student_id);
          if (!taskId || !userId) continue;

          const parentId = comment.parent_index !== null ? commentIndexToId.get(comment.parent_index) || null : null;

          const { data: newComment } = await supabase
            .from('task_comments')
            .insert({
              task_id: taskId,
              user_id: userId,
              content: comment.content,
              parent_id: parentId,
              created_at: comment.created_at
            })
            .select()
            .single();

          if (newComment) {
            commentIndexToId.set(i, newComment.id);
            commentsRestored++;
          }
        }
      }

      // Restore resource folders
      const folderNameToId = new Map<string, string>();
      if (backupData.resource_folders && backupData.resource_folders.length > 0) {
        addImportStep('Đang khôi phục thư mục tài nguyên...', 65);
        
        for (const folder of backupData.resource_folders) {
          const userId = studentIdToUserId.get(folder.created_by_student_id) || user!.id;
          
          const { data: newFolder } = await supabase
            .from('resource_folders')
            .insert({
              group_id: newGroupId,
              name: folder.name,
              description: folder.description,
              created_by: userId,
              created_at: folder.created_at
            })
            .select()
            .single();

          if (newFolder) {
            folderNameToId.set(folder.name, newFolder.id);
          }
        }
      }

      // Restore resources
      let resourcesRestored = 0;
      if (backupData.resources && backupData.resources.length > 0) {
        checkCancelled();
        addImportStep('Đang khôi phục tài nguyên...', 70);
        
        for (const resource of backupData.resources) {
          const userId = studentIdToUserId.get(resource.uploaded_by_student_id) || user!.id;
          const folderId = resource.folder_name ? folderNameToId.get(resource.folder_name) || null : null;
          const resType = resource.resource_type || 'file';

          if (resType === 'link') {
            await supabase
              .from('project_resources')
              .insert({
                group_id: newGroupId,
                name: resource.name,
                description: resource.description,
                file_path: null,
                link_url: resource.link_url,
                file_size: 0,
                file_type: null,
                resource_type: 'link',
                category: resource.category,
                folder_id: folderId,
                uploaded_by: userId,
                storage_name: null,
                created_at: resource.created_at
              });
            resourcesRestored++;
          } else {
            const storageName = resource.storage_name || resource.file_path;
            const newPathInfo = storageName 
              ? (oldToNewPath.get(`project-resources/${storageName}`) || oldToNewPath.get(storageName || ''))
              : null;
            
            if (newPathInfo) {
              const { data: publicUrlData } = r2Storage
                .from('project-resources')
                .getPublicUrl(newPathInfo.path);

              await supabase
                .from('project_resources')
                .insert({
                  group_id: newGroupId,
                  name: resource.name,
                  description: resource.description,
                  file_path: publicUrlData?.publicUrl || null,
                  file_size: resource.file_size,
                  file_type: resource.file_type,
                  resource_type: 'file',
                  category: resource.category,
                  folder_id: folderId,
                  uploaded_by: userId,
                  storage_name: newPathInfo.path,
                  created_at: resource.created_at
                });
              resourcesRestored++;
            } else {
              await supabase
                .from('project_resources')
                .insert({
                  group_id: newGroupId,
                  name: resource.name,
                  description: resource.description,
                  file_path: resource.file_path,
                  file_size: resource.file_size,
                  file_type: resource.file_type,
                  resource_type: 'file',
                  category: resource.category,
                  folder_id: folderId,
                  uploaded_by: userId,
                  storage_name: resource.storage_name,
                  created_at: resource.created_at
                });
              resourcesRestored++;
            }
          }
        }
      }

      // Restore stage weights
      if (backupData.stage_weights && backupData.stage_weights.length > 0) {
        addImportStep('Đang khôi phục trọng số giai đoạn...', 75);
        
        const weightInserts = backupData.stage_weights
          .filter(sw => stageNameToId.has(sw.stage_name))
          .map(sw => ({
            group_id: newGroupId,
            stage_id: stageNameToId.get(sw.stage_name)!,
            weight: sw.weight
          }));

        if (weightInserts.length > 0) {
          await supabase.from('stage_weights').insert(weightInserts);
        }
      }

      // Restore member stage scores
      if (backupData.member_stage_scores && backupData.member_stage_scores.length > 0) {
        addImportStep('Đang khôi phục điểm giai đoạn...', 80);
        
        const scoreInserts = backupData.member_stage_scores
          .filter(mss => studentIdToUserId.has(mss.student_id) && stageNameToId.has(mss.stage_name))
          .map(mss => ({
            user_id: studentIdToUserId.get(mss.student_id)!,
            stage_id: stageNameToId.get(mss.stage_name)!,
            average_score: mss.average_score,
            k_coefficient: mss.k_coefficient,
            adjusted_score: mss.adjusted_score,
            final_stage_score: mss.final_stage_score,
            late_task_count: mss.late_task_count,
            early_submission_bonus: mss.early_submission_bonus,
            bug_hunter_bonus: mss.bug_hunter_bonus
          }));

        if (scoreInserts.length > 0) {
          await supabase.from('member_stage_scores').insert(scoreInserts);
        }
      }

      // Restore member final scores
      if (backupData.member_final_scores && backupData.member_final_scores.length > 0) {
        addImportStep('Đang khôi phục điểm tổng kết...', 85);
        
        const scoreInserts = backupData.member_final_scores
          .filter(mfs => studentIdToUserId.has(mfs.student_id))
          .map(mfs => ({
            group_id: newGroupId,
            user_id: studentIdToUserId.get(mfs.student_id)!,
            weighted_average: mfs.weighted_average,
            adjustment: mfs.adjustment,
            final_score: mfs.final_score
          }));

        if (scoreInserts.length > 0) {
          await supabase.from('member_final_scores').insert(scoreInserts);
        }
      }

      // Restore score adjustment history
      let adjustmentsRestored = 0;
      if (backupData.score_adjustments && backupData.score_adjustments.length > 0) {
        addImportStep('Đang khôi phục lịch sử điều chỉnh điểm...', 88);
        
        const adjInserts = backupData.score_adjustments
          .filter(adj => studentIdToUserId.has(adj.student_id) && studentIdToUserId.has(adj.adjusted_by_student_id))
          .map(adj => ({
            user_id: studentIdToUserId.get(adj.student_id)!,
            adjustment_type: adj.adjustment_type,
            previous_score: adj.previous_score,
            new_score: adj.new_score,
            adjustment_value: adj.adjustment_value,
            reason: adj.reason,
            adjusted_by: studentIdToUserId.get(adj.adjusted_by_student_id)!,
            target_id: generateNewId(), // target_id references old IDs, use placeholder
            created_at: adj.created_at
          }));

        if (adjInserts.length > 0) {
          const { error } = await supabase.from('score_adjustment_history').insert(adjInserts);
          if (!error) adjustmentsRestored = adjInserts.length;
        }
      }

      // Restore feedbacks with comments
      let feedbacksRestored = 0;
      if (backupData.feedbacks && backupData.feedbacks.length > 0) {
        checkCancelled();
        addImportStep('Đang khôi phục phản hồi...', 92);
        
        for (const fb of backupData.feedbacks) {
          const userId = studentIdToUserId.get(fb.student_id);
          if (!userId) continue;

          const respondedBy = fb.responded_by_student_id 
            ? studentIdToUserId.get(fb.responded_by_student_id) || null 
            : null;

          const { data: newFb } = await supabase
            .from('feedbacks')
            .insert({
              user_id: userId,
              group_id: newGroupId,
              title: fb.title,
              content: fb.content,
              type: fb.type,
              priority: fb.priority,
              status: fb.status,
              admin_response: fb.admin_response,
              responded_by: respondedBy,
              responded_at: fb.responded_at,
              created_at: fb.created_at
            })
            .select()
            .single();

          if (newFb && fb.comments.length > 0) {
            const commentInserts = fb.comments
              .filter(c => studentIdToUserId.has(c.student_id))
              .map(c => ({
                feedback_id: newFb.id,
                user_id: studentIdToUserId.get(c.student_id)!,
                content: c.content,
                is_admin: c.is_admin,
                created_at: c.created_at
              }));

            if (commentInserts.length > 0) {
              await supabase.from('feedback_comments').insert(commentInserts);
            }
          }
          feedbacksRestored++;
        }
      }

      addImportStep('Hoàn tất khôi phục!', 100);

      const importRecordCounts: Record<string, number> = {
        files: oldToNewPath.size,
        messages: messagesRestored,
        task_notes: notesRestored,
        task_comments: commentsRestored,
        resources: resourcesRestored,
        score_adjustments: adjustmentsRestored,
        feedbacks: feedbacksRestored,
        tasks: backupData.tasks.length,
        stages: backupData.stages.length,
        members: backupData.members.length,
      };

      setImportReport({
        status: 'success',
        projectName: backupData.project_name,
        duration: Date.now() - importStartTime.current,
        recordCounts: importRecordCounts,
        fileCount: oldToNewPath.size,
        zipSize: file.size,
        errors: [],
      });

      fetchAllGroups();

    } catch (error) {
      const isCancelled = String(error) === 'Error: CANCELLED' || cancelRef.current;
      if (!isCancelled) {
        console.error('Import error:', error);
        addImportStep(`Lỗi: ${String(error)}`, importProgressPercent);
        setImportReport({
          status: 'error',
          projectName: 'Không xác định',
          duration: Date.now() - importStartTime.current,
          recordCounts: {},
          fileCount: 0,
          zipSize: file.size,
          errors: [String(error)],
        });
        toast({ title: 'Lỗi khôi phục', description: String(error), variant: 'destructive' });
      }
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  if (!isAdmin) {
    return null;
  }

  // Shared report renderer
  const renderReport = (report: BackupReport, type: 'export' | 'import') => {
    const isSuccess = report.status === 'success';
    const labelMap: Record<string, string> = {
      members: 'Thành viên',
      stages: 'Giai đoạn',
      tasks: 'Công việc',
      messages: 'Tin nhắn',
      task_notes: 'Ghi chú task',
      task_comments: 'Bình luận',
      resources: 'Tài nguyên',
      resource_folders: 'Thư mục TN',
      activity_logs: 'Nhật ký',
      stage_weights: 'Trọng số GĐ',
      member_stage_scores: 'Điểm giai đoạn',
      member_final_scores: 'Điểm tổng kết',
      score_appeals: 'Khiếu nại',
      score_adjustments: 'Điều chỉnh điểm',
      feedbacks: 'Phản hồi',
      files: 'File đính kèm',
      members_created: 'TK mới tạo',
      members_existing: 'TK đã có',
    };

    return (
      <div className="space-y-4">
        {/* Status banner */}
        <div className={`flex items-center gap-3 p-4 rounded-lg border ${
          isSuccess 
            ? 'bg-emerald-500/10 border-emerald-500/30' 
            : 'bg-destructive/10 border-destructive/30'
        }`}>
          {isSuccess ? (
            <CheckCircle className="w-8 h-8 text-emerald-500 flex-shrink-0" />
          ) : (
            <XCircle className="w-8 h-8 text-destructive flex-shrink-0" />
          )}
          <div>
            <p className="font-semibold text-lg">
              {isSuccess 
                ? (type === 'export' ? 'Sao lưu thành công!' : 'Khôi phục thành công!') 
                : (type === 'export' ? 'Sao lưu thất bại' : 'Khôi phục thất bại')}
            </p>
            <p className="text-sm text-muted-foreground">
              Project: <span className="font-medium text-foreground">{report.projectName}</span>
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Thời gian</p>
            <p className="font-semibold text-sm">{formatDuration(report.duration)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <HardDrive className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Dung lượng ZIP</p>
            <p className="font-semibold text-sm">{formatFileSize(report.zipSize)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <Package className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Tổng bản ghi</p>
            <p className="font-semibold text-sm">
              {Object.values(report.recordCounts).reduce((a, b) => a + b, 0)}
            </p>
          </div>
        </div>

        {/* Record counts detail */}
        {Object.keys(report.recordCounts).length > 0 && (
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Chi tiết dữ liệu:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
              {Object.entries(report.recordCounts)
                .filter(([, count]) => count > 0)
                .map(([key, count]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{labelMap[key] || key}</span>
                    <span className="font-medium tabular-nums">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Checksum */}
        {report.checksum && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3 h-3" />
            <span>Integrity checksum: <code className="bg-muted px-1.5 py-0.5 rounded font-mono">{report.checksum}</code></span>
          </div>
        )}

        {/* Errors */}
        {report.errors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
            <p className="text-xs font-medium text-destructive mb-1">Lỗi:</p>
            {report.errors.map((err, i) => (
              <p key={i} className="text-xs text-destructive/80">{err}</p>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Shared progress renderer
  const renderProgressDialog = (
    steps: StepInfo[], 
    currentStep: string, 
    percent: number, 
    isRunning: boolean
  ) => (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Tiến trình</span>
          <span className="font-semibold tabular-nums">{percent}%</span>
        </div>
        <Progress value={percent} className="h-3" />
      </div>

      {/* Current step */}
      {isRunning && (
        <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
            <span className="text-sm font-medium">{currentStep}</span>
          </div>
          <Button 
            variant="destructive" 
            size="sm" 
            className="h-7 text-xs gap-1 flex-shrink-0"
            onClick={() => setShowCancelConfirm(true)}
          >
            <XCircle className="w-3 h-3" />
            Hủy
          </Button>
        </div>
      )}

      {/* Step history */}
      <div className="bg-muted/30 rounded-lg p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Nhật ký tiến trình:</p>
        <ScrollArea className="h-[200px]">
          <div className="space-y-1.5">
            {steps.map((step, i) => {
              const isLast = i === steps.length - 1;
              const timeDiff = i > 0 ? step.timestamp - steps[i - 1].timestamp : 0;
              return (
                <div key={i} className={`flex items-start gap-2 text-xs ${isLast && isRunning ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                  <span className="flex-shrink-0 w-4 h-4 mt-0.5 flex items-center justify-center">
                    {isLast && isRunning ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                    )}
                  </span>
                  <span className="flex-1">{step.label}</span>
                  {timeDiff > 0 && (
                    <span className="text-muted-foreground/60 tabular-nums flex-shrink-0">
                      +{timeDiff > 1000 ? `${(timeDiff / 1000).toFixed(1)}s` : `${timeDiff}ms`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleCancelConfirm = () => {
    cancelRef.current = true;
    setShowCancelConfirm(false);
    if (isExporting) {
      addExportStep('⚠️ Đã hủy bởi người dùng');
      setIsExporting(false);
      setExportReport({
        status: 'error',
        projectName: groups.find(g => g.id === selectedGroupId)?.name || '',
        duration: Date.now() - exportStartTime.current,
        recordCounts: {},
        fileCount: 0,
        zipSize: 0,
        errors: ['Quá trình sao lưu đã bị hủy bởi người dùng'],
      });
    }
    if (isImporting) {
      addImportStep('⚠️ Đã hủy bởi người dùng', importProgressPercent);
      setIsImporting(false);
      setImportReport({
        status: 'error',
        projectName: 'Không xác định',
        duration: Date.now() - importStartTime.current,
        recordCounts: {},
        fileCount: 0,
        zipSize: 0,
        errors: ['Quá trình khôi phục đã bị hủy bởi người dùng. Dữ liệu đã nhập một phần có thể cần được xóa thủ công.'],
      });
    }
    toast({ title: 'Đã hủy', description: 'Quá trình đã bị dừng lại', variant: 'destructive' });
  };

  const handleOpenDialog = () => {
    setShowMainDialog(true);
    setActivePage('backup');
  };

  return (
    <>
      <Button onClick={handleOpenDialog} className="gap-2">
        <FolderArchive className="w-4 h-4" />
        Sao lưu & Khôi phục
      </Button>

      <Dialog open={showMainDialog} onOpenChange={(open) => {
        if (!isExporting && !isImporting) setShowMainDialog(open);
      }}>
        <DialogContent 
          className="p-0 gap-0 overflow-hidden border-border/50"
          style={{ width: '1280px', maxWidth: '95vw', height: '720px', maxHeight: '95vh' }}
          onInteractOutside={(e) => { if (isExporting || isImporting) e.preventDefault(); }}
        >
          <div className="flex flex-col h-full">
            {/* Header with page tabs */}
            <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
              <DialogTitle className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <FolderArchive className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <span className="text-lg">Sao lưu & Khôi phục</span>
                  <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">v6.0</span>
                </div>
              </DialogTitle>
              {/* Page switcher */}
              {!isExporting && !isImporting && !exportReport && !importReport && (
                <div className="flex gap-1 mt-3 bg-muted p-1.5 rounded-xl">
                  <button
                    onClick={() => setActivePage('backup')}
                    className={`flex-1 flex items-center justify-center gap-2.5 px-5 py-3 rounded-lg text-sm font-semibold transition-all ${
                      activePage === 'backup'
                        ? 'bg-background shadow-md text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    }`}
                  >
                    <Download className="w-5 h-5" />
                    Sao lưu
                  </button>
                  <button
                    onClick={() => setActivePage('restore')}
                    className={`flex-1 flex items-center justify-center gap-2.5 px-5 py-3 rounded-lg text-sm font-semibold transition-all ${
                      activePage === 'restore'
                        ? 'bg-background shadow-md text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    }`}
                  >
                    <Upload className="w-5 h-5" />
                    Khôi phục
                  </button>
                </div>
              )}
            </DialogHeader>

            <ScrollArea className="flex-1">
              <div className="h-full px-8 py-6">
                {/* === EXPORT IN PROGRESS / REPORT === */}
                {(isExporting || exportReport) ? (
                  <div className="max-w-3xl mx-auto">
                    {exportReport ? (
                      <>
                        {renderReport(exportReport, 'export')}
                        <div className="mt-6 flex justify-end gap-2">
                          <Button variant="outline" onClick={() => { setExportReport(null); setExportProgress(0); }}>
                            Quay lại
                          </Button>
                          <Button onClick={() => { setShowMainDialog(false); setExportReport(null); setExportProgress(0); }}>
                            Đóng
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Download className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">Đang sao lưu</h3>
                            <p className="text-sm text-muted-foreground">{groups.find(g => g.id === selectedGroupId)?.name}</p>
                          </div>
                        </div>
                        {renderProgressDialog(exportSteps, exportStepLabel, exportProgress, isExporting)}
                      </>
                    )}
                  </div>
                ) : (isImporting || importReport) ? (
                  <div className="max-w-3xl mx-auto">
                    {importReport ? (
                      <>
                        {renderReport(importReport, 'import')}
                        <div className="mt-6 flex justify-end gap-2">
                          <Button variant="outline" onClick={() => { setImportReport(null); setImportProgressPercent(0); }}>
                            Quay lại
                          </Button>
                          <Button onClick={() => { setShowMainDialog(false); setImportReport(null); }}>
                            Đóng
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Upload className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">Đang khôi phục dữ liệu</h3>
                            <p className="text-sm text-muted-foreground">Vui lòng không đóng cửa sổ này</p>
                          </div>
                        </div>
                        {renderProgressDialog(importSteps, importStepLabel, importProgressPercent, isImporting)}
                      </>
                    )}
                  </div>
                ) : activePage === 'backup' ? (
                  /* === BACKUP PAGE === */
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                    {/* Left: Controls */}
                    <div className="space-y-5">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">Sao lưu Project</h3>
                        <p className="text-sm text-muted-foreground">Chọn project và tùy chỉnh nội dung cần sao lưu</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Chọn Project</Label>
                        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Chọn project để sao lưu..." />
                          </SelectTrigger>
                          <SelectContent>
                            {groups.map(group => (
                              <SelectItem key={group.id} value={group.id}>
                                {group.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Filter Options */}
                      <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                        <CollapsibleTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full justify-between text-xs h-9">
                            <span className="flex items-center gap-1.5">
                              <Filter className="w-3.5 h-3.5" />
                              Tùy chỉnh nội dung sao lưu ({selectedCount}/7)
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2">
                          <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" className="h-7 text-xs px-3" onClick={selectAllOptions}>
                                Chọn tất cả
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs px-3" onClick={deselectAllOptions}>
                                Bỏ chọn
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                              {[
                                { key: 'includeMessages', label: 'Tin nhắn', icon: MessageSquare },
                                { key: 'includeTaskNotes', label: 'Ghi chú task', icon: FileText },
                                { key: 'includeTaskComments', label: 'Bình luận', icon: MessageCircle },
                                { key: 'includeResources', label: 'Tài nguyên', icon: FolderOpen },
                                { key: 'includeActivityLogs', label: 'Nhật ký', icon: History },
                                { key: 'includeScores', label: 'Điểm số', icon: Award },
                                { key: 'includeFeedbacks', label: 'Phản hồi', icon: HelpCircle },
                              ].map(({ key, label, icon: Icon }) => (
                                <div key={key} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/80 transition-colors">
                                  <Checkbox 
                                    id={`dialog-${key}`} 
                                    checked={exportOptions[key as keyof ExportOptions]}
                                    onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, [key]: !!checked }))}
                                  />
                                  <label htmlFor={`dialog-${key}`} className="text-sm flex items-center gap-1.5 cursor-pointer flex-1">
                                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                                    {label}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      <Button 
                        onClick={exportProject} 
                        disabled={!selectedGroupId || isExporting}
                        className="w-full gap-2 h-12 text-base"
                        size="lg"
                      >
                        <Download className="w-5 h-5" />
                        Bắt đầu sao lưu
                      </Button>
                    </div>

                    {/* Right: Info panel */}
                    <div className="space-y-4">
                      <div className="p-5 rounded-xl bg-muted/30 border h-full">
                        <div className="flex items-center gap-2 mb-4">
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                          <h4 className="font-semibold">Nội dung được sao lưu</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { icon: Settings, label: 'Thông tin project' },
                            { icon: File, label: 'File đính kèm' },
                            { icon: MessageSquare, label: 'Tin nhắn' },
                            { icon: FileText, label: 'Ghi chú task' },
                            { icon: MessageCircle, label: 'Bình luận task' },
                            { icon: FolderOpen, label: 'Tài nguyên dự án' },
                            { icon: History, label: 'Nhật ký hoạt động' },
                            { icon: Award, label: 'Điểm số đầy đủ' },
                            { icon: Bug, label: 'Lịch sử điều chỉnh' },
                            { icon: HelpCircle, label: 'Phản hồi & bình luận' },
                            { icon: Shield, label: 'Kiểm tra toàn vẹn' },
                            { icon: FolderArchive, label: 'Phân loại thư mục' },
                          ].map(({ icon: Icon, label }, i) => (
                            <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-background/60 border border-border/50">
                              <Icon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              <span className="text-sm">{label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* === RESTORE PAGE === */
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                    {/* Left: Upload area */}
                    <div className="space-y-5">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">Khôi phục Project</h3>
                        <p className="text-sm text-muted-foreground">Chọn file ZIP từ hệ thống sao lưu để khôi phục</p>
                      </div>

                      <input 
                        ref={fileInputRef}
                        type="file" 
                        accept=".zip" 
                        onChange={importProject}
                        disabled={isImporting}
                        className="hidden"
                      />
                      <button 
                        onClick={handleImportClick}
                        disabled={isImporting}
                        className="w-full flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Upload className="w-7 h-7 text-primary" />
                        </div>
                        <div className="text-center">
                          <p className="font-medium">Nhấn để chọn file ZIP</p>
                          <p className="text-xs text-muted-foreground mt-1">Hỗ trợ file .zip từ hệ thống sao lưu v5.0+ và v6.0</p>
                        </div>
                      </button>
                    </div>

                    {/* Right: Notes */}
                    <div className="space-y-4">
                      <div className="p-5 rounded-xl bg-amber-500/5 border border-amber-500/20 h-full">
                        <div className="flex items-center gap-2 mb-4">
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                          <h4 className="font-semibold">Lưu ý quan trọng</h4>
                        </div>
                        <div className="space-y-3">
                          {[
                            { title: 'Khôi phục chính xác (v6.0)', desc: 'File v6.0 sẽ khôi phục giống 100% với ID gốc, không tạo bản sao. File v5.0 tạo project mới.' },
                            { title: 'Quyền Leader', desc: 'Admin hiện tại sẽ tự động trở thành Leader của project được khôi phục.' },
                            { title: 'Kiểm tra toàn vẹn', desc: 'Hệ thống tự động kiểm tra tính toàn vẹn dữ liệu trước khi khôi phục.' },
                            { title: 'File đính kèm', desc: 'Toàn bộ file được tải về và đóng gói trong ZIP, không phụ thuộc URL cũ.' },
                          ].map((item, i) => (
                            <div key={i} className="p-3 rounded-lg bg-background/60 border border-border/50">
                              <p className="text-sm font-medium mb-0.5">{item.title}</p>
                              <p className="text-xs text-muted-foreground">{item.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận hủy</AlertDialogTitle>
            <AlertDialogDescription>
              {isExporting 
                ? 'Bạn có chắc muốn hủy quá trình sao lưu? Tiến trình hiện tại sẽ bị mất.'
                : 'Bạn có chắc muốn hủy quá trình khôi phục? Dữ liệu đã nhập một phần có thể cần được xóa thủ công.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tiếp tục</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hủy quá trình
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
