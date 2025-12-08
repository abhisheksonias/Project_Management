import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  vendorService,
  Vendor,
  CreateVendorInput,
  UpdateVendorInput,
  VendorProfit,
  VendorProject,
} from '../services/vendorService';
import { toast } from 'sonner';

export const useVendors = () => {
  return useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: () => vendorService.getVendors(),
    staleTime: 60000,
  });
};

export const useCreateVendor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateVendorInput) => vendorService.createVendor(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create vendor: ${error.message}`);
    },
  });
};

export const useUpdateVendor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateVendorInput }) =>
      vendorService.updateVendor(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-profits'] });
      toast.success('Vendor updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update vendor: ${error.message}`);
    },
  });
};

export const useVendorProfits = () => {
  return useQuery<VendorProfit[]>({
    queryKey: ['vendor-profits'],
    queryFn: () => vendorService.getVendorProfits(),
    staleTime: 60000,
  });
};

export const useVendorProjects = (vendorId: string | undefined) => {
  return useQuery<VendorProject[]>({
    queryKey: ['vendor-projects', vendorId],
    queryFn: () => {
      if (!vendorId) throw new Error('Vendor ID is required');
      return vendorService.getVendorProjects(vendorId);
    },
    enabled: !!vendorId,
    staleTime: 60000,
  });
};


