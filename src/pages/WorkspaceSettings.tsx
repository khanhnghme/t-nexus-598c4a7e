import { useState, useEffect } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Building2, Save, Trash2, AlertTriangle, Crown, Copy, Check,
  Users, FolderKanban, HardDrive, Activity, LayoutGrid, Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';

function StatCard({ icon: Icon, label, value, sub, color = 'primary' }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    amber: 'bg-amber-500/10 text-amber-500',
  };
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5 flex items-start gap-4">
        <div className={`flex items-center justify-center w-11 h-11 rounded-xl ${colorMap[color] || colorMap.primary}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function WorkspaceSettings() {
  const { activeWorkspace, workspaceRole, refreshWorkspaces, isAvailable } = useWorkspace();
  const { user } = useAuth();
  const { members } = useWorkspaceMembers();
  const { toast } = useToast();
  const { translations: { app: t } } = useLanguage();
  const tw = t.workspace;
  const tc = t.common;
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [projectCount, setProjectCount] = useState(0);

  const isOwner = workspaceRole === 'workspace_owner';
  const canEdit = isOwner || workspaceRole === 'workspace_admin';

  useEffect(() => {
    if (activeWorkspace) {
      setName(activeWorkspace.name);
      setDescription(activeWorkspace.description || '');
      // Fetch project count
      supabase.from('groups').select('id', { count: 'exact', head: true })
        .eq('workspace_id', activeWorkspace.id)
        .then(({ count }) => setProjectCount(count || 0));
    }
  }, [activeWorkspace]);

  if (!isAvailable || !activeWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
        <Building2 className="w-12 h-12 opacity-30" />
        <p className="text-lg font-medium">{tw.notAvailable}</p>
        <p className="text-sm">{tw.notAvailableDesc}</p>
      </div>
    );
  }

  const memberCount = (members?.length || 0) + 1; // +1 for owner
  const storageUsed = 0; // placeholder
  const storageCap = activeWorkspace.max_storage_mb;
  const storageLabel = storageCap >= 1024 ? `${(storageCap / 1024).toFixed(0)} GB` : `${storageCap} MB`;

  const handleSave = async () => {
    if (!canEdit) return;
    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('workspace-management', {
        body: { action: 'update_workspace', workspace_id: activeWorkspace.id, name: name.trim(), description: description.trim() || null },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await refreshWorkspaces();
      toast({ title: tc.saved, description: tw.settingsUpdated });
    } catch (err: any) {
      toast({ title: tc.error, description: err.message, variant: 'destructive' });
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
      toast({ title: tc.deleted, description: tw.wsDeleted });
      navigate('/dashboard');
    } catch (err: any) {
      toast({ title: tc.error, description: err.message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const copySlug = () => {
    navigator.clipboard.writeText(activeWorkspace.slug);
    setCopiedSlug(true);
    setTimeout(() => setCopiedSlug(false), 2000);
  };

  const deleteNameMatches = deleteConfirmName.trim() === activeWorkspace.name.trim();

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <LayoutGrid className="w-6 h-6 text-primary" />
          {tw.title}
        </h1>
        <p className="text-muted-foreground mt-1">
          {tw.subtitle}
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label={tw.members} value={memberCount} sub={tw.maxMembers.replace('{n}', String(activeWorkspace.max_members))} color="blue" />
        <StatCard icon={FolderKanban} label={tw.projects} value={projectCount} sub={tw.maxProjects.replace('{n}', String(activeWorkspace.max_projects))} color="green" />
        <StatCard icon={HardDrive} label={tw.storage} value={storageLabel} sub={tw.usedStorage.replace('{n}', String(storageUsed))} color="amber" />
        <StatCard icon={Crown} label={tw.plan} value={activeWorkspace?.plan ? activeWorkspace.plan.charAt(0).toUpperCase() + activeWorkspace.plan.slice(1) : 'Free'} color="primary" />
      </div>

      {/* Tabs: Info & Settings */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="info" className="gap-1.5"><Building2 className="w-4 h-4" />{tw.infoTab}</TabsTrigger>
          <TabsTrigger value="plan" className="gap-1.5"><Crown className="w-4 h-4" />{tw.planTab}</TabsTrigger>
          {isOwner && <TabsTrigger value="danger" className="gap-1.5 text-destructive"><AlertTriangle className="w-4 h-4" />{tw.dangerTab}</TabsTrigger>}
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="mt-4">
          <Card>
            <CardContent className="p-6 space-y-5">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Settings2 className="w-5 h-5 text-muted-foreground" />{tw.generalInfo}</h2>

              <div className="space-y-2">
                <Label htmlFor="ws-name">{tw.workspaceName}</Label>
                <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={tw.workspaceNamePlaceholder} disabled={!canEdit} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ws-desc">{tw.description}</Label>
                <Textarea id="ws-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={tw.descriptionPlaceholder} rows={3} disabled={!canEdit} />
              </div>

              <div className="space-y-2">
                <Label>{tw.slugUrl}</Label>
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
                  {isSaving ? tc.saving : tw.saveChanges}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plan Tab */}
        <TabsContent value="plan" className="mt-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">{tw.planSection}</h2>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                  <Crown className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold capitalize">{activeWorkspace.plan} Plan</div>
                  <div className="text-sm text-muted-foreground">
                    {tw.planDetails.replace('{projects}', String(activeWorkspace.max_projects)).replace('{members}', String(activeWorkspace.max_members)).replace('{storage}', storageLabel)}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/pricing')}>{tc.upgrade}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Danger Zone Tab */}
        {isOwner && (
          <TabsContent value="danger" className="mt-4">
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  {tw.dangerZone}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {tw.dangerDesc}
                </p>
                <AlertDialog onOpenChange={(open) => { if (!open) setDeleteConfirmName(''); }}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isDeleting}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      {tw.deleteWorkspace}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{tw.deleteConfirmTitle.replace('{name}', activeWorkspace.name)}</AlertDialogTitle>
                      <AlertDialogDescription asChild>
                        <div className="space-y-3">
                          <p>{tw.deleteConfirmDesc}</p>
                          <div className="space-y-2">
                            <Label className="text-foreground font-medium">
                              {tw.deleteConfirmLabel.replace('{name}', activeWorkspace.name)}
                            </Label>
                            <Input
                              value={deleteConfirmName}
                              onChange={(e) => setDeleteConfirmName(e.target.value)}
                              placeholder={activeWorkspace.name}
                              className="border-destructive/50 focus-visible:ring-destructive"
                            />
                          </div>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{tc.cancel}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={!deleteNameMatches || isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                      >
                        {isDeleting ? tc.deleting : tw.deletePermanently}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
