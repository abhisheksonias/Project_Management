import React from 'react';
import { AdminSidebar } from './AdminSidebar';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAFA]">
      <AdminSidebar />
      <main
        className={cn(
          'flex flex-1 min-h-0 min-w-0 flex-col overflow-x-hidden overflow-y-auto',
          'max-md:pt-14'
        )}
      >
        {children}
      </main>
    </div>
  );
};
