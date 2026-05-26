import React from 'react';
import { cn } from '@/lib/utils';

interface UserPageLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Flex shell for user routes: sidebar + scrollable main, mobile menu offset. */
export const UserPageLayout: React.FC<UserPageLayoutProps> = ({
  sidebar,
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex h-screen overflow-hidden bg-white max-md:pt-14',
        className
      )}
    >
      {sidebar}
      <div className="flex min-h-0 flex-1 min-w-0 flex-col overflow-y-auto overflow-x-hidden">
        {children}
      </div>
    </div>
  );
};
