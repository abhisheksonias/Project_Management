import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, PlusCircle, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const CalendarHeader: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">My Worklog</h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
        <Button 
          className="bg-primary text-white hover:bg-primary/90 w-full sm:w-auto text-sm sm:text-base"
          onClick={() => navigate('/user/worklog-history')}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Add Worklog</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>
    </div>
  );
};

