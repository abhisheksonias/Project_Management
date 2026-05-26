import { useQuery } from '@tanstack/react-query';
import { changeRequestService } from '../services/changeRequestService';

export const useChangeRequestProjects = () => {
  return useQuery({
    queryKey: ['change-requests', 'projects-with-requests'],
    queryFn: () => changeRequestService.getProjectsWithChangeRequests(),
    staleTime: 60_000,
  });
};
