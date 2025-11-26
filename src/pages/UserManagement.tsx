import React, { useState, useMemo } from 'react';
import { AdminLayout } from '@/features/admin/ui/AdminLayout';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2, MoreVertical, Download, UserCheck, UserX, DollarSign, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useUsersPaginated,
  useDepartments,
  useUserMonthHours,
  useUserUnpaidLeaves,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useBulkUpdateActiveStatus,
  useUserLeaves,
  useAddUserLeave,
  useDeleteUserLeave,
  useHourlyCostForUser,
} from '@/features/admin/hooks/useAdminUserManagement';
import { UserFormModal } from '@/features/admin/ui/UserFormModal';
import { LeavesModal } from '@/features/admin/ui/LeavesModal';
import { adminUserManagementService, UserWithDetails } from '@/features/admin/services/adminUserManagementService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

const UserManagement: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithDetails | null>(null);
  const [isLeavesModalOpen, setIsLeavesModalOpen] = useState(false);
  const [selectedUserForLeaves, setSelectedUserForLeaves] = useState<{ id: string; name: string } | null>(null);
  const [userForHourlyCost, setUserForHourlyCost] = useState<{ id: string; name: string } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithDetails | null>(null);
  const [editingSalary, setEditingSalary] = useState<{ userId: string; value: string } | null>(null);

  // Queries
  const { data: usersData, isLoading } = useUsersPaginated({
    page,
    pageSize,
    search: searchQuery || undefined,
    isActive: activeFilter,
    department: departmentFilter !== 'All' ? departmentFilter : null,
  });

  const { data: departments = [] } = useDepartments();
  const users = usersData?.users || [];
  const totalUsers = usersData?.total || 0;
  const totalPages = Math.ceil(totalUsers / pageSize);

  // Get user IDs for bulk queries
  const userIds = useMemo(() => users.map((u) => u.id), [users]);

  // Get month hours and unpaid leaves in parallel
  const { data: monthHours = [], isLoading: isLoadingHours } = useUserMonthHours(selectedMonth, userIds);
  const { data: unpaidLeaves = [] } = useUserUnpaidLeaves(selectedMonth, userIds);

  // Create maps for quick lookup
  const hoursMap = useMemo(() => {
    const map = new Map<string, number>();
    monthHours.forEach((h) => {
      // Ensure total_hours is a number
      const hours = typeof h.total_hours === 'string' 
        ? parseFloat(h.total_hours) 
        : Number(h.total_hours) || 0;
      map.set(h.user_id, hours);
    });
    return map;
  }, [monthHours]);

  const unpaidLeavesMap = useMemo(() => {
    const map = new Map<string, number>();
    unpaidLeaves.forEach((l) => map.set(l.user_id, l.unpaid_leaves_count));
    return map;
  }, [unpaidLeaves]);

  // Mutations
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const bulkUpdateActiveMutation = useBulkUpdateActiveStatus();
  const addLeaveMutation = useAddUserLeave();
  const deleteLeaveMutation = useDeleteUserLeave();

  // Get leaves for selected user
  const { data: userLeaves = [] } = useUserLeaves(
    selectedUserForLeaves?.id || null,
    selectedMonth
  );

  // Get hourly cost for selected user (on-demand)
  const { data: hourlyCostData } = useHourlyCostForUser(
    userForHourlyCost?.id || null,
    selectedMonth
  );

  // Helper function to calculate hourly cost client-side
  const calculateHourlyCost = (user: UserWithDetails): number | null => {
    const totalHours = hoursMap.get(user.id);
    const unpaid = unpaidLeavesMap.get(user.id) || 0;
    return adminUserManagementService.calculateHourlyCost(
      user.monthly_salary,
      unpaid,
      totalHours || null,
      selectedMonth
    );
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setIsUserFormOpen(true);
  };

  const handleEditUser = (user: UserWithDetails) => {
    try {
      // Use setTimeout to ensure dropdown closes before opening modal
      setTimeout(() => {
        setEditingUser(user);
        setIsUserFormOpen(true);
      }, 100);
    } catch (error: any) {
      console.error('Error opening edit modal:', error);
      toast.error('Failed to open edit form');
    }
  };

  const handleSaveUser = async (data: any) => {
    try {
      if (editingUser) {
        await updateUserMutation.mutateAsync({ userId: editingUser.id, data });
        toast.success('User updated successfully');
      } else {
        await createUserMutation.mutateAsync(data);
        toast.success('User created successfully');
      }
      setIsUserFormOpen(false);
      setEditingUser(null);
    } catch (error: any) {
      console.error('Error saving user:', error);
      // Error is already handled in UserFormModal, so we don't need to show another toast
      // Just re-throw to let the modal handle it
      throw error;
    }
  };

  const handleDeleteUser = async (user: UserWithDetails) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteUserMutation.mutateAsync(userToDelete.id);
      toast.success('User deleted successfully');
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete user');
    }
  };

  const handleToggleSelection = (userId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedIds(newSelected);
  };

  const handleToggleAllSelection = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map((u) => u.id)));
    }
  };

  const handleBulkSetActive = async (isActive: boolean) => {
    if (selectedIds.size === 0) {
      toast.error('Please select at least one user');
      return;
    }
    try {
      await bulkUpdateActiveMutation.mutateAsync({
        userIds: Array.from(selectedIds),
        isActive,
      });
      toast.success(`${selectedIds.size} user(s) updated successfully`);
      setSelectedIds(new Set());
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update users');
    }
  };

  const handleOpenLeavesModal = (user: UserWithDetails) => {
    setSelectedUserForLeaves({ id: user.id, name: user.name });
    setIsLeavesModalOpen(true);
  };

  const handleAddLeave = async (data: { leave_date: string; is_paid: boolean }) => {
    if (!selectedUserForLeaves) return;
    await addLeaveMutation.mutateAsync({
      user_id: selectedUserForLeaves.id,
      ...data,
    });
    toast.success('Leave added successfully');
  };

  const handleDeleteLeave = async (leaveId: string) => {
    if (!selectedUserForLeaves) return;
    await deleteLeaveMutation.mutateAsync({ leaveId, userId: selectedUserForLeaves.id });
    toast.success('Leave deleted successfully');
  };

  const handleComputeHourlyCost = async (user: UserWithDetails) => {
    setUserForHourlyCost({ id: user.id, name: user.name });
    // The query will automatically fetch the hourly cost
    // Show toast when data is available
    setTimeout(() => {
      if (hourlyCostData) {
        if (hourlyCostData.hourly_cost) {
          toast.success(`Hourly cost: ${hourlyCostData.hourly_cost} ${user.salary_currency}`);
        } else {
          toast.info('Hourly cost cannot be calculated (no hours or salary)');
        }
      }
    }, 500);
  };

  const handleSalaryEdit = (user: UserWithDetails) => {
    setEditingSalary({ userId: user.id, value: user.monthly_salary?.toString() || '' });
  };

  const handleSalarySave = async (userId: string, value: string) => {
    const numValue = value ? parseFloat(value) : null;
    if (numValue !== null && (isNaN(numValue) || numValue < 0)) {
      toast.error('Invalid salary value');
      return;
    }
    try {
      await updateUserMutation.mutateAsync({
        userId,
        data: { monthly_salary: numValue },
      });
      setEditingSalary(null);
      toast.success('Salary updated successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update salary');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Role', 'Department', 'Monthly Salary', 'Currency', 'Active', 'Total Hours', 'Unpaid Leaves', 'Hourly Cost'];
    const rows = users.map((user) => {
      const totalHours = hoursMap.get(user.id) || 0;
      const unpaid = unpaidLeavesMap.get(user.id) || 0;
      const hourlyCost = calculateHourlyCost(user);
      return [
        user.name,
        user.email,
        user.role || '',
        user.department || '',
        user.monthly_salary?.toString() || '',
        user.salary_currency,
        user.is_active ? 'Yes' : 'No',
        totalHours.toFixed(2),
        unpaid.toString(),
        hourlyCost ? hourlyCost.toFixed(2) : '—',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${format(selectedMonth, 'yyyy-MM')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  return (
    <AdminLayout>
      <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: '#FAFAFA' }}>
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">User Management</h1>
                  <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                    Manage users, salaries, and leaves
                  </p>
                </div>
                <Button
                  onClick={handleCreateUser}
                  className="bg-primary text-white hover:bg-primary/90 rounded-[14px]"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </div>

              {/* Filters and Search */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-4 items-center">
                  {/* Month Picker */}
                  <div className="flex gap-2 items-center">
                    <Select
                      value={selectedMonth.getMonth().toString()}
                      onValueChange={(month) => {
                        const newDate = new Date(selectedMonth);
                        newDate.setMonth(parseInt(month));
                        setSelectedMonth(newDate);
                      }}
                    >
                      <SelectTrigger className="w-[140px] rounded-[14px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-[14px]">
                        {[
                          'January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'
                        ].map((month, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={selectedMonth.getFullYear().toString()}
                      onValueChange={(year) => {
                        const newDate = new Date(selectedMonth);
                        newDate.setFullYear(parseInt(year));
                        setSelectedMonth(newDate);
                      }}
                    >
                      <SelectTrigger className="w-[100px] rounded-[14px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-[14px]">
                        {Array.from({ length: 10 }, (_, i) => {
                          const year = new Date().getFullYear() - 2 + i;
                          return (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Search */}
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="w-full sm:w-[300px] rounded-[14px]"
                  />

                  {/* Active Filter */}
                  <Select
                    value={activeFilter === null ? 'All' : activeFilter ? 'Active' : 'Inactive'}
                    onValueChange={(value) => {
                      setActiveFilter(
                        value === 'All' ? null : value === 'Active'
                      );
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[140px] rounded-[14px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-[14px]">
                      <SelectItem value="All">All Users</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Department Filter */}
                  <Select
                    value={departmentFilter}
                    onValueChange={(value) => {
                      setDepartmentFilter(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[160px] rounded-[14px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-[14px]">
                      <SelectItem value="All">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Bulk Actions */}
                <div className="flex gap-2">
                  {selectedIds.size > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkSetActive(true)}
                        className="rounded-[14px]"
                      >
                        <UserCheck className="mr-2 h-4 w-4" />
                        Set Active
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkSetActive(false)}
                        className="rounded-[14px]"
                      >
                        <UserX className="mr-2 h-4 w-4" />
                        Set Inactive
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                    className="rounded-[14px]"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="border rounded-[14px] bg-white">
                {isLoading ? (
                  <div className="p-8 text-center text-muted-foreground">Loading...</div>
                ) : users.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No users found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedIds.size === users.length && users.length > 0}
                            onCheckedChange={handleToggleAllSelection}
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Monthly Salary</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead>Total Hours</TableHead>
                        <TableHead>Unpaid Leaves</TableHead>
                        <TableHead>Hourly Cost</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => {
                        const totalHours = hoursMap.get(user.id) ?? 0;
                        const unpaid = unpaidLeavesMap.get(user.id) || 0;
                        const hourlyCost = calculateHourlyCost(user);
                        const isSelected = selectedIds.has(user.id);
                        const isEditingSalary = editingSalary?.userId === user.id;

                        return (
                          <TableRow key={user.id}>
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleSelection(user.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.role || '—'}</TableCell>
                            <TableCell>{user.department || '—'}</TableCell>
                            <TableCell>
                              {isEditingSalary ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={editingSalary.value}
                                    onChange={(e) =>
                                      setEditingSalary({ ...editingSalary, value: e.target.value })
                                    }
                                    className="w-24 h-8"
                                    onBlur={() => handleSalarySave(user.id, editingSalary.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSalarySave(user.id, editingSalary.value);
                                      } else if (e.key === 'Escape') {
                                        setEditingSalary(null);
                                      }
                                    }}
                                    autoFocus
                                  />
                                  <span className="text-sm text-muted-foreground">
                                    {user.salary_currency}
                                  </span>
                                </div>
                              ) : (
                                <div
                                  className="cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                                  onClick={() => handleSalaryEdit(user)}
                                  title="Click to edit"
                                >
                                  {user.monthly_salary
                                    ? `${user.monthly_salary.toLocaleString()} ${user.salary_currency}`
                                    : '—'}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  'px-2 py-1 rounded-full text-xs font-medium',
                                  user.is_active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                )}
                              >
                                {user.is_active ? 'Yes' : 'No'}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium">
                              {totalHours.toFixed(2)}
                            </TableCell>
                            <TableCell>{unpaid}</TableCell>
                            <TableCell>
                              {hourlyCost ? (
                                `${hourlyCost.toFixed(2)} ${user.salary_currency}`
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleComputeHourlyCost(user)}
                                  disabled={!user.monthly_salary || !totalHours || totalHours <= 0}
                                  className="text-xs"
                                >
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  Compute
                                </Button>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="rounded-[14px]">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-[14px]">
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      handleEditUser(user);
                                    }}
                                    className="rounded-[14px]"
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      handleOpenLeavesModal(user);
                                    }}
                                    className="rounded-[14px]"
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    Leaves
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      handleDeleteUser(user);
                                    }}
                                    className="text-red-600 rounded-[14px]"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {users.length === 0 ? 0 : (page - 1) * pageSize + 1} to{' '}
                  {Math.min(page * pageSize, totalUsers)} of {totalUsers} users
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label>Page Size:</Label>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(value) => {
                        setPageSize(parseInt(value));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[80px] rounded-[14px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-[14px]">
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="rounded-[14px]"
                    >
                      Previous
                    </Button>
                    <span className="px-4 py-2 text-sm">
                      Page {page} of {totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page >= totalPages}
                      className="rounded-[14px]"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Form Modal */}
      <UserFormModal
        open={isUserFormOpen}
        onOpenChange={(open) => {
          setIsUserFormOpen(open);
          if (!open) setEditingUser(null);
        }}
        user={editingUser}
        onSave={handleSaveUser}
        isSaving={createUserMutation.isPending || updateUserMutation.isPending}
      />

      {/* Leaves Modal */}
      {selectedUserForLeaves && (
        <LeavesModal
          open={isLeavesModalOpen}
          onOpenChange={setIsLeavesModalOpen}
          userName={selectedUserForLeaves.name}
          userId={selectedUserForLeaves.id}
          monthDate={selectedMonth}
          leaves={userLeaves}
          onAddLeave={handleAddLeave}
          onDeleteLeave={handleDeleteLeave}
          isAdding={addLeaveMutation.isPending}
          isDeleting={deleteLeaveMutation.isPending}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[14px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {userToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[14px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              className="bg-red-600 hover:bg-red-700 rounded-[14px]"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default UserManagement;

