import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { formatPlanName } from '@/hooks/useWorkspaceBilling';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Crown, Zap, Building2, FolderKanban, HardDrive,
  ArrowRight, Loader2, Infinity, Receipt, ArrowLeft,
} from 'lucide-react';

interface WorkspaceUsage {
  id: string;
  name: string;
  plan: string;
  projectCount: number;
  maxProjects: number | null;
  storageMb: number;
  maxStorageMb: number;
}

const MOCK_BILLING = [
  { id: 'TXN-20260301-001', date: '2026-03-01', plan: 'Pro', amount: '$12.00', status: 'Paid' },
  { id: 'TXN-20260201-001', date: '2026-02-01', plan: 'Pro', amount: '$12.00', status: 'Paid' },
  { id: 'TXN-20260115-002', date: '2026-01-15', plan: 'Pro (Upgrade)', amount: '$7.20', status: 'Paid' },
  { id: 'TXN-20260101-001', date: '2026-01-01', plan: 'Plus', amount: '$4.80', status: 'Paid' },
  { id: 'TXN-20251201-001', date: '2025-12-01', plan: 'Free', amount: '$0.00', status: 'Free' },
];

export default function ServicePlan() {
  const { user, profile } = useAuth();
  const { workspaces } = useWorkspace();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [wsUsages, setWsUsages] = useState<WorkspaceUsage[]>([]);

  const plan = profile?.user_plan || 'plan_free';
  const planName = formatPlanName(plan);
  const isPremium = plan !== 'plan_free';

  useEffect(() => {
    if (!user) return;
    fetchUsages();
  }, [user, workspaces]);

  const fetchUsages = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const ownedWs = workspaces.filter(w => w.owner_id === user.id);
      if (ownedWs.length === 0) {
        setWsUsages([]);
        setIsLoading(false);
        return;
      }

      const wsIds = ownedWs.map(w => w.id);

      const [groupsRes, limitsRes] = await Promise.all([
        supabase.from('groups').select('id, workspace_id').in('workspace_id', wsIds),
        supabase.from('plan_limits').select('*').eq('plan', plan as any).maybeSingle(),
      ]);

      const countMap: Record<string, number> = {};
      (groupsRes.data || []).forEach(g => {
        if (g.workspace_id) countMap[g.workspace_id] = (countMap[g.workspace_id] || 0) + 1;
      });

      const maxProjects = limitsRes.data?.max_projects_per_workspace ?? null;
      const maxStorage = limitsRes.data?.max_storage_mb ?? 250;

      const usages: WorkspaceUsage[] = ownedWs.map(ws => ({
        id: ws.id,
        name: ws.name,
        plan: planName,
        projectCount: countMap[ws.id] || 0,
        maxProjects,
        storageMb: Math.round(Math.random() * maxStorage * 0.6), // mock storage
        maxStorageMb: maxStorage,
      }));

      setWsUsages(usages);
    } catch (err) {
      console.warn('Error fetching service plan data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const totalProjects = wsUsages.reduce((s, w) => s + w.projectCount, 0);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft size={14} />
            <span>Quay lại</span>
          </button>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-500" />
            Gói dịch vụ
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tổng quan mức sử dụng và quản lý gói cước của bạn
          </p>
        </div>
        <Button
          onClick={() => navigate('/upgrade')}
          className="bg-amber-500 hover:bg-amber-600 text-white"
        >
          <Zap className="w-4 h-4 mr-2" />
          Nâng cấp gói
        </Button>
      </div>

      {/* Current Plan Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${isPremium ? 'bg-amber-500/10' : 'bg-muted'}`}>
              {isPremium ? (
                <Crown className="w-7 h-7 text-amber-500" />
              ) : (
                <Zap className="w-7 h-7 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">Gói hiện tại</h2>
                <Badge
                  variant="secondary"
                  className={`text-sm ${isPremium
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    : ''
                  }`}
                >
                  {planName}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isPremium ? 'Bạn đang sử dụng gói cao cấp' : 'Gói miễn phí cơ bản'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tabular-nums">{wsUsages.length}</div>
              <div className="text-xs text-muted-foreground">Workspace sở hữu</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tabular-nums">{totalProjects}</div>
              <div className="text-xs text-muted-foreground">Tổng project</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workspace Usage Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-muted-foreground" />
          Mức sử dụng theo Workspace
        </h2>
        <div className="grid gap-4">
          {wsUsages.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Bạn chưa sở hữu workspace nào
              </CardContent>
            </Card>
          ) : (
            wsUsages.map(ws => {
              const projectPct = ws.maxProjects ? Math.min(100, (ws.projectCount / ws.maxProjects) * 100) : 0;
              const storagePct = Math.min(100, (ws.storageMb / ws.maxStorageMb) * 100);

              return (
                <Card key={ws.id}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {ws.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{ws.name}</h3>
                          <span className="text-xs text-muted-foreground">Gói: {ws.plan}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {ws.plan}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      {/* Projects */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <FolderKanban className="w-3.5 h-3.5" />
                            Projects
                          </span>
                          <span className="font-medium tabular-nums">
                            {ws.projectCount} / {ws.maxProjects ?? <Infinity className="w-4 h-4 inline" />}
                          </span>
                        </div>
                        {ws.maxProjects && (
                          <Progress value={projectPct} className="h-2" />
                        )}
                        {!ws.maxProjects && (
                          <div className="h-2 rounded-full bg-secondary">
                            <div className="h-full rounded-full bg-primary/30 w-1/6" />
                          </div>
                        )}
                      </div>

                      {/* Storage */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <HardDrive className="w-3.5 h-3.5" />
                            Dung lượng
                          </span>
                          <span className="font-medium tabular-nums">
                            {ws.storageMb} MB / {ws.maxStorageMb} MB
                          </span>
                        </div>
                        <Progress value={storagePct} className="h-2" />
                        <div className="text-right">
                          <span className={`text-[10px] font-medium ${
                            storagePct > 80 ? 'text-destructive' : storagePct > 60 ? 'text-amber-500' : 'text-muted-foreground'
                          }`}>
                            {storagePct.toFixed(0)}% đã sử dụng
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <Separator />

      {/* Billing History */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-muted-foreground" />
          Lịch sử mua hàng
        </h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Ngày</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Mã giao dịch</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Gói</th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Số tiền</th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {MOCK_BILLING.map(row => (
                  <tr key={row.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-5 py-3 text-sm">{row.date}</td>
                    <td className="px-5 py-3 text-sm font-mono text-xs text-muted-foreground">{row.id}</td>
                    <td className="px-5 py-3 text-sm font-medium">{row.plan}</td>
                    <td className="px-5 py-3 text-sm text-right tabular-nums">{row.amount}</td>
                    <td className="px-5 py-3 text-right">
                      <Badge
                        variant={row.status === 'Paid' ? 'default' : 'secondary'}
                        className={`text-[10px] ${
                          row.status === 'Paid' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-none' :
                          row.status === 'Free' ? 'bg-muted text-muted-foreground border-none' :
                          'bg-amber-500/15 text-amber-600'
                        }`}
                      >
                        {row.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Hiển thị 5 giao dịch gần nhất • Dữ liệu mô phỏng
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
