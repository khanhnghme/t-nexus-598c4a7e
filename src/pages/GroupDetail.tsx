// GroupDetail page - Task management
import { useEffect, useState } from 'react';
import { useDashboardLayoutContext } from '@/contexts/DashboardLayoutContext';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import TaskListView from '@/components/TaskListView';
import GroupDashboard from '@/components/GroupDashboard';
import GroupInfoCard from '@/components/GroupInfoCard';
import MemberManagementCard from '@/components/MemberManagementCard';
import TaskEditDialog from '@/components/TaskEditDialog';
import StageEditDialog from '@/components/StageEditDialog';
import ProjectActivityLog from '@/components/ProjectActivityLog';
import ShareSettingsCard from '@/components/ShareSettingsCard';
import FileSizeLimitSelector, { formatFileSizeMB } from '@/components/FileSizeLimitSelector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ResourceTagTextarea from '@/components/ResourceTagTextarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, Loader2, ArrowLeft, Layers, Trash2, FileText, Calendar, Send, Clock } from 'lucide-react';
import LoadingScreen from '@/components/LoadingScreen';
import ProjectNavigation from '@/components/ProjectNavigation';
import ProcessScores from '@/components/scores/ProcessScores';
import ProjectResources from '@/components/ProjectResources';
import ProjectEvidenceExport from '@/components/ProjectEvidenceExport';
import GroupMeetings from '@/components/GroupMeetings';

import type { Group, GroupMember, Task, Profile, Stage } from '@/types/database';
import { DeadlineHourPicker } from '@/components/DeadlineHourPicker';
import { notifyTaskAssigned } from '@/lib/notifications';
import { deleteWithUndo } from '@/lib/deleteWithUndo';
import { logActivity } from '@/lib/activityLogger';

interface ExtendedGroup extends Group {
  class_code: string | null;
  instructor_name: string | null;
  instructor_email: string | null;
  zalo_link: string | null;
  additional_info: string | null;
  is_public: boolean;
  share_token: string | null;
  show_members_public: boolean;
  show_activity_public: boolean;
}

export default function GroupDetail() {
  const { groupId, projectId, projectSlug, taskSlug, taskId: routeTaskId } = useParams<{ 
    groupId?: string; 
    projectId?: string; 
    projectSlug?: string;
    taskSlug?: string;
    taskId?: string;
  }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // Support all URL formats: /p/:projectSlug, /p/:projectId, /groups/:groupId
  const routeId = projectSlug || projectId || groupId;
  const { user, isAdmin, profile } = useAuth();
  const { toast } = useToast();
  const { currentTab, setCurrentTab, goBack, goNext, canGoBack, canGoNext, isFirstTab, isLastTab } = useNavigation();

  const { setProjectInfo } = useDashboardLayoutContext();
  
  const [group, setGroup] = useState<ExtendedGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLeaderInGroup, setIsLeaderInGroup] = useState(false);
  const [isGroupCreator, setIsGroupCreator] = useState(false);
  
  const [hasActiveMeeting, setHasActiveMeeting] = useState(false);
  
  // Compute available tabs based on permissions
  const availableTabs = [
    'overview',
    'tasks',
    'meetings',
    'members',
    'resources',
    'scores',
    ...(isLeaderInGroup && (group?.created_by === user?.id || isAdmin) ? ['logs'] : []),
    ...(isLeaderInGroup && (group?.created_by === user?.id || isAdmin) ? ['settings'] : [])
  ];
  
  // Sync local tab state with navigation context
  const activeTab = currentTab && availableTabs.includes(currentTab) ? currentTab : 'overview';
  
  const handleTabChange = (tabId: string) => {
    setCurrentTab(tabId);
  };
  
  // Initialize tab on mount - check URL params first
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && availableTabs.includes(tabFromUrl)) {
      setCurrentTab(tabFromUrl);
    } else if (!currentTab || !availableTabs.includes(currentTab)) {
      setCurrentTab('overview');
    }
  }, [searchParams, currentTab, availableTabs, setCurrentTab]);

  // Sync project info to persistent layout header
  useEffect(() => {
    if (group) {
      setProjectInfo({ projectId: group.id, projectName: group.name, zaloLink: group.zalo_link });
    }
    return () => setProjectInfo({});
  }, [group?.id, group?.name, group?.zalo_link, setProjectInfo]);
  
  const handleGoBack = () => {
    goBack(availableTabs);
  };
  
  const handleGoNext = () => {
    goNext(availableTabs);
  };

  // Dialogs
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [isCreatingStage, setIsCreatingStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageDescription, setNewStageDescription] = useState('');

  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newTaskAssignees, setNewTaskAssignees] = useState<string[]>([]);
  const [newTaskStageId, setNewTaskStageId] = useState<string>('');
  const [newTaskMaxFileSize, setNewTaskMaxFileSize] = useState<number>(10 * 1024 * 1024); // 10MB default
  const [newTaskSubmissionMethod, setNewTaskSubmissionMethod] = useState<string>('both');
  const [isDeleteGroupDialogOpen, setIsDeleteGroupDialogOpen] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isEditInfoOpen, setIsEditInfoOpen] = useState(false);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [stageToDelete, setStageToDelete] = useState<Stage | null>(null);

  useEffect(() => { if (routeId) fetchGroupData(); }, [routeId]);

  const fetchGroupData = async () => {
    if (!routeId) return;
    
    try {
      // Support UUID, short_id, and semantic slug lookup
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const shortIdPattern = /^[a-z0-9]{8}$/i;
      
      let groupData;
      if (uuidPattern.test(routeId)) {
        // Lookup by UUID
        const { data } = await supabase.from('groups').select('*').eq('id', routeId).single();
        groupData = data;
      } else if (shortIdPattern.test(routeId)) {
        // Lookup by short_id (legacy support)
        const { data } = await supabase.from('groups').select('*').eq('short_id', routeId).single();
        groupData = data;
      } else {
        // Lookup by semantic slug (primary method)
        const { data } = await supabase.from('groups').select('*').eq('slug', routeId).single();
        groupData = data;
      }
      
      if (!groupData) {
        toast({ title: 'Lỗi', description: 'Không tìm thấy project', variant: 'destructive' });
        navigate('/groups');
        return;
      }
      
      setGroup(groupData as ExtendedGroup);
      const resolvedGroupId = groupData.id;
      
      // Check if current user is the group creator (Trưởng nhóm) - set early, outside membersData check
      setIsGroupCreator(groupData.created_by === user?.id || isAdmin);

      const { data: stagesData } = await supabase.from('stages').select('*').eq('group_id', resolvedGroupId).order('order_index');
      if (stagesData) setStages(stagesData);

      const { data: membersData } = await supabase.from('group_members').select('*').eq('group_id', resolvedGroupId);
      if (membersData) {
        const userIds = membersData.map(m => m.user_id);
        const { data: profilesData } = await supabase.from('profiles').select('*').in('id', userIds);
        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        setMembers(membersData.map(m => ({ ...m, profiles: profilesMap.get(m.user_id) })) as GroupMember[]);
        const myMembership = membersData.find(m => m.user_id === user?.id);
        setIsLeaderInGroup(myMembership?.role === 'leader' || myMembership?.role === 'owner_system' || isAdmin);
      }

      const { data: tasksData } = await supabase.from('tasks').select('*').eq('group_id', resolvedGroupId).order('created_at', { ascending: false });
      if (tasksData) {
        const taskIds = tasksData.map(t => t.id);
        const { data: assignmentsData } = await supabase.from('task_assignments').select('*').in('task_id', taskIds);
        const assigneeIds = [...new Set(assignmentsData?.map(a => a.user_id) || [])];
        const { data: assigneeProfiles } = await supabase.from('profiles').select('*').in('id', assigneeIds);
        const profilesMap = new Map(assigneeProfiles?.map(p => [p.id, p]) || []);
        setTasks(tasksData.map(task => ({
          ...task,
          task_assignments: assignmentsData?.filter(a => a.task_id === task.id).map(a => ({ ...a, profiles: profilesMap.get(a.user_id) })) || [],
        })) as Task[]);
      }


      // Check for active meetings (in_progress status)
      const { data: activeMeetings } = await supabase
        .from('meetings')
        .select('id')
        .eq('group_id', resolvedGroupId)
        .eq('status', 'in_progress')
        .limit(1);
      setHasActiveMeeting((activeMeetings?.length ?? 0) > 0);
    } catch (error: any) {
      toast({ title: 'Lỗi', description: 'Không thể tải thông tin', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStage = async () => {
    if (!newStageName.trim() || !group) return;
    setIsCreatingStage(true);
    try {
      await supabase.from('stages').insert({ group_id: group.id, name: newStageName.trim(), description: newStageDescription.trim() || null, order_index: stages.length });
      toast({ title: 'Thành công', description: 'Đã tạo giai đoạn mới' });
      await logActivity({
        userId: user!.id,
        userName: profile?.full_name || user?.email || 'Unknown',
        action: 'CREATE_STAGE', actionType: 'stage',
        description: `Tạo giai đoạn "${newStageName.trim()}"`,
        groupId: group!.id,
      });
      setIsStageDialogOpen(false);
      setNewStageName('');
      setNewStageDescription('');
      fetchGroupData();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setIsCreatingStage(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || (stages.length > 0 && !newTaskStageId)) return;
    setIsCreatingTask(true);
    try {
      const { data: newTask } = await supabase.from('tasks').insert({ 
        group_id: group!.id, 
        title: newTaskTitle.trim(), 
        description: newTaskDescription.trim() || null, 
        deadline: newTaskDeadline || null, 
        stage_id: newTaskStageId || null, 
        created_by: user!.id,
        max_file_size: newTaskMaxFileSize,
        submission_method: newTaskSubmissionMethod,
        slug: '', // Will be auto-generated by trigger
      } as any).select().single();
      
      if (newTask && newTaskAssignees.length > 0) {
        await supabase.from('task_assignments').insert(newTaskAssignees.map(userId => ({ task_id: newTask.id, user_id: userId })));
        
        // Send notification to assignees (exclude the leader who created the task)
        const assigneesToNotify = newTaskAssignees.filter(id => id !== user?.id);
        if (assigneesToNotify.length > 0) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user!.id)
            .single();
          
          await notifyTaskAssigned({
            assigneeIds: assigneesToNotify,
            leaderName: profileData?.full_name || 'Leader',
            taskTitle: newTaskTitle.trim(),
            taskId: newTask.id,
            groupId: groupId!,
            groupName: group?.name || 'Project',
            deadline: newTaskDeadline || null,
          });
        }
      }
      
      toast({ title: 'Thành công', description: 'Đã tạo task mới' });
      
      const assigneeNames = newTaskAssignees.length > 0 
        ? members.filter(m => newTaskAssignees.includes(m.user_id)).map(m => m.profiles?.full_name).filter(Boolean).join(', ')
        : '';
      await logActivity({
        userId: user!.id,
        userName: profile?.full_name || user?.email || 'Unknown',
        action: 'CREATE_TASK', actionType: 'task',
        description: `Tạo task "${newTaskTitle.trim()}"${assigneeNames ? ` — Giao cho: ${assigneeNames}` : ''}${newTaskDeadline ? ` — Deadline: ${new Date(newTaskDeadline).toLocaleString('vi-VN')}` : ''}`,
        groupId: group!.id,
        metadata: { task_id: newTask?.id, task_title: newTaskTitle.trim(), assignees: newTaskAssignees },
      });

      setIsTaskDialogOpen(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDeadline('');
      setNewTaskAssignees([]);
      setNewTaskStageId('');
      setNewTaskMaxFileSize(10 * 1024 * 1024);
      setNewTaskSubmissionMethod('both');
      fetchGroupData();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleToggleStageHidden = async (stage: Stage) => {
    try {
      const newHiddenStatus = !(stage as any).is_hidden;
      const { error } = await supabase
        .from('stages')
        .update({ is_hidden: newHiddenStatus })
        .eq('id', stage.id);
      
      if (error) throw error;
      
      toast({
        title: newHiddenStatus ? 'Đã ẩn giai đoạn' : 'Đã hiện giai đoạn',
        description: `Giai đoạn "${stage.name}" ${newHiddenStatus ? 'đã được ẩn' : 'đã được hiện'}`,
      });
      await logActivity({
        userId: user!.id,
        userName: profile?.full_name || user?.email || 'Unknown',
        action: newHiddenStatus ? 'HIDE_STAGE' : 'SHOW_STAGE', actionType: 'stage',
        description: `${newHiddenStatus ? 'Ẩn' : 'Hiện'} giai đoạn "${stage.name}"`,
        groupId: group!.id,
      });
      fetchGroupData();
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể thay đổi trạng thái giai đoạn',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteGroup = async () => {
    if (deleteConfirmText !== group?.name || !group) return;
    setIsDeleteGroupDialogOpen(false);
    
    deleteWithUndo({
      description: `Đã xóa project "${group.name}"`,
      onDelete: async () => {
        const taskIds = tasks.map(t => t.id);
        if (taskIds.length > 0) {
          await supabase.from('task_assignments').delete().in('task_id', taskIds);
          await supabase.from('task_scores').delete().in('task_id', taskIds);
          await supabase.from('submission_history').delete().in('task_id', taskIds);
        }
        await supabase.from('tasks').delete().eq('group_id', group.id);
        const stageIds = stages.map(s => s.id);
        if (stageIds.length > 0) await supabase.from('member_stage_scores').delete().in('stage_id', stageIds);
        await supabase.from('stages').delete().eq('group_id', group.id);
        await supabase.from('pending_approvals').delete().eq('group_id', group.id);
        await supabase.from('group_members').delete().eq('group_id', group.id);
        await supabase.from('activity_logs').delete().eq('group_id', group.id);
        await supabase.from('groups').delete().eq('id', group.id);
        navigate('/groups');
      },
    });
  };

  const handleDeleteStage = async () => {
    if (!stageToDelete) return;
    const stageRef = stageToDelete;
    setStageToDelete(null);

    deleteWithUndo({
      description: `Đã xóa giai đoạn "${stageRef.name}"`,
      onDelete: async () => {
        await supabase.from('tasks').update({ stage_id: null }).eq('stage_id', stageRef.id);
        await supabase.from('member_stage_scores').delete().eq('stage_id', stageRef.id);
        await supabase.from('stages').delete().eq('id', stageRef.id);
        await logActivity({
          userId: user!.id,
          userName: profile?.full_name || user?.email || 'Unknown',
          action: 'DELETE_STAGE', actionType: 'stage',
          description: `Xóa giai đoạn "${stageRef.name}"`,
          groupId: group!.id,
        });
        fetchGroupData();
      },
      onUndo: () => {
        fetchGroupData();
      },
    });
  };

  

  if (isLoading) return <><LoadingScreen message={`Đang tải project...`} /></>;
  if (!group) return <><div className="text-center py-16"><h1 className="text-2xl font-bold mb-2">Không tìm thấy project</h1><Link to="/groups"><Button>Quay lại</Button></Link></div></>;


  return (
    <>
      <div className="w-full pt-2">
        <ProjectNavigation
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isLeaderInGroup={isLeaderInGroup}
          isGroupCreator={group.created_by === user?.id || isAdmin}
          membersCount={members.length}
          hasActiveMeeting={hasActiveMeeting}
          isScoreFinalized={!!(group as any).score_finalized_at}
        />
      </div>

      <div>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-0">
          {/* Hidden TabsList - using ProjectNavigation instead */}
          <div className="sr-only">
            <TabsList>
              <TabsTrigger value="overview">Tổng quan</TabsTrigger>
              <TabsTrigger value="tasks">Task</TabsTrigger>
              <TabsTrigger value="meetings">Họp nhóm</TabsTrigger>
              <TabsTrigger value="members">Thành viên</TabsTrigger>
              <TabsTrigger value="resources">Tài nguyên</TabsTrigger>
              <TabsTrigger value="scores">Điểm quá trình</TabsTrigger>
              <TabsTrigger value="logs">Nhật ký</TabsTrigger>
              <TabsTrigger value="settings">Cài đặt</TabsTrigger>
            </TabsList>
          </div>

          {/* Contextual Action Buttons */}
          <div className="px-4 md:px-6 pt-3">
            {/* Contextual Action Buttons for Leader */}
            {isLeaderInGroup && (
              <div className="flex gap-2">
                {activeTab === 'tasks' && (
                  <>
                    <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
                      <DialogTrigger asChild><Button variant="outline" size="sm"><Layers className="w-4 h-4 mr-2" />Tạo giai đoạn</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Tạo giai đoạn mới</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2"><Label>Tên giai đoạn</Label><Input value={newStageName} onChange={e => setNewStageName(e.target.value)} placeholder="VD: Giai đoạn 1" /></div>
                          <div className="space-y-2"><Label>Mô tả</Label><Textarea value={newStageDescription} onChange={e => setNewStageDescription(e.target.value)} /></div>
                        </div>
                        <DialogFooter><Button variant="outline" onClick={() => setIsStageDialogOpen(false)}>Hủy</Button><Button onClick={handleCreateStage} disabled={isCreatingStage}>{isCreatingStage ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tạo'}</Button></DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Dialog open={isTaskDialogOpen} onOpenChange={(open) => { 
                      setIsTaskDialogOpen(open); 
                      // Auto-select the latest (most recently created) stage
                      if (open && stages.length > 0) {
                        const latestStage = [...stages].sort((a, b) => 
                          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                        )[0];
                        setNewTaskStageId(latestStage.id);
                      }
                    }}>
                      <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" />Tạo task</Button></DialogTrigger>
                        <DialogContent className="max-w-[95vw] w-[1280px] h-[720px] max-h-[90vh] p-0 overflow-hidden flex flex-col">
                        {/* Header */}
                        <DialogHeader className="px-5 py-3 border-b bg-muted/30 shrink-0">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10">
                              <Plus className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <DialogTitle className="text-lg font-bold">Tạo Task mới</DialogTitle>
                              <DialogDescription className="text-xs">Điền thông tin và chọn người phụ trách</DialogDescription>
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
                                  Tên task <span className="text-destructive">*</span>
                                </Label>
                                <Input 
                                  value={newTaskTitle} 
                                  onChange={e => setNewTaskTitle(e.target.value)} 
                                  placeholder="Nhập tên task..." 
                                  className="h-10 text-base font-medium" 
                                />
                              </div>

                              {/* Config row: all fields inline */}
                              <div className={`grid gap-3 ${stages.length > 0 ? 'grid-cols-[1fr_1.2fr_1fr_1fr]' : 'grid-cols-[1.2fr_1fr_1fr]'}`}>
                                {stages.length > 0 && (
                                  <div>
                                    <Label className="text-[11px] font-medium mb-1 block flex items-center gap-1 text-warning">
                                      <Layers className="w-3 h-3" /> Giai đoạn <span className="text-destructive">*</span>
                                    </Label>
                                    <Select value={newTaskStageId} onValueChange={setNewTaskStageId}>
                                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Chọn..." /></SelectTrigger>
                                      <SelectContent>
                                        {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                                <div>
                                  <Label className="text-[11px] font-medium mb-1 block flex items-center gap-1 text-accent">
                                    <Calendar className="w-3 h-3" /> Deadline
                                  </Label>
                                  <DeadlineHourPicker value={newTaskDeadline} onChange={setNewTaskDeadline} placeholder="Chọn..." />
                                </div>
                                <div>
                                  <Label className="text-[11px] font-medium mb-1 block flex items-center gap-1">
                                    <Send className="w-3 h-3" /> Cách nộp
                                  </Label>
                                  <Select value={newTaskSubmissionMethod} onValueChange={setNewTaskSubmissionMethod}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="both">Cả hai cách</SelectItem>
                                      <SelectItem value="file_only">Chỉ tải file</SelectItem>
                                      <SelectItem value="link_only">Chỉ dán link</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-[11px] font-medium mb-1 block flex items-center gap-1 text-muted-foreground">
                                    <FileText className="w-3 h-3" /> Giới hạn file
                                  </Label>
                                  <FileSizeLimitSelector value={newTaskMaxFileSize} onChange={setNewTaskMaxFileSize} />
                                </div>
                              </div>

                              {/* Description - fills remaining space */}
                              <div className="flex-1 flex flex-col min-h-0">
                                <Label className="text-xs font-semibold mb-1.5 block">Mô tả công việc</Label>
                                <ResourceTagTextarea 
                                  value={newTaskDescription} 
                                  onChange={setNewTaskDescription}
                                  groupId={group.id}
                                  placeholder="Mô tả chi tiết yêu cầu... (gõ # để chèn tài nguyên)" 
                                  fillHeight={true}
                                />
                              </div>
                            </div>
                            
                            {/* Right: Assignees (3 cols) */}
                            <div className="col-span-3 flex flex-col">
                              <div className="px-4 py-2.5 border-b bg-success/5">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-success" />
                                  <span className="text-xs font-semibold uppercase text-success">Người phụ trách</span>
                                  {newTaskAssignees.length > 0 && (
                                    <Badge variant="secondary" className="ml-auto text-[10px] px-1.5">{newTaskAssignees.length}</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex-1 overflow-y-auto p-3">
                                <div className="space-y-1">
                                  {members.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                      <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                      <p className="text-xs">Chưa có thành viên</p>
                                    </div>
                                  ) : (
                                    members.map(m => (
                                      <div 
                                        key={m.id} 
                                        className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all ${
                                          newTaskAssignees.includes(m.user_id) 
                                            ? 'bg-success/10 ring-1 ring-success/40' 
                                            : 'hover:bg-muted/50'
                                        }`}
                                        onClick={() => {
                                          if (newTaskAssignees.includes(m.user_id)) {
                                            setNewTaskAssignees(newTaskAssignees.filter(id => id !== m.user_id));
                                          } else {
                                            setNewTaskAssignees([...newTaskAssignees, m.user_id]);
                                          }
                                        }}
                                      >
                                        <Checkbox checked={newTaskAssignees.includes(m.user_id)} className="h-4 w-4" />
                                        {m.profiles?.avatar_url ? (
                                          <img src={m.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                                        ) : (
                                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                            {m.profiles?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium truncate">{m.profiles?.full_name}</p>
                                          <p className="text-[10px] text-muted-foreground">{m.profiles?.student_id}</p>
                                        </div>
                                        {m.user_id === group?.created_by ? (
                                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-warning/10 text-warning border-warning/30 shrink-0">TN</Badge>
                                        ) : m.role === 'leader' ? (
                                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/30 shrink-0">PN</Badge>
                                        ) : null}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Footer */}
                        <DialogFooter className="px-5 py-3 border-t bg-muted/30 gap-2 shrink-0">
                          <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)} className="h-9 min-w-20">Hủy</Button>
                          <Button onClick={handleCreateTask} disabled={isCreatingTask} className="h-9 min-w-28 gap-2">
                            {isCreatingTask ? <><Loader2 className="w-4 h-4 animate-spin" />Đang tạo...</> : <><Plus className="w-4 h-4" />Tạo task</>}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="px-4 md:px-6">
            <TabsContent value="overview" className="mt-6">
              <GroupDashboard
                tasks={tasks}
                members={members}
                stages={stages}
                createdBy={group.created_by}
                groupName={group.name}
                groupDescription={group.description}
                imageUrl={group.image_url}
                canEdit={isLeaderInGroup}
                onEditInfo={() => setIsEditInfoOpen(true)}
                courseInfo={{
                  class_code: group.class_code,
                  instructor_name: group.instructor_name,
                  instructor_email: group.instructor_email,
                  zalo_link: group.zalo_link,
                  additional_info: group.additional_info,
                  description: group.description,
                }}
              />
              {/* Hidden GroupInfoCard - only shown as dialog when edit is triggered */}
              {isLeaderInGroup && isEditInfoOpen && (
                <GroupInfoCard group={group} canEdit={true} onUpdate={() => { fetchGroupData(); setIsEditInfoOpen(false); }} dialogOnly initialOpen onClose={() => setIsEditInfoOpen(false)} />
              )}
            </TabsContent>

            <TabsContent value="tasks" className="mt-6">
              <TaskListView stages={stages} tasks={tasks} members={members} isLeaderInGroup={isLeaderInGroup} groupId={group.id} groupSlug={group.slug} onRefresh={fetchGroupData} onEditTask={setEditingTask} onCreateTask={(stageId) => { setNewTaskStageId(stageId); setIsTaskDialogOpen(true); }} onEditStage={setEditingStage} onDeleteStage={setStageToDelete} onToggleStageHidden={handleToggleStageHidden} />
            </TabsContent>

            <TabsContent value="meetings" className="mt-6">
              <GroupMeetings
                groupId={group.id}
                groupName={group.name}
                stages={stages}
                members={members}
                isLeader={isLeaderInGroup}
                onRefreshTasks={fetchGroupData}
              />
            </TabsContent>

            <TabsContent value="members" className="mt-6">
              <MemberManagementCard members={members} isLeaderInGroup={isLeaderInGroup} isGroupCreator={isGroupCreator} groupId={group.id} currentUserId={user?.id || ''} groupCreatorId={group.created_by} onRefresh={fetchGroupData} />
            </TabsContent>

            <TabsContent value="resources" className="mt-6">
              <ProjectResources groupId={group.id} isLeader={isLeaderInGroup} />
            </TabsContent>

            <TabsContent value="scores" className="mt-6">
              <ProcessScores 
                groupId={group.id} 
                stages={stages} 
                members={members} 
                tasks={tasks} 
                isLeader={isLeaderInGroup}
                scoreFinalizedAt={(group as any).score_finalized_at}
                appealDeadlineHours={(group as any).appeal_deadline_hours ?? 48}
                onRefreshGroup={fetchGroupData}
              />
            </TabsContent>

            {(isGroupCreator || isAdmin) && (
              <TabsContent value="logs" className="mt-6">
                <ProjectActivityLog 
                  groupId={group.id} 
                  groupName={group.name} 
                  isLeader={isLeaderInGroup}
                  isAdmin={isAdmin}
                  isGroupCreator={isGroupCreator}
                />
              </TabsContent>
            )}

            {isLeaderInGroup && (group.created_by === user?.id || isAdmin) && (
              <TabsContent value="settings" className="mt-6 space-y-4">
                <ShareSettingsCard
                  groupId={group.id}
                  groupSlug={(group as any).slug || null}
                  isPublic={group.is_public || false}
                  shareToken={group.share_token || null}
                  showMembersPublic={group.show_members_public ?? true}
                  showActivityPublic={group.show_activity_public ?? true}
                  showResourcesPublic={(group as any).show_resources_public ?? true}
                  showTasksPublic={(group as any).show_tasks_public ?? true}
                  showScoresPublic={(group as any).show_scores_public ?? false}
                  joinCode={(group as any).join_code || null}
                  allowJoinByCode={(group as any).allow_join_by_code || false}
                  joinMemberLimit={(group as any).join_member_limit ?? null}
                  joinRequireApproval={(group as any).join_require_approval ?? true}
                  onUpdate={fetchGroupData}
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ProjectEvidenceExport groupId={group.id} project={group} />
                  <Card className="border border-destructive/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-destructive flex items-center gap-2">
                        <Trash2 className="w-4 h-4" />
                        Vùng nguy hiểm
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <p className="text-sm text-muted-foreground">Xóa project và toàn bộ dữ liệu. Hành động này không thể hoàn tác.</p>
                      <Button variant="destructive" size="sm" onClick={() => setIsDeleteGroupDialogOpen(true)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Xóa project này
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>

      <TaskEditDialog task={editingTask} stages={stages} members={members} isOpen={!!editingTask} onClose={() => setEditingTask(null)} onSave={fetchGroupData} canEdit={isLeaderInGroup} groupCreatorId={group.created_by} />
      
      <StageEditDialog stage={editingStage} isOpen={!!editingStage} onClose={() => setEditingStage(null)} onSave={fetchGroupData} groupId={group.id} />
      
      <AlertDialog open={!!stageToDelete} onOpenChange={() => setStageToDelete(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận xóa giai đoạn</AlertDialogTitle><AlertDialogDescription>Task trong giai đoạn này sẽ trở thành "Chưa phân giai đoạn".</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction onClick={handleDeleteStage} className="bg-destructive text-destructive-foreground">Xóa</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteGroupDialogOpen} onOpenChange={setIsDeleteGroupDialogOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận xóa project</AlertDialogTitle><AlertDialogDescription>Nhập tên project <span className="font-bold">"{group.name}"</span> để xác nhận:<Input className="mt-2" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} /></AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setDeleteConfirmText('')}>Hủy</AlertDialogCancel><AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive text-destructive-foreground" disabled={isDeletingGroup || deleteConfirmText !== group.name}>{isDeletingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Xóa vĩnh viễn'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  );
}
