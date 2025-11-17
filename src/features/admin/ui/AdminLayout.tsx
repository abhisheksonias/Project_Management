import React, { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
      <AdminSidebar onCollapseChange={setIsCollapsed} />
      {/* Mobile: no margin (sidebar is overlay), Desktop: margin for fixed sidebar */}
      <div className="md:ml-16 lg:ml-[220px] transition-all duration-300 ease-in-out">
        {children}
      </div>
    </div>
  );
};

