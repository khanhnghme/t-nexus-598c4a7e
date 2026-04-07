import { useState } from 'react';
import { logActivity } from '@/lib/activityLogger';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Profile } from '@/types/database';

interface SuspendMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Profile | null;
  currentUserId: string;
  currentUserName: string;
  onSuccess: () => void;
}

const DURATION_OPTIONS = [
  { value: '1h', label: '1 giờ' },
  { value: '6h', label: '6 giờ' },
  { value: '12h', label: '12 giờ' },
  { value: '1d', label: '1 ngày' },
  { value: '3d', label: '3 ngày' },
  { value: '7d', label: '7 ngày' },
  { value: '14d', label: '14 ngày' },
  { value: '30d', label: '30 ngày' },
  { value: 'permanent', label: 'Vĩnh viễn' },
];

function getDurationMs(value: string): number | null {
  const map: Record<string, number> = {
    '1h': 3600000,
    '6h': 21600000,
    '12h': 43200000,
    '1d': 86400000,
    '3d': 259200000,
    '7d': 604800000,
    '14d': 1209600000,
    '30d': 2592000000,
  };
  return map[value] ?? null; // null = permanent
}

export default function SuspendMemberDialog({
  open, onOpenChange, member, currentUserId, currentUserName, onSuccess
}: SuspendMemberDialogProps) {
  const { toast } = useToast();
  const [duration, setDuration] = useState('1d');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSuspend = async () => {
    if (!member) return;
    setIsSubmitting(true);

    const durationMs = getDurationMs(duration);
    const suspendedUntil = durationMs
      ? new Date(Date.now() + durationMs).toISOString()
      : '2099-12-31T23:59:59.000Z'; // "permanent"

    const { error } = await supabase
      .from('profiles')
      .update({
        suspended_until: suspendedUntil,
        suspension_reason: reason.trim() || null,
        suspended_at: new Date().toISOString(),
        suspended_by: currentUserId,
      })
      .eq('id', member.id);

    if (error) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }

    // Log activity
    await logActivity({
      userId: currentUserId,
      userName: currentUserName,
      action: 'SUSPEND_MEMBER',
      actionType: 'project_member',
      description: `Tạm khóa tài khoản ${member.full_name} (${DURATION_OPTIONS.find(d => d.value === duration)?.label})${reason ? ` - Lý do: ${reason}` : ''}`,
    });

    toast({ title: 'Đã khóa tài khoản', description: `Tài khoản ${member.full_name} đã bị tạm khóa.` });
    setIsSubmitting(false);
    setReason('');
    setDuration('1d');
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setReason(''); setDuration('1d'); } }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-destructive" />
            Tạm khóa tài khoản
          </DialogTitle>
          <DialogDescription>
            Khóa tài khoản <span className="font-semibold">{member?.full_name}</span>. Người dùng sẽ không thể đăng nhập trong thời gian khóa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Thời gian khóa <span className="text-destructive">*</span></Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Lý do (tùy chọn)</Label>
            <Textarea
              placeholder="Nhập lý do khóa tài khoản..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button variant="destructive" onClick={handleSuspend} disabled={isSubmitting} className="min-w-28">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Khóa tài khoản'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
