import { useQuery } from '@tanstack/react-query';
import {
  profitService,
  ProjectProfitOverall,
  ProjectRevenueMonthly,
  ProjectMonthCosts,
  ProjectMonthlyProfit,
  ProjectUserCost,
  CompanyProfitMonthly,
} from '../services/profitService';

export const useProjectProfitOverall = () => {
  return useQuery<ProjectProfitOverall[]>({
    queryKey: ['profit', 'overall'],
    queryFn: () => profitService.getProjectProfitOverall(),
    staleTime: 60000, // 1 minute
  });
};

export const useProjectRevenueMonthly = (projectId: string | undefined) => {
  return useQuery<ProjectRevenueMonthly[]>({
    queryKey: ['profit', 'revenue-monthly', projectId],
    queryFn: () => {
      if (!projectId) throw new Error('Project ID is required');
      return profitService.getProjectRevenueMonthly(projectId);
    },
    enabled: !!projectId,
    staleTime: 60000,
  });
};

export const useProjectMonthCosts = (projectId: string | undefined) => {
  return useQuery<ProjectMonthCosts[]>({
    queryKey: ['profit', 'month-costs', projectId],
    queryFn: () => {
      if (!projectId) throw new Error('Project ID is required');
      return profitService.getProjectMonthCosts(projectId);
    },
    enabled: !!projectId,
    staleTime: 60000,
  });
};

export const useProjectMonthlyProfit = (projectId: string | undefined) => {
  return useQuery<ProjectMonthlyProfit[]>({
    queryKey: ['profit', 'monthly-profit', projectId],
    queryFn: () => {
      if (!projectId) throw new Error('Project ID is required');
      return profitService.getProjectMonthlyProfit(projectId);
    },
    enabled: !!projectId,
    staleTime: 60000,
  });
};

export const useProjectProfitById = (projectId: string | undefined) => {
  return useQuery<ProjectProfitOverall | null>({
    queryKey: ['profit', 'by-id', projectId],
    queryFn: () => {
      if (!projectId) throw new Error('Project ID is required');
      return profitService.getProjectProfitById(projectId);
    },
    enabled: !!projectId,
    staleTime: 60000,
  });
};

export const useProjectUserCosts = (projectId: string | undefined) => {
  return useQuery<ProjectUserCost[]>({
    queryKey: ['profit', 'user-costs', projectId],
    queryFn: () => {
      if (!projectId) throw new Error('Project ID is required');
      return profitService.getProjectUserCosts(projectId);
    },
    enabled: !!projectId,
    staleTime: 60000,
  });
};

export const useCompanyProfitMonthly = () => {
  return useQuery<CompanyProfitMonthly[]>({
    queryKey: ['profit', 'company-monthly'],
    queryFn: () => profitService.getCompanyProfitMonthly(),
    staleTime: 60000,
  });
};

