import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { r2Storage } from '@/lib/r2Storage';
import { 
  User, Mail, GraduationCap, BookOpen, Phone, Sparkles, FileText,
  Camera, Loader2, Save, Shield, Crown, UserCheck, Calendar, Star,
  CheckCircle2, AlertCircle, Edit3, X, FolderKanban, HardDrive,
  Lock, Unlock, Zap, ArrowRight, Plus, Bell,
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const DEFAULT_PROJECT_LIMIT = 2;

export function getHiddenNav(profile: any): string[] {
  if (!profile?.nav_hidden_pages) return [];
  try {
    return Array.isArray(profile.nav_hidden_pages) ? profile.nav_hidden_pages : [];
  } catch { return []; }
}

export default function PersonalInfo() {
  const { user, profile, isAdmin, isLeader, refreshProfile, roles } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [savingEmailPref, setSavingEmailPref] = useState(false);
  const [ownedProjectCount, setOwnedProjectCount] = useState(0);
  const [joinedProjectCount, setJoinedProjectCount] = useState(0);
  
  
  // Form state
  const [yearBatch, setYearBatch] = useState('');
  const [major, setMajor] = useState('');
  const [phone, setPhone] = useState('');
  const [skills, setSkills] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (profile) {
      setYearBatch(profile.year_batch || '');
      setMajor(profile.major || '');
      setPhone(profile.phone || '');
      setSkills(profile.skills || '');
      setBio(profile.bio || '');
    }
    // Fetch email notification preference
    if (user) {
      supabase.from('profiles').select('email_notifications').eq('id', user.id).single().then(({ data }) => {
        if (data) setEmailNotifications(data.email_notifications ?? true);
      });
    }
  }, [profile, user]);

  useEffect(() => {
    if (user) {
      fetchProjectStats();
      
    }
  }, [user]);

  const fetchProjectStats = async () => {
    if (!user) return;
    const { count: owned } = await supabase
      .from('groups')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', user.id);
    setOwnedProjectCount(owned || 0);

    const { count: joined } = await supabase
      .from('group_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    setJoinedProjectCount(joined || 0);
  };


  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const canCreateProject = isAdmin || isLeader;
  const projectLimit = profile?.project_limit ?? (isLeader ? DEFAULT_PROJECT_LIMIT : 0);
  

  const getRoleInfo = () => {
    if (isAdmin) return {
      label: 'OwnerSystem',
      description: 'Toàn quyền hệ thống',
      icon: Shield,
      gradient: 'from-red-500 to-rose-600',
      bgGradient: 'from-red-500/10 to-rose-600/10',
      borderColor: 'border-red-200 dark:border-red-800',
    };
    if (isLeader) return {
      label: 'Thành viên Nâng cao',
      description: 'Được tạo & quản lý dự án',
      icon: Star,
      gradient: 'from-amber-500 to-orange-600',
      bgGradient: 'from-amber-500/10 to-orange-600/10',
      borderColor: 'border-amber-200 dark:border-amber-800',
    };
    return {
      label: 'Thành viên',
      description: 'Tham gia dự án được mời',
      icon: UserCheck,
      gradient: 'from-blue-500 to-cyan-600',
      bgGradient: 'from-blue-500/10 to-cyan-600/10',
      borderColor: 'border-blue-200 dark:border-blue-800',
    };
  };

  const roleInfo = getRoleInfo();
  const RoleIcon = roleInfo.icon;

  const calculateProfileCompletion = () => {
    const fields = [
      profile?.full_name, profile?.email, profile?.student_id,
      profile?.year_batch, profile?.major,
      profile?.phone, profile?.skills, profile?.bio, profile?.avatar_url
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  };

  const profileCompletion = calculateProfileCompletion();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Định dạng không hợp lệ', description: 'Vui lòng chọn file ảnh', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'File quá lớn', description: 'Kích thước ảnh tối đa là 5MB', variant: 'destructive' });
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await r2Storage.from('avatars').upload(filePath, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const avatarPublicUrl = uploadData?.publicUrl;
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: avatarPublicUrl }).eq('id', user.id);
      if (updateError) throw updateError;
      toast({ title: 'Thành công', description: 'Đã cập nhật ảnh đại diện' });
      await refreshProfile();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message || 'Có lỗi xảy ra', variant: 'destructive' });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        year_batch: yearBatch || null, major: major || null,
        phone: phone || null, skills: skills || null, bio: bio || null,
      }).eq('id', user.id);
      if (error) throw error;
      toast({ title: 'Thành công', description: 'Đã cập nhật thông tin cá nhân' });
      setIsEditing(false);
      await refreshProfile();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message || 'Có lỗi xảy ra', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const InfoItem = ({ icon: Icon, label, value, highlight = false, readOnly = false }: { icon: any; label: string; value: string | null | undefined; highlight?: boolean; readOnly?: boolean }) => {
    const hasValue = Boolean(value);
    return (
      <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${highlight ? 'bg-primary/5' : 'hover:bg-muted/50'}`}>
        <div className={`p-2 rounded-lg shrink-0 ${readOnly ? 'bg-muted text-muted-foreground/60' : hasValue ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
          {readOnly ? <Lock className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          {hasValue ? (
            <p className={`text-sm font-medium truncate ${readOnly ? 'text-muted-foreground' : 'text-foreground'}`}>{value}</p>
          ) : (
            <p className="text-xs text-muted-foreground/50 italic">Chưa cập nhật</p>
          )}
        </div>
        {hasValue && !readOnly && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
      </div>
    );
  };

  const skillsList = profile?.skills?.split(',').map((s: string) => s.trim()).filter(Boolean) || [];

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Profile Header — hero banner */}
        <Card className="overflow-hidden border-0 shadow-xl">
          <div className="h-28 bg-gradient-to-br from-primary/80 via-primary/60 to-accent/50 relative">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>
          
          <CardContent className="relative px-6 pb-6">
            <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-end -mt-16">
              <div className="relative group">
                <Avatar className="h-28 w-28 border-4 border-background shadow-xl ring-2 ring-primary/20 bg-background">
                  {profile?.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt={profile.full_name} className="object-cover" />
                  ) : (
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                      {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingAvatar}
                  className="absolute bottom-1 right-1 p-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-110">
                  {isUploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </div>

              <div className="flex-1 text-center sm:text-left pb-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <h1 className="text-xl md:text-2xl font-bold text-primary-foreground drop-shadow-sm">{profile?.full_name}</h1>
                  <Badge className={`bg-gradient-to-r ${roleInfo.gradient} text-white border-0 shadow-lg gap-1.5 px-3 py-1`}>
                    <RoleIcon className="w-3.5 h-3.5" />
                    {roleInfo.label}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 truncate max-w-full text-sm whitespace-nowrap overflow-hidden">
                  {profile?.institution ? `${profile.institution} • ` : ''}{profile?.student_id} • {profile?.email}
                </p>
                {profile?.created_at && (
                  <div className="flex items-center gap-3 mt-1 flex-wrap justify-center sm:justify-start">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Tham gia từ {format(new Date(profile.created_at), 'dd/MM/yyyy', { locale: vi })}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Progress value={profileCompletion} className="h-1.5 w-16" />
                      <span className={`text-xs font-semibold ${profileCompletion === 100 ? 'text-emerald-600' : 'text-primary'}`}>
                        {profileCompletion}%
                      </span>
                      {profileCompletion < 100 && (
                        <button onClick={() => setIsEditing(true)} className="text-xs text-primary hover:underline">
                          Hoàn thiện
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Email notification inline */}
               <div className="hidden sm:flex items-center gap-2 pb-1 opacity-60 whitespace-nowrap shrink-0">
                <Bell className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground shrink-0">Email thông báo</span>
                <Switch checked={false} disabled={true} className="scale-75 shrink-0" />
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-500/50 text-amber-600 dark:text-amber-400 shrink-0 whitespace-nowrap">
                  🚧 Đang phát triển
                </Badge>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Personal Info Card */}
        <div className="max-w-3xl">

          {/* Right: Personal Info Card */}
          <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Thông tin cá nhân
              </CardTitle>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit3 className="w-4 h-4 mr-1.5" />
                  Chỉnh sửa
                </Button>
              )}
            </div>
            <CardDescription>Thông tin học vấn, liên hệ và giới thiệu bản thân</CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="yearBatch" className="flex items-center gap-2 text-sm font-medium">
                      <GraduationCap className="w-4 h-4 text-muted-foreground" />
                      Khóa
                    </Label>
                    <Input id="yearBatch" placeholder="VD: K47, K48..." value={yearBatch} onChange={(e) => setYearBatch(e.target.value)} className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="major" className="flex items-center gap-2 text-sm font-medium">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      Ngành học
                    </Label>
                    <Input id="major" placeholder="VD: Quản trị kinh doanh..." value={major} onChange={(e) => setMajor(e.target.value)} className="h-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    Số điện thoại
                  </Label>
                  <Input id="phone" placeholder="VD: 0901234567" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skills" className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="w-4 h-4 text-muted-foreground" />
                    Kỹ năng / Thế mạnh
                  </Label>
                  <Textarea id="skills" placeholder="VD: Thiết kế đồ họa, PowerPoint, Excel... (phân tách bằng dấu phẩy)" value={skills} onChange={(e) => setSkills(e.target.value)} rows={3} className="resize-none" />
                  <p className="text-xs text-muted-foreground">Nhập các kỹ năng, phân tách bằng dấu phẩy</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio" className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    Giới thiệu bản thân
                  </Label>
                  <Textarea id="bio" placeholder="Viết vài dòng giới thiệu về bản thân..." value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className="resize-none" />
                </div>
                <Separator />
                <div className="flex gap-3">
                  <Button onClick={handleSave} disabled={isSaving} className="flex-1 sm:flex-none">
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Lưu thay đổi
                  </Button>
                  <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>
                    <X className="w-4 h-4 mr-2" />
                    Hủy
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="grid sm:grid-cols-2 gap-x-6">
                  <InfoItem icon={GraduationCap} label="Đơn vị đào tạo" value={profile?.institution} highlight readOnly />
                  <InfoItem icon={User} label="Mã số sinh viên" value={profile?.student_id} readOnly />
                  <InfoItem icon={Mail} label="Email" value={profile?.email} readOnly />
                  <InfoItem icon={GraduationCap} label="Khóa" value={profile?.year_batch} />
                  <InfoItem icon={BookOpen} label="Ngành học" value={profile?.major} />
                  <InfoItem icon={Phone} label="Số điện thoại" value={profile?.phone} />
                </div>

                <Separator className="my-2" />

                <div className="px-4 py-3">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2.5 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Kỹ năng & Thế mạnh
                  </h4>
                  {skillsList.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {skillsList.map((skill: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="px-2.5 py-1 text-xs">{skill}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground/60 italic text-sm flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Chưa cập nhật
                    </p>
                  )}
                </div>

                <div className="px-4 py-3">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2.5 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Giới thiệu bản thân
                  </h4>
                  {profile?.bio ? (
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-lg p-3">
                      {profile.bio}
                    </p>
                  ) : (
                    <p className="text-muted-foreground/60 italic text-sm flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Chưa có thông tin giới thiệu
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </>
  );
}

