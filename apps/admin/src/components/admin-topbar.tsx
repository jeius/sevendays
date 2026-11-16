// Admin-local Tier 2 (spec #94): the sticky top bar — sidebar collapse
// trigger, search, notifications (#59 variant A). The bell is live since
// M9 #314: the Notification, a derived view over the pending-submissions
// queue (ADR-0028). Search stays present but inert — Global Search is
// #315's ticket, not this one's; the IA is unchanged.

import { Input } from '@sevendays/ui/components/input';
import { Separator } from '@sevendays/ui/components/separator';
import { SidebarTrigger } from '@sevendays/ui/components/sidebar';
import { ThemeToggle } from '@sevendays/ui/components/theme-toggle';
import { Notification } from '#/components/notification';

export function AdminTopbar() {
  return (
    <header className='bg-background/95 sticky top-0 z-10 flex h-14 items-center gap-3 border-b px-4 backdrop-blur'>
      <SidebarTrigger />
      <Separator orientation='vertical' className='h-4' />
      <Input
        type='search'
        placeholder='Search…'
        aria-label='Search'
        className='hidden w-56 sm:block'
      />
      <Notification />
      <ThemeToggle />
    </header>
  );
}
