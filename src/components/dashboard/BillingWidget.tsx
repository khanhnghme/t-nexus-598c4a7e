import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaceBilling, formatPlanName } from '@/hooks/useWorkspaceBilling';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Zap, FolderKanban, Infinity } from 'lucide-react';

export default function BillingWidget() {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { ownerPlan, ownerName, ownerId, projectCount, maxProjects, isLoading } = useWorkspaceBilling();
  const { locale } = useLanguage();

  if (isLoading || !activeWorkspace) return null;

  const planLabel = formatPlanName(ownerPlan);
  const isOwner = user?.id === ownerId;
  const isPremium = ownerPlan && ownerPlan !== 'plan_free';

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
      {/* Plan info */}
      <div className="flex items-center gap-2 min-w-0">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isPremium ? 'bg-amber-500/10' : 'bg-muted'}`}>
          <Crown className={`w-4 h-4 ${isPremium ? 'text-amber-500' : 'text-muted-foreground'}`} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">
              {locale === 'vi' ? 'Gói hiện tại:' : 'Current plan:'}
            </span>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${isPremium ? 'border-amber-500/30 text-amber-600 dark:text-amber-400' : ''}`}>
              {planLabel}
            </Badge>
            {ownerName && !isOwner && (
              <>
                <span className="text-[10px] text-muted-foreground/60">|</span>
                <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                  {locale === 'vi' ? 'Tài trợ bởi:' : 'Sponsored by:'} {ownerName}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <FolderKanban className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">
              {projectCount} / {maxProjects !== null ? maxProjects : <Infinity className="w-3 h-3 inline" />}
            </span>
          </div>
        </div>
      </div>

      {/* Upgrade button — only for workspace owner */}
      {isOwner && !isPremium && (
        <Button size="sm" variant="outline" className="shrink-0 text-xs gap-1 border-amber-500/30 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400 ml-auto">
          <Zap className="w-3 h-3" />
          {locale === 'vi' ? 'Nâng cấp' : 'Upgrade'}
        </Button>
      )}
    </div>
  );
}
