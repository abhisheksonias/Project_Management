import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateVendor } from '../hooks/useVendors';
import { Vendor, UpdateVendorInput } from '../services/vendorService';

interface EditVendorDialogProps {
  vendor: Vendor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditVendorDialog: React.FC<EditVendorDialogProps> = ({
  vendor,
  open,
  onOpenChange,
}) => {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
  });

  const updateVendorMutation = useUpdateVendor();

  useEffect(() => {
    if (vendor) {
      setFormState({
        name: vendor.name || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        website: vendor.website || '',
      });
    }
  }, [vendor]);

  const handleChange = (field: keyof typeof formState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!vendor) return;

    const updateData: UpdateVendorInput = {
      name: formState.name.trim() || undefined,
      email: formState.email.trim() || null,
      phone: formState.phone.trim() || null,
      website: formState.website.trim() || null,
    };

    updateVendorMutation.mutate(
      { id: vendor.id, input: updateData },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const handleCancel = () => {
    if (vendor) {
      setFormState({
        name: vendor.name || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        website: vendor.website || '',
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] rounded-[14px] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-bold">Edit Vendor</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">Update vendor information</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm text-muted-foreground">Name *</Label>
            <Input
              value={formState.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Acme Inc."
              required
              className="rounded-[14px] h-9 sm:h-10 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs sm:text-sm text-muted-foreground">Email</Label>
            <Input
              type="email"
              value={formState.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="contact@acme.com"
              className="rounded-[14px] h-9 sm:h-10 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs sm:text-sm text-muted-foreground">Phone</Label>
            <Input
              value={formState.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+1 555 123 4567"
              className="rounded-[14px] h-9 sm:h-10 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs sm:text-sm text-muted-foreground">Website</Label>
            <Input
              value={formState.website}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://acme.com"
              className="rounded-[14px] h-9 sm:h-10 text-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="w-full sm:flex-1 rounded-[14px] h-9 sm:h-10 text-sm"
              disabled={updateVendorMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:flex-1 rounded-[14px] bg-primary text-primary-foreground hover:bg-primary/90 h-9 sm:h-10 text-sm"
              disabled={updateVendorMutation.isPending || !formState.name.trim()}
            >
              {updateVendorMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

