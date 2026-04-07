import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import CalendarMonthView from '@/components/calendar/CalendarMonthView';
import CalendarWeekView from '@/components/calendar/CalendarWeekView';
import CalendarDayView from '@/components/calendar/CalendarDayView';
import CalendarDayDetail from '@/components/calendar/CalendarDayDetail';
import CreateEventDialog from '@/components/calendar/CreateEventDialog';
import EventDetailDialog from '@/components/calendar/EventDetailDialog';
import CalendarTaskDetailDialog from '@/components/calendar/CalendarTaskDetailDialog';
import { CalendarEvent, CalendarViewMode } from '@/types/calendar';
import { parseLocalDateTime } from '@/lib/datetime';

export default function CalendarPage() {
  const { user } = useAuth();
  const { activeWorkspace, isAvailable: wsAvailable } = useWorkspace();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogDate, setCreateDialogDate] = useState<Date | undefined>();
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [dayDetailDate, setDayDetailDate] = useState(new Date());
  const [editEvent, setEditEvent] = useState<any>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTaskEvent, setSelectedTaskEvent] = useState<CalendarEvent | null>(null);

  // Event detail popup state
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
  const [selectedPersonalEvent, setSelectedPersonalEvent] = useState<CalendarEvent | null>(null);

  const dateRange = useMemo(() => {
    if (viewMode === 'month') {
      const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
      return { start, end };
    }
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return { start, end };
    }
    return { start: currentDate, end: currentDate };
  }, [currentDate, viewMode]);

  const { data: taskEvents = [], refetch: refetchTasks } = useQuery({
    queryKey: ['calendar-tasks', user?.id, dateRange.start.toISOString(), dateRange.end.toISOString(), activeWorkspace?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: memberships } = await supabase.from('group_members').select('group_id').eq('user_id', user.id);
      if (!memberships?.length) return [];
      const groupIds = memberships.map((m) => m.group_id);
      const { data: assignments } = await supabase.from('task_assignments').select('task_id').eq('user_id', user.id);
      const assignedTaskIds = assignments?.map((a) => a.task_id) || [];
      let tasksQuery = supabase
        .from('tasks')
        .select('id, title, deadline, status, group_id, slug, groups!inner(name, slug, workspace_id)')
        .in('group_id', groupIds)
        .not('deadline', 'is', null);

      let filteredTasks = tasks || [];
      // Filter by active workspace
      if (wsAvailable && activeWorkspace?.id) {
        filteredTasks = filteredTasks.filter((t: any) => t.groups?.workspace_id === activeWorkspace.id);
      }
      if (!filteredTasks.length) return [];
      const events: CalendarEvent[] = [];
      filteredTasks.forEach((task: any) => {
        const isAssigned = assignedTaskIds.includes(task.id);
        if (assignedTaskIds.length > 0 && !isAssigned) return;
        const deadline = parseLocalDateTime(task.deadline);
        if (!deadline) return;
        events.push({
          id: task.id,
          title: task.title,
          date: deadline,
          type: 'task',
          projectName: task.groups?.name || '',
          projectSlug: task.groups?.slug || '',
          projectId: task.group_id,
          taskSlug: task.slug || '',
          taskStatus: task.status,
        });
      });
      return events;
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  const { data: personalEvents = [], refetch: refetchPersonal } = useQuery({
    queryKey: ['calendar-personal', user?.id, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('personal_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_time', dateRange.start.toISOString())
        .lte('start_time', dateRange.end.toISOString())
        .order('start_time');
      if (error) throw error;
      return (data || []).map((ev: any): CalendarEvent => ({
        id: ev.id,
        title: ev.title,
        date: new Date(ev.start_time),
        endDate: ev.end_time ? new Date(ev.end_time) : undefined,
        type: 'personal',
        color: ev.color,
        description: ev.description,
      }));
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  const allEvents = useMemo(() => [...taskEvents, ...personalEvents], [taskEvents, personalEvents]);

  const refetchAll = useCallback(() => {
    refetchTasks();
    refetchPersonal();
  }, [refetchTasks, refetchPersonal]);

  const handlePrevious = () => {
    if (viewMode === 'month') setCurrentDate((d) => subMonths(d, 1));
    else if (viewMode === 'week') setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subDays(d, 1));
  };

  const handleNext = () => {
    if (viewMode === 'month') setCurrentDate((d) => addMonths(d, 1));
    else if (viewMode === 'week') setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, 1));
  };

  const handleDayClick = (date: Date) => {
    setDayDetailDate(date);
    setDayDetailOpen(true);
  };

  const handleAddEvent = (date?: Date) => {
    setEditEvent(null);
    setCreateDialogDate(date || new Date());
    setCreateDialogOpen(true);
  };

  const handleEditPersonalEvent = (event: CalendarEvent) => {
    if (event.type !== 'personal') return;
    setEditEvent({
      id: event.id,
      title: event.title,
      description: event.description || null,
      start_time: event.date.toISOString(),
      end_time: event.endDate?.toISOString() || null,
      color: event.color || '#3b82f6',
    });
    setCreateDialogOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.type === 'task') {
      setSelectedTaskEvent(event);
      setTaskDetailOpen(true);
    } else {
      // Show detail popup first, not edit dialog
      setSelectedPersonalEvent(event);
      setEventDetailOpen(true);
    }
  };

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-64px)] p-2 sm:p-3">
        <CalendarHeader
          currentDate={currentDate}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onToday={() => setCurrentDate(new Date())}
          onAddEvent={() => handleAddEvent()}
        />

        {viewMode === 'month' && (
          <CalendarMonthView currentDate={currentDate} events={allEvents} onDayClick={handleDayClick} onEventClick={handleEventClick} />
        )}
        {viewMode === 'week' && (
          <CalendarWeekView currentDate={currentDate} events={allEvents} onDayClick={handleDayClick} onEventClick={handleEventClick} />
        )}
        {viewMode === 'day' && (
          <CalendarDayView currentDate={currentDate} events={allEvents} onEventClick={handleEventClick} />
        )}

        <CalendarDayDetail
          open={dayDetailOpen}
          onOpenChange={setDayDetailOpen}
          date={dayDetailDate}
          events={allEvents}
          onEditEvent={handleEditPersonalEvent}
          onEventClick={handleEventClick}
        />

        {/* Detail popup for personal events */}
        <EventDetailDialog
          open={eventDetailOpen}
          onOpenChange={setEventDetailOpen}
          event={selectedPersonalEvent}
          onEdit={handleEditPersonalEvent}
        />

        <CreateEventDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={refetchAll}
          initialDate={createDialogDate}
          editEvent={editEvent}
        />

        <CalendarTaskDetailDialog
          open={taskDetailOpen}
          onOpenChange={setTaskDetailOpen}
          event={selectedTaskEvent}
          onRefresh={refetchAll}
        />
      </div>
    </>
  );
}
