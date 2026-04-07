import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Clock, ChevronRight, User, Calendar, Eye, Shield, BellRing, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const MAX_POPUP_VIEWS = 5;
const LS_KEY = 'mn_view_counts';

interface Notification {
  id: string;
  title: string;
  content: string;
  display_mode: string;
  min_view_seconds: number;
  expires_at: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  target_user_ids: string[] | null;
}

interface ViewRecord {
  count: number;
  hash: string; // updated_at as fingerprint — changes when admin edits
}

interface MandatoryNotificationProps {
  mode: 'pre_login' | 'post_login';
  userId?: string;
  locale?: string;
}

function getViewCounts(): Record<string, ViewRecord> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch { return {}; }
}

function setViewCounts(data: Record<string, ViewRecord>) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

function getViewCount(notifId: string, updatedAt: string): number {
  const all = getViewCounts();
  const rec = all[notifId];
  if (!rec || rec.hash !== updatedAt) return 0; // reset if content changed
  return rec.count;
}

function incrementViewCount(notifId: string, updatedAt: string) {
  const all = getViewCounts();
  const rec = all[notifId];
  if (!rec || rec.hash !== updatedAt) {
    all[notifId] = { count: 1, hash: updatedAt };
  } else {
    all[notifId] = { count: rec.count + 1, hash: updatedAt };
  }
  setViewCounts(all);
}

export default function MandatoryNotification({ mode, userId, locale = 'en' }: MandatoryNotificationProps) {
  const isVi = locale === 'vi';
  const txt = {
    noticeLabel: isVi ? 'Thông báo' : 'Notice',
    newNotice: isVi ? 'Bạn có thông báo mới' : 'You have a new notice',
    notices: (n: number) => isVi ? `${n} thông báo mới` : `${n} new notice${n > 1 ? 's' : ''}`,
    mandatorySeconds: (s: number) => isVi ? `${s}s bắt buộc` : `${s}s required`,
    pleaseRead: isVi ? 'Vui lòng đọc hết' : 'Please read',
    canClose: isVi ? 'Có thể đóng' : 'Ready to close',
    markRead: isVi ? '✓ Đã đọc' : '✓ Mark as read',
    waitSeconds: (s: number) => isVi ? `Chờ ${s}s` : `Wait ${s}s`,
    goBack: isVi ? 'Quay lại' : 'Back',
    admin: isVi ? 'OwnerSystem' : 'Administrator',
    expiresOn: isVi ? 'Hết hạn' : 'Expires',
  };
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  const [dbViewCounts, setDbViewCounts] = useState<Record<string, number>>({});
  const [cornerOpen, setCornerOpen] = useState(false);

  const getSessionId = useCallback(() => {
    let sid = sessionStorage.getItem('mn_session_id');
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem('mn_session_id', sid);
    }
    return sid;
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      const now = new Date().toISOString();

      const { data } = await supabase
        .from('system_notifications')
        .select('*')
        .eq('is_active', true)
        .eq('display_mode', mode)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('created_at', { ascending: false });

      if (!data || data.length === 0) return;

      // For post_login with userId, fetch all dismissal records for this user
      const userDismissalCounts: Record<string, number> = {};
      if (mode === 'post_login' && userId) {
        const notifIds = (data as Notification[]).map(n => n.id);
        const { data: dismissals } = await supabase
          .from('notification_dismissals')
          .select('notification_id, view_count')
          .eq('user_id', userId)
          .in('notification_id', notifIds);
        if (dismissals) {
          dismissals.forEach(d => {
            userDismissalCounts[d.notification_id] = d.view_count ?? 1;
          });
        }
        setDbViewCounts(userDismissalCounts);
      }

      const undismissed: Notification[] = [];
      for (const notif of data as Notification[]) {
        // For post_login mode: check if this notification targets specific users
        if (mode === 'post_login' && Array.isArray(notif.target_user_ids) && notif.target_user_ids.length > 0) {
          if (!userId || !notif.target_user_ids.includes(userId)) continue;
        }

        // For post_login with userId: use DB-based view count
        if (mode === 'post_login' && userId) {
          const dbCount = userDismissalCounts[notif.id] || 0;
          if (dbCount >= MAX_POPUP_VIEWS) continue; // fully hidden after 5 views
          undismissed.push(notif);
          continue;
        }

        // For pre_login: use localStorage-based view count
        const viewCount = getViewCount(notif.id, notif.updated_at);

        if (viewCount >= MAX_POPUP_VIEWS) {
          let isPermanentlyDismissed = false;
          const sessionId = getSessionId();
          const { data: d } = await supabase
            .from('notification_dismissals')
            .select('id')
            .eq('notification_id', notif.id)
            .eq('session_id', sessionId)
            .maybeSingle();
          isPermanentlyDismissed = !!d;
          if (isPermanentlyDismissed) continue;
        }

        undismissed.push(notif);
      }

      setNotifications(undismissed);

      // Fetch sender names
      const creatorIds = [...new Set(undismissed.map(n => n.created_by))];
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', creatorIds);
        if (profiles) {
          const map: Record<string, string> = {};
          profiles.forEach(p => { map[p.id] = p.full_name; });
          setSenderNames(map);
        }
      }
    };

    fetchNotifications();
  }, [mode, userId, getSessionId]);

  // Helper to get effective view count (DB-based for post_login, localStorage for pre_login)
  const getEffectiveViewCount = useCallback((notifId: string, updatedAt: string) => {
    if (mode === 'post_login' && userId) {
      return dbViewCounts[notifId] || 0;
    }
    return getViewCount(notifId, updatedAt);
  }, [mode, userId, dbViewCounts]);

  // Auto-expand first popup notification (mandatory — no user click needed)
  useEffect(() => {
    if (expandedId) return; // already viewing one
    const firstPopup = notifications.find(n => !dismissed.has(n.id) && getEffectiveViewCount(n.id, n.updated_at) < MAX_POPUP_VIEWS);
    if (firstPopup) {
      setExpandedId(firstPopup.id);
      if (countdowns[firstPopup.id] === undefined) {
        setCountdowns(prev => ({ ...prev, [firstPopup.id]: firstPopup.min_view_seconds }));
      }
    }
  }, [notifications, dismissed, expandedId, getEffectiveViewCount]);

  // Countdown for expanded notification
  useEffect(() => {
    if (!expandedId) return;
    const current = countdowns[expandedId];
    if (current === undefined || current <= 0) return;

    const timer = setInterval(() => {
      setCountdowns(prev => {
        const val = (prev[expandedId] ?? 0) - 1;
        if (val <= 0) {
          clearInterval(timer);
          return { ...prev, [expandedId]: 0 };
        }
        return { ...prev, [expandedId]: val };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [expandedId, countdowns[expandedId]]);

  const handleExpand = (notifId: string) => {
    setExpandedId(notifId);
    const notif = notifications.find(n => n.id === notifId);
    if (notif && countdowns[notifId] === undefined) {
      setCountdowns(prev => ({ ...prev, [notifId]: notif.min_view_seconds }));
    }
  };

  const handleDismiss = async (notifId: string) => {
    const notif = notifications.find(n => n.id === notifId);
    if (notif) {
      if (mode === 'post_login' && userId) {
        // DB-based view counting for authenticated users
        const currentCount = dbViewCounts[notifId] || 0;
        const newCount = currentCount + 1;

        if (currentCount === 0) {
          // First view — insert
          await supabase.from('notification_dismissals').insert([{
            notification_id: notifId,
            user_id: userId,
            view_count: 1,
          }]);
        } else {
          // Increment view_count
          await supabase
            .from('notification_dismissals')
            .update({ view_count: newCount })
            .eq('notification_id', notifId)
            .eq('user_id', userId);
        }

        setDbViewCounts(prev => ({ ...prev, [notifId]: newCount }));

        // If reached max, remove from notifications list entirely
        if (newCount >= MAX_POPUP_VIEWS) {
          setNotifications(prev => prev.filter(n => n.id !== notifId));
        }
      } else {
        // localStorage-based for pre_login
        incrementViewCount(notifId, notif.updated_at);
        const newCount = getViewCount(notifId, notif.updated_at);

        if (newCount >= MAX_POPUP_VIEWS) {
          const dismissal: any = { notification_id: notifId };
          dismissal.session_id = getSessionId();
          await supabase.from('notification_dismissals').insert([dismissal]);
        }
      }
    }

    setDismissed(prev => new Set([...prev, notifId]));
    if (expandedId === notifId) setExpandedId(null);
  };

  const activeNotifications = notifications.filter(n => !dismissed.has(n.id));
  if (activeNotifications.length === 0) return null;

  // Split into popup notifications (< 5 views) and corner-only (>= 5 views)
  const popupNotifications = activeNotifications.filter(n => getEffectiveViewCount(n.id, n.updated_at) < MAX_POPUP_VIEWS);
  const cornerNotifications = activeNotifications.filter(n => getEffectiveViewCount(n.id, n.updated_at) >= MAX_POPUP_VIEWS);

  const expandedNotif = expandedId ? activeNotifications.find(n => n.id === expandedId) : null;
  const canClose = expandedId ? (countdowns[expandedId] ?? 1) <= 0 : false;
  const countdown = expandedId ? (countdowns[expandedId] ?? 0) : 0;

  // Check which context we're in for styling
  const isDark = mode === 'pre_login';

  return (
    <>
      {/* ════ Popup list for notifications with < 5 views ════ */}
      {!expandedNotif && popupNotifications.length > 0 && (
        <div className="fixed bottom-6 right-4 z-[100] w-full max-w-[340px] animate-in slide-in-from-bottom-4 duration-300">
          <div
            className="rounded-xl overflow-hidden shadow-lg"
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'hsl(var(--card))',
              backdropFilter: 'blur(20px)',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid hsl(var(--border))',
            }}
          >
            {/* Header */}
            <div
              className="px-3.5 py-2.5 flex items-center gap-2"
              style={{
                borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid hsl(var(--border))',
              }}
            >
              <div className="w-5 h-5 rounded-md flex items-center justify-center bg-blue-500/15">
                <Info className="w-3 h-3 text-blue-400" />
              </div>
              <span
                className="text-xs font-semibold"
                style={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'hsl(var(--foreground))' }}
              >
                {txt.noticeLabel}
              </span>
              <span
                className="text-[10px] ml-auto"
                style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'hsl(var(--muted-foreground))' }}
              >
                {popupNotifications.length}
              </span>
            </div>
            {/* Items */}
            <div className="max-h-[240px] overflow-y-auto">
              {popupNotifications.map(notif => {
                const views = getEffectiveViewCount(notif.id, notif.updated_at);
                return (
                  <button
                    key={notif.id}
                    className="w-full text-left px-3.5 py-2.5 flex items-center gap-2.5 transition-colors"
                    style={{
                      borderBottom: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid hsl(var(--border) / 0.5)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.04)' : 'hsl(var(--muted) / 0.5)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    onClick={() => handleExpand(notif.id)}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: 'hsl(217 91% 60%)' }}
                    />
                    <span
                      className="text-[13px] font-medium truncate flex-1"
                      style={{ color: isDark ? 'rgba(255,255,255,0.85)' : 'hsl(var(--foreground))' }}
                    >
                      {txt.newNotice}
                    </span>
                    <span
                      className="text-[10px] shrink-0"
                      style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'hsl(var(--muted-foreground))' }}
                    >
                      {views + 1}/{MAX_POPUP_VIEWS}
                    </span>
                    <ChevronRight
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: isDark ? 'rgba(255,255,255,0.25)' : 'hsl(var(--muted-foreground))' }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ════ Corner badge for notifications with >= 5 views ════ */}
      {!expandedNotif && cornerNotifications.length > 0 && popupNotifications.length === 0 && (
        <div
          className="absolute top-14 z-[90] animate-in slide-in-from-top-2 duration-300"
          style={{
            maxWidth: 'calc(100vw - 3rem)',
            right: 'max(1.5rem, calc((100vw - 1320px) / 2 + 1.5rem))',
            marginTop: '0.15rem' // Moved up to sit tightly near the button
          }}
        >
          {/* Collapsible card */}
          <div
            className="rounded-[10px] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'hsl(var(--card))',
              backdropFilter: 'blur(20px)',
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid hsl(var(--border))',
              maxWidth: '220px',
            }}
          >
            {/* Toggle trigger */}
            <button
              className="w-full flex items-center gap-2 px-2.5 py-1.5 transition-colors"
              onClick={() => setCornerOpen(!cornerOpen)}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.04)' : 'hsl(var(--muted) / 0.5)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div className="relative">
                <div className="w-5 h-5 rounded-[6px] flex items-center justify-center bg-blue-500/15">
                  <BellRing className="w-[11px] h-[11px] text-blue-400" />
                </div>
                {cornerNotifications.length > 1 && (
                  <span
                    className="absolute -top-1 -right-1 w-[14px] h-[14px] rounded-full text-[7.5px] font-bold flex items-center justify-center text-white"
                    style={{ backgroundColor: 'hsl(217 91% 60%)' }}
                  >
                    {cornerNotifications.length}
                  </span>
                )}
              </div>
              <span
                className="text-[11px] font-medium truncate flex-1 text-left"
                style={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'hsl(var(--foreground))' }}
              >
                {cornerNotifications.length === 1 ? txt.newNotice : txt.notices(cornerNotifications.length)}
              </span>
              {cornerOpen ? (
                <ChevronUp className="w-3 h-3 shrink-0" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'hsl(var(--muted-foreground))' }} />
              ) : (
                <ChevronDown className="w-3 h-3 shrink-0" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'hsl(var(--muted-foreground))' }} />
              )}
            </button>

            {/* Collapsible content */}
            <div
              className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{
                maxHeight: cornerOpen ? `${cornerNotifications.length * 36 + 4}px` : '0px',
                opacity: cornerOpen ? 1 : 0,
              }}
            >
              <div
                style={{
                  borderTop: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid hsl(var(--border))',
                  paddingTop: '2px',
                  paddingBottom: '2px',
                }}
              >
                {cornerNotifications.map(notif => (
                  <button
                    key={notif.id}
                    className="w-full text-left px-2.5 py-[6px] flex items-center gap-1.5 transition-colors"
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.03)' : 'hsl(var(--muted) / 0.5)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    onClick={() => handleExpand(notif.id)}
                  >
                    <div
                      className="w-[5px] h-[5px] rounded-full shrink-0"
                      style={{ backgroundColor: 'hsl(217 91% 60%)' }}
                    />
                    <span
                      className="text-[10px] font-medium truncate"
                      style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'hsl(var(--foreground))' }}
                    >
                      {notif.title}
                    </span>
                    <ChevronRight
                      className="w-2.5 h-2.5 ml-auto shrink-0"
                      style={{ color: isDark ? 'rgba(255,255,255,0.2)' : 'hsl(var(--muted-foreground))' }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ Expanded detail ════ */}
      {expandedNotif && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in duration-200"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
        >
          <div
            className="relative w-full max-w-xl mx-4 overflow-hidden animate-in zoom-in-95 duration-200"
            style={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '16px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.15)',
            }}
          >

            {/* Header */}
            <div className="px-5 py-4 flex items-start gap-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-blue-500/10">
                <Shield className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-semibold text-foreground leading-snug">{expandedNotif.title}</h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <User className="w-3 h-3" />
                    {senderNames[expandedNotif.created_by] || txt.admin}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(expandedNotif.created_at), "HH:mm — dd/MM/yyyy", { locale: vi })}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Eye className="w-3 h-3" />
                    {txt.mandatorySeconds(expandedNotif.min_view_seconds)}
                  </span>
                  {expandedNotif.expires_at && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {txt.expiresOn} {format(new Date(expandedNotif.expires_at), "dd/MM/yyyy", { locale: vi })}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 transition-all ${!canClose ? 'opacity-20 cursor-not-allowed' : ''
                  }`}
                disabled={!canClose}
                onClick={() => handleDismiss(expandedNotif.id)}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Content */}
            <div className="px-5 py-5 max-h-[45vh] overflow-y-auto">
              <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-a:text-blue-500 prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-p:leading-relaxed text-[13.5px]">
                <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
                  {expandedNotif.content}
                </ReactMarkdown>
              </div>
            </div>

            {/* Footer */}
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ borderTop: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--muted) / 0.3)' }}
            >
              {!canClose ? (
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span>{txt.pleaseRead}</span>
                  </div>
                  {/* Circular countdown */}
                  <div className="relative w-7 h-7">
                    <svg className="w-7 h-7 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--muted))" strokeWidth="2.5" />
                      <circle
                        cx="18" cy="18" r="15" fill="none"
                        stroke="hsl(217 91% 60%)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray={`${(1 - countdown / expandedNotif.min_view_seconds) * 94.2} 94.2`}
                        className="transition-all duration-1000 ease-linear"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-blue-500">
                      {countdown}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center text-[10px]">✓</span>
                  {txt.canClose}
                </p>
              )}
              <div className="flex gap-2">
                {canClose && popupNotifications.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs rounded-lg"
                    onClick={() => setExpandedId(null)}
                  >
                    {txt.goBack}
                  </Button>
                )}
                <Button
                  onClick={() => handleDismiss(expandedNotif.id)}
                  disabled={!canClose}
                  size="sm"
                  className="h-7 text-xs rounded-lg gap-1"
                  style={{
                    backgroundColor: canClose ? 'hsl(217 91% 60%)' : undefined,
                    color: canClose ? '#fff' : undefined,
                  }}
                >
                  {canClose ? txt.markRead : txt.waitSeconds(countdown)}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
