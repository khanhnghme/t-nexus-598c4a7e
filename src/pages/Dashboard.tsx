import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import MandatoryNotification from '@/components/MandatoryNotification';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useLanguage } from '@/contexts/LanguageContext';
import StreakBadge from '@/components/StreakBadge';
import StreakFullScreenCelebration from '@/components/StreakFullScreenCelebration';
import { useLoginStreak } from '@/hooks/useLoginStreak';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import UserAvatar from '@/components/UserAvatar';
import DashboardProjectCard from '@/components/dashboard/DashboardProjectCard';
import { supabase } from '@/integrations/supabase/client';
import { useUserPresence } from '@/hooks/useUserPresence';
import UserPresenceIndicator from '@/components/UserPresenceIndicator';
import FirstTimeOnboarding from '@/components/FirstTimeOnboarding';

import { getSystemRoleLabel } from '@/lib/roleLabels';
import JoinByCodeDialog from '@/components/JoinByCodeDialog';
import { toast } from 'sonner';
import { notifyInvitationResponse } from '@/lib/notifications';
import {
  FolderKanban,
  ArrowRight,
  Plus,
  Loader2,
  Sparkles,
  Shield,
  Star,
  User,
  KeyRound,
  Crown,
  Zap,
  ShoppingBag,
  Calendar,
  CheckCircle2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Layers,
  MailOpen,
  X as XIcon,
  Check,
  Users,
  Clock,
  Building2,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { vi as viLocale, enUS } from 'date-fns/locale';

import invitationIllustration from '@/assets/invitation-illustration.png';

import type { Group } from '@/types/database';

const DEFAULT_PROJECT_LIMIT = 2;

type DashboardFilter = 'all' | 'active' | 'hidden' | 'pending';

interface PendingInvitationGroup {
  name: string;
  description: string | null;
  class_code: string | null;
  instructor_name: string | null;
  image_url: string | null;
  created_at: string;
  zalo_link: string | null;
}

interface PendingInvitation {
  id: string;
  group_id: string;
  invited_user_id: string;
  invited_by: string;
  role: string;
  status: string;
  created_at: string;
  groups?: PendingInvitationGroup | null;
  inviter?: { full_name: string } | null;
  memberCount?: number;
}

interface PendingWorkspaceInvite {
  id: string;
  workspace_id: string;
  scope: string;
  invitee_email: string;
  role_granted: string;
  invited_by: string;
  status: string;
  created_at: string;
  expires_at: string;
  group_id: string | null;
  workspace_name?: string;
  inviter_name?: string;
}

export default function Dashboard() {
  const { user, profile, mustChangePassword, refreshProfile, isLeader, isAdmin } = useAuth();
  const { activeWorkspace, isAvailable: wsAvailable, refreshWorkspaces } = useWorkspace();
  const { translations, locale } = useLanguage();
  const t = translations.app?.dashboard;
  const streak = useLoginStreak(user?.id);

  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showInvitationDialog, setShowInvitationDialog] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);
  const [pendingWsInvites, setPendingWsInvites] = useState<PendingWorkspaceInvite[]>([]);
  const [inviteTab, setInviteTab] = useState<'all' | 'project' | 'workspace'>('all');
  const [videoOpacity, setVideoOpacity] = useState(0);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [ownedProjectCount, setOwnedProjectCount] = useState(0);
  const [joinedProjectCount, setJoinedProjectCount] = useState(0);
  const [hiddenProjectIds, setHiddenProjectIds] = useState<Set<string>>(new Set());
  const [pendingApprovalGroups, setPendingApprovalGroups] = useState<Group[]>([]);
  const [showFullScreenFire, setShowFullScreenFire] = useState(false);
  const [filter, setFilter] = useState<DashboardFilter>(() => {
    if (typeof window !== 'undefined' && user?.id) {
      return (localStorage.getItem(`dashboard_filter_${user.id}`) as DashboardFilter) || 'active';
    }
    return 'active';
  });
  const { isConnected } = useUserPresence('system-global');

  useEffect(() => {
    const fetchVideoSettings = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'dashboard_video_bg')
        .maybeSingle();
      if (data?.value) {
        const val = data.value as { enabled?: boolean; dashboard_opacity?: number; opacity?: number; url?: string };
        setVideoEnabled(val.enabled ?? false);
        setVideoOpacity(val.dashboard_opacity ?? val.opacity ?? 0.2);
        setVideoUrl(val.url ?? '');
      }
    };
    fetchVideoSettings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`dashboard_filter_${user.id}`) as DashboardFilter;
      if (saved && ['all', 'active', 'hidden', 'pending'].includes(saved)) {
        setFilter(saved);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchProjectStats();
      fetchHiddenProjects();
      fetchPendingInvitations();
      fetchPendingApprovals();
      fetchPendingWsInvites();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeWorkspace?.id]);

  // Realtime for invitations and pending approvals
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('dashboard-invitations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_invitations', filter: `invited_user_id=eq.${user.id}` },
        () => { fetchPendingInvitations(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pending_approvals', filter: `user_id=eq.${user.id}` },
        () => { fetchPendingApprovals(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workspace_invites' },
        () => { fetchPendingWsInvites(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Full-screen fire celebration — 5s after load, only when streak increased
  useEffect(() => {
    if (!streak.streakIncreased) return;
    const timer = setTimeout(() => setShowFullScreenFire(true), 5000);
    return () => clearTimeout(timer);
  }, [streak.streakIncreased]);

  const fetchPendingApprovals = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('pending_approvals')
        .select('group_id')
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (data && data.length > 0) {
        const groupIds = data.map(d => d.group_id);
        const { data: groupsData } = await supabase
          .from('groups')
          .select('*')
          .in('id', groupIds);
        setPendingApprovalGroups(groupsData || []);
      } else {
        setPendingApprovalGroups([]);
      }
    } catch (e) { console.error(e); }
  };

  const fetchPendingInvitations = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('project_invitations')
        .select('id, group_id, invited_user_id, invited_by, role, status, created_at')
        .eq('invited_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (data) {
        const inviterIds = [...new Set(data.map(d => d.invited_by))];
        const groupIds = [...new Set(data.map(d => d.group_id))];

        const [profilesRes, groupsRes, memberCountsRes] = await Promise.all([
          supabase.from('profiles').select('id, full_name').in('id', inviterIds),
          supabase.from('groups').select('id, name, description, class_code, instructor_name, image_url, created_at, zalo_link').in('id', groupIds),
          Promise.all(groupIds.map(async (gid) => {
            const { count } = await supabase.from('group_members').select('id', { count: 'exact', head: true }).eq('group_id', gid);
            return { id: gid, count: count || 0 };
          })),
        ]);

        const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p]));
        const groupMap = new Map((groupsRes.data || []).map(g => [g.id, g]));
        const countMap = new Map(memberCountsRes.map(c => [c.id, c.count]));

        setPendingInvitations(data.map(d => ({
          ...d,
          inviter: profileMap.get(d.invited_by),
          groups: groupMap.get(d.group_id) || { name: 'Project', description: null, class_code: null, instructor_name: null, image_url: null, created_at: '', zalo_link: null },
          memberCount: countMap.get(d.group_id) || 0,
        })));
      }
    } catch (e) { console.error(e); }
  };

  const handleInvitationResponse = async (invitation: PendingInvitation, accept: boolean) => {
    setProcessingInvitation(invitation.id);
    try {
      const { error: updateError } = await supabase
        .from('project_invitations')
        .update({ status: accept ? 'accepted' : 'rejected' })
        .eq('id', invitation.id);
      if (updateError) throw updateError;

      if (accept) {
        const { error: memberError } = await supabase.from('group_members').insert({
          group_id: invitation.group_id,
          user_id: invitation.invited_user_id,
          role: invitation.role as any,
        });
        if (memberError) throw memberError;
      }

      // Notify leader(s)
      const { data: leaders } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', invitation.group_id)
        .in('role', ['project_admin', 'project_owner']);

      if (leaders && leaders.length > 0) {
        await notifyInvitationResponse({
          leaderIds: leaders.map(l => l.user_id),
          responderName: profile?.full_name || 'Người dùng',
          groupName: invitation.groups?.name || 'Project',
          groupId: invitation.group_id,
          accepted: accept,
        });
      }

      toast.success(accept ? 'Đã chấp nhận lời mời' : 'Đã từ chối lời mời');
      setPendingInvitations(prev => prev.filter(p => p.id !== invitation.id));
      if (accept) {
        fetchDashboardData();
        fetchProjectStats();
      }
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra');
    } finally {
      setProcessingInvitation(null);
    }
  };

  const fetchPendingWsInvites = async () => {
    if (!user || !profile?.email) return;
    try {
      const { data } = await supabase
        .from('workspace_invites')
        .select('id, workspace_id, scope, invitee_email, role_granted, invited_by, status, created_at, expires_at, group_id')
        .eq('invitee_email', profile.email)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        const wsIds = [...new Set(data.map(d => d.workspace_id))];
        const inviterIds = [...new Set(data.map(d => d.invited_by))];

        const [wsRes, profilesRes] = await Promise.all([
          supabase.from('workspaces').select('id, name').in('id', wsIds),
          supabase.from('profiles').select('id, full_name').in('id', inviterIds),
        ]);

        const wsMap = new Map((wsRes.data || []).map(w => [w.id, w.name]));
        const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p.full_name]));

        setPendingWsInvites(data.map(d => ({
          ...d,
          workspace_name: wsMap.get(d.workspace_id) || 'Workspace',
          inviter_name: profileMap.get(d.invited_by) || 'Người mời',
        })));
      } else {
        setPendingWsInvites([]);
      }
    } catch (e) { console.error(e); }
  };

  const handleWsInviteResponse = async (invite: PendingWorkspaceInvite, accept: boolean) => {
    setProcessingInvitation(invite.id);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('workspace-management', {
        body: {
          action: accept ? 'accept_invite' : 'decline_invite',
          invite_id: invite.id,
        },
      });

      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);

      toast.success(accept ? 'Đã chấp nhận lời mời workspace' : 'Đã từ chối lời mời workspace');
      setPendingWsInvites(prev => prev.filter(p => p.id !== invite.id));
      if (accept) {
        await refreshWorkspaces();
        fetchDashboardData();
      }
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra');
    } finally {
      setProcessingInvitation(null);
    }
  };

  const fetchProjectStats = async () => {
    if (!user) return;
    const { data: owned } = await supabase.from('groups').select('id').eq('created_by', user.id);
    const { data: joined } = await supabase.from('group_members').select('id').eq('user_id', user.id);
    setOwnedProjectCount(owned?.length || 0);
    setJoinedProjectCount(joined?.length || 0);
  };

  const fetchHiddenProjects = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('hidden_projects')
      .select('group_id')
      .eq('user_id', user.id);
    setHiddenProjectIds(new Set(data?.map(d => d.group_id) || []));
  };

  const handleFilterChange = (value: string) => {
    if (!value) return;
    const f = value as DashboardFilter;
    setFilter(f);
    if (user?.id) {
      localStorage.setItem(`dashboard_filter_${user.id}`, f);
    }
  };

  const handleToggleHide = async (groupId: string) => {
    if (!user) return;
    const isCurrentlyHidden = hiddenProjectIds.has(groupId);
    if (isCurrentlyHidden) {
      await supabase.from('hidden_projects').delete().eq('user_id', user.id).eq('group_id', groupId);
      setHiddenProjectIds(prev => { const next = new Set(prev); next.delete(groupId); return next; });
    } else {
      await supabase.from('hidden_projects').insert({ user_id: user.id, group_id: groupId });
      setHiddenProjectIds(prev => new Set(prev).add(groupId));
    }
  };

  const canCreateProject = isAdmin || isLeader;
  const projectLimit = profile?.project_limit ?? (isLeader ? DEFAULT_PROJECT_LIMIT : 0);

  const filteredGroups = useMemo(() => {
    if (filter === 'pending') return []; // pending uses separate list
    switch (filter) {
      case 'hidden':
        return groups.filter(g => hiddenProjectIds.has(g.id));
      case 'active':
        return groups.filter(g => !hiddenProjectIds.has(g.id));
      case 'all':
      default:
        return groups;
    }
  }, [groups, hiddenProjectIds, filter]);

  const activeCount = groups.filter(g => !hiddenProjectIds.has(g.id)).length;
  const hiddenCount = groups.filter(g => hiddenProjectIds.has(g.id)).length;
  const pendingCount = pendingApprovalGroups.length;

  const fetchDashboardData = async () => {
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user!.id);

      if (memberError) throw memberError;

      const groupIds = memberData?.map((m) => m.group_id) || [];

      if (groupIds.length === 0) {
        setGroups([]);
        return;
      }

      let query = supabase
        .from('groups')
        .select('*')
        .in('id', groupIds)
        .order('created_at', { ascending: false });

      // Filter by active workspace if available
      if (wsAvailable && activeWorkspace?.id) {
        query = query.eq('workspace_id', activeWorkspace.id);
      }

      const { data: groupsData, error: groupsError } = await query;

      if (groupsError) throw groupsError;

      setGroups(groupsData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadge = () => {
    if (isAdmin) return (
      <Badge variant="outline" className="bg-accent text-foreground border-border gap-1 font-medium text-[10px] shadow-none">
        <Shield className="w-3 h-3" strokeWidth={1.5} />
        {t?.ownerSystem || 'OwnerSystem'}
      </Badge>
    );
    if (isLeader) return (
      <Badge variant="outline" className="bg-accent text-foreground border-border gap-1 font-medium text-[10px] shadow-none">
        <Star className="w-3 h-3" strokeWidth={1.5} />
        {t?.advancedMember || 'Advanced Member'}
      </Badge>
    );
    return (
      <Badge variant="outline" className="bg-accent text-muted-foreground border-border gap-1 font-medium text-[10px] shadow-none">
        <User className="w-3 h-3" strokeWidth={1.5} />
        {t?.memberRole || 'Member'}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <StreakFullScreenCelebration
        currentStreak={streak.currentStreak}
        visible={showFullScreenFire}
        onComplete={() => setShowFullScreenFire(false)}
      />

      {videoEnabled && videoUrl && (
        <>
          <video
            autoPlay
            loop
            muted
            playsInline
            className="fixed inset-0 w-full h-full object-cover pointer-events-none"
            style={{ opacity: videoOpacity, zIndex: 0 }}
            src={videoUrl}
          />
          <div
            className="fixed inset-0 bg-background/60 pointer-events-none"
            style={{ zIndex: 1 }}
          />
        </>
      )}

      {user && profile && !profile.onboarding_completed && (
        <FirstTimeOnboarding
          open={!profile.onboarding_completed}
          userId={user.id}
          userFullName={profile.full_name}
          userEmail={profile.email}
          userStudentId={profile.student_id}
          mustChangePassword={mustChangePassword}
          onComplete={refreshProfile}
        />
      )}

      <MandatoryNotification mode="post_login" userId={user?.id} />
      <div className="relative space-y-8" style={{ zIndex: 2 }}>
        {/* Welcome Section — Frosted Glass style (Light & Dark mode compatible) */}
        <div className="relative overflow-hidden rounded-2xl border border-white/60 dark:border-primary/20 bg-gradient-to-br from-white/80 via-white/60 to-primary/10 dark:from-background/80 dark:via-background/60 dark:to-primary/20 backdrop-blur-xl shadow-md">
          <div className="relative px-6 py-5">
            <div className="flex items-center gap-5">
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <UserAvatar
                  src={profile?.avatar_url}
                  name={profile?.full_name}
                  size="xl"
                  className="border-2 border-border shadow-none"
                  showPresence={isConnected}
                  presenceStatus="online"
                />
                <div className="flex flex-wrap gap-1 justify-center">
                  {getRoleBadge()}
                </div>
              </div>

              <div className="min-w-0">
                <h1 className="text-2xl font-heading font-bold leading-tight text-foreground">{profile?.full_name}</h1>
                <p className="text-sm mt-0.5 text-muted-foreground">
                  {profile?.institution ? `${profile.institution} • ` : ''}MSSV: {profile?.student_id}
                </p>
                {profile?.created_at && (
                  <p className="text-xs mt-0.5 flex items-center gap-1 text-muted-foreground/70">
                    <Calendar className="w-3 h-3" />
                    {t?.joinedFrom || 'Joined'} {format(new Date(profile.created_at), 'dd/MM/yyyy', { locale: locale === 'vi' ? viLocale : enUS })}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {profile?.is_approved && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 bg-accent text-muted-foreground border-border">
                      <CheckCircle2 className="w-2.5 h-2.5" strokeWidth={1.5} />
                      Đã xác minh
                    </Badge>
                  )}
                  {isAdmin ? (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 bg-accent text-muted-foreground border-border">
                      <Unlock className="w-2.5 h-2.5" strokeWidth={1.5} />
                      Tạo dự án không giới hạn
                    </Badge>
                  ) : canCreateProject && projectLimit > 0 ? (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 bg-accent text-muted-foreground border-border">
                      <Unlock className="w-2.5 h-2.5" strokeWidth={1.5} />
                      Được tạo tối đa {projectLimit} dự án
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 bg-accent text-muted-foreground/70 border-border">
                      <Lock className="w-2.5 h-2.5" strokeWidth={1.5} />
                      Chỉ tham gia — không có quyền tạo dự án
                    </Badge>
                  )}
                </div>
              </div>

              {/* Streak Widget - next to user info */}
              <div className="hidden lg:block">
                <StreakBadge
                  currentStreak={streak.currentStreak}
                  longestStreak={streak.longestStreak}
                  isActiveToday={streak.isActiveToday}
                  isWarning={streak.isWarning}
                  variant="full"
                  showCelebration={streak.streakIncreased}
                  recoveryCount={streak.recoveryCount}
                  canRecover={streak.canRecover}
                  onRecover={streak.recoverStreak}
                />
              </div>

              {/* Stats */}
              <div className="hidden lg:flex items-center gap-4 ml-auto pl-5 border-l border-border">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center bg-primary/10">
                    <ShoppingBag className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold leading-none text-foreground">{joinedProjectCount}</p>
                    <p className="text-[10px] text-muted-foreground">Joined</p>
                  </div>
                </div>

                <div className="w-px h-8 bg-border" />

                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center bg-orange-500/10">
                    <Crown className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold leading-none text-foreground">{ownedProjectCount}</p>
                    <p className="text-[10px] text-muted-foreground">Owned</p>
                  </div>
                </div>
              </div>

              {/* Desktop buttons: Invitation + Join */}
              <div className="hidden lg:flex items-center gap-2 shrink-0">
                {/* Invitation button */}
                <button
                  onClick={() => setShowInvitationDialog(true)}
                  className="group relative overflow-hidden rounded-xl px-4 py-3 font-medium transition-all duration-150 ease-in-out hover:bg-accent text-foreground border border-border"
                >
                  <span className="relative flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-pink-500/10">
                      <MailOpen className="w-3.5 h-3.5 text-pink-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold leading-tight">Lời mời</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">invites</p>
                    </div>
                    {(pendingInvitations.length + pendingWsInvites.length) > 0 && (
                      <span className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center font-bold animate-pulse shadow-sm">
                        {pendingInvitations.length + pendingWsInvites.length}
                      </span>
                    )}
                  </span>
                </button>

                {/* Join Project button */}
                <button
                  onClick={() => setShowJoinDialog(true)}
                  className="group relative overflow-hidden rounded-xl px-4 py-3 font-medium transition-all duration-150 ease-in-out hover:bg-accent text-foreground border border-border"
                >
                  <span className="relative flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-teal-500/10">
                      <KeyRound className="w-3.5 h-3.5 text-teal-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold leading-tight">Tham gia</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">by code</p>
                    </div>
                  </span>
                </button>
              </div>
            </div>

            {/* Mobile stats + buttons */}
            <div className="flex lg:hidden items-center justify-between mt-3 gap-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm font-bold text-foreground">{joinedProjectCount}</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm font-bold text-foreground">{ownedProjectCount}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowInvitationDialog(true)} className="relative border-border">
                  <MailOpen className="w-4 h-4" />
                  {(pendingInvitations.length + pendingWsInvites.length) > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center">
                      {pendingInvitations.length + pendingWsInvites.length}
                    </span>
                  )}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowJoinDialog(true)} className="border-border">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <JoinByCodeDialog
          open={showJoinDialog}
          onOpenChange={setShowJoinDialog}
          onJoined={() => { fetchDashboardData(); fetchPendingApprovals(); }}
        />

        {/* Invitation Dialog — 16:9 split layout */}
        <Dialog open={showInvitationDialog} onOpenChange={setShowInvitationDialog}>
          <DialogContent className="sm:max-w-4xl max-w-[95vw] p-0 overflow-hidden border-none sm:aspect-video max-h-[85vh]">
            <div className="flex h-full min-h-0">
              {/* Left — Illustration */}
              <div className="hidden md:flex w-2/5 bg-gradient-to-br from-primary via-primary/90 to-primary/70 relative flex-col items-center justify-center p-8 text-primary-foreground">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white/20 blur-3xl" />
                  <div className="absolute bottom-20 right-5 w-40 h-40 rounded-full bg-white/15 blur-3xl" />
                </div>
                <div className="relative z-10 text-center space-y-4">
                  <img src={invitationIllustration} alt="Lời mời tham gia" className="w-40 h-40 object-contain mx-auto drop-shadow-2xl" />
                   <h2 className="text-2xl font-bold">Lời mời</h2>
                   <p className="text-sm opacity-80 leading-relaxed">
                     Danh sách lời mời tham gia Project và Workspace mà bạn nhận được.
                   </p>
                  <div className="flex items-center justify-center gap-3 pt-4">
                    <div className="flex items-center gap-1.5 text-xs opacity-70">
                      <Check className="w-3.5 h-3.5" />
                      <span>Chấp nhận để tham gia</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs opacity-70">
                      <XIcon className="w-3.5 h-3.5" />
                      <span>Từ chối nếu không muốn</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col bg-background">
                <div className="p-6 pb-3 border-b">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                      <MailOpen className="w-5 h-5 text-primary" />
                      Lời mời đang chờ
                      {(pendingInvitations.length + pendingWsInvites.length) > 0 && (
                        <Badge className="bg-primary text-primary-foreground text-xs">
                          {pendingInvitations.length + pendingWsInvites.length}
                        </Badge>
                      )}
                    </DialogTitle>
                    <DialogDescription>
                      Chấp nhận hoặc từ chối lời mời tham gia
                    </DialogDescription>
                  </DialogHeader>
                </div>

                <Tabs value={inviteTab} onValueChange={(v) => setInviteTab(v as any)} className="flex-1 flex flex-col min-h-0">
                  <div className="px-6 pt-3">
                    <TabsList className="w-full">
                      <TabsTrigger value="all" className="flex-1 text-xs">
                        Tất cả
                        {(pendingInvitations.length + pendingWsInvites.length) > 0 && (
                          <Badge variant="secondary" className="ml-1 text-[10px] px-1 h-4">{pendingInvitations.length + pendingWsInvites.length}</Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="project" className="flex-1 text-xs">
                        Project
                        {pendingInvitations.length > 0 && (
                          <Badge variant="secondary" className="ml-1 text-[10px] px-1 h-4">{pendingInvitations.length}</Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="workspace" className="flex-1 text-xs">
                        Workspace
                        {pendingWsInvites.length > 0 && (
                          <Badge variant="secondary" className="ml-1 text-[10px] px-1 h-4">{pendingWsInvites.length}</Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <ScrollArea className="flex-1 p-6">
                    {/* Empty state */}
                    {((inviteTab === 'all' && pendingInvitations.length === 0 && pendingWsInvites.length === 0) ||
                      (inviteTab === 'project' && pendingInvitations.length === 0) ||
                      (inviteTab === 'workspace' && pendingWsInvites.length === 0)) && (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                          <MailOpen className="w-8 h-8 opacity-40" />
                        </div>
                        <p className="font-medium">Không có lời mời nào</p>
                        <p className="text-sm mt-1">Bạn sẽ nhận được thông báo khi có lời mời mới</p>
                      </div>
                    )}

                    <div className="space-y-3">
                      {/* Project invitations */}
                      {(inviteTab === 'all' || inviteTab === 'project') && pendingInvitations.map((inv) => (
                        <div
                          key={inv.id}
                          className="rounded-2xl border bg-card p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start gap-3">
                            {inv.groups?.image_url ? (
                              <img
                                src={inv.groups.image_url}
                                alt={inv.groups?.name || 'Project'}
                                className="w-12 h-12 rounded-lg object-cover border border-border shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <FolderKanban className="w-6 h-6 text-primary" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold text-foreground truncate">
                                  {inv.groups?.name || 'Project'}
                                </p>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Badge variant="outline" className="text-[10px]">Project</Badge>
                                  <Badge variant="secondary" className="text-[10px]">
                                    {inv.role === 'project_admin' ? 'Phó nhóm' : 'Thành viên'}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Mời bởi <span className="font-medium text-foreground">{inv.inviter?.full_name || 'Leader'}</span>
                                {' · '}
                                {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true, locale: locale === 'vi' ? viLocale : enUS })}
                              </p>
                            </div>
                          </div>

                          {inv.groups?.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 pl-[60px]">
                              {inv.groups.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-1.5 pl-[60px]">
                            {inv.groups?.class_code && (
                              <Badge variant="outline" className="text-[10px] gap-1 h-5">
                                Lớp: {inv.groups.class_code}
                              </Badge>
                            )}
                            {inv.groups?.instructor_name && (
                              <Badge variant="outline" className="text-[10px] gap-1 h-5">
                                GV: {inv.groups.instructor_name}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px] gap-1 h-5">
                              <Users className="w-3 h-3" />
                              {inv.memberCount ?? 0} thành viên
                            </Badge>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1"
                              onClick={() => handleInvitationResponse(inv, false)}
                              disabled={processingInvitation === inv.id}
                            >
                              Từ chối
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 text-xs gap-1"
                              onClick={() => handleInvitationResponse(inv, true)}
                              disabled={processingInvitation === inv.id}
                            >
                              {processingInvitation === inv.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              Chấp nhận
                            </Button>
                          </div>
                        </div>
                      ))}

                      {/* Workspace invitations */}
                      {(inviteTab === 'all' || inviteTab === 'workspace') && pendingWsInvites.map((inv) => (
                        <div
                          key={inv.id}
                          className="rounded-2xl border bg-card p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center shrink-0">
                              <Building2 className="w-6 h-6 text-accent-foreground" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold text-foreground truncate">
                                  {inv.workspace_name}
                                </p>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Workspace</Badge>
                                  <Badge variant="secondary" className="text-[10px]">
                                    {inv.role_granted === 'workspace_admin' ? 'Admin' : 'Thành viên'}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Mời bởi <span className="font-medium text-foreground">{inv.inviter_name}</span>
                                {' · '}
                                {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true, locale: locale === 'vi' ? viLocale : enUS })}
                              </p>
                            </div>
                          </div>

                          <div className="pl-[60px]">
                            <p className="text-xs text-muted-foreground">
                              Bạn sẽ có quyền truy cập tất cả dự án trong workspace này sau khi chấp nhận.
                            </p>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1"
                              onClick={() => handleWsInviteResponse(inv, false)}
                              disabled={processingInvitation === inv.id}
                            >
                              Từ chối
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 text-xs gap-1"
                              onClick={() => handleWsInviteResponse(inv, true)}
                              disabled={processingInvitation === inv.id}
                            >
                              {processingInvitation === inv.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              Chấp nhận
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </Tabs>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* My Projects */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-xl font-heading">Projects của tôi</CardTitle>
                <CardDescription>Các dự án bạn đang tham gia</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <ToggleGroup type="single" value={filter} onValueChange={handleFilterChange} className="bg-transparent flex-wrap sm:flex-nowrap gap-1">
                  <ToggleGroupItem value="active" className="text-xs px-3 sm:px-3.5 py-1.5 h-8 rounded-full border border-transparent data-[state=on]:border-primary data-[state=on]:bg-transparent data-[state=on]:text-primary data-[state=off]:bg-muted/50 data-[state=off]:text-muted-foreground hover:data-[state=off]:bg-muted gap-1.5 transition-all">
                    <Layers className="w-3 h-3 hidden sm:block" />
                    Đang dùng
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 min-w-[16px] justify-center bg-muted-foreground/15 text-foreground">{activeCount}</Badge>
                  </ToggleGroupItem>
                  {pendingCount > 0 && (
                    <ToggleGroupItem value="pending" className="text-xs px-3 sm:px-3.5 py-1.5 h-8 rounded-full border border-transparent data-[state=on]:border-primary data-[state=on]:bg-transparent data-[state=on]:text-primary data-[state=off]:bg-muted/50 data-[state=off]:text-muted-foreground hover:data-[state=off]:bg-muted gap-1.5 transition-all">
                      <Clock className="w-3 h-3 hidden sm:block" />
                      Chờ duyệt
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 min-w-[16px] justify-center bg-warning/20 text-warning">{pendingCount}</Badge>
                    </ToggleGroupItem>
                  )}
                  <ToggleGroupItem value="hidden" className="text-xs px-3 sm:px-3.5 py-1.5 h-8 rounded-full border border-transparent data-[state=on]:border-primary data-[state=on]:bg-transparent data-[state=on]:text-primary data-[state=off]:bg-muted/50 data-[state=off]:text-muted-foreground hover:data-[state=off]:bg-muted gap-1.5 transition-all">
                    <EyeOff className="w-3 h-3 hidden sm:block" />
                    Đã ẩn
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 min-w-[16px] justify-center bg-muted-foreground/15 text-foreground">{hiddenCount}</Badge>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="all" className="text-xs px-3 sm:px-3.5 py-1.5 h-8 rounded-full border border-transparent data-[state=on]:border-primary data-[state=on]:bg-transparent data-[state=on]:text-primary data-[state=off]:bg-muted/50 data-[state=off]:text-muted-foreground hover:data-[state=off]:bg-muted gap-1.5 transition-all">
                    Tất cả
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 min-w-[16px] justify-center bg-muted-foreground/15 text-foreground">{groups.length}</Badge>
                  </ToggleGroupItem>
                </ToggleGroup>
                <Link to="/groups">
                  <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md transition-all" size="sm">
                    <FolderKanban className="w-4 h-4" />
                    <span className="hidden md:inline">Xem & Tạo Project</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filter === 'pending' ? (
              pendingApprovalGroups.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-1">Không có yêu cầu nào đang chờ duyệt</p>
                  <p className="text-sm">Sử dụng mã tham gia để xin vào project mới</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {pendingApprovalGroups.map((group) => (
                    <DashboardProjectCard
                      key={group.id}
                      group={group}
                      isPending
                    />
                  ))}
                </div>
              )
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FolderKanban className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-1">
                  {filter === 'hidden' ? 'Không có project nào bị ẩn' : filter === 'all' ? 'Bạn chưa tham gia project nào' : 'Không có project đang sử dụng'}
                </p>
                <p className="text-sm">
                  {filter === 'hidden' ? 'Hover lên project và nhấn icon mắt để ẩn' : 'Liên hệ Leader để được thêm vào project'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredGroups.map((group) => (
                  <DashboardProjectCard
                    key={group.id}
                    group={group}
                    isHidden={hiddenProjectIds.has(group.id)}
                    onToggleHide={handleToggleHide}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
