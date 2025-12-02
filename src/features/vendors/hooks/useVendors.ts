import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  vendorService,
  Vendor,
  CreateVendorInput,
  UpdateVendorInput,
  VendorBusinessStats,
} from '../services/vendorService';
import { toast } from 'sonner';

export const useVendors = () => {
  return useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: () => vendorService.getVendors(),
    staleTime: 60000,
  });
};

export const useVendorBusinessStats = () => {
  return useQuery<VendorBusinessStats[]>({
    queryKey: ['vendors', 'business-stats'],
    queryFn: () => vendorService.getVendorBusinessStats(),
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
      queryClient.invalidateQueries({ queryKey: ['vendors', 'business-stats'] });
      toast.success('Vendor updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update vendor: ${error.message}`);
    },
  });
};


