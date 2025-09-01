import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  id: string;
  name: string;
  email?: string; // Added email as it's commonly available
}

interface TaskFormProps {
  projectId: string;
  editTask?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  projectId,
  editTask,
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    assigned_user_id: 'unassigned',
    estimate_hours: '',
    status: 'To Do',
  });
  const [users, setUsers] = useState<User[]>([]);
  
  // Ensure users is always an array
  const safeUsers = Array.isArray(users) ? users : [];
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const { toast } = useToast();
  const { profile } = useAuth();

  const statusOptions = ['To Do', 'In Progress', 'Completed', 'Blocked', 'Review'];

  const logStatusChange = async (taskId: string, newStatus: string, oldStatus?: string) => {
    if (oldStatus && oldStatus === newStatus) return;
    
    if (!profile?.id) {
      console.error('User not authenticated, cannot log status change');
      return;
    }

    try {
      const { error } = await supabase
        .from('status_history')
        .insert({
          entity_id: taskId,
          entity_type: 'task',
          status: newStatus,
          updated_by: profile.id,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error logging status change:', error);
      }
    } catch (error) {
      console.error('Error logging status change:', error);
    }
  };

  // Enhanced user fetching with multiple approaches and debugging
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      console.log('Fetching users from users table...');
      
      // Method 1: Try basic select first
      const { data, error } = await supabase
        .from('users')
        .select('*') // Select all columns to see what's available
        .order('name');

      console.log('Users query result:', { data, error });
      console.log('Raw data:', JSON.stringify(data, null, 2));
      
      // Debug: Check for users with empty names
      if (data && data.length > 0) {
        const usersWithEmptyNames = data.filter(user => !user.name || user.name.trim() === '');
        const usersWithEmptyIds = data.filter(user => !user.id || user.id.trim() === '');
        const usersWithNullNames = data.filter(user => user.name === null || user.name === undefined);
        const usersWithNullIds = data.filter(user => user.id === null || user.id === undefined);
        
        console.log('Users with empty names:', usersWithEmptyNames);
        console.log('Users with empty IDs:', usersWithEmptyIds);
        console.log('Users with null names:', usersWithNullNames);
        console.log('Users with null IDs:', usersWithNullIds);
        console.log('Total users found:', data.length);
        console.log('Users with valid names:', data.filter(user => user.name && user.name.trim() !== '').length);
        
        // Log each user for debugging
        data.forEach((user, index) => {
          console.log(`User ${index + 1}:`, {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            idType: typeof user.id,
            nameType: typeof user.name
          });
        });
      }

      if (error) {
        console.error('Error fetching users:', error);
        console.error('Error details:', error.details, error.hint, error.code);
        
        // Try alternative method if main query fails
        await fetchUsersAlternative();
        return;
      }

      if (!data || data.length === 0) {
        console.warn('No users found in users table');
        
        // Try alternative method if no data
        await fetchUsersAlternative();
        return;
      }

      // Transform the data to ensure we have the right structure
      const transformedUsers = data
        .filter(user => user.id && user.id.trim() !== '') // Ensure user has valid ID
        .map(user => ({
          id: user.id,
          name: user.name || user.email?.split('@')[0] || 'Unknown User',
          email: user.email,
          role: user.role,
          rank: user.rank,
          specialization: user.specialization
        }))
        .filter(user => user.name && user.name.trim() !== ''); // Filter out users with empty names

      console.log(`Successfully fetched ${transformedUsers.length} users:`, transformedUsers);
      
      // Ensure we always set a valid array
      if (transformedUsers && Array.isArray(transformedUsers)) {
        setUsers(transformedUsers);
      } else {
        console.warn('transformedUsers is not a valid array, setting empty array');
        setUsers([]);
      }

      toast({
        title: 'Success',
        description: `Loaded ${transformedUsers.length} users`,
      });

    } catch (error) {
      console.error('Unexpected error fetching users:', error);
      await fetchUsersAlternative();
    } finally {
      setLoadingUsers(false);
    }
  };

  // Alternative fetch method using different approaches
  const fetchUsersAlternative = async () => {
    try {
      console.log('Trying alternative user fetch methods...');
      
      // Method 2: Try with explicit column selection matching your schema
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email, role, rank, specialization')
        .order('created_at', { ascending: false }); // Order by created_at instead

             if (!userError && userData && userData.length > 0) {
         console.log('Alternative method 1 successful:', userData);
         const formattedUsers = userData
           .filter(user => user.id && user.id.trim() !== '') // Ensure user has valid ID
           .map(user => ({
             id: user.id,
             name: user.name || 'Unknown User',
             email: user.email,
             role: user.role,
             rank: user.rank,
             specialization: user.specialization
           }))
           .filter(user => user.name && user.name.trim() !== ''); // Filter out users with empty names
         
         console.log(`Alternative method 1: ${formattedUsers.length} valid users found`);
         
         // Ensure we always set a valid array
         if (formattedUsers && Array.isArray(formattedUsers)) {
           setUsers(formattedUsers);
         } else {
           console.warn('formattedUsers is not a valid array, setting empty array');
           setUsers([]);
         }
         return;
       }

      // Method 3: Try without ordering
      const { data: userData2, error: userError2 } = await supabase
        .from('users')
        .select('id, name, email');

             if (!userError2 && userData2 && userData2.length > 0) {
         console.log('Alternative method 2 successful:', userData2);
         const validUsers = userData2
           .filter(user => user.id && user.id.trim() !== '') // Ensure user has valid ID
           .filter(user => user.name && user.name.trim() !== ''); // Filter out users with empty names
         
         console.log(`Alternative method 2: ${validUsers.length} valid users found`);
         
         // Ensure we always set a valid array
         if (validUsers && Array.isArray(validUsers)) {
           setUsers(validUsers);
         } else {
           console.warn('validUsers is not a valid array, setting empty array');
           setUsers([]);
         }
         return;
       }

      // Method 4: Check if it's a permissions issue
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true });

      console.log('Table access test:', { count: testData, error: testError });
      
      // Method 5: Try to get a sample of users to see what's in the database
      const { data: sampleData, error: sampleError } = await supabase
        .from('users')
        .select('*')
        .limit(5);
      
      console.log('Sample users from database:', sampleData);
      if (sampleError) {
        console.error('Sample query error:', sampleError);
      }
      
      if (testError) {
        toast({
          title: 'Database Error',
          description: `Cannot access users table: ${testError.message}`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Permission Issue',
          description: 'Can access users table but cannot read data. Check RLS policies.',
          variant: 'destructive',
        });
      }
      
    } catch (error) {
      console.error('All alternative fetch methods failed:', error);
      toast({
        title: 'Error',
        description: 'Unable to fetch users with any method',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Task name is required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const taskData = {
        project_id: projectId,
        name: formData.name.trim(),
        type: formData.type.trim(),
        description: formData.description.trim(),
        assigned_user_id: formData.assigned_user_id === 'unassigned' ? null : formData.assigned_user_id,
        estimate_hours: formData.estimate_hours ? parseFloat(formData.estimate_hours) : null,
        status: formData.status,
        updated_at: new Date().toISOString(),
      };

      if (editTask) {
        // Update existing task
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', editTask.id);

        if (error) {
          console.error('Error updating task:', error);
          toast({
            title: 'Error',
            description: `Failed to update task: ${error.message}`,
            variant: 'destructive',
          });
          return;
        }

        await logStatusChange(editTask.id, formData.status, editTask.status);

        toast({
          title: 'Success',
          description: 'Task updated successfully',
        });
      } else {
        // Create new task
        const { data, error } = await supabase
          .from('tasks')
          .insert([{
            ...taskData,
            created_at: new Date().toISOString(),
          }])
          .select();

        if (error) {
          console.error('Error creating task:', error);
          toast({
            title: 'Error',
            description: `Failed to create task: ${error.message}`,
            variant: 'destructive',
          });
          return;
        }

        if (data && data[0]) {
          await logStatusChange(data[0].id, formData.status);
        }

        toast({
          title: 'Success',
          description: 'Task created successfully',
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving task:', error);
      toast({
        title: 'Error',
        description: 'Failed to save task',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch users when component mounts
  useEffect(() => {
    fetchUsers();
  }, []);
  
  // Safety check: Ensure users is always an array
  useEffect(() => {
    if (!Array.isArray(users)) {
      console.warn('Users state is not an array, resetting to empty array');
      setUsers([]);
    }
  }, [users]);

  // Populate form data when editing
  useEffect(() => {
    if (editTask) {
      setFormData({
        name: editTask.name || '',
        type: editTask.type || '',
        description: editTask.description || '',
        assigned_user_id: editTask.assigned_user_id || 'unassigned',
        estimate_hours: editTask.estimate_hours?.toString() || '',
        status: editTask.status || 'To Do',
      });
    }
  }, [editTask]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Task Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter task name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Input
            id="type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            placeholder="e.g., Feature, Bug, Documentation"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Enter task description"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="assigned_user">Assigned To</Label>
          <Select
            value={formData.assigned_user_id}
            onValueChange={(value) => setFormData({ ...formData, assigned_user_id: value })}
          >
            <SelectTrigger>
                             <SelectValue placeholder={
                 loadingUsers 
                   ? "Loading users..." 
                   : safeUsers.length > 0 
                     ? "Select user" 
                     : "No users available"
               } />
            </SelectTrigger>
                         <SelectContent>
               <SelectItem value="unassigned">Unassigned</SelectItem>
               {safeUsers
                 .filter(user => user && user.id && user.id.trim() !== '' && user.name && user.name.trim() !== '')
                 .map((user) => {
                   // Triple-check that we have valid data before rendering
                   try {
                     if (!user || !user.id || !user.name || user.id.trim() === '' || user.name.trim() === '') {
                       console.warn('Skipping invalid user:', user);
                       return null;
                     }
                     
                     // Ensure the values are strings and not empty
                     const userId = String(user.id).trim();
                     const userName = String(user.name).trim();
                     
                     if (userId === '' || userName === '') {
                       console.warn('User has empty string after conversion:', { userId, userName, originalUser: user });
                       return null;
                     }
                     
                     return (
                       <SelectItem key={userId} value={userId}>
                         {userName}
                       </SelectItem>
                     );
                   } catch (error) {
                     console.error('Error rendering user item:', error, user);
                     return null;
                   }
                 })
                 .filter(Boolean)} {/* Remove any null items */}
             </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="estimate_hours">Estimate Hours</Label>
          <Input
            id="estimate_hours"
            type="number"
            min="0"
            step="0.5"
            value={formData.estimate_hours}
            onChange={(e) => setFormData({ ...formData, estimate_hours: e.target.value })}
            placeholder="0"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : editTask ? 'Update Task' : 'Create Task'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};