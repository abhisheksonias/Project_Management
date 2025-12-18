import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/features/admin/ui/AdminLayout';
import { useAllUsers, useUserLeaves, useUserMonthStats, useUsersMonthStats, useUpsertSalaryPeriod, useCreateLeave, useDeleteLeave, useUpdateUser } from '@/features/admin/hooks/useUserManagement';
import { UserWithDetails, UpdateUserData, UserLeave } from '@/features/admin/services/userManagementService';
import { LeavesModal } from '@/features/admin/ui/LeavesModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Calendar, Plus, Edit, Trash2, Search, CalendarDays, Save, X, Users, AlertCircle, Pencil } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { format, startOfMonth, subMonths, addMonths } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';

const UserManagement: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null);
  const [isLeavesModalOpen, setIsLeavesModalOpen] = useState(false);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [salaryPeriodMonth, setSalaryPeriodMonth] = useState<Date>(startOfMonth(new Date()));
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: '', description: '', onConfirm: () => { } });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch all users with salary for selected month
  const { data: users = [], isLoading: isLoadingUsers } = useAllUsers(selectedMonth);

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!debouncedSearchQuery) return users;
    const query = debouncedSearchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.department?.toLowerCase().includes(query) ||
        user.role?.toLowerCase().includes(query)
    );
  }, [users, debouncedSearchQuery]);

  // Fetch month stats for all users
  const userIds = useMemo(() => filteredUsers.map((u) => u.id), [filteredUsers]);
  const { data: usersMonthStatsMap, isLoading: isLoadingStats } = useUsersMonthStats(userIds, selectedMonth);

  // Fetch leaves and stats for selected user and month (for modal)
  const { data: leaves = [], isLoading: isLoadingLeaves } = useUserLeaves(
    selectedUser?.id || null,
    selectedMonth
  );

  const { data: monthStats } = useUserMonthStats(
    selectedUser?.id || null,
    selectedMonth
  );

  const upsertSalaryMutation = useUpsertSalaryPeriod();
  const createLeaveMutation = useCreateLeave();
  const deleteLeaveMutation = useDeleteLeave();
  const updateUserMutation = useUpdateUser();

  const [editingUser, setEditingUser] = useState<UserWithDetails | null>(null);
  const [editFormData, setEditFormData] = useState<UpdateUserData>({});

  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '—';
    if (value === 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleOpenLeavesModal = (user: UserWithDetails) => {
    setSelectedUser(user);
    setIsLeavesModalOpen(true);
  };

  const [salaryInputValue, setSalaryInputValue] = useState('');

  const handleOpenSalaryModal = useCallback((user: UserWithDetails) => {
    setSelectedUser(user);
    setSalaryPeriodMonth(selectedMonth);
    // Pre-fill with current salary for the selected month
    const currentSalary = user.current_salary || 0;
    setSalaryInputValue(currentSalary.toString());
    setIsSalaryModalOpen(true);
  }, [selectedMonth]);

  const handleSaveSalary = async () => {
    if (!selectedUser) return;

    const salaryValue = parseFloat(salaryInputValue);
    if (isNaN(salaryValue) || salaryValue < 0) {
      toast.error('Please enter a valid salary amount');
      return;
    }

    try {
      const monthStart = startOfMonth(salaryPeriodMonth);
      await upsertSalaryMutation.mutateAsync({
        user_id: selectedUser.id,
        period_month: format(monthStart, 'yyyy-MM-dd'),
        monthly_salary: salaryValue,
        note: `Updated on ${format(new Date(), 'yyyy-MM-dd')}`,
      });

      toast.success(`Salary updated successfully for ${format(salaryPeriodMonth, 'MMMM yyyy')}`);
      setIsSalaryModalOpen(false);
      setSalaryInputValue('');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update salary');
    }
  };

  const handleAddLeave = async (data: { leave_date: string; is_paid: boolean; leave_type: 'full' | 'half' }) => {
    if (!selectedUser) return;

    try {
      await createLeaveMutation.mutateAsync({
        user_id: selectedUser.id,
        ...data,
      });
      toast.success('Leave added successfully');
    } catch (error: any) {
      if (error?.code === '23505' || error?.message?.includes('unique')) {
        toast.error('Leave already exists for this date');
      } else {
        toast.error(error?.message || 'Failed to add leave');
      }
    }
  };

  const handleDeleteLeave = async (leaveId: string) => {
    try {
      await deleteLeaveMutation.mutateAsync(leaveId);
      toast.success('Leave deleted successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete leave');
    }
  };

  const handleNavigateToCalendar = (userId: string) => {
    navigate(`/admin/users/${userId}/calendar`);
  };

  const handleSaveUser = async (userId: string) => {
    if (!editingUser || !editFormData) return;

    try {
      await updateUserMutation.mutateAsync({
        userId,
        data: editFormData,
      });
      toast.success('User updated successfully');
      setEditingUser(null);
      setEditFormData({});
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update user');
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditFormData({});
  };

  const handleToggleActive = (user: UserWithDetails, newStatus: boolean) => {
    if (!newStatus) {
      // Show confirmation when deactivating
      setConfirmDialog({
        open: true,
        title: 'Deactivate User?',
        description: `Are you sure you want to deactivate ${user.name}? They will not be able to access the system.`,
        onConfirm: async () => {
          try {
            await updateUserMutation.mutateAsync({
              userId: user.id,
              data: { is_active: false },
            });
            toast.success('User deactivated successfully');
            setConfirmDialog({ open: false, title: '', description: '', onConfirm: () => { } });
          } catch (error: any) {
            toast.error(error?.message || 'Failed to deactivate user');
          }
        },
      });
    } else {
      // Activate immediately without confirmation
      updateUserMutation.mutate(
        {
          userId: user.id,
          data: { is_active: true },
        },
        {
          onSuccess: () => {
            toast.success('User activated successfully');
          },
          onError: (error: any) => {
            toast.error(error?.message || 'Failed to activate user');
          },
        }
      );
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col h-screen overflow-hidden mt-16 sm:mt-0 bg-muted/30">
        {/* Header */}
        <header className="bg-card border-b border-border px-3 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">User Management</h1>
              <p className="mt-1 text-xs sm:text-sm md:text-base text-muted-foreground">
                Manage user salaries and leaves
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 sm:mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-3">
              <div className="relative flex-1 w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-[14px] text-sm h-9 sm:h-10"
                />
              </div>

              <Select
                value={format(selectedMonth, 'yyyy-MM')}
                onValueChange={(value) => {
                  const [year, month] = value.split('-').map(Number);
                  setSelectedMonth(new Date(year, month - 1));
                }}
              >
                <SelectTrigger className="w-full sm:w-[200px] rounded-[14px] text-sm h-9 sm:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-[14px]">
                  {Array.from({ length: 12 }, (_, i) => {
                    const monthDate = subMonths(new Date(), i);
                    return (
                      <SelectItem
                        key={format(monthDate, 'yyyy-MM')}
                        value={format(monthDate, 'yyyy-MM')}
                      >
                        {format(monthDate, 'MMMM yyyy')}
                      </SelectItem>
                    );
                  }).reverse()}
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-3 sm:p-4 md:p-6 lg:p-8">
            {isLoadingUsers ? (
              <div className="space-y-3 sm:space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 sm:h-20 w-full rounded-[14px]" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <Card className="p-6 sm:p-12 rounded-[14px] border-2 border-dashed">
                <div className="text-center">
                  <Users className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4 opacity-50" />
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                    {debouncedSearchQuery ? 'No users found' : 'No users available'}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                    {debouncedSearchQuery
                      ? `No users match "${debouncedSearchQuery}". Try adjusting your search.`
                      : 'There are no users in the system yet.'}
                  </p>
                  {debouncedSearchQuery && (
                    <Button
                      variant="outline"
                      onClick={() => setSearchQuery('')}
                      className="rounded-[14px] text-sm h-9 sm:h-10"
                    >
                      Clear Search
                    </Button>
                  )}
                </div>
              </Card>
            ) : isMobile ? (
              <Card className="rounded-[14px] border border-border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-[1100px] w-full text-xs">
                    <thead className="bg-secondary sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-semibold text-[10px] sm:text-xs uppercase tracking-wide rounded-tl-[14px]">Name</th>
                        <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-semibold text-[10px] sm:text-xs uppercase tracking-wide">Email</th>
                        <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-semibold text-[10px] sm:text-xs uppercase tracking-wide">Role</th>
                        <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-semibold text-[10px] sm:text-xs uppercase tracking-wide">Department</th>
                        <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-semibold text-[10px] sm:text-xs uppercase tracking-wide">Status</th>
                        <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-semibold text-[10px] sm:text-xs uppercase tracking-wide">Current Salary</th>
                        <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-semibold text-[10px] sm:text-xs uppercase tracking-wide">Net Salary</th>
                        <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-semibold text-[10px] sm:text-xs uppercase tracking-wide">Hourly Price</th>
                        <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-semibold text-[10px] sm:text-xs uppercase tracking-wide">Unpaid Leaves</th>
                        <th className="px-3 py-2 sm:px-4 sm:py-3 text-left font-semibold text-[10px] sm:text-xs uppercase tracking-wide rounded-tr-[14px]">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredUsers.map((user) => {
                        const userStats = usersMonthStatsMap?.get(user.id);
                        const isEditing = editingUser?.id === user.id;

                        return (
                          <tr key={user.id} className="border-b border-secondary/30 hover:bg-secondary/30 transition-colors">
                            {/* Name */}
                            <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm">
                              {isEditing ? (
                                <Input
                                  value={editFormData.name ?? user.name}
                                  onChange={(e) =>
                                    setEditFormData({ ...editFormData, name: e.target.value })
                                  }
                                  className="h-8 sm:h-9 text-xs rounded-[14px]"
                                />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6 sm:h-7 sm:w-7">
                                    <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
                                    <AvatarFallback className="bg-primary text-white text-[10px] sm:text-xs">
                                      {user.name
                                        ?.split(' ')
                                        .map((n) => n[0])
                                        .join('')
                                        .toUpperCase() || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium">{user.name}</span>
                                </div>
                              )}
                            </td>

                            {/* Email */}
                            <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-muted-foreground">
                              {user.email}
                            </td>

                            {/* Role */}
                            <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap">
                              {isEditing ? (
                                <Select
                                  value={editFormData.role ?? user.role ?? 'none'}
                                  onValueChange={(value) =>
                                    setEditFormData({
                                      ...editFormData,
                                      role: value === 'none' ? null : value,
                                    })
                                  }
                                >
                                  <SelectTrigger className="h-8 sm:h-9 text-xs rounded-[14px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-[14px]">
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="User">User</SelectItem>
                                    <SelectItem value="Admin">Admin</SelectItem>
                                    <SelectItem value="Sales">Sales</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant="outline" className="text-[10px] sm:text-xs rounded-[10px]">
                                  {user.role || '—'}
                                </Badge>
                              )}
                            </td>

                            {/* Department */}
                            <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm">
                              {isEditing ? (
                                <Input
                                  value={editFormData.department ?? user.department ?? ''}
                                  onChange={(e) =>
                                    setEditFormData({
                                      ...editFormData,
                                      department: e.target.value || null,
                                    })
                                  }
                                  className="h-8 sm:h-9 text-xs rounded-[14px]"
                                />
                              ) : (
                                <span className="text-muted-foreground">{user.department || '—'}</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap">
                              {isEditing ? (
                                <Switch
                                  checked={editFormData.is_active ?? user.is_active ?? false}
                                  onCheckedChange={(checked) =>
                                    setEditFormData({ ...editFormData, is_active: checked })
                                  }
                                />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={user.is_active ?? false}
                                    onCheckedChange={(checked) =>
                                      handleToggleActive(user, checked)
                                    }
                                    disabled={updateUserMutation.isPending}
                                  />
                                  <Badge
                                    variant={user.is_active ? 'default' : 'secondary'}
                                    className={cn(
                                      'text-[10px] sm:text-xs rounded-[10px]',
                                      user.is_active
                                        ? 'bg-green-100 text-green-800 hover:bg-green-100'
                                        : 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                                    )}
                                  >
                                    {user.is_active ? 'Active' : 'Inactive'}
                                  </Badge>
                                </div>
                              )}
                            </td>

                            {/* Current Salary */}
                            <td
                              className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap cursor-pointer text-xs sm:text-sm font-medium hover:text-primary transition-colors"
                              onClick={() => handleOpenSalaryModal(user)}
                            >
                              {formatCurrency(user.current_salary)}
                            </td>

                            {/* Net Salary */}
                            <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm">
                              {isLoadingStats ? (
                                <Skeleton className="h-3 w-12" />
                              ) : (
                                <span className="font-medium">{formatCurrency(userStats?.net_salary)}</span>
                              )}
                            </td>

                            {/* Hourly Price */}
                            <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm">
                              {isLoadingStats ? (
                                <Skeleton className="h-3 w-12" />
                              ) : (
                                <span className="text-muted-foreground">
                                  {userStats?.hourly_price
                                    ? formatCurrency(userStats.hourly_price)
                                    : '—'}
                                </span>
                              )}
                            </td>

                            {/* Unpaid Leaves */}
                            <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm">
                              {isLoadingStats ? (
                                <Skeleton className="h-3 w-8" />
                              ) : (
                                <span className="font-medium">{userStats?.unpaid_leaves || '—'}</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap">
                              {isEditing ? (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveUser(user.id)}
                                    className="rounded-[14px] h-8 w-8 p-0"
                                    disabled={updateUserMutation.isPending}
                                  >
                                    <Save className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleCancelEdit}
                                    className="rounded-[14px] h-8 w-8 p-0"
                                    disabled={updateUserMutation.isPending}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenLeavesModal(user)}
                                    className="rounded-[14px] h-8 w-8 p-0"
                                  >
                                    <Calendar className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleNavigateToCalendar(user.id)}
                                    className="rounded-[14px] h-8 w-8 p-0"
                                  >
                                    <CalendarDays className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

            ) : (
              <div className="rounded-[14px] border border-border bg-card shadow-sm overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Name</TableHead>
                      <TableHead className="text-xs sm:text-sm">Role</TableHead>
                      <TableHead className="text-xs sm:text-sm">Department</TableHead>
                      <TableHead className="text-xs sm:text-sm">Status</TableHead>
                      <TableHead className="text-xs sm:text-sm">Current Salary</TableHead>
                      <TableHead className="text-xs sm:text-sm">Net Salary</TableHead>
                      <TableHead className="text-xs sm:text-sm">Hourly Price</TableHead>
                      <TableHead className="text-xs sm:text-sm">Unpaid Leaves</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const userStats = usersMonthStatsMap?.get(user.id);
                      const isEditing = editingUser?.id === user.id;
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium text-xs sm:text-sm">
                            {isEditing ? (
                              <Input
                                value={editFormData.name ?? user.name}
                                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                className="w-full min-w-[150px] h-9 text-sm rounded-[14px]"
                                autoFocus
                                placeholder="User name"
                              />
                            ) : (
                              <div className="flex items-center gap-2 group min-w-0">
                                <Avatar className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
                                  <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
                                  <AvatarFallback className="bg-primary text-white text-xs">
                                    {user.name
                                      ?.split(' ')
                                      .map((n) => n[0])
                                      .join('')
                                      .toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="flex-1 truncate">{user.name}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                  onClick={() => {
                                    setEditingUser(user);
                                    setEditFormData({
                                      name: user.name,
                                      role: user.role,
                                      department: user.department,
                                      rank: user.rank,
                                      is_active: user.is_active,
                                    });
                                  }}
                                  title="Edit user"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {isEditing ? (
                              <Select
                                value={editFormData.role ?? user.role ?? 'none'}
                                onValueChange={(value) => setEditFormData({ ...editFormData, role: value === 'none' ? null : value })}
                              >
                                <SelectTrigger className="w-full min-w-[120px] h-9 text-sm rounded-[14px]">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent className="rounded-[14px]">
                                  <SelectItem value="none">None</SelectItem>
                                  <SelectItem value="User">User</SelectItem>
                                  <SelectItem value="Admin">Admin</SelectItem>
                                  <SelectItem value="Sales">Sales</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                {user.role || '—'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {isEditing ? (
                              <Input
                                value={editFormData.department ?? user.department ?? ''}
                                onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value || null })}
                                className="w-full min-w-[140px] h-9 text-sm rounded-[14px]"
                                placeholder="Department"
                              />
                            ) : (
                              <span className="text-sm truncate block max-w-[120px]">{user.department || '—'}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={editFormData.is_active ?? user.is_active ?? false}
                                  onCheckedChange={(checked) =>
                                    setEditFormData({ ...editFormData, is_active: checked })
                                  }
                                />
                                <span className="text-xs text-muted-foreground">
                                  {editFormData.is_active ?? user.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={user.is_active ?? false}
                                  onCheckedChange={(checked) => handleToggleActive(user, checked)}
                                  disabled={updateUserMutation.isPending}
                                />
                                <Badge
                                  variant={user.is_active ? 'default' : 'secondary'}
                                  className={cn(
                                    'text-xs',
                                    user.is_active
                                      ? 'bg-green-100 text-green-800 hover:bg-green-100'
                                      : 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                                  )}
                                >
                                  {user.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <div
                              className="flex items-center gap-2 group cursor-pointer"
                              onClick={() => handleOpenSalaryModal(user)}
                            >
                              <span className={cn(
                                "font-medium truncate",
                                user.current_salary === 0 && "text-muted-foreground"
                              )}>
                                {formatCurrency(user.current_salary)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenSalaryModal(user);
                                }}
                                title="Edit salary"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {isLoadingStats ? (
                              <Skeleton className="h-4 w-20" />
                            ) : (
                              <span className="truncate block">{formatCurrency(userStats?.net_salary)}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {isLoadingStats ? (
                              <Skeleton className="h-4 w-20" />
                            ) : (
                              <span className="truncate block">
                                {userStats?.hourly_price
                                  ? formatCurrency(userStats.hourly_price)
                                  : '—'}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {isLoadingStats ? (
                              <Skeleton className="h-4 w-12" />
                            ) : (
                              userStats?.unpaid_leaves || '—'
                            )}
                          </TableCell>
                          <TableCell className="text-right text-xs sm:text-sm">
                            <div className="flex items-center justify-end gap-2 flex-wrap">
                              {isEditing ? (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveUser(user.id)}
                                    className="rounded-[14px] text-xs h-8"
                                    disabled={updateUserMutation.isPending}
                                  >
                                    <Save className="h-3 w-3 mr-1" />
                                    {updateUserMutation.isPending ? 'Saving...' : 'Save'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleCancelEdit}
                                    className="rounded-[14px] text-xs h-8"
                                    disabled={updateUserMutation.isPending}
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenLeavesModal(user)}
                                    className="rounded-[14px] text-xs h-8"
                                  >
                                    <Calendar className="h-3 w-3 mr-1" />
                                    Leaves
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleNavigateToCalendar(user.id)}
                                    className="rounded-[14px] text-xs h-8"
                                  >
                                    <CalendarDays className="h-3 w-3 mr-1" />
                                    Calendar
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        {/* Salary Modal */}
        <Dialog open={isSalaryModalOpen} onOpenChange={setIsSalaryModalOpen}>
          <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto rounded-[14px]">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Update Salary</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Set salary for {selectedUser?.name} for a specific month
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Period Month</Label>
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal rounded-[14px] h-9 sm:h-10 text-sm',
                        !salaryPeriodMonth && 'text-muted-foreground'
                      )}
                    >
                      <Calendar className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="truncate">
                        {salaryPeriodMonth ? format(salaryPeriodMonth, 'MMMM yyyy') : 'Select month'}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-[14px]" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={salaryPeriodMonth}
                      onSelect={(date) => {
                        if (date) {
                          setSalaryPeriodMonth(startOfMonth(date));
                          setIsDatePickerOpen(false);
                        }
                      }}
                      defaultMonth={salaryPeriodMonth}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Monthly Salary (INR)</Label>
                <Input
                  type="number"
                  value={salaryInputValue}
                  onChange={(e) => setSalaryInputValue(e.target.value)}
                  placeholder="50000"
                  min="0"
                  step="0.01"
                  className="rounded-[14px] h-9 sm:h-10 text-sm"
                  autoFocus
                />
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Current salary for {format(selectedMonth, 'MMMM yyyy')}: {formatCurrency(selectedUser?.current_salary || 0)}
                </p>
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  setIsSalaryModalOpen(false);
                  setSalaryInputValue('');
                }}
                className="rounded-[14px] w-full sm:w-auto text-sm h-9 sm:h-10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveSalary}
                disabled={!salaryInputValue || parseFloat(salaryInputValue) < 0 || upsertSalaryMutation.isPending}
                className="rounded-[14px] bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto text-sm h-9 sm:h-10"
              >
                {upsertSalaryMutation.isPending ? 'Saving...' : 'Save Salary'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Leaves Modal */}
        {selectedUser && (
          <LeavesModal
            open={isLeavesModalOpen}
            onOpenChange={setIsLeavesModalOpen}
            userName={selectedUser.name}
            userId={selectedUser.id}
            monthDate={selectedMonth}
            leaves={leaves}
            onAddLeave={handleAddLeave}
            onDeleteLeave={handleDeleteLeave}
            isAdding={createLeaveMutation.isPending}
            isDeleting={deleteLeaveMutation.isPending}
          />
        )}

        {/* Confirmation Dialog */}
        <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
          <AlertDialogContent className="rounded-[14px] w-[95vw] sm:max-w-[425px]">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
                {confirmDialog.title}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs sm:text-sm">
                {confirmDialog.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
              <AlertDialogCancel className="rounded-[14px] w-full sm:w-auto text-sm h-9 sm:h-10">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDialog.onConfirm}
                className="rounded-[14px] bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto text-sm h-9 sm:h-10"
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default UserManagement;

