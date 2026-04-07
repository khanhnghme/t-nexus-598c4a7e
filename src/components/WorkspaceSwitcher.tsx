import { useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, Check, ChevronDown, Plus, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════════════════ */
/*  Workspace Switcher — Top of sidebar                           */
/* ═══════════════════════════════════════════════════════════════ */

interface WorkspaceSwitcherProps {
  collapsed?: boolean;
}

export default function WorkspaceSwitcher({ collapsed }: WorkspaceSwitcherProps) {
  const { workspaces, activeWorkspace, switchWorkspace, isAvailable, workspaceRole } = useWorkspace();
  const navigate = useNavigate();

  // Don't render if workspace feature isn't available yet
  if (!isAvailable || !activeWorkspace) return null;

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'owner': return '👑';
      case 'admin': return '🛡️';
      default: return '🎫';
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'owner': return 'Owner';
      case 'admin': return 'Admin';
      case 'member': return 'Member';
      default: return '';
    }
  };

  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center justify-center w-full h-9 rounded-lg transition-colors hover:bg-white/10"
            title={activeWorkspace.name}
          >
            <Building2 className="w-4.5 h-4.5 opacity-80" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-64">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Workspace
          </DropdownMenuLabel>
          {workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              onClick={() => switchWorkspace(ws.id)}
              className="flex items-center gap-2"
            >
              <span className="text-sm">{getRoleBadge(ws.my_role)}</span>
              <span className="flex-1 truncate">{ws.name}</span>
              {ws.id === activeWorkspace.id && (
                <Check className="w-3.5 h-3.5 text-primary ml-auto" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="workspace-switcher">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="workspace-switcher-btn">
            <div className="workspace-switcher-icon">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div className="workspace-switcher-info">
              <div className="workspace-switcher-name">{activeWorkspace.name}</div>
              <div className="workspace-switcher-role">
                {getRoleBadge(workspaceRole ?? undefined)} {getRoleLabel(workspaceRole ?? undefined)} · {activeWorkspace.plan.charAt(0).toUpperCase() + activeWorkspace.plan.slice(1)}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 ml-auto opacity-50" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="bottom" align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[220px]">
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
            Workspace của bạn
          </DropdownMenuLabel>

          {workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              onClick={() => switchWorkspace(ws.id)}
              className={cn(
                "flex items-center gap-2.5 py-2",
                ws.id === activeWorkspace.id && "bg-accent"
              )}
            >
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary shrink-0">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{ws.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {getRoleBadge(ws.my_role)} {getRoleLabel(ws.my_role)} · {ws.plan}
                </div>
              </div>
              {ws.id === activeWorkspace.id && (
                <Check className="w-3.5 h-3.5 text-primary shrink-0" />
              )}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => navigate('/workspace/settings')}
            className="gap-2"
          >
            <Settings className="w-3.5 h-3.5" />
            Cài đặt Workspace
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              // Create new workspace — will be handled by a dialog/page
              navigate('/workspace/new');
            }}
            className="gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Tạo Workspace mới
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
