import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import UserAvatar from '@/components/UserAvatar';
import UserPresenceIndicator from '@/components/UserPresenceIndicator';
import { useUserPresence } from '@/hooks/useUserPresence';
import { supabase } from '@/integrations/supabase/client';
import { fixStorageUrl } from '@/lib/urlUtils';
import {
  User, Mail, GraduationCap, BookOpen, Phone, Sparkles, FileText,
  Shield, UserCheck, Briefcase, Clock, CheckCircle2, AlertCircle, Loader2,
  Calendar, Hash, IdCard, Activity, Lock
} from 'lucide-react';
import type { Profile } from '@/types/database';

interface GroupInfo {
  id: string;
  name: string;
  role: string;
  image_url: string | null;
  is_creator: boolean;
}

interface ActivityInfo {
  id: string;
  action: string;
  description: string | null;
  created_at: string;
  group_name?: string;
}

interface TaskInfo {
  id: string;
  title: string;
  status: string;
  group_name: string;
  deadline?: string | null;
}

interface ScoreInfo {
  group_name: string;
  final_score: number | null;
  weighted_average: number | null;
}

interface MemberDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Profile | null;
  systemRoles: string[];
}

export default function MemberDetailDialog({
  open, onOpenChange, member, systemRoles
}: MemberDetailDialogProps) {
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [activities, setActivities] = useState<ActivityInfo[]>([]);
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [scores, setScores] = useState<ScoreInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [suspensionTimeLeft, setSuspensionTimeLeft] = useState('');
  const { getPresenceStatus, isConnected } = useUserPresence('system-global');

  const isSuspended = member?.suspended_until
    ? new Date(member.suspended_until).getTime() > Date.now()
    : false;
  const isPermanentSuspension = member?.suspended_until
    ? new Date(member.suspended_until).getFullYear() >= 2099
    : false;

  useEffect(() => {
    if (!isSuspended || !member?.suspended_until) return;
    const update = () => {
      const diff = new Date(member.suspended_until!).getTime() - Date.now();
      if (diff <= 0) { setSuspensionTimeLeft('Hết hạn'); return; }
      if (isPermanentSuspension) { setSuspensionTimeLeft('Vĩnh viễn'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const parts: string[] = [];
      if (d > 0) parts.push(`${d}d`);
      if (h > 0) parts.push(`${h}h`);
      if (m > 0) parts.push(`${m}m`);
      parts.push(`${s}s`);
      setSuspensionTimeLeft(parts.join(' '));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [member?.suspended_until, isSuspended, isPermanentSuspension]);

  useEffect(() => {
    if (open && member) {
      setLoading(true);
      Promise.all([
        fetchGroups(member.id),
        fetchActivities(member.id),
        fetchTasks(member.id),
        fetchScores(member.id),
      ]).finally(() => setLoading(false));
    }
  }, [open, member?.id]);

  const fetchGroups = async (userId: string) => {
    const { data } = await supabase
      .from('group_members')
      .select('group_id, role, groups(name, image_url, created_by)')
      .eq('user_id', userId);
    setGroups((data || []).map((d: any) => ({
      id: d.group_id,
      name: d.groups?.name || 'Unknown',
      role: d.role,
      image_url: d.groups?.image_url || null,
      is_creator: d.groups?.created_by === userId,
    })));
  };

  const fetchActivities = async (userId: string) => {
    const { data } = await supabase
      .from('activity_logs')
      .select('id, action, description, created_at, group_id, groups(name, activity_logging_enabled)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);
    // Filter out activities from groups that have logging disabled
    const filtered = (data || []).filter((d: any) => {
      if (!d.group_id) return true; // system-level logs always show
      return d.groups?.activity_logging_enabled !== false;
    });
    setActivities(filtered.map((d: any) => ({
      id: d.id,
      action: d.action,
      description: d.description,
      created_at: d.created_at,
      group_name: d.groups?.name,
    })));
  };

  const fetchTasks = async (userId: string) => {
    const { data } = await supabase
      .from('task_assignments')
      .select('task_id, tasks(id, title, status, deadline, group_id, groups(name))')
      .eq('user_id', userId);
    setTasks((data || []).map((d: any) => ({
      id: d.tasks?.id || '',
      title: d.tasks?.title || 'Unknown',
      status: d.tasks?.status || 'TODO',
      group_name: d.tasks?.groups?.name || '',
      deadline: d.tasks?.deadline,
    })));
  };

  const fetchScores = async (userId: string) => {
    const { data } = await supabase
      .from('member_final_scores')
      .select('final_score, weighted_average, group_id, groups(name)')
      .eq('user_id', userId);
    setScores((data || []).map((d: any) => ({
      group_name: d.groups?.name || 'Unknown',
      final_score: d.final_score,
      weighted_average: d.weighted_average,
    })));
  };

  if (!member) return null;

  const statusLabel: Record<string, string> = {
    'TODO': 'Chờ thực hiện', 'IN_PROGRESS': 'Đang thực hiện',
    'DONE': 'Hoàn thành', 'VERIFIED': 'Đã duyệt'
  };

  const statusColor: Record<string, string> = {
    'TODO': 'bg-muted text-muted-foreground',
    'IN_PROGRESS': 'bg-primary/10 text-primary',
    'DONE': 'bg-green-500/10 text-green-600',
    'VERIFIED': 'bg-blue-500/10 text-blue-600',
  };

  // System role labels (for user_roles)
  const systemRoleLabel: Record<string, string> = {
    'admin': 'OwnerSystem', 'leader': 'Thành viên Nâng cao', 'member': 'Thành viên'
  };

  // Use centralized role label utility
  const getGroupRoleLabel = (role: string, isCreator: boolean) => {
    if (isCreator) return 'Trưởng nhóm';
    switch (role) {
      case 'owner_system': return 'OwnerSystem';
      case 'leader': return 'Phó nhóm';
      case 'member': return 'Thành viên';
      default: return role;
    }
  };

  const taskStats = {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'DONE' || t.status === 'VERIFIED').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    todo: tasks.filter(t => t.status === 'TODO').length,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[1280px] h-[min(720px,90vh)] aspect-video flex flex-col p-0 gap-0 overflow-hidden" style={{ maxHeight: 'min(720px, 90vh)', minHeight: 'min(720px, 90vh)' }}>
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-primary/15 via-primary/10 to-accent/10 px-6 pt-6 pb-4">
          <DialogHeader className="mb-0">
            <DialogTitle className="sr-only">Chi tiết thành viên</DialogTitle>
          </DialogHeader>
          <div className="flex items-start gap-5">
            <UserAvatar src={member.avatar_url} name={member.full_name} size="xl"
              className="border-4 border-background shadow-xl ring-2 ring-primary/20"
              showPresence={isConnected}
              presenceStatus={getPresenceStatus(member.id)} />
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold truncate">{member.full_name}</h2>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                <IdCard className="w-4 h-4 shrink-0" />
                {member.institution && <><span className="truncate">{member.institution}</span><span className="mx-1">•</span></>}
                <span>{member.student_id}</span>
                <span className="mx-1">•</span>
                <Mail className="w-4 h-4 shrink-0" />
                <span className="truncate">{member.email}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {systemRoles.map(r => (
                  <Badge key={r} variant={r === 'owner_system' ? 'destructive' : 'secondary'} className="text-xs gap-1">
                    {r === 'owner_system' ? <Shield className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                    {systemRoleLabel[r] || r}
                  </Badge>
                ))}
                <Badge variant={member.is_approved ? 'default' : 'outline'} className="text-xs gap-1">
                  {member.is_approved ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {member.is_approved ? 'Đã duyệt' : 'Chưa duyệt'}
                </Badge>
                {member.must_change_password && (
                  <Badge variant="outline" className="text-xs gap-1 border-warning text-warning">
                    <AlertCircle className="w-3 h-3" />
                    Chưa đổi MK
                  </Badge>
                )}
                {isSuspended && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <Lock className="w-3 h-3" />
                    Đã khóa — {suspensionTimeLeft}
                  </Badge>
                )}
              </div>
              {/* Quick Stats */}
              <div className="flex gap-4 mt-3 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span><strong className="text-foreground">{groups.length}</strong> dự án</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span><strong className="text-foreground">{taskStats.done}/{taskStats.total}</strong> task hoàn thành</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Tham gia {new Date(member.created_at).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="info" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-6 h-auto py-0">
            <TabsTrigger value="info" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">
              <User className="w-4 h-4 mr-1.5" /> Thông tin
            </TabsTrigger>
            <TabsTrigger value="projects" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">
              <Briefcase className="w-4 h-4 mr-1.5" /> Dự án ({groups.length})
            </TabsTrigger>
            <TabsTrigger value="tasks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Tasks ({tasks.length})
            </TabsTrigger>
            <TabsTrigger value="scores" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">
              <Hash className="w-4 h-4 mr-1.5" /> Điểm số
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3">
              <Activity className="w-4 h-4 mr-1.5" /> Hoạt động
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 min-h-0 overflow-auto">
            <div className="p-6">
              <TabsContent value="info" className="mt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                  <InfoRow icon={Mail} label="Email" value={member.email} />
                  <InfoRow icon={IdCard} label="MSSV" value={member.student_id} />
                  <InfoRow icon={GraduationCap} label="Đơn vị đào tạo" value={member.institution} />
                  <InfoRow icon={GraduationCap} label="Khóa" value={member.year_batch} />
                  <InfoRow icon={BookOpen} label="Ngành" value={member.major} />
                  <InfoRow icon={Phone} label="Số điện thoại" value={member.phone} />
                  <InfoRow icon={Calendar} label="Ngày tạo tài khoản" value={new Date(member.created_at).toLocaleString('vi-VN')} />
                  <InfoRow icon={Clock} label="Cập nhật lần cuối" value={new Date(member.updated_at).toLocaleString('vi-VN')} />
                </div>
                {member.skills && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> Kỹ năng
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {member.skills.split(',').map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{s.trim()}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {member.bio && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> Giới thiệu bản thân
                      </p>
                      <p className="text-sm whitespace-pre-wrap bg-muted/30 rounded-lg p-3">{member.bio}</p>
                    </div>
                  </>
                )}
                {isSuspended && (
                  <>
                    <Separator className="my-4" />
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-destructive flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" /> Trạng thái khóa tài khoản
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Thời gian còn lại</p>
                          <p className="font-bold font-mono text-foreground">{suspensionTimeLeft}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Khóa từ</p>
                          <p className="font-medium text-foreground">
                            {member.suspended_at ? new Date(member.suspended_at).toLocaleString('vi-VN') : '—'}
                          </p>
                        </div>
                        {!isPermanentSuspension && (
                          <div>
                            <p className="text-xs text-muted-foreground">Mở khóa lúc</p>
                            <p className="font-medium text-foreground">
                              {new Date(member.suspended_until!).toLocaleString('vi-VN')}
                            </p>
                          </div>
                        )}
                        {member.suspension_reason && (
                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground">Lý do</p>
                            <p className="text-foreground">{member.suspension_reason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="projects" className="mt-0">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto mt-8" /> :
                  groups.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">Chưa tham gia project nào</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {groups.map(g => (
                        <div key={g.id} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3">
                            {g.image_url ? (
                              <img src={fixStorageUrl(g.image_url) || ''} alt={g.name} className="w-10 h-10 rounded-lg object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary">
                                {g.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="text-sm font-medium">{g.name}</span>
                          </div>
                          <Badge variant={g.is_creator ? 'default' : g.role === 'leader' ? 'default' : 'secondary'} className={`text-xs ${g.is_creator ? 'bg-accent/15 text-accent border-accent/30' : ''}`}>
                            {getGroupRoleLabel(g.role, g.is_creator)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
              </TabsContent>

              <TabsContent value="tasks" className="mt-0">
                {/* Task stats bar */}
                {tasks.length > 0 && (
                  <div className="flex gap-3 mb-4">
                    <div className="flex-1 rounded-lg bg-muted/40 p-3 text-center">
                      <p className="text-lg font-bold">{taskStats.total}</p>
                      <p className="text-xs text-muted-foreground">Tổng</p>
                    </div>
                    <div className="flex-1 rounded-lg bg-green-500/10 p-3 text-center">
                      <p className="text-lg font-bold text-green-600">{taskStats.done}</p>
                      <p className="text-xs text-muted-foreground">Hoàn thành</p>
                    </div>
                    <div className="flex-1 rounded-lg bg-primary/10 p-3 text-center">
                      <p className="text-lg font-bold text-primary">{taskStats.inProgress}</p>
                      <p className="text-xs text-muted-foreground">Đang làm</p>
                    </div>
                    <div className="flex-1 rounded-lg bg-muted/40 p-3 text-center">
                      <p className="text-lg font-bold">{taskStats.todo}</p>
                      <p className="text-xs text-muted-foreground">Chờ</p>
                    </div>
                  </div>
                )}
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto mt-8" /> :
                  tasks.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">Chưa được gán task nào</p>
                  ) : (
                    <div className="space-y-2">
                      {tasks.map(t => (
                        <div key={t.id} className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium truncate flex-1">{t.title}</span>
                            <Badge className={`text-xs ml-2 ${statusColor[t.status] || ''}`}>
                              {statusLabel[t.status] || t.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-muted-foreground">{t.group_name}</p>
                            {t.deadline && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(t.deadline).toLocaleDateString('vi-VN')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </TabsContent>

              <TabsContent value="scores" className="mt-0">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto mt-8" /> :
                  scores.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">Chưa có điểm số nào</p>
                  ) : (
                    <div className="space-y-3">
                      {scores.map((s, i) => (
                        <div key={i} className="p-4 rounded-xl border bg-card">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{s.group_name}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-lg bg-muted/40 p-3 text-center">
                              <p className="text-xl font-bold">{s.weighted_average != null ? s.weighted_average.toFixed(1) : '—'}</p>
                              <p className="text-xs text-muted-foreground">TB có trọng số</p>
                            </div>
                            <div className="rounded-lg bg-primary/10 p-3 text-center">
                              <p className="text-xl font-bold text-primary">{s.final_score != null ? s.final_score.toFixed(1) : '—'}</p>
                              <p className="text-xs text-muted-foreground">Điểm cuối</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </TabsContent>

              <TabsContent value="activity" className="mt-0">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto mt-8" /> :
                  activities.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">Chưa có hoạt động nào</p>
                  ) : (
                    <div className="space-y-2">
                      {activities.map(a => (
                        <div key={a.id} className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm flex-1">{a.description || a.action}</p>
                            {a.group_name && (
                              <Badge variant="outline" className="text-[10px] shrink-0">{a.group_name}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(a.created_at).toLocaleString('vi-VN')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors">
      <Icon className="w-4 h-4 mt-0.5 text-primary/70 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  );
}
