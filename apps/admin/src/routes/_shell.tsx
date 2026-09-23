// The admin app shell (pathless — no URL segment): everything staff-facing
// renders through it, gated on a session — the M4 spec's beforeLoad gate.
// Signed-out arrivals at ANY admin URL bounce to /login preserving the aimed
// URL (location.href rides the redirect search param; /login's round-trip
// consumes it). Variant A per #59: labeled sidebar + sticky top bar; the
// sidebar collapses to the icon rail via the top-bar trigger.

import { SidebarInset, SidebarProvider } from '@sevendays/ui/components/sidebar';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { AdminSidebar } from '#/components/admin-sidebar';
import { AdminTopbar } from '#/components/admin-topbar';
import { getSession } from '#/lib/auth.functions';

export const Route = createFileRoute('/_shell')({
  beforeLoad: async ({ location }) => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
    return { user: { name: session.user.name, email: session.user.email } };
  },
  component: ShellLayout,
});

function ShellLayout() {
  // The gate's own session fetch is the identity source — no extra call.
  const { user } = Route.useRouteContext();
  return (
    <SidebarProvider>
      <AdminSidebar user={user} />
      <SidebarInset>
        <AdminTopbar />
        <div className='flex-1 space-y-6 p-6' data-shell-main>
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
