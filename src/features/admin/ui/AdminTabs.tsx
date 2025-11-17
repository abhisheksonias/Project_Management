import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface AdminTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const AdminTabs: React.FC<AdminTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'projects', label: 'Projects' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'worklogs', label: 'Worklogs' },
    { id: 'team-efficiency', label: 'Team Efficiency' },
    { id: 'monthly-report', label: 'Monthly Report' },
    { id: 'status-history', label: 'Status History' },
  ];

  return (
    <div className="bg-card border-b border-border px-6">
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList className="bg-transparent h-auto p-0 gap-1">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "px-4 py-3 text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none",
                activeTab === tab.id ? "text-foreground font-bold" : "text-muted-foreground"
              )}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
};

