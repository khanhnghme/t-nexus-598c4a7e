import { useState, useMemo, useEffect, useRef } from 'react';
import leaveGroupIllustration from '@/assets/leave-group-illustration.png';
import { useNavigate } from 'react-router-dom';
import { deleteWithUndo } from '@/lib/deleteWithUndo';
import { logActivity } from '@/lib/activityLogger';
import { notifyProjectInvitation } from '@/lib/notifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Users, 
  MoreVertical, 
  Trash2, 
  Crown, 
  Loader2, 
  UserPlus, 
  Search,
  Shield,
  UserCheck,
  Download,
  Upload,
  Eye,
  CheckSquare,
  X,
  LogOut,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { exportMembersToExcel, getRoleDisplayName } from '@/lib/excelExport';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/UserAvatar';
import ProfileViewDialog from '@/components/ProfileViewDialog';
import { useUserPresence } from '@/hooks/useUserPresence';
import ExcelMemberImport, { type ParsedRow, type ExcelImportAction, type ImportValidation } from '@/components/ExcelMemberImport';
import type { GroupMember, Profile } from '@/types/database';

interface MemberManagementCardProps {
  members: GroupMember[];
  isLeaderInGroup: boolean;
  isGroupCreator: boolean; // true if current user is group creator or admin
  groupId: string;
  currentUserId: string;
  groupCreatorId: string;
  onRefresh: () => void;
}

export default function MemberManagementCard({
  members,
  isLeaderInGroup,
  isGroupCreator,
  groupId,
  currentUserId,
  groupCreatorId,
  onRefresh,
}: MemberManagementCardProps) {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { getPresenceStatus } = useUserPresence('system-global');
  const [memberToDelete, setMemberToDelete] = useState<GroupMember | null>(null);
  const [memberToChangeRole, setMemberToChangeRole] = useState<GroupMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isChangingRole, setIsChangingRole] = useState(false);
  
  // Leave project state
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveCountdown, setLeaveCountdown] = useState(15);
  const [leaveCountdownActive, setLeaveCountdownActive] = useState(false);
  
  // Add member dialog - Multi-select from system members
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [selectedRole, setSelectedRole] = useState<'member' | 'leader'>('member');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearchingProfiles, setIsSearchingProfiles] = useState(false);




  // New role for change role dialog
  const [newRole, setNewRole] = useState<'member' | 'leader'>('member');

  // Profile view dialog
  const [profileToView, setProfileToView] = useState<Profile | null>(null);
  const [profileViewRole, setProfileViewRole] = useState<'owner_system' | 'leader' | 'member'>('member');
  const [profileViewIsCreator, setProfileViewIsCreator] = useState(false);

  // Unified multi-select state (works across all tabs)
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [expandedMobileMemberId, setExpandedMobileMemberId] = useState<string | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [bulkMemberAction, setBulkMemberAction] = useState<'delete' | 'role' | null>(null);
  const [bulkRole, setBulkRole] = useState<'member' | 'leader'>('member');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);

  // Multi-select for invitations tab (shared isMultiSelectMode)
  const [selectedInvitationIds, setSelectedInvitationIds] = useState<Set<string>>(new Set());

  // Multi-select for join-requests tab (shared isMultiSelectMode)
  const [selectedJoinRequestIds, setSelectedJoinRequestIds] = useState<Set<string>>(new Set());
  const [isBulkJoinProcessing, setIsBulkJoinProcessing] = useState(false);
  // Pending invitations state
  interface PendingInvitation {
    id: string;
    group_id: string;
    invited_user_id: string;
    invited_by: string;
    role: string;
    status: string;
    created_at: string;
    profiles?: { full_name: string; student_id: string; email: string; avatar_url: string | null; institution?: string | null } | null;
  }
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);

  // Fetch pending invitations for this group
  useEffect(() => {
    const fetchPendingInvitations = async () => {
      const { data } = await supabase
        .from('project_invitations')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (data) {
        const userIds = data.map(d => d.invited_user_id);
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, student_id, email, avatar_url, institution')
            .in('id', userIds);
          const profileMap = new Map((profiles || []).map(p => [p.id, p]));
          setPendingInvitations(data.map(d => ({
            ...d,
            profiles: profileMap.get(d.invited_user_id) || null,
          })));
        } else {
          setPendingInvitations([]);
        }
      }
    };
    fetchPendingInvitations();
  }, [groupId, members]);

  const handleCancelInvitation = async (invitationId: string) => {
    const { error } = await supabase
      .from('project_invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId);
    if (error) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Đã hủy lời mời' });
      setPendingInvitations(prev => prev.filter(p => p.id !== invitationId));
    }
  };

  // Pending join-by-code approval requests
  interface JoinRequest {
    id: string;
    group_id: string;
    user_id: string;
    status: string;
    created_at: string;
    profiles?: { full_name: string; student_id: string; email: string; avatar_url: string | null; institution?: string | null } | null;
  }
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [processingJoinRequest, setProcessingJoinRequest] = useState<string | null>(null);

  useEffect(() => {
    const fetchJoinRequests = async () => {
      const { data } = await supabase
        .from('pending_approvals')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        const userIds = data.map(d => d.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, student_id, email, avatar_url, institution')
          .in('id', userIds);
        const profileMap = new Map((profiles || []).map(p => [p.id, p]));
        setJoinRequests(data.map(d => ({
          ...d,
          profiles: profileMap.get(d.user_id) || null,
        })));
      } else {
        setJoinRequests([]);
      }
    };
    fetchJoinRequests();
  }, [groupId, members]);

  const handleApproveJoinRequest = async (request: JoinRequest) => {
    setProcessingJoinRequest(request.id);
    try {
      // Update pending_approvals status
      const { error: updateError } = await supabase
        .from('pending_approvals')
        .update({ status: 'approved', processed_by: currentUserId, processed_at: new Date().toISOString() })
        .eq('id', request.id);
      if (updateError) throw updateError;

      // Insert into group_members
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({ group_id: request.group_id, user_id: request.user_id, role: 'member' });
      if (memberError) throw memberError;

      if (user && profile) {
        await logActivity({
          userId: user.id,
          userName: profile.full_name,
          action: 'APPROVE_JOIN_REQUEST',
          actionType: 'member',
          description: `Duyệt yêu cầu tham gia của ${request.profiles?.full_name || 'người dùng'}`,
          groupId,
        });
      }

      toast({ title: 'Đã duyệt', description: `${request.profiles?.full_name || 'Người dùng'} đã được thêm vào project` });
      setJoinRequests(prev => prev.filter(r => r.id !== request.id));
      onRefresh();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setProcessingJoinRequest(null);
    }
  };

  const handleRejectJoinRequest = async (request: JoinRequest) => {
    setProcessingJoinRequest(request.id);
    try {
      const { error } = await supabase
        .from('pending_approvals')
        .update({ status: 'rejected', processed_by: currentUserId, processed_at: new Date().toISOString() })
        .eq('id', request.id);
      if (error) throw error;

      toast({ title: 'Đã từ chối yêu cầu' });
      setJoinRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setProcessingJoinRequest(null);
    }
  };

  // Bulk cancel invitations
  const handleBulkCancelInvitations = async () => {
    if (selectedInvitationIds.size === 0) return;
    const count = selectedInvitationIds.size;
    const saved = [...pendingInvitations];
    setPendingInvitations(prev => prev.filter(p => !selectedInvitationIds.has(p.id)));
    setSelectedInvitationIds(new Set());

    deleteWithUndo({
      description: `Đã hủy ${count} lời mời`,
      onDelete: async () => {
        for (const id of selectedInvitationIds) {
          await supabase.from('project_invitations').update({ status: 'cancelled' }).eq('id', id);
        }
      },
      onUndo: () => setPendingInvitations(saved),
    });
  };

  // Bulk approve join requests
  const handleBulkApproveJoinRequests = async () => {
    if (selectedJoinRequestIds.size === 0) return;
    setIsBulkJoinProcessing(true);
    try {
      const selected = joinRequests.filter(r => selectedJoinRequestIds.has(r.id));
      for (const req of selected) {
        await supabase.from('pending_approvals')
          .update({ status: 'approved', processed_by: currentUserId, processed_at: new Date().toISOString() })
          .eq('id', req.id);
        await supabase.from('group_members')
          .insert({ group_id: req.group_id, user_id: req.user_id, role: 'member' });
      }
      toast({ title: 'Thành công', description: `Đã duyệt ${selected.length} yêu cầu` });
      setJoinRequests(prev => prev.filter(r => !selectedJoinRequestIds.has(r.id)));
      setSelectedJoinRequestIds(new Set());
      onRefresh();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setIsBulkJoinProcessing(false);
    }
  };

  // Bulk reject join requests
  const handleBulkRejectJoinRequests = async () => {
    if (selectedJoinRequestIds.size === 0) return;
    setIsBulkJoinProcessing(true);
    try {
      for (const id of selectedJoinRequestIds) {
        await supabase.from('pending_approvals')
          .update({ status: 'rejected', processed_by: currentUserId, processed_at: new Date().toISOString() })
          .eq('id', id);
      }
      toast({ title: 'Đã từ chối', description: `Đã từ chối ${selectedJoinRequestIds.size} yêu cầu` });
      setJoinRequests(prev => prev.filter(r => !selectedJoinRequestIds.has(r.id)));
      setSelectedJoinRequestIds(new Set());
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setIsBulkJoinProcessing(false);
    }
  };

  // Calculate if current user can leave project
  const currentUserMember = useMemo(() => members.find(m => m.user_id === currentUserId), [members, currentUserId]);

  // Fetch task count for this group
  const [groupTaskCount, setGroupTaskCount] = useState<number | null>(null);
  useEffect(() => {
    const fetchTaskCount = async () => {
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId);
      setGroupTaskCount(count ?? 0);
    };
    fetchTaskCount();
  }, [groupId]);

  const hasNoTasks = groupTaskCount === 0;
  
  const leaveInfo = useMemo(() => {
    if (!currentUserMember) return { canLeave: false, hoursLeft: 0, isCreator: false, hasNoTasks: false, joinedAt: '' };
    
    const isCreator = currentUserMember.user_id === groupCreatorId;
    if (isCreator) return { canLeave: false, hoursLeft: 0, isCreator: true, hasNoTasks, joinedAt: currentUserMember.joined_at };
    
    // If project has no tasks, member can leave anytime
    if (hasNoTasks) return { canLeave: true, hoursLeft: Infinity, isCreator: false, hasNoTasks: true, joinedAt: currentUserMember.joined_at };
    
    // Project has tasks → 48h window from join
    const joinedAt = new Date(currentUserMember.joined_at);
    const now = new Date();
    const hoursElapsed = (now.getTime() - joinedAt.getTime()) / (1000 * 60 * 60);
    const hoursLeft = Math.max(0, 48 - hoursElapsed);
    const canLeave = hoursLeft > 0;
    
    return { canLeave, hoursLeft, isCreator: false, hasNoTasks: false, joinedAt: currentUserMember.joined_at };
  }, [currentUserMember, groupCreatorId, hasNoTasks]);

  // Countdown timer for leave dialog
  useEffect(() => {
    if (!isLeaveDialogOpen) {
      setLeaveCountdown(15);
      setLeaveCountdownActive(false);
      return;
    }
    setLeaveCountdown(15);
    setLeaveCountdownActive(true);
  }, [isLeaveDialogOpen]);

  useEffect(() => {
    if (!leaveCountdownActive || leaveCountdown <= 0) return;
    const timer = setTimeout(() => setLeaveCountdown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [leaveCountdownActive, leaveCountdown]);


  const getRoleBadge = (role: string, memberId?: string) => {
    // Check if this member is the group creator (Trưởng nhóm)
    const isCreator = memberId ? memberId === groupCreatorId : false;
    
    if (isCreator) {
      return <Badge className="bg-warning/10 text-warning text-xs gap-1"><Crown className="w-3 h-3" />Trưởng nhóm</Badge>;
    }
    
    switch (role) {
      case 'owner_system':
        return <Badge className="bg-destructive/10 text-destructive text-xs gap-1"><Shield className="w-3 h-3" />Admin</Badge>;
      case 'leader':
        return <Badge className="bg-primary/10 text-primary text-xs gap-1"><Crown className="w-3 h-3" />Phó nhóm</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs gap-1"><UserCheck className="w-3 h-3" />Thành viên</Badge>;
    }
  };

  const isMemberGroupCreator = (memberId: string) => memberId === groupCreatorId;
  const canManageProjectRoles = currentUserId === groupCreatorId;

  const canDeleteMember = (member: GroupMember) => {
    if (member.user_id === currentUserId) return false;
    if (isMemberGroupCreator(member.user_id)) return false;
    // Phó nhóm can only remove regular members, not other Phó nhóm
    if (!isGroupCreator && member.role === 'leader') return false;
    return isLeaderInGroup;
  };

  const canChangeRole = (member: GroupMember) => {
    if (isMemberGroupCreator(member.user_id)) return false;
    // Only group creator (Trưởng nhóm) can change roles, not Phó nhóm
    return canManageProjectRoles;
  };

  const resetAddForm = () => {
    setSelectedUserIds(new Set());
    setSelectedRole('member');
    setSearchQuery('');
    setSearchResults([]);
  };

  // Search profiles from API when query changes
  const handleSearchProfiles = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearchingProfiles(true);
    try {
      const memberUserIds = members.map(m => m.user_id);
      const pendingUserIds = pendingInvitations.map(p => p.invited_user_id);
      const excludeIds = [...memberUserIds, ...pendingUserIds, currentUserId];

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_approved', true)
        .or(`full_name.ilike.%${query}%,student_id.ilike.%${query}%,email.ilike.%${query}%`)
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .limit(20);
      
      setSearchResults(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingProfiles(false);
    }
  };

  const filteredProfiles = searchResults;

  const handleAddMember = async () => {
    if (selectedUserIds.size === 0) {
      toast({ title: 'Lỗi', description: 'Vui lòng chọn ít nhất một thành viên', variant: 'destructive' });
      return;
    }
    setIsAddingMember(true);

    const finalRole = canManageProjectRoles ? selectedRole : 'member';

    try {
      // Fetch group name for notification
      const { data: groupData } = await supabase.from('groups').select('name').eq('id', groupId).single();
      const groupName = groupData?.name || 'Project';

      const invitations = Array.from(selectedUserIds).map(uid => ({
        group_id: groupId,
        invited_user_id: uid,
        invited_by: user!.id,
        role: finalRole,
        status: 'pending',
      }));

      const { error } = await supabase.from('project_invitations').insert(invitations);

      if (error) {
        if (error.code === '23505') throw new Error('Một số thành viên đã có lời mời đang chờ');
        throw error;
      }

      // Send notifications
      for (const uid of selectedUserIds) {
        const p = searchResults.find(ap => ap.id === uid);
        await notifyProjectInvitation({
          invitedUserId: uid,
          inviterName: profile?.full_name || 'Leader',
          groupName,
          groupId,
        });
      }

      const addedNames = Array.from(selectedUserIds)
        .map(uid => searchResults.find(p => p.id === uid)?.full_name)
        .filter(Boolean);

      await logActivity({
        userId: user!.id,
        userName: profile?.full_name || user?.email || 'Unknown',
        action: 'INVITE_MEMBER_TO_PROJECT',
        actionType: 'member',
        description: `Gửi lời mời tham gia project cho ${selectedUserIds.size} người: ${addedNames.join(', ')}`,
        groupId: groupId,
        metadata: { 
          invited_user_ids: Array.from(selectedUserIds),
          role: finalRole 
        }
      });

      toast({ title: 'Thành công', description: `Đã gửi lời mời cho ${selectedUserIds.size} thành viên` });
      setIsAddDialogOpen(false);
      resetAddForm();
      onRefresh();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setIsAddingMember(false);
    }
  };



  const handleChangeRole = async () => {
    if (!memberToChangeRole) return;
    setIsChangingRole(true);

    try {
      const { error } = await supabase
        .from('group_members')
        .update({ role: newRole })
        .eq('id', memberToChangeRole.id);

      if (error) throw error;

      // Log activity
      await logActivity({
        userId: user!.id,
        userName: profile?.full_name || user?.email || 'Unknown',
        action: 'CHANGE_MEMBER_ROLE',
        actionType: 'member',
        description: `Đổi vai trò của ${memberToChangeRole.profiles?.full_name} thành ${newRole === 'leader' ? 'Phó nhóm' : 'Thành viên'}`,
        groupId: groupId,
        metadata: { 
          member_id: memberToChangeRole.user_id,
          old_role: memberToChangeRole.role,
          new_role: newRole
        }
      });

      toast({ 
        title: 'Thành công', 
        description: `Đã đổi vai trò của ${memberToChangeRole.profiles?.full_name} thành ${newRole === 'leader' ? 'Phó nhóm' : 'Thành viên'}` 
      });
      setMemberToChangeRole(null);
      onRefresh();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setIsChangingRole(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    const memberRef = memberToDelete;
    setMemberToDelete(null);

    deleteWithUndo({
      description: `Đã xóa ${memberRef.profiles?.full_name} khỏi project`,
      onDelete: async () => {
        const { data: tasksData } = await supabase.from('tasks').select('id').eq('group_id', groupId);
        if (tasksData && tasksData.length > 0) {
          await supabase.from('task_assignments').delete()
            .eq('user_id', memberRef.user_id)
            .in('task_id', tasksData.map(t => t.id));
        }
        const { error } = await supabase.from('group_members').delete().eq('id', memberRef.id);
        if (error) throw error;

        await logActivity({
          userId: user!.id,
          userName: profile?.full_name || user?.email || 'Unknown',
          action: 'REMOVE_MEMBER_FROM_PROJECT',
          actionType: 'member',
          description: `Xóa ${memberRef.profiles?.full_name} khỏi project`,
          groupId: groupId,
          metadata: { removed_user_id: memberRef.user_id, removed_user_name: memberRef.profiles?.full_name }
        });

        onRefresh();
      },
      onUndo: () => {
        onRefresh();
      },
    });
  };

  const openChangeRoleDialog = (member: GroupMember) => {
    setMemberToChangeRole(member);
    setNewRole(member.role === 'leader' ? 'member' : 'leader');
  };

  // Multi-select helpers
  const toggleMemberSelect = (memberId: string) => {
    setSelectedMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const selectableMembers = members.filter(m => !isMemberGroupCreator(m.user_id) && m.user_id !== currentUserId);

  const selectAllMembers = () => {
    setSelectedMemberIds(new Set(selectableMembers.map(m => m.id)));
  };

  const clearAllSelections = () => {
    setSelectedMemberIds(new Set());
    setSelectedInvitationIds(new Set());
    setSelectedJoinRequestIds(new Set());
    setIsMultiSelectMode(false);
  };

  // Bulk delete members
  const handleBulkDeleteMembers = async () => {
    if (selectedMemberIds.size === 0) return;
    const selectedMembers = members.filter(m => selectedMemberIds.has(m.id) && canDeleteMember(m));
    const count = selectedMembers.length;
    clearAllSelections();
    setBulkMemberAction(null);

    deleteWithUndo({
      description: `Đã xóa ${count} thành viên khỏi project`,
      onDelete: async () => {
        for (const member of selectedMembers) {
          const { data: tasksData } = await supabase.from('tasks').select('id').eq('group_id', groupId);
          if (tasksData && tasksData.length > 0) {
            await supabase.from('task_assignments').delete()
              .eq('user_id', member.user_id)
              .in('task_id', tasksData.map(t => t.id));
          }
          await supabase.from('group_members').delete().eq('id', member.id);
        }
        onRefresh();
      },
      onUndo: () => {
        onRefresh();
      },
    });
  };

  // Bulk change role
  const handleBulkChangeRole = async () => {
    if (selectedMemberIds.size === 0) return;
    setIsBulkProcessing(true);
    try {
      for (const memberId of selectedMemberIds) {
        await supabase.from('group_members').update({ role: bulkRole }).eq('id', memberId);
      }
      toast({ title: 'Thành công', description: `Đã đổi vai trò ${selectedMemberIds.size} thành viên thành ${bulkRole === 'leader' ? 'Phó nhóm' : 'Thành viên'}` });
      clearAllSelections();
      onRefresh();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setIsBulkProcessing(false);
      setBulkMemberAction(null);
    }
  };

  // Handle leave project
  const handleLeaveProject = async () => {
    if (!currentUserMember || !leaveInfo.canLeave) return;
    setIsLeaving(true);
    
    try {
      // Delete task assignments first
      const { data: tasksData } = await supabase.from('tasks').select('id').eq('group_id', groupId);
      if (tasksData && tasksData.length > 0) {
        await supabase.from('task_assignments').delete()
          .eq('user_id', currentUserId)
          .in('task_id', tasksData.map(t => t.id));
      }
      
      // Delete group membership
      const { error } = await supabase.from('group_members').delete().eq('id', currentUserMember.id);
      if (error) throw error;
      
      // Log activity
      await logActivity({
        userId: user!.id,
        userName: profile?.full_name || user?.email || 'Unknown',
        action: 'LEAVE_PROJECT',
        actionType: 'member',
        description: `${profile?.full_name || 'Thành viên'} đã rời khỏi project`,
        groupId,
        metadata: { left_user_id: currentUserId }
      });
      
      toast({ title: 'Đã rời project', description: 'Bạn đã rời khỏi project thành công' });
      setIsLeaveDialogOpen(false);
      navigate('/dashboard');
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setIsLeaving(false);
    }
  };

  // Format hours left for display
  const formatHoursLeft = (hours: number) => {
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.floor(hours % 24);
      return `${days} ngày ${remainingHours} giờ`;
    }
    return `${Math.floor(hours)} giờ`;
  };

  const [memberTab, setMemberTab] = useState('members');

  // Clear selections when switching tabs
  const handleTabChange = (tab: string) => {
    setSelectedMemberIds(new Set());
    setSelectedInvitationIds(new Set());
    setSelectedJoinRequestIds(new Set());
    setMemberTab(tab);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Thành viên Project ({members.length})
            </CardTitle>
            {isLeaderInGroup && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant={isMultiSelectMode ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    if (isMultiSelectMode) clearAllSelections();
                    else setIsMultiSelectMode(true);
                  }}
                >
                  <CheckSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">{isMultiSelectMode ? 'Hủy chọn' : 'Chọn nhiều'}</span>
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => {
                    const exportData = members.map(m => ({
                      fullName: m.profiles?.full_name || '',
                      studentId: m.profiles?.student_id || '',
                      email: m.profiles?.email || '',
                      role: getRoleDisplayName(m.role, m.user_id === groupCreatorId)
                    }));
                    exportMembersToExcel(exportData, `danh-sach-thanh-vien-project`);
                  }}
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Xuất Excel</span>
                </Button>
                <Button onClick={() => setIsExcelImportOpen(true)} size="sm" variant="outline" className="gap-2">
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Import</span>
                </Button>


                <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Thêm từ hệ thống
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={memberTab} onValueChange={handleTabChange}>
            <TabsList className="w-full mb-4">
              <TabsTrigger value="members" className="flex-1 gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                Thành viên
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{members.length}</Badge>
              </TabsTrigger>
              {pendingInvitations.length > 0 && (
                <TabsTrigger value="invitations" className="flex-1 gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Chờ chấp nhận
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/20 text-primary">{pendingInvitations.length}</Badge>
                </TabsTrigger>
              )}
              {joinRequests.length > 0 && (
                <TabsTrigger value="join-requests" className="flex-1 gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Chờ duyệt
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-warning/20 text-warning">{joinRequests.length}</Badge>
                </TabsTrigger>
              )}
            </TabsList>

            {/* Tab: Thành viên chính thức */}
            <TabsContent value="members">
              {/* Multi-select bulk action bar */}
              {isMultiSelectMode && (
                <div className="mb-3 flex flex-wrap items-center gap-2 p-2.5 rounded-lg border bg-muted/50">
                  <Checkbox
                    checked={selectedMemberIds.size === selectableMembers.length && selectableMembers.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) selectAllMembers();
                      else setSelectedMemberIds(new Set());
                    }}
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    {selectedMemberIds.size > 0 ? `Đã chọn ${selectedMemberIds.size} thành viên` : 'Chọn tất cả'}
                  </span>
                  
                  {selectedMemberIds.size > 0 && (
                    <>
                      <div className="w-px h-5 bg-border mx-1" />
                      {canManageProjectRoles && (
                        <>
                          <Select value={bulkRole} onValueChange={(v) => setBulkRole(v as 'member' | 'leader')}>
                            <SelectTrigger className="w-28 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover">
                              <SelectItem value="member">Thành viên</SelectItem>
                              <SelectItem value="leader">Phó nhóm</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setBulkMemberAction('role')} disabled={isBulkProcessing}>
                            <Shield className="w-3 h-3" />
                            Đổi vai trò
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={() => setBulkMemberAction('delete')} disabled={isBulkProcessing}>
                        <Trash2 className="w-3 h-3" />
                        Xóa
                      </Button>
                    </>
                  )}
                  
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 ml-auto" onClick={clearAllSelections}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
              <div className="space-y-3">
                {members.map((member) => {
                  const isMobileExpanded = expandedMobileMemberId === member.id;
                  return (
                  <div key={member.id} className="flex flex-col">
                    {/* Desktop row - unchanged */}
                    <div 
                      className={`hidden sm:flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer ${selectedMemberIds.has(member.id) ? 'ring-2 ring-primary/50 bg-primary/5' : ''}`}
                      onClick={() => {
                        if (isMultiSelectMode && !isMemberGroupCreator(member.user_id) && member.user_id !== currentUserId) {
                          toggleMemberSelect(member.id);
                          return;
                        }
                        if (member.profiles) {
                          setProfileToView(member.profiles as Profile);
                          setProfileViewRole(member.role as 'owner_system' | 'leader' | 'member');
                          setProfileViewIsCreator(isMemberGroupCreator(member.user_id));
                        }
                      }}
                    >
                      {isMultiSelectMode && !isMemberGroupCreator(member.user_id) && member.user_id !== currentUserId && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedMemberIds.has(member.id)}
                            onCheckedChange={() => toggleMemberSelect(member.id)}
                          />
                        </div>
                      )}
                      <UserAvatar 
                        src={member.profiles?.avatar_url}
                        name={member.profiles?.full_name}
                        size="lg"
                        className="border-2 border-background"
                        showPresence={true}
                        presenceStatus={getPresenceStatus(member.user_id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">{member.profiles?.full_name}</p>
                          {isMemberGroupCreator(member.user_id) && (
                            <span title="Trưởng nhóm"><Crown className="w-4 h-4 text-warning" /></span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                          {member.profiles?.institution && <><span className="truncate">{member.profiles.institution}</span><span>•</span></>}
                          <span>{member.profiles?.student_id}</span>
                          <span>•</span>
                          <span className="truncate">{member.profiles?.email}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {getRoleBadge(member.role, member.user_id)}
                        
                        {member.user_id === currentUserId && !leaveInfo.isCreator && (
                          <div className="flex items-center gap-2">
                            {leaveInfo.canLeave ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-destructive border-destructive/50 hover:bg-destructive/10"
                                onClick={(e) => { e.stopPropagation(); setIsLeaveDialogOpen(true); }}
                              >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Rời project</span>
                              </Button>
                            ) : (
                              <Badge variant="secondary" className="text-xs gap-1 text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>Hết hạn rời nhóm</span>
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        {(canChangeRole(member) || canDeleteMember(member)) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); if (member.profiles) { setProfileToView(member.profiles as Profile); setProfileViewRole(member.role as any); setProfileViewIsCreator(isMemberGroupCreator(member.user_id)); } }}>
                                <Eye className="w-4 h-4 mr-2" />
                                Xem hồ sơ
                              </DropdownMenuItem>
                              {canChangeRole(member) && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openChangeRoleDialog(member); }}>
                                  <Shield className="w-4 h-4 mr-2" />
                                  Đổi vai trò
                                </DropdownMenuItem>
                              )}
                              {canDeleteMember(member) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setMemberToDelete(member); }} className="text-destructive">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Xóa khỏi project
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>

                    {/* Mobile row - accordion style */}
                    <div className="sm:hidden">
                      <div 
                        className={`flex items-center gap-3 p-3 rounded-xl bg-muted/30 transition-colors cursor-pointer
                          ${selectedMemberIds.has(member.id) ? 'ring-2 ring-primary/50 bg-primary/5' : ''}
                          ${isMobileExpanded ? 'rounded-b-none' : ''}`}
                        onClick={() => {
                          if (isMultiSelectMode && !isMemberGroupCreator(member.user_id) && member.user_id !== currentUserId) {
                            toggleMemberSelect(member.id);
                            return;
                          }
                          setExpandedMobileMemberId(prev => prev === member.id ? null : member.id);
                        }}
                      >
                        {isMultiSelectMode && !isMemberGroupCreator(member.user_id) && member.user_id !== currentUserId && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedMemberIds.has(member.id)}
                              onCheckedChange={() => toggleMemberSelect(member.id)}
                              className="h-4 w-4"
                            />
                          </div>
                        )}
                        <UserAvatar 
                          src={member.profiles?.avatar_url}
                          name={member.profiles?.full_name}
                          size="md"
                          className="border-2 border-background"
                          showPresence={true}
                          presenceStatus={getPresenceStatus(member.user_id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold truncate">{member.profiles?.full_name}</p>
                            {isMemberGroupCreator(member.user_id) && (
                              <Crown className="w-3.5 h-3.5 text-warning shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{member.profiles?.student_id}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {getRoleBadge(member.role, member.user_id)}
                          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isMobileExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>

                      {/* Mobile expanded panel */}
                      {isMobileExpanded && (
                        <div className="border border-t-0 border-border rounded-b-xl bg-muted/20 px-3 py-3 space-y-2.5 animate-in slide-in-from-top-1 duration-200">
                          {/* Info details */}
                          <div className="space-y-1.5 text-xs text-muted-foreground">
                            {member.profiles?.institution && (
                              <p>🏫 {member.profiles.institution}</p>
                            )}
                            <p>📧 {member.profiles?.email}</p>
                            {member.profiles?.phone && <p>📱 {member.profiles.phone}</p>}
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-2 pt-1.5 border-t border-border">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1 flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (member.profiles) {
                                  setProfileToView(member.profiles as Profile);
                                  setProfileViewRole(member.role as 'owner_system' | 'leader' | 'member');
                                  setProfileViewIsCreator(isMemberGroupCreator(member.user_id));
                                }
                              }}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Xem hồ sơ
                            </Button>

                            {member.user_id === currentUserId && !leaveInfo.isCreator && leaveInfo.canLeave && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs gap-1 text-destructive border-destructive/50"
                                onClick={(e) => { e.stopPropagation(); setIsLeaveDialogOpen(true); }}
                              >
                                <LogOut className="w-3.5 h-3.5" />
                                Rời
                              </Button>
                            )}

                            {(canChangeRole(member) || canDeleteMember(member)) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {canChangeRole(member) && (
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openChangeRoleDialog(member); }}>
                                      <Shield className="w-4 h-4 mr-2" />
                                      Đổi vai trò
                                    </DropdownMenuItem>
                                  )}
                                  {canDeleteMember(member) && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setMemberToDelete(member); }} className="text-destructive">
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Xóa khỏi project
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
                {members.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Chưa có thành viên nào</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab: Đang chờ chấp nhận (invitations) */}
            <TabsContent value="invitations">
              {/* Multi-select bulk action bar */}
              {isMultiSelectMode && isLeaderInGroup && pendingInvitations.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-2 p-2.5 rounded-lg border bg-muted/50">
                  <Checkbox
                    checked={selectedInvitationIds.size === pendingInvitations.length && pendingInvitations.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedInvitationIds(new Set(pendingInvitations.map(i => i.id)));
                      else setSelectedInvitationIds(new Set());
                    }}
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    {selectedInvitationIds.size > 0 ? `Đã chọn ${selectedInvitationIds.size} lời mời` : 'Chọn tất cả'}
                  </span>
                  {selectedInvitationIds.size > 0 && (
                    <>
                      <div className="w-px h-5 bg-border mx-1" />
                      <Button size="sm" variant="destructive" className="h-7 text-xs gap-1 ml-auto" onClick={handleBulkCancelInvitations}>
                        <X className="w-3.5 h-3.5" />
                        Hủy {selectedInvitationIds.size} lời mời
                      </Button>
                    </>
                  )}
                </div>
              )}
              <div className="space-y-3">
                {pendingInvitations.map((inv) => (
                  <div 
                    key={inv.id} 
                    className={`flex items-center gap-4 p-4 rounded-xl bg-muted/20 border border-dashed border-border cursor-pointer transition-colors ${isMultiSelectMode && selectedInvitationIds.has(inv.id) ? 'ring-2 ring-primary/50 bg-primary/5' : ''}`}
                    onClick={() => {
                      if (isMultiSelectMode) {
                        setSelectedInvitationIds(prev => {
                          const next = new Set(prev);
                          if (next.has(inv.id)) next.delete(inv.id); else next.add(inv.id);
                          return next;
                        });
                      }
                    }}
                  >
                    {isMultiSelectMode && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedInvitationIds.has(inv.id)}
                          onCheckedChange={() => {
                            setSelectedInvitationIds(prev => {
                              const next = new Set(prev);
                              if (next.has(inv.id)) next.delete(inv.id); else next.add(inv.id);
                              return next;
                            });
                          }}
                        />
                      </div>
                    )}
                    <UserAvatar 
                      src={inv.profiles?.avatar_url}
                      name={inv.profiles?.full_name}
                      size="lg"
                      className="border-2 border-dashed border-muted-foreground/30"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{inv.profiles?.full_name || 'Không rõ'}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                        {inv.profiles?.institution && <><span className="truncate">{inv.profiles.institution}</span><span>•</span></>}
                        <span>{inv.profiles?.student_id}</span>
                        <span>•</span>
                        <span className="truncate">{inv.profiles?.email}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs gap-1 border-dashed text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Chờ phản hồi
                      </Badge>
                      {isLeaderInGroup && !isMultiSelectMode && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); handleCancelInvitation(inv.id); }}
                          title="Hủy lời mời"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {pendingInvitations.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Không có lời mời nào đang chờ</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab: Đang chờ duyệt (join requests) */}
            <TabsContent value="join-requests">
              {/* Multi-select bulk action bar */}
              {isMultiSelectMode && isLeaderInGroup && joinRequests.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-2 p-2.5 rounded-lg border bg-muted/50">
                  <Checkbox
                    checked={selectedJoinRequestIds.size === joinRequests.length && joinRequests.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedJoinRequestIds(new Set(joinRequests.map(r => r.id)));
                      else setSelectedJoinRequestIds(new Set());
                    }}
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    {selectedJoinRequestIds.size > 0 ? `Đã chọn ${selectedJoinRequestIds.size} yêu cầu` : 'Chọn tất cả'}
                  </span>
                  {selectedJoinRequestIds.size > 0 && (
                    <>
                      <div className="w-px h-5 bg-border mx-1" />
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={handleBulkApproveJoinRequests} disabled={isBulkJoinProcessing}>
                        {isBulkJoinProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                        Duyệt {selectedJoinRequestIds.size}
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleBulkRejectJoinRequests} disabled={isBulkJoinProcessing}>
                        <X className="w-3.5 h-3.5" />
                        Từ chối {selectedJoinRequestIds.size}
                      </Button>
                    </>
                  )}
                </div>
              )}
              <div className="space-y-3">
                {joinRequests.map((req) => (
                  <div 
                    key={req.id} 
                    className={`flex items-center gap-4 p-4 rounded-xl bg-warning/5 border border-warning/20 cursor-pointer transition-colors ${isMultiSelectMode && selectedJoinRequestIds.has(req.id) ? 'ring-2 ring-primary/50 bg-primary/5' : ''}`}
                    onClick={() => {
                      if (isMultiSelectMode) {
                        setSelectedJoinRequestIds(prev => {
                          const next = new Set(prev);
                          if (next.has(req.id)) next.delete(req.id); else next.add(req.id);
                          return next;
                        });
                      }
                    }}
                  >
                    {isMultiSelectMode && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedJoinRequestIds.has(req.id)}
                          onCheckedChange={() => {
                            setSelectedJoinRequestIds(prev => {
                              const next = new Set(prev);
                              if (next.has(req.id)) next.delete(req.id); else next.add(req.id);
                              return next;
                            });
                          }}
                        />
                      </div>
                    )}
                    <UserAvatar 
                      src={req.profiles?.avatar_url}
                      name={req.profiles?.full_name}
                      size="lg"
                      className="border-2 border-dashed border-warning/30"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{req.profiles?.full_name || 'Không rõ'}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                        {req.profiles?.institution && <><span className="truncate">{req.profiles.institution}</span><span>•</span></>}
                        <span>{req.profiles?.student_id}</span>
                        <span>•</span>
                        <span className="truncate">{req.profiles?.email}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isLeaderInGroup && !isMultiSelectMode && (
                        <>
                          <Button
                            size="sm"
                            className="h-8 text-xs gap-1"
                            onClick={(e) => { e.stopPropagation(); handleApproveJoinRequest(req); }}
                            disabled={processingJoinRequest === req.id}
                          >
                            {processingJoinRequest === req.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )}
                            Duyệt
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1"
                            onClick={(e) => { e.stopPropagation(); handleRejectJoinRequest(req); }}
                            disabled={processingJoinRequest === req.id}
                          >
                            <X className="w-3.5 h-3.5" />
                            Từ chối
                          </Button>
                        </>
                      )}
                      {!isLeaderInGroup && (
                        <Badge variant="outline" className="text-xs gap-1 border-warning/30 text-warning">
                          <Clock className="w-3 h-3" />
                          Chờ duyệt
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {joinRequests.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Không có yêu cầu nào đang chờ duyệt</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add Member Dialog - 1280x720, multi-select */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetAddForm(); }}>
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
                  <UserPlus className="w-5 h-5 text-primary" />
                  Thêm thành viên vào Project
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Chọn nhiều thành viên từ hệ thống để thêm cùng lúc
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsAddDialogOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x">
              {/* Left: Search & List - 3 cols */}
              <div className="lg:col-span-3 flex flex-col min-h-0 p-6">
                <div className="space-y-3 flex-shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                    <Input
                      placeholder="Nhập tên hoặc MSSV để tìm kiếm..."
                      value={searchQuery}
                      onChange={(e) => handleSearchProfiles(e.target.value)}
                      className="h-11 pl-10 border-2 border-primary/30 focus-visible:border-primary focus-visible:ring-primary/20 bg-primary/5 placeholder:text-muted-foreground/70 font-medium"
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {isSearchingProfiles ? 'Đang tìm...' : searchQuery.length >= 2 ? `${filteredProfiles.length} kết quả` : 'Nhập ít nhất 2 ký tự'}
                    </span>
                  </div>
                </div>
                <ScrollArea className="flex-1 mt-3 border rounded-lg p-2">
                  {filteredProfiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
                      <Search className="w-10 h-10 mb-2 opacity-30" />
                      <p>{searchQuery && searchQuery.length >= 2 ? 'Không tìm thấy thành viên phù hợp' : 'Nhập tên hoặc MSSV để tìm kiếm'}</p>
                      {(!searchQuery || searchQuery.length < 2) && <p className="text-xs mt-1">Nhập ít nhất 2 ký tự</p>}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredProfiles.map((p) => (
                        <div
                          key={p.id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedUserIds.has(p.id)
                              ? 'bg-primary/10 border-2 border-primary' 
                              : 'bg-muted/30 hover:bg-muted/50 border-2 border-transparent'
                          }`}
                          onClick={() => {
                            setSelectedUserIds(prev => {
                              const next = new Set(prev);
                              if (next.has(p.id)) next.delete(p.id);
                              else next.add(p.id);
                              return next;
                            });
                          }}
                        >
                          <Checkbox
                            checked={selectedUserIds.has(p.id)}
                            onCheckedChange={() => {
                              setSelectedUserIds(prev => {
                                const next = new Set(prev);
                                if (next.has(p.id)) next.delete(p.id);
                                else next.add(p.id);
                                return next;
                              });
                            }}
                          />
                          <UserAvatar 
                            src={p.avatar_url} 
                            name={p.full_name}
                            size="md"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{p.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {p.institution ? <span className="text-primary/70 font-medium">{p.institution}</span> : null}
                              {p.institution ? ' • ' : ''}MSSV: {p.student_id}
                            </p>
                            <p className="text-xs text-muted-foreground/70 truncate">{p.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Right: Selected & Role - 2 cols */}
              <div className="lg:col-span-2 flex flex-col min-h-0 p-6">
                <div className="text-sm font-semibold text-primary uppercase tracking-wide flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4" />
                  Đã chọn ({selectedUserIds.size})
                </div>

                <ScrollArea className="flex-1 border rounded-lg p-2 mb-4">
                  {selectedUserIds.size === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Users className="w-10 h-10 mb-2 opacity-30" />
                      <p className="text-sm">Chưa chọn thành viên nào</p>
                      <p className="text-xs">Click vào danh sách bên trái để chọn</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {Array.from(selectedUserIds).map(uid => {
                        const p = searchResults.find(ap => ap.id === uid);
                        if (!p) return null;
                        return (
                          <div key={uid} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
                            <UserAvatar src={p.avatar_url} name={p.full_name} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{p.full_name}</p>
                              <p className="text-xs text-muted-foreground">{p.institution ? `${p.institution} • ` : ''}{p.student_id}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 flex-shrink-0"
                              onClick={() => {
                                setSelectedUserIds(prev => {
                                  const next = new Set(prev);
                                  next.delete(uid);
                                  return next;
                                });
                              }}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>

                {/* Role Selection */}
                {canManageProjectRoles ? (
                  <div className="space-y-2 mb-4">
                    <Label className="text-sm font-medium">Vai trò trong Project</Label>
                    <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as 'member' | 'leader')}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4" />
                            Thành viên
                          </div>
                        </SelectItem>
                        <SelectItem value="leader">
                          <div className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-warning" />
                            Phó nhóm
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2 mb-4">
                    <Label className="text-sm font-medium text-muted-foreground">Vai trò</Label>
                    <div className="h-11 flex items-center px-3 bg-muted/50 rounded-md border border-border text-muted-foreground">
                      <UserCheck className="w-4 h-4 mr-2" /> Thành viên
                    </div>
                  </div>
                )}

                <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground mb-4">
                  💡 Tất cả thành viên được chọn sẽ có cùng vai trò.
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setIsAddDialogOpen(false)}>
                    Hủy
                  </Button>
                  <Button className="flex-1" onClick={handleAddMember} disabled={selectedUserIds.size === 0 || isAddingMember}>
                    {isAddingMember ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Đang thêm...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Thêm {selectedUserIds.size > 0 ? `${selectedUserIds.size} thành viên` : 'vào Project'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={!!memberToChangeRole} onOpenChange={() => setMemberToChangeRole(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Đổi vai trò thành viên
            </DialogTitle>
            <DialogDescription>
              Thay đổi vai trò của <span className="font-medium">{memberToChangeRole?.profiles?.full_name}</span> trong project này.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <UserAvatar 
                  src={memberToChangeRole?.profiles?.avatar_url} 
                  name={memberToChangeRole?.profiles?.full_name}
                  size="lg"
                />
                <div>
                  <p className="font-medium">{memberToChangeRole?.profiles?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{memberToChangeRole?.profiles?.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Vai trò mới</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as 'member' | 'leader')}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4" />
                      Thành viên
                    </div>
                  </SelectItem>
                  <SelectItem value="leader">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-warning" />
                      Phó nhóm
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberToChangeRole(null)}>
              Hủy
            </Button>
            <Button onClick={handleChangeRole} disabled={isChangingRole} className="min-w-28">
              {isChangingRole ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                'Xác nhận'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Member Confirmation */}
      <AlertDialog open={!!memberToDelete} onOpenChange={() => setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa thành viên</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa <span className="font-semibold">{memberToDelete?.profiles?.full_name}</span> khỏi project này?
              <br /><br />
              <span className="text-muted-foreground">
                Lưu ý: Thao tác này chỉ xóa thành viên khỏi project, không xóa tài khoản khỏi hệ thống.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Xóa khỏi project'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Members Confirmation */}
      <AlertDialog open={bulkMemberAction === 'delete'} onOpenChange={() => setBulkMemberAction(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa hàng loạt</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa <span className="font-semibold">{selectedMemberIds.size} thành viên</span> khỏi project? Thao tác này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkProcessing}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteMembers}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isBulkProcessing}
            >
              {isBulkProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : `Xóa ${selectedMemberIds.size} thành viên`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Change Role Confirmation */}
      <AlertDialog open={bulkMemberAction === 'role'} onOpenChange={() => setBulkMemberAction(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Đổi vai trò hàng loạt</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn đổi vai trò <span className="font-semibold">{selectedMemberIds.size} thành viên</span> thành <span className="font-semibold">{bulkRole === 'leader' ? 'Phó nhóm' : 'Thành viên'}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkProcessing}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkChangeRole} disabled={isBulkProcessing}>
              {isBulkProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Xác nhận'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>




      {/* Profile View Dialog */}
      <ProfileViewDialog
        open={!!profileToView}
        onOpenChange={(open) => { if (!open) setProfileToView(null); }}
        profile={profileToView}
        role={profileViewRole}
        isGroupCreator={profileViewIsCreator}
        groupId={groupId}
      />

      {/* Excel Import Dialog */}
      <ExcelMemberImport
        open={isExcelImportOpen}
        onOpenChange={setIsExcelImportOpen}
        contextLabel="project"
        allowedActions={['add', 'remove']}
        onValidate={async (action: ExcelImportAction, rows: ParsedRow[]) => {
          const results: ImportValidation[] = [];
          for (const row of rows) {
            if (action === 'add') {
              if (!row.fullName || !row.email) {
                results.push({ row, status: 'missing_field', message: `Thiếu ${!row.fullName ? 'họ tên' : 'email'}` });
                continue;
              }
              // Check if already in project
              const existing = members.find(m => m.profiles?.email?.toLowerCase() === row.email.toLowerCase());
              if (existing) {
                results.push({ row, status: 'duplicate', message: 'Đã có trong project' });
              } else {
                results.push({ row, status: 'ok' });
              }
            } else {
              const match = members.find(m =>
                (row.studentId && m.profiles?.student_id === row.studentId) ||
                (row.email && m.profiles?.email?.toLowerCase() === row.email.toLowerCase())
              );
              if (!match) {
                results.push({ row, status: 'not_found', message: 'Không có trong project' });
              } else if (match.user_id === currentUserId || isMemberGroupCreator(match.user_id)) {
                results.push({ row, status: 'missing_field', message: 'Không thể xóa' });
              } else {
                results.push({ row, status: 'ok' });
              }
            }
          }
          return results;
        }}
        onExecute={async (action: ExcelImportAction, rows: ParsedRow[]) => {
          let success = 0;
          let failed = 0;
          const errors: string[] = [];

          if (action === 'add') {
            for (const row of rows) {
              try {
                // Find existing profile by email
                const { data: existingProfiles } = await supabase.from('profiles').select('id, email').eq('is_approved', true).ilike('email', row.email);
                const existingProfile = existingProfiles?.[0];
                let userId = existingProfile?.id;

                if (!userId) {
                  // Create new system account
                  const { data, error } = await supabase.functions.invoke('manage-users', {
                    body: { action: 'create_member', email: row.email, student_id: row.studentId, full_name: row.fullName },
                  });
                  if (error || data?.error) throw new Error(data?.error || error?.message);
                  userId = data?.user?.id;
                }

                if (!userId) throw new Error('Không tạo được tài khoản');

                // Create invitation instead of direct add
                const { error: addErr } = await supabase.from('project_invitations').insert({
                  group_id: groupId, invited_user_id: userId, invited_by: user!.id, role: 'member', status: 'pending',
                });
                if (addErr) {
                  if (addErr.code === '23505') throw new Error('Đã có lời mời đang chờ');
                  throw addErr;
                }

                // Send notification
                const { data: groupData } = await supabase.from('groups').select('name').eq('id', groupId).single();
                await notifyProjectInvitation({
                  invitedUserId: userId,
                  inviterName: profile?.full_name || 'Leader',
                  groupName: groupData?.name || 'Project',
                  groupId,
                });
                success++;
              } catch (err: any) {
                failed++;
                errors.push(`${row.fullName}: ${err.message}`);
              }
            }
          } else {
            for (const row of rows) {
              try {
                const match = members.find(m =>
                  (row.studentId && m.profiles?.student_id === row.studentId) ||
                  (row.email && m.profiles?.email?.toLowerCase() === row.email.toLowerCase())
                );
                if (!match) { failed++; errors.push(`${row.fullName}: Không tìm thấy`); continue; }

                // Remove task assignments
                const { data: tasksData } = await supabase.from('tasks').select('id').eq('group_id', groupId);
                if (tasksData?.length) {
                  await supabase.from('task_assignments').delete()
                    .eq('user_id', match.user_id)
                    .in('task_id', tasksData.map(t => t.id));
                }
                const { error } = await supabase.from('group_members').delete().eq('id', match.id);
                if (error) throw error;
                success++;
              } catch (err: any) {
                failed++;
                errors.push(`${row.fullName}: ${err.message}`);
              }
            }
          }

          if (success > 0) {
            await logActivity({
              userId: user!.id,
              userName: profile?.full_name || user?.email || 'Unknown',
              action: action === 'add' ? 'BULK_INVITE_PROJECT_MEMBERS' : 'BULK_REMOVE_PROJECT_MEMBERS',
              actionType: 'member',
              description: `${action === 'add' ? 'Gửi lời mời' : 'Xóa'} hàng loạt ${success} thành viên ${action === 'add' ? 'vào' : 'khỏi'} project từ Excel`,
              groupId: groupId,
            });
          }

          onRefresh();
          return { success, failed, errors };
        }}
      />

      {/* Leave Project Confirmation Dialog - 16:9 wide layout */}
      <AlertDialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <AlertDialogContent className="max-w-3xl p-0 overflow-hidden gap-0">
          <div className="flex flex-col md:flex-row">
            {/* Left side - Illustration (16:9 feel) */}
            <div className="relative md:w-[45%] bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 flex items-center justify-center p-6 md:p-8 min-h-[180px] md:min-h-[420px]">
              <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)),transparent_70%)]" />
              <div className="relative flex flex-col items-center gap-4">
                <img 
                  src={leaveGroupIllustration} 
                  alt="Rời nhóm" 
                  className="w-48 md:w-64 h-auto drop-shadow-lg" 
                />
                <div className="text-center space-y-1">
                  <p className="text-lg md:text-xl font-bold text-foreground">
                    Bạn thật sự muốn rời đi?
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Đồng đội sẽ rất nhớ bạn...
                  </p>
                </div>
              </div>
            </div>

            {/* Right side - Content */}
            <div className="md:w-[55%] p-5 md:p-6 flex flex-col">
              <AlertDialogHeader className="mb-4">
                <AlertDialogTitle className="sr-only">Xác nhận rời project</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3">
                    {/* Rules - compact grid */}
                    <div className="space-y-2">
                      <p className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                        📋 Quy định rời project
                      </p>
                      <div className="grid grid-cols-1 gap-1.5">
                        <div className="flex items-start gap-2 p-2 rounded-md bg-muted/40 text-xs">
                          <span className="text-primary mt-0.5 shrink-0">✓</span>
                          <span>Chưa có công việc → rời <strong>bất kỳ lúc nào</strong></span>
                        </div>
                        <div className="flex items-start gap-2 p-2 rounded-md bg-muted/40 text-xs">
                          <span className="text-primary mt-0.5 shrink-0">⏱</span>
                          <span>Đã có công việc → chỉ trong <strong>48 giờ</strong> sau khi tham gia</span>
                        </div>
                        <div className="flex items-start gap-2 p-2 rounded-md bg-muted/40 text-xs">
                          <span className="text-destructive mt-0.5 shrink-0">✗</span>
                          <span>Trưởng nhóm <strong>không thể</strong> rời project</span>
                        </div>
                      </div>
                    </div>

                    {/* Current status */}
                    {leaveInfo.hasNoTasks ? (
                      <div className="flex items-center gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Clock className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-xs">Có thể rời bất kỳ lúc nào</p>
                          <p className="text-muted-foreground text-xs">Project chưa có công việc nào.</p>
                        </div>
                      </div>
                    ) : leaveInfo.canLeave ? (
                      <div className="flex items-center gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Clock className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-xs">
                            Còn <span className="text-primary font-bold">{formatHoursLeft(leaveInfo.hoursLeft)}</span> để rời
                          </p>
                          {leaveInfo.joinedAt && (
                            <p className="text-muted-foreground text-xs">
                              Tham gia: {new Date(leaveInfo.joinedAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {/* Warning - compact */}
                    <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 space-y-1.5">
                      <p className="font-semibold text-destructive text-xs flex items-center gap-1.5">
                        ⚠️ Không thể hoàn tác!
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="text-xs border-destructive/30 text-destructive/80 font-normal">
                          Xóa khỏi nhóm
                        </Badge>
                        <Badge variant="outline" className="text-xs border-destructive/30 text-destructive/80 font-normal">
                          Hủy nhiệm vụ
                        </Badge>
                        <Badge variant="outline" className="text-xs border-destructive/30 text-destructive/80 font-normal">
                          Mất quyền truy cập
                        </Badge>
                      </div>
                    </div>

                    {leaveCountdown > 0 && (
                      <div className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-muted text-xs font-medium">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Đợi <span className="text-foreground font-bold">{leaveCountdown}s</span> trước khi xác nhận
                        </span>
                      </div>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-auto pt-3 border-t border-border/50">
                <AlertDialogCancel disabled={isLeaving} className="flex-1">Ở lại</AlertDialogCancel>
                <Button
                  onClick={handleLeaveProject}
                  disabled={isLeaving || leaveCountdown > 0}
                  variant="destructive"
                  className="gap-2 flex-1"
                >
                  {isLeaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang rời...
                    </>
                  ) : leaveCountdown > 0 ? (
                    <>
                      <Clock className="w-4 h-4" />
                      Đợi {leaveCountdown}s...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" />
                      Rời project
                    </>
                  )}
                </Button>
              </AlertDialogFooter>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
