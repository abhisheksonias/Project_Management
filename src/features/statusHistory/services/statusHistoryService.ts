import { supabase } from '@/integrations/supabase/client';

export interface StatusHistoryItem {
  id: string;
  entity_id: string;
  entity_type: 'project' | 'task';
  status: string;
  updated_by: string | null;
  updated_at: string | null;
  user_name?: string;
}

class StatusHistoryService {
  /**
   * Get status history for a specific entity (project or task)
   * @param entityId - The ID of the project or task
   * @param entityType - The type of entity ('project' or 'task')
   * @returns Array of status history items with user names
   */
  async getStatusHistory(
    entityId: string,
    entityType: 'project' | 'task'
  ): Promise<StatusHistoryItem[]> {
    // Fetch status history for the entity
    const { data: statusData, error: statusError } = await supabase
      .from('status_history')
      .select('*')
      .eq('entity_id', entityId)
      .eq('entity_type', entityType)
      .order('updated_at', { ascending: true });

    if (statusError) throw statusError;

    if (!statusData || statusData.length === 0) {
      return [];
    }

    // Fetch user names for all unique updated_by IDs
    const userIds = [...new Set(statusData.map((item) => item.updated_by).filter(Boolean))];
    
    let userMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name')
        .in('id', userIds);

      if (!usersError && usersData) {
        userMap = new Map(usersData.map((user) => [user.id, user.name]));
      }
    }

    // Map user names to status history items
    return statusData.map((item) => ({
      id: item.id,
      entity_id: item.entity_id,
      entity_type: item.entity_type as 'project' | 'task',
      status: item.status,
      updated_by: item.updated_by,
      updated_at: item.updated_at,
      user_name: item.updated_by ? userMap.get(item.updated_by) || 'Unknown User' : 'Unknown User',
    }));
  }
}

export const statusHistoryService = new StatusHistoryService();

