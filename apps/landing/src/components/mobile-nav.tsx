import { buttonVariants } from '@sevendays/ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@sevendays/ui/components/collapsible';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { NAV_LINKS } from '../lib/nav';

// Mobile chrome (M3 #97): hamburger trigger + collapsible panel — proper
// disclosure navigation over the shared Base UI collapsible (the primitive
// owns aria-expanded/aria-controls; TanStack Link owns aria-current on the
// current page). Carries the four nav links plus the variant CTA: "Book
// now" on main; the v1 scrub swaps it for "Call us" → /branches at pick
// time (never a runtime branch). Hidden at md+ where the desktop nav lives.
export function MobileNav({ links }: { links: typeof NAV_LINKS }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className='md:hidden'>
      <CollapsibleTrigger
        aria-label='Menu'
        className='focus-visible:ring-brand-focus-ring inline-flex size-10 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10 focus-visible:ring-3 focus-visible:outline-none'
      >
        {open ? <X className='size-5' /> : <Menu className='size-5' />}
      </CollapsibleTrigger>
      <CollapsibleContent className='absolute inset-x-0 top-full z-10 border-t border-white/15 bg-brand-ink'>
        <nav className='mx-auto flex max-w-5xl flex-col gap-1 px-6 py-4' aria-label='Mobile'>
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className='focus-visible:ring-brand-focus-ring rounded-md px-3 py-2.5 text-base text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-3 focus-visible:outline-none aria-[current=page]:bg-white/10 aria-[current=page]:text-white'
            >
              {link.label}
            </Link>
          ))}
          <Link
            to='/branches'
            onClick={() => setOpen(false)}
            className={cn(
              buttonVariants({ size: 'lg' }),
              'mt-3 w-full focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            Call us
          </Link>
        </nav>
      </CollapsibleContent>
    </Collapsible>
  );
}
