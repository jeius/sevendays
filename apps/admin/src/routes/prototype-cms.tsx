// PROTOTYPE (throwaway) — wayfinder #131: the admin CMS composition showcase.
// Public (outside _shell — no session friction, /login posture), local
// fixtures only: no API, no auth, no persistence. Renders its own
// shell-lookalike chrome (prototype sidebar + the real AdminTopbar) with a
// search-param screen switcher so every composition, including open
// dialog/sheet/confirm states, is a deep-linkable URL for the frame pass.
// Never merges; delete this file (and components/prototype-cms/) when the
// M5 build tickets land.
import { SidebarInset, SidebarProvider } from '@sevendays/ui/components/sidebar';
import { createFileRoute } from '@tanstack/react-router';
import { AdminTopbar } from '#/components/admin-topbar';
import { SCREENS, searchSchema } from '#/components/prototype-cms/nav';
import { ProtoSidebar } from '#/components/prototype-cms/proto-sidebar';

export const Route = createFileRoute('/prototype-cms')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  head: () => ({ meta: [{ title: 'CMS prototype | Sevendays Admin' }] }),
  component: PrototypeCms,
});

function PrototypeCms() {
  const search = Route.useSearch();
  const Screen = SCREENS[search.screen];
  return (
    <SidebarProvider>
      <ProtoSidebar active={search.screen} variant={search.variant} />
      <SidebarInset>
        <AdminTopbar />
        <div className='flex-1 space-y-6 p-6' data-prototype-cms={search.screen}>
          <Screen variant={search.variant} search={search} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
