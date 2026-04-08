import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogFooter, DialogDescription, DialogHeader } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { r2Storage } from '@/lib/r2Storage';
import { useToast } from '@/hooks/use-toast';
import { Shield, Wrench, AlertTriangle, FileText, Clock, Save, Edit, CheckCircle2, HelpCircle, Bug, Video, Upload, Link, Loader2, Mail, Plus, Palette, ChevronDown, X, Trash2, HardDrive, History, Music, BarChart3, Smartphone } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import AdminDataMigration from '@/components/AdminDataMigration';

import AdminUserAnalytics from '@/components/AdminUserAnalytics';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import uehLogoWhite from '@/assets/t-nexus-text-white.png';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

export default function AdminSystem() {
  const { isAdmin, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  

  // Maintenance state
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [showGuidePopover, setShowGuidePopover] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('Hệ thống đang bảo trì, vui lòng quay lại sau.');
  const [maintenanceHours, setMaintenanceHours] = useState(0);
  const [customHours, setCustomHours] = useState('');
  const [maintenanceStart, setMaintenanceStart] = useState('');
  const [maintenanceEnd, setMaintenanceEnd] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false);
  const [maintenanceScope, setMaintenanceScope] = useState<'post_login' | 'full'>('post_login');

  // Original maintenance state for comparison
  const [origMaintenanceEnabled, setOrigMaintenanceEnabled] = useState(false);



  // Error logging state
  const [errorLoggingEnabled, setErrorLoggingEnabled] = useState(true);
  const [savingErrorLogging, setSavingErrorLogging] = useState(false);

  // Email verification state
  const [emailVerificationEnabled, setEmailVerificationEnabled] = useState(false);
  const [savingEmailVerification, setSavingEmailVerification] = useState(false);

  // Email digest state
  const [emailDigestEnabled, setEmailDigestEnabled] = useState(true);
  const [emailDeadlineHours, setEmailDeadlineHours] = useState(24);
  const [emailScheduledHour, setEmailScheduledHour] = useState(8);
  const [emailScheduledMinute, setEmailScheduledMinute] = useState(0);
  const [savingEmailDigest, setSavingEmailDigest] = useState(false);
  const [sendingDigest, setSendingDigest] = useState(false);
  const [digestResult, setDigestResult] = useState<{ sent: number; skipped: number; total_users: number } | null>(null);
  const [emailSentToday, setEmailSentToday] = useState(0);
  const [recentEmailLogs, setRecentEmailLogs] = useState<any[]>([]);
  const [emailHistoryOpen, setEmailHistoryOpen] = useState(false);
  const [emailHistoryLogs, setEmailHistoryLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Notification letter state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifDialogOpen, setNotifDialogOpen] = useState(false);
  const [editingNotif, setEditingNotif] = useState<any>(null);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifContent, setNotifContent] = useState('');
  const [notifMode, setNotifMode] = useState<'pre_login' | 'post_login'>('post_login');
  const [notifMinSeconds, setNotifMinSeconds] = useState(15);
  const [notifExpiresAt, setNotifExpiresAt] = useState('');
  const [savingNotif, setSavingNotif] = useState(false);
  const [notifTargetUserIds, setNotifTargetUserIds] = useState<string[]>([]);
  const [allProfiles, setAllProfiles] = useState<{id: string; full_name: string; student_id: string; email: string}[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Video background state
  const [videoBgEnabled, setVideoBgEnabled] = useState(false);
  const [videoBgLandingOpacity, setVideoBgLandingOpacity] = useState(20);
  const [videoBgDashboardOpacity, setVideoBgDashboardOpacity] = useState(20);
  const [videoBgTransitionOpacity, setVideoBgTransitionOpacity] = useState(15);
  const [videoBgUrl, setVideoBgUrl] = useState('');
  const [savingVideo, setSavingVideo] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);


  const [activeTab, setActiveTab] = useState('system');

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchSettings();
  }, [isAdmin, isLoading]);

  const fetchSettings = async () => {
    try {
    const [maintenanceRes, errorLoggingRes, videoRes, emailDigestRes, emailVerifRes] = await Promise.all([
      supabase.from('system_settings').select('*').eq('key', 'maintenance_mode').maybeSingle(),
      supabase.from('system_settings').select('*').eq('key', 'error_logging').maybeSingle(),
      supabase.from('system_settings').select('*').eq('key', 'dashboard_video_bg').maybeSingle(),
      supabase.from('system_settings').select('*').eq('key', 'email_daily_digest').maybeSingle(),
      supabase.from('system_settings').select('*').eq('key', 'require_email_verification').maybeSingle(),
    ]);

      if (maintenanceRes.data?.value) {
        const val = maintenanceRes.data.value as { enabled?: boolean; message?: string; duration_hours?: number; duration_days?: number; start_at?: string; end_at?: string; scope?: string };
        setMaintenanceEnabled(val.enabled ?? false);
        setOrigMaintenanceEnabled(val.enabled ?? false);
        setMaintenanceMessage(val.message ?? 'Hệ thống đang bảo trì, vui lòng quay lại sau.');
        setMaintenanceScope((val.scope as 'post_login' | 'full') ?? 'post_login');
        // Support both legacy duration_days and new duration_hours
        const hours = val.duration_hours ?? (val.duration_days ? val.duration_days * 24 : 0);
        setMaintenanceHours(hours);
        if (hours > 0 && ![1,2,3,6,12,24,48,72,168].includes(hours)) setCustomHours(String(hours));
        setMaintenanceStart(val.start_at ?? '');
        setMaintenanceEnd(val.end_at ?? '');
      }



      if (errorLoggingRes.data?.value) {
        const val = errorLoggingRes.data.value as { enabled?: boolean };
        setErrorLoggingEnabled(val.enabled ?? true);
      }

      if (videoRes.data?.value) {
        const val = videoRes.data.value as { enabled?: boolean; landing_opacity?: number; dashboard_opacity?: number; transition_opacity?: number; loading_opacity?: number; opacity?: number; url?: string };
        setVideoBgEnabled(val.enabled ?? false);
        setVideoBgLandingOpacity(Math.round((val.landing_opacity ?? val.opacity ?? 0.2) * 100));
        setVideoBgDashboardOpacity(Math.round((val.dashboard_opacity ?? val.opacity ?? 0.2) * 100));
        setVideoBgTransitionOpacity(Math.round((val.transition_opacity ?? val.loading_opacity ?? 0.15) * 100));
        setVideoBgUrl(val.url ?? '');
      }

      if (emailDigestRes.data?.value) {
        const val = emailDigestRes.data.value as { enabled?: boolean; deadline_hours?: number; scheduled_hour?: number; scheduled_minute?: number };
        setEmailDigestEnabled(val.enabled ?? true);
        setEmailDeadlineHours(val.deadline_hours ?? 24);
        setEmailScheduledHour(val.scheduled_hour ?? 8);
        setEmailScheduledMinute(val.scheduled_minute ?? 0);
      }

      if (emailVerifRes.data?.value) {
        const val = emailVerifRes.data.value as { enabled?: boolean };
        setEmailVerificationEnabled(val.enabled ?? false);
      }

      // Fetch email sent today count
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('email_logs')
        .select('id', { count: 'exact', head: true })
        .eq('email_type', 'daily_digest')
        .gte('sent_at', todayStart.toISOString());
      setEmailSentToday(count || 0);

      // Recent email logs
      const { data: logs } = await supabase
        .from('email_logs')
        .select('*')
        .eq('email_type', 'daily_digest')
        .order('sent_at', { ascending: false })
        .limit(5);
      setRecentEmailLogs(logs || []);

      // Fetch system notifications
      const { data: notifs } = await supabase
        .from('system_notifications')
        .select('*')
        .order('created_at', { ascending: false });
      setNotifications(notifs || []);

      // Fetch all profiles for user targeting
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, student_id, email')
        .eq('is_approved', true)
        .order('full_name');
      setAllProfiles(profiles || []);
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMaintenance = async () => {
    setSaving(true);
    try {
      const now = new Date();
      const endAt = maintenanceEnabled && maintenanceHours > 0 ? new Date(now.getTime() + maintenanceHours * 3600000).toISOString() : null;
      const startAt = maintenanceEnabled ? now.toISOString() : null;
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'maintenance_mode',
          value: {
            enabled: maintenanceEnabled,
            message: maintenanceMessage,
            scope: maintenanceScope,
            duration_hours: maintenanceEnabled ? (maintenanceHours || null) : null,
            start_at: startAt,
            end_at: endAt,
          },
          updated_at: now.toISOString(),
          updated_by: user?.id || null,
        }, { onConflict: 'key' });

      if (error) throw error;
      setOrigMaintenanceEnabled(maintenanceEnabled);

      if (maintenanceEnabled) {
        setMaintenanceStart(startAt!);
        setMaintenanceEnd(endAt ?? '');
      } else {
        setMaintenanceStart('');
        setMaintenanceEnd('');
        setMaintenanceHours(0);
        setCustomHours('');
      }

      toast({
        title: 'Đã lưu cài đặt',
        description: maintenanceEnabled
          ? 'Chế độ bảo trì đã được BẬT.'
          : 'Chế độ bảo trì đã TẮT.',
      });
    } catch (err) {
      toast({ title: 'Lỗi', description: 'Không thể lưu cài đặt', variant: 'destructive' });
    } finally {
      setSaving(false);
      setShowMaintenanceConfirm(false);
    }
  };



  if (isLoading || loading) {
    return (
      <>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header + inline tabs */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-foreground" />
            <div>
              <h1 className="text-2xl font-bold">Quản trị hệ thống</h1>
              <p className="text-muted-foreground text-sm">Các chức năng quản trị đặc biệt dành cho Admin chính</p>
            </div>
          </div>

          {/* Inline tabs */}
          <div className="flex flex-wrap gap-1.5">
            {([
              { id: 'system', label: 'Hệ thống', icon: Wrench },
              { id: 'notifications', label: 'Thông báo', icon: Mail },
              { id: 'appearance', label: 'Giao diện', icon: Palette },
              { id: 'analytics', label: 'Phân tích', icon: BarChart3 },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  "whitespace-nowrap border",
                  activeTab === tab.id
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ═══ TAB: Hệ thống ═══ */}
        {activeTab === 'system' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Maintenance Mode */}
              <Card className="border border-border h-fit">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-warning/10">
                        <Wrench className="w-4 h-4 text-warning" />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          Khóa hệ thống
                          {maintenanceEnabled && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">BẬT</Badge>
                          )}
                        </CardTitle>
                      </div>
                    </div>
                    <Switch
                      checked={maintenanceEnabled}
                      onCheckedChange={(checked) => {
                        setMaintenanceEnabled(checked);
                        setShowMaintenanceConfirm(true);
                      }}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <p className="text-xs text-muted-foreground">
                    Khi bật, toàn bộ thành viên (trừ Admin) sẽ không thể truy cập hệ thống.
                  </p>

                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Phạm vi khóa
                    </Label>
                    <Select value={maintenanceScope} onValueChange={(v: any) => setMaintenanceScope(v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="post_login" className="text-xs">Sau đăng nhập</SelectItem>
                        <SelectItem value="full" className="text-xs">Toàn bộ hệ thống</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Thời gian bảo trì
                      </Label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { value: 0, label: 'Vĩnh viễn' },
                          { value: 1, label: '1 giờ' },
                          { value: 2, label: '2 giờ' },
                          { value: 3, label: '3 giờ' },
                          { value: 6, label: '6 giờ' },
                          { value: 12, label: '12 giờ' },
                          { value: 24, label: '1 ngày' },
                          { value: 48, label: '2 ngày' },
                          { value: 72, label: '3 ngày' },
                          { value: 168, label: '1 tuần' },
                        ].map((opt) => (
                          <Button
                            key={opt.value}
                            type="button"
                            size="sm"
                            variant={maintenanceHours === opt.value ? 'default' : 'outline'}
                            className="h-7 text-xs px-2.5"
                            onClick={() => { setMaintenanceHours(opt.value); setCustomHours(''); }}
                          >
                            {opt.label}
                          </Button>
                        ))}
                        <Input
                          type="number"
                          min={1}
                          placeholder="Tùy chỉnh (giờ)"
                          value={customHours}
                          onChange={(e) => {
                            setCustomHours(e.target.value);
                            const n = parseInt(e.target.value);
                            if (!isNaN(n) && n > 0) setMaintenanceHours(n);
                          }}
                          className="h-7 w-28 text-xs"
                        />
                      </div>
                    </div>
                    {/* Schedule info box */}
                    {maintenanceStart && maintenanceEnd ? (
                      <div className="rounded-lg border border-warning/30 bg-warning/5 p-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Bắt đầu khóa:</span>
                          <span className="text-sm font-medium">{format(new Date(maintenanceStart), "HH:mm - dd/MM/yyyy", { locale: vi })}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Dự kiến mở lại:</span>
                          <span className="text-sm font-semibold text-primary">{format(new Date(maintenanceEnd), "HH:mm - dd/MM/yyyy", { locale: vi })}</span>
                        </div>
                      </div>
                    ) : maintenanceHours > 0 ? (
                      <div className="rounded-lg border border-muted bg-muted/30 p-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Bắt đầu khóa:</span>
                          <span className="text-sm font-medium">Khi bấm xác nhận</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Dự kiến mở lại:</span>
                          <span className="text-sm font-semibold text-primary">{format(new Date(Date.now() + maintenanceHours * 3600000), "HH:mm - dd/MM/yyyy", { locale: vi })}</span>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Maintenance message */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Thông báo bảo trì</Label>
                    <Textarea
                      value={maintenanceMessage}
                      onChange={(e) => setMaintenanceMessage(e.target.value)}
                      placeholder="Nhập thông báo bảo trì..."
                      rows={2}
                      className="text-sm resize-none"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">


                {/* Error Logging */}
                <Card className="border border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-destructive/10">
                          <Bug className="w-4 h-4 text-destructive" />
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            Ghi lỗi hệ thống
                            <Badge variant={errorLoggingEnabled ? 'default' : 'outline'} className="text-[10px] px-1.5 py-0">
                              {errorLoggingEnabled ? 'BẬT' : 'TẮT'}
                            </Badge>
                          </CardTitle>
                        </div>
                      </div>
                      <Switch
                        checked={errorLoggingEnabled}
                        disabled={savingErrorLogging}
                        onCheckedChange={async (checked) => {
                          setSavingErrorLogging(true);
                          try {
                            const { error } = await supabase
                              .from('system_settings')
                              .upsert({
                                key: 'error_logging',
                                value: { enabled: checked },
                                updated_at: new Date().toISOString(),
                                updated_by: user?.id || null,
                              }, { onConflict: 'key' });
                            if (error) throw error;
                            setErrorLoggingEnabled(checked);
                            toast({ title: checked ? 'Đã bật ghi lỗi' : 'Đã tắt ghi lỗi' });
                          } catch {
                            toast({ title: 'Lỗi', variant: 'destructive' });
                          } finally {
                            setSavingErrorLogging(false);
                          }
                        }}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">
                      {errorLoggingEnabled
                        ? 'Tự động ghi lại các lỗi runtime, promise rejection và console error.'
                        : 'Không ghi lỗi — lỗi chỉ hiện trong console trình duyệt.'}
                    </p>
                  </CardContent>
                </Card>

                {/* Email Verification Toggle */}
                <Card className="border border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Mail className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            Xác thực email khi đăng ký
                            <Badge variant={emailVerificationEnabled ? 'default' : 'outline'} className="text-[10px] px-1.5 py-0">
                              {emailVerificationEnabled ? 'BẬT' : 'TẮT'}
                            </Badge>
                          </CardTitle>
                        </div>
                      </div>
                      <Switch
                        checked={emailVerificationEnabled}
                        disabled={savingEmailVerification}
                        onCheckedChange={async (checked) => {
                          setSavingEmailVerification(true);
                          try {
                            const { error } = await supabase
                              .from('system_settings')
                              .upsert({
                                key: 'require_email_verification',
                                value: { enabled: checked },
                                updated_at: new Date().toISOString(),
                                updated_by: user?.id || null,
                              }, { onConflict: 'key' });
                            if (error) throw error;
                            setEmailVerificationEnabled(checked);
                            toast({
                              title: checked ? 'Đã bật xác thực email' : 'Đã tắt xác thực email',
                              description: checked
                                ? 'Người đăng ký mới phải xác thực email trước khi hoàn tất.'
                                : 'Tài khoản được tạo ngay mà không cần xác thực email.',
                            });
                          } catch {
                            toast({ title: 'Lỗi', variant: 'destructive' });
                          } finally {
                            setSavingEmailVerification(false);
                          }
                        }}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">
                      {emailVerificationEnabled
                        ? 'Khi đăng ký, hệ thống sẽ gửi link xác thực qua email. User phải xác thực mới hoàn tất đăng ký.'
                        : 'Bỏ qua bước xác thực email — tài khoản được tạo thành công ngay lập tức.'}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1.5">
                      Không ảnh hưởng thành viên do Admin tạo thủ công.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Data Migration - full width */}
              <div className="lg:col-span-2">
                <Card className="border border-border">
                  <Collapsible>
                    <CardHeader className="pb-3">
                      <CollapsibleTrigger className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <HardDrive className="w-4 h-4 text-primary" />
                          </div>
                          <div className="text-left">
                            <CardTitle className="text-base">Di dời dữ liệu</CardTitle>
                            <CardDescription className="text-xs">Xuất/nhập toàn bộ dữ liệu hệ thống (42 bảng + 8 bucket storage)</CardDescription>
                          </div>
                        </div>
                        <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <AdminDataMigration />
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              </div>
            </div>
        )}

        {/* ═══ TAB: Thông báo ═══ */}
        {activeTab === 'notifications' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Notification Letter Management */}
              <Card className="border border-border h-fit">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-accent/10"><Mail className="w-4 h-4 text-accent" /></div>
                      <div>
                        <CardTitle className="text-base">Thư thông báo bắt buộc</CardTitle>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Hiển thị thông báo bắt buộc xem trước khi tắt</p>
                      </div>
                    </div>
                    <Button size="sm" className="gap-1.5" onClick={() => { setEditingNotif(null); setNotifTitle(''); setNotifContent(''); setNotifMode('post_login'); setNotifMinSeconds(15); setNotifExpiresAt(''); setNotifTargetUserIds([]); setUserSearchQuery(''); setNotifDialogOpen(true); }}>
                      <Plus className="w-3.5 h-3.5" /> Tạo thư mới
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 space-y-2">
                      <Mail className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                      <p className="text-xs text-muted-foreground">Chưa có thư thông báo nào</p>
                    </div>
                  ) : notifications.map((notif: any) => (
                    <div key={notif.id} className="group rounded-lg border bg-card hover:bg-muted/30 transition-colors px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: notif.is_active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.3)' }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{notif.title}</p>
                            <div className="flex items-center flex-wrap gap-2 text-[11px] text-muted-foreground mt-0.5">
                              <span>{notif.display_mode === 'pre_login' ? '🔓 Trước ĐN' : '🔒 Sau ĐN'}</span>
                              <span className="inline-flex items-center gap-0.5"><Clock className="w-3 h-3" />{notif.min_view_seconds}s</span>
                              {notif.expires_at && <span>⏳ {format(new Date(notif.expires_at), "dd/MM/yy", { locale: vi })}</span>}
                              <span>📅 {format(new Date(notif.created_at), "dd/MM/yy HH:mm", { locale: vi })}</span>
                              {Array.isArray(notif.target_user_ids) && notif.target_user_ids.length > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-accent font-medium">
                                  👤 {notif.target_user_ids.length} người
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant={notif.is_active ? 'default' : 'outline'} className="text-[10px] px-1.5 py-0 shrink-0">
                            {notif.is_active ? 'Bật' : 'Tắt'}
                          </Badge>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => {
                            setEditingNotif(notif); setNotifTitle(notif.title); setNotifContent(notif.content); setNotifMode(notif.display_mode); setNotifMinSeconds(notif.min_view_seconds);
                            setNotifExpiresAt(notif.expires_at ? new Date(notif.expires_at).toISOString().slice(0, 16) : '');
                            setNotifTargetUserIds(Array.isArray(notif.target_user_ids) ? notif.target_user_ids : []);
                            setUserSearchQuery('');
                            setNotifDialogOpen(true);
                          }}><Edit className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={async () => {
                            if (!confirm('Bạn có chắc muốn xóa thư thông báo này?')) return;
                            await supabase.from('system_notifications').delete().eq('id', notif.id);
                            // Also clean up related dismissals
                            await supabase.from('notification_dismissals').delete().eq('notification_id', notif.id);
                            setNotifications(prev => prev.filter((n: any) => n.id !== notif.id));
                            toast({ title: 'Đã xóa thông báo', description: notif.title });
                          }}><Trash2 className="w-3.5 h-3.5" /></Button>
                          <Switch checked={notif.is_active} onCheckedChange={async (checked) => {
                            await supabase.from('system_notifications').update({ is_active: checked } as any).eq('id', notif.id);
                            setNotifications(prev => prev.map((n: any) => n.id === notif.id ? { ...n, is_active: checked } : n));
                          }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Email Digest */}
              <Card className="border border-border h-fit">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Mail className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          Email Digest hàng ngày
                          <Badge variant={emailDigestEnabled ? 'default' : 'outline'} className="text-[10px] px-1.5 py-0">
                            {emailDigestEnabled ? 'BẬT' : 'TẮT'}
                          </Badge>
                        </CardTitle>
                      </div>
                    </div>
                    <Switch checked={emailDigestEnabled} onCheckedChange={setEmailDigestEnabled} />
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Gửi 1 email tổng hợp/user/ngày gồm deadline sắp hết + task mới.
                  </p>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> Giờ gửi hàng ngày</Label>
                      <div className="flex items-center gap-2">
                        <Select value={String(emailScheduledHour)} onValueChange={(v) => setEmailScheduledHour(Number(v))}>
                          <SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{Array.from({length:24},(_,i)=>(<SelectItem key={i} value={String(i)} className="text-xs">{String(i).padStart(2,'0')}</SelectItem>))}</SelectContent>
                        </Select>
                        <span className="text-sm font-bold">:</span>
                        <Select value={String(emailScheduledMinute)} onValueChange={(v) => setEmailScheduledMinute(Number(v))}>
                          <SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{[0,15,30,45].map(m=>(<SelectItem key={m} value={String(m)} className="text-xs">{String(m).padStart(2,'0')}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Nhắc deadline trong: {emailDeadlineHours}h tới</Label>
                      <Slider value={[emailDeadlineHours]} onValueChange={(v) => setEmailDeadlineHours(v[0])} min={12} max={48} step={12} className="mt-2" />
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>12h</span><span>24h</span><span>36h</span><span>48h</span></div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Đã gửi hôm nay: <span className="font-bold text-foreground">{emailSentToday}</span>/100</span>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={async () => {
                            setEmailHistoryOpen(true);
                            setLoadingHistory(true);
                            try {
                              const { data } = await supabase.from('email_send_log').select('*').in('template_name', ['daily_digest', 'transactional_emails']).order('created_at', { ascending: false }).limit(50);
                              setEmailHistoryLogs(data || []);
                            } catch {} finally { setLoadingHistory(false); }
                          }}>
                            <History className="w-3 h-3" /> Lịch sử
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1.5 text-xs" disabled={sendingDigest} onClick={async () => {
                            setSendingDigest(true); setDigestResult(null);
                            try {
                              const { data, error } = await supabase.functions.invoke('email-digest', { body: { force: true } });
                              if (error) throw error;
                              setDigestResult(data); setEmailSentToday(prev => prev + (data?.sent || 0));
                              toast({ title: `Đã gửi ${data?.sent || 0} email`, description: `Bỏ qua ${data?.skipped || 0} user` });
                              const { data: logs } = await supabase.from('email_logs').select('*').eq('email_type', 'daily_digest').order('sent_at', { ascending: false }).limit(5);
                              setRecentEmailLogs(logs || []);
                            } catch (err: any) { toast({ title: 'Lỗi', description: err.message, variant: 'destructive' }); }
                            finally { setSendingDigest(false); }
                          }}>
                            {sendingDigest ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />} Gửi ngay
                          </Button>
                        </div>
                      </div>
                      {digestResult && (
                        <div className="rounded-lg border bg-muted/30 p-2.5 space-y-1 text-xs">
                          <p>✅ Đã gửi: <strong>{digestResult.sent}</strong> email</p>
                          <p>⏭️ Bỏ qua: <strong>{digestResult.skipped}</strong> user</p>
                          <p>👥 Tổng user: <strong>{digestResult.total_users}</strong></p>
                        </div>
                      )}
                      {recentEmailLogs.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[11px] font-medium text-muted-foreground">Email gần đây:</p>
                          {recentEmailLogs.map((log: any) => (
                            <div key={log.id} className="flex items-center justify-between text-[11px] bg-muted/20 rounded px-2 py-1">
                              <span className="truncate max-w-[180px]">{log.recipient_email}</span>
                              <span className="text-muted-foreground">{format(new Date(log.sent_at), "HH:mm dd/MM", { locale: vi })}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    className="w-full gap-2"
                    disabled={savingEmailDigest}
                    onClick={async () => {
                      setSavingEmailDigest(true);
                      try {
                        const value = { enabled: emailDigestEnabled, deadline_hours: emailDeadlineHours, scheduled_hour: emailScheduledHour, scheduled_minute: emailScheduledMinute };
                        const { data: existing } = await supabase.from('system_settings').select('id').eq('key', 'email_daily_digest').maybeSingle();
                        if (existing) {
                          await supabase.from('system_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', 'email_daily_digest');
                        } else {
                          await supabase.from('system_settings').insert({ key: 'email_daily_digest', value });
                        }
                        toast({ title: 'Đã lưu cài đặt Email Digest' });
                      } catch { toast({ title: 'Lỗi', variant: 'destructive' }); }
                      finally { setSavingEmailDigest(false); }
                    }}
                  >
                    <Save className="w-4 h-4" /> Lưu cài đặt Email Digest
                  </Button>
                </CardContent>
              </Card>
            </div>
        )}

        {/* ═══ TAB: Giao diện ═══ */}
        {activeTab === 'appearance' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Video Background */}
              <Card className="border border-border h-fit">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-accent/10">
                        <Video className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          Video nền Dashboard
                          <Badge variant={videoBgEnabled ? 'default' : 'outline'} className="text-[10px] px-1.5 py-0">
                            {videoBgEnabled ? 'BẬT' : 'TẮT'}
                          </Badge>
                        </CardTitle>
                      </div>
                    </div>
                    <Switch
                      checked={videoBgEnabled}
                      onCheckedChange={setVideoBgEnabled}
                    />
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <Tabs defaultValue="upload" className="w-full">
                    <TabsList className="w-full grid grid-cols-2">
                      <TabsTrigger value="upload" className="gap-1.5 text-xs">
                        <Upload className="w-3 h-3" /> Tải video lên
                      </TabsTrigger>
                      <TabsTrigger value="link" className="gap-1.5 text-xs">
                        <Link className="w-3 h-3" /> Dán link
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="upload" className="space-y-2 mt-2">
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/ogg"
                        className="block w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                        disabled={uploadingVideo}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingVideo(true);
                          try {
                            const fileName = `video-bg-${Date.now()}.${file.name.split('.').pop()}`;
                            const { data: uploadData, error: uploadError } = await r2Storage
                              .from('system-assets')
                              .upload(fileName, file, { upsert: true });
                            if (uploadError) throw uploadError;
                            setVideoBgUrl(uploadData?.publicUrl || '');
                            toast({ title: 'Đã tải video lên', description: file.name });
                          } catch (err: any) {
                            toast({ title: 'Lỗi upload', description: err.message, variant: 'destructive' });
                          } finally {
                            setUploadingVideo(false);
                          }
                        }}
                      />
                      {uploadingVideo && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Đang tải lên...
                        </p>
                      )}
                    </TabsContent>
                    <TabsContent value="link" className="space-y-2 mt-2">
                      <Input
                        placeholder="https://example.com/video.mp4"
                        value={videoBgUrl}
                        onChange={(e) => setVideoBgUrl(e.target.value)}
                      />
                    </TabsContent>
                  </Tabs>

                  {videoBgUrl && (
                    <div className="rounded-lg border bg-muted/30 p-2">
                      <p className="text-[11px] text-muted-foreground truncate">🎬 {videoBgUrl}</p>
                    </div>
                  )}
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between text-xs text-muted-foreground h-8 px-2">
                        <span>Tùy chỉnh độ hiển thị từng trang</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Độ hiển thị trang Landing: {videoBgLandingOpacity}%</Label>
                        <Slider
                          value={[videoBgLandingOpacity]}
                          onValueChange={(v) => setVideoBgLandingOpacity(v[0])}
                          min={0}
                          max={100}
                          step={5}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Độ hiển thị trang Dashboard: {videoBgDashboardOpacity}%</Label>
                        <Slider
                          value={[videoBgDashboardOpacity]}
                          onValueChange={(v) => setVideoBgDashboardOpacity(v[0])}
                          min={0}
                          max={100}
                          step={5}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Độ hiển thị trang chờ đăng nhập (5s): {videoBgTransitionOpacity}%</Label>
                        <Slider
                          value={[videoBgTransitionOpacity]}
                          onValueChange={(v) => setVideoBgTransitionOpacity(v[0])}
                          min={0}
                          max={100}
                          step={5}
                          className="mt-2"
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                  <Button
                    className="w-full gap-2"
                    disabled={savingVideo}
                    onClick={async () => {
                      setSavingVideo(true);
                      try {
                        const value = { enabled: videoBgEnabled, landing_opacity: videoBgLandingOpacity / 100, dashboard_opacity: videoBgDashboardOpacity / 100, transition_opacity: videoBgTransitionOpacity / 100, url: videoBgUrl };
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('dashboard_video_bg_cache', JSON.stringify(value));
                        }
                        const { data: existing } = await supabase
                          .from('system_settings')
                          .select('id')
                          .eq('key', 'dashboard_video_bg')
                          .maybeSingle();
                        if (existing) {
                          await supabase.from('system_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', 'dashboard_video_bg');
                        } else {
                          await supabase.from('system_settings').insert({ key: 'dashboard_video_bg', value });
                        }
                        toast({ title: 'Đã lưu cài đặt video nền' });
                      } catch {
                        toast({ title: 'Lỗi', description: 'Không thể lưu', variant: 'destructive' });
                      } finally {
                        setSavingVideo(false);
                      }
                    }}
                  >
                    {savingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Lưu cài đặt video
                  </Button>
                </CardContent>
              </Card>

            </div>
        )}
        {/* ═══ TAB: Phân tích ═══ */}
        {activeTab === 'analytics' && (
          <AdminUserAnalytics />
        )}
      </div>

      {/* Maintenance Confirm Dialog */}
      <AlertDialog open={showMaintenanceConfirm} onOpenChange={setShowMaintenanceConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Xác nhận thay đổi trạng thái
            </AlertDialogTitle>
            <AlertDialogDescription>
              {maintenanceEnabled !== origMaintenanceEnabled ? (
                maintenanceEnabled
                  ? 'Bạn sắp BẬT chế độ bảo trì. Toàn bộ thành viên (trừ Admin) sẽ bị chặn truy cập hệ thống.'
                  : 'Bạn sắp TẮT chế độ bảo trì. Hệ thống sẽ hoạt động trở lại bình thường.'
              ) : (
                'Bạn muốn lưu các thay đổi cài đặt bảo trì?'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMaintenanceEnabled(origMaintenanceEnabled)}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveMaintenance} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Xác nhận'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Notification Letter Dialog */}
      <Dialog open={notifDialogOpen} onOpenChange={setNotifDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>{editingNotif ? 'Chỉnh sửa thư' : 'Tạo thư thông báo mới'}</DialogTitle>
          <DialogDescription className="sr-only">Quản lý thư thông báo bắt buộc</DialogDescription>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tiêu đề</Label>
              <Input value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} placeholder="Tiêu đề thông báo" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nội dung (hỗ trợ Markdown)</Label>
              <Textarea value={notifContent} onChange={(e) => setNotifContent(e.target.value)} rows={6} placeholder="Nội dung thư..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Chế độ hiển thị</Label>
                <Select value={notifMode} onValueChange={(v: any) => setNotifMode(v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre_login" className="text-xs">Trước đăng nhập</SelectItem>
                    <SelectItem value="post_login" className="text-xs">Sau đăng nhập</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Thời gian xem tối thiểu (giây)</Label>
                <Input type="number" min={5} max={120} value={notifMinSeconds} onChange={(e) => setNotifMinSeconds(Number(e.target.value))} className="h-8 text-xs" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hết hạn (để trống = vĩnh viễn)</Label>
              <Input type="datetime-local" value={notifExpiresAt} onChange={(e) => setNotifExpiresAt(e.target.value)} className="h-8 text-xs" />
            </div>
            {/* User targeting — only for post_login */}
            {notifMode === 'post_login' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Hiển thị cho (để trống = toàn bộ)</Label>
                {notifTargetUserIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {notifTargetUserIds.map(uid => {
                      const p = allProfiles.find(pr => pr.id === uid);
                      return (
                        <Badge key={uid} variant="secondary" className="text-[10px] gap-1 pr-1">
                          {p ? `${p.full_name} (${p.student_id})` : uid.slice(0, 8)}
                          <button
                            type="button"
                            className="ml-0.5 hover:text-destructive"
                            onClick={() => setNotifTargetUserIds(prev => prev.filter(id => id !== uid))}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      );
                    })}
                    <button
                      type="button"
                      className="text-[10px] text-destructive hover:underline"
                      onClick={() => setNotifTargetUserIds([])}
                    >
                      Xóa tất cả
                    </button>
                  </div>
                )}
                <Input
                  placeholder="Tìm theo tên, MSSV hoặc email..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="h-8 text-xs"
                />
                {userSearchQuery.trim().length >= 2 && (
                  <div className="border rounded-md max-h-[150px] overflow-y-auto divide-y divide-border">
                    {allProfiles
                      .filter(p => {
                        const q = userSearchQuery.toLowerCase();
                        return (
                          p.full_name.toLowerCase().includes(q) ||
                          p.student_id.toLowerCase().includes(q) ||
                          p.email.toLowerCase().includes(q)
                        ) && !notifTargetUserIds.includes(p.id);
                      })
                      .slice(0, 20)
                      .map(p => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors flex items-center justify-between"
                          onClick={() => {
                            setNotifTargetUserIds(prev => [...prev, p.id]);
                            setUserSearchQuery('');
                          }}
                        >
                          <span>{p.full_name} <span className="text-muted-foreground">({p.student_id})</span></span>
                          <Plus className="w-3 h-3 text-primary shrink-0" />
                        </button>
                      ))}
                    {allProfiles.filter(p => {
                      const q = userSearchQuery.toLowerCase();
                      return (p.full_name.toLowerCase().includes(q) || p.student_id.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)) && !notifTargetUserIds.includes(p.id);
                    }).length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">Không tìm thấy</p>
                    )}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {notifTargetUserIds.length === 0 ? '📢 Sẽ hiển thị cho toàn bộ thành viên' : `👤 Chỉ hiển thị cho ${notifTargetUserIds.length} người được chọn`}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifDialogOpen(false)}>Hủy</Button>
            <Button disabled={savingNotif || !notifTitle || !notifContent} onClick={async () => {
              setSavingNotif(true);
              try {
                const payload: any = { title: notifTitle, content: notifContent, display_mode: notifMode, min_view_seconds: notifMinSeconds, expires_at: notifExpiresAt || null, target_user_ids: notifTargetUserIds.length > 0 ? notifTargetUserIds : null };
                if (editingNotif) {
                  await supabase.from('system_notifications').update(payload).eq('id', editingNotif.id);
                } else {
                  payload.created_by = user!.id;
                  await supabase.from('system_notifications').insert([payload]);
                }
                const { data: notifs } = await supabase.from('system_notifications').select('*').order('created_at', { ascending: false });
                setNotifications(notifs || []);
                setNotifDialogOpen(false);
                toast({ title: editingNotif ? 'Đã cập nhật thư' : 'Đã tạo thư thông báo' });
              } catch (err: any) { toast({ title: 'Lỗi', description: err.message, variant: 'destructive' }); }
              finally { setSavingNotif(false); }
            }}>
              {savingNotif ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingNotif ? 'Cập nhật' : 'Tạo thư'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email History Dialog */}
      <Dialog open={emailHistoryOpen} onOpenChange={setEmailHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="w-4 h-4" /> Lịch sử gửi Email Digest</DialogTitle>
            <DialogDescription>50 bản ghi gần nhất từ hệ thống email queue</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[55vh]">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : emailHistoryLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Chưa có bản ghi nào</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Trạng thái</TableHead>
                    <TableHead className="text-xs">Thời gian</TableHead>
                    <TableHead className="text-xs">Lỗi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailHistoryLogs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs max-w-[180px] truncate">{log.recipient_email}</TableCell>
                      <TableCell>
                        <Badge variant={log.status === 'sent' ? 'default' : log.status === 'pending' ? 'secondary' : 'destructive'} className="text-[10px]">
                          {log.status === 'sent' ? '✅ Đã gửi' : log.status === 'pending' ? '⏳ Chờ' : log.status === 'failed' ? '❌ Lỗi' : log.status === 'dlq' ? '💀 DLQ' : log.status === 'rate_limited' ? '🚫 Rate limit' : log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(log.created_at), "HH:mm dd/MM/yyyy", { locale: vi })}</TableCell>
                      <TableCell className="text-xs text-destructive max-w-[200px] truncate" title={log.error_message || ''}>{log.error_message || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
