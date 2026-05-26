import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    CreateTaskDialog,
    NewTaskFormState,
    createDefaultNewTaskFormState,
} from '@/features/admin/ui/CreateTaskDialog';
import { userService } from '@/features/users/services/userService';
import { useAllMilestones } from '@/features/milestones/hooks/useMilestones';
import { useAdminProjects } from '@/features/admin/hooks/useAdminProjects';
import { CreateTaskData } from '@/features/tasks/services/taskService';

interface UserCreateTaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isLoading: boolean;
    onSubmit: (data: CreateTaskData) => Promise<void>;
}

const CATEGORY_OPTIONS = [
    { value: 'design', label: 'Design' },
    { value: 'development', label: 'Development' },
];

export const UserCreateTaskDialog: React.FC<UserCreateTaskDialogProps> = ({
    open,
    onOpenChange,
    isLoading,
    onSubmit,
}) => {
    const [newTaskData, setNewTaskData] = useState<NewTaskFormState>(() =>
        createDefaultNewTaskFormState()
    );

    const { data: projects = [] } = useAdminProjects();
    const { data: users = [] } = useQuery({
        queryKey: ['users', 'all'],
        queryFn: () => userService.getAllUsers(),
        staleTime: 300000,
    });

    const { data: allMilestones = [] } = useAllMilestones();

    const resetNewTaskForm = () => {
        setNewTaskData(createDefaultNewTaskFormState());
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (newOpen) {
            resetNewTaskForm();
        }
        onOpenChange(newOpen);
    };

    const usersForSelect = useMemo(
        () =>
            users
                .filter((user) => user.role !== 'Admin')
                .map((user) => ({ id: user.id, name: user.name, department: user.department })),
        [users]
    );

    const milestonesForSelect = useMemo(
        () =>
            allMilestones.map((m) => ({
                id: m.id,
                name: m.name,
                project_id: m.project_id,
            })),
        [allMilestones]
    );

    const handleSubmit = async () => {
        const taskData: CreateTaskData = {
            name: newTaskData.name,
            description: newTaskData.description || null,
            status: newTaskData.status,
            type: newTaskData.type,
            priority: newTaskData.priority || null,
            project_id: newTaskData.project_id || null,
            category: newTaskData.category || null,
            estimate_hours: newTaskData.estimate_hours ? parseFloat(newTaskData.estimate_hours) : null,
            assigned_user_ids: newTaskData.assigned_user_ids || [],
            milestone_id: newTaskData.milestone_id !== 'none' ? newTaskData.milestone_id : null,
            deadline: newTaskData.deadline?.toISOString() || null,
        };

        await onSubmit(taskData);
        resetNewTaskForm();
    };

    return (
        <CreateTaskDialog
            open={open}
            data={newTaskData}
            projects={projects}
            users={usersForSelect}
            categoryOptions={CATEGORY_OPTIONS}
            milestones={milestonesForSelect}
            isSubmitting={isLoading}
            onOpenChange={handleOpenChange}
            onChange={(changes) =>
                setNewTaskData((prev) => ({
                    ...prev,
                    ...changes,
                }))
            }
            onSubmit={handleSubmit}
            title="Create New Task"
            description="Create a new task and assign it to team members."
        />
    );
};
