// Admin-local Tier 2 (spec #94): the sticky top bar — sidebar collapse
// trigger, search, notifications (#59 variant A). Search is present but
// inert: nothing to search until M5's catalog + M4's auth land; the IA is
// the deliverable, the wiring is theirs.

import { Button } from '@sevendays/ui/components/button';
import { Input } from '@sevendays/ui/components/input';
import { Separator } from '@sevendays/ui/components/separator';
import { SidebarTrigger } from '@sevendays/ui/components/sidebar';
import { Bell } from 'lucide-react';

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
      <Button variant='ghost' size='icon' aria-label='Notifications' className='ml-auto'>
        <Bell aria-hidden='true' />
      </Button>
    </header>
  );
}
