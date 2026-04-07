import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/lib/activityLogger';
import { fixStorageUrl } from '@/lib/urlUtils';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, Users, Crown, ArrowRight } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import type { Profile } from '@/types/database';

interface OwnedGroup {
  id: string;
  name: string;
  member_count: number;
  image_url: string | null;
}

interface GroupMemberInfo {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

interface ProjectTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Profile | null;
  ownedGroups: OwnedGroup[];
  onTransferComplete: () => void;
}

export default function ProjectTransferDialog({
  open, onOpenChange, member, ownedGroups, onTransferComplete
}: ProjectTransferDialogProps) {
  const { user, profile: currentProfile } = useAuth();
  const { toast } = useToast();
  
  const [transfers, setTransfers] = useState<Record<string, string>>({});
  const [groupMembers, setGroupMembers] = useState<Record<string, GroupMemberInfo[]>>({});
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Fetch members for all groups when dialog opens
  useEffect(() => {
    if (open && ownedGroups.length > 0 && member) {
      setLoading(true);
      
      // Fetch admin users first
      const fetchAdmins = async () => {
        const { data: adminRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'system_owner');
        const adminIds = (adminRoles || []).map(r => r.user_id);
        let adminProfiles: Record<string, { full_name: string; avatar_url: string | null }> = {};
        if (adminIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', adminIds);
          (profiles || []).forEach(p => {
            adminProfiles[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
          });
        }
        return { adminIds, adminProfiles };
      };

      fetchAdmins().then(async ({ adminIds, adminProfiles }) => {
        const results = await Promise.all(
          ownedGroups.map(async (g) => {
            const { data: memberData } = await supabase
              .from('group_members')
              .select('user_id, role')
              .eq('group_id', g.id)
              .neq('user_id', member.id);

            const groupUserIds = (memberData || []).map(m => m.user_id);
            
            // Fetch profiles for group members
            let profilesMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
            if (groupUserIds.length > 0) {
              const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .in('id', groupUserIds);
              (profilesData || []).forEach(p => {
                profilesMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
              });
            }

            // Build members list from group members
            const members: GroupMemberInfo[] = (memberData || []).map(d => ({
              user_id: d.user_id,
              full_name: profilesMap[d.user_id]?.full_name || 'Unknown',
              avatar_url: profilesMap[d.user_id]?.avatar_url || null,
              role: d.role,
            }));

            // Add admin(s) who are not already in the group and not the member being demoted
            adminIds.forEach(adminId => {
              if (adminId !== member.id && !groupUserIds.includes(adminId)) {
                members.unshift({
                  user_id: adminId,
                  full_name: adminProfiles[adminId]?.full_name || 'OwnerSystem',
                  avatar_url: adminProfiles[adminId]?.avatar_url || null,
                  role: 'project_owner',
                });
              }
            });

            // Move admins to top of list
            members.sort((a, b) => {
              const aIsAdmin = adminIds.includes(a.user_id) ? 0 : 1;
              const bIsAdmin = adminIds.includes(b.user_id) ? 0 : 1;
              return aIsAdmin - bIsAdmin;
            });

            return { groupId: g.id, members };
          })
        );

        const map: Record<string, GroupMemberInfo[]> = {};
        const defaultTransfers: Record<string, string> = {};
        results.forEach(r => {
          map[r.groupId] = r.members;
          // Default select admin if available
          const adminMember = r.members.find(m => adminIds.includes(m.user_id));
          if (adminMember) {
            defaultTransfers[r.groupId] = adminMember.user_id;
          }
        });
        setGroupMembers(map);
        setTransfers(prev => ({ ...defaultTransfers, ...prev }));
        setLoading(false);
      });
    }
  }, [open, ownedGroups.length, member?.id]);

  const allGroupsAssigned = ownedGroups.every(g => transfers[g.id]);

  const handleTransfer = async () => {
    if (!member || !allGroupsAssigned) return;
    setProcessing(true);

    try {
      for (const group of ownedGroups) {
        const newOwnerId = transfers[group.id];
        if (!newOwnerId) continue;

        // Update group created_by to new owner
        const { error: updateError } = await supabase
          .from('groups')
          .update({ created_by: newOwnerId, leader_id: newOwnerId })
          .eq('id', group.id);

        if (updateError) throw updateError;

        // Update new owner's group_members role to leader
        await supabase
          .from('group_members')
          .update({ role: 'project_admin' })
          .eq('group_id', group.id)
          .eq('user_id', newOwnerId);

        // Downgrade old owner to member in group
        await supabase
          .from('group_members')
          .update({ role: 'project_member' })
          .eq('group_id', group.id)
          .eq('user_id', member.id);

        const newOwner = groupMembers[group.id]?.find(m => m.user_id === newOwnerId);

        await logActivity({
          userId: user!.id,
          userName: currentProfile?.full_name || 'OwnerSystem',
          action: 'TRANSFER_PROJECT_OWNERSHIP',
          actionType: 'project',
          groupId: group.id,
          description: `Chuyển giao quyền sở hữu dự án "${group.name}" từ ${member.full_name} cho ${newOwner?.full_name || 'Unknown'}`,
          metadata: { from_user_id: member.id, to_user_id: newOwnerId },
        });
      }

      toast({ title: 'Chuyển giao thành công', description: `Đã chuyển giao ${ownedGroups.length} dự án.` });
      setTransfers({});
      onTransferComplete();
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[1280px] h-[min(720px,90vh)] aspect-video flex flex-col p-0 gap-0 overflow-hidden" style={{ maxHeight: 'min(720px, 90vh)', minHeight: 'min(720px, 90vh)' }}>
        <div className="px-6 pt-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Chuyển giao dự án trước khi hạ quyền
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-2">
            <strong>{member.full_name}</strong> đang sở hữu {ownedGroups.length} dự án. 
            Bạn cần chọn owner mới cho từng dự án trước khi hạ quyền.
          </p>
        </div>

        <ScrollArea className="flex-1 min-h-0 p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {ownedGroups.map(group => {
                const members = groupMembers[group.id] || [];
                return (
                  <div key={group.id} className="rounded-xl border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {group.image_url ? (
                          <img src={fixStorageUrl(group.image_url) || ''} alt={group.name} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary">
                            {group.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold">{group.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3" /> {group.member_count} thành viên
                          </p>
                        </div>
                      </div>
                      <Badge variant={transfers[group.id] ? 'default' : 'outline'} className="text-xs">
                        {transfers[group.id] ? '✓ Đã chọn' : 'Chưa chọn'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                        <Crown className="w-4 h-4" />
                        <span>Owner mới:</span>
                      </div>
                      <Select value={transfers[group.id] || ''} onValueChange={v => setTransfers(prev => ({ ...prev, [group.id]: v }))}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Chọn thành viên..." />
                        </SelectTrigger>
                        <SelectContent>
                          {members.length === 0 ? (
                            <SelectItem value="_none" disabled>Không có thành viên khác</SelectItem>
                          ) : (
                            members.map(m => (
                              <SelectItem key={m.user_id} value={m.user_id}>
                                <div className="flex items-center gap-2">
                                  <UserAvatar src={m.avatar_url} name={m.full_name} size="sm" />
                                  <span>{m.full_name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({m.role === 'project_owner' ? 'OwnerSystem' : m.role === 'project_admin' ? 'Phó nhóm' : 'Thành viên'})
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>Hủy</Button>
          <Button onClick={handleTransfer} disabled={!allGroupsAssigned || processing}>
            {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Chuyển giao & Hạ quyền
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
