import { useState, useEffect } from 'react';
import submissionIllustration from '@/assets/submission-confirm-illustration.png';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/lib/activityLogger';
import { useToast } from '@/hooks/use-toast';
import { deleteOldSubmissionFiles } from '@/lib/storageCleanup';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Loader2, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Send,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Target,
  Users,
  Link as LinkIcon,
  Link2,
  MessageSquare,
  AlertTriangle,
  Upload,
  FileText,
  MessagesSquare,
  ChevronDown,
  Award,
  HardDrive,
  Globe,
  ShieldAlert,
  Database,
  CloudUpload,
  File,
  Monitor
} from 'lucide-react';
import type { Task, TaskStatus } from '@/types/database';
import type { TaskScore } from '@/types/processScores';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { parseLocalDateTime } from '@/lib/datetime';
import MultiFileUploadSubmission, { UploadedFile } from './MultiFileUploadSubmission';
import { notifyTaskSubmitted, notifyTaskVerified } from '@/lib/notifications';
import TaskComments from './communication/TaskComments';
import CompactTaskNotes from './CompactTaskNotes';
import UserAvatar from './UserAvatar';

import { CountdownTimer } from './CountdownTimer';
import ResourceLinkRenderer from './ResourceLinkRenderer';

interface TaskAssignee {
  user_id: string;
  full_name: string;
  student_id?: string;
  avatar_url?: string | null;
}

interface SubmissionLink {
  id?: string;
  title: string;
  url: string;
}

interface TaskSubmissionDialogProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  isAssignee: boolean;
  isLeaderInGroup: boolean;
  viewOnly?: boolean;
  initialTab?: string;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function TaskSubmissionDialog({
  task,
  isOpen,
  onClose,
  onSave,
  isAssignee,
  isLeaderInGroup,
  viewOnly = false,
  initialTab,
}: TaskSubmissionDialogProps) {
  const { toast } = useToast();
  const { user, profile, isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab || 'requirements');
  
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [submissionLinks, setSubmissionLinks] = useState<SubmissionLink[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [note, setNote] = useState('');
  const [taskAssignees, setTaskAssignees] = useState<TaskAssignee[]>([]);
  // showLateWarning removed - late warning now integrated into post-submit step
  const [taskScore, setTaskScore] = useState<TaskScore | null>(null);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [showPostSubmitStep, setShowPostSubmitStep] = useState(false);

  // Get max file size and submission method from task
  const taskWithSize = task as (Task & { max_file_size?: number }) | null;
  const maxFileSize = taskWithSize?.max_file_size || DEFAULT_MAX_FILE_SIZE;
  const submissionMethod: string = (task as any)?.submission_method || 'both';
  const allowFileUpload = submissionMethod === 'both' || submissionMethod === 'file_only';
  const allowLinkSubmission = submissionMethod === 'both' || submissionMethod === 'link_only';

  // Handle extended deadline
  const taskWithExtended = task as (Task & { extended_deadline?: string; extended_at?: string }) | null;
  const originalDeadlineDate = task?.deadline ? parseLocalDateTime(task.deadline) : null;
  const extendedDeadlineDate = taskWithExtended?.extended_deadline ? parseLocalDateTime(taskWithExtended.extended_deadline) : null;
  const deadlineDate = extendedDeadlineDate || originalDeadlineDate;
  const hasExtension = !!taskWithExtended?.extended_deadline;

  // Calculate extension hours
  const getExtensionHours = () => {
    if (!originalDeadlineDate || !extendedDeadlineDate) return 0;
    const diffMs = extendedDeadlineDate.getTime() - originalDeadlineDate.getTime();
    return Math.round(diffMs / (1000 * 60 * 60));
  };

  const getExtensionText = (hours: number) => {
    if (hours <= 0) return '';
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    let text = '+';
    if (days > 0) text += `${days} ngày`;
    if (days > 0 && remainingHours > 0) text += ' ';
    if (remainingHours > 0) text += `${remainingHours} giờ`;
    return text;
  };

  // Check if task is overdue
  const isOverdue = !!deadlineDate && deadlineDate.getTime() < Date.now();
  // Check if this is a resubmission (has existing submission link)
  const hasExistingSubmission = !!task?.submission_link;
  
  // Permission logic
  const canSubmit = !viewOnly && (isAssignee || isLeaderInGroup);
  const isSubmittingOnBehalf = isLeaderInGroup && !isAssignee;

  // Calculate submission stats
  const validLinksCount = submissionLinks.filter(l => l.url?.trim()).length;
  const filesCount = uploadedFiles.length;
  const totalFileSize = uploadedFiles.reduce((sum, f) => sum + f.file_size, 0);
  const hasContent = filesCount > 0 || validLinksCount > 0;

  // Fetch task score from database
  useEffect(() => {
    const fetchTaskScore = async () => {
      if (!task || !user) return;
      
      const { data } = await supabase
        .from('task_scores')
        .select('*')
        .eq('task_id', task.id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      setTaskScore(data as TaskScore | null);
    };
    
    if (task && isOpen && user) {
      fetchTaskScore();
    }
  }, [task, isOpen, user]);

  useEffect(() => {
    if (task && isOpen) {
      setStatus('');
      setNote('');
      setUploadedFiles([]);
      setSubmissionLinks([]);
      setActiveTab(initialTab || 'requirements');
      setIsNotesOpen(false);
      setShowPostSubmitStep(false);
      
      try {
        const parsed = task.submission_link ? JSON.parse(task.submission_link) : [];
        if (Array.isArray(parsed)) {
          const links: SubmissionLink[] = [];
          const files: UploadedFile[] = [];
          
          parsed.forEach((item: any) => {
            if (item.file_path) {
              files.push({
                file_path: item.file_path,
                file_name: item.file_name || 'file',
                file_size: item.file_size || 0,
                storage_name: item.storage_name || ''
              });
            } else if (item.url) {
              links.push({
                title: item.title || '',
                url: item.url
              });
            }
          });
          
          setSubmissionLinks(links);
          setUploadedFiles(files);
        } else {
          setSubmissionLinks([{ title: 'Bài nộp', url: task.submission_link }]);
        }
      } catch {
        if (task.submission_link) {
          setSubmissionLinks([{ title: 'Bài nộp', url: task.submission_link }]);
        }
      }
      
      if (task.task_assignments) {
        const assignees: TaskAssignee[] = task.task_assignments.map((a: any) => ({
          user_id: a.user_id,
          full_name: a.profiles?.full_name || 'Unknown',
          student_id: a.profiles?.student_id || undefined,
          avatar_url: a.profiles?.avatar_url || null,
        }));
        setTaskAssignees(assignees);
      }
    }
  }, [task, isOpen]);

  const addSubmissionLink = () => {
    setSubmissionLinks([...submissionLinks, { title: '', url: '' }]);
  };

  const removeSubmissionLink = (index: number) => {
    setSubmissionLinks(submissionLinks.filter((_, i) => i !== index));
  };

  const updateSubmissionLink = (index: number, field: 'title' | 'url', value: string) => {
    const updated = [...submissionLinks];
    updated[index][field] = value;
    setSubmissionLinks(updated);
  };

  const getStatusConfig = (status: TaskStatus) => {
    switch (status) {
      case 'TODO':
        return { label: 'Chờ làm', color: 'bg-muted text-muted-foreground', icon: AlertCircle };
      case 'IN_PROGRESS':
        return { label: 'Đang làm', color: 'bg-transparent text-warning border-warning', icon: Clock };
      case 'DONE':
        return { label: 'Hoàn thành', color: 'bg-transparent text-primary border-primary', icon: CheckCircle2 };
      case 'VERIFIED':
        return { label: 'Đã duyệt', color: 'bg-transparent text-success border-success', icon: CheckCircle2 };
      default:
        return { label: status, color: 'bg-muted', icon: AlertCircle };
    }
  };

  const handleSubmitClick = () => {
    if (!task || !canSubmit) return;
    
    if (!hasContent) {
      toast({
        title: 'Chưa có nội dung nộp',
        description: 'Vui lòng thêm ít nhất 1 file hoặc 1 liên kết để nộp bài.',
        variant: 'destructive',
      });
      return;
    }

    // Always show post-submit step (late warning is now integrated)
    setShowPostSubmitStep(true);
  };

  const handleConfirmSubmit = () => {
    setShowPostSubmitStep(false);
    handleSubmit();
  };

  const handleSubmit = async () => {
    if (!task || !canSubmit) return;
    
    setIsLoading(true);

    try {
      const now = new Date();
      const isLateSubmission = !!deadlineDate && now > deadlineDate;

      // Check if this is a status change to VERIFIED
      const isVerifying = status === 'VERIFIED' && task.status !== 'VERIFIED';

      // Delete old files from R2 if re-submitting
      if (hasExistingSubmission) {
        await deleteOldSubmissionFiles(task.submission_link);
      }

      // Build combined submission data (links + files)
      const allSubmissions: any[] = [];
      
      // Add valid links
      const validLinks = submissionLinks.filter(l => l.url?.trim());
      validLinks.forEach(link => {
        allSubmissions.push({
          title: link.title || 'Link',
          url: link.url,
          type: 'link'
        });
      });
      
      // Add files
      uploadedFiles.forEach(file => {
        allSubmissions.push({
          title: file.file_name,
          file_path: file.file_path,
          file_name: file.file_name,
          file_size: file.file_size,
          storage_name: file.storage_name,
          type: 'file'
        });
      });

      const submissionLinkJson = JSON.stringify(allSubmissions);

      // Update task
      const { error: taskError } = await supabase
        .from('tasks')
        .update({
           status: status as TaskStatus,
          submission_link: submissionLinkJson,
        })
        .eq('id', task.id);

      if (taskError) throw taskError;

      // Determine submission type for history: 'file', 'link', or 'mixed'
      const hasFiles = uploadedFiles.length > 0;
      const hasLinks = validLinks.length > 0;
      let historyType: 'file' | 'link' | 'mixed' = 'link';
      if (hasFiles && hasLinks) {
        historyType = 'mixed';
      } else if (hasFiles) {
        historyType = 'file';
      } else {
        historyType = 'link';
      }

      // Save to submission history
      const { error: historyError } = await supabase
        .from('submission_history')
        .insert({
          task_id: task.id,
          user_id: user!.id,
          submission_link: submissionLinkJson,
          note: note.trim() || (isSubmittingOnBehalf ? 'Leader nộp thay' : null),
          submission_type: historyType,
          file_path: hasFiles ? uploadedFiles[0].file_path : null,
          file_name: hasFiles ? uploadedFiles[0].file_name : null,
          file_size: hasFiles ? uploadedFiles[0].file_size : null
        });

      if (historyError) throw historyError;

      const actionType = isLateSubmission ? 'LATE_SUBMISSION' : 'SUBMISSION';
      const lateHours = isLateSubmission && deadlineDate
        ? Math.round((now.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60))
        : 0;

      // Get leader IDs for notification
      const { data: groupMembers } = await supabase
        .from('group_members')
        .select('user_id, role')
        .eq('group_id', task.group_id);
      
      const leaderIds = groupMembers
        ?.filter(m => m.role === 'project_admin' && m.user_id !== user?.id)
        .map(m => m.user_id) || [];

      const submitterName = profile?.full_name || user?.email || 'Thành viên';

      // Notify leaders about submission
      if (leaderIds.length > 0 && !isSubmittingOnBehalf) {
        await notifyTaskSubmitted({
          leaderIds,
          submitterName,
          taskTitle: task.title,
          taskId: task.id,
          groupId: task.group_id,
          isLate: isLateSubmission,
        });
      }

      // If task is being verified, notify assignees
      if (isVerifying) {
        const assigneeIds = task.task_assignments
          ?.map((a: any) => a.user_id)
          .filter((id: string) => id !== user?.id) || [];
        
        if (assigneeIds.length > 0) {
          await notifyTaskVerified({
            assigneeIds,
            leaderName: submitterName,
            taskTitle: task.title,
            taskId: task.id,
            groupId: task.group_id,
          });
        }
      }

      await logActivity({
        userId: user!.id,
        userName: submitterName,
        action: isVerifying ? 'VERIFY_TASK' : actionType,
        actionType: 'task',
        description: isVerifying
          ? `Đã duyệt task "${task.title}"`
          : isSubmittingOnBehalf 
            ? `Leader nộp thay cho task "${task.title}"${isLateSubmission ? ` (trễ ${lateHours} giờ)` : ''}`
            : isLateSubmission 
              ? `Nộp bài trễ ${lateHours} giờ cho task "${task.title}"`
              : `Nộp bài đúng hạn cho task "${task.title}"`,
        groupId: task.group_id,
        metadata: { 
          task_id: task.id, 
          task_title: task.title, 
          deadline: task.deadline,
          is_late: isLateSubmission,
          late_hours: lateHours,
          submitted_by_leader: isSubmittingOnBehalf,
          files_count: uploadedFiles.length,
          links_count: validLinks.length,
          is_verified: isVerifying,
        }
      });

      toast({
        title: isVerifying ? 'Đã duyệt task' : 'Nộp bài thành công',
        description: isVerifying 
          ? 'Task đã được đánh dấu hoàn thành'
          : isLateSubmission 
            ? 'Bài nộp đã được ghi nhận (trễ hạn)' 
            : 'Bài nộp đã được ghi nhận',
      });
      
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Submission error:', error);
      toast({
        title: 'Không thể nộp bài',
        description: 'Hệ thống chưa ghi nhận được bài nộp. Vui lòng thử lại. Nếu vẫn lỗi, báo admin.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const statusConfig = task ? getStatusConfig(task.status) : getStatusConfig('TODO');
  const StatusIcon = statusConfig.icon;

  const getTimeStatus = () => {
    if (!deadlineDate) return null;
    const now = new Date();
    const deadline = deadlineDate;
    const diff = deadline.getTime() - now.getTime();
    
    if (diff < 0) {
      const hours = Math.abs(Math.round(diff / (1000 * 60 * 60)));
      if (hours < 24) return { text: `Quá hạn ${hours} giờ`, isOverdue: true };
      const days = Math.round(hours / 24);
      return { text: `Quá hạn ${days} ngày`, isOverdue: true };
    } else {
      const hours = Math.round(diff / (1000 * 60 * 60));
      if (hours < 24) return { text: `Còn ${hours} giờ`, isOverdue: false };
      const days = Math.round(hours / 24);
      return { text: `Còn ${days} ngày`, isOverdue: false };
    }
  };

  const timeStatus = getTimeStatus();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[1280px] sm:h-[720px] h-[90vh] max-h-[90vh] p-0 overflow-hidden flex flex-col">
        {/* Header with task info */}
        <DialogHeader className="px-4 sm:px-6 py-3 border-b bg-gradient-to-r from-primary/10 to-transparent shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 sm:p-2.5 rounded-xl bg-primary/20 border border-primary/30 shrink-0">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base sm:text-lg font-bold truncate">{task?.title || 'Task'}</DialogTitle>
                <DialogDescription className="text-xs mt-0.5 truncate">
                  {task?.description ? task.description.substring(0, 80) + (task.description.length > 80 ? '...' : '') : 'Xem yêu cầu task và nộp bài'}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {isSubmittingOnBehalf && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <User className="w-3 h-3" />
                  Nộp thay
                </Badge>
              )}
              {timeStatus && (
                <Badge 
                  variant={timeStatus.isOverdue ? "destructive" : "secondary"}
                  className="gap-1 text-xs"
                >
                  <Clock className="w-3 h-3" />
                  {timeStatus.text}
                </Badge>
              )}
              <Badge className={`${statusConfig.color} gap-1 border text-xs`}>
                <StatusIcon className="w-3 h-3" />
                {statusConfig.label}
              </Badge>
            </div>
          </div>
        </DialogHeader>
        
        {/* Tab Navigation - Fixed horizontal menu */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b bg-muted/30 px-3 sm:px-6 shrink-0 overflow-x-auto">
            <TabsList className="h-10 sm:h-12 bg-transparent gap-1 p-0">
              <TabsTrigger 
                value="requirements" 
                className="h-8 sm:h-10 px-3 sm:px-5 gap-1.5 sm:gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary transition-all text-xs sm:text-sm"
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="font-medium">Yêu cầu</span>
              </TabsTrigger>
              <TabsTrigger 
                value="discussion" 
                className="h-8 sm:h-10 px-3 sm:px-5 gap-1.5 sm:gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary transition-all text-xs sm:text-sm"
              >
                <MessagesSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="font-medium">Trao đổi</span>
              </TabsTrigger>
              {!viewOnly && (
                <TabsTrigger 
                  value="submit" 
                  className="h-8 sm:h-10 px-3 sm:px-5 gap-1.5 sm:gap-2 rounded-b-none border-b-2 border-transparent transition-all text-xs sm:text-sm
                    data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:border-primary
                    data-[state=inactive]:bg-primary/15 data-[state=inactive]:text-primary-foreground data-[state=inactive]:hover:bg-primary/25
                    animate-pulse data-[state=active]:animate-none"
                >
                  <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="font-bold">Nộp bài</span>
                  {hasContent && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-background/80">
                      {filesCount + validLinksCount}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
              {viewOnly && (
                <div className="flex items-center h-10 px-4 gap-2 text-muted-foreground">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs">Chế độ xem</span>
                </div>
              )}
            </TabsList>
          </div>

          {/* Tab Content - Scrollable per page */}
          <div className="flex-1 overflow-hidden">
            {/* Tab 1: Yêu cầu Task - Optimized compact layout */}
            <TabsContent value="requirements" className="h-full m-0 data-[state=inactive]:hidden">
              <ScrollArea className="h-full">
                <div className="p-4">
                  {/* Compact Two Column Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Left Column - Main Content (8 cols) */}
                    <div className="lg:col-span-8 space-y-3">
                      {/* Task Title & Description - Combined for compactness */}
                      <div className="rounded-xl border border-border/50 bg-gradient-to-br from-muted/30 to-background overflow-hidden">
                        <div className="px-3 py-2 border-b border-border/30 bg-primary/5">
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-primary" />
                            <span className="text-sm font-bold text-primary">Yêu cầu Task</span>
                          </div>
                        </div>
                        <div className="p-3 space-y-2">
                          <h2 className="text-base font-bold text-foreground leading-tight">{task?.title}</h2>
                          {task?.description && (
                            <div className="pt-2 border-t border-border/30">
                              <ResourceLinkRenderer 
                                content={task.description} 
                                className="text-sm text-foreground/90 leading-relaxed block"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Deadline - Compact 1 line with tooltip */}
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={`rounded-lg border px-3 py-2 flex items-center gap-2 cursor-default ${hasExtension ? 'border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20' : isOverdue ? 'border-destructive/30 bg-destructive/5' : 'border-border/50 bg-muted/20'}`}>
                              <Calendar className={`w-4 h-4 shrink-0 ${hasExtension ? 'text-blue-600' : isOverdue ? 'text-destructive' : 'text-orange-500'}`} />
                              <span className="text-xs text-muted-foreground shrink-0">Deadline:</span>
                              
                              {hasExtension && originalDeadlineDate && extendedDeadlineDate ? (
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <span className="text-xs text-muted-foreground line-through truncate">
                                    {format(originalDeadlineDate, "dd/MM – HH:mm", { locale: vi })}
                                  </span>
                                  <Badge className="shrink-0 text-[9px] px-1 bg-blue-500/10 text-blue-600 border-blue-500/30">
                                    {getExtensionText(getExtensionHours())}
                                  </Badge>
                                  <span className={`text-xs font-bold truncate ${isOverdue ? 'text-destructive' : 'text-blue-700'}`}>
                                    {format(extendedDeadlineDate, "dd/MM/yyyy – HH:mm", { locale: vi })}
                                  </span>
                                </div>
                              ) : deadlineDate ? (
                                <span className={`text-xs font-bold truncate ${isOverdue ? 'text-destructive' : 'text-foreground'}`}>
                                  {format(deadlineDate, "dd/MM/yyyy – HH:mm", { locale: vi })}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">Không có deadline</span>
                              )}
                              
                              {timeStatus && (
                                <Badge 
                                  variant={timeStatus.isOverdue ? "destructive" : "secondary"}
                                  className="ml-auto shrink-0 gap-1 text-[10px] px-1.5"
                                >
                                  <Clock className="w-2.5 h-2.5" />
                                  {timeStatus.text}
                                </Badge>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs max-w-xs">
                            <div className="space-y-1">
                              {hasExtension && originalDeadlineDate && extendedDeadlineDate ? (
                                <>
                                  <p><span className="text-muted-foreground">Deadline gốc:</span> {format(originalDeadlineDate, "dd/MM/yyyy – HH:mm", { locale: vi })}</p>
                                  <p><span className="text-muted-foreground">Gia hạn:</span> {getExtensionText(getExtensionHours())}</p>
                                  <p><span className="text-muted-foreground">Deadline mới:</span> <span className="font-bold">{format(extendedDeadlineDate, "dd/MM/yyyy – HH:mm", { locale: vi })}</span></p>
                                </>
                              ) : deadlineDate ? (
                                <p><span className="text-muted-foreground">Deadline:</span> <span className="font-bold">{format(deadlineDate, "dd/MM/yyyy – HH:mm", { locale: vi })}</span></p>
                              ) : (
                                <p>Không có deadline</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* Assignees - Horizontal compact */}
                      <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-xs font-semibold text-foreground">Người thực hiện</span>
                          <Badge variant="secondary" className="text-[10px] ml-auto">{taskAssignees.length}</Badge>
                        </div>
                        {taskAssignees.length > 0 ? (
                          <TooltipProvider delayDuration={200}>
                            <div className="flex flex-wrap gap-1.5">
                              {taskAssignees.map((assignee, idx) => (
                                <Tooltip key={idx}>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background/60 border border-border/30 hover:border-primary/30 cursor-pointer transition-all">
                                      <UserAvatar 
                                        src={assignee.avatar_url} 
                                        name={assignee.full_name} 
                                        size="xs"
                                      />
                                      <span className="text-[11px] font-medium text-foreground truncate max-w-20">
                                        {assignee.full_name}
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    <div className="font-medium">{assignee.full_name}</div>
                                    {assignee.student_id && (
                                      <div className="text-muted-foreground">MSSV: {assignee.student_id}</div>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            </div>
                          </TooltipProvider>
                        ) : (
                          <p className="text-xs text-muted-foreground">Chưa phân công</p>
                        )}
                      </div>

                      {/* Notes - Collapsible for compactness */}
                      {task && (
                        <Collapsible open={isNotesOpen} onOpenChange={setIsNotesOpen}>
                          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 overflow-hidden">
                            <CollapsibleTrigger className="w-full px-3 py-2 flex items-center justify-between hover:bg-amber-500/10 transition-colors">
                              <div className="flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-xs font-semibold text-foreground">Ghi chú trao đổi với Giảng viên</span>
                                <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-500/30">Thông tin phụ</Badge>
                              </div>
                              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isNotesOpen ? 'rotate-180' : ''}`} />
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="h-[130px] border-t border-amber-500/20">
                                <CompactTaskNotes 
                                  taskId={task.id}
                                  className="h-full"
                                />
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      )}
                    </div>

                    {/* Right Column - Submission Summary + Status + Score (4 cols) */}
                    <div className="lg:col-span-4 space-y-3">
                      {/* Submission Summary Card */}
                      <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-lg bg-primary/20">
                            <Upload className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <span className="text-sm font-bold text-foreground">Bài đã nộp</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="text-center p-2 rounded-lg bg-background/60">
                            <HardDrive className="w-3.5 h-3.5 mx-auto mb-0.5 text-emerald-500" />
                            <p className="text-lg font-bold text-foreground">{filesCount}</p>
                            <p className="text-[9px] text-muted-foreground">File</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-background/60">
                            <Globe className="w-3.5 h-3.5 mx-auto mb-0.5 text-blue-500" />
                            <p className="text-lg font-bold text-foreground">{validLinksCount}</p>
                            <p className="text-[9px] text-muted-foreground">Link</p>
                          </div>
                        </div>

                        {totalFileSize > 0 && (
                          <p className="text-[10px] text-muted-foreground text-center pt-1.5 border-t border-primary/20">
                            Dung lượng: {formatFileSize(totalFileSize)}
                          </p>
                        )}

                        {!hasContent && (
                          <div className="text-center pt-1.5 border-t border-primary/20 mt-2">
                            <p className="text-[10px] text-muted-foreground">Chưa có bài nộp</p>
                          </div>
                        )}
                      </div>

                      {/* Status + Score Row - Same row, equal width */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-border/50 bg-muted/20 p-2 text-center">
                          <StatusIcon className={`w-3.5 h-3.5 mx-auto mb-0.5 ${task?.status === 'VERIFIED' ? 'text-success' : task?.status === 'DONE' ? 'text-primary' : 'text-warning'}`} />
                          <p className="text-[9px] uppercase text-muted-foreground mb-0.5">Trạng thái</p>
                          <Badge className={`${statusConfig.color} gap-0.5 border text-[9px] px-1 py-0`}>
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <div className="rounded-lg border border-border/50 bg-muted/20 p-2 text-center">
                          <Award className="w-3.5 h-3.5 mx-auto mb-0.5 text-amber-500" />
                          <p className="text-[9px] uppercase text-muted-foreground mb-0.5">Điểm</p>
                          {taskScore ? (
                            <span className={`text-base font-bold ${
                              taskScore.final_score >= 90 ? 'text-green-600' :
                              taskScore.final_score >= 70 ? 'text-primary' :
                              taskScore.final_score >= 50 ? 'text-yellow-600' : 'text-destructive'
                            }`}>{taskScore.final_score}</span>
                          ) : (
                            <p className="text-[10px] text-muted-foreground">Chưa chấm</p>
                          )}
                        </div>
                      </div>

                      {/* Quick Action - Full width button */}
                      {canSubmit && (
                        <Button 
                          onClick={() => setActiveTab('submit')}
                          className="w-full h-12 gap-2 shadow-lg text-sm font-semibold"
                          size="lg"
                        >
                          <Send className="w-4 h-4" />
                          Đi đến Nộp bài
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Tab 2: Trao đổi - Full height chat */}
            <TabsContent value="discussion" className="h-full m-0 data-[state=inactive]:hidden">
              <div className="h-full flex flex-col">
                {task && (
                  <TaskComments 
                    taskId={task.id} 
                    groupId={task.group_id} 
                    className="flex-1 border-0 rounded-none"
                  />
                )}
              </div>
            </TabsContent>

            {/* Tab 3: Nộp bài - Redesigned with full-width layout */}
            <TabsContent value="submit" className="h-full m-0 data-[state=inactive]:hidden">
              <div className="h-full flex flex-col">
                {/* Compact Header Bar */}
                <div className="px-4 py-2.5 border-b bg-gradient-to-r from-primary/10 to-transparent shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/15 border border-primary/30">
                        <Send className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Nộp bài Task</h3>
                        <p className="text-[10px] text-muted-foreground">Tải file hoặc dán liên kết</p>
                      </div>
                    </div>
                    
                    {/* Right side: Countdown + Stats */}
                    <div className="flex items-center gap-3">
                      {/* Countdown Timer */}
                      {task?.deadline && (
                        <div className={`px-3 py-1.5 rounded-lg border ${isOverdue ? 'bg-destructive/10 border-destructive/30' : 'bg-primary/10 border-primary/30'}`}>
                          <CountdownTimer 
                            deadline={taskWithExtended?.extended_deadline || task.deadline} 
                            showIcon={true}
                            className="text-sm"
                          />
                        </div>
                      )}
                      
                      {/* Submission Stats */}
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">
                        <div className="flex items-center gap-1">
                          <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-sm font-bold text-foreground">{filesCount}</span>
                        </div>
                        <div className="w-px h-4 bg-border/50" />
                        <div className="flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-sm font-bold text-foreground">{validLinksCount}</span>
                        </div>
                        {totalFileSize > 0 && (
                          <>
                            <div className="w-px h-4 bg-border/50" />
                            <span className="text-xs text-muted-foreground">{formatFileSize(totalFileSize)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fixed Content Area - no outer scroll */}
                <div className="flex-1 overflow-hidden">
                  <div className="p-4 h-full flex flex-col gap-4">
                    {/* Submission Method Info Banner */}
                    {submissionMethod !== 'both' && (
                      <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 shrink-0 ${
                        submissionMethod === 'file_only' 
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                          : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      }`}>
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-medium">
                          {submissionMethod === 'file_only' 
                            ? 'Task này chỉ cho phép nộp bằng cách tải file lên' 
                            : 'Task này chỉ cho phép nộp bằng cách dán liên kết'}
                        </span>
                      </div>
                    )}

                    {/* Layout - File Upload & Links - fill remaining height */}
                    <div className={`grid gap-6 flex-1 min-h-0 ${allowFileUpload && allowLinkSubmission ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                      {/* CÁCH 1 - File Upload */}
                      {allowFileUpload && (
                        <div className="rounded-xl border-2 border-emerald-500/30 overflow-hidden flex flex-col shadow-sm min-h-0">
                          {/* Header inside box */}
                          <div className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-emerald-500/15 via-emerald-500/8 to-transparent border-b border-emerald-500/20">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-extrabold text-lg shadow-lg shadow-emerald-500/30">
                              1
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-extrabold font-heading tracking-wide bg-gradient-to-r from-emerald-600 to-emerald-500 dark:from-emerald-400 dark:to-emerald-300 bg-clip-text text-transparent leading-tight">
                                CÁCH 1
                              </h3>
                              <p className="text-sm font-semibold text-emerald-700/70 dark:text-emerald-300/70 mt-0.5">Tải file từ máy tính</p>
                            </div>
                            <Badge className="text-[9px] px-1.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                              Max {formatFileSize(maxFileSize)}
                            </Badge>
                          </div>

                          {/* Content area */}
                          <div className="p-3 flex-1 min-h-0 overflow-y-auto relative bg-gradient-to-b from-emerald-500/[0.03] to-transparent">
                            {uploadedFiles.length === 0 && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2">
                                {/* Decorative background circle */}
                                <div className="absolute w-40 h-40 rounded-full bg-emerald-500/[0.08] blur-xl" />
                                
                                {/* Icon cluster */}
                                <div className="relative mb-2">
                                  <CloudUpload className="w-14 h-14 text-emerald-500/30" strokeWidth={1.2} />
                                  {/* Floating mini icons */}
                                  <File className="w-6 h-6 text-emerald-500/20 absolute -top-2 -right-3 rotate-12" strokeWidth={1.5} />
                                  <Monitor className="w-5 h-5 text-emerald-500/20 absolute -bottom-1 -left-4 -rotate-6" strokeWidth={1.5} />
                                  <FileText className="w-5 h-5 text-emerald-500/20 absolute top-0 -left-5 rotate-[-15deg]" strokeWidth={1.5} />
                                </div>

                                <p className="text-lg font-black font-heading tracking-wider bg-gradient-to-r from-emerald-500/40 to-emerald-600/30 bg-clip-text text-transparent">
                                  CÁCH 1
                                </p>
                                <p className="text-sm font-semibold text-emerald-600/50 dark:text-emerald-400/50">
                                  Tải file từ máy tính
                                </p>
                                <p className="text-xs text-muted-foreground/60 mt-1">
                                  Kéo thả hoặc nhấn chọn file
                                </p>
                                
                                {/* Decorative dots */}
                                <div className="flex gap-1.5 mt-3 opacity-35">
                                  {[...Array(5)].map((_, i) => (
                                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="relative z-10">
                              <MultiFileUploadSubmission
                                onFilesChanged={setUploadedFiles}
                                uploadedFiles={uploadedFiles}
                                userId={user?.id || ''}
                                taskId={task?.id || ''}
                                disabled={!canSubmit}
                                compact
                                maxTotalSize={maxFileSize}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* CÁCH 2 - External Links */}
                      {allowLinkSubmission && (
                        <div className="rounded-xl border-2 border-blue-500/30 overflow-hidden flex flex-col shadow-sm min-h-0">
                          {/* Header inside box */}
                          <div className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-blue-500/15 via-blue-500/8 to-transparent border-b border-blue-500/20">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white font-extrabold text-lg shadow-lg shadow-blue-500/30">
                              2
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-extrabold font-heading tracking-wide bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent leading-tight">
                                CÁCH 2
                              </h3>
                              <p className="text-sm font-semibold text-blue-700/70 dark:text-blue-300/70 mt-0.5">Dán liên kết bên ngoài</p>
                            </div>
                            {canSubmit && (
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={addSubmissionLink} 
                                className="h-7 px-2.5 text-[10px] gap-1 border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
                              >
                                <Plus className="w-3 h-3" />
                                Thêm link
                              </Button>
                            )}
                          </div>

                          {/* Content area */}
                          <div className="p-3 flex-1 min-h-0 overflow-y-auto bg-gradient-to-b from-blue-500/[0.03] to-transparent">
                            {submissionLinks.length > 0 ? (
                              <div className="space-y-2">
                                {submissionLinks.map((link, index) => (
                                  <div key={index} className="p-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-1.5 group hover:border-blue-500/40 transition-colors">
                                    <div className="flex items-center gap-2">
                                      <Badge className="text-[9px] px-1 py-0 shrink-0 bg-blue-500/20 border-0 text-blue-600">
                                        #{index + 1}
                                      </Badge>
                                      <Input
                                        placeholder="Tên liên kết"
                                        value={link.title}
                                        onChange={(e) => updateSubmissionLink(index, 'title', e.target.value)}
                                        disabled={!canSubmit}
                                        className="h-6 text-xs px-2 flex-1 border-blue-500/20 bg-background/80"
                                      />
                                    </div>
                                    <div className="flex gap-1">
                                      <Input
                                        placeholder="https://drive.google.com/..."
                                        value={link.url}
                                        onChange={(e) => updateSubmissionLink(index, 'url', e.target.value)}
                                        disabled={!canSubmit}
                                        className="h-6 text-xs px-2 flex-1 font-mono border-blue-500/20 bg-background/80"
                                      />
                                      <div className="flex gap-0.5 shrink-0">
                                        {link.url && (
                                          <a href={link.url} target="_blank" rel="noopener noreferrer">
                                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10">
                                              <ExternalLink className="w-3 h-3" />
                                            </Button>
                                          </a>
                                        )}
                                        {canSubmit && (
                                          <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => removeSubmissionLink(index)}
                                            className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div 
                                onClick={() => canSubmit && addSubmissionLink()}
                                className={`
                                  h-full min-h-[180px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-all
                                  ${canSubmit ? 'cursor-pointer border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/5' : 'border-muted/30'}
                                `}
                              >
                                {/* Decorative background circle */}
                                <div className="absolute w-40 h-40 rounded-full bg-blue-500/[0.08] blur-xl" />
                                
                                {/* Icon cluster */}
                                <div className="relative mb-2">
                                  <Link2 className="w-14 h-14 text-blue-500/30" strokeWidth={1.2} />
                                  <Globe className="w-6 h-6 text-blue-500/20 absolute -top-2 -right-3 rotate-12" strokeWidth={1.5} />
                                  <ExternalLink className="w-5 h-5 text-blue-500/20 absolute -bottom-1 -left-4 -rotate-6" strokeWidth={1.5} />
                                  <LinkIcon className="w-5 h-5 text-blue-500/20 absolute top-0 -left-5 rotate-[-15deg]" strokeWidth={1.5} />
                                </div>

                                <p className="text-lg font-black font-heading tracking-wider bg-gradient-to-r from-blue-500/40 to-blue-600/30 bg-clip-text text-transparent">
                                  CÁCH 2
                                </p>
                                <p className="text-sm font-semibold text-blue-600/50 dark:text-blue-400/50">
                                  Dán liên kết bên ngoài
                                </p>
                                <p className="text-xs text-muted-foreground/60 mt-1">
                                  {canSubmit ? 'Nhấn để thêm liên kết' : 'Chưa có liên kết'}
                                </p>
                                <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                                  Google Drive, Dropbox, OneDrive...
                                </p>
                                
                                {/* Decorative dots */}
                                <div className="flex gap-1.5 mt-3 opacity-35">
                                  {[...Array(5)].map((_, i) => (
                                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Removed: Status & Note now shown in post-submit step */}
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
        
        {/* Footer */}
        <DialogFooter className="px-6 py-3 border-t bg-muted/30 gap-2 shrink-0">
          <Button variant="outline" onClick={onClose} className="h-10 min-w-24">
            Đóng
          </Button>
          {canSubmit && (
            <Button 
              onClick={() => {
                if (activeTab !== 'submit') {
                  setActiveTab('submit');
                } else {
                  handleSubmitClick();
                }
              }} 
              disabled={isLoading || (activeTab === 'submit' && !hasContent)} 
              className="h-10 min-w-32 gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang nộp...
                </>
              ) : activeTab !== 'submit' ? (
                <>
                  <Send className="w-4 h-4" />
                  Đi đến Nộp bài
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {isSubmittingOnBehalf ? 'Nộp thay' : 'Nộp bài'}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Post-Submit Step: 16:9 Enhanced Summary */}
      <AlertDialog open={showPostSubmitStep} onOpenChange={setShowPostSubmitStep}>
        <AlertDialogContent className="max-w-4xl p-0 overflow-hidden gap-0">
          <div className="flex flex-col md:flex-row overflow-hidden">
            {/* Left side - Illustration */}
            {(() => {
              const now = new Date();
              const isLate = !!deadlineDate && now > deadlineDate;
              return (
                <div className={`relative md:w-[38%] flex items-center justify-center p-6 md:p-10 min-h-[180px] md:min-h-[480px] ${
                  isLate 
                    ? 'bg-gradient-to-br from-warning/10 to-orange-50 dark:from-warning/5 dark:to-orange-950/20' 
                    : 'bg-gradient-to-br from-primary/5 to-teal-50 dark:from-primary/5 dark:to-teal-950/20'
                }`}>
                  <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)),transparent_70%)]" />
                  <div className="relative flex flex-col items-center gap-4 text-center">
                    <img 
                      src={submissionIllustration} 
                      alt="Nộp bài" 
                      className="w-40 md:w-56 h-auto drop-shadow-lg" 
                    />
                    <div className="space-y-1.5">
                      <p className="text-xl md:text-2xl font-bold text-foreground">
                        {isLate ? 'Nộp bài trễ hạn' : 'Sẵn sàng nộp bài!'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate max-w-[260px]">
                        {task?.title}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Right side - Content */}
            <div className="md:w-[62%] flex flex-col min-w-0 overflow-hidden">
              <AlertDialogHeader className="sr-only">
                <AlertDialogTitle>Xác nhận nộp bài</AlertDialogTitle>
              </AlertDialogHeader>
              
              <div className="p-6 space-y-4 flex-1 overflow-y-auto max-h-[55vh] md:max-h-none">
                {/* Title */}
                <h2 className="text-center text-lg font-bold bg-clip-text text-transparent animate-[gradient-shift_3s_ease-in-out_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary)))', backgroundSize: '200% 100%' }}>
                  Xác nhận nộp bài
                </h2>
                {/* Late Warning */}
                {(() => {
                  const now = new Date();
                  const isLate = !!deadlineDate && now > deadlineDate;
                  if (!isLate || !deadlineDate) return null;
                  const lateMs = now.getTime() - deadlineDate.getTime();
                  const lateHours = Math.floor(lateMs / (1000 * 60 * 60));
                  const lateMins = Math.floor((lateMs % (1000 * 60 * 60)) / (1000 * 60));
                  let lateText = '';
                  if (lateHours > 24) {
                    const days = Math.floor(lateHours / 24);
                    const remHours = lateHours % 24;
                    lateText = `${days} ngày ${remHours > 0 ? `${remHours} giờ` : ''}`;
                  } else if (lateHours > 0) {
                    lateText = `${lateHours} giờ ${lateMins > 0 ? `${lateMins} phút` : ''}`;
                  } else {
                    lateText = `${lateMins} phút`;
                  }
                  return (
                    <div className="flex items-center gap-3 p-3.5 rounded-xl border border-warning/40 bg-warning/5">
                      <div className="h-9 w-9 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
                        <ShieldAlert className="w-4 h-4 text-warning" />
                      </div>
                      <div>
                        <p className="font-semibold text-warning text-sm">Trễ hạn {lateText}</p>
                        <p className="text-xs text-muted-foreground">
                          Deadline: {format(deadlineDate, "dd/MM/yyyy 'lúc' HH:mm", { locale: vi })}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* SECTION 1: Submission Content */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">1</div>
                    <span className="text-sm font-semibold text-foreground">Nội dung nộp</span>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-3.5 space-y-2 overflow-hidden max-h-[140px] overflow-y-auto">
                    {filesCount > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                            <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
                            {filesCount} file
                          </span>
                          <Badge variant="secondary" className="text-[10px] h-5">{formatFileSize(totalFileSize)}</Badge>
                        </div>
                        {uploadedFiles.map((f, i) => (
                          <div key={i} className="text-xs text-muted-foreground pl-5 flex items-center gap-1.5 min-w-0 overflow-hidden">
                            <FileText className="w-3 h-3 shrink-0 opacity-60" />
                            <span className="truncate min-w-0 flex-1" title={f.file_name}>{f.file_name}</span>
                            <span className="shrink-0 opacity-50 text-[10px]">({formatFileSize(f.file_size)})</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {validLinksCount > 0 && (
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-blue-500" />
                          {validLinksCount} liên kết
                        </span>
                        {submissionLinks.filter(l => l.url?.trim()).map((l, i) => (
                          <div key={i} className="text-xs text-muted-foreground pl-5 flex items-center gap-1.5 min-w-0 overflow-hidden">
                            <LinkIcon className="w-3 h-3 shrink-0 opacity-60" />
                            <span className="truncate min-w-0 flex-1" title={l.title || l.url}>{l.title || l.url}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {hasExistingSubmission && (
                      <div className="flex items-center gap-1.5 text-xs text-blue-600 mt-1">
                        <Upload className="w-3 h-3" />
                        Lần nộp lại (cập nhật bài cũ)
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION 2: Status Selection */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">2</div>
                    <span className="text-sm font-semibold text-foreground">Chọn trạng thái <span className="text-destructive">*</span></span>
                  </div>
                  <div className={`grid gap-2 ${isLeaderInGroup ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    {[
                      { value: 'IN_PROGRESS' as TaskStatus, label: 'Đang làm', desc: 'Sửa chữa / bổ sung thêm', borderColor: 'border-warning', iconColor: 'text-warning', dotClass: 'bg-warning', icon: Clock },
                      { value: 'DONE' as TaskStatus, label: 'Hoàn thành', desc: 'Đã làm xong', borderColor: 'border-primary', iconColor: 'text-primary', dotClass: 'bg-primary', icon: CheckCircle2 },
                      ...(isLeaderInGroup ? [{ value: 'VERIFIED' as TaskStatus, label: 'Đã duyệt', desc: 'Duyệt luôn', borderColor: 'border-success', iconColor: 'text-success', dotClass: 'bg-success', icon: Award }] : []),
                    ].map((opt) => {
                      const isSelected = status === opt.value;
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setStatus(opt.value)}
                          className={`relative flex flex-col items-center gap-1.5 p-3.5 rounded-xl border-2 transition-all text-center cursor-pointer bg-background
                            ${isSelected 
                              ? `${opt.borderColor} shadow-lg` 
                              : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                            }`}
                        >
                          <Icon className={`w-5 h-5 ${isSelected ? opt.iconColor : 'text-muted-foreground'}`} />
                          <span className="text-xs font-semibold text-foreground">{opt.label}</span>
                          <span className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</span>
                          {isSelected && (
                            <div className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${opt.dotClass}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {status === '' && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Vui lòng chọn trạng thái trước khi nộp
                    </p>
                  )}
                </div>

                {/* SECTION 3: Note */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">3</div>
                    <span className="text-sm font-medium text-muted-foreground">Ghi chú <span className="text-xs">(tùy chọn)</span></span>
                  </div>
                  <Input
                    placeholder="Thêm ghi chú cho bài nộp..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t bg-muted/20 flex justify-end gap-2.5 mt-auto">
                <Button variant="outline" onClick={() => setShowPostSubmitStep(false)} className="h-10 px-5">
                  Quay lại
                </Button>
                <Button
                  onClick={handleConfirmSubmit}
                  disabled={isLoading || status === ''}
                  className={`h-10 gap-2 min-w-[140px] ${(() => {
                    const now = new Date();
                    const isLate = !!deadlineDate && now > deadlineDate;
                    return isLate ? "bg-warning text-warning-foreground hover:bg-warning/90" : "";
                  })()}`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang nộp...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Xác nhận nộp
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
