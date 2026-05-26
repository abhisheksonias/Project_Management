import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskService, CreateTaskData } from '@/features/tasks/services/taskService';

export const useCreateTask = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ data, userId }: { data: CreateTaskData; userId: string }) =>
            taskService.createTask(data, userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard', 'tasks'] });
            toast.success('Task created successfully');
        },
        onError: (error) => {
            console.error('Failed to create task:', error);
            toast.error('Failed to create task');
        },
    });
};
