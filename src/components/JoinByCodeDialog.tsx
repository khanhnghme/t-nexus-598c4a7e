import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { fixStorageUrl } from '@/lib/urlUtils';
import { logActivity } from '@/lib/activityLogger';
import { Loader2, Users, Calendar, ArrowLeft, CheckCircle2, UserCheck, XCircle, Clock, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import joinCodeIllustration from '@/assets/join-code-illustration.png';

interface GroupPreview {
  id: string;
  name: string;
  description: string | null;
  class_code: string | null;
  instructor_name: string | null;
  created_at: string;
  image_url: string | null;
  zalo_link: string | null;
  memberCount: number;
  leaderName: string | null;
  joinMemberLimit: number | null;
  joinRequireApproval: boolean;
}

interface JoinByCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoined: () => void;
}

export default function JoinByCodeDialog({ open, onOpenChange, onJoined }: JoinByCodeDialogProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [digits, setDigits] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [groupPreview, setGroupPreview] = useState<GroupPreview | null>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [alreadyPending, setAlreadyPending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open && !groupPreview) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [open, groupPreview]);

  const code = digits.join('');

  const resetState = () => {
    setDigits(['', '', '', '']);
    setGroupPreview(null);
    setAlreadyMember(false);
    setAlreadyPending(false);
  };

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter' && code.length === 4) {
      handleLookup();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length > 0) {
      const newDigits = ['', '', '', ''];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setDigits(newDigits);
      const focusIdx = Math.min(pasted.length, 3);
      inputRefs.current[focusIdx]?.focus();
    }
  };

  const fetchJoinStats = async (groupId: string) => {
    const { data } = await (supabase as any)
      .rpc('get_group_member_count_for_join', { _group_id: groupId })
      .maybeSingle();
    return {
      memberCount: Number(data?.member_count ?? 0),
      joinMemberLimit: data?.join_member_limit ?? null,
    };
  };

  const handleLookup = async () => {
    if (!user) return;
    if (code.length !== 4 || !/^\d{4}$/.test(code)) {
      toast({ title: 'Mã không hợp lệ', description: 'Vui lòng nhập đúng 4 chữ số', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('id, name, description, class_code, instructor_name, created_at, image_url, created_by, zalo_link, join_member_limit, join_require_approval')
        .eq('join_code', code)
        .eq('allow_join_by_code', true)
        .single();

      if (groupError || !group) {
        toast({ title: 'Mã không tồn tại', description: 'Mã tham gia không đúng hoặc đã bị tắt', variant: 'destructive' });
        return;
      }

      const [stats, leaderRes, existingRes, pendingRes] = await Promise.all([
        fetchJoinStats(group.id),
        supabase.from('profiles').select('full_name').eq('id', group.created_by).single(),
        supabase.from('group_members').select('id').eq('group_id', group.id).eq('user_id', user.id).maybeSingle(),
        supabase.from('pending_approvals').select('id').eq('group_id', group.id).eq('user_id', user.id).eq('status', 'pending').maybeSingle(),
      ]);

      setAlreadyMember(!!existingRes.data);
      setAlreadyPending(!!pendingRes.data);
      setGroupPreview({
        ...group,
        memberCount: stats.memberCount,
        leaderName: leaderRes.data?.full_name || null,
        joinMemberLimit: stats.joinMemberLimit ?? (group as any).join_member_limit ?? null,
        joinRequireApproval: (group as any).join_require_approval ?? true,
      });
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmJoin = async () => {
    if (!user || !profile || !groupPreview) return;

    setIsJoining(true);
    try {
      if (groupPreview.joinRequireApproval) {
        const { error: approvalError } = await supabase
          .from('pending_approvals')
          .insert({ group_id: groupPreview.id, user_id: user.id, status: 'pending' });

        if (approvalError) {
          if (approvalError.code === '23505') {
            setAlreadyPending(true);
            toast({ title: 'Đã gửi yêu cầu', description: 'Bạn đã gửi yêu cầu tham gia project này rồi, vui lòng chờ duyệt', variant: 'destructive' });
          } else {
            throw approvalError;
          }
          return;
        }

        await logActivity({
          userId: user.id,
          userName: profile.full_name,
          action: 'REQUEST_JOIN_BY_CODE',
          actionType: 'project_member',
          description: `Gửi yêu cầu tham gia project "${groupPreview.name}" bằng mã (chờ duyệt)`,
          groupId: groupPreview.id,
        });

        toast({ title: 'Đã gửi yêu cầu!', description: `Yêu cầu tham gia "${groupPreview.name}" đã được gửi. Vui lòng chờ trưởng nhóm duyệt.` });
        resetState();
        onOpenChange(false);
        onJoined();
      } else {
        const { error: joinError } = await supabase
          .from('group_members')
          .insert({ group_id: groupPreview.id, user_id: user.id, role: 'project_member' });

        if (joinError) {
          if (joinError.message?.includes('giới hạn')) {
            const stats = await fetchJoinStats(groupPreview.id);
            setGroupPreview((prev) => prev ? { ...prev, memberCount: stats.memberCount, joinMemberLimit: stats.joinMemberLimit } : prev);
            toast({ title: 'Không thể tham gia', description: 'Project đã đạt giới hạn thành viên', variant: 'destructive' });
          } else if (joinError.message?.includes('duplicate') || joinError.code === '23505') {
            setAlreadyMember(true);
            toast({ title: 'Đã là thành viên', description: 'Bạn đã tham gia project này rồi', variant: 'destructive' });
          } else {
            throw joinError;
          }
          return;
        }

        await logActivity({
          userId: user.id,
          userName: profile.full_name,
          action: 'JOIN_BY_CODE',
          actionType: 'project_member',
          description: `Tham gia project "${groupPreview.name}" bằng mã`,
          groupId: groupPreview.id,
        });

        toast({ title: 'Tham gia thành công!', description: `Bạn đã tham gia project "${groupPreview.name}"` });
        resetState();
        onOpenChange(false);
        onJoined();
      }
    } catch (error: any) {
      console.error('Join by code error:', error);
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setIsJoining(false);
    }
  };

  const isFull = groupPreview?.joinMemberLimit != null && groupPreview.memberCount >= groupPreview.joinMemberLimit;
  const canJoin = groupPreview && !alreadyMember && !alreadyPending && !isFull;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
        {!groupPreview ? (
          /* ── Code Entry Screen ── */
          <div className="flex flex-col items-center px-6 py-8 space-y-5">
            {/* Illustration */}
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl scale-125" />
              <img
                src={joinCodeIllustration}
                alt="Join code illustration"
                width={120}
                height={120}
                className="relative z-10 drop-shadow-lg"
              />
            </div>

            {/* Title & Description */}
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Nhập mã tham gia
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
                Nhập mã <span className="font-semibold text-foreground">4 chữ số</span> được trưởng nhóm cung cấp để tìm và tham gia project
              </p>
            </div>

            {/* 4 Digit Boxes */}
            <div className="flex items-center gap-3" onPaste={handlePaste}>
              {digits.map((digit, i) => (
                <div key={i} className="relative">
                  <input
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className={`
                      w-14 h-16 text-center text-2xl font-bold rounded-xl
                      border-2 bg-muted/30 outline-none transition-all duration-200
                      ${digit
                        ? 'border-primary/50 bg-primary/5 text-foreground shadow-sm shadow-primary/10'
                        : 'border-border hover:border-primary/30'
                      }
                      focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-primary/5
                    `}
                  />
                  {!digit && (
                    <span className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 text-2xl font-bold pointer-events-none">
                      {i + 1}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Helper text */}
            <p className="text-xs text-muted-foreground/70 text-center">
              💡 Hỗ trợ dán mã từ clipboard • Nhấn Enter để tìm
            </p>

            {/* Search Button */}
            <Button
              onClick={handleLookup}
              disabled={code.length !== 4 || isLoading}
              className="w-full h-11 text-sm font-semibold gap-2"
              size="lg"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Tìm Project
            </Button>
          </div>
        ) : (
          /* ── Preview Screen ── */
          <div className="flex flex-col">
            <Card className="border-0 shadow-none rounded-none overflow-hidden">
              {groupPreview.image_url && (
                <div className="w-full flex justify-center bg-muted/30 py-4">
                  <img
                    src={fixStorageUrl(groupPreview.image_url) || ''}
                    alt={groupPreview.name}
                    className="w-24 h-24 rounded-xl object-cover border-2 border-primary/20 shadow-md"
                    loading="lazy"
                  />
                </div>
              )}
              <CardContent className="p-5 space-y-4">
                <div className="text-center">
                  <h3 className="font-bold text-xl leading-tight">{groupPreview.name}</h3>
                  {groupPreview.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                      {groupPreview.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  {groupPreview.class_code && (
                    <Badge variant="secondary" className="gap-1">Lớp: {groupPreview.class_code}</Badge>
                  )}
                  {groupPreview.instructor_name && (
                    <Badge variant="outline" className="gap-1">GV: {groupPreview.instructor_name}</Badge>
                  )}
                  {groupPreview.joinRequireApproval && (
                    <Badge variant="outline" className="gap-1 text-warning border-warning/30">
                      <Clock className="w-3 h-3" />
                      Cần duyệt
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 text-sm pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Trưởng nhóm:</span>
                    <span className="font-medium">{groupPreview.leaderName || 'Không rõ'}</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        Thành viên:
                      </span>
                      <span className="font-medium">
                        {groupPreview.memberCount}
                        {groupPreview.joinMemberLimit != null
                          ? <span className="text-muted-foreground"> / {groupPreview.joinMemberLimit} người</span>
                          : <span className="text-muted-foreground"> người (không giới hạn)</span>
                        }
                      </span>
                    </div>
                    {groupPreview.joinMemberLimit != null && (
                      <div className="space-y-1">
                        <Progress
                          value={(groupPreview.memberCount / groupPreview.joinMemberLimit) * 100}
                          className={`h-2 ${!alreadyMember && !alreadyPending && isFull ? '[&>div]:bg-destructive' : ''}`}
                        />
                        <span className={`text-xs font-medium ${!alreadyMember && !alreadyPending && isFull ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {alreadyMember
                            ? '✅ Bạn đã là thành viên của project này'
                            : alreadyPending
                              ? '⏳ Đã gửi yêu cầu — đang chờ duyệt'
                              : isFull
                                ? '🚫 Đã đầy — không nhận thêm thành viên'
                                : `✅ Còn nhận ${groupPreview.joinMemberLimit - groupPreview.memberCount} thành viên`
                          }
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Ngày tạo:
                    </span>
                    <span className="font-medium">{format(new Date(groupPreview.created_at), 'dd/MM/yyyy', { locale: vi })}</span>
                  </div>
                  {groupPreview.zalo_link && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Nhóm Zalo:</span>
                      <a href={groupPreview.zalo_link} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                        Tham gia Zalo
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Status banners */}
            <div className="px-5 pb-5 space-y-3">
              {alreadyMember ? (
                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <UserCheck className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-primary">Đã là thành viên</p>
                    <p className="text-xs text-primary/80">Bạn đã tham gia project này rồi.</p>
                  </div>
                </div>
              ) : alreadyPending ? (
                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <Clock className="w-5 h-5 text-warning shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-warning">Đang chờ duyệt</p>
                    <p className="text-xs text-warning/80">Bạn đã gửi yêu cầu tham gia, vui lòng chờ trưởng nhóm duyệt.</p>
                  </div>
                </div>
              ) : isFull ? (
                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <XCircle className="w-5 h-5 text-destructive shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-destructive">Không thể tham gia</p>
                    <p className="text-xs text-destructive/80">Project đã đạt giới hạn thành viên.</p>
                  </div>
                </div>
              ) : null}

              {canJoin && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-accent/10 border border-accent/20">
                  <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-accent">
                      {groupPreview.joinRequireApproval ? 'Sẵn sàng gửi yêu cầu' : 'Sẵn sàng tham gia'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {groupPreview.joinRequireApproval
                        ? 'Yêu cầu sẽ được gửi đến trưởng nhóm để duyệt'
                        : groupPreview.joinMemberLimit != null
                          ? `Còn ${groupPreview.joinMemberLimit - groupPreview.memberCount} chỗ trống`
                          : 'Project không giới hạn số lượng thành viên'
                      }
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-1" onClick={resetState}>
                  <ArrowLeft className="w-4 h-4" />
                  Quay lại
                </Button>
                {canJoin && (
                  <Button className="flex-1" onClick={handleConfirmJoin} disabled={isJoining}>
                    {isJoining ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {groupPreview.joinRequireApproval ? 'Gửi yêu cầu' : 'Xác nhận tham gia'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
