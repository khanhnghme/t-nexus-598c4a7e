import { useState } from 'react';
import UserAvatar from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import ProfileViewDialog from '@/components/ProfileViewDialog';
import TaskSubmissionDialog from '@/components/TaskSubmissionDialog';
import { renderMessageContent } from '@/lib/messageParser';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile, Task, ProjectRole } from '@/types/database';
import { 
  ExternalLink, 
  MoreHorizontal, 
  Trash2, 
  Reply,
  CornerDownRight,
  CheckCheck
} from 'lucide-react';

export interface Message {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  source_type: 'direct' | 'from_task';
  source_task_id?: string;
  source_task_title?: string;
  user_name?: string;
  avatar_url?: string;
  reply_to?: string;
  reply_to_content?: string;
  reply_to_user_name?: string;
}

interface MemberInfo {
  id: string;
  name: string;
  avatar_url?: string;
}

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  showName?: boolean;
  members?: MemberInfo[];
  groupId?: string;
  onTaskClick?: (taskId: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (message: Message) => void;
}

export default function MessageItem({ message, isOwn, showAvatar = true, showName = true, members = [], groupId, onTaskClick, onDelete, onReply }: MessageItemProps) {
  const { user, isAdmin } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [profileToView, setProfileToView] = useState<Profile | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [memberRole, setMemberRole] = useState<ProjectRole>('project_member');
  
  // Task submission dialog state
  const [taskToView, setTaskToView] = useState<Task | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [isTaskAssignee, setIsTaskAssignee] = useState(false);
  const [isLeaderInGroup, setIsLeaderInGroup] = useState(false);

  const segments = renderMessageContent(message.content);

  const handleMentionClick = async (mentionName: string) => {
    // Remove @ prefix
    const name = mentionName.startsWith('@') ? mentionName.slice(1) : mentionName;
    
    // Find member by name
    const member = members.find(m => 
      m.name.toLowerCase() === name.toLowerCase() ||
      m.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(m.name.toLowerCase())
    );
    
    if (!member) return;

    // Fetch full profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', member.id)
      .single();

    if (profileData) {
      setProfileToView(profileData as unknown as Profile);
      
      // Get role if groupId available
      if (groupId) {
        const { data: memberData } = await supabase
          .from('group_members')
          .select('role')
          .eq('user_id', member.id)
          .eq('group_id', groupId)
          .single();
        setMemberRole((memberData?.role as ProjectRole) || 'project_member');
      }
      
      setProfileDialogOpen(true);
    }
  };

  const handleTaskRefClick = async (taskId?: string, displayText?: string) => {
    if (!user || !groupId) return;
    
    let resolvedTaskId = taskId;
    
    // If no taskId (legacy format like "GĐ2 – Soạn nội dung"), try to resolve from display text
    if (!resolvedTaskId && displayText) {
      // Extract stage number from "GĐN" pattern
      const stageMatch = displayText.match(/GĐ(\d+)/);
      const titleMatch = displayText.match(/–\s*(.+)/);
      
      if (titleMatch) {
        const title = titleMatch[1].trim();
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, title')
          .eq('group_id', groupId)
          .ilike('title', `%${title}%`)
          .limit(1);
        
        if (tasks && tasks.length > 0) {
          resolvedTaskId = tasks[0].id;
        }
      }
    }
    
    if (!resolvedTaskId) return;

    // Fetch task data
    const { data: taskData } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', resolvedTaskId)
      .single();

    if (!taskData) {
      onTaskClick?.(resolvedTaskId);
      return;
    }

    const task = taskData as unknown as Task;

    // Check if current user is assignee
    const { data: assignmentData } = await supabase
      .from('task_assignments')
      .select('id')
      .eq('task_id', resolvedTaskId)
      .eq('user_id', user.id)
      .maybeSingle();

    // Check if current user is leader in this group
    const { data: memberData } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', task.group_id)
      .eq('user_id', user.id)
      .single();

    const role = memberData?.role;
    const isLeader = role === 'project_admin' || role === 'project_owner' || isAdmin;

    setTaskToView(task);
    setIsTaskAssignee(!!assignmentData);
    setIsLeaderInGroup(isLeader);
    setTaskDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(message.id);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const formattedTime = format(new Date(message.created_at), 'HH:mm');
  const formattedDateTime = format(new Date(message.created_at), "EEEE, dd/MM/yyyy 'lúc' HH:mm", { locale: vi });

  return (
    <>
      <div className={cn(
        'flex items-end gap-2 mb-1 group',
        isOwn ? 'flex-row-reverse' : 'flex-row',
        !showAvatar && (isOwn ? 'mr-10' : 'ml-10')
      )}>
        {/* Avatar */}
        {showAvatar ? (
          <UserAvatar 
            src={message.avatar_url}
            name={message.user_name}
            size="sm"
            className="shrink-0 mb-0.5"
          />
        ) : (
          <div className="w-8 shrink-0" />
        )}

        {/* Bubble */}
        <div className={cn(
          'relative max-w-[75%] group/bubble',
          isOwn ? 'items-end' : 'items-start'
        )}>
          {/* Name */}
          {showName && !isOwn && (
            <p className="text-xs font-medium text-muted-foreground mb-1 ml-3">
              {message.user_name}
            </p>
          )}

          {/* Action buttons - show on hover */}
          <div className={cn(
            'absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover/bubble:opacity-100 transition-opacity z-10',
            isOwn ? '-left-20' : '-right-20'
          )}>
            {onReply && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full hover:bg-muted"
                onClick={() => onReply(message)}
              >
                <Reply className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            )}
            {isOwn && onDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-muted">
                    <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isOwn ? 'start' : 'end'} className="w-40 bg-popover">
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive cursor-pointer"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Xóa tin nhắn
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className={cn(
            'rounded-2xl px-3.5 py-2 shadow-sm',
            isOwn 
              ? 'bg-primary text-primary-foreground rounded-br-md' 
              : 'bg-muted/80 text-foreground rounded-bl-md',
          )}>
            {/* Reply Reference */}
            {message.reply_to && message.reply_to_content && (
              <div className={cn(
                "mb-2 pl-2.5 border-l-2 py-1",
                isOwn 
                  ? "border-primary-foreground/40" 
                  : "border-primary/40"
              )}>
                <p className={cn(
                  "text-[11px] font-semibold",
                  isOwn ? "text-primary-foreground/80" : "text-primary"
                )}>
                  {message.reply_to_user_name || 'Tin nhắn'}
                </p>
                <p className={cn(
                  "text-[11px] line-clamp-2",
                  isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
                )}>
                  {message.reply_to_content}
                </p>
              </div>
            )}

            {/* Task source label */}
            {message.source_type === 'from_task' && message.source_task_title && (
              <div className={cn(
                "mb-1.5 flex items-center gap-1 text-[11px] font-medium",
                isOwn ? "text-primary-foreground/70" : "text-accent"
              )}>
                <CornerDownRight className="w-3 h-3" />
                Task: {message.source_task_title}
              </div>
            )}

            {/* Content */}
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {segments.map((segment, idx) => {
                if (segment.type === 'user-mention' || segment.type === 'assignee-mention') {
                  return (
                    <span 
                      key={idx} 
                      className={cn(
                        'font-semibold cursor-pointer hover:underline',
                        isOwn ? 'text-primary-foreground underline underline-offset-2' : 'text-primary'
                      )}
                      onClick={() => handleMentionClick(segment.content)}
                      title={`Xem thông tin ${segment.content}`}
                    >
                      {segment.content}
                    </span>
                  );
                }
                if (segment.type === 'task-ref') {
                  return (
                    <span
                      key={idx}
                      className={cn(
                        'font-medium cursor-pointer underline underline-offset-2 decoration-dotted',
                        isOwn ? 'text-primary-foreground/90' : 'text-accent hover:text-accent/80'
                      )}
                      onClick={() => handleTaskRefClick(segment.taskId, segment.content)}
                    >
                      {segment.content}
                    </span>
                  );
                }
                return <span key={idx}>{segment.content}</span>;
              })}
            </p>

            {/* Time + status */}
            <div className={cn(
              'flex items-center gap-1 mt-1',
              isOwn ? 'justify-end' : 'justify-start'
            )}>
              <span className={cn(
                "text-[10px]",
                isOwn ? "text-primary-foreground/50" : "text-muted-foreground/70"
              )} title={formattedDateTime}>
                {formattedTime}
              </span>
              {isOwn && (
                <CheckCheck className={cn(
                  "w-3 h-3",
                  "text-primary-foreground/50"
                )} />
              )}
            </div>
          </div>

          {/* Quick task link */}
          {message.source_type === 'from_task' && message.source_task_id && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 px-2 text-[10px] gap-1 mt-1 rounded-full",
                isOwn ? "ml-auto" : "",
                isOwn ? "text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary/10" : "text-accent hover:bg-accent/10"
              )}
              onClick={() => onTaskClick?.(message.source_task_id!)}
            >
              <ExternalLink className="w-3 h-3" />
              Mở Task
            </Button>
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa tin nhắn?</AlertDialogTitle>
            <AlertDialogDescription>
              Tin nhắn này sẽ bị xóa vĩnh viễn. Bạn có chắc chắn?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Đang xóa...' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProfileViewDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        profile={profileToView}
        role={memberRole}
        groupId={groupId}
      />

      <TaskSubmissionDialog
        task={taskToView}
        isOpen={taskDialogOpen}
        onClose={() => { setTaskDialogOpen(false); setTaskToView(null); }}
        onSave={() => { setTaskDialogOpen(false); setTaskToView(null); }}
        isAssignee={isTaskAssignee}
        isLeaderInGroup={isLeaderInGroup}
        viewOnly={!isTaskAssignee && !isLeaderInGroup}
      />
    </>
  );
}
