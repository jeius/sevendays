// The admin app shell (pathless — no URL segment): everything staff-facing
// renders through it, so M4's login can mount outside it without
// restructuring. Variant A per #59: labeled sidebar + sticky top bar; the
// sidebar collapses to the icon rail via the top-bar trigger.

import { SidebarInset, SidebarProvider } from '@sevendays/ui/components/sidebar';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AdminSidebar } from '#/components/admin-sidebar';
import { AdminTopbar } from '#/components/admin-topbar';

export const Route = createFileRoute('/_shell')({
  component: ShellLayout,
});

function ShellLayout() {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <AdminTopbar />
        <div className='flex-1 space-y-6 p-6' data-shell-main>
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
