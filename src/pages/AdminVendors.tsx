import React, { useMemo, useState } from 'react';
import { AdminLayout } from '@/features/admin/ui/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useVendors, useCreateVendor, useVendorProfits } from '@/features/vendors/hooks/useVendors';
import { Vendor } from '@/features/vendors/services/vendorService';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { VendorDetailsModal } from '@/features/vendors/ui/VendorDetailsModal';
import { EditVendorDialog } from '@/features/vendors/ui/EditVendorDialog';
import { TrendingUp, TrendingDown, Edit2, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [selectedVendorName, setSelectedVendorName] = useState<string | null>(null);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const { data: vendors = [], isLoading } = useVendors();
  const { data: vendorProfits = [], isLoading: isLoadingProfits } = useVendorProfits();
  const createVendorMutation = useCreateVendor();

  // Create a map of vendor_id -> profit data
  const profitMap = useMemo(() => {
    const map = new Map<string, typeof vendorProfits[0]>();
    vendorProfits.forEach((profit) => {
      map.set(profit.vendor_id, profit);
    });
    return map;
  }, [vendorProfits]);

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
        <header className="bg-card/95 backdrop-blur-sm border-b border-border/50 shadow-sm px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-1 rounded-full bg-primary" />
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Vendors</h1>
              </div>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base ml-4">
                Manage vendors, view profit metrics, and project details.
              </p>
            </div>
            <div className="flex flex-col sm:items-end gap-2">
              <div className="text-xs sm:text-sm text-muted-foreground">{vendorCountText}</div>
              {!isLoadingProfits && vendorProfits.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Total Profit:{' '}
                  <span
                    className={cn(
                      'font-semibold',
                      vendorProfits.reduce((sum, p) => sum + p.total_profit, 0) >= 0
                        ? 'text-green-700'
                        : 'text-red-700'
                    )}
                  >
                    {formatCurrency(
                      vendorProfits.reduce((sum, p) => sum + p.total_profit, 0)
                    )}
                  </span>
                </div>
              )}
            </div>
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
                      {vendors.map((vendor) => {
                        const profit = profitMap.get(vendor.id);
                        return (
                          <VendorRow
                            key={vendor.id}
                            vendor={vendor}
                            profit={profit}
                            onVendorClick={() => {
                              setSelectedVendorId(vendor.id);
                              setSelectedVendorName(vendor.name);
                            }}
                            onEditClick={() => setEditingVendor(vendor)}
                          />
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        {/* Vendor Details Modal */}
        <VendorDetailsModal
          vendorId={selectedVendorId}
          vendorName={selectedVendorName}
          open={!!selectedVendorId}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedVendorId(null);
              setSelectedVendorName(null);
            }
          }}
        />

        {/* Edit Vendor Dialog */}
        <EditVendorDialog
          vendor={editingVendor}
          open={!!editingVendor}
          onOpenChange={(open) => {
            if (!open) setEditingVendor(null);
          }}
        />
      </div>
    </AdminLayout>
  );
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

interface VendorRowProps {
  vendor: Vendor;
  profit?: {
    vendor_id: string;
    vendor_name: string;
    total_revenue: number;
    total_cost: number;
    total_profit: number;
    profit_margin_percent: number | null;
    project_count: number;
  };
  onVendorClick: () => void;
  onEditClick: () => void;
}

const VendorRow: React.FC<VendorRowProps> = ({ vendor, profit, onVendorClick, onEditClick }) => {
  const isPositive = profit ? profit.total_profit >= 0 : false;

  return (
    <div className="rounded-[14px] border-2 border-border hover:border-primary/50 transition-colors bg-card shadow-sm">
      <div className="px-4 py-4">
        <div className="flex flex-col gap-4">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                <p className="text-sm sm:text-base font-semibold text-foreground truncate">{vendor.name}</p>
                {profit && profit.project_count > 0 && (
                  <span className="text-xs px-2 py-1 rounded-[8px] bg-muted text-muted-foreground flex-shrink-0">
                    {profit.project_count} project{profit.project_count > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs sm:text-sm text-muted-foreground space-y-1">
                {vendor.email && <p className="break-words">Email: {vendor.email}</p>}
                {vendor.phone && <p className="break-words">Phone: {vendor.phone}</p>}
                {vendor.website && (
                  <p className="break-words">
                    Website:{' '}
                    <a
                      href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`}
                      className="text-primary underline break-all"
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {vendor.website}
                    </a>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditClick();
                }}
                className="h-8 w-8 rounded-[8px]"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Profit Row */}
          {profit && profit.project_count > 0 ? (
            <div
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 p-3 rounded-[8px] bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
              onClick={onVendorClick}
            >
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Net Profit
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {isPositive ? (
                  <TrendingUp className="h-4 w-4 text-green-700 flex-shrink-0" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-700 flex-shrink-0" />
                )}
                <span
                  className={cn(
                    'text-sm sm:text-base font-bold',
                    isPositive ? 'text-green-700' : 'text-red-700'
                  )}
                >
                  {formatCurrency(profit.total_profit)}
                </span>
                {profit.profit_margin_percent !== null && (
                  <span
                    className={cn(
                      'text-xs font-medium px-2 py-1 rounded-[6px] flex-shrink-0',
                      profit.profit_margin_percent >= 0
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    )}
                  >
                    {profit.profit_margin_percent >= 0 ? '+' : ''}
                    {profit.profit_margin_percent.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              Added {format(new Date(vendor.created_at), 'dd MMM yyyy')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminVendors;


