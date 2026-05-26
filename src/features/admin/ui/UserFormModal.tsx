import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { UserWithDetails } from '../services/adminUserManagementService';
import { toast } from 'sonner';

interface UserFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserWithDetails | null;
  onSave: (data: {
    name: string;
    email: string;
    role?: string | null;
    department?: string | null;
    monthly_salary?: number | null;
    salary_currency?: string;
    is_active?: boolean | null;
    rank?: string | null;
  }) => Promise<void>;
  isSaving: boolean;
}

const ROLE_OPTIONS = [
  { value: 'Admin', label: 'Admin' },
  { value: 'User', label: 'Employee' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Manager', label: 'Manager' },
];

const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'INR' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
];

export const UserFormModal: React.FC<UserFormModalProps> = ({
  open,
  onOpenChange,
  user,
  onSave,
  isSaving,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('');
  const [department, setDepartment] = useState('');
  const [monthlySalary, setMonthlySalary] = useState<string>('');
  const [salaryCurrency, setSalaryCurrency] = useState('INR');
  const [isActive, setIsActive] = useState(true);
  const [rank, setRank] = useState('');

  // Safety check - if modal opens without valid user data when editing
  if (open && user === undefined) {
    console.warn('UserFormModal opened but user is undefined');
  }

  useEffect(() => {
    if (user && open) {
      try {
        setName(user.name || '');
        setEmail(user.email || '');
        setRole(user.role || 'none'); // Use 'none' instead of empty string for Select component
        setDepartment(user.department || '');
        setMonthlySalary(user.monthly_salary != null ? user.monthly_salary.toString() : '');
        setSalaryCurrency(user.salary_currency || 'INR');
        setIsActive(user.is_active !== null ? user.is_active : true);
        setRank(user.rank || '');
      } catch (error) {
        console.error('Error setting form values:', error);
        toast.error('Error loading user data');
      }
    } else if (!user && open) {
      // Reset form for new user
      setName('');
      setEmail('');
      setRole('none'); // Use 'none' instead of empty string for Select
      setDepartment('');
      setMonthlySalary('');
      setSalaryCurrency('INR');
      setIsActive(true);
      setRank('');
    }
  }, [user, open]);

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (monthlySalary && isNaN(parseFloat(monthlySalary))) {
      toast.error('Monthly salary must be a valid number');
      return;
    }

    if (monthlySalary && parseFloat(monthlySalary) < 0) {
      toast.error('Monthly salary must be greater than or equal to 0');
      return;
    }

    try {
      await onSave({
        name: name.trim(),
        email: email.trim(),
        role: role && role !== 'none' ? role : null, // Convert 'none' back to null
        department: department.trim() || null,
        monthly_salary: monthlySalary ? parseFloat(monthlySalary) : null,
        salary_currency: salaryCurrency,
        is_active: isActive,
        rank: rank.trim() || null,
      });
      onOpenChange(false);
    } catch (error: any) {
      // Handle unique constraint error
      if (error?.code === '23505' || error?.message?.includes('unique')) {
        toast.error('Email already exists. Please use a different email.');
      } else {
        toast.error(error?.message || 'Failed to save user');
      }
      throw error;
    }
  };

  // Don't render if there's an issue
  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-[14px]">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">{user ? 'Edit User' : 'Add User'}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {user ? 'Update user information below.' : 'Add a new user to the system.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs sm:text-sm">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="rounded-[14px] h-9 sm:h-10 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs sm:text-sm">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                disabled={!!user} // Email cannot be changed after creation
                className="rounded-[14px] h-9 sm:h-10 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-xs sm:text-sm">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="role" className="rounded-[14px] h-9 sm:h-10 text-sm">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="rounded-[14px]">
                  <SelectItem value="none">None</SelectItem>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department" className="text-xs sm:text-sm">Department</Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Engineering"
                className="rounded-[14px] h-9 sm:h-10 text-sm"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="monthlySalary" className="text-xs sm:text-sm">Monthly Salary</Label>
              <div className="flex gap-2">
                <Input
                  id="monthlySalary"
                  type="number"
                  value={monthlySalary}
                  onChange={(e) => setMonthlySalary(e.target.value)}
                  placeholder="50000"
                  min="0"
                  step="0.01"
                  className="rounded-[14px] h-9 sm:h-10 text-sm"
                />
                <Select value={salaryCurrency} onValueChange={setSalaryCurrency}>
                  <SelectTrigger className="w-[100px] rounded-[14px] h-9 sm:h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-[14px]">
                    {CURRENCY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rank" className="text-xs sm:text-sm">Rank</Label>
              <Input
                id="rank"
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                placeholder="Senior"
                className="rounded-[14px] h-9 sm:h-10 text-sm"
              />
            </div>

            <div className="flex items-center space-x-2 pt-4 sm:pt-6">
              <Checkbox
                id="isActive"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked === true)}
              />
              <Label htmlFor="isActive" className="cursor-pointer text-xs sm:text-sm">
                Active
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-[14px] w-full sm:w-auto text-sm h-9 sm:h-10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving}
            className="bg-primary text-white hover:bg-primary/90 rounded-[14px] w-full sm:w-auto text-sm h-9 sm:h-10"
          >
            {isSaving ? 'Saving...' : user ? 'Update User' : 'Create User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

