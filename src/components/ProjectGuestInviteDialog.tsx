import { useState } from 'react';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, Mail, Loader2, Ghost } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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

interface ProjectGuestInviteDialogProps {
  groupId: string;
  groupName: string;
  trigger?: React.ReactNode;
}

export default function ProjectGuestInviteDialog({ groupId, groupName, trigger }: ProjectGuestInviteDialogProps) {
  const { inviteGuest } = useWorkspaceMembers();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [guestRole, setGuestRole] = useState('project_member');
  const [isInviting, setIsInviting] = useState(false);

  const handleInviteGuest = async () => {
    if (!guestEmail.trim()) return;
    setIsInviting(true);

    const result = await inviteGuest(guestEmail.trim(), groupId, guestRole);
    if (result.success) {
      toast({ title: 'Đã mời khách', description: `${guestEmail} đã được mời vào dự án "${groupName}".` });
      setGuestEmail('');
      setOpen(false);
    } else {
      toast({ title: 'Lỗi', description: result.error, variant: 'destructive' });
    }
    setIsInviting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Ghost className="w-4 h-4 mr-2" />
            Mời khách
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mời khách vào dự án</DialogTitle>
          <DialogDescription>
            Mời người dùng bên ngoài workspace vào dự án "{groupName}" với vai trò khách mời.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="guest-email">Email khách mời</Label>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <Input
                id="guest-email"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="email@example.com"
                onKeyDown={(e) => e.key === 'Enter' && handleInviteGuest()}
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            👽 Khách mời chỉ có quyền truy cập dự án này, không có quyền truy cập các dự án khác trong workspace.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
          <Button onClick={handleInviteGuest} disabled={isInviting || !guestEmail.trim()}>
            {isInviting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
            Gửi lời mời
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
