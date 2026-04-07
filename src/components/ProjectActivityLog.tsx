import { useEffect, useState, useMemo, useCallback } from 'react';
import { logActivity } from '@/lib/activityLogger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import UserAvatar from '@/components/UserAvatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ActivityLogFilters, { ActivityFilters } from '@/components/ActivityLogFilters';
import { exportActivityLogToPdf } from '@/lib/activityLogPdf';
import { toast } from 'sonner';
import { 
  Activity, UserPlus, UserMinus, Edit, Trash2, Plus, CheckCircle,
  AlertCircle, Layers, FileText, Clock, List, LayoutGrid, FileDown,
  Power, CheckSquare, X
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  action_type: string;
  description: string | null;
  created_at: string;
  metadata: any;
  avatar_url?: string;
}

interface ProjectActivityLogProps {
  groupId: string;
  groupName?: string;
  isLeader?: boolean;
  isAdmin?: boolean;
  isGroupCreator?: boolean;
}

const DEFAULT_FILTERS: ActivityFilters = {
  searchText: '',
  actionType: 'all',
  action: 'all',
  userId: 'all',
  dateFrom: undefined,
  dateTo: undefined,
};

export default function ProjectActivityLog({ groupId, groupName = 'Project', isLeader = false, isAdmin = false, isGroupCreator = false }: ProjectActivityLogProps) {
  const { user, profile } = useAuth();
  const canManage = isLeader || isAdmin;
  const canManageLogs = isGroupCreator || isAdmin; // Only creator/admin can toggle logging & delete logs

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<ActivityFilters>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');
  const [isExporting, setIsExporting] = useState(false);
  const [loggingEnabled, setLoggingEnabled] = useState(true);
  const [isTogglingLogging, setIsTogglingLogging] = useState(false);

  // Selection state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Confirm dialogs
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchLogs();
    fetchLoggingStatus();
  }, [groupId]);

  const fetchLoggingStatus = async () => {
    const { data } = await supabase
      .from('groups')
      .select('activity_logging_enabled')
      .eq('id', groupId)
      .single();
    if (data) setLoggingEnabled((data as any).activity_logging_enabled ?? true);
  };

  const fetchLogs = async () => {
    try {
      const { data } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (data) {
        const userIds = [...new Set(data.map(log => log.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, avatar_url')
          .in('id', userIds);

        const avatarMap = new Map(profiles?.map(p => [p.id, p.avatar_url]) || []);
        setLogs(data.map(log => ({ ...log, avatar_url: avatarMap.get(log.user_id) || null })) as ActivityLog[]);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLogging = async () => {
    setIsTogglingLogging(true);
    const newVal = !loggingEnabled;
    const { error } = await supabase
      .from('groups')
      .update({ activity_logging_enabled: newVal } as any)
      .eq('id', groupId);
    if (!error) {
      setLoggingEnabled(newVal);
      toast.success(newVal ? 'Đã bật ghi nhật ký' : 'Đã tắt ghi nhật ký');
      
      // Log the toggle action
      const userName = profile?.full_name || user?.email || 'Unknown';
      await logActivity({
        groupId: groupId,
        userId: user!.id,
        userName,
        action: newVal ? 'ENABLE_LOGGING' : 'DISABLE_LOGGING',
        actionType: 'system',
        description: newVal
          ? `${userName} đã bật ghi nhật ký hoạt động`
          : `${userName} đã tắt ghi nhật ký hoạt động`,
        metadata: { logging_enabled: newVal, toggled_at: new Date().toISOString() },
      });
      await fetchLogs();
    }
    setIsTogglingLogging(false);
  };

  const createDeletionLog = async (count: number, type: 'all' | 'selected') => {
    const userName = profile?.full_name || user?.email || 'Unknown';
    await logActivity({
      groupId: groupId,
      userId: user!.id,
      userName,
      action: 'DELETE_LOGS',
      actionType: 'system',
      description: type === 'all'
        ? `${userName} đã xóa toàn bộ ${count} mục nhật ký dự án`
        : `${userName} đã xóa ${count} mục nhật ký được chọn`,
      metadata: { deleted_count: count, delete_type: type, deleted_at: new Date().toISOString() },
    });
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    const count = logs.length;
    const { error } = await supabase
      .from('activity_logs')
      .delete()
      .eq('group_id', groupId);
    if (!error) {
      await createDeletionLog(count, 'all');
      toast.success(`Đã xóa ${count} mục nhật ký`);
      await fetchLogs();
    } else {
      toast.error('Lỗi khi xóa nhật ký');
    }
    setIsDeleting(false);
    setConfirmDeleteAll(false);
  };

  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from('activity_logs')
      .delete()
      .in('id', ids);
    if (!error) {
      await createDeletionLog(ids.length, 'selected');
      toast.success(`Đã xóa ${ids.length} mục nhật ký`);
      setSelectedIds(new Set());
      setIsSelectMode(false);
      await fetchLogs();
    } else {
      toast.error('Lỗi khi xóa nhật ký');
    }
    setIsDeleting(false);
    setConfirmDeleteSelected(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredLogs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLogs.map(l => l.id)));
    }
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  };

  // Get unique users for filter
  const uniqueUsers = useMemo(() => {
    const userMap = new Map<string, string>();
    logs.forEach(log => {
      if (!userMap.has(log.user_id)) {
        userMap.set(log.user_id, log.user_name.split('@')[0]);
      }
    });
    return Array.from(userMap.entries()).map(([id, name]) => ({ id, name }));
  }, [logs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const matchesSearch = 
          log.user_name.toLowerCase().includes(searchLower) ||
          log.action.toLowerCase().includes(searchLower) ||
          (log.description?.toLowerCase().includes(searchLower) || false);
        if (!matchesSearch) return false;
      }
      if (filters.actionType !== 'all' && log.action_type !== filters.actionType) return false;
      if (filters.action !== 'all' && !log.action.includes(filters.action)) return false;
      if (filters.userId !== 'all' && log.user_id !== filters.userId) return false;
      if (filters.dateFrom) {
        const logDate = new Date(log.created_at); logDate.setHours(0,0,0,0);
        const fromDate = new Date(filters.dateFrom); fromDate.setHours(0,0,0,0);
        if (logDate < fromDate) return false;
      }
      if (filters.dateTo) {
        const logDate = new Date(log.created_at); logDate.setHours(23,59,59,999);
        const toDate = new Date(filters.dateTo); toDate.setHours(23,59,59,999);
        if (logDate > toDate) return false;
      }
      return true;
    });
  }, [logs, filters]);

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      await exportActivityLogToPdf({ projectName: groupName, logs: filteredLogs, dateFrom: filters.dateFrom, dateTo: filters.dateTo });
    } finally {
      setIsExporting(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'ADD_MEMBER': case 'CREATE_AND_ADD_MEMBER': return <UserPlus className="w-4 h-4 text-success" />;
      case 'REMOVE_MEMBER': return <UserMinus className="w-4 h-4 text-destructive" />;
      case 'UPDATE_MEMBER': return <Edit className="w-4 h-4 text-warning" />;
      case 'CREATE_STAGE': return <Plus className="w-4 h-4 text-primary" />;
      case 'UPDATE_STAGE': return <Layers className="w-4 h-4 text-warning" />;
      case 'DELETE_STAGE': return <Trash2 className="w-4 h-4 text-destructive" />;
      case 'CREATE_TASK': return <Plus className="w-4 h-4 text-primary" />;
      case 'UPDATE_TASK': return <FileText className="w-4 h-4 text-warning" />;
      case 'DELETE_TASK': return <Trash2 className="w-4 h-4 text-destructive" />;
      case 'SUBMISSION': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'LATE_SUBMISSION': return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'DELETE_LOGS': return <Trash2 className="w-4 h-4 text-muted-foreground" />;
      default: return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActionBadge = (actionType: string) => {
    switch (actionType) {
      case 'project_member': return <Badge variant="secondary" className="text-xs">Thành viên</Badge>;
      case 'stage': return <Badge className="bg-primary/10 text-primary text-xs">Giai đoạn</Badge>;
      case 'task': return <Badge className="bg-warning/10 text-warning text-xs">Task</Badge>;
      case 'resource': return <Badge className="bg-success/10 text-success text-xs">Tài nguyên</Badge>;
      case 'system': return <Badge className="bg-muted text-muted-foreground text-xs">Hệ thống</Badge>;
      default: return <Badge variant="outline" className="text-xs">{actionType}</Badge>;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Đang tải nhật ký hoạt động...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Nhật ký hoạt động
              <Badge variant="outline" className="ml-2">
                {filteredLogs.length} / {logs.length}
              </Badge>
              {!loggingEnabled && (
                <Badge variant="destructive" className="text-xs gap-1">
                  <Power className="w-3 h-3" /> Đã tắt
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* Logging toggle - only for group creator/admin */}
              {canManageLogs && (
                <div className="flex items-center gap-2 border rounded-md px-3 py-1.5">
                  <Label htmlFor="logging-toggle" className="text-xs text-muted-foreground cursor-pointer">
                    Ghi nhật ký
                  </Label>
                  <Switch
                    id="logging-toggle"
                    checked={loggingEnabled}
                    onCheckedChange={toggleLogging}
                    disabled={isTogglingLogging}
                  />
                </div>
              )}

              {/* Select mode toggle - only for group creator/admin */}
              {canManageLogs && !isSelectMode && logs.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setIsSelectMode(true)} className="gap-1.5">
                  <CheckSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">Chọn</span>
                </Button>
              )}

              {/* Delete all - only for group creator/admin */}
              {canManageLogs && logs.length > 0 && !isSelectMode && (
                <Button variant="outline" size="sm" onClick={() => setConfirmDeleteAll(true)} className="gap-1.5 text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Xóa tất cả</span>
                </Button>
              )}

              {/* View mode toggle */}
              <div className="flex border rounded-md">
                <Button variant={viewMode === 'timeline' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('timeline')} className="rounded-r-none">
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('table')} className="rounded-l-none">
                  <List className="w-4 h-4" />
                </Button>
              </div>
              
              <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={isExporting || filteredLogs.length === 0} className="gap-2">
                <FileDown className="w-4 h-4" />
                <span className="hidden sm:inline">Xuất PDF</span>
              </Button>
            </div>
          </div>

          {/* Select mode toolbar */}
          {isSelectMode && (
            <div className="flex items-center gap-2 mt-3 p-2 bg-muted/50 rounded-lg">
              <Checkbox
                checked={selectedIds.size === filteredLogs.length && filteredLogs.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                Đã chọn <span className="font-semibold text-foreground">{selectedIds.size}</span>
              </span>
              <div className="flex-1" />
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmDeleteSelected(true)}
                  className="gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa ({selectedIds.size})
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={exitSelectMode}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Logging disabled banner */}
          {!loggingEnabled && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-destructive">
                  Chức năng ghi nhật ký đang bị tắt
                </p>
                <p className="text-xs text-muted-foreground">
                  Hệ thống hiện không ghi nhận các hoạt động mới trong dự án này. Tất cả hành động của thành viên (thêm/xóa thành viên, tạo/sửa/xóa task, nộp bài, quản lý giai đoạn...) sẽ <span className="font-medium text-foreground">không được lưu lại</span> cho đến khi chức năng được bật trở lại.
                </p>
                {canManage && (
                  <p className="text-xs text-muted-foreground">
                    Bạn có thể bật lại bằng nút <span className="font-medium">Ghi nhật ký</span> ở trên.
                  </p>
                )}
              </div>
            </div>
          )}

          <ActivityLogFilters
            filters={filters}
            onFiltersChange={setFilters}
            users={uniqueUsers}
            onReset={() => setFilters(DEFAULT_FILTERS)}
          />

          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Không tìm thấy hoạt động nào</p>
            </div>
          ) : viewMode === 'timeline' ? (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {filteredLogs.map((log, index) => (
                  <div
                    key={log.id}
                    className={`relative flex gap-4 ${isSelectMode ? 'cursor-pointer hover:bg-muted/30 rounded-lg p-2 -m-2' : ''} ${selectedIds.has(log.id) ? 'bg-primary/5 rounded-lg p-2 -m-2' : ''}`}
                    onClick={isSelectMode ? () => toggleSelect(log.id) : undefined}
                  >
                    {/* Checkbox or Index */}
                    {isSelectMode ? (
                      <div className="w-8 h-8 flex items-center justify-center shrink-0">
                        <Checkbox checked={selectedIds.has(log.id)} onCheckedChange={() => toggleSelect(log.id)} />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                        {index + 1}
                      </div>
                    )}
                    
                    {index < filteredLogs.length - 1 && !isSelectMode && (
                      <div className="absolute left-4 top-10 w-0.5 h-full bg-border" />
                    )}
                    
                    <UserAvatar 
                      src={log.avatar_url}
                      name={log.user_name.split('@')[0]}
                      size="md"
                      className="border-2 border-background z-10 flex-shrink-0"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <span className="font-medium text-sm">{log.user_name.split('@')[0]}</span>
                        </div>
                        {getActionBadge(log.action_type)}
                      </div>
                      
                      {log.description && (
                        <p className="text-sm text-muted-foreground mt-1">{log.description}</p>
                      )}
                      
                      <div className="flex items-center gap-2 mt-1.5">
                        <p className="text-xs text-muted-foreground">{formatTime(log.created_at)}</p>
                        <span className="text-xs text-muted-foreground">•</span>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isSelectMode && (
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={selectedIds.size === filteredLogs.length && filteredLogs.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                    )}
                    <TableHead className="w-[60px]">STT</TableHead>
                    <TableHead className="w-[100px]">Ngày</TableHead>
                    <TableHead className="w-[80px]">Giờ</TableHead>
                    <TableHead>Người thực hiện</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Hành động</TableHead>
                    <TableHead>Mô tả</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log, index) => (
                    <TableRow
                      key={log.id}
                      className={`${isSelectMode ? 'cursor-pointer' : ''} ${selectedIds.has(log.id) ? 'bg-primary/5' : ''}`}
                      onClick={isSelectMode ? () => toggleSelect(log.id) : undefined}
                    >
                      {isSelectMode && (
                        <TableCell>
                          <Checkbox checked={selectedIds.has(log.id)} onCheckedChange={() => toggleSelect(log.id)} />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{format(new Date(log.created_at), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{format(new Date(log.created_at), 'HH:mm:ss')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserAvatar src={log.avatar_url} name={log.user_name.split('@')[0]} size="sm" />
                          <span className="text-sm">{log.user_name.split('@')[0]}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getActionBadge(log.action_type)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getActionIcon(log.action)}
                          <span className="text-sm">{log.action}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{log.description || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Confirm Delete All */}
      <AlertDialog open={confirmDeleteAll} onOpenChange={setConfirmDeleteAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa toàn bộ nhật ký</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn sắp xóa <span className="font-semibold">{logs.length}</span> mục nhật ký của dự án này.
              <br /><br />
              <span className="text-destructive font-medium">Thao tác này không thể hoàn tác!</span>
              <br />
              Hệ thống sẽ tự động ghi nhận một dòng nhật ký về hành động xóa này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Đang xóa...' : `Xóa ${logs.length} mục`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete Selected */}
      <AlertDialog open={confirmDeleteSelected} onOpenChange={setConfirmDeleteSelected}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa nhật ký đã chọn</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn sắp xóa <span className="font-semibold">{selectedIds.size}</span> mục nhật ký được chọn.
              <br /><br />
              <span className="text-destructive font-medium">Thao tác này không thể hoàn tác!</span>
              <br />
              Hệ thống sẽ tự động ghi nhận một dòng nhật ký về hành động xóa này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Đang xóa...' : `Xóa ${selectedIds.size} mục`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
