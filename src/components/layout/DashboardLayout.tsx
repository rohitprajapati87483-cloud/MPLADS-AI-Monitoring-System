import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/hooks/useSidebar';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { SEO } from '@/components/common/SEO';

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        {/* Sidebar */}
        <SEO />
        <Sidebar />

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <Navbar />
          <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
            <div className="mx-auto min-h-full w-full max-w-[1600px] p-3 sm:p-4 md:p-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
