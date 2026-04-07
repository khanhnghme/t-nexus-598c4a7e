import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CalendarEvent } from '@/types/calendar';
import { parseLocalDateTime } from '@/lib/datetime';
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import UserAvatar from '@/components/UserAvatar';
import TaskSubmissionDialog from '@/components/TaskSubmissionDialog';
import {
  Clock, CheckCircle2, AlertTriangle, ExternalLink, Send,
  Calendar, Users, FileText, Loader2, Circle, Target, FolderOpen
} from 'lucide-react';
import type { Task, TaskStatus } from '@/types/database';

interface CalendarTaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  onRefresh?: () => void;
}

interface TaskAssignee {
  user_id: string;
  full_name: string;
  student_id?: string;
  avatar_url?: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bgClass: string; badgeClass: string }> = {
  TODO: {
    label: 'Chờ thực hiện',
    icon: Circle,
    color: 'text-muted-foreground',
    bgClass: 'bg-muted',
    badgeClass: 'bg-muted text-muted-foreground border border-border',
  },
  IN_PROGRESS: {
    label: 'Đang thực hiện',
    icon: Loader2,
    color: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-500/15',
    badgeClass: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30',
  },
  REVIEW: {
    label: 'Chờ duyệt',
    icon: Target,
    color: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-500/15',
    badgeClass: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30',
  },
  DONE: {
    label: 'Hoàn thành',
    icon: CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    bgClass: 'bg-green-500/15',
    badgeClass: 'bg-green-500/20 text-green-700 dark:text-green-300 border border-green-500/30',
  },
  VERIFIED: {
    label: 'Đã duyệt',
    icon: CheckCircle2,
    color: 'text-green-700 dark:text-green-300',
    bgClass: 'bg-green-500/20',
    badgeClass: 'bg-green-600/25 text-green-800 dark:text-green-200 border border-green-500/40',
  },
};

export default function CalendarTaskDetailDialog({ open, onOpenChange, event, onRefresh }: CalendarTaskDetailDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [loading, setLoading] = useState(false);
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [isAssignee, setIsAssignee] = useState(false);
  const [isLeaderInGroup, setIsLeaderInGroup] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>('TODO');

  useEffect(() => {
    if (!open || !event || event.type !== 'task') return;
    setCurrentStatus((event.taskStatus as string) || 'TODO');
    fetchTaskData();
  }, [open, event?.id]);

  const fetchTaskData = async () => {
    if (!event || !user?.id) return;
    setLoading(true);
    try {
      const { data: taskData } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', event.id)
        .single();

      if (taskData) {
        setTask(taskData as unknown as Task);
        setCurrentStatus(taskData.status || 'TODO');
      }

      const { data: assignments } = await supabase
        .from('task_assignments')
        .select('user_id')
        .eq('task_id', event.id);

      const assigneeIds = assignments?.map(a => a.user_id) || [];
      setIsAssignee(assigneeIds.includes(user.id));

      if (assigneeIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, student_id, avatar_url')
          .in('id', assigneeIds);

        setAssignees((profiles || []).map(p => ({
          user_id: p.id,
          full_name: p.full_name,
          student_id: p.student_id,
          avatar_url: p.avatar_url,
        })));
      }

      if (event.projectId) {
        const { data: membership } = await supabase
          .from('group_members')
          .select('role')
          .eq('group_id', event.projectId)
          .eq('user_id', user.id)
          .single();

        setIsLeaderInGroup(membership?.role === 'leader' || membership?.role === 'owner_system');
      }
    } catch (err) {
      console.error('Error fetching task data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!event) return null;

  const taskWithExtended = task as (Task & { extended_deadline?: string }) | null;
  const originalDeadline = task?.deadline ? parseLocalDateTime(task.deadline) : event.date;
  const extendedDeadline = taskWithExtended?.extended_deadline ? parseLocalDateTime(taskWithExtended.extended_deadline) : null;
  const deadlineDate = extendedDeadline || originalDeadline;
  const hasExtended = !!extendedDeadline && !!originalDeadline;
  const isOverdue = currentStatus !== 'DONE' && currentStatus !== 'VERIFIED' && (deadlineDate ? deadlineDate < new Date() : false);
  const statusCfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.TODO;
  const StatusIcon = statusCfg.icon;
  const canSubmit = isAssignee && task;

  const handleOpenInProject = () => {
    if (event.projectSlug && event.taskSlug) {
      onOpenChange(false);
      navigate(`/p/${event.projectSlug}/t/${event.taskSlug}?tab=submit`);
    }
  };

  const handleSubmissionComplete = () => {
    setSubmissionOpen(false);
    // Re-fetch task to get updated status immediately
    fetchTaskData();
    onRefresh?.();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[1280px] w-[95vw] max-h-[720px] h-[80vh] p-0 overflow-hidden">
          <div className="flex flex-col h-full">
            {/* Project banner */}
            {event.projectName && (
              <div className="bg-primary/10 border-b border-primary/20 px-6 py-3 flex items-center gap-2.5">
                <FolderOpen className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-primary/60 font-semibold">Dự án</p>
                  <p className="text-sm font-bold text-primary">{event.projectName}</p>
                </div>
                {event.projectSlug && (
                  <button
                    onClick={handleOpenInProject}
                    className="ml-auto text-xs text-primary/70 hover:text-primary flex items-center gap-1 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Mở dự án
                  </button>
                )}
              </div>
            )}

            {/* Header */}
            <div className="p-6 pb-4 border-b border-border">
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="mb-1">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Công việc</p>
                      <DialogTitle className="text-2xl font-bold leading-tight">
                        {event.title}
                      </DialogTitle>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap mt-2">
                      <Badge className={cn(statusCfg.badgeClass, 'text-xs gap-1.5 px-3 py-1')}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusCfg.label}
                      </Badge>
                      {isOverdue && (
                        <Badge variant="destructive" className="text-xs gap-1.5 px-3 py-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Quá hạn
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {canSubmit && (
                      <Button onClick={() => setSubmissionOpen(true)} className="gap-1.5">
                        <Send className="w-4 h-4" />
                        Nộp bài
                      </Button>
                    )}
                    <Button variant="outline" onClick={handleOpenInProject} className="gap-1.5">
                      <ExternalLink className="w-4 h-4" />
                      Mở trong dự án
                    </Button>
                  </div>
                </div>
              </DialogHeader>
            </div>

            {/* Body */}
            <ScrollArea className="flex-1">
              <div className="p-6">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left: Description */}
                    <div className="md:col-span-2 space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-primary" />
                          Mô tả công việc
                        </h3>
                        <div className="bg-muted/40 rounded-lg p-5 text-sm leading-relaxed whitespace-pre-wrap min-h-[180px] border border-border/50">
                          {task?.description || (
                            <span className="text-muted-foreground italic">Không có mô tả cho task này</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Info sidebar */}
                    <div className="space-y-4">
                      {/* Deadline card */}
                      <div className={cn(
                        "rounded-lg p-4 space-y-2 border",
                        isOverdue ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"
                      )}>
                        <h3 className="text-sm font-semibold flex items-center gap-1.5">
                          <Calendar className={cn("w-4 h-4", isOverdue ? "text-destructive" : "text-primary")} />
                          Thời hạn
                        </h3>
                        <div className={cn(
                          "text-lg font-bold",
                          isOverdue ? "text-destructive" : "text-foreground"
                        )}>
                          {deadlineDate ? format(deadlineDate, "HH:mm - dd/MM/yyyy", { locale: vi }) : 'Không có'}
                        </div>
                        {hasExtended && originalDeadline && (
                          <p className="text-xs text-muted-foreground line-through">
                            Hạn gốc: {format(originalDeadline, "HH:mm - dd/MM/yyyy", { locale: vi })}
                          </p>
                        )}
                        {hasExtended && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/40 text-amber-600">
                            Đã gia hạn
                          </Badge>
                        )}
                        {deadlineDate && (
                          <p className={cn(
                            "text-xs font-medium",
                            isOverdue ? "text-destructive" : "text-muted-foreground"
                          )}>
                            {isOverdue ? '⚠ Đã quá hạn ' : '⏳ Còn '}
                            {formatDistanceToNow(deadlineDate, { locale: vi, addSuffix: !isOverdue })}
                          </p>
                        )}
                      </div>

                      {/* Status card */}
                      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                        <h3 className="text-sm font-semibold flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-primary" />
                          Trạng thái hiện tại
                        </h3>
                        <div className="flex items-center gap-3">
                          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", statusCfg.bgClass)}>
                            <StatusIcon className={cn("w-6 h-6", statusCfg.color)} />
                          </div>
                          <div>
                            <span className="font-semibold text-base">{statusCfg.label}</span>
                            {currentStatus === 'IN_PROGRESS' && (
                              <p className="text-xs text-muted-foreground">Đang được thực hiện</p>
                            )}
                            {currentStatus === 'DONE' && (
                              <p className="text-xs text-green-600">Đã nộp bài thành công</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Assignees card */}
                      {assignees.length > 0 && (
                        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                          <h3 className="text-sm font-semibold flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-primary" />
                            Người thực hiện ({assignees.length})
                          </h3>
                          <div className="space-y-2.5">
                            {assignees.map(a => (
                              <div key={a.user_id} className="flex items-center gap-2.5 p-1.5 rounded-md hover:bg-muted/50 transition-colors">
                                <UserAvatar
                                  src={a.avatar_url}
                                  name={a.full_name}
                                  className="w-8 h-8"
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{a.full_name}</p>
                                  {a.student_id && (
                                    <p className="text-xs text-muted-foreground">{a.student_id}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Submission dialog */}
      {task && (
        <TaskSubmissionDialog
          task={task}
          isOpen={submissionOpen}
          onClose={() => setSubmissionOpen(false)}
          onSave={handleSubmissionComplete}
          isAssignee={isAssignee}
          isLeaderInGroup={isLeaderInGroup}
          initialTab="submit"
        />
      )}
    </>
  );
}
