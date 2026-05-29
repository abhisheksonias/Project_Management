import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, 
  Briefcase, 
  CheckSquare, 
  Clock, 
  Users, 
  FileText, 
  History, 
  Settings, 
  HelpCircle,
  Menu,
  X,
  TrendingUp,
  Building2,
  UserCog,
  DollarSign,
  Table,
  Calendar,
  MessageSquare,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path?: string;
  isButton?: boolean;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
  { id: 'projects', label: 'Projects', icon: Briefcase, path: '/admin/projects' },
  { id: 'change-requests', label: 'Change Requests', icon: MessageSquare, path: '/admin/change-requests' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, path: '/admin/tasks' },
  { id: 'worklogs', label: 'Worklogs', icon: Clock, path: '/admin/worklogs' },
  { id: 'users', label: 'User Management', icon: UserCog, path: '/admin/users' },
  { id: 'team-efficiency', label: 'Team Efficiency', icon: Users, path: '/admin/team-efficiency' },
  { id: 'project-efficiency', label: 'Project Efficiency', icon: TrendingUp, path: '/admin/project-efficiency' },
  { id: 'profit', label: 'Profit & Finance', icon: DollarSign, path: '/admin/profit' },
  { id: 'expenses', label: 'Expenses', icon: Wallet, path: '/admin/expenses' },
  { id: 'vendors', label: 'Vendors', icon: Building2, path: '/admin/vendors' },
  { id: 'shared-tables', label: 'Shared Tables', icon: Table, path: '/admin/shared-tables' },
  { id: 'work-calendar', label: 'Work Calendar', icon: Calendar, path: '/admin/work-calendar' },
];

const SidebarContentInternal: React.FC<{
  isCollapsed: boolean;
  navigate: (path: string) => void;
  isActive: (path?: string) => boolean;
}> = ({ isCollapsed, navigate, isActive }) => {
  const { profile } = useAuth();

  const handleNavClick = (path?: string) => {
    if (path) {
      navigate(path);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Logo Section */}
      <div className={cn("shrink-0 p-4 border-b border-sidebar-border", isCollapsed && "px-2")}>
        <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name} />
            <AvatarFallback className="bg-green-100 text-green-600 font-bold text-sm">
              {profile?.name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase() || 'WA'}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">{profile?.name}</span>
              <span className="text-xs text-muted-foreground">{profile?.rank}</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Items — scroll only when items exceed viewport */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-3 px-3">
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isCollapsed && "justify-center px-2",
                  active
                    ? "bg-[#FEEAEA] text-primary"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                title={item.label}
              >
                <Icon className={cn("h-5 w-5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                {!isCollapsed && (
                  <span className="min-w-0 flex-1 text-left leading-tight whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className={cn("shrink-0 p-3 border-t border-sidebar-border", isCollapsed && "px-2")}>
        <div className="space-y-1">
          <button
            onClick={() => handleNavClick('/admin/profile')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isCollapsed && "justify-center",
              isActive('/admin/profile')
                ? "bg-[#FEEAEA] text-primary"
                : "text-foreground hover:bg-accent hover:text-accent-foreground"
            )}
            title={isCollapsed ? "Profile" : undefined}
          >
            <Settings className={cn("h-5 w-5 flex-shrink-0", isActive('/admin/profile') ? "text-primary" : "text-muted-foreground")} />
            {!isCollapsed && <span>Profile</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

export const AdminSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  // Mobile: overlay drawer + fixed menu trigger
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-3 left-3 z-50 h-9 w-9 bg-white shadow-md hover:bg-gray-100"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[min(280px,85vw)] p-0 bg-secondary">
          <div className="flex h-full flex-col">
            <SidebarContentInternal
              isCollapsed={false}
              navigate={(path) => {
                handleNavigate(path);
                setIsOpen(false);
              }}
              isActive={isActive}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: in-flow sidebar (flex sibling of main content)
  return (
    <aside
      className={cn(
        'relative flex h-screen shrink-0 flex-col overflow-hidden bg-secondary transition-[width] duration-300 ease-in-out',
        isCollapsed ? 'w-16' : 'w-[240px]'
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-4 z-10 h-6 w-6 rounded-full bg-white shadow-md hover:bg-gray-100"
        onClick={handleToggleCollapse}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
      </Button>

      <SidebarContentInternal
        isCollapsed={isCollapsed}
        navigate={handleNavigate}
        isActive={isActive}
      />
    </aside>
  );
};

