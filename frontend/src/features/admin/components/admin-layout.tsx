'use client';

import React, { useState } from 'react';
import { AdminSidebar } from './admin-sidebar';
import { AdminHeader } from './admin-header';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps): React.JSX.Element {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Sidebar (Desktop sticky / Mobile drawer) */}
      <AdminSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Viewport Area */}
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        <AdminHeader onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />

        <main className="flex-1 min-h-0 flex flex-col overflow-y-auto bg-muted/20">
          {children}
        </main>
      </div>
    </div>
  );
}
