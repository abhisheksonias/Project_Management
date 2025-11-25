import React, { useMemo, useState } from 'react';
import { AdminLayout } from '@/features/admin/ui/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useVendors, useCreateVendor } from '@/features/vendors/hooks/useVendors';
import { Vendor } from '@/features/vendors/services/vendorService';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface VendorFormState {
  name: string;
  email: string;
  phone: string;
  website: string;
}

const defaultFormState: VendorFormState = {
  name: '',
  email: '',
  phone: '',
  website: '',
};

const AdminVendors: React.FC = () => {
  const [formState, setFormState] = useState<VendorFormState>(defaultFormState);
  const { data: vendors = [], isLoading } = useVendors();
  const createVendorMutation = useCreateVendor();

  const handleChange = (field: keyof VendorFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = formState.name.trim();
    if (!trimmedName) return;

    createVendorMutation.mutate(
      {
        name: trimmedName,
        email: formState.email.trim() || null,
        phone: formState.phone.trim() || null,
        website: formState.website.trim() || null,
      },
      {
        onSuccess: () => {
          setFormState(defaultFormState);
        },
      }
    );
  };

  const vendorCountText = useMemo(() => {
    if (isLoading) return 'Fetching vendors...';
    if (!vendors.length) return 'No vendors added yet';
    return `${vendors.length} vendor${vendors.length > 1 ? 's' : ''}`;
  }, [isLoading, vendors]);

  return (
    <AdminLayout>
      <div className="flex min-h-screen flex-col bg-muted/30">
        <header className="bg-card border-b border-border px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Vendors</h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                Maintain the list of approved vendors and link them to projects.
              </p>
            </div>
            <div className="text-sm text-muted-foreground">{vendorCountText}</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="rounded-[14px] shadow-sm lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Add Vendor</CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Name *</Label>
                      <Input
                        value={formState.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="Acme Inc."
                        required
                        className="rounded-[14px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Email</Label>
                      <Input
                        type="email"
                        value={formState.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        placeholder="contact@acme.com"
                        className="rounded-[14px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Phone</Label>
                      <Input
                        value={formState.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        placeholder="+1 555 123 4567"
                        className="rounded-[14px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Website</Label>
                      <Input
                        value={formState.website}
                        onChange={(e) => handleChange('website', e.target.value)}
                        placeholder="https://acme.com"
                        className="rounded-[14px]"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full rounded-[14px] bg-primary text-primary-foreground hover:bg-primary/90"
                      disabled={createVendorMutation.isPending || !formState.name.trim()}
                    >
                      {createVendorMutation.isPending ? 'Adding...' : 'Add Vendor'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="rounded-[14px] shadow-sm lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Vendor Directory</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-16 w-full rounded-[14px]" />
                      ))}
                    </div>
                  ) : vendors.length === 0 ? (
                    <div className="rounded-[14px] border border-dashed border-border p-8 text-center text-muted-foreground">
                      Start by adding your first vendor.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {vendors.map((vendor) => (
                        <VendorRow key={vendor.id} vendor={vendor} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </AdminLayout>
  );
};

const VendorRow: React.FC<{ vendor: Vendor }> = ({ vendor }) => {
  return (
    <div className="rounded-[14px] border border-border px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-base font-semibold text-foreground">{vendor.name}</p>
          <div className="mt-1 text-sm text-muted-foreground space-y-1">
            {vendor.email && <p>Email: {vendor.email}</p>}
            {vendor.phone && <p>Phone: {vendor.phone}</p>}
            {vendor.website && (
              <p>
                Website:{' '}
                <a
                  href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`}
                  className="text-primary underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {vendor.website}
                </a>
              </p>
            )}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Added {format(new Date(vendor.created_at), 'dd MMM yyyy')}
        </div>
      </div>
    </div>
  );
};

export default AdminVendors;


