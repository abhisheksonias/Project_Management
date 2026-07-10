import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  LayoutGrid,
  FolderOpen,
  CheckSquare,
  Calendar,
  BarChart3,
  Settings,
  Menu,
  X,
  Table,
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
}> = ({ currentTab, onTabChange, isCollapsed }) => {
  const { profile } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'projects', label: 'Projects', icon: FolderOpen },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'change-requests', label: 'Change Requests', icon: FolderOpen },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'shared-tables', label: 'Shared Tables', icon: Table },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col py-3">
      {/* User Profile */}
      <div className={cn('mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 px-3 sm:px-4', isCollapsed && 'justify-center')}>
        {!isCollapsed && (
          <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name} />
            <AvatarFallback className="bg-primary text-white text-xs sm:text-sm">
              {profile?.name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        {!isCollapsed && (
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs sm:text-sm font-semibold truncate">{profile?.name}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{profile?.rank}</span>
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-0.5 px-1.5 sm:px-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                'w-full justify-start gap-2 sm:gap-3 h-9 sm:h-10 text-xs sm:text-sm',
                isActive && 'bg-white text-primary hover:bg-white hover:text-primary',
                !isActive && 'hover:bg-white/50'
              )}
              onClick={() => onTabChange(item.id)}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Button>
          );
        })}
      </nav>

      {/* Add Worklog Button */}
      {!isCollapsed && (
        <div className="px-1.5 sm:px-2 pb-2">
          <Button
            className="w-full bg-primary text-white hover:bg-primary/90 h-9 sm:h-10 text-xs sm:text-sm"
            onClick={() => onTabChange('worklog-history')}
          >
            Add Worklog
          </Button>
        </div>
      )}

      {/* Settings */}
      <div className="mt-auto space-y-0.5 sm:space-y-1 border-t px-1.5 sm:px-2 pt-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 sm:gap-3 hover:bg-white/50 h-9 sm:h-10 text-xs sm:text-sm"
          onClick={() => onTabChange('settings')}
        >
          <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
          {!isCollapsed && <span className="truncate">Profile</span>}
        </Button>
      </div>
    </div>
  );
};

export const UserSidebar: React.FC<UserSidebarProps> = ({ currentTab, onTabChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  // Mobile sidebar using Sheet
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-3 left-3 z-50 h-9 w-9 bg-white shadow-lg hover:bg-gray-100"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[min(280px,85vw)] p-0 bg-secondary">
          <SidebarContentInternal
            currentTab={currentTab}
            onTabChange={(tab) => {
              onTabChange(tab);
              setIsOpen(false);
            }}
            isCollapsed={false}
          />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: in-flow sidebar
  return (
    <aside
      className={cn(
        'relative flex h-screen shrink-0 flex-col overflow-hidden bg-secondary transition-[width] duration-300 ease-in-out',
        isCollapsed ? 'w-16' : 'w-56 md:w-64'
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
      />
    </aside>
  );
};

