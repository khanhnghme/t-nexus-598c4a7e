import { useState, useEffect } from 'react';
import { logActivity } from '@/lib/activityLogger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Loader2, AlertTriangle, Eye, Calendar, Users, FileText, 
  Layers, Edit, Clock, HardDrive, CalendarPlus, ArrowRight,
  CheckCircle2, X, Plus, Send
} from 'lucide-react';
import type { Task, Stage, GroupMember, TaskStatus, SubmissionMethod } from '@/types/database';
import { formatDeadlineVN, formatDeadlineShortVN, isDeadlineOverdue, parseLocalDateTime } from '@/lib/datetime';
import { DeadlineHourPicker } from './DeadlineHourPicker';
import FileSizeLimitSelector, { formatFileSizeMB } from './FileSizeLimitSelector';
import { notifyTaskUpdated, notifyTaskAssigneesChanged } from '@/lib/notifications';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import ResourceTagTextarea from './ResourceTagTextarea';
import ResourceLinkRenderer from './ResourceLinkRenderer';

interface TaskEditDialogProps {
  task: Task | null;
  stages: Stage[];
  members: GroupMember[];
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  canEdit: boolean;
  groupCreatorId?: string;
}

export default function TaskEditDialog({
  task,
  stages,
  members,
  isOpen,
  onClose,
  onSave,
  canEdit: canEditProp,
  groupCreatorId,
}: TaskEditDialogProps) {
  const { toast } = useToast();
  const { user, isLeader, isAdmin, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [stageId, setStageId] = useState<string>('');
  const [assignees, setAssignees] = useState<string[]>([]);
  const [maxFileSize, setMaxFileSize] = useState<number>(10 * 1024 * 1024);
  const [submissionMethod, setSubmissionMethod] = useState<SubmissionMethod>('both');
  const [extensionHours, setExtensionHours] = useState<number>(0);
  const [showExtendSection, setShowExtendSection] = useState(false);
  const [showAssigneesExpanded, setShowAssigneesExpanded] = useState(false);

  // Type for extended task
  const taskWithExtended = task as Task & { extended_deadline?: string; extended_at?: string; extended_by?: string };
  const originalDeadlineOverdue = isDeadlineOverdue(task?.deadline);
  const effectiveDeadline = taskWithExtended?.extended_deadline || task?.deadline;
  const isOverdue = isDeadlineOverdue(effectiveDeadline);
  const hasExtension = !!taskWithExtended?.extended_deadline;
  
  const canEditDetails = canEditProp;

  // Calculate existing extension hours from task
  const getExistingExtensionHours = () => {
    if (!task?.deadline || !taskWithExtended?.extended_deadline) return 0;
    const original = parseLocalDateTime(task.deadline);
    const extended = parseLocalDateTime(taskWithExtended.extended_deadline);
    if (!original || !extended) return 0;
    const diffMs = extended.getTime() - original.getTime();
    return Math.round(diffMs / (1000 * 60 * 60));
  };

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setDeadline(task.deadline ? task.deadline.slice(0, 16) : '');
      setStageId(task.stage_id || '');
      setAssignees(task.task_assignments?.map(a => a.user_id) || []);
      const taskWithSize = task as Task & { max_file_size?: number };
      setMaxFileSize(taskWithSize.max_file_size || 10 * 1024 * 1024);
      setSubmissionMethod((task as any).submission_method || 'both');
      
      const existingHours = getExistingExtensionHours();
      setExtensionHours(existingHours);
      setShowExtendSection(existingHours > 0);
    }
  }, [task]);

  // Calculate extended deadline from hours
  const calculateExtendedDeadline = () => {
    if (!deadline || extensionHours <= 0) return null;
    const original = parseLocalDateTime(deadline);
    if (!original) return null;
    const extended = new Date(original.getTime() + extensionHours * 60 * 60 * 1000);
    return extended;
  };

  const extendedDeadlineDate = calculateExtendedDeadline();

  // Format extension text
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

  const handleSave = async () => {
    if (!task || !canEditDetails) return;
    if (!title.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập tên task',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const changes: string[] = [];
      if (title.trim() !== task.title) changes.push('tên task');
      if ((description.trim() || null) !== (task.description || null)) changes.push('mô tả');
      if ((deadline || null) !== (task.deadline || null)) changes.push('deadline');
      if ((stageId || null) !== (task.stage_id || null)) changes.push('giai đoạn');
      
      const taskWithSize = task as Task & { max_file_size?: number };
      if (maxFileSize !== (taskWithSize.max_file_size || 10 * 1024 * 1024)) changes.push('giới hạn upload');
      if ((task as any).submission_method !== submissionMethod) changes.push('cách nộp bài');
      
      const existingHours = getExistingExtensionHours();
      const newHours = showExtendSection ? extensionHours : 0;
      if (existingHours !== newHours) {
        changes.push('gia hạn deadline');
      }

      const oldAssignees = task.task_assignments?.map(a => a.user_id) || [];
      const newAssigneeIds = assignees.filter(id => !oldAssignees.includes(id));
      const removedAssigneeIds = oldAssignees.filter(id => !assignees.includes(id));

      // Build update object
      const updateData: any = {
        title: title.trim(),
        description: description.trim() || null,
        deadline: deadline || null,
        stage_id: stageId || null,
        max_file_size: maxFileSize,
        submission_method: submissionMethod,
      };

      // Handle extended deadline based on hours
      if (showExtendSection && extensionHours > 0 && extendedDeadlineDate) {
        // Format as ISO string but keep local time
        const year = extendedDeadlineDate.getFullYear();
        const month = String(extendedDeadlineDate.getMonth() + 1).padStart(2, '0');
        const day = String(extendedDeadlineDate.getDate()).padStart(2, '0');
        const hours = String(extendedDeadlineDate.getHours()).padStart(2, '0');
        const minutes = String(extendedDeadlineDate.getMinutes()).padStart(2, '0');
        updateData.extended_deadline = `${year}-${month}-${day}T${hours}:${minutes}`;
      } else {
        updateData.extended_deadline = null;
      }

      const { error: taskError } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', task.id);

      if (taskError) throw taskError;

      await supabase.from('task_assignments').delete().eq('task_id', task.id);

      if (assignees.length > 0) {
        const assignments = assignees.map((userId) => ({
          task_id: task.id,
          user_id: userId,
        }));
        await supabase.from('task_assignments').insert(assignments);
      }

      const { data: groupData } = await supabase
        .from('groups')
        .select('name')
        .eq('id', task.group_id)
        .single();

      const leaderName = profile?.full_name || user?.email || 'Leader';
      const groupName = groupData?.name || 'Project';

      if (changes.length > 0 && assignees.length > 0) {
        await notifyTaskUpdated({
          assigneeIds: assignees,
          leaderName,
          taskTitle: title.trim(),
          taskId: task.id,
          groupId: task.group_id,
          changes,
        });
      }

      if (newAssigneeIds.length > 0 || removedAssigneeIds.length > 0) {
        await notifyTaskAssigneesChanged({
          newAssigneeIds,
          removedAssigneeIds,
          leaderName,
          taskTitle: title.trim(),
          taskId: task.id,
          groupId: task.group_id,
          groupName,
        });
      }

      const activityDescription = changes.length > 0
        ? `Cập nhật ${changes.join(', ')} của task "${title.trim()}"`
        : `Cập nhật task "${title.trim()}"`;

      await logActivity({
        userId: user!.id,
        userName: leaderName,
        action: 'UPDATE_TASK',
        actionType: 'task',
        description: activityDescription,
        groupId: task.group_id,
        metadata: { 
          task_id: task.id, 
          task_title: title.trim(),
          changes,
          new_assignees: newAssigneeIds.length,
          removed_assignees: removedAssigneeIds.length,
        }
      });

      toast({
        title: 'Đã lưu',
        description: 'Task đã được cập nhật',
      });
      
      onSave();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể cập nhật task',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusConfig = (s: TaskStatus) => {
    switch (s) {
      case 'TODO':
        return { label: 'Chờ làm', color: 'bg-muted text-muted-foreground', icon: Clock };
      case 'IN_PROGRESS':
        return { label: 'Đang làm', color: 'bg-warning/10 text-warning border-warning/50', icon: Clock };
      case 'DONE':
        return { label: 'Hoàn thành', color: 'bg-primary/10 text-primary border-primary/50', icon: CheckCircle2 };
      case 'VERIFIED':
        return { label: 'Đã duyệt', color: 'bg-success/10 text-success border-success/50', icon: CheckCircle2 };
      default:
        return { label: s, color: 'bg-muted', icon: Clock };
    }
  };

  const statusConfig = task ? getStatusConfig(task.status) : getStatusConfig('TODO');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[1280px] h-[720px] max-h-[90vh] p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="px-5 py-3 border-b bg-muted/30 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${canEditDetails ? 'bg-primary/10' : 'bg-muted'}`}>
                {canEditDetails ? <Edit className="w-5 h-5 text-primary" /> : <Eye className="w-5 h-5 text-muted-foreground" />}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  {canEditDetails ? 'Chỉnh sửa Task' : 'Chi tiết Task'}
                </DialogTitle>
                <DialogDescription className="text-xs">{task?.title}</DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasExtension && (
                <Badge className="gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs">
                  <CalendarPlus className="w-3 h-3" />Đã gia hạn
                </Badge>
              )}
              {isOverdue && (
                <Badge variant="destructive" className="gap-1 px-2 py-0.5 text-xs">
                  <AlertTriangle className="w-3 h-3" />Quá hạn
                </Badge>
              )}
              <Badge className={`${statusConfig.color} border px-2 py-0.5 gap-1 text-xs`}>
                <statusConfig.icon className="w-3 h-3" />
                {statusConfig.label}
              </Badge>
            </div>
          </div>
        </DialogHeader>
        
        {/* Content - 2 columns */}
        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-12 h-full">
            {/* Left: Form (9 cols) */}
            <div className="col-span-9 p-4 border-r flex flex-col gap-3 overflow-y-auto">
              {/* Title */}
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">
                  Tên task {canEditDetails && <span className="text-destructive">*</span>}
                </Label>
                {canEditDetails ? (
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nhập tên task..." className="h-10 text-base font-medium" />
                ) : (
                  <div className="p-2.5 rounded-lg bg-muted/50 border text-sm font-medium">{task?.title}</div>
                )}
              </div>

              {/* Config row: all fields inline */}
              <div className="grid grid-cols-[1fr_1.2fr_1fr_1fr] gap-3">
                <div>
                  <Label className="text-[11px] font-medium mb-1 block flex items-center gap-1 text-warning">
                    <Layers className="w-3 h-3" /> Giai đoạn
                  </Label>
                  {canEditDetails ? (
                    <Select value={stageId} onValueChange={setStageId}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Chọn..." /></SelectTrigger>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-1.5 rounded bg-muted/50 border text-xs">{stages.find(s => s.id === task?.stage_id)?.name || '—'}</div>
                  )}
                </div>
                <div>
                  <Label className="text-[11px] font-medium mb-1 block flex items-center gap-1 text-accent">
                    <Calendar className="w-3 h-3" /> Deadline
                  </Label>
                  {canEditDetails ? (
                    <DeadlineHourPicker value={deadline} onChange={setDeadline} placeholder="Chọn..." />
                  ) : (
                    <div className={`p-1.5 rounded border text-xs ${originalDeadlineOverdue && !hasExtension ? 'bg-destructive/10 border-destructive/30 text-destructive' : 'bg-muted/50'}`}>
                      {task?.deadline ? formatDeadlineShortVN(task.deadline) : '—'}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-[11px] font-medium mb-1 block flex items-center gap-1">
                    <Send className="w-3 h-3" /> Cách nộp
                  </Label>
                  {canEditDetails ? (
                    <Select value={submissionMethod} onValueChange={(v) => setSubmissionMethod(v as SubmissionMethod)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">Cả hai cách</SelectItem>
                        <SelectItem value="file_only">Chỉ tải file</SelectItem>
                        <SelectItem value="link_only">Chỉ dán link</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-1.5 rounded bg-muted/50 border text-xs">
                      {submissionMethod === 'both' ? 'Cả hai' : submissionMethod === 'file_only' ? 'Tải file' : 'Dán link'}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-[11px] font-medium mb-1 block flex items-center gap-1 text-muted-foreground">
                    <HardDrive className="w-3 h-3" /> Giới hạn
                  </Label>
                  {canEditDetails ? (
                    <FileSizeLimitSelector value={maxFileSize} onChange={setMaxFileSize} />
                  ) : (
                    <div className="p-1.5 rounded bg-muted/50 border text-xs">{formatFileSizeMB(maxFileSize)}</div>
                  )}
                </div>
              </div>

              {/* Extension section - compact */}
              {canEditDetails && deadline && (
                <div className="rounded-lg border border-dashed border-blue-300/50 bg-blue-50/30 dark:bg-blue-950/20 px-3 py-2">
                  {!showExtendSection ? (
                    <Button
                      type="button" variant="ghost"
                      onClick={() => setShowExtendSection(true)}
                      className="w-full h-7 gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100/50"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" /> Gia hạn deadline
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-blue-600 flex items-center gap-1.5">
                          <CalendarPlus className="w-3.5 h-3.5" />Gia hạn
                        </span>
                        <Button type="button" variant="ghost" size="sm"
                          onClick={() => { setShowExtendSection(false); setExtensionHours(0); }}
                          className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-destructive"
                        ><X className="w-3 h-3" /></Button>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Input type="number" min={1} value={extensionHours || ''}
                          onChange={(e) => setExtensionHours(Math.max(0, parseInt(e.target.value) || 0))}
                          placeholder="Giờ" className="h-7 w-16 text-xs" />
                        <span className="text-[10px] text-muted-foreground">giờ</span>
                        <div className="flex gap-1">
                          {[6, 12, 24, 48, 72].map(h => (
                            <Button key={h} type="button" variant={extensionHours === h ? "default" : "outline"} size="sm"
                              onClick={() => setExtensionHours(h)} className="h-6 px-1.5 text-[10px]">+{h}h</Button>
                          ))}
                        </div>
                      </div>
                      {extensionHours > 0 && extendedDeadlineDate && (
                        <div className="flex items-center gap-2 text-xs bg-blue-500/10 rounded px-2 py-1.5 border border-blue-500/20">
                          <span className="text-muted-foreground line-through">{formatDeadlineShortVN(deadline)}</span>
                          <ArrowRight className="w-3 h-3 text-blue-500 shrink-0" />
                          <span className="font-bold text-blue-700">{format(extendedDeadlineDate, "dd/MM/yyyy – HH:mm", { locale: vi })}</span>
                          <Badge className="text-[9px] ml-auto bg-blue-500/10 text-blue-600 border-blue-500/30">{getExtensionText(extensionHours)}</Badge>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {!canEditDetails && hasExtension && (
                <div className="flex items-center gap-2 text-xs rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 px-3 py-2">
                  <CalendarPlus className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="text-muted-foreground">Gốc: <span className="line-through">{formatDeadlineShortVN(task?.deadline)}</span></span>
                  <ArrowRight className="w-3 h-3 text-blue-500 shrink-0" />
                  <span className="font-bold text-blue-700">{formatDeadlineShortVN(taskWithExtended.extended_deadline)}</span>
                </div>
              )}

              {/* Description - fills remaining space */}
              <div className="flex-1 flex flex-col min-h-0">
                <Label className="text-xs font-semibold mb-1.5 block">Mô tả</Label>
                {canEditDetails ? (
                  <ResourceTagTextarea 
                    value={description} 
                    onChange={setDescription} 
                    groupId={task?.group_id || ''} 
                    placeholder="Mô tả công việc... (gõ # để chèn tài nguyên)" 
                    fillHeight={true}
                  />
                ) : (
                  <div className="p-2.5 rounded-lg bg-muted/50 border text-sm flex-1 overflow-y-auto">
                    <ResourceLinkRenderer content={task?.description || ''} />
                    {!task?.description && <span className="text-muted-foreground">Không có mô tả</span>}
                  </div>
                )}
              </div>
            </div>
            
            {/* Right: Assignees (3 cols) */}
            <div className="col-span-3 flex flex-col">
              <div className="px-4 py-2.5 border-b bg-success/5">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-success" />
                  <span className="text-xs font-semibold uppercase text-success">Người phụ trách</span>
                  {assignees.length > 0 && (
                    <Badge variant="secondary" className="ml-auto text-[10px] px-1.5">{assignees.length}</Badge>
                  )}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2">
                {canEditDetails ? (
                  <div className="space-y-1">
                    {members.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-xs">Chưa có thành viên</p>
                      </div>
                    ) : (
                      members.map((member) => (
                        <div 
                          key={member.id} 
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                            assignees.includes(member.user_id) 
                              ? 'bg-success/10 ring-1 ring-success/40' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => {
                            if (assignees.includes(member.user_id)) {
                              setAssignees(assignees.filter(id => id !== member.user_id));
                            } else {
                              setAssignees([...assignees, member.user_id]);
                            }
                          }}
                        >
                          <Checkbox checked={assignees.includes(member.user_id)} className="h-4 w-4" />
                          {member.profiles?.avatar_url ? (
                            <img src={member.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {member.profiles?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{member.profiles?.full_name}</p>
                            <p className="text-[10px] text-muted-foreground">{member.profiles?.student_id}</p>
                          </div>
                          {groupCreatorId && member.user_id === groupCreatorId ? (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-warning/10 text-warning border-warning/30 shrink-0">TN</Badge>
                          ) : member.role === 'project_admin' && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/30 shrink-0">PN</Badge>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {task?.task_assignments && task.task_assignments.length > 0 ? (
                      task.task_assignments.map((assignment) => (
                        <div key={assignment.id} className="flex items-center gap-2 p-2 rounded-lg bg-success/5 border border-success/20">
                          {assignment.profiles?.avatar_url ? (
                            <img src={assignment.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center text-xs font-bold text-success">
                              {assignment.profiles?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="text-xs font-medium truncate">{assignment.profiles?.full_name}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-xs">Chưa có người được giao</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 py-3 border-t bg-muted/30 gap-2 shrink-0">
          <Button variant="outline" onClick={onClose} className="h-9 min-w-20">
            {canEditDetails ? 'Hủy' : 'Đóng'}
          </Button>
          {canEditDetails && (
            <Button onClick={handleSave} disabled={isLoading} className="h-9 min-w-28 gap-2">
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Đang lưu...</> : <><CheckCircle2 className="w-4 h-4" />Lưu thay đổi</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
