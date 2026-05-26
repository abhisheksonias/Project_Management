import { useQuery } from '@tanstack/react-query';
import { mentionService, Mention } from '../services/mentionService';

export const useUserMentions = (userId: string) => {
  return useQuery<Mention[]>({
    queryKey: ['user-mentions', userId],
    queryFn: () => mentionService.getAllMentions(userId),
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

