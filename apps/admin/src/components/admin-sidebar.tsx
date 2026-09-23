// Admin-local Tier 2 (spec #94): the shell's sidebar — variant A's labeled
// grouped nav (#59 ruling: Overview / Catalog / Studio), collapsing to the
// variant C icon-rail posture (tooltips + group dividers) via the top bar's
// trigger. Brand = wordmark + primary only (the tool-neutral mapping);
// the user card renders the gate's session identity (#120).

import { Button } from '@sevendays/ui/components/button';
import { Separator } from '@sevendays/ui/components/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@sevendays/ui/components/sidebar';
import { Link, useMatchRoute, useNavigate } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  PlusCircle,
  Settings,
  Wrench,
} from 'lucide-react';
import { authClient } from '#/lib/auth-client';

type NavTo =
  | '/'
  | '/appointments'
  | '/packages'
  | '/add-ons'
  | '/studio-services'
  | '/branches'
  | '/settings';

interface NavItem {
  to: NavTo;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

interface AdminSidebarProps {
  user: { name: string; email: string };
}

// Initials for the avatar chip: first letters of the first two name words.
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

// The ruled taxonomy (#59), icons carried from the prototype unchanged.
const navGroups: NavGroup[] = [
  {
    heading: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/appointments', label: 'Appointments', icon: CalendarDays },
    ],
  },
  {
    heading: 'Catalog',
    items: [
      { to: '/packages', label: 'Packages', icon: Package },
      { to: '/add-ons', label: 'Add-ons', icon: PlusCircle },
      { to: '/studio-services', label: 'Studio services', icon: Wrench },
    ],
  },
  {
    heading: 'Studio',
    items: [
      { to: '/branches', label: 'Branches', icon: MapPin },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function AdminSidebar({ user }: AdminSidebarProps) {
  const navigate = useNavigate();

  // Sign-out (M4 spec § Login UI + shell gate): revoke the session through
  // BetterAuth's own endpoint (the row dies server-side), then land on
  // /login — arriving signed-out at the shell would bounce there anyway;
  // this makes the revocation visible and immediate.
  const onSignOut = async () => {
    await authClient.signOut();
    await navigate({ to: '/login' });
  };

  const matchRoute = useMatchRoute();
  const { state } = useSidebar();
  // Group dividers belong to the icon-rail posture only (#59 variant C);
  // the labeled posture separates groups by its labels + spacing.
  const rail = state === 'collapsed';

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <div className='flex items-center gap-3 px-2 py-2'>
          <span className='bg-sidebar-primary text-sidebar-primary-foreground flex size-9 items-center justify-center rounded-lg font-mono text-sm font-bold'>
            7d
          </span>
          <div className='group-data-[collapsible=icon]:hidden'>
            <p className='text-sm leading-tight font-semibold'>Sevendays</p>
            <p className='text-sidebar-foreground/60 font-mono text-[0.65rem] tracking-widest uppercase'>
              Admin
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group, index) => (
          <SidebarGroup key={group.heading}>
            {rail && index > 0 && <Separator className='my-1' />}
            <SidebarGroupLabel>{group.heading}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    {/* render-prop delegation (Base UI, not asChild): the Link
                        becomes the menu button. TanStack's Link owns
                        aria-current natively; the primitive's isActive owns
                        styling — exactly one aria-current per screen (the
                        #59 dual-aria-current minor, fixed by construction). */}
                    <SidebarMenuButton
                      render={<Link to={item.to} />}
                      tooltip={item.label}
                      isActive={Boolean(matchRoute({ to: item.to, fuzzy: item.to !== '/' }))}
                    >
                      <item.icon aria-hidden='true' />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        {/* Identity from the gate's session fetch; sign-out inline (the
            owner-ruled Option 2: one click, no menu). In the collapsed icon
            rail the row becomes a column — avatar above the logout button. */}
        <div className='flex items-center gap-3 px-2 py-1.5 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2 group-data-[collapsible=icon]:px-0'>
          <span className='bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold'>
            {initials(user.name)}
          </span>
          <div className='min-w-0 flex-1 group-data-[collapsible=icon]:hidden'>
            <p className='truncate text-sm leading-tight font-medium'>{user.name}</p>
            <p className='text-sidebar-foreground/60 truncate text-xs'>{user.email}</p>
          </div>
          <Button
            variant='ghost'
            size='icon'
            aria-label='Sign out'
            className='text-sidebar-foreground/60 hover:text-destructive size-8 shrink-0'
            onClick={() => void onSignOut()}
          >
            <LogOut aria-hidden='true' />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
