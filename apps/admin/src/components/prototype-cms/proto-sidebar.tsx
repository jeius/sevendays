// PROTOTYPE (throwaway) — wayfinder #131: the /prototype-cms route's
// shell-lookalike sidebar. Mirrors the real AdminSidebar (same primitives,
// same #59 variant-A labeled groups, same icon-rail collapse behavior, same
// header lockup, same footer card posture) with the taxonomy from NAV_GROUPS:
// screen switching rides search params on /prototype-cms (preserving the
// current variant), inert shell destinations render without links, and the
// M5 additions carry a small "new" badge for the IA reaction pass. Never
// merges; delete with the route.

import { Badge } from '@sevendays/ui/components/badge';
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
import { Link } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import type { ScreenKey } from '#/components/prototype-cms/nav';
import { NAV_GROUPS } from '#/components/prototype-cms/nav';

interface ProtoSidebarProps {
  active: ScreenKey;
  variant: 'a' | 'b';
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

export function ProtoSidebar({ active, variant }: ProtoSidebarProps) {
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
        {NAV_GROUPS.map((group, index) => (
          <SidebarGroup key={group.heading}>
            {rail && index > 0 && <Separator className='my-1' />}
            <SidebarGroupLabel>{group.heading}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.key ?? item.label}>
                    {/* Items with a key switch prototype screens via search
                        params (render-prop delegation, Base UI — the Link
                        becomes the menu button; the primitive's isActive owns
                        styling). Items without a key are the real shell's
                        inert destinations: rendered for shell realism, never
                        active, no click behavior. */}
                    <SidebarMenuButton
                      render={
                        item.key ? (
                          <Link to='/prototype-cms' search={{ screen: item.key, variant }} />
                        ) : undefined
                      }
                      tooltip={item.label}
                      isActive={item.key !== undefined && item.key === active}
                    >
                      <item.icon aria-hidden='true' />
                      <span>{item.label}</span>
                      {item.isNew && (
                        <Badge variant='outline' className='text-[0.6rem]'>
                          new
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        {/* PROTOTYPE-ONLY static identity — the real identity strings deleted
            by #120 stay deleted everywhere real. The LogOut button renders
            with the real sidebar's posture but has no sign-out wiring. */}
        <div className='flex items-center gap-3 px-2 py-1.5 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2 group-data-[collapsible=icon]:px-0'>
          <span className='bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold'>
            {initials('Studio Owner')}
          </span>
          <div className='min-w-0 flex-1 group-data-[collapsible=icon]:hidden'>
            <p className='truncate text-sm leading-tight font-medium'>Studio Owner</p>
            <p className='text-sidebar-foreground/60 truncate text-xs'>owner@sevendays.test</p>
          </div>
          <Button
            variant='ghost'
            size='icon'
            aria-label='Sign out'
            className='text-sidebar-foreground/60 hover:text-destructive size-8 shrink-0'
          >
            <LogOut aria-hidden='true' />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
