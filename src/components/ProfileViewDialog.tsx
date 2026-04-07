import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import UserAvatar from '@/components/UserAvatar';
import UserPresenceIndicator from '@/components/UserPresenceIndicator';
import { useUserPresence } from '@/hooks/useUserPresence';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, Mail, GraduationCap, BookOpen, Phone, Sparkles, FileText,
  Crown, Shield, UserCheck, CheckCircle2, Clock, Calendar,
  ListTodo, FileUp, Activity, Hash, TrendingUp, AlertTriangle,
  Loader2, BarChart3, Target, Star, FolderOpen, Building
} from 'lucide-react';
import type { Profile } from '@/types/database';

interface TaskInfo {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  stage_name: string | null;
}

interface SubmissionInfo {
  id: string;
  task_title: string;
  submission_link: string;
  submitted_at: string;
  submission_type: string | null;
  file_name: string | null;
  note: string | null;
}

interface ActivityInfo {
  id: string;
  action: string;
  action_type: string;
  description: string | null;
  created_at: string;
}

interface ScoreInfo {
  task_title: string;
  final_score: number | null;
  base_score: number;
  late_penalty: number;
  early_bonus: boolean;
}

interface ProfileViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  role?: 'project_owner' | 'project_admin' | 'project_member';
  isGroupCreator?: boolean;
  groupId?: string;
}

export default function ProfileViewDialog({
  open,
  onOpenChange,
  profile,
  role = 'project_member' as any,
  isGroupCreator = false,
  groupId,
}: ProfileViewDialogProps) {
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionInfo[]>([]);
  const [activities, setActivities] = useState<ActivityInfo[]>([]);
  const [scores, setScores] = useState<ScoreInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const { getPresenceStatus, isConnected } = useUserPresence('system-global');

  useEffect(() => {
    if (open && profile && groupId) {
      setLoading(true);
      Promise.all([
        fetchTasks(profile.id, groupId),
        fetchSubmissions(profile.id, groupId),
        fetchActivities(profile.id, groupId),
        fetchScores(profile.id, groupId),
      ]).finally(() => setLoading(false));
    }
  }, [open, profile?.id, groupId]);

  const fetchTasks = async (userId: string, gId: string) => {
    const { data } = await supabase
      .from('task_assignments')
      .select('task_id, tasks(id, title, status, deadline, stage_id, stages(name))')
      .eq('user_id', userId);
    const filtered = (data || [])
      .filter((d: any) => d.tasks)
      .map((d: any) => d.tasks);
    // Need to filter by group - fetch tasks of this group
    const { data: groupTasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('group_id', gId);
    const groupTaskIds = new Set((groupTasks || []).map(t => t.id));
    setTasks(filtered
      .filter((t: any) => groupTaskIds.has(t.id))
      .map((t: any) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        deadline: t.deadline,
        stage_name: t.stages?.name || null,
      })));
  };

  const fetchSubmissions = async (userId: string, gId: string) => {
    const { data: groupTasks } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('group_id', gId);
    if (!groupTasks?.length) { setSubmissions([]); return; }
    const taskMap = Object.fromEntries(groupTasks.map(t => [t.id, t.title]));
    const { data } = await supabase
      .from('submission_history')
      .select('id, task_id, submission_link, submitted_at, submission_type, file_name, note')
      .eq('user_id', userId)
      .in('task_id', groupTasks.map(t => t.id))
      .order('submitted_at', { ascending: false })
      .limit(50);
    setSubmissions((data || []).map(d => ({
      id: d.id,
      task_title: taskMap[d.task_id] || 'Unknown',
      submission_link: d.submission_link,
      submitted_at: d.submitted_at,
      submission_type: d.submission_type,
      file_name: d.file_name,
      note: d.note,
    })));
  };

  const fetchActivities = async (userId: string, gId: string) => {
    const { data } = await supabase
      .from('activity_logs')
      .select('id, action, action_type, description, created_at')
      .eq('user_id', userId)
      .eq('group_id', gId)
      .order('created_at', { ascending: false })
      .limit(50);
    setActivities(data || []);
  };

  const fetchScores = async (userId: string, gId: string) => {
    const { data: groupTasks } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('group_id', gId);
    if (!groupTasks?.length) { setScores([]); return; }
    const taskMap = Object.fromEntries(groupTasks.map(t => [t.id, t.title]));
    const { data } = await supabase
      .from('task_scores')
      .select('task_id, final_score, base_score, late_penalty, early_bonus')
      .eq('user_id', userId)
      .in('task_id', groupTasks.map(t => t.id));
    setScores((data || []).map(d => ({
      task_title: taskMap[d.task_id] || 'Unknown',
      final_score: d.final_score,
      base_score: d.base_score,
      late_penalty: d.late_penalty,
      early_bonus: d.early_bonus,
    })));
  };

  const taskStats = useMemo(() => ({
    total: tasks.length,
    done: tasks.filter(t => t.status === 'DONE' || t.status === 'VERIFIED').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    todo: tasks.filter(t => t.status === 'TODO').length,
    overdue: tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'DONE' && t.status !== 'VERIFIED').length,
  }), [tasks]);

  const avgScore = useMemo(() => {
    const scored = scores.filter(s => s.final_score !== null);
    if (scored.length === 0) return null;
    return scored.reduce((sum, s) => sum + (s.final_score || 0), 0) / scored.length;
  }, [scores]);

  if (!profile) return null;

  const completionRate = taskStats.total > 0 ? Math.round((taskStats.done / taskStats.total) * 100) : 0;

  const getRoleBadge = () => {
    if (isGroupCreator) {
      return <Badge className="bg-accent/15 text-accent gap-1 border-accent/30"><Crown className="w-3 h-3" />Trưởng nhóm</Badge>;
    }
    switch (role) {
      case 'project_owner':
        return <Badge className="bg-destructive/10 text-destructive gap-1"><Shield className="w-3 h-3" />Chủ dự án</Badge>;
      case 'project_admin':
        return <Badge className="bg-primary/10 text-primary gap-1"><Crown className="w-3 h-3" />Phó nhóm</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><UserCheck className="w-3 h-3" />Thành viên</Badge>;
    }
  };

  const statusLabel: Record<string, string> = {
    'TODO': 'Chờ', 'IN_PROGRESS': 'Đang làm', 'DONE': 'Xong', 'VERIFIED': 'Đã duyệt'
  };
  const statusIcon: Record<string, string> = {
    'TODO': 'bg-muted text-muted-foreground',
    'IN_PROGRESS': 'bg-primary/10 text-primary',
    'DONE': 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]',
    'VERIFIED': 'bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]',
  };

  const actionTypeLabel: Record<string, string> = {
    member: 'Thành viên', stage: 'Giai đoạn', task: 'Task',
    resource: 'Tài nguyên', score: 'Điểm', project: 'Dự án', setting: 'Cài đặt',
  };

  const formatDate = (d: string) => new Date(d).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const presenceStatus = isConnected ? getPresenceStatus(profile.id) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[1280px] sm:h-[min(720px,90vh)] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden" style={{ maxHeight: 'min(720px, 90vh)' }}>
        <DialogHeader className="sr-only">
          <DialogTitle>Hồ sơ thành viên trong dự án</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row flex-1 min-h-0">
          {/* Left sidebar - Profile info */}
          <div className="sm:w-[320px] shrink-0 sm:border-r border-b sm:border-b-0 bg-gradient-to-b from-primary/5 via-background to-background flex flex-col">
            {/* ETT-style header stripe */}
            <div className="h-2 bg-gradient-to-r from-primary via-primary to-accent shrink-0" />
            
            <ScrollArea className="flex-1 sm:max-h-none max-h-[35vh]">
              <div className="p-4 sm:p-6 flex flex-col items-center">
                <div className="relative mb-4">
                  <UserAvatar 
                    src={profile.avatar_url} 
                    name={profile.full_name}
                    size="xl"
                    className="border-4 border-background shadow-xl ring-2 ring-primary/20 w-24 h-24"
                    showPresence={isConnected}
                    presenceStatus={presenceStatus}
                  />
                </div>
                
                <h2 className="text-lg font-bold text-center">{profile.full_name}</h2>
                <p className="text-sm text-muted-foreground">{profile.institution ? `${profile.institution} • ` : ''}{profile.student_id}</p>
                <div className="mt-2">{getRoleBadge()}</div>

                <Separator className="my-4 w-full" />

                {/* Quick stats cards */}
                <div className="grid grid-cols-2 gap-2 w-full">
                  <div className="rounded-xl border bg-card p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{taskStats.done}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Hoàn thành</p>
                  </div>
                  <div className="rounded-xl border bg-card p-3 text-center">
                    <p className="text-2xl font-bold text-accent">{taskStats.total}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tổng task</p>
                  </div>
                  <div className="rounded-xl border bg-card p-3 text-center col-span-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Tiến độ</span>
                      <span className="text-sm font-bold text-primary">{completionRate}%</span>
                    </div>
                    <Progress value={completionRate} className="h-2" />
                  </div>
                  {avgScore !== null && (
                    <div className="rounded-xl border bg-card p-3 text-center col-span-2">
                      <div className="flex items-center justify-center gap-2">
                        <Star className="w-4 h-4 text-accent" />
                        <span className="text-xl font-bold">{avgScore.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">/ 100 điểm TB</span>
                      </div>
                    </div>
                  )}
                  {taskStats.overdue > 0 && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-center col-span-2">
                      <div className="flex items-center justify-center gap-1.5 text-destructive">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span className="text-sm font-semibold">{taskStats.overdue} task trễ hạn</span>
                      </div>
                    </div>
                  )}
                </div>

                <Separator className="my-4 w-full" />

                {/* Contact info */}
                <div className="w-full space-y-2 text-sm">
                  {profile.institution && <InfoRow icon={Building} value={profile.institution} />}
                  <InfoRow icon={Mail} value={profile.email} />
                  {profile.phone && <InfoRow icon={Phone} value={profile.phone} />}
                  {profile.year_batch && <InfoRow icon={GraduationCap} value={`Khóa ${profile.year_batch}`} />}
                  {profile.major && <InfoRow icon={BookOpen} value={profile.major} />}
                </div>

                {profile.skills && (
                  <>
                    <Separator className="my-4 w-full" />
                    <div className="w-full">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Kỹ năng
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {profile.skills.split(',').map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] px-2 py-0.5">{s.trim()}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {profile.bio && (
                  <>
                    <Separator className="my-4 w-full" />
                    <div className="w-full">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Giới thiệu
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-2.5">{profile.bio}</p>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right content - Tabs */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* ETT-style header stripe */}
            <div className="h-2 bg-gradient-to-r from-accent via-accent to-primary shrink-0" />

            {groupId ? (
              <Tabs defaultValue="tasks" className="flex-1 min-h-0 flex flex-col">
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4 h-auto py-0 shrink-0">
                  <TabsTrigger value="tasks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2.5 text-xs gap-1">
                    <ListTodo className="w-3.5 h-3.5" /> Tasks ({tasks.length})
                  </TabsTrigger>
                  <TabsTrigger value="submissions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2.5 text-xs gap-1">
                    <FileUp className="w-3.5 h-3.5" /> Nộp bài ({submissions.length})
                  </TabsTrigger>
                  <TabsTrigger value="scores" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2.5 text-xs gap-1">
                    <BarChart3 className="w-3.5 h-3.5" /> Điểm số ({scores.length})
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2.5 text-xs gap-1">
                    <Activity className="w-3.5 h-3.5" /> Hoạt động ({activities.length})
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-5">
                    {loading ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : (
                      <>
                        {/* Tasks Tab */}
                        <TabsContent value="tasks" className="mt-0">
                          {tasks.length === 0 ? (
                            <EmptyState icon={ListTodo} text="Chưa được giao task nào trong dự án này" />
                          ) : (
                            <div className="space-y-2">
                              {/* Stats bar */}
                              <div className="flex gap-2 mb-4">
                                <StatPill label="Chờ" value={taskStats.todo} className="bg-muted/50" />
                                <StatPill label="Đang làm" value={taskStats.inProgress} className="bg-primary/10" />
                                <StatPill label="Hoàn thành" value={taskStats.done} className="bg-[hsl(var(--success))]/10" />
                              </div>
                              {tasks.map(task => (
                                <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/20 transition-colors">
                                  <Badge className={`${statusIcon[task.status]} text-[10px] px-2 py-0.5 shrink-0`}>
                                    {statusLabel[task.status]}
                                  </Badge>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{task.title}</p>
                                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                                      {task.stage_name && (
                                        <span className="flex items-center gap-1">
                                          <FolderOpen className="w-3 h-3" />{task.stage_name}
                                        </span>
                                      )}
                                      {task.deadline && (
                                        <span className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {new Date(task.deadline).toLocaleDateString('vi-VN')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {task.deadline && new Date(task.deadline) < new Date() && task.status !== 'DONE' && task.status !== 'VERIFIED' && (
                                    <Badge variant="destructive" className="text-[10px] shrink-0">Trễ hạn</Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </TabsContent>

                        {/* Submissions Tab */}
                        <TabsContent value="submissions" className="mt-0">
                          {submissions.length === 0 ? (
                            <EmptyState icon={FileUp} text="Chưa có bài nộp nào trong dự án này" />
                          ) : (
                            <div className="space-y-2">
                              {submissions.map(sub => (
                                <div key={sub.id} className="p-3 rounded-xl border bg-card hover:bg-muted/20 transition-colors">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium truncate">{sub.task_title}</p>
                                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                                        <Calendar className="w-3 h-3" />
                                        <span>{formatDate(sub.submitted_at)}</span>
                                        {sub.submission_type && (
                                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                            {sub.submission_type === 'file' ? '📎 File' : '🔗 Link'}
                                          </Badge>
                                        )}
                                      </div>
                                      {sub.file_name && (
                                        <p className="text-[11px] text-muted-foreground mt-1 truncate">📄 {sub.file_name}</p>
                                      )}
                                      {sub.note && (
                                        <p className="text-[11px] text-muted-foreground mt-1 italic">"{sub.note}"</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </TabsContent>

                        {/* Scores Tab */}
                        <TabsContent value="scores" className="mt-0">
                          {scores.length === 0 ? (
                            <EmptyState icon={BarChart3} text="Chưa có điểm số nào trong dự án này" />
                          ) : (
                            <div className="space-y-2">
                              {avgScore !== null && (
                                <div className="rounded-xl border bg-gradient-to-r from-primary/5 to-accent/5 p-4 mb-4 flex items-center justify-between">
                                  <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Điểm trung bình</p>
                                    <p className="text-3xl font-bold text-primary">{avgScore.toFixed(1)}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-muted-foreground">{scores.length} task đã chấm</p>
                                    <p className="text-xs text-muted-foreground">{scores.filter(s => s.late_penalty > 0).length} task bị trừ trễ hạn</p>
                                  </div>
                                </div>
                              )}
                              {scores.map((score, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{score.task_title}</p>
                                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                                      <span>Gốc: {score.base_score}</span>
                                      {score.late_penalty > 0 && (
                                        <span className="text-destructive">-{score.late_penalty} trễ hạn</span>
                                      )}
                                      {score.early_bonus && (
                                        <Badge className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] text-[10px] px-1.5 py-0">Nộp sớm</Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className={`text-lg font-bold ${(score.final_score || 0) >= 80 ? 'text-[hsl(var(--success))]' : (score.final_score || 0) >= 50 ? 'text-accent' : 'text-destructive'}`}>
                                    {score.final_score !== null ? score.final_score.toFixed(0) : '—'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </TabsContent>

                        {/* Activity Tab */}
                        <TabsContent value="activity" className="mt-0">
                          {activities.length === 0 ? (
                            <EmptyState icon={Activity} text="Chưa có hoạt động nào trong dự án này" />
                          ) : (
                            <div className="relative">
                              {/* Timeline line */}
                              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                              <div className="space-y-0">
                                {activities.map(act => (
                                  <div key={act.id} className="relative pl-10 py-2.5">
                                    <div className="absolute left-[11px] top-4 w-2.5 h-2.5 rounded-full bg-primary/60 ring-2 ring-background" />
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                          {actionTypeLabel[act.action_type] || act.action_type}
                                        </Badge>
                                        <span className="text-[11px] text-muted-foreground">{formatDate(act.created_at)}</span>
                                      </div>
                                      <p className="text-sm mt-1">{act.description || act.action}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </TabsContent>
                      </>
                    )}
                  </div>
                </ScrollArea>
              </Tabs>
            ) : (
              /* Fallback when no groupId - show basic info only */
              <ScrollArea className="flex-1">
                <div className="p-6">
                  <p className="text-center text-sm text-muted-foreground py-8">
                    Mở hồ sơ từ trong dự án để xem chi tiết đóng góp
                  </p>
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon: Icon, value }: { icon: any; value: string }) {
  return (
    <div className="flex items-center gap-2.5 text-muted-foreground">
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="text-foreground text-xs truncate">{value}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Icon className="w-10 h-10 mb-3 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function StatPill({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className={`rounded-lg px-3 py-2 text-center flex-1 ${className || ''}`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
