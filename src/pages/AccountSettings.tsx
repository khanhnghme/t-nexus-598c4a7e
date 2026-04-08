import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Locale } from '@/lib/i18n';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  CalendarDays, MessageSquare, BookOpen, Lightbulb, Users,
  FolderArchive, Shield, Wrench, Eye, EyeOff, Navigation,
  Globe, Check, Loader2, Settings,
} from 'lucide-react';

const TOGGLEABLE_PAGES = [
  { href: '/calendar', name: 'Calendar', nameVi: 'Lịch', icon: CalendarDays, description: 'Task calendar overview', descVi: 'Lịch tổng hợp công việc', adminOnly: false },
  { href: '/communication', name: 'Communication', nameVi: 'Trao đổi', icon: MessageSquare, description: 'Messages & discussions', descVi: 'Tin nhắn & thảo luận', adminOnly: false },
  { href: '/tips', name: 'Tips', nameVi: 'Mẹo', icon: BookOpen, description: 'System usage guides', descVi: 'Hướng dẫn sử dụng hệ thống', adminOnly: false },
  { href: '/feedback', name: 'Feedback', nameVi: 'Góp ý', icon: Lightbulb, description: 'Send feedback', descVi: 'Gửi ý kiến phản hồi', adminOnly: false },
  { href: '/members', name: 'Members', nameVi: 'Thành viên', icon: Users, description: 'User management', descVi: 'Quản lý người dùng', adminOnly: true },
  { href: '/admin/backup', name: 'Backup', nameVi: 'Sao lưu', icon: FolderArchive, description: 'Data backup', descVi: 'Backup dữ liệu', adminOnly: true },
  { href: '/admin/system', name: 'Admin', nameVi: 'Quản trị', icon: Shield, description: 'System administration', descVi: 'Quản trị hệ thống', adminOnly: true },
  { href: '/utilities', name: 'Utilities', nameVi: 'Tiện ích', icon: Wrench, description: 'Tools & utilities', descVi: 'Công cụ & tiện ích', adminOnly: true },
];

function NavCustomizationCard({ userId, isAdmin, locale }: { userId?: string; isAdmin: boolean; locale: Locale }) {
  const { profile, refreshProfile } = useAuth();
  const [hiddenPages, setHiddenPages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const isVi = locale === 'vi';

  useEffect(() => {
    if (profile) {
      const nav = profile.nav_hidden_pages;
      setHiddenPages(Array.isArray(nav) ? (nav as string[]) : []);
    }
  }, [profile]);

  const togglePage = async (href: string) => {
    if (!userId) return;
    const updated = hiddenPages.includes(href)
      ? hiddenPages.filter(h => h !== href)
      : [...hiddenPages, href];
    setHiddenPages(updated);
    setSaving(true);
    await supabase.from('profiles').update({ nav_hidden_pages: updated as any }).eq('id', userId);
    await refreshProfile();
    setSaving(false);
    window.dispatchEvent(new Event('nav-visibility-changed'));
  };

  const normalPages = TOGGLEABLE_PAGES.filter(p => !p.adminOnly);
  const adminPages = TOGGLEABLE_PAGES.filter(p => p.adminOnly);

  const renderPageItem = (page: typeof TOGGLEABLE_PAGES[0]) => {
    const PageIcon = page.icon;
    const isVisible = !hiddenPages.includes(page.href);
    return (
      <div
        key={page.href}
        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
          isVisible
            ? 'border-primary/20 bg-primary/5'
            : 'border-border bg-muted/30 opacity-60'
        }`}
      >
        <div className={`p-2 rounded-lg ${isVisible ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
          <PageIcon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{isVi ? page.nameVi : page.name}</p>
          <p className="text-xs text-muted-foreground truncate">{isVi ? page.descVi : page.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {isVisible ? <Eye className="w-3.5 h-3.5 text-primary" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
          <Switch checked={isVisible} onCheckedChange={() => togglePage(page.href)} />
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Navigation className="w-4 h-4 text-primary" />
          {isVi ? 'Tùy chỉnh thanh điều hướng' : 'Navigation Customization'}
        </CardTitle>
        <CardDescription>{isVi ? 'Ẩn hoặc hiện các trang trên thanh điều hướng' : 'Show or hide pages in the navigation bar'}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {normalPages.map(renderPageItem)}
        </div>
        {isAdmin && (
          <div className="mt-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                  <Shield className="w-3.5 h-3.5" />
                  {isVi ? 'Nâng cao (Admin)' : 'Advanced (Admin)'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2 space-y-1.5" side="right" align="start">
                <p className="text-xs font-medium text-muted-foreground px-2 pb-1">{isVi ? 'Trang quản trị' : 'Admin pages'}</p>
                {adminPages.map(renderPageItem)}
              </PopoverContent>
            </Popover>
          </div>
        )}
        {hiddenPages.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
            <EyeOff className="w-3 h-3" />
            {isVi
              ? `Đang ẩn ${hiddenPages.length} trang — truy cập bằng URL trực tiếp`
              : `${hiddenPages.length} page(s) hidden — access via direct URL`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function LanguageCard({ locale, setLocale: setLocaleFn }: { locale: Locale; setLocale: (l: Locale) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const isVi = locale === 'vi';

  const handleChange = async (newLocale: Locale) => {
    if (newLocale === locale || saving) return;
    setSaving(true);
    try {
      await setLocaleFn(newLocale);
      toast({ title: newLocale === 'vi' ? 'Đã chuyển sang Tiếng Việt' : 'Switched to English' });
    } catch {
      toast({ title: isVi ? 'Lỗi' : 'Error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const options: { value: Locale; label: string; flag: string }[] = [
    { value: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
    { value: 'en', label: 'English', flag: '🇬🇧' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          {isVi ? 'Ngôn ngữ' : 'Language'}
        </CardTitle>
        <CardDescription>
          {isVi ? 'Chọn ngôn ngữ hiển thị cho tài khoản' : 'Choose display language for your account'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {options.map((opt) => {
          const isActive = locale === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => handleChange(opt.value)}
              disabled={saving}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                isActive
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border hover:border-primary/30 hover:bg-muted/50'
              }`}
            >
              <span className="text-2xl">{opt.flag}</span>
              <span className="flex-1 text-sm font-medium">{opt.label}</span>
              {isActive && <Check className="w-4 h-4 text-primary" />}
              {saving && !isActive && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function AccountSettings() {
  const { user, isAdmin } = useAuth();
  const { locale, setLocale } = useLanguage();
  const isVi = locale === 'vi';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          {isVi ? 'Cài đặt' : 'Settings'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isVi ? 'Tùy chỉnh giao diện và ngôn ngữ hệ thống' : 'Customize interface and system language'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LanguageCard locale={locale} setLocale={setLocale} />
        <NavCustomizationCard userId={user?.id} isAdmin={isAdmin} locale={locale} />
      </div>
    </div>
  );
}
