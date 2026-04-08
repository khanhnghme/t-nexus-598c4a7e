import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatPlanName } from '@/hooks/useWorkspaceBilling';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Crown, Zap, FolderKanban, Building2, ChevronDown, ArrowRight, Loader2, Infinity } from 'lucide-react';

interface WorkspaceDetail {
  id: string;
  name: string;
  projectCount: number;
}

export default function ServicePlanSection() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [ownedWorkspaces, setOwnedWorkspaces] = useState<WorkspaceDetail[]>([]);
  const [totalProjects, setTotalProjects] = useState(0);
  const [maxProjects, setMaxProjects] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const plan = profile?.user_plan || 'plan_free';
  const planName = formatPlanName(plan);
  const isPremium = plan !== 'plan_free';

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, plan]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Get all workspaces owned by user
      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('id, name')
        .eq('owner_id', user.id);

      if (!workspaces || workspaces.length === 0) {
        setOwnedWorkspaces([]);
        setTotalProjects(0);
        setIsLoading(false);
        return;
      }

      // Count projects per workspace
      const wsIds = workspaces.map(w => w.id);
      const { data: groups } = await supabase
        .from('groups')
        .select('id, workspace_id')
        .in('workspace_id', wsIds);

      const countMap: Record<string, number> = {};
      (groups || []).forEach(g => {
        if (g.workspace_id) {
          countMap[g.workspace_id] = (countMap[g.workspace_id] || 0) + 1;
        }
      });

      const details: WorkspaceDetail[] = workspaces.map(w => ({
        id: w.id,
        name: w.name,
        projectCount: countMap[w.id] || 0,
      }));

      const total = details.reduce((sum, w) => sum + w.projectCount, 0);

      // Get plan limits
      let maxP: number | null = null;
      if (plan) {
        const { data: limitsData } = await supabase
          .from('plan_limits')
          .select('max_projects_per_workspace')
          .eq('plan', plan as any)
          .maybeSingle();
        // Total max = max_per_workspace * number_of_workspaces (or null = unlimited)
        if (limitsData?.max_projects_per_workspace != null) {
          maxP = limitsData.max_projects_per_workspace * workspaces.length;
        }
      }

      setOwnedWorkspaces(details);
      setTotalProjects(total);
      setMaxProjects(maxP);
    } catch (err) {
      console.warn('Error fetching service plan data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          Gói dịch vụ
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Plan Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isPremium ? 'bg-amber-500/10' : 'bg-muted'}`}>
              {isPremium ? (
                <Crown className="w-5 h-5 text-amber-500" />
              ) : (
                <Zap className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Gói hiện tại</span>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${isPremium 
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20' 
                    : ''
                  }`}
                >
                  {planName}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isPremium ? 'Đang sử dụng gói cao cấp' : 'Gói miễn phí cơ bản'}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Global Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Building2 className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Tổng Workspace</span>
            </div>
            <p className="text-xl font-bold">{ownedWorkspaces.length}</p>
          </div>
          <div className="rounded-lg border p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <FolderKanban className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Mức sử dụng Project</span>
            </div>
            <p className="text-xl font-bold">
              {totalProjects}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                / {maxProjects != null ? maxProjects : <Infinity className="w-4 h-4 inline" />}
              </span>
            </p>
          </div>
        </div>

        {/* Breakdown Accordion */}
        {ownedWorkspaces.length > 0 && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1.5">
              <span className="font-medium">Phân bổ chi tiết</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1.5">
              {ownedWorkspaces.map(ws => (
                <div key={ws.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium truncate max-w-[200px]">{ws.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {ws.projectCount} project{ws.projectCount !== 1 ? 's' : ''}
                  </Badge>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        <Separator />

        {/* Upgrade Button */}
        <Button
          variant="outline"
          className="w-full border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
          onClick={() => navigate('/upgrade')}
        >
          <Zap className="w-4 h-4 mr-2" />
          Nâng cấp gói
          <ArrowRight className="w-4 h-4 ml-auto" />
        </Button>
      </CardContent>
    </Card>
  );
}
