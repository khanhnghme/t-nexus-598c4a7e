import { useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaceMembers, type WorkspaceMemberInfo } from '@/hooks/useWorkspaceMembers';
import { useToast } from '@/hooks/use-toast';
import { Building2, Users, UserPlus, Crown, Shield, User, MoreHorizontal, Trash2, ArrowUpDown, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import UserAvatar from '@/components/UserAvatar';

export default function WorkspaceMembers() {
  const { activeWorkspace, workspaceRole, isAvailable } = useWorkspace();
  const { members, isLoading, refresh, inviteMember, removeMember, changeRole } = useWorkspaceMembers();
  const { toast } = useToast();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const isOwner = workspaceRole === 'owner';
  const canManage = isOwner || workspaceRole === 'admin';

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

  const handleRemove = async (userId: string, name: string) => {
    const result = await removeMember(userId);
    if (result.success) {
      toast({ title: 'Đã xóa', description: `${name} đã bị xóa khỏi workspace.` });
    } else {
      toast({ title: 'Lỗi', description: result.error, variant: 'destructive' });
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'admin' | 'member', name: string) => {
    const result = await changeRole(userId, newRole);
    if (result.success) {
      toast({ title: 'Đã cập nhật', description: `Vai trò của ${name} đã được đổi thành ${newRole}.` });
    } else {
      toast({ title: 'Lỗi', description: result.error, variant: 'destructive' });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-3.5 h-3.5 text-amber-500" />;
      case 'admin': return <Shield className="w-3.5 h-3.5 text-blue-500" />;
      default: return <User className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Owner';
      case 'admin': return 'Admin';
      case 'member': return 'Member';
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
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'admin' | 'member')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5" />
                          <span>Member</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
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

      {/* Member count */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="w-4 h-4" />
        <span>{members.length} thành viên</span>
        <span className="text-xs">/ {activeWorkspace.max_members} tối đa</span>
      </div>

      {/* Members list */}
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
          members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors"
            >
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

              {/* Actions — only for non-owners, and only if caller can manage */}
              {canManage && member.role !== 'owner' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isOwner && (
                      <>
                        <DropdownMenuItem onClick={() => handleChangeRole(member.id, member.role === 'admin' ? 'member' : 'admin', member.full_name)}>
                          <ArrowUpDown className="w-3.5 h-3.5 mr-2" />
                          {member.role === 'admin' ? 'Hạ xuống Member' : 'Nâng lên Admin'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem
                      onClick={() => handleRemove(member.id, member.full_name)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                      Xóa khỏi workspace
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
