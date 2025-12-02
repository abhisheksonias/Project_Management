import React, { useMemo, useState, useEffect } from 'react';
import { AdminLayout } from '@/features/admin/ui/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useVendors, useCreateVendor, useUpdateVendor, useVendorBusinessStats } from '@/features/vendors/hooks/useVendors';
import { Vendor } from '@/features/vendors/services/vendorService';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Edit, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  const { data: businessStats = [], isLoading: isLoadingStats } = useVendorBusinessStats();
  const createVendorMutation = useCreateVendor();

  // Create a map of vendor_id to business stats for quick lookup
  const statsMap = new Map(
    businessStats.map((stats) => [stats.vendor_id, stats])
  );

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
                        <VendorRow 
                          key={vendor.id} 
                          vendor={vendor} 
                          businessStats={statsMap.get(vendor.id)} 
                          isLoadingStats={isLoadingStats}
                        />
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

interface VendorRowProps {
  vendor: Vendor;
  businessStats?: {
    total_projects: number;
    total_revenue: number;
    total_cost: number;
    total_profit: number;
    profit_margin_percent: number | null;
  };
  isLoadingStats?: boolean;
}

const VendorRow: React.FC<VendorRowProps> = ({ vendor, businessStats, isLoadingStats }) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormState, setEditFormState] = useState({
    name: vendor.name,
    email: vendor.email || '',
    phone: vendor.phone || '',
    website: vendor.website || '',
  });
  const updateVendorMutation = useUpdateVendor();

  // Sync form state when vendor changes
  useEffect(() => {
    setEditFormState({
      name: vendor.name,
      email: vendor.email || '',
      phone: vendor.phone || '',
      website: vendor.website || '',
    });
  }, [vendor]);

  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleEditClick = () => {
    setEditFormState({
      name: vendor.name,
      email: vendor.email || '',
      phone: vendor.phone || '',
      website: vendor.website || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = editFormState.name.trim();
    if (!trimmedName) return;

    updateVendorMutation.mutate(
      {
        id: vendor.id,
        input: {
          name: trimmedName,
          email: editFormState.email.trim() || null,
          phone: editFormState.phone.trim() || null,
          website: editFormState.website.trim() || null,
        },
      },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
        },
      }
    );
  };

  const handleEditChange = (field: keyof typeof editFormState, value: string) => {
    setEditFormState((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <div className="rounded-[14px] border border-border px-4 py-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
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
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEditClick}
                className="h-8 w-8 rounded-[14px]"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <div className="text-xs text-muted-foreground">
                Added {format(new Date(vendor.created_at), 'dd MMM yyyy')}
              </div>
            </div>
          </div>

        {/* Business Statistics */}
        {isLoadingStats ? (
          <div className="pt-2 border-t border-border">
            <Skeleton className="h-16 w-full" />
          </div>
        ) : businessStats && businessStats.total_projects > 0 ? (
          <div className="pt-2 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Business Overview</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Projects</p>
                <p className="text-sm font-semibold">{businessStats.total_projects}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="text-sm font-semibold">{formatCurrency(businessStats.total_revenue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cost</p>
                <p className="text-sm font-semibold">{formatCurrency(businessStats.total_cost)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Profit</p>
                <p className={`text-sm font-semibold ${
                  businessStats.total_profit < 0 ? 'text-red-600' : 
                  businessStats.total_profit > 0 ? 'text-green-600' : ''
                }`}>
                  {formatCurrency(businessStats.total_profit)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Margin</p>
                <Badge
                  variant={businessStats.profit_margin_percent !== null && businessStats.profit_margin_percent < 0 
                    ? 'destructive' 
                    : 'default'}
                  className="text-xs"
                >
                  {businessStats.profit_margin_percent !== null
                    ? `${businessStats.profit_margin_percent.toFixed(1)}%`
                    : '-'}
                </Badge>
              </div>
            </div>
          </div>
        ) : businessStats && businessStats.total_projects === 0 ? (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">No projects assigned yet</p>
          </div>
        ) : null}
        </div>
      </div>

      {/* Edit Vendor Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-[14px]">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>
              Update vendor information below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Name *</Label>
              <Input
                value={editFormState.name}
                onChange={(e) => handleEditChange('name', e.target.value)}
                placeholder="Acme Inc."
                required
                className="rounded-[14px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={editFormState.email}
                onChange={(e) => handleEditChange('email', e.target.value)}
                placeholder="contact@acme.com"
                className="rounded-[14px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Phone</Label>
              <Input
                value={editFormState.phone}
                onChange={(e) => handleEditChange('phone', e.target.value)}
                placeholder="+1 555 123 4567"
                className="rounded-[14px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Website</Label>
              <Input
                value={editFormState.website}
                onChange={(e) => handleEditChange('website', e.target.value)}
                placeholder="https://acme.com"
                className="rounded-[14px]"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="rounded-[14px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-[14px] bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={updateVendorMutation.isPending || !editFormState.name.trim()}
              >
                {updateVendorMutation.isPending ? 'Updating...' : 'Update Vendor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminVendors;


