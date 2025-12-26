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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sharedTableService, AssignUserData } from '../services/sharedTableService';
import { PMTable } from '../services/sharedTableService';
import { userService } from '@/features/users/services/userService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AssignUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: PMTable | null;
}

interface UserAssignment {
  user_id: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export const AssignUsersDialog: React.FC<AssignUsersDialogProps> = ({
  open,
  onOpenChange,
  table,
}) => {
  const [assignments, setAssignments] = useState<UserAssignment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => userService.getAllUsers(),
    enabled: open,
    staleTime: 30000,
  });

  const { data: tableUsers = [], isLoading: tableUsersLoading } = useQuery({
    queryKey: ['table-users', table?.id],
    queryFn: () => (table?.id ? sharedTableService.getTableUsers(table.id) : Promise.resolve([])),
    enabled: open && !!table?.id,
    staleTime: 10000,
  });

  // Initialize assignments from table users
  useEffect(() => {
    if (tableUsers && tableUsers.length > 0) {
      setAssignments(
        tableUsers.map((tu) => ({
          user_id: tu.user_id,
          user: tu.user,
        }))
      );
    } else {
      setAssignments([]);
    }
  }, [tableUsers, open]);

  const filteredUsers = users.filter(
    (user) =>
      // Exclude Admin users
      user.role !== 'Admin' &&
      // Exclude already assigned users
      !assignments.find((a) => a.user_id === user.id) &&
      // Filter by search query
      (user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddUser = () => {
    if (!selectedUserId) return;

    const user = users.find((u) => u.id === selectedUserId);
    if (!user) return;

    // Check if user is already assigned
    if (assignments.find((a) => a.user_id === selectedUserId)) {
      toast.error('User is already assigned');
      return;
    }

    setAssignments([
      ...assignments,
      {
        user_id: selectedUserId,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
    ]);
    setSelectedUserId('');
    setSearchQuery('');
  };

  const handleRemoveUser = (userId: string) => {
    // Check if user is owner - don't allow removing owner
    const originalUser = tableUsers.find((tu) => tu.user_id === userId);
    if (originalUser?.role === 'owner') {
      toast.error('Cannot remove table owner');
      return;
    }
    
    setAssignments(assignments.filter((a) => a.user_id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!table) return;

    try {
      // Default to 'editor' role for all assignments, but preserve owner role if it exists
      const assignData: AssignUserData[] = assignments.map((a) => {
        // Check if this user is the owner in the original tableUsers
        const originalUser = tableUsers.find((tu) => tu.user_id === a.user_id);
        const role = originalUser?.role === 'owner' ? 'owner' : 'editor';
        
        return {
          user_id: a.user_id,
          role: role as 'owner' | 'editor' | 'viewer',
        };
      });

      await sharedTableService.assignUsers(table.id, assignData);
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['table-users', table.id] });
      queryClient.invalidateQueries({ queryKey: ['shared-tables'] });
      toast.success('Users assigned successfully');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to assign users: ${error.message}`);
    }
  };

  if (!table) return null;

  const isLoading = usersLoading || tableUsersLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[14px] w-[95vw] sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Users to Table</DialogTitle>
          <DialogDescription>
            Manage user access to "{table.name}". Select users who can access this table.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-4 py-4 flex-1 min-h-0 flex flex-col">
            {/* Add User Section */}
            <div className="space-y-2">
              <Label>Add User</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger className="pl-9 rounded-[14px]">
                      <SelectValue placeholder="Search and select user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredUsers.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          {searchQuery ? 'No users found' : 'All users are already assigned'}
                        </div>
                      ) : (
                        filteredUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  onClick={handleAddUser}
                  disabled={!selectedUserId}
                  className="rounded-[14px]"
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Assigned Users List */}
            <div className="flex-1 min-h-0 flex flex-col">
              <Label className="mb-2">Assigned Users</Label>
              <div className="flex-1 overflow-y-auto border rounded-[14px] p-2 space-y-2">
                {isLoading ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Loading...
                  </div>
                ) : assignments.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    No users assigned yet. Add users above.
                  </div>
                ) : (
                  assignments.map((assignment) => {
                    const user = assignment.user || users.find((u) => u.id === assignment.user_id);
                    if (!user) return null;

                    // Check if user is owner
                    const originalUser = tableUsers.find((tu) => tu.user_id === assignment.user_id);
                    const isOwner = originalUser?.role === 'owner';

                    return (
                      <div
                        key={assignment.user_id}
                        className="flex items-center justify-between p-2 border rounded-[14px] hover:bg-secondary/50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{user.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveUser(assignment.user_id)}
                            disabled={isOwner}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed"
                            title={isOwner ? 'Cannot remove table owner' : 'Remove user'}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-[14px]"
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-[14px]">
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

