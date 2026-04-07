import { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaceMembers, type WorkspaceMemberInfo } from '@/hooks/useWorkspaceMembers';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Users, UserPlus, Crown, Shield, User, MoreHorizontal, Trash2, ArrowUpDown, Mail, Loader2, Ghost, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import UserAvatar from '@/components/UserAvatar';
import { Checkbox } from '@/components/ui/checkbox';

interface GuestInfo {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  group_name: string;
  group_id: string;
  role: string;
}

type ConfirmAction = 
  | { type: 'remove'; userId: string; name: string }
  | { type: 'change_role'; userId: string; name: string; newRole: 'workspace_admin' | 'workspace_member' }
  | { type: 'bulk_remove'; userIds: string[]; count: number }
  | { type: 'bulk_role'; userIds: string[]; count: number; newRole: 'workspace_admin' | 'workspace_member' };

export default function WorkspaceMembers() {
  const { activeWorkspace, workspaceRole, isAvailable } = useWorkspace();
  const { members, isLoading, refresh, inviteMember, removeMember, changeRole } = useWorkspaceMembers();
  const { toast } = useToast();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'workspace_admin' | 'workspace_member'>('workspace_member');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [guests, setGuests] = useState<GuestInfo[]>([]);
  const [guestsLoading, setGuestsLoading] = useState(false);

  // Confirm modal
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Multi-select
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isOwner = workspaceRole === 'workspace_owner';
  const canManage = isOwner || workspaceRole === 'workspace_admin';

  // Reset selection when toggling multi-select off or switching tabs
  const toggleMultiSelect = () => {
    setMultiSelectMode(prev => !prev);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectableMembers = members.filter(m => m.role !== 'workspace_owner');
  const selectAll = () => {
    if (selectedIds.size === selectableMembers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableMembers.map(m => m.id)));
    }
  };

  const fetchGuests = useCallback(async () => {
    if (!activeWorkspace) return;
    setGuestsLoading(true);
    try {
      const { data: wsGroups } = await supabase
        .from('groups')
        .select('id, name')
        .eq('workspace_id', activeWorkspace.id);

      if (!wsGroups?.length) {
        setGuests([]);
        setGuestsLoading(false);
        return;
      }

      const groupIds = wsGroups.map(g => g.id);
      const groupNameMap = new Map(wsGroups.map(g => [g.id, g.name]));

      const { data: guestMembers } = await supabase
        .from('group_members')
        .select('user_id, group_id, role')
        .in('group_id', groupIds)
        .eq('is_guest', true);

      if (!guestMembers?.length) {
        setGuests([]);
        setGuestsLoading(false);
        return;
      }

      const userIds = [...new Set(guestMembers.map(g => g.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      const guestList: GuestInfo[] = guestMembers.map(gm => {
        const profile = profileMap.get(gm.user_id);
        return {
          user_id: gm.user_id,
          full_name: profile?.full_name || 'Unknown',
          email: profile?.email || '',
          avatar_url: profile?.avatar_url || null,
          group_name: groupNameMap.get(gm.group_id) || '',
          group_id: gm.group_id,
          role: gm.role,
        };
      });

      setGuests(guestList);
    } catch (err) {
      console.warn('Error fetching guests:', err);
    } finally {
      setGuestsLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    if (isAvailable && activeWorkspace) fetchGuests();
  }, [isAvailable, activeWorkspace, fetchGuests]);

  if (!isAvailable || !activeWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
        <Users className="w-12 h-12 opacity-30" />
        <p className="text-lg font-medium">Workspace chưa khả dụng</p>
        <p className="text-sm">Hệ thống workspace đang được thiết lập. Vui lòng quay lại sau.</p>
      </div>
    );
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setIsInviting(true);

    const result = await inviteMember(inviteEmail.trim(), inviteRole);
    if (result.success) {
      toast({ title: 'Đã gửi lời mời', description: `Lời mời đã được gửi đến ${inviteEmail}` });
      setInviteEmail('');
      setInviteDialogOpen(false);
      await refresh();
    } else {
      toast({ title: 'Lỗi', description: result.error, variant: 'destructive' });
    }
    setIsInviting(false);
  };

  // Execute confirm action
  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    setIsProcessing(true);

    try {
      if (confirmAction.type === 'remove') {
        const result = await removeMember(confirmAction.userId);
        if (result.success) {
          toast({ title: 'Đã xóa', description: `${confirmAction.name} đã bị xóa khỏi workspace.` });
        } else {
          toast({ title: 'Lỗi', description: result.error, variant: 'destructive' });
        }
      } else if (confirmAction.type === 'change_role') {
        const result = await changeRole(confirmAction.userId, confirmAction.newRole);
        const roleLabel = confirmAction.newRole === 'workspace_admin' ? 'Admin' : 'Member';
        if (result.success) {
          toast({ title: 'Đã cập nhật', description: `Vai trò của ${confirmAction.name} đã được đổi thành ${roleLabel}.` });
        } else {
          toast({ title: 'Lỗi', description: result.error, variant: 'destructive' });
        }
      } else if (confirmAction.type === 'bulk_remove') {
        let successCount = 0;
        for (const uid of confirmAction.userIds) {
          const result = await removeMember(uid);
          if (result.success) successCount++;
        }
        toast({ title: 'Hoàn tất', description: `Đã xóa ${successCount}/${confirmAction.count} thành viên.` });
        setSelectedIds(new Set());
        setMultiSelectMode(false);
      } else if (confirmAction.type === 'bulk_role') {
        let successCount = 0;
        for (const uid of confirmAction.userIds) {
          const result = await changeRole(uid, confirmAction.newRole);
          if (result.success) successCount++;
        }
        const roleLabel = confirmAction.newRole === 'workspace_admin' ? 'Admin' : 'Member';
        toast({ title: 'Hoàn tất', description: `Đã đổi vai trò ${successCount}/${confirmAction.count} thành viên thành ${roleLabel}.` });
        setSelectedIds(new Set());
        setMultiSelectMode(false);
      }
    } finally {
      setIsProcessing(false);
      setConfirmAction(null);
    }
  };

  const getConfirmTitle = () => {
    if (!confirmAction) return '';
    switch (confirmAction.type) {
      case 'remove': return 'Xóa thành viên';
      case 'change_role': return 'Thay đổi vai trò';
      case 'bulk_remove': return `Xóa ${confirmAction.count} thành viên`;
      case 'bulk_role': return `Đổi vai trò ${confirmAction.count} thành viên`;
    }
  };

  const getConfirmDescription = () => {
    if (!confirmAction) return '';
    switch (confirmAction.type) {
      case 'remove':
        return `Bạn có chắc muốn xóa "${confirmAction.name}" khỏi workspace? Thành viên này sẽ mất quyền truy cập tất cả dự án trong workspace.`;
      case 'change_role': {
        const roleLabel = confirmAction.newRole === 'workspace_admin' ? 'Admin' : 'Member';
        return `Bạn có chắc muốn đổi vai trò của "${confirmAction.name}" thành ${roleLabel}?`;
      }
      case 'bulk_remove':
        return `Bạn có chắc muốn xóa ${confirmAction.count} thành viên đã chọn khỏi workspace? Họ sẽ mất quyền truy cập tất cả dự án.`;
      case 'bulk_role': {
        const roleLabel = confirmAction.newRole === 'workspace_admin' ? 'Admin' : 'Member';
        return `Bạn có chắc muốn đổi vai trò ${confirmAction.count} thành viên đã chọn thành ${roleLabel}?`;
      }
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'workspace_owner': return <Crown className="w-3.5 h-3.5 text-amber-500" />;
      case 'workspace_admin': return <Shield className="w-3.5 h-3.5 text-blue-500" />;
      default: return <User className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'workspace_owner': return 'Owner';
      case 'workspace_admin': return 'Admin';
      case 'workspace_member': return 'Member';
      case 'workspace_guest': return 'Guest';
      default: return role;
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <Users className="w-6 h-6 text-primary" />
            Thành viên Workspace
          </h1>
          <p className="text-muted-foreground mt-1">
            Quản lý thành viên trong "{activeWorkspace.name}"
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManage && (
            <Button
              variant={multiSelectMode ? 'default' : 'outline'}
              size="sm"
              onClick={toggleMultiSelect}
            >
              <CheckSquare className="w-4 h-4 mr-1.5" />
              {multiSelectMode ? 'Tắt chọn nhiều' : 'Chọn nhiều'}
            </Button>
          )}

          {canManage && (
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Mời thành viên
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Mời vào Workspace</DialogTitle>
                  <DialogDescription>
                    Thành viên workspace sẽ tự động có quyền truy cập tất cả dự án công khai (Workspace Public).
                    Với dự án riêng tư (Private), bạn cần mời riêng trong từng dự án.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <Input
                        id="invite-email"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="email@example.com"
                        onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Vai trò</Label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'workspace_admin' | 'workspace_member')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="workspace_member">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5" />
                            <span>Member</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="workspace_admin">
                          <div className="flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5" />
                            <span>Admin</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                    ℹ️ Member: Truy cập dự án công khai, tạo dự án mới.
                    <br />
                    🛡️ Admin: Toàn bộ quyền Member + mời/xóa thành viên.
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Hủy</Button>
                  <Button onClick={handleInvite} disabled={isInviting || !inviteEmail.trim()}>
                    {isInviting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                    Gửi lời mời
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {multiSelectMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-muted/30">
          <span className="text-sm font-medium">
            Đã chọn {selectedIds.size} thành viên
          </span>
          <div className="flex-1" />
          {isOwner && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmAction({
                  type: 'bulk_role',
                  userIds: [...selectedIds],
                  count: selectedIds.size,
                  newRole: 'workspace_admin',
                })}
              >
                <Shield className="w-3.5 h-3.5 mr-1.5" />
                Nâng Admin
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmAction({
                  type: 'bulk_role',
                  userIds: [...selectedIds],
                  count: selectedIds.size,
                  newRole: 'workspace_member',
                })}
              >
                <User className="w-3.5 h-3.5 mr-1.5" />
                Hạ Member
              </Button>
            </>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmAction({
              type: 'bulk_remove',
              userIds: [...selectedIds],
              count: selectedIds.size,
            })}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Xóa
          </Button>
        </div>
      )}

      {/* Tabs: Members / Guests */}
      <Tabs defaultValue="members" onValueChange={() => { setSelectedIds(new Set()); }}>
        <TabsList>
          <TabsTrigger value="members">
            <Users className="w-3.5 h-3.5 mr-1.5" />
            Thành viên ({members.length})
          </TabsTrigger>
          <TabsTrigger value="guests">
            <Ghost className="w-3.5 h-3.5 mr-1.5" />
            Khách mời ({guests.length})
          </TabsTrigger>
        </TabsList>

        {/* Members tab */}
        <TabsContent value="members">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Users className="w-4 h-4" />
            <span>{members.length} thành viên</span>
            <span className="text-xs">/ {activeWorkspace.max_members} tối đa</span>

            {multiSelectMode && selectableMembers.length > 0 && (
              <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={selectAll}>
                {selectedIds.size === selectableMembers.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </Button>
            )}
          </div>

          <div className="rounded-xl border bg-card divide-y">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Chưa có thành viên nào.</p>
              </div>
            ) : (
              members.map((member) => {
                const isSelectable = member.role !== 'workspace_owner';
                const isSelected = selectedIds.has(member.id);

                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${
                      isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'
                    } ${multiSelectMode && isSelectable ? 'cursor-pointer' : ''}`}
                    onClick={multiSelectMode && isSelectable ? () => toggleSelect(member.id) : undefined}
                  >
                    {multiSelectMode && (
                      <Checkbox
                        checked={isSelected}
                        disabled={!isSelectable}
                        onCheckedChange={() => toggleSelect(member.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0"
                      />
                    )}

                    <UserAvatar
                      src={member.avatar_url}
                      name={member.full_name}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{member.full_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{member.email}</div>
                    </div>

                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted/50">
                      {getRoleIcon(member.role)}
                      {getRoleLabel(member.role)}
                    </div>

                    {canManage && !multiSelectMode && member.role !== 'workspace_owner' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isOwner && (
                            <>
                              <DropdownMenuItem onClick={() => setConfirmAction({
                                type: 'change_role',
                                userId: member.id,
                                name: member.full_name,
                                newRole: member.role === 'workspace_admin' ? 'workspace_member' : 'workspace_admin',
                              })}>
                                <ArrowUpDown className="w-3.5 h-3.5 mr-2" />
                                {member.role === 'workspace_admin' ? 'Hạ xuống Member' : 'Nâng lên Admin'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem
                            onClick={() => setConfirmAction({
                              type: 'remove',
                              userId: member.id,
                              name: member.full_name,
                            })}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Xóa khỏi workspace
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Guests tab */}
        <TabsContent value="guests">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Ghost className="w-4 h-4" />
            <span>{guests.length} khách mời</span>
          </div>

          <div className="rounded-xl border bg-card divide-y">
            {guestsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : guests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Ghost className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Chưa có khách mời nào.</p>
                <p className="text-xs mt-1">Khách mời là người dùng bên ngoài workspace được mời vào dự án cụ thể.</p>
              </div>
            ) : (
              guests.map((guest, idx) => (
                <div
                  key={`${guest.user_id}-${guest.group_id}-${idx}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors"
                >
                  <UserAvatar
                    src={guest.avatar_url}
                    name={guest.full_name}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{guest.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{guest.email}</div>
                  </div>

                  <div className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-muted/50 truncate max-w-[150px]">
                    📁 {guest.group_name}
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted/50">
                    <Ghost className="w-3.5 h-3.5 text-muted-foreground" />
                    Guest
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Confirm dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {getConfirmTitle()}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmDescription()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeConfirmAction}
              disabled={isProcessing}
              className={confirmAction?.type === 'remove' || confirmAction?.type === 'bulk_remove'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : ''
              }
            >
              {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
