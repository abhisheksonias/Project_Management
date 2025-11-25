import { supabase } from '@/integrations/supabase/client';

export interface Vendor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface CreateVendorInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
}

export interface UpdateVendorInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
}

class VendorService {
  async getVendors(): Promise<Vendor[]> {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async createVendor(input: CreateVendorInput): Promise<Vendor> {
    const { data, error } = await supabase
      .from('vendors')
      .insert({
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        website: input.website ?? null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as Vendor;
  }

  async updateVendor(id: string, input: UpdateVendorInput): Promise<Vendor> {
    const { data, error } = await supabase
      .from('vendors')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Vendor;
  }
}

export const vendorService = new VendorService();


