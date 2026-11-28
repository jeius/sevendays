// Admin-local Tier 2 (spec #94): the sticky top bar, sidebar collapse
// trigger, search, notifications (#59 variant A). The bell is live since
// M9 #314: the Notification, a derived view over the pending-submissions
// queue (ADR-0028). The Input is live since M9 #315: Global Search, the
// typing surface of the inline dropdown (fuse.js engine seam + cmdk
// headless); the IA is unchanged.

import { Separator } from '@sevendays/ui/components/separator';
import { SidebarTrigger } from '@sevendays/ui/components/sidebar';
import { ThemeToggle } from '@sevendays/ui/components/theme-toggle';
import { GlobalSearch } from '#/components/global-search';
import { Notification } from '#/components/notification';

export function AdminTopbar() {
  return (
    <header className='bg-background/95 sticky top-0 z-10 flex h-14 items-center gap-3 border-b px-4 backdrop-blur'>
      <SidebarTrigger />
      <Separator orientation='vertical' className='h-4' />
      <GlobalSearch />
      <Notification />
      <ThemeToggle />
    </header>
  );
}
