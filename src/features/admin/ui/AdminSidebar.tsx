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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';

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
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, path: '/admin/tasks' },
  { id: 'worklogs', label: 'Worklogs', icon: Clock, path: '/admin/worklogs' },
  { id: 'users', label: 'User Management', icon: UserCog, path: '/admin/users' },
  { id: 'team-efficiency', label: 'Team Efficiency', icon: Users, path: '/admin/team-efficiency' },
  { id: 'project-efficiency', label: 'Project Efficiency', icon: TrendingUp, path: '/admin/project-efficiency' },
  { id: 'profit', label: 'Profit', icon: DollarSign, path: '/admin/profit' },
  { id: 'vendors', label: 'Vendors', icon: Building2, path: '/admin/vendors' },
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
    <>
      {/* Logo Section */}
      <div className={cn("p-6 border-b border-sidebar-border", isCollapsed && "px-2")}>
        <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <span className="text-green-600 font-bold text-sm">WA</span>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">{profile?.name}</span>
              <span className="text-xs text-muted-foreground">{profile?.rank}</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-4 px-3">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isCollapsed && "justify-center",
                  active
                    ? "bg-[#FEEAEA] text-primary"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={cn("h-5 w-5 flex-shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className={cn("p-3 border-t border-sidebar-border space-y-2", isCollapsed && "px-2")}>
        <div className="space-y-1">
          {/* <button
            onClick={() => handleNavClick('/admin/settings')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
              isCollapsed && "justify-center"
            )}
            title={isCollapsed ? "Settings" : undefined}
          >
            <Settings className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </button> */}
          {/* <button
            onClick={() => handleNavClick('/admin/help')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
              isCollapsed && "justify-center"
            )}
            title={isCollapsed ? "Help" : undefined}
          >
            <HelpCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            {!isCollapsed && <span>Help</span>}
          </button> */}
        </div>
      </div>
    </>
  );
};

export const AdminSidebar: React.FC<{ onCollapseChange?: (collapsed: boolean) => void }> = ({ onCollapseChange }) => {
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
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onCollapseChange?.(newState);
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

  // Desktop sidebar
  return (
    <div
      className={cn(
        'fixed left-0 top-0 h-screen bg-secondary flex flex-col transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-16' : 'w-[220px]'
      )}
    >
      {/* Collapse Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-4 z-10 h-6 w-6 rounded-full bg-white shadow-md hover:bg-gray-100"
        onClick={handleToggleCollapse}
      >
        {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
      </Button>

      <SidebarContentInternal
        isCollapsed={isCollapsed}
        navigate={handleNavigate}
        isActive={isActive}
      />
    </div>
  );
};

