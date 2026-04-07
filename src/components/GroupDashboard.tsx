import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  Clock,
  Users,
  AlertTriangle,
  Layers,
  CircleDot,
  Play,
  CheckCheck,
  ShieldCheck,
  BookOpen,
  User,
  Mail,
  Link2,
  ExternalLink,
  ArrowLeft,
  Pencil,
  ImageIcon,
} from 'lucide-react';
import type { Task, GroupMember, Stage, Profile } from '@/types/database';
import { formatDeadlineShortVN, isDeadlineOverdue, parseLocalDateTime } from '@/lib/datetime';
import { fixStorageUrl } from '@/lib/urlUtils';
import { getProjectRoleLabel } from '@/lib/roleLabels';
import UserAvatar from '@/components/UserAvatar';
import UserPresenceIndicator from '@/components/UserPresenceIndicator';
import ProfileViewDialog from '@/components/ProfileViewDialog';
import { useUserPresence } from '@/hooks/useUserPresence';

interface CourseInfo {
  class_code?: string | null;
  instructor_name?: string | null;
  instructor_email?: string | null;
  zalo_link?: string | null;
  additional_info?: string | null;
  description?: string | null;
}

interface GroupDashboardProps {
  tasks: Task[];
  members: GroupMember[];
  stages: Stage[];
  groupId?: string;
  createdBy?: string;
  courseInfo?: CourseInfo;
  groupName?: string;
  groupDescription?: string | null;
  imageUrl?: string | null;
  canEdit?: boolean;
  onEditInfo?: () => void;
}

export default function GroupDashboard({ tasks, members, stages, groupId, createdBy, courseInfo, groupName, groupDescription, imageUrl, canEdit, onEditInfo }: GroupDashboardProps) {
  const { getPresenceStatus, isConnected } = useUserPresence('system-global');
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileRole, setProfileRole] = useState<ProjectRole>('project_member');

  const stats = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter(t => t.status === 'TODO').length;
    const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const done = tasks.filter(t => t.status === 'DONE').length;
    const verified = tasks.filter(t => t.status === 'VERIFIED').length;
    const completed = done + verified;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, todo, inProgress, done, verified, completed, percent };
  }, [tasks]);

  const overdueTasks = useMemo(() => tasks.filter(t => {
    if (!t.deadline || t.status === 'DONE' || t.status === 'VERIFIED') return false;
    return isDeadlineOverdue((t as any).extended_deadline || t.deadline);
  }), [tasks]);

  const upcomingTasks = useMemo(() => tasks.filter(t => {
    if (!t.deadline || t.status === 'DONE' || t.status === 'VERIFIED') return false;
    const deadline = parseLocalDateTime(t.deadline);
    if (!deadline) return false;
    const now = new Date();
    return deadline >= now && deadline <= new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  }), [tasks]);

  const onlineMembers = isConnected
    ? members.filter(m => getPresenceStatus(m.user_id) === 'online').length
    : 0;

  const handleMemberClick = (member: GroupMember) => {
    if (member.profiles) {
      setSelectedProfile(member.profiles as Profile);
      setProfileRole(member.role as ProjectRole);
      setProfileDialogOpen(true);
    }
  };

  const donutR = 22;
  const donutStroke = 5;
  const donutC = 2 * Math.PI * donutR;
  const donutOffset = donutC - (stats.percent / 100) * donutC;

  const hasCourseInfo = courseInfo && (courseInfo.class_code || courseInfo.instructor_name || courseInfo.instructor_email || courseInfo.zalo_link);

  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden project-hero-enter">
        {/* Top accent line */}
        <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary/50" />

        {/* ── SECTION 1: HEADER ── */}
        <div className="px-5 pt-4 pb-4 border-b border-border project-hero-title">
          <Link to="/groups" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors mb-2">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />Quay lại danh sách
          </Link>
          
          {/* Project Title */}
          <div className="flex items-start gap-4">
            {/* Project Image */}
            {imageUrl && (
              <div className="flex-shrink-0">
                <img
                  src={fixStorageUrl(imageUrl) || ''}
                  alt={groupName || 'Project'}
                  className="w-24 h-24 md:w-28 md:h-28 rounded-xl object-cover border border-border/50 shadow-sm"
                />
              </div>
            )}

            <div className="min-w-0 flex-1">
              {groupName && (
                <div className="flex items-center gap-2.5 mb-1">
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold project-title-gradient leading-tight">
                    {groupName}
                  </h1>
                  {canEdit && onEditInfo && (
                    <button
                      onClick={onEditInfo}
                      className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      title="Chỉnh sửa thông tin"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
              {groupDescription && (
                <p className="text-muted-foreground text-sm md:text-base max-w-3xl line-clamp-3 mt-1 leading-relaxed">
                  {groupDescription}
                </p>
              )}
              
              {/* Quick stats summary under title */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {members.length} thành viên
                </span>
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  {stages.length} giai đoạn
                </span>
                <span className="flex items-center gap-1">
                  <CheckCheck className="w-3 h-3" />
                  {stats.completed}/{stats.total} công việc hoàn thành
                </span>
              </div>
            </div>
          </div>

          {/* Course Info - Full detail block */}
          {hasCourseInfo && (
            <div className="mt-3 pt-3 border-t border-border/50 project-hero-desc">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {courseInfo.class_code && (
                  <div className="flex items-start gap-2">
                    <BookOpen className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Lớp học phần</p>
                      <p className="text-sm font-semibold text-foreground">{courseInfo.class_code}</p>
                    </div>
                  </div>
                )}
                {courseInfo.instructor_name && (
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Giảng viên hướng dẫn</p>
                      <p className="text-sm font-semibold text-foreground">{courseInfo.instructor_name}</p>
                    </div>
                  </div>
                )}
                {courseInfo.instructor_email && (
                  <div className="flex items-start gap-2">
                    <Mail className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Email giảng viên</p>
                      <a href={`mailto:${courseInfo.instructor_email}`} className="text-sm font-medium text-primary hover:underline break-all">
                        {courseInfo.instructor_email}
                      </a>
                    </div>
                  </div>
                )}
                {courseInfo.zalo_link && (
                  <div className="flex items-start gap-2">
                    <Link2 className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Liên hệ nhóm</p>
                      <a href={courseInfo.zalo_link} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                        Mở liên kết <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
              {courseInfo.additional_info && (
                <p className="text-xs text-muted-foreground mt-2 pl-6 italic">{courseInfo.additional_info}</p>
              )}
            </div>
          )}
        </div>

        {/* ── SECTION 2: KPI BAR ── */}
        <div className="px-5 py-3 border-b border-border project-hero-stats">
          <div className="flex items-center gap-4 mb-2.5">
            {/* Donut mini */}
            <div className="relative flex-shrink-0">
              <svg width="56" height="56" viewBox="0 0 54 54" className="-rotate-90">
                <circle cx="27" cy="27" r={donutR} fill="none" strokeWidth={donutStroke} className="stroke-muted" />
                <circle cx="27" cy="27" r={donutR} fill="none" strokeWidth={donutStroke} strokeLinecap="round" strokeDasharray={donutC} strokeDashoffset={donutOffset} className="stroke-primary transition-all duration-700" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-foreground">{stats.percent}%</span>
              </div>
            </div>

            {/* Stat badges inline */}
            <div className="flex flex-wrap items-center gap-2">
              <StatBadge icon={CircleDot} label="Chờ xử lý" value={stats.todo} className="text-muted-foreground" />
              <StatBadge icon={Play} label="Đang thực hiện" value={stats.inProgress} className="text-warning" />
              <StatBadge icon={CheckCheck} label="Hoàn thành" value={stats.done} className="text-primary" />
              <StatBadge icon={ShieldCheck} label="Đã duyệt" value={stats.verified} className="text-success" />
            </div>

            <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
              <span className="font-bold text-foreground">{stats.completed}</span>/{stats.total} hoàn thành
            </span>
          </div>
          <Progress value={stats.percent} className="h-1.5" />
        </div>

        {/* ── SECTION 3: MEMBERS & ALERTS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border border-b border-border">
          {/* Members */}
          <div className="px-5 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">{members.length} thành viên</span>
              {isConnected && onlineMembers > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  {onlineMembers} online
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-[60px] overflow-y-auto">
              {members.slice(0, 16).map((member) => {
                const status = isConnected ? getPresenceStatus(member.user_id) : 'offline';
                return (
                  <div
                    key={member.id}
                    onClick={() => handleMemberClick(member)}
                    className="relative cursor-pointer"
                    title={`${member.profiles?.full_name} — ${getProjectRoleLabel(member.role, member.user_id === createdBy)}`}
                  >
                    <UserAvatar src={member.profiles?.avatar_url} name={member.profiles?.full_name} size="sm" />
                    {isConnected && (
                      <div className="absolute -bottom-0.5 -right-0.5">
                        <UserPresenceIndicator status={status} size="xs" />
                      </div>
                    )}
                  </div>
                );
              })}
              {members.length > 16 && (
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                  +{members.length - 16}
                </div>
              )}
            </div>
          </div>

          {/* Alerts */}
          <div className="px-5 py-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-warning" />
              <span className="text-xs font-semibold text-foreground">Cảnh báo</span>
              {(overdueTasks.length + upcomingTasks.length > 0) && (
                <span className="px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold">
                  {overdueTasks.length + upcomingTasks.length}
                </span>
              )}
            </div>
            {overdueTasks.length === 0 && upcomingTasks.length === 0 ? (
              <div className="flex items-center gap-2 text-muted-foreground py-1">
                <CheckCircle2 className="w-4 h-4 text-success/40" />
                <span className="text-[11px]">Không có cảnh báo</span>
              </div>
            ) : (
              <div className="space-y-1 max-h-[60px] overflow-y-auto">
                {overdueTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-1.5 text-[10px]">
                    <AlertTriangle className="w-2.5 h-2.5 text-destructive flex-shrink-0" />
                    <span className="truncate flex-1 font-medium text-foreground">{task.title}</span>
                    <span className="flex-shrink-0 text-destructive">{formatDeadlineShortVN(task.deadline!)}</span>
                  </div>
                ))}
                {upcomingTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-1.5 text-[10px]">
                    <Clock className="w-2.5 h-2.5 text-warning flex-shrink-0" />
                    <span className="truncate flex-1 font-medium text-foreground">{task.title}</span>
                    <span className="flex-shrink-0 text-warning">{formatDeadlineShortVN(task.deadline!)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── SECTION 4: STAGES ── */}
        {stages.length > 0 && (
          <div className="px-5 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">Giai đoạn ({stages.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {stages.map((stage) => {
                const stageTasks = tasks.filter(t => t.stage_id === stage.id);
                const stageCompleted = stageTasks.filter(t => t.status === 'DONE' || t.status === 'VERIFIED').length;
                const stagePercent = stageTasks.length > 0 ? Math.round((stageCompleted / stageTasks.length) * 100) : 0;
                return (
                  <div key={stage.id} className="flex items-center gap-2 rounded-md bg-muted/30 px-3 py-1.5 min-w-[140px]">
                    <span className="text-[11px] font-medium text-foreground truncate">{stage.name}</span>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${stagePercent}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-primary w-6 text-right">{stagePercent}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <ProfileViewDialog
        profile={selectedProfile}
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        role={profileRole}
        groupId={groupId}
      />
    </>
  );
}

function StatBadge({ icon: Icon, label, value, className }: { icon: any; label: string; value: number; className: string }) {
  return (
    <div className="flex items-center gap-1 rounded-md bg-muted/40 px-2 py-1">
      <Icon className={`w-3 h-3 ${className} flex-shrink-0`} />
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-xs font-bold text-foreground">{value}</span>
    </div>
  );
}
