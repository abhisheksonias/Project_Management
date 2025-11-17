import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, PlusCircle, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const CalendarHeader: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">My Worklog</h1>
      </div>
      <div className="flex items-center gap-4">
        <Button 
          className="bg-primary text-white hover:bg-primary/90"
          onClick={() => navigate('/user/worklog-history')}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Worklog
        </Button>
        
      </div>
    </div>
  );
};

