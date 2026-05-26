import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  milestoneService,
  Milestone,
  MilestoneHoursSummary,
} from '../services/milestoneService';

export const useMilestonesByProject = (projectId: string | null) => {
  return useQuery<Milestone[]>({
    queryKey: ['milestones', 'project', projectId],
    queryFn: () => {
      if (!projectId) return [];
      return milestoneService.getMilestonesByProject(projectId);
    },
    enabled: !!projectId,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes (formerly cacheTime)
  });
};

export const useAllMilestones = () => {
  return useQuery<Milestone[]>({
    queryKey: ['milestones', 'all'],
    queryFn: () => milestoneService.getAllMilestones(),
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
  });
};

export const useMilestone = (id: string | null) => {
  return useQuery<Milestone | null>({
    queryKey: ['milestones', id],
    queryFn: () => {
      if (!id) return null;
      return milestoneService.getMilestoneById(id);
    },
    enabled: !!id,
  });
};

export const useMilestoneHoursSummary = (
  milestoneIds: string[],
  options?: { enabled?: boolean }
) => {
  const uniqueIds = useMemo(() => Array.from(new Set(milestoneIds)).sort(), [milestoneIds]);
  const idsKey = uniqueIds.join(',');

  return useQuery<Record<string, MilestoneHoursSummary>>({
    queryKey: ['milestones', 'hours-summary', idsKey],
    queryFn: () => milestoneService.getMilestonesHoursSummary(uniqueIds),
    enabled: (options?.enabled ?? true) && uniqueIds.length > 0,
  });
};

export const useSingleMilestoneHoursSummary = (
  milestoneId: string | null,
  options?: { enabled?: boolean }
) => {
  const { data, ...rest } = useMilestoneHoursSummary(
    milestoneId ? [milestoneId] : [],
    options
  );

  return {
    data: milestoneId ? data?.[milestoneId] : undefined,
    ...rest,
  };
};

