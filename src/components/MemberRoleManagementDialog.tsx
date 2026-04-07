import { useState, useEffect, useCallback } from 'react';
import { notifyRoleChanged } from '@/lib/notifications';
import { logActivity } from '@/lib/activityLogger';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import UserAvatar from '@/components/UserAvatar';
import UserPresenceIndicator from '@/components/UserPresenceIndicator';
import { useUserPresence } from '@/hooks/useUserPresence';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { fixStorageUrl } from '@/lib/urlUtils';
import { useToast } from '@/hooks/use-toast';
import {
  Shield, UserCheck, ArrowUp, ArrowDown, Settings, Eye, EyeOff,
  Briefcase, HardDrive, Mail, IdCard, Calendar, Loader2, AlertTriangle,
  FolderKanban, Users, Crown, ExternalLink
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import type { Profile } from '@/types/database';
import ProjectTransferDialog from '@/components/ProjectTransferDialog';
import { useNavigate } from 'react-router-dom';

interface GroupInfo {
  id: string;
  name: string;
  slug: string | null;
  role: string;
  is_owner: boolean;
  member_count: number;
  image_url: string | null;
}

interface MemberRoleManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Profile | null;
  systemRoles: string[];
  onRoleChanged: () => void;
}

const DEFAULT_PROJECT_LIMIT = 2;


export default function MemberRoleManagementDialog({
  open, onOpenChange, member, systemRoles, onRoleChanged
}: MemberRoleManagementDialogProps) {
  const { user, profile: currentProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { getPresenceStatus, isConnected } = useUserPresence('system-global');

  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPromoteConfirm, setShowPromoteConfirm] = useState(false);
  const [showDemoteConfirm, setShowDemoteConfirm] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [editingLimits, setEditingLimits] = useState(false);
  const [projectLimit, setProjectLimit] = useState<number>(DEFAULT_PROJECT_LIMIT);

  const isLeaderRole = systemRoles.includes('project_admin');
  const isAdminRole = systemRoles.includes('admin');
  const isMemberRole = !isLeaderRole && !isAdminRole;

  const currentRoleLabel = isAdminRole ? 'OwnerSystem' : isLeaderRole ? 'Leader' : 'Thành viên';

  const ownedGroups = groups.filter(g => g.is_owner);
  const memberGroups = groups.filter(g => !g.is_owner);

  useEffect(() => {
    if (open && member) {
      setLoading(true);
      setProjectLimit(member.project_limit ?? DEFAULT_PROJECT_LIMIT);
      setEditingLimits(false);
      Promise.all([fetchGroups(member.id)])
        .finally(() => setLoading(false));
    }
  }, [open, member?.id]);

  const fetchGroups = async (userId: string) => {
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id, role, groups(id, name, slug, image_url, created_by)')
      .eq('user_id', userId);

    if (!memberships) { setGroups([]); return; }

    const groupInfos: GroupInfo[] = [];
    for (const m of memberships as any[]) {
      const g = m.groups;
      if (!g) continue;
      // Count members
      const { count } = await supabase
        .from('group_members')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', g.id);
      
      groupInfos.push({
        id: g.id,
        name: g.name,
        slug: g.slug,
        role: m.role,
        is_owner: g.created_by === userId,
        member_count: count || 0,
        image_url: g.image_url,
      });
    }
    setGroups(groupInfos);
  };


  const handlePromote = async () => {
    if (!member) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'update_role',
          user_id: member.id,
          new_role: 'project_admin',
          requester_id: user?.id,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);

      // Set default limits
      await supabase.from('profiles').update({
        project_limit: DEFAULT_PROJECT_LIMIT,
      }).eq('id', member.id);

      await logActivity({
        userId: user!.id,
        userName: currentProfile?.full_name || 'OwnerSystem',
        action: 'PROMOTE_MEMBER',
        actionType: 'project_member',
        description: `Nâng quyền ${member.full_name} từ Thành viên → Leader`,
        metadata: { target_user_id: member.id, from_role: 'project_member', to_role: 'project_admin' },
      });

      await notifyRoleChanged({ userIds: [member.id], adminName: currentProfile?.full_name || 'OwnerSystem', newRole: 'Leader', action: 'promote' });
      toast({ title: 'Đã nâng quyền', description: `${member.full_name} đã trở thành Leader.` });
      onRoleChanged();
      setShowPromoteConfirm(false);
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDemoteCheck = () => {
    if (ownedGroups.length > 0) {
      setShowTransferDialog(true);
    } else {
      setShowDemoteConfirm(true);
    }
  };

  const handleDemote = async () => {
    if (!member) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'update_role',
          user_id: member.id,
          new_role: 'project_member',
          requester_id: user?.id,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);

      // Clear limits
      await supabase.from('profiles').update({
        project_limit: null,
      }).eq('id', member.id);

      await logActivity({
        userId: user!.id,
        userName: currentProfile?.full_name || 'OwnerSystem',
        action: 'DEMOTE_MEMBER',
        actionType: 'project_member',
        description: `Hạ quyền ${member.full_name} từ Leader → Thành viên`,
        metadata: { target_user_id: member.id, from_role: 'project_admin', to_role: 'project_member' },
      });

      await notifyRoleChanged({ userIds: [member.id], adminName: currentProfile?.full_name || 'OwnerSystem', newRole: 'Thành viên', action: 'demote' });
      toast({ title: 'Đã hạ quyền', description: `${member.full_name} đã trở thành Thành viên.` });
      onRoleChanged();
      setShowDemoteConfirm(false);
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveLimits = async () => {
    if (!member) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({
        project_limit: projectLimit,
      }).eq('id', member.id);
      if (error) throw error;

      await logActivity({
        userId: user!.id,
        userName: currentProfile?.full_name || 'OwnerSystem',
        action: 'UPDATE_MEMBER_LIMITS',
        actionType: 'project_member',
        description: `Cập nhật giới hạn cho ${member.full_name}: ${projectLimit} projects`,
        metadata: { target_user_id: member.id, project_limit: projectLimit },
      });

      toast({ title: 'Đã cập nhật', description: 'Giới hạn đã được lưu.' });
      setEditingLimits(false);
      onRoleChanged();
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferComplete = () => {
    setShowTransferDialog(false);
    // After transfer, owned groups should be 0, allow demote
    fetchGroups(member!.id).then(() => {
      setShowDemoteConfirm(true);
    });
  };

  const handleNavigateToProject = (slug: string | null, id: string) => {
    onOpenChange(false);
    navigate(slug ? `/p/${slug}` : `/groups/${id}`);
  };

  const handleIncognitoAccess = (slug: string | null, id: string) => {
    onOpenChange(false);
    navigate(slug ? `/p/${slug}` : `/groups/${id}`);
  };

  if (!member) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-[1280px] h-[min(720px,90vh)] aspect-video flex flex-col p-0 gap-0 overflow-hidden" style={{ maxHeight: 'min(720px, 90vh)', minHeight: 'min(720px, 90vh)' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/15 via-primary/10 to-accent/10 px-6 pt-5 pb-4">
            <DialogHeader className="mb-0">
              <DialogTitle className="sr-only">Quản lý quyền thành viên</DialogTitle>
            </DialogHeader>
            <div className="flex items-start gap-5">
              <UserAvatar src={member.avatar_url} name={member.full_name} size="xl"
                className="border-4 border-background shadow-xl ring-2 ring-primary/20"
                showPresence={isConnected} presenceStatus={getPresenceStatus(member.id)} />
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold truncate">{member.full_name}</h2>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <IdCard className="w-4 h-4 shrink-0" />
                  <span>{member.student_id}</span>
                  <span className="mx-1">•</span>
                  <Mail className="w-4 h-4 shrink-0" />
                  <span className="truncate">{member.email}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge variant={isAdminRole ? 'destructive' : isLeaderRole ? 'default' : 'secondary'} className="text-xs gap-1">
                    <Shield className="w-3 h-3" />
                    {currentRoleLabel}
                  </Badge>
                  <Badge variant="outline" className="text-xs gap-1">
                    <Calendar className="w-3 h-3" />
                    Tham gia {new Date(member.created_at).toLocaleDateString('vi-VN')}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Section 1: Thống kê hoạt động */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Briefcase className="w-4 h-4" /> Thống kê hoạt động
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Dự án tham gia" value={groups.length} icon={FolderKanban} />
                  <StatCard label="Dự án sở hữu" value={ownedGroups.length} icon={Crown} />
                  <StatCard label="Giới hạn project" 
                    value={isLeaderRole ? `${member.project_limit ?? DEFAULT_PROJECT_LIMIT}` : '—'} 
                    icon={Settings} />
                </div>

                {/* Projects list */}
                {groups.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Danh sách dự án</p>
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                      {groups.map(g => (
                        <div key={g.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {g.image_url ? (
                              <img src={fixStorageUrl(g.image_url) || ''} alt={g.name} className="w-8 h-8 rounded-md object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                {g.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{g.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {g.is_owner ? 'Owner' : g.role === 'project_admin' ? 'Phó nhóm' : 'Thành viên'} • {g.member_count} TV
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Truy cập dự án"
                              onClick={() => handleNavigateToProject(g.slug, g.id)}>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Truy cập ẩn danh"
                              onClick={() => handleIncognitoAccess(g.slug, g.id)}>
                              <EyeOff className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Giới hạn hệ thống + Hành động */}
              <div className="space-y-4">
                {/* Limits section - only for leaders */}
                {isLeaderRole && (
                  <>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Settings className="w-4 h-4" /> Giới hạn hệ thống
                    </h3>
                    <div className="rounded-xl border bg-card p-4 space-y-3">
                      {editingLimits ? (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Giới hạn project</Label>
                            <Input type="number" min={0} value={projectLimit}
                              onChange={e => setProjectLimit(parseInt(e.target.value) || 0)} />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => setEditingLimits(false)}>Hủy</Button>
                            <Button size="sm" onClick={handleSaveLimits} disabled={actionLoading}>
                              {actionLoading && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                              Lưu
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground">Giới hạn project</p>
                            <p className="text-lg font-bold">{member.project_limit ?? DEFAULT_PROJECT_LIMIT}</p>
                            <p className="text-xs text-muted-foreground">Đã dùng: {ownedGroups.length}</p>
                          </div>
                          <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => setEditingLimits(true)}>
                            <Settings className="w-3.5 h-3.5" /> Chỉnh sửa giới hạn
                          </Button>
                        </>
                      )}
                    </div>
                  </>
                )}

                {/* Admin Actions */}
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Hành động quản trị
                </h3>
                <div className="space-y-2">
                  {/* Promote */}
                  {isMemberRole && (
                    <Button variant="outline" className="w-full justify-start gap-2 h-11" onClick={() => setShowPromoteConfirm(true)}>
                      <ArrowUp className="w-4 h-4 text-green-600" />
                      <div className="text-left">
                        <p className="text-sm font-medium">Nâng quyền → Leader</p>
                        <p className="text-xs text-muted-foreground">Cho phép tạo project, áp dụng giới hạn mặc định</p>
                      </div>
                    </Button>
                  )}

                  {/* Demote */}
                  {isLeaderRole && (
                    <Button variant="outline" className="w-full justify-start gap-2 h-11" onClick={handleDemoteCheck}>
                      <ArrowDown className="w-4 h-4 text-orange-600" />
                      <div className="text-left">
                        <p className="text-sm font-medium">Hạ quyền → Thành viên</p>
                        <p className="text-xs text-muted-foreground">
                          {ownedGroups.length > 0
                            ? `Cần chuyển giao ${ownedGroups.length} dự án trước`
                            : 'Thu hồi quyền tạo project'}
                        </p>
                      </div>
                    </Button>
                  )}

                  {isAdminRole && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                      <p className="text-sm text-destructive font-medium flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        Không thể thay đổi quyền Admin
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Promote Confirm */}
      <AlertDialog open={showPromoteConfirm} onOpenChange={setShowPromoteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nâng quyền thành viên</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn nâng quyền <strong>{member.full_name}</strong> từ <strong>Thành viên</strong> lên <strong>Leader</strong>?
              <br /><br />
              Giới hạn mặc định sẽ được áp dụng:
              <br />• Số project: {DEFAULT_PROJECT_LIMIT}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handlePromote} disabled={actionLoading}>
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Xác nhận nâng quyền
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Demote Confirm */}
      <AlertDialog open={showDemoteConfirm} onOpenChange={setShowDemoteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hạ quyền thành viên</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn hạ quyền <strong>{member.full_name}</strong> từ <strong>Leader</strong> xuống <strong>Thành viên</strong>?
              <br /><br />
              Sau khi hạ quyền, người này sẽ không thể tạo project mới.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDemote} disabled={actionLoading} className="bg-destructive hover:bg-destructive/90">
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Xác nhận hạ quyền
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Project Transfer Dialog */}
      <ProjectTransferDialog
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
        member={member}
        ownedGroups={ownedGroups}
        onTransferComplete={handleTransferComplete}
      />
    </>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-xl border bg-card p-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <p className="text-lg font-bold leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
