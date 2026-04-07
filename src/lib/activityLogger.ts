import { supabase } from '@/integrations/supabase/client';

interface LogActivityParams {
  userId: string;
  userName: string;
  action: string;
  actionType: 'project_member' | 'task' | 'stage' | 'resource' | 'score' | 'project' | 'setting' | 'system' | 'meeting';
  description: string;
  groupId?: string;
  metadata?: Record<string, any>;
}

export async function logActivity({
  userId,
  userName,
  action,
  actionType,
  description,
  groupId,
  metadata,
}: LogActivityParams) {
  try {
    // If groupId is provided, check if activity logging is enabled for that group
    if (groupId) {
      const { data: groupData } = await supabase
        .from('groups')
        .select('activity_logging_enabled')
        .eq('id', groupId)
        .single();
      if (groupData && groupData.activity_logging_enabled === false) {
        return; // Logging is disabled for this group, skip
      }
    }

    await supabase.from('activity_logs').insert({
      user_id: userId,
      user_name: userName,
      action,
      action_type: actionType,
      description,
      group_id: groupId || null,
      metadata: metadata || null,
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}
