import { useState, useEffect } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building2, Save, Trash2, AlertTriangle, Crown, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';

export default function WorkspaceSettings() {
  const { activeWorkspace, workspaceRole, refreshWorkspaces, isAvailable } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);

  const isOwner = workspaceRole === 'owner';
  const canEdit = isOwner || workspaceRole === 'admin';

  useEffect(() => {
    if (activeWorkspace) {
      setName(activeWorkspace.name);
      setDescription(activeWorkspace.description || '');
    }
  }, [activeWorkspace]);

  if (!isAvailable || !activeWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
        <Building2 className="w-12 h-12 opacity-30" />
        <p className="text-lg font-medium">Workspace chưa khả dụng</p>
        <p className="text-sm">Hệ thống workspace đang được thiết lập. Vui lòng quay lại sau.</p>
      </div>
    );
  }

  const handleSave = async () => {
    if (!canEdit) return;
    setIsSaving(true);

    try {
      const { data, error } = await supabase.functions.invoke('workspace-management', {
        body: {
          action: 'update_workspace',
          workspace_id: activeWorkspace.id,
          name: name.trim(),
          description: description.trim() || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await refreshWorkspaces();
      toast({ title: 'Đã lưu', description: 'Cài đặt workspace đã được cập nhật.' });
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isOwner) return;
    setIsDeleting(true);

    try {
      const { data, error } = await supabase.functions.invoke('workspace-management', {
        body: { action: 'delete_workspace', workspace_id: activeWorkspace.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await refreshWorkspaces();
      toast({ title: 'Đã xóa', description: 'Workspace đã được xóa.' });
      navigate('/dashboard');
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const copySlug = () => {
    navigator.clipboard.writeText(activeWorkspace.slug);
    setCopiedSlug(true);
    setTimeout(() => setCopiedSlug(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <Building2 className="w-6 h-6 text-primary" />
          Cài đặt Workspace
        </h1>
        <p className="text-muted-foreground mt-1">
          Quản lý thông tin và cài đặt của workspace.
        </p>
      </div>

      {/* General Info */}
      <div className="space-y-5 p-6 rounded-xl border bg-card">
        <h2 className="text-lg font-semibold">Thông tin chung</h2>

        <div className="space-y-2">
          <Label htmlFor="ws-name">Tên Workspace</Label>
          <Input
            id="ws-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nhập tên workspace..."
            disabled={!canEdit}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ws-desc">Mô tả</Label>
          <Textarea
            id="ws-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả ngắn về workspace..."
            rows={3}
            disabled={!canEdit}
          />
        </div>

        <div className="space-y-2">
          <Label>Slug (URL)</Label>
          <div className="flex items-center gap-2">
            <Input value={activeWorkspace.slug} disabled className="font-mono text-sm" />
            <Button variant="outline" size="icon" onClick={copySlug}>
              {copiedSlug ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {canEdit && (
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        )}
      </div>

      {/* Plan Info */}
      <div className="space-y-4 p-6 rounded-xl border bg-card">
        <h2 className="text-lg font-semibold">Gói dịch vụ</h2>
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="font-semibold capitalize">{activeWorkspace.plan} Plan</div>
            <div className="text-sm text-muted-foreground">
              Tối đa {activeWorkspace.max_projects} dự án · {activeWorkspace.max_members} thành viên · {activeWorkspace.max_storage_mb >= 1024 ? `${(activeWorkspace.max_storage_mb / 1024).toFixed(0)} GB` : `${activeWorkspace.max_storage_mb} MB`} lưu trữ
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/pricing')}>
            Nâng cấp
          </Button>
        </div>
      </div>

      {/* Danger Zone */}
      {isOwner && (
        <div className="space-y-4 p-6 rounded-xl border border-destructive/30 bg-destructive/5">
          <h2 className="text-lg font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Vùng nguy hiểm
          </h2>
          <p className="text-sm text-muted-foreground">
            Xóa workspace sẽ xóa vĩnh viễn tất cả dự án, task, file và dữ liệu liên quan.
            Hành động này không thể hoàn tác.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                <Trash2 className="w-4 h-4 mr-2" />
                Xóa Workspace
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xóa Workspace "{activeWorkspace.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tất cả dự án, task, file và thành viên trong workspace này sẽ bị xóa vĩnh viễn.
                  Hành động này KHÔNG thể hoàn tác.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
