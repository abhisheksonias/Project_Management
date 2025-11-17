import { useQuery } from '@tanstack/react-query';
import { statusHistoryService, StatusHistoryItem } from '../services/statusHistoryService';

/**
 * React Query hook to fetch status history for a project or task
 * @param entityId - The ID of the project or task
 * @param entityType - The type of entity ('project' or 'task')
 * @param enabled - Whether the query should be enabled (default: true)
 * @returns React Query result with status history data
 */
export const useStatusHistory = (
  entityId: string | null | undefined,
  entityType: 'project' | 'task',
  enabled: boolean = true
) => {
  return useQuery<StatusHistoryItem[]>({
    queryKey: ['status-history', entityType, entityId],
    queryFn: () => {
      if (!entityId) throw new Error('Entity ID is required');
      return statusHistoryService.getStatusHistory(entityId, entityType);
    },
    enabled: enabled && !!entityId,
  });
};

