import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  LayoutGrid,
  FolderOpen,
  CheckSquare,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserSidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

const SidebarContentInternal: React.FC<{
  currentTab: string;
  onTabChange: (tab: string) => void;
  isCollapsed: boolean;
  onSignOut: () => void;
}> = ({ currentTab, onTabChange, isCollapsed, onSignOut }) => {
  const { profile } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'projects', label: 'Projects', icon: FolderOpen },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  return (
    <div className="flex h-full flex-col py-4">
      {/* User Profile */}
      <div className={cn('mb-6 flex items-center gap-3 px-4', isCollapsed && 'justify-center')}>
        {!isCollapsed && (
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-white">
              {profile?.name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        {!isCollapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{profile?.name}</span>
            <span className="text-xs text-muted-foreground">{profile?.rank}</span>
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 space-y-1 px-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                'w-full justify-start gap-3',
                isActive && 'bg-white text-primary hover:bg-white hover:text-primary',
                !isActive && 'hover:bg-white/50'
              )}
              onClick={() => onTabChange(item.id)}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </Button>
          );
        })}
      </nav>

      {/* New Project Button */}
      {!isCollapsed && (
        <div className="px-2 pb-2">
          <Button
            className="w-full bg-primary text-white hover:bg-primary/90"
            onClick={() => onTabChange('projects')}
          >
            New Project
          </Button>
        </div>
      )}

      {/* Settings & Logout */}
      <div className="mt-auto space-y-1 border-t px-2 pt-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 hover:bg-white/50"
          onClick={() => onTabChange('settings')}
        >
          <Settings className="h-5 w-5" />
          {!isCollapsed && <span>Profile</span>}
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 hover:bg-white/50"
          onClick={onSignOut}
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );
};

export const UserSidebar: React.FC<UserSidebarProps> = ({ currentTab, onTabChange }) => {
  const { signOut } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    await signOut();
  };

  // Mobile sidebar using Sheet
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild className="fixed top-4 left-4 z-50">
          <Button variant="ghost" size="icon" className="bg-white shadow-md">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 bg-secondary">
          <SidebarContentInternal
            currentTab={currentTab}
            onTabChange={(tab) => {
              onTabChange(tab);
              setIsOpen(false);
            }}
            isCollapsed={false}
            onSignOut={handleSignOut}
          />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop sidebar
  return (
    <div
      className={cn(
        'relative h-screen transition-all duration-300 ease-in-out bg-secondary',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Collapse Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-4 z-10 h-6 w-6 rounded-full bg-white shadow-md hover:bg-gray-100"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
      </Button>

      <SidebarContentInternal
        currentTab={currentTab}
        onTabChange={onTabChange}
        isCollapsed={isCollapsed}
        onSignOut={handleSignOut}
      />
    </div>
  );
};

