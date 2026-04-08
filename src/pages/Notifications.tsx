import { useState, useEffect, useMemo } from 'react';
import { Bell, Trash2, Check, Clock, CheckCircle2, Send, UserPlus, Edit, X as XIcon, MailOpen, Loader2, Inbox, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, format } from 'date-fns';
import { vi as viLocale } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { deleteWithUndo } from '@/lib/deleteWithUndo';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  task_id: string | null;
  group_id: string | null;
  is_read: boolean;
  created_at: string;
  tasks?: {
    title: string;
    deadline: string | null;
    status: string;
    groups?: { name: string; workspace_id: string | null };
  } | null;
}

type TabFilter = 'all' | 'unread' | 'read';

const ICON_MAP: Record<string, React.ReactNode> = {
  task_assigned: <UserPlus className="w-4 h-4 text-primary" />,
  task_deadline: <Clock className="w-4 h-4 text-warning" />,
  task_updated: <Edit className="w-4 h-4 text-blue-500" />,
  task_verified: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  task_submitted: <Send className="w-4 h-4 text-primary" />,
  project_invited: <MailOpen className="w-4 h-4 text-primary" />,
  invitation_accepted: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  invitation_declined: <XIcon className="w-4 h-4 text-destructive" />,
};

function groupByDate(notifications: Notification[], locale: string) {
  const groups: { label: string; items: Notification[] }[] = [];
  const map = new Map<string, Notification[]>();
  for (const n of notifications) {
    const d = new Date(n.created_at);
    let label: string;
    if (isToday(d)) label = locale === 'vi' ? 'Hôm nay' : 'Today';
    else if (isYesterday(d)) label = locale === 'vi' ? 'Hôm qua' : 'Yesterday';
    else if (isThisWeek(d)) label = locale === 'vi' ? 'Tuần này' : 'This week';
    else label = format(d, 'dd/MM/yyyy');
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(n);
  }
  for (const [label, items] of map) groups.push({ label, items });
  return groups;
}

export default function Notifications() {
  const { user } = useAuth();
  const { workspaces, activeWorkspace } = useWorkspace();
  const { locale } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tab, setTab] = useState<TabFilter>('all');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [wsFilter, setWsFilter] = useState<string>('all');
  const PAGE_SIZE = 50;

  const dateLocale = locale === 'vi' ? viLocale : enUS;

  const fetchNotifications = async (append = false) => {
    if (!user) return;
    if (append) setLoadingMore(true); else setIsLoading(true);
    try {
      const offset = append ? notifications.length : 0;
      const { data, error } = await supabase
        .from('notifications')
        .select(`*, tasks (title, deadline, status, groups (name, workspace_id))`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE);
      if (error) throw error;
      const fetched = (data as Notification[]) || [];
      setHasMore(fetched.length > PAGE_SIZE);
      const trimmed = fetched.slice(0, PAGE_SIZE);
      if (append) {
        setNotifications(prev => [...prev, ...trimmed]);
      } else {
        setNotifications(trimmed);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notif-page-rt')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchNotifications();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);

  // Filter by tab and workspace
  const filtered = useMemo(() => {
    let result = notifications;
    if (tab === 'unread') result = result.filter(n => !n.is_read);
    if (tab === 'read') result = result.filter(n => n.is_read);
    if (wsFilter !== 'all') {
      result = result.filter(n => {
        const taskWsId = n.tasks?.groups?.workspace_id;
        return taskWsId === wsFilter;
      });
    }
    return result;
  }, [notifications, tab, wsFilter]);

  const grouped = useMemo(() => groupByDate(filtered, locale), [filtered, locale]);

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    toast.success(locale === 'vi' ? 'Đã đánh dấu tất cả đã đọc' : 'All marked as read');
  };

  const deleteNotification = (id: string) => {
    const deleted = notifications.find(n => n.id === id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    deleteWithUndo({
      description: locale === 'vi' ? 'Đã xóa thông báo' : 'Notification deleted',
      onDelete: async () => { await supabase.from('notifications').delete().eq('id', id); },
      onUndo: () => { if (deleted) setNotifications(prev => [deleted, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())); },
    });
  };

  const deleteAll = () => {
    if (!user) return;
    const saved = [...notifications];
    setNotifications([]);
    deleteWithUndo({
      description: locale === 'vi' ? 'Đã xóa tất cả thông báo' : 'All notifications deleted',
      onDelete: async () => { await supabase.from('notifications').delete().eq('user_id', user.id); },
      onUndo: () => setNotifications(saved),
    });
  };

  const getTimeRemaining = (notification: Notification) => {
    const deadline = notification.tasks?.deadline;
    const taskStatus = notification.tasks?.status;
    if (!deadline) return null;
    if (notification.type === 'task_submitted') return null;
    if (taskStatus === 'DONE' || taskStatus === 'VERIFIED') return null;
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff < 0) return <Badge variant="destructive" className="text-[10px] h-4">{locale === 'vi' ? 'Quá hạn' : 'Overdue'}</Badge>;
    if (diff < 24 * 60 * 60 * 1000) return <Badge className="text-[10px] h-4 bg-warning text-warning-foreground">{locale === 'vi' ? 'Sắp hết hạn' : 'Due soon'}</Badge>;
    return null;
  };

  const t = locale === 'vi'
    ? { title: 'Thông báo', unread: 'chưa đọc', allRead: 'Tất cả đã đọc', markAll: 'Đọc hết', deleteAll: 'Xóa hết', all: 'Tất cả', unreadTab: 'Chưa đọc', readTab: 'Đã đọc', allWorkspaces: 'Tất cả Workspace', noNotifs: 'Không có thông báo', noUnread: 'Không có thông báo chưa đọc', allReadMsg: 'Bạn đã đọc hết rồi 🎉', willNotify: 'Sẽ có thông báo khi có hoạt động mới', loading: 'Đang tải...', loadMore: 'Tải thêm', showedAll: 'Đã hiển thị tất cả', subtitle: 'Quản lý tất cả thông báo của bạn' }
    : { title: 'Notifications', unread: 'unread', allRead: 'All read', markAll: 'Mark all read', deleteAll: 'Delete all', all: 'All', unreadTab: 'Unread', readTab: 'Read', allWorkspaces: 'All Workspaces', noNotifs: 'No notifications', noUnread: 'No unread notifications', allReadMsg: "You're all caught up 🎉", willNotify: "You'll be notified when there's new activity", loading: 'Loading...', loadMore: 'Load more', showedAll: 'All notifications shown', subtitle: 'Manage all your notifications' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} ${t.unread}` : t.allRead} · {t.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-1.5">
              <Check className="w-3.5 h-3.5" />
              {t.markAll}
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="outline" size="sm" onClick={deleteAll} className="gap-1.5 text-destructive hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
              {t.deleteAll}
            </Button>
          )}
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabFilter)} className="w-full sm:w-auto">
          <TabsList className="h-9 bg-muted/50 border border-border/40">
            <TabsTrigger value="all" className="gap-1.5 text-xs px-3">
              <Inbox className="w-3.5 h-3.5" />
              {t.all}
            </TabsTrigger>
            <TabsTrigger value="unread" className="gap-1.5 text-xs px-3">
              <Filter className="w-3.5 h-3.5" />
              {t.unreadTab}
              {unreadCount > 0 && (
                <span className="ml-1 text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 min-w-[18px] text-center leading-[18px]">{unreadCount}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="read" className="gap-1.5 text-xs px-3">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t.readTab}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={wsFilter} onValueChange={setWsFilter}>
          <SelectTrigger className="w-full sm:w-[220px] h-9">
            <SelectValue placeholder={t.allWorkspaces} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allWorkspaces}</SelectItem>
            {workspaces.map(ws => (
              <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p className="text-sm">{t.loading}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 opacity-30" />
            </div>
            <p className="text-base font-medium text-foreground">
              {tab === 'unread' ? t.noUnread : t.noNotifs}
            </p>
            <p className="text-sm mt-1">
              {tab === 'unread' ? t.allReadMsg : t.willNotify}
            </p>
          </div>
        ) : (
          <div>
            {grouped.map((group) => (
              <div key={group.label}>
                <div className="flex items-center gap-3 px-6 py-2.5 bg-muted/30 border-b border-border/40">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</span>
                  <div className="flex-1 h-px bg-border/30" />
                  <span className="text-xs text-muted-foreground">{group.items.length}</span>
                </div>
                {group.items.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-4 px-6 py-4 transition-colors hover:bg-muted/30 cursor-pointer group border-b border-border/20 last:border-b-0",
                      !n.is_read && "bg-primary/[0.03]"
                    )}
                    onClick={() => { if (!n.is_read) markAsRead(n.id); }}
                  >
                    {/* Icon */}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      !n.is_read ? "bg-primary/10" : "bg-muted/60"
                    )}>
                      {ICON_MAP[n.type] || <Bell className="w-4 h-4 text-muted-foreground" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-sm leading-snug", !n.is_read && "font-semibold text-foreground")}>
                            {n.title}
                          </p>
                          {n.message && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                          )}
                        </div>
                        {!n.is_read && (
                          <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </div>

                      {n.tasks && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] h-5 px-2">{n.tasks.groups?.name || 'Project'}</Badge>
                          {getTimeRemaining(n)}
                        </div>
                      )}

                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: dateLocale })}
                      </p>
                    </div>

                    {/* Delete */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ))}

            {hasMore && (
              <div className="flex justify-center py-4 border-t border-border/30">
                <Button variant="ghost" size="sm" onClick={() => fetchNotifications(true)} disabled={loadingMore} className="gap-1.5">
                  {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                  {t.loadMore}
                </Button>
              </div>
            )}
            {!hasMore && filtered.length > 0 && (
              <p className="text-center text-xs text-muted-foreground py-3 border-t border-border/30">{t.showedAll}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
