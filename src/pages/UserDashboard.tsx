import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { UserSidebar } from '@/features/worklogs/ui/UserSidebar';
import { DashboardStats } from '@/features/worklogs/ui/DashboardStats';
import { LoggedCalendar } from '@/features/worklogs/ui/LoggedCalendar';
import { TopTasksTable } from '@/features/tasks/ui/TopTasksTable';
import { DashboardHeader } from '@/features/dashboard/ui/DashboardHeader';
import { useDashboardWorklogs } from '@/features/dashboard/hooks/useDashboardWorklogs';
import { useDashboardTasks, useDashboardTopTasks } from '@/features/dashboard/hooks/useDashboardTasks';
import { useDashboardStats } from '@/features/dashboard/hooks/useDashboardStats';
import { useAuth } from '@/contexts/AuthContext';
import { useUserMentions } from '@/features/projects/hooks/useUserMentions';
import { ProjectMentionsCard } from '@/features/projects/ui/ProjectMentionsCard';

const UserDashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Role-based access
  const isSales = profile?.role === 'Sales';
  const canEdit = !isSales;

  // Handle navigation from sidebar
  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    if (tab === 'dashboard') {
      navigate('/user/dashboard');
    } else if (tab === 'calendar') {
      navigate('/user/calendar');
    } else if (tab === 'worklog-history') {
      navigate('/user/worklog-history');
    } else if (tab === 'projects') {
      navigate('/user/projects');
    } else if (tab === 'tasks') {
      navigate('/user/tasks');
    } else if (tab === 'reports') {
      navigate('/user/reports');
    } else if (tab === 'settings') {
      navigate('/user/profile');
    }
  };

  // Fetch data via hooks (services)
  const { data: worklogs } = useDashboardWorklogs(profile?.id || '', selectedMonth);
  const { data: tasks } = useDashboardTasks(profile?.id || '');
  const { data: topTasks } = useDashboardTopTasks(profile?.id || '', 8);
  const { data: mentions = [] } = useUserMentions(profile?.id || '');

  // Calculate stats
  const stats = useDashboardStats(worklogs, tasks);

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <UserSidebar currentTab={currentTab} onTabChange={handleTabChange} />

      <div className="flex-1 overflow-y-auto">
        {currentTab === 'dashboard' && (
          <div className="p-6 space-y-6">
            <DashboardHeader 
              userName={profile?.name}
              canEdit={canEdit}
            />

            <DashboardStats
              totalHours={stats.totalHours}
              billableHours={stats.billableHours}
              nonBillableHours={stats.nonBillableHours}
              tasksInProgress={stats.tasksInProgress}
              tasksCompleted={stats.tasksCompleted}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <TopTasksTable tasks={topTasks || []} />
              </div>

              <div className="lg:col-span-1 space-y-6">
                <LoggedCalendar
                  loggedDays={stats.loggedDays}
                  onMonthChange={setSelectedMonth}
                />
                {mentions.length > 0 && (
                  <ProjectMentionsCard mentions={mentions} />
                )}
              </div>
            </div>
          </div>
        )}

        {currentTab !== 'dashboard' && (
          <div className="flex items-center justify-center h-full">
            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-2">
                  {currentTab.charAt(0).toUpperCase() + currentTab.slice(1)} Tab
                </h2>
                <p className="text-muted-foreground">
                  This tab will be implemented soon.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
