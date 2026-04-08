import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { r2Storage } from '@/lib/r2Storage';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/lib/activityLogger';
import UserAvatar from '@/components/UserAvatar';
import { 
  Award, Scale, History, 
  AlertCircle, CheckCircle, Clock, Edit2, MessageSquare,
  TrendingUp, TrendingDown, Minus, FileText, Users, Loader2,
  ChevronRight, Info, Target, BarChart3, Star, Eye, MoreHorizontal,
  RefreshCw, ArrowUp, ArrowDown, Percent, Activity, ChevronDown,
  Trophy, Zap, Crown, Medal, Sparkles, Send, Lock, Unlock, Timer
} from 'lucide-react';
import ScoreAdjustmentDialog from './ScoreAdjustmentDialog';
import AppealDialog from './AppealDialog';
import AppealReviewDialog from './AppealReviewDialog';
import StageWeightDialog from './StageWeightDialog';
import ScoreHistoryPanel from './ScoreHistoryPanel';
import TaskScoringDialog from './TaskScoringDialog';
import type { Stage, Task, GroupMember, Profile } from '@/types/database';
import type { 
  TaskScore, MemberStageScore, MemberFinalScore, 
  ScoreAppeal, StageWeight, ScoreAdjustmentHistory 
} from '@/types/processScores';
import { sendNotification } from '@/lib/notifications';

interface ProcessScoresProps {
  groupId: string;
  stages: Stage[];
  tasks: Task[];
  members: GroupMember[];
  isLeader: boolean;
  scoreFinalizedAt?: string | null;
  appealDeadlineHours?: number;
  onRefreshGroup?: () => void;
}

interface AdjustmentDetailDialog {
  isOpen: boolean;
  type: 'task' | 'stage' | 'final';
  title: string;
  score: number;
  baseScore: number;
  adjustment: number;
  reason: string | null;
  adjustedAt: string | null;
}

// ── Score tier helpers ──
const getScoreTier = (score: number) => {
  if (score >= 90) return { label: 'Xuất sắc', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', ring: 'ring-emerald-500/20', gradient: 'from-emerald-500 to-emerald-600', icon: Crown };
  if (score >= 70) return { label: 'Tốt', color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/30', border: 'border-sky-200 dark:border-sky-800', ring: 'ring-sky-500/20', gradient: 'from-sky-500 to-sky-600', icon: Star };
  if (score >= 50) return { label: 'Trung bình', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', ring: 'ring-amber-500/20', gradient: 'from-amber-500 to-amber-600', icon: Minus };
  return { label: 'Cần cải thiện', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-800', ring: 'ring-rose-500/20', gradient: 'from-rose-500 to-rose-600', icon: TrendingDown };
};

// Score circle component
const ScoreCircle = ({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' | 'xl' }) => {
  const tier = getScoreTier(score);
  const sizes = {
    sm: { outer: 'w-10 h-10', text: 'text-sm font-bold', ring: 2 },
    md: { outer: 'w-14 h-14', text: 'text-lg font-bold', ring: 3 },
    lg: { outer: 'w-20 h-20', text: 'text-2xl font-bold', ring: 3 },
    xl: { outer: 'w-28 h-28', text: 'text-4xl font-extrabold', ring: 4 },
  };
  const s = sizes[size];
  const pct = Math.min(score, 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className={`relative ${s.outer} flex items-center justify-center`}>
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" strokeWidth={s.ring} className="stroke-muted/40" />
        <circle
          cx="50" cy="50" r="45" fill="none"
          strokeWidth={s.ring}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={`transition-all duration-700 ease-out`}
          style={{ stroke: score >= 90 ? '#10b981' : score >= 70 ? '#0ea5e9' : score >= 50 ? '#f59e0b' : '#f43f5e' }}
        />
      </svg>
      <span className={`${s.text} ${tier.color} relative z-10`}>{score.toFixed(0)}</span>
    </div>
  );
};

// Rank badge for top 3
const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 1) return <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-sm"><Crown className="w-3.5 h-3.5 text-white" /></div>;
  if (rank === 2) return <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shadow-sm"><Medal className="w-3.5 h-3.5 text-white" /></div>;
  if (rank === 3) return <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-sm"><Medal className="w-3.5 h-3.5 text-white" /></div>;
  return <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"><span className="text-xs font-semibold text-muted-foreground">{rank}</span></div>;
};

// Adjustment pill
const AdjustmentPill = ({ adjustment, onClick }: { adjustment: number | null; onClick?: () => void }) => {
  if (!adjustment || adjustment === 0) return null;
  const isPositive = adjustment > 0;
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold transition-all hover:scale-105 cursor-pointer ${
        isPositive 
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' 
          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
      }`}
    >
      {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {isPositive ? '+' : ''}{adjustment}
    </button>
  );
};

export default function ProcessScores({
  groupId,
  stages,
  tasks,
  members,
  isLeader,
  scoreFinalizedAt,
  appealDeadlineHours = 48,
  onRefreshGroup,
}: ProcessScoresProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [memberTab, setMemberTab] = useState('scores');
  
  // Data states
  const [taskScores, setTaskScores] = useState<TaskScore[]>([]);
  const [stageScores, setStageScores] = useState<MemberStageScore[]>([]);
  const [finalScores, setFinalScores] = useState<MemberFinalScore[]>([]);
  const [stageWeights, setStageWeights] = useState<StageWeight[]>([]);
  const [appeals, setAppeals] = useState<ScoreAppeal[]>([]);
  const [history, setHistory] = useState<ScoreAdjustmentHistory[]>([]);
  
  // Dialog states
  const [adjustmentDialog, setAdjustmentDialog] = useState<{
    isOpen: boolean;
    type: 'task' | 'stage' | 'final';
    targetId: string;
    memberId: string;
    memberName: string;
    currentScore: number;
  } | null>(null);
  
  const [appealDialog, setAppealDialog] = useState<{
    isOpen: boolean;
    type: 'task' | 'stage' | 'final';
    scoreId: string;
    currentScore: number;
    adjustment: number;
    adjustmentReason: string | null;
    targetName?: string;
    targetSubtitle?: string;
    baseScore?: number;
    scoreBreakdown?: Array<{ label: string; value: string | number; highlight?: boolean }>;
  } | null>(null);
  
  const [reviewDialog, setReviewDialog] = useState<{
    isOpen: boolean;
    appeal: ScoreAppeal | null;
  }>({ isOpen: false, appeal: null });
  
  const [weightDialog, setWeightDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [taskScoringDialog, setTaskScoringDialog] = useState<{
    isOpen: boolean;
    task: Task | null;
  }>({ isOpen: false, task: null });
  
  const [adjustmentDetailDialog, setAdjustmentDetailDialog] = useState<AdjustmentDetailDialog | null>(null);
  
  // Appeal selection dialog
  const [appealSelectionOpen, setAppealSelectionOpen] = useState(false);
  
  // Expanded stages tracking for member view
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const toggleStage = (id: string) => setExpandedStages(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // Score finalization state
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [selectedDeadlineHours, setSelectedDeadlineHours] = useState<string>('48');
  const [customHours, setCustomHours] = useState<string>('');
  const [isFinalizingScore, setIsFinalizingScore] = useState(false);

  const appealWindowInfo = useMemo(() => {
    if (!scoreFinalizedAt) return { status: 'not_finalized' as const, remaining: 0 };
    const finalizedTime = new Date(scoreFinalizedAt).getTime();
    const deadlineTime = finalizedTime + (appealDeadlineHours * 60 * 60 * 1000);
    const now = Date.now();
    const remaining = deadlineTime - now;
    if (remaining <= 0) return { status: 'expired' as const, remaining: 0 };
    return { status: 'active' as const, remaining };
  }, [scoreFinalizedAt, appealDeadlineHours]);

  const [countdownText, setCountdownText] = useState('');
  useEffect(() => {
    if (appealWindowInfo.status !== 'active') { setCountdownText(''); return; }
    const update = () => {
      if (!scoreFinalizedAt) return;
      const finalizedTime = new Date(scoreFinalizedAt).getTime();
      const deadlineTime = finalizedTime + (appealDeadlineHours * 60 * 60 * 1000);
      const diff = deadlineTime - Date.now();
      if (diff <= 0) { setCountdownText('Hết hạn'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdownText(`${h}h ${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [appealWindowInfo.status, scoreFinalizedAt, appealDeadlineHours]);

  const assignedTaskIdsByUser = useMemo(() => {
    const result = new Map<string, Set<string>>();

    tasks.forEach(task => {
      task.task_assignments?.forEach(assignment => {
        const assignedTaskIds = result.get(assignment.user_id) ?? new Set<string>();
        assignedTaskIds.add(task.id);
        result.set(assignment.user_id, assignedTaskIds);
      });
    });

    return result;
  }, [tasks]);

  const isTaskAssignedToUser = useCallback((taskId: string, userId: string) => {
    return assignedTaskIdsByUser.get(userId)?.has(taskId) ?? false;
  }, [assignedTaskIdsByUser]);

  const hasAssignedTasksInStage = useCallback((userId: string, stageId: string) => {
    const assignedTaskIds = assignedTaskIdsByUser.get(userId);
    if (!assignedTaskIds) return false;

    return tasks.some(task => task.stage_id === stageId && assignedTaskIds.has(task.id));
  }, [assignedTaskIdsByUser, tasks]);

  const handleFinalizeScores = async () => {
    setIsFinalizingScore(true);
    try {
      const hours = selectedDeadlineHours === 'custom' ? parseInt(customHours) || 48 : parseInt(selectedDeadlineHours);
      await supabase.from('groups').update({ score_finalized_at: new Date().toISOString(), appeal_deadline_hours: hours } as any).eq('id', groupId);
      if (user && profile) {
        await logActivity({ userId: user.id, userName: profile.full_name, action: 'FINALIZE_SCORES', actionType: 'score', description: `Chốt điểm — cho phép phúc khảo trong ${hours} giờ`, groupId });
      }
      toast({ title: 'Đã chốt điểm', description: `Thành viên có thể phúc khảo trong ${hours} giờ` });
      setFinalizeDialogOpen(false);
      onRefreshGroup?.();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally { setIsFinalizingScore(false); }
  };

  const handleUnfinalizeScores = async () => {
    try {
      await supabase.from('groups').update({ score_finalized_at: null, appeal_deadline_hours: 48 } as any).eq('id', groupId);
      if (user && profile) {
        await logActivity({ userId: user.id, userName: profile.full_name, action: 'UNFINALIZE_SCORES', actionType: 'score', description: 'Hủy chốt điểm', groupId });
      }
      toast({ title: 'Đã hủy chốt điểm' });
      onRefreshGroup?.();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    }
  };

  // ── Data fetching (unchanged business logic) ──
  useEffect(() => {
    if (groupId) fetchScoreData();
  }, [groupId]);

  const fetchScoreData = async () => {
    setIsLoading(true);
    try {
      const taskIds = tasks.map(t => t.id);
      let fetchedTaskScores: TaskScore[] = [];
      if (taskIds.length > 0) {
        const { data: taskScoresData } = await supabase
          .from('task_scores').select('*').in('task_id', taskIds);
        fetchedTaskScores = (taskScoresData || []).filter(score =>
          isTaskAssignedToUser(score.task_id, score.user_id)
        ) as unknown as TaskScore[];
        setTaskScores(fetchedTaskScores);
      }

      const stageIds = stages.map(s => s.id);
      let fetchedStageScores: MemberStageScore[] = [];
      if (stageIds.length > 0) {
        const { data: stageScoresData } = await supabase
          .from('member_stage_scores').select('*').in('stage_id', stageIds);
        fetchedStageScores = (stageScoresData || []).filter(score =>
          hasAssignedTasksInStage(score.user_id, score.stage_id)
        ) as unknown as MemberStageScore[];
        setStageScores(fetchedStageScores);

        const { data: weightsData } = await supabase
          .from('stage_weights').select('*').in('stage_id', stageIds);
        setStageWeights((weightsData || []) as unknown as StageWeight[]);
      }

      const { data: finalScoresData } = await supabase
        .from('member_final_scores').select('*').eq('group_id', groupId);
      setFinalScores((finalScoresData || []) as unknown as MemberFinalScore[]);

      // Collect all score IDs belonging to this project for filtering
      const projectTaskScoreIds = new Set(fetchedTaskScores.map(ts => ts.id));
      const projectStageScoreIds = new Set(fetchedStageScores.map(ss => ss.id));
      const projectFinalScoreIds = new Set((finalScoresData || []).map((fs: any) => fs.id));

      let appealsQuery = supabase.from('score_appeals').select('*');
      if (!isLeader) appealsQuery = appealsQuery.eq('user_id', user?.id);
      const { data: appealsData } = await appealsQuery;
      
      // Filter appeals to only those belonging to this project
      const projectAppeals = (appealsData || []).filter(a =>
        (a.task_score_id && projectTaskScoreIds.has(a.task_score_id)) ||
        (a.stage_score_id && projectStageScoreIds.has(a.stage_score_id)) ||
        (a.final_score_id && projectFinalScoreIds.has(a.final_score_id))
      );
      
      if (projectAppeals.length > 0) {
        const appealIds = projectAppeals.map(a => a.id);
        const { data: attachmentsData } = await supabase
          .from('appeal_attachments').select('*').in('appeal_id', appealIds);
        const appealsWithAttachments = projectAppeals.map(appeal => ({
          ...appeal,
          attachments: attachmentsData?.filter(a => a.appeal_id === appeal.id) || []
        }));
        setAppeals(appealsWithAttachments as unknown as ScoreAppeal[]);
      } else {
        setAppeals([]);
      }

      // Fetch history and filter to this project's score IDs only
      const allScoreIds = [...projectTaskScoreIds, ...projectStageScoreIds, ...projectFinalScoreIds];
      let historyQuery = supabase.from('score_adjustment_history').select('*').order('created_at', { ascending: false }).limit(200);
      if (!isLeader) historyQuery = historyQuery.eq('user_id', user?.id);
      const { data: historyData } = await historyQuery;
      const projectHistory = (historyData || []).filter(h => allScoreIds.includes(h.target_id));
      setHistory(projectHistory as unknown as ScoreAdjustmentHistory[]);

      await autoSyncScores(fetchedTaskScores, fetchedStageScores);
    } catch (error: any) {
      toast({ title: 'Lỗi', description: 'Không thể tải dữ liệu điểm', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const autoSyncScores = async (currentTaskScores: TaskScore[], currentStageScores: MemberStageScore[]) => {
    try {
      const validTaskScores = currentTaskScores.filter(score =>
        isTaskAssignedToUser(score.task_id, score.user_id)
      );

      for (const task of tasks) {
        const assignments = task.task_assignments || [];
        for (const assignment of assignments) {
          const existing = currentTaskScores.find(ts => ts.task_id === task.id && ts.user_id === assignment.user_id);
          if (!existing) {
            await supabase.from('task_scores').insert({ task_id: task.id, user_id: assignment.user_id, base_score: 100, final_score: 100 });
          }
        }
      }

      for (const stage of stages) {
        const stageTasks = tasks.filter(t => t.stage_id === stage.id);
        const stageTaskIds = stageTasks.map(t => t.id);
        const assigneeIds = new Set<string>();
        stageTasks.forEach(task => { task.task_assignments?.forEach(a => assigneeIds.add(a.user_id)); });

        for (const userId of assigneeIds) {
          const userTaskScores = validTaskScores.filter(ts =>
            stageTaskIds.includes(ts.task_id) && ts.user_id === userId
          );
          if (userTaskScores.length > 0) {
            const avgScore = userTaskScores.reduce((sum, ts) => sum + (ts.final_score || 100), 0) / userTaskScores.length;
            const existing = currentStageScores.find(ss => ss.stage_id === stage.id && ss.user_id === userId);
            if (existing) {
              await supabase.from('member_stage_scores').update({ average_score: avgScore, final_stage_score: avgScore + ((existing as any).adjusted_score || 0) }).eq('id', existing.id);
            } else {
              await supabase.from('member_stage_scores').insert({ stage_id: stage.id, user_id: userId, average_score: avgScore, final_stage_score: avgScore });
            }
          }
        }
      }

      const memberIds = members.map(m => m.user_id);
      const { data: latestStageScores } = await supabase.from('member_stage_scores').select('*').in('stage_id', stages.map(s => s.id));
      const { data: latestWeights } = await supabase.from('stage_weights').select('*').in('stage_id', stages.map(s => s.id));
      const { data: latestFinalScores } = await supabase.from('member_final_scores').select('*').eq('group_id', groupId);
      
      for (const memberId of memberIds) {
        const memberStageScores = (latestStageScores || []).filter(ss =>
          ss.user_id === memberId && hasAssignedTasksInStage(memberId, ss.stage_id)
        );
        if (memberStageScores.length > 0) {
          let totalWeight = 0, weightedSum = 0;
          memberStageScores.forEach(ss => {
            const weight = (latestWeights || []).find(w => w.stage_id === ss.stage_id)?.weight ?? 1;
            weightedSum += (ss.final_stage_score || 100) * weight;
            totalWeight += weight;
          });
          const calculatedScore = totalWeight > 0 ? weightedSum / totalWeight : 100;
          const existing = (latestFinalScores || []).find(fs => fs.group_id === groupId && fs.user_id === memberId);
          if (existing) {
            await supabase.from('member_final_scores').update({ weighted_average: calculatedScore, final_score: calculatedScore + (existing.adjustment || 0) }).eq('id', existing.id);
          } else {
            await supabase.from('member_final_scores').insert({ group_id: groupId, user_id: memberId, weighted_average: calculatedScore, final_score: calculatedScore });
          }
        }
      }

      // Refresh
      const taskIds = tasks.map(t => t.id);
      if (taskIds.length > 0) {
        const { data: r } = await supabase.from('task_scores').select('*').in('task_id', taskIds);
        setTaskScores(((r || []).filter(score =>
          isTaskAssignedToUser(score.task_id, score.user_id)
        )) as unknown as TaskScore[]);
      }
      const stageIds = stages.map(s => s.id);
      if (stageIds.length > 0) {
        const { data: r } = await supabase.from('member_stage_scores').select('*').in('stage_id', stageIds);
        setStageScores(((r || []).filter(score =>
          hasAssignedTasksInStage(score.user_id, score.stage_id)
        )) as unknown as MemberStageScore[]);
      }
      const { data: r } = await supabase.from('member_final_scores').select('*').eq('group_id', groupId);
      setFinalScores((r || []) as unknown as MemberFinalScore[]);
    } catch (error) {
      console.error('Auto-sync error:', error);
    }
  };

  // ── Handlers (unchanged) ──
  const handleAdjustScore = async (adjustment: number, reason: string) => {
    if (!adjustmentDialog) return;
    setIsProcessing(true);
    try {
      const { type, targetId, memberId } = adjustmentDialog;
      if (type === 'task') {
        const existing = taskScores.find(ts => ts.id === targetId);
        const previousScore = existing?.final_score || 100;
        const newScore = 100 + adjustment;
        await supabase.from('task_scores').update({ adjustment, adjustment_reason: reason, adjusted_by: user?.id, adjusted_at: new Date().toISOString(), final_score: newScore }).eq('id', targetId);
        await supabase.from('score_adjustment_history').insert([{ adjustment_type: 'task', target_id: targetId, user_id: memberId, previous_score: previousScore, new_score: newScore, adjustment_value: adjustment, reason, adjusted_by: user?.id || '' }]);
      } else if (type === 'stage') {
        const existing = stageScores.find(ss => ss.id === targetId);
        const previousScore = existing?.final_stage_score || 100;
        const newScore = (existing?.average_score || 100) + adjustment;
        await supabase.from('member_stage_scores').update({ adjusted_score: adjustment, adjustment_reason: reason, adjusted_by: user?.id, adjusted_at: new Date().toISOString(), final_stage_score: newScore }).eq('id', targetId);
        await supabase.from('score_adjustment_history').insert([{ adjustment_type: 'stage', target_id: targetId, user_id: memberId, previous_score: previousScore, new_score: newScore, adjustment_value: adjustment, reason, adjusted_by: user?.id || '' }]);
      } else if (type === 'final') {
        const existing = finalScores.find(fs => fs.id === targetId);
        const previousScore = existing?.final_score || 100;
        const newScore = ((existing as any)?.weighted_average || 100) + adjustment;
        await supabase.from('member_final_scores').update({ adjustment, adjustment_reason: reason, adjusted_by: user?.id, adjusted_at: new Date().toISOString(), final_score: newScore }).eq('id', targetId);
        await supabase.from('score_adjustment_history').insert([{ adjustment_type: 'final', target_id: targetId, user_id: memberId, previous_score: previousScore, new_score: newScore, adjustment_value: adjustment, reason, adjusted_by: user?.id || '' }]);
      }
      toast({ title: 'Thành công', description: 'Đã điều chỉnh điểm' });
      // Send notification to the affected member
      if (user && profile && memberId !== user.id) {
        const memberProfile = getMemberProfile(memberId);
        const typeLabel = type === 'task' ? 'task' : type === 'stage' ? 'giai đoạn' : 'tổng quá trình';
        const scoreValue = type === 'task' ? (100 + adjustment) : type === 'stage' ? ((stageScores.find(ss => ss.id === targetId)?.average_score || 100) + adjustment) : (((finalScores.find(fs => fs.id === targetId) as any)?.weighted_average || 100) + adjustment);
        await sendNotification({
          userId: memberId,
          type: 'score_updated',
          title: 'Điểm đã được cập nhật',
          message: `Leader ${profile.full_name} đã điều chỉnh điểm ${typeLabel} của bạn: ${scoreValue.toFixed(1)} điểm${reason ? ` — "${reason}"` : ''}`,
          groupId,
        });
      }
      setAdjustmentDialog(null);
      fetchScoreData();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitAppeal = async (content: string, files: File[]) => {
    if (!appealDialog) return;
    setIsProcessing(true);
    try {
      const insertPayload: any = {
        user_id: user?.id || '',
        task_score_id: appealDialog.type === 'task' ? appealDialog.scoreId : null,
        stage_score_id: appealDialog.type === 'stage' ? appealDialog.scoreId : null,
        final_score_id: appealDialog.type === 'final' ? appealDialog.scoreId : null,
        reason: content,
      };
      const { data: appealData, error: appealError } = await supabase
        .from('score_appeals').insert([insertPayload]).select().single();
      if (appealError) throw appealError;
      for (const file of files) {
        const filePath = `${user?.id}/${appealData.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await r2Storage.from('appeal-attachments').upload(filePath, file);
        if (!uploadError) {
          await supabase.from('appeal_attachments').insert([{ appeal_id: appealData.id, file_name: file.name, file_path: filePath, file_size: file.size, storage_name: filePath }]);
        }
      }
      toast({ title: 'Thành công', description: 'Đã gửi phúc khảo' });
      if (user && profile) {
        await logActivity({
          userId: user.id, userName: profile.full_name,
          action: 'SUBMIT_APPEAL', actionType: 'score',
          description: `Gửi phúc khảo điểm ${appealDialog.type === 'task' ? 'task' : appealDialog.type === 'stage' ? 'giai đoạn' : 'tổng'}: "${content.substring(0, 100)}"`,
          groupId,
        });
      }
      setAppealDialog(null);
      fetchScoreData();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAppealResponse = async (approved: boolean, response: string, pointsToAdd?: number) => {
    if (!reviewDialog.appeal) return;
    setIsProcessing(true);
    try {
      await supabase.from('score_appeals').update({ 
        status: approved ? 'approved' : 'rejected', 
        reviewer_response: response, 
        reviewer_id: user?.id 
      }).eq('id', reviewDialog.appeal.id);

      // If approved and points to add, adjust the score
      if (approved && pointsToAdd && pointsToAdd > 0) {
        const appeal = reviewDialog.appeal;
        if (appeal.task_score_id) {
          const existing = taskScores.find(ts => ts.id === appeal.task_score_id);
          if (existing) {
            const currentAdj = existing.adjustment ?? 0;
            const newAdj = currentAdj + pointsToAdd;
            const newScore = (existing.base_score ?? 100) + newAdj;
            await supabase.from('task_scores').update({ 
              adjustment: newAdj, 
              final_score: newScore, 
              adjusted_by: user?.id, 
              adjusted_at: new Date().toISOString(),
              adjustment_reason: `Phúc khảo được chấp nhận: +${pointsToAdd} điểm. ${response}`
            }).eq('id', appeal.task_score_id);
            await supabase.from('score_adjustment_history').insert([{
              adjustment_type: 'task', target_id: appeal.task_score_id, user_id: appeal.user_id,
              previous_score: existing.final_score, new_score: newScore, adjustment_value: pointsToAdd,
              reason: `Phúc khảo: +${pointsToAdd} điểm`, adjusted_by: user?.id || ''
            }]);
          }
        } else if (appeal.stage_score_id) {
          const existing = stageScores.find(ss => ss.id === appeal.stage_score_id);
          if (existing) {
            const currentAdj = (existing as any).adjusted_score ?? 0;
            const newAdj = currentAdj + pointsToAdd;
            const newScore = (existing.average_score ?? 100) + newAdj;
            await supabase.from('member_stage_scores').update({ 
              adjusted_score: newAdj, 
              final_stage_score: newScore 
            }).eq('id', appeal.stage_score_id);
            await supabase.from('score_adjustment_history').insert([{
              adjustment_type: 'stage', target_id: appeal.stage_score_id, user_id: appeal.user_id,
              previous_score: existing.final_stage_score, new_score: newScore, adjustment_value: pointsToAdd,
              reason: `Phúc khảo: +${pointsToAdd} điểm`, adjusted_by: user?.id || ''
            }]);
          }
        }
      }

      toast({ title: 'Thành công', description: approved ? 'Đã chấp nhận phúc khảo' : 'Đã từ chối phúc khảo' });
      if (user && profile) {
        await logActivity({
          userId: user.id, userName: profile.full_name,
          action: approved ? 'APPROVE_APPEAL' : 'REJECT_APPEAL', actionType: 'score',
          description: `${approved ? 'Chấp nhận' : 'Từ chối'} phúc khảo của ${getMemberProfile(reviewDialog.appeal.user_id)?.full_name || 'Unknown'}${approved && pointsToAdd ? ` (+${pointsToAdd} điểm)` : ''}`,
          groupId,
        });
      }
      setReviewDialog({ isOpen: false, appeal: null });
      fetchScoreData();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveWeights = async (weights: { stageId: string; weight: number }[]) => {
    setIsProcessing(true);
    try {
      for (const { stageId, weight } of weights) {
        const existing = stageWeights.find(w => w.stage_id === stageId);
        if (existing) {
          await supabase.from('stage_weights').update({ weight }).eq('id', existing.id);
        } else {
          await supabase.from('stage_weights').insert([{ group_id: groupId, stage_id: stageId, weight }]);
        }
      }
      toast({ title: 'Thành công', description: 'Đã lưu trọng số giai đoạn' });
      if (user && profile) {
        const weightChanges = weights.map(w => {
          const stage = stages.find(s => s.id === w.stageId);
          return `${stage?.name || 'Unknown'}: ${w.weight}%`;
        }).join(', ');
        await logActivity({
          userId: user.id, userName: profile.full_name,
          action: 'UPDATE_STAGE_WEIGHTS', actionType: 'score',
          description: `Thay đổi trọng số giai đoạn: ${weightChanges}`,
          groupId,
        });
      }
      setWeightDialog(false);
      fetchScoreData();
    } catch (error: any) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Helpers ──
  const getMemberProfile = (userId: string) => members.find(m => m.user_id === userId)?.profiles;
  const pendingAppealsCount = appeals.filter(a => a.status === 'pending').length;
  
  const currentUserMember = members.find(m => m.user_id === user?.id);
  const currentUserProfile = currentUserMember?.profiles;
  const currentUserAssignedTaskIds = useMemo(() => {
    if (!user?.id) return new Set<string>();
    return assignedTaskIdsByUser.get(user.id) ?? new Set<string>();
  }, [assignedTaskIdsByUser, user?.id]);
  const currentUserAssignedStageIds = useMemo(() => {
    const result = new Set<string>();
    tasks.forEach(task => {
      if (task.stage_id && currentUserAssignedTaskIds.has(task.id)) result.add(task.stage_id);
    });
    return result;
  }, [currentUserAssignedTaskIds, tasks]);
  const currentUserFinalScore = finalScores.find(fs => fs.user_id === user?.id);
  const currentUserStageScores = stageScores.filter(ss => ss.user_id === user?.id && currentUserAssignedStageIds.has(ss.stage_id));
  const currentUserTaskScores = taskScores.filter(ts => ts.user_id === user?.id && currentUserAssignedTaskIds.has(ts.task_id));
  const currentUserAppeals = appeals.filter(a => a.user_id === user?.id);

  const openAdjDetail = (type: AdjustmentDetailDialog['type'], title: string, score: number, baseScore: number, adjustment: number, reason: string | null, adjustedAt: string | null) => {
    setAdjustmentDetailDialog({ isOpen: true, type, title, score, baseScore, adjustment, reason, adjustedAt });
  };

  const leaderStats = useMemo(() => {
    const avgFinalScore = finalScores.length > 0 
      ? finalScores.reduce((sum, fs) => sum + (fs.final_score || 100), 0) / finalScores.length : 100;
    const adjustedCount = taskScores.filter(ts => (ts.adjustment ?? 0) !== 0).length;
    const highPerformers = finalScores.filter(fs => (fs.final_score || 100) >= 90).length;
    const lowPerformers = finalScores.filter(fs => (fs.final_score || 100) < 70).length;
    return { avgFinalScore, adjustedCount, highPerformers, lowPerformers, totalMembers: members.length };
  }, [finalScores, taskScores, members]);

  // Sorted & ranked members
  const rankedMembers = useMemo(() => {
    return members
      .map(m => {
        const fs = finalScores.find(f => f.user_id === m.user_id);
        return { member: m, score: fs?.final_score ?? 100, finalScore: fs };
      })
      .sort((a, b) => b.score - a.score);
  }, [members, finalScores]);

  // ── Appeal selection helpers ──
  const handleSelectAppealTarget = (type: 'final' | 'stage' | 'task', scoreId: string, currentScore: number, adjustment: number, adjustmentReason: string | null) => {
    setAppealSelectionOpen(false);

    let targetName = '';
    let targetSubtitle = '';
    let baseScore = 100;
    let scoreBreakdown: Array<{ label: string; value: string | number; highlight?: boolean }> = [];

    if (type === 'final') {
      const fs = currentUserFinalScore;
      targetName = 'Điểm tổng quá trình';
      targetSubtitle = 'Tổng kết toàn bộ giai đoạn';
      const wa = (fs as any)?.weighted_average ?? currentScore;
      const adj = fs?.adjustment ?? 0;
      scoreBreakdown = [
        { label: 'Trung bình có trọng số:', value: Number(wa).toFixed(1) },
        ...(adj !== 0 ? [{ label: 'Điều chỉnh:', value: `${adj > 0 ? '+' : ''}${adj}` }] : []),
        { label: 'Điểm tổng kết:', value: Number(currentScore).toFixed(1), highlight: true },
      ];
    } else if (type === 'stage') {
      const stageScore = currentUserStageScores.find(ss => ss.id === scoreId);
      const stage = stages.find(s => s.id === stageScore?.stage_id);
      const stageIdx = [...stages].sort((a, b) => a.order_index - b.order_index).findIndex(s => s.id === stage?.id);
      targetName = stage?.name || 'Giai đoạn';
      targetSubtitle = `Giai đoạn ${stageIdx + 1}`;
      const avg = stageScore?.average_score ?? currentScore;
      const kCoeff = (stageScore as any)?.k_coefficient ?? 1;
      scoreBreakdown = [
        { label: 'Trung bình task:', value: Number(avg).toFixed(1) },
        ...(kCoeff !== 1 ? [{ label: 'Hệ số K:', value: `×${Number(kCoeff).toFixed(2)}` }] : []),
        ...(adjustment !== 0 ? [{ label: 'Điều chỉnh:', value: `${adjustment > 0 ? '+' : ''}${adjustment}` }] : []),
        { label: 'Điểm giai đoạn:', value: Number(currentScore).toFixed(1), highlight: true },
      ];
    } else if (type === 'task') {
      const taskScore = currentUserTaskScores.find(ts => ts.id === scoreId);
      const task = tasks.find(t => t.id === taskScore?.task_id);
      const stage = stages.find(s => s.id === task?.stage_id);
      const sortedStages = [...stages].sort((a, b) => a.order_index - b.order_index);
      const stageIdx = sortedStages.findIndex(s => s.id === stage?.id);
      const stageTasks = tasks
        .filter(t => t.stage_id === stage?.id && currentUserAssignedTaskIds.has(t.id))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const taskIdx = stageTasks.findIndex(t => t.id === task?.id);
      targetName = task?.title || 'Task';
      targetSubtitle = `Task ${stageIdx + 1}.${taskIdx + 1} — ${stage?.name || ''}`;
      baseScore = taskScore?.base_score ?? 100;
      const latePenalty = (taskScore as any)?.late_penalty ?? 0;
      const reviewPenalty = (taskScore as any)?.review_penalty ?? 0;
      const earlyBonus = (taskScore as any)?.early_bonus;
      const bugBonus = (taskScore as any)?.bug_hunter_bonus;
      scoreBreakdown = [
        { label: 'Điểm gốc:', value: baseScore },
        ...(latePenalty ? [{ label: 'Trừ trễ hạn:', value: `-${latePenalty}` }] : []),
        ...(reviewPenalty ? [{ label: 'Trừ review:', value: `-${reviewPenalty}` }] : []),
        ...(earlyBonus ? [{ label: 'Bonus nộp sớm:', value: '✓' }] : []),
        ...(bugBonus ? [{ label: 'Bonus Bug Hunter:', value: '✓' }] : []),
        ...(adjustment !== 0 ? [{ label: 'Điều chỉnh Leader:', value: `${adjustment > 0 ? '+' : ''}${adjustment}` }] : []),
        { label: 'Điểm cuối:', value: Number(currentScore).toFixed(1), highlight: true },
      ];
    }

    setAppealDialog({ isOpen: true, type, scoreId, currentScore, adjustment, adjustmentReason, targetName, targetSubtitle, baseScore, scoreBreakdown });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Đang tải điểm quá trình...</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // LEADER: Overview
  // ═══════════════════════════════════════════════
  const renderLeaderOverview = () => {
    const avgScore = leaderStats.avgFinalScore;
    const avgTier = getScoreTier(avgScore);

    return (
      <div className="space-y-4">
        {/* Compact stat row */}
        <div className="grid grid-cols-4 gap-2">
          <div className={`flex items-center gap-2.5 p-3 rounded-lg border ${avgTier.bg} ${avgTier.border}`}>
            <ScoreCircle score={avgScore} size="sm" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">TB dự án</p>
              <p className={`text-lg font-bold ${avgTier.color} leading-tight`}>{avgScore.toFixed(1)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-3 rounded-lg border bg-card">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Xuất sắc</p>
              <p className="text-lg font-bold text-emerald-600 leading-tight">{leaderStats.highPerformers}<span className="text-xs text-muted-foreground font-normal">/{leaderStats.totalMembers}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-3 rounded-lg border bg-card">
            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
              <TrendingDown className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Cần cải thiện</p>
              <p className="text-lg font-bold text-rose-600 leading-tight">{leaderStats.lowPerformers}<span className="text-xs text-muted-foreground font-normal">/{leaderStats.totalMembers}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-3 rounded-lg border bg-card">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Edit2 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Điều chỉnh</p>
              <p className="text-lg font-bold text-primary leading-tight">{leaderStats.adjustedCount}</p>
            </div>
          </div>
        </div>

        {/* Member ranking table */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Bảng xếp hạng thành viên
              </CardTitle>
              <Badge variant="outline" className="gap-1 text-[10px]">
                <Activity className="w-3 h-3" />
                Tự động
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-1">
              {rankedMembers.map(({ member, score, finalScore: fs }, index) => {
                const memberProfile = member.profiles;
                const tier = getScoreTier(score);
                const adjustment = fs?.adjustment ?? 0;
                const memberAppeals = appeals.filter(a => a.user_id === member.user_id && a.status === 'pending');
                const rank = index + 1;

                return (
                  <div 
                    key={member.id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all hover:shadow-sm ${tier.bg} ${tier.border}`}
                  >
                    <RankBadge rank={rank} />
                    <UserAvatar src={memberProfile?.avatar_url} name={memberProfile?.full_name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{memberProfile?.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">{memberProfile?.student_id}</p>
                    </div>

                    {memberAppeals.length > 0 && (
                      <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px] px-1.5">
                        <Clock className="w-3 h-3 mr-0.5" />
                        {memberAppeals.length}
                      </Badge>
                    )}

                    <div className="flex items-center gap-1.5">
                      <AdjustmentPill 
                        adjustment={adjustment}
                        onClick={() => fs && openAdjDetail('final', `Chi tiết: ${memberProfile?.full_name}`, score, (fs as any).weighted_average ?? 100, adjustment, (fs as any).adjustment_reason || null, (fs as any).adjusted_at || null)}
                      />
                      <ScoreCircle score={score} size="sm" />
                    </div>

                    {fs && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                        onClick={() => setAdjustmentDialog({ isOpen: true, type: 'final', targetId: fs.id, memberId: member.user_id, memberName: memberProfile?.full_name || '', currentScore: score })}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}

              {members.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Chưa có thành viên nào</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ═══════════════════════════════════════════════
  // LEADER: Stage / Task detail
  // ═══════════════════════════════════════════════
  const renderLeaderDetail = () => {
    const sortedStages = [...stages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return (
      <div className="space-y-3">
        {sortedStages.length === 0 ? (
          <Card><CardContent className="text-center py-12"><p className="text-muted-foreground">Chưa có giai đoạn nào</p></CardContent></Card>
        ) : (
          sortedStages.map((stage, stageIndex) => {
            const stageTasks = tasks.filter(t => t.stage_id === stage.id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            const weight = stageWeights.find(w => w.stage_id === stage.id)?.weight ?? 1;
            const stageNumber = stageIndex + 1;
            const stageColor = `hsl(var(--stage-${Math.min(stageNumber, 6)}))`;

            return (
              <Card key={stage.id} className="overflow-hidden">
                <div className="h-1" style={{ background: stageColor }} />
                <CardHeader className="pb-2 px-4 pt-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: stageColor }}>
                      {stageNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm">{stage.name}</CardTitle>
                      <CardDescription className="text-[10px]">
                        {stageTasks.length} task · Trọng số: ×{weight}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 px-4 pb-3">
                  <div className="space-y-1">
                    {stageTasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Chưa có task</p>
                    ) : stageTasks.map((task, taskIndex) => {
                      const assigneeIds = task.task_assignments?.map((a: any) => a.user_id) || [];
                      const taskScoresForTask = taskScores.filter(ts => ts.task_id === task.id);
                      const scoredCount = taskScoresForTask.length;
                      const totalCount = assigneeIds.length;
                      const taskCode = `${stageNumber}.${taskIndex + 1}`;
                      const hasAdjustments = taskScoresForTask.some(ts => (ts.adjustment ?? 0) !== 0);
                      
                      return (
                        <div key={task.id}
                          className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer group"
                          onClick={() => setTaskScoringDialog({ isOpen: true, task })}
                        >
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{taskCode}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{task.title}</p>
                          </div>

                          {task.status === 'DONE' && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] shrink-0"><CheckCircle className="w-3 h-3 mr-0.5" />Xong</Badge>}
                          {task.status === 'VERIFIED' && <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] shrink-0"><Star className="w-3 h-3 mr-0.5" />Duyệt</Badge>}

                          {totalCount > 0 && (
                            scoredCount === totalCount ? (
                              <Badge className="bg-emerald-500 text-[10px] shrink-0"><CheckCircle className="w-3 h-3 mr-0.5" />{scoredCount}/{totalCount}{hasAdjustments && ' ✱'}</Badge>
                            ) : scoredCount > 0 ? (
                              <Badge variant="secondary" className="text-[10px] shrink-0"><Clock className="w-3 h-3 mr-0.5" />{scoredCount}/{totalCount}</Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground text-[10px] shrink-0">Chưa chấm</Badge>
                            )
                          )}

                          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════
  // LEADER: Appeals
  // ═══════════════════════════════════════════════
  const renderLeaderAppeals = () => (
    <Card>
      <CardHeader className="px-4 pt-4 pb-2">
        <CardTitle className="text-sm">Phúc khảo</CardTitle>
        <CardDescription className="text-xs">Quản lý các yêu cầu phúc khảo từ thành viên</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {appeals.length === 0 ? (
          <div className="text-center py-10">
            <MessageSquare className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Chưa có phúc khảo nào</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {appeals.map(appeal => {
              const appealProfile = getMemberProfile(appeal.user_id);
              const typeLabel = appeal.task_score_id ? 'Task' : appeal.stage_score_id ? 'Giai đoạn' : 'Điểm tổng';
              const statusConfig = appeal.status === 'pending' 
                ? { bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800', badge: 'bg-amber-100 text-amber-700 border-amber-300', icon: Clock, text: 'Chờ xử lý' }
                : appeal.status === 'approved'
                  ? { bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800', badge: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: CheckCircle, text: 'Chấp nhận' }
                  : { bg: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800', badge: 'bg-rose-100 text-rose-700 border-rose-300', icon: AlertCircle, text: 'Từ chối' };

              return (
                <div key={appeal.id}
                  className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${statusConfig.bg}`}
                  onClick={() => setReviewDialog({ isOpen: true, appeal })}
                >
                  <UserAvatar src={appealProfile?.avatar_url} name={appealProfile?.full_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{appealProfile?.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{appeal.reason}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{typeLabel}</Badge>
                  {appeal.attachments && appeal.attachments.length > 0 && <Badge variant="secondary" className="text-[10px]"><FileText className="w-3 h-3 mr-0.5" />{appeal.attachments.length}</Badge>}
                  <Badge variant="outline" className={`text-[10px] ${statusConfig.badge}`}>
                    <statusConfig.icon className="w-3 h-3 mr-0.5" />{statusConfig.text}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(appeal.created_at).toLocaleDateString('vi-VN')}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // ═══════════════════════════════════════════════
  // MEMBER: Redesigned Score View
  // ═══════════════════════════════════════════════
  const renderMemberScoresView = () => {
    if (currentUserAssignedTaskIds.size === 0) {
      return (
        <Card>
          <CardContent className="py-10 text-center space-y-2">
            <Target className="w-10 h-10 text-muted-foreground/20 mx-auto" />
            <p className="text-sm font-medium">Bạn chưa được phân công task nào</p>
            <p className="text-xs text-muted-foreground">Điểm quá trình sẽ hiển thị khi có task được giao cho bạn.</p>
          </CardContent>
        </Card>
      );
    }

    const finalScore = currentUserFinalScore?.final_score ?? 100;
    const calculatedScore = (currentUserFinalScore as any)?.weighted_average ?? 100;
    const adjustment = currentUserFinalScore?.adjustment ?? 0;
    const tier = getScoreTier(finalScore);
    const TierIcon = tier.icon;

    // Find current user rank
    const currentUserRank = rankedMembers.findIndex(rm => rm.member.user_id === user?.id) + 1;

    const sortedStages = [...stages].sort((a, b) => a.order_index - b.order_index);
    const visibleStages = sortedStages.filter(stage => currentUserAssignedStageIds.has(stage.id));

    // Status info for hero integration
    const statusInfo = (() => {
      if (!isLeader && appealWindowInfo.status === 'not_finalized') return { text: 'Điểm chưa được chốt', sub: 'Chờ Leader chốt điểm để gửi phúc khảo', color: 'text-muted-foreground', bg: 'bg-muted/50', icon: Lock };
      if (!isLeader && appealWindowInfo.status === 'active') return { text: `Phúc khảo đang mở — còn ${countdownText}`, sub: `Thời hạn ${appealDeadlineHours} giờ`, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: CheckCircle };
      if (!isLeader && appealWindowInfo.status === 'expired') return { text: 'Đã hết thời gian phúc khảo', sub: `Thời hạn ${appealDeadlineHours} giờ đã kết thúc`, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30', icon: Timer };
      return null;
    })();

    return (
      <div className="space-y-4">
        {/* ── HERO SCORE BANNER (with integrated status) ── */}
        <Card className="overflow-hidden">
          <div className="p-5">
            <div className="flex items-center gap-5">
              {/* Large score circle */}
              <div className="shrink-0">
                <ScoreCircle score={finalScore} size="xl" />
              </div>

              {/* Info section */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2.5">
                  <UserAvatar src={currentUserProfile?.avatar_url} name={currentUserProfile?.full_name} size="sm" className="border border-border" />
                  <div className="min-w-0">
                    <h3 className="text-base font-bold truncate">{currentUserProfile?.full_name}</h3>
                    <p className="text-xs text-muted-foreground">{currentUserProfile?.student_id}</p>
                  </div>
                </div>

                {/* Tier + stats row */}
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className={`${tier.bg} ${tier.color} border ${tier.border} gap-1`}>
                    <TierIcon className="w-3 h-3" />
                    {tier.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3" />{currentUserTaskScores.length} task</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><BarChart3 className="w-3 h-3" />{currentUserStageScores.length} giai đoạn</span>
                  {currentUserRank > 0 && (
                    <span className="text-xs font-semibold flex items-center gap-1">
                      <RankBadge rank={currentUserRank} />
                      #{currentUserRank}/{members.length}
                    </span>
                  )}
                  {adjustment !== 0 && (
                    <AdjustmentPill
                      adjustment={adjustment}
                      onClick={() => openAdjDetail('final', 'Chi tiết điểm quá trình', finalScore, calculatedScore, adjustment, currentUserFinalScore?.adjustment_reason || null, currentUserFinalScore?.adjusted_at || null)}
                    />
                  )}
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">Điểm tổng</span>
                    <span className={`font-bold ${tier.color}`}>{finalScore.toFixed(1)} / 100</span>
                  </div>
                  <Progress value={Math.min(finalScore, 100)} className="h-2" />
                </div>

                {/* Integrated status line */}
                {statusInfo && (
                  <div className={`flex items-center gap-2 text-xs ${statusInfo.color}`}>
                    <statusInfo.icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-medium">{statusInfo.text}</span>
                    {appealWindowInfo.status === 'active' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2 ml-auto shrink-0"
                        onClick={() => setAppealSelectionOpen(true)}
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Phúc khảo
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* ── SCORE TABLE ── */}
        {visibleStages.length === 0 ? (
          <div className="text-center py-10">
            <BarChart3 className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Chưa có giai đoạn nào</p>
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                     <th className="text-left p-3 font-medium text-muted-foreground whitespace-nowrap">Giai đoạn</th>
                     <th className="text-left p-3 font-medium text-muted-foreground whitespace-nowrap">Task</th>
                     <th className="text-right p-3 font-medium text-muted-foreground whitespace-nowrap">Điểm gốc</th>
                     <th className="text-right p-3 font-medium text-muted-foreground whitespace-nowrap">Đ.chỉnh</th>
                     <th className="text-left p-3 font-medium text-muted-foreground whitespace-nowrap">Lý do</th>
                     <th className="text-right p-3 font-medium text-muted-foreground whitespace-nowrap">Tổng</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStages.map((stage, stageIndex) => {
                    const stageScore = currentUserStageScores.find(ss => ss.stage_id === stage.id);
                    const weight = stageWeights.find(w => w.stage_id === stage.id)?.weight ?? 1;
                    const score = stageScore?.final_stage_score ?? 100;
                    const stageAdj = (stageScore as any)?.adjusted_score ?? 0;
                    const stageNumber = stageIndex + 1;
                    const stageTier = getScoreTier(score);
                    const stageColor = `hsl(var(--stage-${Math.min(stageNumber, 6)}))`;

                    const stageTasks = tasks
                      .filter(t => t.stage_id === stage.id && currentUserAssignedTaskIds.has(t.id))
                      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                    const userStageTaskScores = currentUserTaskScores.filter(ts => stageTasks.some(task => task.id === ts.task_id));

                    const taskRows = userStageTaskScores.length > 0 ? userStageTaskScores : [];

                    return (
                      <React.Fragment key={stage.id}>
                        {/* Stage header row */}
                        <tr
                          className="border-b cursor-pointer hover:bg-muted/30 transition-colors"
                          style={{ backgroundColor: `color-mix(in srgb, ${stageColor} 6%, transparent)` }}
                          onClick={() => {
                            if (stageScore) openAdjDetail('stage', `Giai đoạn: ${stage.name}`, score, stageScore.average_score ?? 100, stageAdj, stageScore.adjustment_reason || null, stageScore.adjusted_at || null);
                          }}
                        >
                          <td className="p-3" colSpan={2}>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: stageColor }}>
                                {stageNumber}
                              </div>
                              <div className="min-w-0">
                                <span className="font-semibold">{stage.name}</span>
                                <span className="text-xs text-muted-foreground ml-2">×{weight} · {userStageTaskScores.length} task</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-right text-xs text-muted-foreground tabular-nums">
                            {stageScore?.average_score != null ? stageScore.average_score.toFixed(1) : '—'}
                          </td>
                          <td className="p-3 text-right">
                             {stageAdj !== 0 && <AdjustmentPill adjustment={stageAdj} />}
                          </td>
                          <td className="p-3 text-left">
                             {stageScore?.adjustment_reason && (
                               <span className="text-xs text-muted-foreground truncate block max-w-[200px]" title={stageScore.adjustment_reason}>{stageScore.adjustment_reason}</span>
                             )}
                          </td>
                          <td className="p-3 text-right">
                             <span className={`font-bold tabular-nums ${stageTier.color}`}>{score.toFixed(1)}</span>
                          </td>
                         </tr>

                        {/* Task rows */}
                        {taskRows.map(taskScore => {
                          const task = tasks.find(t => t.id === taskScore.task_id);
                          const adj = taskScore.adjustment ?? 0;
                          const taskIndex = stageTasks.findIndex(t => t.id === taskScore.task_id) + 1;
                          const taskCode = `${stageNumber}.${taskIndex}`;
                          const taskTier = getScoreTier(taskScore.final_score);

                          return (
                            <tr
                              key={taskScore.id}
                              className="border-b last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer group"
                              onClick={() => openAdjDetail('task', `Task: ${task?.title}`, taskScore.final_score, taskScore.base_score ?? 100, adj, taskScore.adjustment_reason || null, taskScore.adjusted_at || null)}
                            >
                              <td className="p-3 pl-12">
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{taskCode}</span>
                              </td>
                              <td className="p-3">
                                <span className="text-sm truncate block max-w-[300px] group-hover:text-primary transition-colors">{task?.title || 'Task'}</span>
                              </td>
                              <td className="p-3 text-right tabular-nums text-muted-foreground">{(taskScore.base_score ?? 100).toFixed(0)}</td>
                              <td className="p-3 text-right">
                                 {adj !== 0 && <AdjustmentPill adjustment={adj} />}
                               </td>
                               <td className="p-3 text-left">
                                 {taskScore.adjustment_reason && (
                                   <span className="text-xs text-muted-foreground truncate block max-w-[200px]" title={taskScore.adjustment_reason}>{taskScore.adjustment_reason}</span>
                                 )}
                               </td>
                               <td className="p-3 text-right">
                                 <span className={`font-bold tabular-nums ${taskTier.color}`}>{taskScore.final_score.toFixed(0)}</span>
                               </td>
                             </tr>
                          );
                        })}

                        {/* Empty state for stage with no task scores */}
                        {taskRows.length === 0 && (
                           <tr className="border-b">
                             <td colSpan={6} className="p-3 pl-12 text-xs text-muted-foreground italic">Chưa có điểm task</td>
                           </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════
  // MEMBER: Appeals list
  // ═══════════════════════════════════════════════
  const renderMemberAppealsView = () => (
    <Card>
      <CardHeader className="px-4 pt-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          Phúc khảo của tôi
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {currentUserAppeals.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Bạn chưa gửi phúc khảo nào</p>
            <p className="text-xs text-muted-foreground mt-0.5">Bấm nút "Phúc khảo" ở trên để gửi</p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentUserAppeals.map(appeal => {
              const typeLabel = appeal.task_score_id ? 'Task' : appeal.stage_score_id ? 'Giai đoạn' : 'Điểm tổng';
              const statusConfig = appeal.status === 'pending' 
                ? { bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800', badgeCls: 'bg-amber-100 text-amber-700 border-amber-300', icon: Clock, text: 'Chờ xử lý' }
                : appeal.status === 'approved'
                  ? { bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800', badgeCls: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: CheckCircle, text: 'Chấp nhận' }
                  : { bg: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800', badgeCls: 'bg-rose-100 text-rose-700 border-rose-300', icon: AlertCircle, text: 'Từ chối' };

              return (
                <div key={appeal.id} className={`p-3 rounded-lg border ${statusConfig.bg}`}>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">{typeLabel}</Badge>
                      <Badge variant="outline" className={`text-[10px] ${statusConfig.badgeCls}`}>
                        <statusConfig.icon className="w-3 h-3 mr-0.5" />{statusConfig.text}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{new Date(appeal.created_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{appeal.reason}</p>
                  {appeal.attachments && appeal.attachments.length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                      <FileText className="w-3 h-3" />{appeal.attachments.length} tệp đính kèm
                    </div>
                  )}
                  {appeal.reviewer_response && (
                    <div className={`mt-2 p-2.5 rounded-md ${appeal.status === 'approved' ? 'bg-emerald-100/50 dark:bg-emerald-900/20' : 'bg-rose-100/50 dark:bg-rose-900/20'}`}>
                      <p className="text-[10px] font-semibold mb-0.5 text-muted-foreground uppercase tracking-wide">Phản hồi từ Leader</p>
                      <p className="text-sm">{appeal.reviewer_response}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // ═══════════════════════════════════════════════
  // Appeal selection dialog (unified)
  // ═══════════════════════════════════════════════
  const renderAppealSelectionDialog = () => {
    const sortedStages = [...stages].sort((a, b) => a.order_index - b.order_index);
    
    // Build all appealable items as a flat list
    const appealItems: Array<{
      type: 'final' | 'stage' | 'task';
      id: string;
      label: string;
      sublabel?: string;
      score: number;
      adjustment: number;
      adjustmentReason: string | null;
      icon: React.ReactNode;
      category: string;
    }> = [];

    // Final score — always show
    appealItems.push({
      type: 'final',
      id: currentUserFinalScore?.id || 'final-placeholder',
      label: 'Điểm tổng quá trình',
      sublabel: 'Tổng kết toàn bộ giai đoạn',
      score: currentUserFinalScore?.final_score ?? 100,
      adjustment: currentUserFinalScore?.adjustment ?? 0,
      adjustmentReason: (currentUserFinalScore as any)?.adjustment_reason || null,
      icon: <Trophy className="w-4 h-4 text-primary" />,
      category: 'final',
    });

    // Stage scores
    sortedStages.forEach((stage, idx) => {
      const stageScore = currentUserStageScores.find(ss => ss.stage_id === stage.id);
      if (!stageScore) return;
      appealItems.push({
        type: 'stage',
        id: stageScore.id,
        label: stage.name,
        sublabel: `Giai đoạn ${idx + 1}`,
        score: stageScore.final_stage_score ?? 100,
        adjustment: (stageScore as any).adjusted_score != null ? ((stageScore as any).adjusted_score - (stageScore.average_score ?? 100)) : 0,
        adjustmentReason: null,
        icon: <BarChart3 className="w-4 h-4 text-sky-500" />,
        category: 'stage',
      });
    });

    // Task scores grouped by stage
    sortedStages.forEach((stage, stageIdx) => {
      const stageTasks = tasks
        .filter(t => t.stage_id === stage.id && currentUserAssignedTaskIds.has(t.id))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      stageTasks.forEach((task, taskIdx) => {
        const taskScore = currentUserTaskScores.find(ts => ts.task_id === task.id);
        if (!taskScore) return;
        appealItems.push({
          type: 'task',
          id: taskScore.id,
          label: task.title,
          sublabel: `Task ${stageIdx + 1}.${taskIdx + 1} — ${stage.name}`,
          score: taskScore.final_score,
          adjustment: taskScore.adjustment ?? 0,
          adjustmentReason: taskScore.adjustment_reason || null,
          icon: <FileText className="w-4 h-4 text-amber-500" />,
          category: 'task',
        });
      });
    });

    return (
      <Dialog open={appealSelectionOpen} onOpenChange={setAppealSelectionOpen}>
        <DialogContent className="w-[1280px] max-w-[95vw]" style={{ aspectRatio: '16/9', maxHeight: '90vh' }}>
          <div className="flex flex-col h-full overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Send className="w-4 h-4 text-primary" />
              Gửi phúc khảo
            </DialogTitle>
            <DialogDescription>Chọn mục điểm bạn muốn phúc khảo</DialogDescription>
          </DialogHeader>

          {/* Status banner */}
          <div className="flex items-center gap-2.5 p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300 font-medium flex-1">
              Phúc khảo được xét duyệt trong <strong>48 giờ</strong>.
            </p>
            {countdownText && (
              <Badge variant="outline" className="border-amber-300 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] shrink-0 gap-1">
                <Timer className="w-3 h-3" />
                Còn {countdownText}
              </Badge>
            )}
          </div>

          {/* Items list */}
          <div className="flex-1 overflow-y-auto space-y-1 py-2">
            {appealItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Chưa có điểm nào để phúc khảo</p>
            ) : (
              <>
                {/* Final score - highlighted */}
                {appealItems.filter(i => i.category === 'final').map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectAppealTarget(item.type, item.id, item.score, item.adjustment, item.adjustmentReason)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-left group shadow-md"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary-foreground/20 flex items-center justify-center shrink-0">
                      <Trophy className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-primary-foreground">{item.label}</p>
                      <p className="text-[10px] text-primary-foreground/70">{item.sublabel}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.adjustment !== 0 && <AdjustmentPill adjustment={item.adjustment} />}
                      <span className="text-lg font-extrabold text-primary-foreground tabular-nums">{item.score.toFixed(0)}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-primary-foreground/70 group-hover:text-primary-foreground transition-colors shrink-0" />
                  </button>
                ))}

                {/* Stage scores */}
                {appealItems.filter(i => i.category === 'stage').length > 0 && (
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pt-3 pb-1 px-1">Điểm giai đoạn</p>
                )}
                {appealItems.filter(i => i.category === 'stage').map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectAppealTarget(item.type, item.id, item.score, item.adjustment, item.adjustmentReason)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/50 hover:border-sky-300 dark:hover:border-sky-700 transition-all text-left group"
                  >
                    <div className="w-7 h-7 rounded-md bg-sky-50 dark:bg-sky-950/30 flex items-center justify-center shrink-0">{item.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground">{item.sublabel}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.adjustment !== 0 && <AdjustmentPill adjustment={item.adjustment} />}
                      <span className={`text-sm font-bold tabular-nums ${getScoreTier(item.score).color}`}>{item.score.toFixed(0)}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-sky-600 transition-colors shrink-0" />
                  </button>
                ))}

                {/* Task scores */}
                {appealItems.filter(i => i.category === 'task').length > 0 && (
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pt-3 pb-1 px-1">Điểm từng task</p>
                )}
                {appealItems.filter(i => i.category === 'task').map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectAppealTarget(item.type, item.id, item.score, item.adjustment, item.adjustmentReason)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/50 hover:border-amber-300 dark:hover:border-amber-700 transition-all text-left group"
                  >
                    <div className="w-7 h-7 rounded-md bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">{item.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground">{item.sublabel}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.adjustment !== 0 && <AdjustmentPill adjustment={item.adjustment} />}
                      <span className={`text-xs font-bold tabular-nums ${getScoreTier(item.score).color}`}>{item.score.toFixed(0)}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-amber-600 transition-colors shrink-0" />
                  </button>
                ))}
              </>
            )}
          </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // ═══════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Điểm quá trình
            {scoreFinalizedAt && (
              <Badge className="bg-amber-500 text-white text-[10px] gap-1">
                <Lock className="w-3 h-3" />
                Đã chốt
              </Badge>
            )}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isLeader ? 'Cập nhật tự động theo thời gian thực' : 'Theo dõi điểm quá trình của bạn'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Member appeal button moved to hero banner */}
          {/* Leader buttons */}
          {isLeader && (
            <>
              {!scoreFinalizedAt ? (
                <Button size="sm" className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white shadow-md font-semibold" onClick={() => setFinalizeDialogOpen(true)}>
                  <Lock className="w-3.5 h-3.5" />
                  Chốt điểm
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={handleUnfinalizeScores}>
                  <Unlock className="w-3.5 h-3.5" />
                  Hủy chốt
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setWeightDialog(true)} className="gap-1.5">
                <Scale className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Trọng số</span>
              </Button>
              <Button variant="outline" size="sm" onClick={fetchScoreData} disabled={isLoading} className="gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Làm mới</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Member status banners integrated into hero — removed separate blocks */}

      {/* Finalization info banner for leader */}
      {isLeader && scoreFinalizedAt && (
        <div className="flex items-center gap-3 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
          <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <span className="text-sm flex-1">
            Điểm đã chốt · Phúc khảo: <strong>{appealDeadlineHours}h</strong>
            {appealWindowInfo.status === 'active' && countdownText && <> · Còn <strong>{countdownText}</strong></>}
            {appealWindowInfo.status === 'expired' && <> · <span className="text-muted-foreground">Đã hết hạn</span></>}
          </span>
        </div>
      )}

      {/* Pending appeals alert */}
      {isLeader && pendingAppealsCount > 0 && (
        <div className="flex items-center gap-3 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
          <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <span className="text-sm flex-1">
            Có <strong>{pendingAppealsCount}</strong> phúc khảo đang chờ xử lý
          </span>
          <Button variant="outline" size="sm" className="shrink-0 h-7 text-xs" onClick={() => setActiveTab('appeals')}>Xem ngay</Button>
        </div>
      )}

      {/* Main content */}
      {isLeader ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="gap-1 text-xs">
              <Users className="w-3.5 h-3.5" /><span className="hidden sm:inline">Tổng quan</span>
            </TabsTrigger>
            <TabsTrigger value="stages" className="gap-1 text-xs">
              <FileText className="w-3.5 h-3.5" /><span className="hidden sm:inline">Chi tiết</span>
            </TabsTrigger>
            <TabsTrigger value="appeals" className="gap-1 text-xs">
              <MessageSquare className="w-3.5 h-3.5" /><span className="hidden sm:inline">Phúc khảo</span>
              {pendingAppealsCount > 0 && <Badge variant="destructive" className="ml-0.5 px-1.5 py-0 text-[10px] h-4">{pendingAppealsCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1 text-xs">
              <History className="w-3.5 h-3.5" /><span className="hidden sm:inline">Lịch sử</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-4">{renderLeaderOverview()}</TabsContent>
          <TabsContent value="stages" className="mt-4">{renderLeaderDetail()}</TabsContent>
          <TabsContent value="appeals" className="mt-4">{renderLeaderAppeals()}</TabsContent>
          <TabsContent value="history" className="mt-4"><ScoreHistoryPanel history={history} members={members} isLeader={isLeader} /></TabsContent>
        </Tabs>
      ) : (
        <Tabs value={memberTab} onValueChange={setMemberTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-xs">
            <TabsTrigger value="scores" className="gap-1.5 text-xs"><Award className="w-3.5 h-3.5" />Điểm của tôi</TabsTrigger>
            <TabsTrigger value="appeals" className="gap-1.5 text-xs">
              <MessageSquare className="w-3.5 h-3.5" />Phúc khảo
              {currentUserAppeals.filter(a => a.status === 'pending').length > 0 && (
                <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-[10px] h-4">{currentUserAppeals.filter(a => a.status === 'pending').length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="scores" className="mt-3">{renderMemberScoresView()}</TabsContent>
          <TabsContent value="appeals" className="mt-3">{renderMemberAppealsView()}</TabsContent>
        </Tabs>
      )}

      {/* ── Dialogs ── */}
      {adjustmentDialog?.isOpen && (
        <ScoreAdjustmentDialog isOpen={true} onClose={() => setAdjustmentDialog(null)} onSave={handleAdjustScore}
          title={adjustmentDialog.type === 'task' ? 'Điều chỉnh điểm Task' : adjustmentDialog.type === 'stage' ? 'Điều chỉnh điểm Giai đoạn' : 'Điều chỉnh điểm Quá trình'}
          currentScore={adjustmentDialog.currentScore} memberName={adjustmentDialog.memberName} isLoading={isProcessing} />
      )}

      {appealDialog?.isOpen && (
        <AppealDialog isOpen={true} onClose={() => setAppealDialog(null)} onSubmit={handleSubmitAppeal}
          title="Gửi phúc khảo" description="Trình bày lý do và đính kèm minh chứng để phúc khảo điểm"
          currentScore={appealDialog.currentScore} adjustment={appealDialog.adjustment} adjustmentReason={appealDialog.adjustmentReason} isLoading={isProcessing}
          appealType={appealDialog.type} targetName={appealDialog.targetName} targetSubtitle={appealDialog.targetSubtitle}
          baseScore={appealDialog.baseScore} scoreBreakdown={appealDialog.scoreBreakdown} />
      )}

      {reviewDialog.isOpen && (
        <AppealReviewDialog isOpen={true} onClose={() => setReviewDialog({ isOpen: false, appeal: null })} appeal={reviewDialog.appeal}
          onApprove={(response, pointsToAdd) => handleAppealResponse(true, response, pointsToAdd)} onReject={(response) => handleAppealResponse(false, response)} isLoading={isProcessing} />
      )}

      <StageWeightDialog isOpen={weightDialog} onClose={() => setWeightDialog(false)} onSave={handleSaveWeights} stages={stages} currentWeights={stageWeights} isLoading={isProcessing} />

      <TaskScoringDialog isOpen={taskScoringDialog.isOpen} onClose={() => setTaskScoringDialog({ isOpen: false, task: null })} task={taskScoringDialog.task} members={members} taskScores={taskScores} onScoreUpdated={fetchScoreData} />

      {/* Appeal selection dialog */}
      {renderAppealSelectionDialog()}

      {/* Adjustment detail dialog */}
      {adjustmentDetailDialog && (
        <Dialog open={adjustmentDetailDialog.isOpen} onOpenChange={(open) => !open && setAdjustmentDetailDialog(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Info className="w-4 h-4 text-primary" />
                {adjustmentDetailDialog.title}
              </DialogTitle>
              <DialogDescription>Chi tiết về điểm và điều chỉnh</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Điểm gốc</p>
                  <p className="text-2xl font-bold tabular-nums">{adjustmentDetailDialog.baseScore.toFixed(1)}</p>
                </div>
                <div className={`p-3 rounded-lg text-center border ${getScoreTier(adjustmentDetailDialog.score).bg} ${getScoreTier(adjustmentDetailDialog.score).border}`}>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Hiện tại</p>
                  <p className={`text-2xl font-bold tabular-nums ${getScoreTier(adjustmentDetailDialog.score).color}`}>{adjustmentDetailDialog.score.toFixed(1)}</p>
                </div>
              </div>
              {adjustmentDetailDialog.adjustment !== 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Điều chỉnh:</span>
                      <AdjustmentPill adjustment={adjustmentDetailDialog.adjustment} />
                    </div>
                    {adjustmentDetailDialog.reason && (
                      <div className={`p-3 rounded-lg border ${adjustmentDetailDialog.adjustment < 0 ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800' : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'}`}>
                        <p className="text-[10px] font-semibold mb-1 uppercase tracking-wide text-muted-foreground">
                          {adjustmentDetailDialog.adjustment < 0 ? 'Lý do trừ điểm' : 'Lý do cộng điểm'}
                        </p>
                        <p className="text-sm">{adjustmentDetailDialog.reason}</p>
                      </div>
                    )}
                    {adjustmentDetailDialog.adjustedAt && (
                      <p className="text-[10px] text-muted-foreground text-right">
                        Điều chỉnh lúc: {new Date(adjustmentDetailDialog.adjustedAt).toLocaleString('vi-VN')}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
      {/* Finalize scores dialog */}
      <Dialog open={finalizeDialogOpen} onOpenChange={setFinalizeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Lock className="w-4 h-4 text-amber-500" />
              Chốt điểm quá trình
            </DialogTitle>
            <DialogDescription>Sau khi chốt, thành viên sẽ được phúc khảo trong thời hạn bạn chọn.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Thời hạn phúc khảo</Label>
              <Select value={selectedDeadlineHours} onValueChange={setSelectedDeadlineHours}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24 giờ</SelectItem>
                  <SelectItem value="48">48 giờ (khuyến nghị)</SelectItem>
                  <SelectItem value="72">72 giờ</SelectItem>
                  <SelectItem value="custom">Tùy chỉnh</SelectItem>
                </SelectContent>
              </Select>
              {selectedDeadlineHours === 'custom' && (
                <div className="flex items-center gap-2">
                  <Input type="number" min={1} max={720} value={customHours} onChange={e => setCustomHours(e.target.value)} placeholder="Số giờ" className="w-32" />
                  <span className="text-sm text-muted-foreground">giờ</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Thành viên sẽ có <strong>{selectedDeadlineHours === 'custom' ? (customHours || '48') : selectedDeadlineHours} giờ</strong> để gửi phúc khảo sau khi chốt điểm.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizeDialogOpen(false)}>Hủy</Button>
            <Button className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white" onClick={handleFinalizeScores} disabled={isFinalizingScore}>
              {isFinalizingScore ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Chốt điểm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
