import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, PlusCircle, Calendar as CalendarIcon, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardHeaderProps {
  userName?: string;
  canEdit?: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  userName,
  canEdit = true,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Welcome back, {userName}!</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Here's a summary of your day.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
        <div className="relative flex-1 md:flex-none md:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search projects, tasks..."
            className="pl-10 text-sm"
          />
        </div>

        {canEdit && (
          <Button 
            className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto"
            onClick={() => navigate('/user/worklog-history')}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            <span className="text-sm sm:text-base">Add Worklog</span>
          </Button>
        )}

        {/* <Button 
          variant="outline" 
          className="border-secondary"
          onClick={() => navigate('/user/calendar')}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          View Calendar
        </Button>

        <Button 
          variant="outline" 
          className="border-secondary"
          onClick={() => navigate('/user/tasks')}
        >
          <List className="mr-2 h-4 w-4" />
          View All Tasks
        </Button> */}
      </div>
    </div>
  );
};

