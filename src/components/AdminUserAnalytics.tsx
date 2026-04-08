import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogIn, Clock, Search, TrendingUp, Users } from 'lucide-react';

interface UserAnalyticsRow {
  user_id: string;
  full_name: string;
  student_id: string;
  email: string;
  avatar_url: string | null;
  login_count: number;
  total_seconds: number;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function AdminUserAnalytics() {
  const [data, setData] = useState<UserAnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const getDateFilter = () => {
    const now = new Date();
    if (period === 'day') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start.toISOString();
    }
    if (period === 'week') {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return start.toISOString();
    }
    // month
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const dateFilter = getDateFilter();

      // Fetch all data in parallel
      const [profilesRes, loginsRes, sessionsRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, student_id, email, avatar_url').eq('is_approved', true),
        supabase.from('user_login_logs').select('user_id, logged_in_at').gte('logged_in_at', dateFilter),
        supabase.from('user_activity_sessions').select('user_id, started_at, last_seen_at').gte('started_at', dateFilter),
      ]);

      const profiles = profilesRes.data || [];
      const logins = loginsRes.data || [];
      const sessions = sessionsRes.data || [];

      // Aggregate login counts
      const loginMap = new Map<string, number>();
      logins.forEach(l => loginMap.set(l.user_id, (loginMap.get(l.user_id) || 0) + 1));

      // Aggregate session durations
      const durationMap = new Map<string, number>();
      sessions.forEach(s => {
        const duration = (new Date(s.last_seen_at).getTime() - new Date(s.started_at).getTime()) / 1000;
        durationMap.set(s.user_id, (durationMap.get(s.user_id) || 0) + Math.max(0, duration));
      });

      const rows: UserAnalyticsRow[] = profiles.map(p => ({
        user_id: p.id,
        full_name: p.full_name,
        student_id: p.student_id,
        email: p.email,
        avatar_url: p.avatar_url,
        login_count: loginMap.get(p.id) || 0,
        total_seconds: durationMap.get(p.id) || 0,
      }));

      // Sort by login count desc
      rows.sort((a, b) => b.login_count - a.login_count);
      setData(rows);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = data.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.full_name.toLowerCase().includes(q) || r.student_id.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
  });

  const totalLogins = data.reduce((sum, r) => sum + r.login_count, 0);
  const activeUsers = data.filter(r => r.login_count > 0).length;
  const totalTime = data.reduce((sum, r) => sum + r.total_seconds, 0);

  const periodLabel = period === 'day' ? 'Hôm nay' : period === 'week' ? '7 ngày qua' : '30 ngày qua';

  return (
    <div className="space-y-4 px-6 md:px-8">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <LogIn className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalLogins}</p>
              <p className="text-xs text-muted-foreground">Tổng đăng nhập ({periodLabel})</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Users className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeUsers}</p>
              <p className="text-xs text-muted-foreground">Người dùng hoạt động</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatDuration(totalTime)}</p>
              <p className="text-xs text-muted-foreground">Tổng thời gian hoạt động</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, MSSV, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as 'day' | 'week' | 'month')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Hôm nay</SelectItem>
            <SelectItem value="week">7 ngày qua</SelectItem>
            <SelectItem value="month">30 ngày qua</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Chi tiết hoạt động người dùng
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">Đang tải...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Người dùng</TableHead>
                    <TableHead className="text-center">Đăng nhập</TableHead>
                    <TableHead className="text-center">Thời gian HĐ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Không có dữ liệu
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((row, i) => (
                      <TableRow key={row.user_id}>
                        <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{row.full_name}</p>
                            <p className="text-xs text-muted-foreground">{row.student_id}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={row.login_count > 0 ? 'default' : 'secondary'} className="text-xs">
                            {row.login_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {row.total_seconds > 0 ? formatDuration(row.total_seconds) : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
