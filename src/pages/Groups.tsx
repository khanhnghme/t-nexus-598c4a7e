import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { fixStorageUrl } from '@/lib/urlUtils';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { r2Storage } from '@/lib/r2Storage';
import { useToast } from '@/hooks/use-toast';
import {
  FolderKanban,
  Plus,
  Users,
  ArrowRight,
  Loader2,
  Crown,
  UserPlus,
  X,
  Search,
  Info,
  Calendar,
  FileText,
  Target,
  BookOpen,
  Mail,
  GraduationCap,
  MessageSquare,
  ImagePlus,
} from 'lucide-react';
import type { Group, GroupMember } from '@/types/database';
import UserAvatar from '@/components/UserAvatar';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface MemberAvatar {
  avatar_url: string | null;
  full_name: string;
}

interface GroupWithMembers extends Group {
  memberCount: number;
  myRole: string;
  memberAvatars: MemberAvatar[];
  _imgError?: boolean;
}

interface MemberToAdd {
  id: string;
  full_name: string;
  student_id: string;
  email: string;
  avatar_url: string | null;
  institution: string | null;
}

export default function Groups() {
  const { user, isLeader, isAdmin, profile } = useAuth();
  const { activeWorkspace, isAvailable: wsAvailable, workspaceRole } = useWorkspace();
  const { toast } = useToast();
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupClassCode, setNewGroupClassCode] = useState('');
  const [newGroupInstructorName, setNewGroupInstructorName] = useState('');
  const [newGroupInstructorEmail, setNewGroupInstructorEmail] = useState('');
  const [newGroupZaloLink, setNewGroupZaloLink] = useState('');
  const [newGroupAdditionalInfo, setNewGroupAdditionalInfo] = useState('');
  const [groupImage, setGroupImage] = useState<File | null>(null);
  const [groupImagePreview, setGroupImagePreview] = useState<string | null>(null);

  // Member adding
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState<MemberToAdd[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<MemberToAdd[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, [user, activeWorkspace]);

  const fetchGroups = async () => {
    if (!user) return;

    try {
      // Get groups where user is a member
      const { data: memberData } = await supabase
        .from('group_members')
        .select('group_id, role')
        .eq('user_id', user.id);

      const groupIds = (memberData || []).map((m) => m.group_id);
      const roleMap = new Map((memberData || []).map((m) => [m.group_id, m.role]));
      const joinedSet = new Set(groupIds);

      // Get joined group details
      let joinedGroups: any[] = [];
      if (groupIds.length > 0) {
        let q = supabase
          .from('groups')
          .select('*')
          .in('id', groupIds)
          .order('created_at', { ascending: false });
        if (wsAvailable && activeWorkspace) {
          q = q.eq('workspace_id', activeWorkspace.id);
        }
        const { data } = await q;
        joinedGroups = data || [];
      }

      // If WS member, also fetch workspace_public projects user hasn't joined
      let publicGroups: any[] = [];
      if (wsAvailable && activeWorkspace && workspaceRole) {
        const { data } = await supabase
          .from('groups')
          .select('*')
          .eq('workspace_id', activeWorkspace.id)
          .in('visibility', ['workspace_public', 'public_link'])
          .order('created_at', { ascending: false });
        publicGroups = (data || []).filter(g => !joinedSet.has(g.id));
      }

      const allGroups = [...joinedGroups, ...publicGroups];

      if (allGroups.length > 0) {
        // Get member counts + avatars
        const allGroupIds = allGroups.map(g => g.id);
        const memberEntries = await Promise.all(
          allGroupIds.map(async (groupId) => {
            const { count } = await supabase
              .from('group_members')
              .select('*', { count: 'exact', head: true })
              .eq('group_id', groupId);

            const { data: members } = await supabase
              .from('group_members')
              .select('user_id')
              .eq('group_id', groupId)
              .limit(4);

            let avatars: MemberAvatar[] = [];
            if (members && members.length > 0) {
              const { data: profiles } = await supabase
                .from('profiles')
                .select('avatar_url, full_name')
                .in('id', members.map(m => m.user_id));
              avatars = (profiles || []).map(p => ({ avatar_url: p.avatar_url, full_name: p.full_name }));
            }

            return [groupId, { count: count ?? 0, avatars }] as const;
          })
        );

        const memberMap = new Map(memberEntries);

        const groupsWithMembers: GroupWithMembers[] = allGroups.map((g) => ({
          ...g,
          memberCount: memberMap.get(g.id)?.count || 0,
          myRole: roleMap.get(g.id) || (joinedSet.has(g.id) ? 'project_member' : ''),
          memberAvatars: memberMap.get(g.id)?.avatars || [],
        }));

        setGroups(groupsWithMembers);
      } else {
        setGroups([]);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchMembers = async (query: string) => {
    setMemberSearch(query);
    
    // Require at least 2 characters to search
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, student_id, email, avatar_url, institution')
        .eq('is_approved', true)
        .neq('id', user!.id)
        .or(`full_name.ilike.%${query}%,student_id.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(20);
      
      const filtered = (data || []).filter(
        (p) => !selectedMembers.some((s) => s.id === p.id)
      );
      setSearchResults(filtered);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const addMember = (member: MemberToAdd) => {
    setSelectedMembers((prev) => [...prev, member]);
    setSearchResults((prev) => prev.filter((p) => p.id !== member.id));
    setMemberSearch('');
  };

  const removeMember = (id: string) => {
    setSelectedMembers((prev) => prev.filter((p) => p.id !== id));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Lỗi', description: 'Ảnh không được vượt quá 5MB', variant: 'destructive' });
      return;
    }
    setGroupImage(file);
    setGroupImagePreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setNewGroupName('');
    setNewGroupDescription('');
    setNewGroupClassCode('');
    setNewGroupInstructorName('');
    setNewGroupInstructorEmail('');
    setNewGroupZaloLink('');
    setNewGroupAdditionalInfo('');
    setGroupImage(null);
    setGroupImagePreview(null);
    setSelectedMembers([]);
    setMemberSearch('');
    setSearchResults([]);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập tên dự án',
        variant: 'destructive',
      });
      return;
    }

    // Check project limit for non-admin users
    if (!isAdmin && profile) {
      const limit = profile.project_limit ?? 2;
      const { count } = await supabase
        .from('groups')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', user!.id);
      if (count !== null && count >= limit) {
        toast({
          title: 'Đã đạt giới hạn',
          description: `Bạn chỉ được tạo tối đa ${limit} dự án. Liên hệ Admin để tăng giới hạn.`,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsCreating(true);

    try {
      const insertData: any = {
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || null,
          class_code: newGroupClassCode.trim() || null,
          instructor_name: newGroupInstructorName.trim() || null,
          instructor_email: newGroupInstructorEmail.trim() || null,
          zalo_link: newGroupZaloLink.trim() || null,
          additional_info: newGroupAdditionalInfo.trim() || null,
          created_by: user!.id,
          slug: '',
        };

      // Auto-assign workspace_id if workspace is active
      if (wsAvailable && activeWorkspace) {
        insertData.workspace_id = activeWorkspace.id;
      }

      const { data: newGroup, error: groupError } = await supabase
        .from('groups')
        .insert(insertData)
        .select()
        .single();

      if (groupError) throw groupError;

      // Upload image if selected
      if (groupImage) {
        const ext = groupImage.name.split('.').pop();
        const filePath = `${newGroup.id}/cover.${ext}`;
        const { data: uploadData, error: uploadError } = await r2Storage
          .from('group-images')
          .upload(filePath, groupImage, { upsert: true });
        if (!uploadError && uploadData?.publicUrl) {
          await supabase.from('groups').update({ image_url: uploadData.publicUrl }).eq('id', newGroup.id);
        }
      }

      // Add creator as leader
      const { error: memberError } = await supabase.from('group_members').insert({
        group_id: newGroup.id,
        user_id: user!.id,
        role: 'project_admin',
      });
      if (memberError) throw memberError;

      // Create invitations for selected members (instead of direct add)
      if (selectedMembers.length > 0) {
        const invitations = selectedMembers.map((m) => ({
          group_id: newGroup.id,
          invited_user_id: m.id,
          invited_by: user!.id,
          role: 'project_member' as const,
          status: 'pending',
        }));
        await supabase.from('project_invitations').insert(invitations as any);

        // Send notifications
        for (const m of selectedMembers) {
          await supabase.from('notifications').insert({
            user_id: m.id,
            type: 'project_invited',
            title: '📩 Lời mời tham gia project',
            message: `${profile?.full_name || 'Leader'} đã mời bạn tham gia project "${newGroup.name}"`,
            group_id: newGroup.id,
          });
        }
      }

      toast({
        title: 'Thành công',
        description: `Đã tạo dự án "${newGroup.name}"${selectedMembers.length > 0 ? ` và gửi lời mời cho ${selectedMembers.length} thành viên` : ''}`,
      });

      setIsDialogOpen(false);
      resetForm();
      fetchGroups();
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể tạo dự án',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'project_owner':
        return <Badge className="bg-destructive/10 text-destructive">Owner</Badge>;
      case 'project_admin':
        return <Badge className="bg-warning/10 text-warning">Admin</Badge>;
      case 'project_member':
        return <Badge variant="secondary">Member</Badge>;
      default:
        return <Badge variant="outline">Guest</Badge>;
    }
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
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold">Nhóm của tôi</h1>
            <p className="text-muted-foreground mt-1">
              Quản lý các nhóm và dự án bạn tham gia
            </p>
          </div>

          {/* Create project CTA - always visible */}
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!isLeader) return;
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild disabled={!isLeader}>
              <div className={`relative overflow-hidden rounded-xl border-2 border-dashed p-5 transition-all duration-300 ${
                isLeader
                  ? 'border-primary/40 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 hover:border-primary hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.005] cursor-pointer group'
                  : 'border-muted-foreground/20 bg-muted/30 cursor-default'
              }`}>
                {isLeader && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                )}
                <div className="relative flex items-center gap-4">
                  <div className={`p-3.5 rounded-xl ${
                    isLeader ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    <Plus className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <p className={`font-bold text-lg ${isLeader ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {isLeader ? 'Tạo dự án mới' : 'Tạo dự án mới — Bạn không có quyền tạo'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {isLeader
                        ? 'Thiết lập project, thêm thành viên và bắt đầu quản lý công việc'
                        : 'Liên hệ Admin để được nâng cấp quyền Thành viên Nâng cao'}
                    </p>
                  </div>
                  {isLeader && (
                    <ArrowRight className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </div>
            </DialogTrigger>
              <DialogContent
                className="p-0 gap-0 border-0 bg-transparent shadow-none [&>button]:hidden"
                style={{ maxWidth: 'none', width: 'auto' }}
              >
                <div
                  className="bg-background border rounded-xl overflow-hidden flex flex-col"
                  style={{ width: '1280px', maxWidth: '95vw', height: '720px', maxHeight: '90vh' }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30 flex-shrink-0">
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <FolderKanban className="w-5 h-5 text-primary" />
                        Tạo dự án mới
                      </h2>
                      {wsAvailable && activeWorkspace ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="w-4 h-4 rounded bg-primary/15 text-primary flex items-center justify-center text-[9px] font-bold">
                            {activeWorkspace.name.charAt(0).toUpperCase()}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Dự án sẽ được tạo trong workspace <span className="font-semibold text-foreground">{activeWorkspace.name}</span>
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Điền thông tin dự án và thêm thành viên (tùy chọn)
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsDialogOpen(false)}>
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* Body with scroll */}
                  <ScrollArea className="flex-1">
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 divide-y lg:divide-y-0 lg:divide-x">
                      {/* Left: Project Info - 3 cols */}
                      <div className="lg:col-span-3 p-6 space-y-5">
                        <div className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wide">
                          <FileText className="w-4 h-4" />
                          Thông tin dự án
                        </div>

                        <div className="flex gap-3 items-end">
                          <div className="flex-1 space-y-2">
                            <Label htmlFor="group-name" className="flex items-center gap-1">
                              Tên dự án <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="group-name"
                              placeholder="VD: Đồ án môn học CNTT"
                              value={newGroupName}
                              onChange={(e) => setNewGroupName(e.target.value)}
                              className="text-base"
                            />
                          </div>

                          {/* Image upload - tiny inline */}
                          <label className="cursor-pointer flex-shrink-0 mb-0.5">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleImageSelect}
                            />
                            {groupImagePreview ? (
                              <div className="relative w-9 h-9 rounded-md overflow-hidden border group/img">
                                <img src={groupImagePreview} alt="Preview" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setGroupImage(null);
                                    setGroupImagePreview(null);
                                  }}
                                  className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                  <X className="w-3 h-3 text-white" />
                                </button>
                              </div>
                            ) : (
                              <div className="w-9 h-9 rounded-md border border-dashed border-muted-foreground/40 hover:border-primary/60 transition-colors flex items-center justify-center text-muted-foreground hover:text-primary" title="Tải ảnh bìa">
                                <ImagePlus className="w-4 h-4" />
                              </div>
                            )}
                          </label>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="group-description" className="flex items-center gap-1">
                            <Target className="w-3.5 h-3.5" />
                            Mô tả / Mục tiêu
                          </Label>
                          <Textarea
                            id="group-description"
                            placeholder="Mô tả chi tiết về dự án, mục tiêu cần đạt..."
                            value={newGroupDescription}
                            onChange={(e) => setNewGroupDescription(e.target.value)}
                            rows={3}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="flex items-center gap-1">
                              <BookOpen className="w-3.5 h-3.5" />
                              Mã lớp
                            </Label>
                            <Input
                              placeholder="VD: 24C1INF50900301"
                              value={newGroupClassCode}
                              onChange={(e) => setNewGroupClassCode(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="flex items-center gap-1">
                              <GraduationCap className="w-3.5 h-3.5" />
                              Giảng viên
                            </Label>
                            <Input
                              placeholder="VD: Nguyễn Văn A"
                              value={newGroupInstructorName}
                              onChange={(e) => setNewGroupInstructorName(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5" />
                              Email giảng viên
                            </Label>
                            <Input
                              type="email"
                              placeholder="gv@example.com"
                              value={newGroupInstructorEmail}
                              onChange={(e) => setNewGroupInstructorEmail(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5" />
                              Link Zalo nhóm
                            </Label>
                            <Input
                              placeholder="https://zalo.me/..."
                              value={newGroupZaloLink}
                              onChange={(e) => setNewGroupZaloLink(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            <Info className="w-3.5 h-3.5" />
                            Ghi chú thêm
                          </Label>
                          <Textarea
                            placeholder="Thông tin bổ sung, lưu ý đặc biệt..."
                            value={newGroupAdditionalInfo}
                            onChange={(e) => setNewGroupAdditionalInfo(e.target.value)}
                            rows={2}
                          />
                        </div>
                      </div>

                      {/* Right: Members - 2 cols */}
                      <div className="lg:col-span-2 p-6 flex flex-col min-h-0" style={{ maxHeight: 'calc(720px - 140px)' }}>
                        <div className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wide flex-shrink-0">
                          <UserPlus className="w-4 h-4" />
                          Thêm thành viên
                          <Badge variant="secondary" className="ml-auto text-xs">
                            Tùy chọn
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground mt-2 flex-shrink-0">
                          Chọn thành viên để thêm vào dự án. Có thể thêm sau khi tạo.
                        </p>

                        {/* Search */}
                        <div className="relative mt-3 flex-shrink-0">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                          <Input
                            placeholder="Nhập tên hoặc MSSV để tìm kiếm..."
                            value={memberSearch}
                            onChange={(e) => handleSearchMembers(e.target.value)}
                            className="pl-9 h-11 border-2 border-primary/30 focus-visible:border-primary focus-visible:ring-primary/20 bg-primary/5 placeholder:text-muted-foreground/70 font-medium"
                          />
                          {isSearching && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
                          )}
                        </div>

                        {/* Available members list - fills remaining space */}
                        <div className="flex-1 min-h-0 mt-3 border rounded-lg overflow-y-auto">
                          {searchResults.length > 0 ? (
                            searchResults.map((p) => {
                              const isSelected = selectedMembers.some(s => s.id === p.id);
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => !isSelected && addMember(p)}
                                  disabled={isSelected}
                                  className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left text-sm border-b last:border-b-0",
                                    isSelected ? 'bg-primary/5 opacity-50 cursor-not-allowed' : 'hover:bg-muted/50 cursor-pointer'
                                  )}
                                >
                                  <UserAvatar src={p.avatar_url} name={p.full_name} size="md" />
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium truncate">{p.full_name}</div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {p.institution ? <span className="text-primary/70 font-medium">{p.institution}</span> : null}
                                      {p.institution ? ' • ' : ''}MSSV: {p.student_id}
                                    </div>
                                    <div className="text-xs text-muted-foreground/70 truncate">{p.email}</div>
                                  </div>
                                  {isSelected ? (
                                    <Badge variant="secondary" className="text-xs flex-shrink-0">Đã chọn</Badge>
                                  ) : (
                                    <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                                  )}
                                </button>
                              );
                            })
                          ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                              <Search className="w-10 h-10 mb-2 opacity-30" />
                              <p className="text-sm">{memberSearch && memberSearch.length >= 2 ? 'Không tìm thấy' : 'Nhập tên hoặc MSSV để tìm kiếm'}</p>
                              {!memberSearch && <p className="text-xs mt-1">Nhập ít nhất 2 ký tự</p>}
                            </div>
                          )}
                        </div>

                        {/* Selected members - compact */}
                        {selectedMembers.length > 0 && (
                          <div className="mt-3 flex-shrink-0">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-medium">
                                Đã chọn ({selectedMembers.length})
                              </span>
                              <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={() => setSelectedMembers([])}>
                                Xóa tất cả
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedMembers.map((m) => (
                                <Badge key={m.id} variant="secondary" className="gap-1 pr-1">
                                  {m.full_name}
                                  <button onClick={() => removeMember(m.id)} className="ml-0.5 hover:text-destructive">
                                    <X className="w-3 h-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </ScrollArea>

                  {/* Footer */}
                  <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30 flex-shrink-0">
                    <p className="text-xs text-muted-foreground">
                      <span className="text-destructive">*</span> Chỉ tên dự án là bắt buộc, các trường còn lại có thể bổ sung sau.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Hủy
                      </Button>
                      <Button onClick={handleCreateGroup} disabled={isCreating || !newGroupName.trim()}>
                        {isCreating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Đang tạo...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Tạo dự án
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
        </div>

        {/* Groups List */}
        {groups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FolderKanban className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Chưa có nhóm nào</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {isLeader
                  ? 'Bạn chưa tham gia hoặc tạo nhóm nào. Hãy tạo nhóm mới để bắt đầu!'
                  : 'Bạn chưa được thêm vào nhóm nào. Hãy chờ Leader thêm bạn vào nhóm.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {groups.map((group, index) => {
              // Generate a unique gradient per card based on index
              const gradients = [
                'from-[hsl(183,100%,21%)] via-[hsl(183,58%,30%)] to-[hsl(200,80%,35%)]',
                'from-[hsl(18,88%,48%)] via-[hsl(30,85%,50%)] to-[hsl(45,90%,55%)]',
                'from-[hsl(183,80%,25%)] via-[hsl(160,60%,35%)] to-[hsl(140,50%,40%)]',
                'from-[hsl(250,60%,50%)] via-[hsl(280,50%,45%)] to-[hsl(310,55%,50%)]',
                'from-[hsl(18,88%,58%)] via-[hsl(183,70%,30%)] to-[hsl(183,100%,21%)]',
                'from-[hsl(200,70%,40%)] via-[hsl(220,60%,50%)] to-[hsl(250,50%,55%)]',
              ];
              const gradient = gradients[index % gradients.length];

              return (
                <Link key={group.id} to={`/p/${group.slug}`}>
                  <div className="group relative h-full rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/20 bg-card border border-border shadow-md shadow-black/5 hover:border-primary/40">
                    {/* Decorative top accent bar */}
                    <div className={`h-1 bg-gradient-to-r ${gradient}`} />

                    {/* Cover Section - taller */}
                    <div className="relative h-52 overflow-hidden">
                      {group.image_url && !group._imgError ? (
                        <img
                          src={fixStorageUrl(group.image_url) || ''}
                          alt={group.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                          onError={() => setGroups(prev => prev.map(g => g.id === group.id ? { ...g, _imgError: true } : g))}
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${gradient} opacity-90`}>
                          {/* Decorative pattern */}
                          <div className="absolute inset-0 opacity-10">
                            <div className="absolute top-4 right-4 w-24 h-24 rounded-full border-2 border-white/30" />
                            <div className="absolute bottom-2 left-6 w-16 h-16 rounded-full border border-white/20" />
                            <div className="absolute top-8 left-1/2 w-8 h-8 rounded-full bg-white/10" />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <FolderKanban className="w-14 h-14 text-white/30" />
                          </div>
                        </div>
                      )}
                      {/* Strong gradient overlay for text readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                      {/* Visibility badge */}
                      <div className="absolute top-3 left-3 drop-shadow-md">
                        {group.visibility === 'workspace_public' ? (
                          <Badge className="bg-blue-500/90 text-white shadow-lg text-[10px] px-1.5 py-0.5">🌐 WS Public</Badge>
                        ) : group.visibility === 'public_link' ? (
                          <Badge className="bg-green-500/90 text-white shadow-lg text-[10px] px-1.5 py-0.5">🌍 Public</Badge>
                        ) : (
                          <Badge className="bg-black/60 text-white shadow-lg text-[10px] px-1.5 py-0.5">🔒 Private</Badge>
                        )}
                      </div>

                      {/* Role badge */}
                      <div className="absolute top-3 right-3 drop-shadow-md">
                        {!group.myRole ? (
                          <Badge className="bg-muted text-muted-foreground shadow-lg font-medium text-[10px]">
                            Chưa tham gia
                          </Badge>
                        ) : group.myRole === 'workspace_admin' ? (
                          <Badge className="bg-destructive text-destructive-foreground shadow-lg font-semibold">
                            <Crown className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        ) : user?.id === group.created_by ? (
                          <Badge className="bg-accent text-accent-foreground shadow-lg font-semibold">
                            <Crown className="w-3 h-3 mr-1" />
                            Trưởng nhóm
                          </Badge>
                        ) : group.myRole === 'project_admin' ? (
                          <Badge className="bg-warning text-warning-foreground shadow-lg font-semibold">
                            <Crown className="w-3 h-3 mr-1" />
                            Phó nhóm
                          </Badge>
                        ) : (
                          <Badge className="bg-foreground text-background shadow-lg font-medium">
                            Thành viên
                          </Badge>
                        )}
                      </div>

                      {/* Title + member count overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="text-lg font-bold text-white line-clamp-2 drop-shadow-md leading-tight">
                          {group.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <div className="flex -space-x-2">
                            {group.memberAvatars.slice(0, 4).map((m, i) => (
                              <UserAvatar key={i} src={m.avatar_url} name={m.full_name} size="sm" className="w-6 h-6 border-2 border-white/60 shadow-sm" />
                            ))}
                          </div>
                          <span className="text-xs text-white/80 font-medium ml-1">
                            {group.memberCount} thành viên
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      {/* Description */}
                      {group.description ? (
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {group.description}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground/50 italic">Chưa có mô tả</p>
                      )}

                      {/* Info chips with color */}
                      <div className="flex flex-wrap gap-2">
                        {group.class_code && (
                          <div className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                            <BookOpen className="w-3 h-3" />
                            {group.class_code}
                          </div>
                        )}
                        {group.instructor_name && (
                          <div className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent font-medium">
                            <GraduationCap className="w-3 h-3" />
                            {group.instructor_name}
                          </div>
                        )}
                      </div>

                      {/* Footer with date and arrow */}
                      <div className="flex items-center justify-between pt-3 border-t border-border/40">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {new Date(group.created_at).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          Mở dự án
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}