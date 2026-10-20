import { buttonVariants } from '@sevendays/ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@sevendays/ui/components/collapsible';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { CalendarPlus, Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { NAV_LINKS } from '../lib/nav';

// Mobile chrome — panel B treatment (#111 ruled) wearing #164's ruled
// animation, rebuilt on Base UI's NATIVE transition contract (the Round-6
// fix: the library stamps data-open / data-closed / data-starting-style on
// the panel and keeps it mounted through the exit transition itself —
// .nav-panel in styles.css styles those states; custom mount/unmount state
// classes fought the library and lost). The trigger rotates 90° through
// the Menu/X morph; reduced motion = instant; the panel unmounts when
// closed again — no a11y residue. CTA law: Book now carries CalendarPlus.
// Hidden at md+ where the desktop nav lives.
export function MobileNav({ links }: { links: typeof NAV_LINKS }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className='md:hidden'>
      <CollapsibleTrigger
        aria-label='Menu'
        className={cn(
          'inline-flex size-10 items-center justify-center rounded-md text-white transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring motion-reduce:transition-none',
          open && 'rotate-90'
        )}
      >
        {open ? <X className='size-5' /> : <Menu className='size-5' />}
      </CollapsibleTrigger>
      <CollapsibleContent className='nav-panel absolute inset-x-0 top-full z-10 border-white/15 border-t bg-brand-ink'>
        <nav className='mx-auto max-w-5xl px-6 py-4' aria-label='Mobile'>
          {links.map((link, i) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className='flex items-center justify-between gap-4 border-white/10 border-b py-3 text-base text-brand-200 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring aria-[current=page]:font-medium aria-[current=page]:text-white'
            >
              {link.label}
              <span className='font-mono text-brand-300 text-xs'>
                {String(i + 1).padStart(2, '0')}
              </span>
            </Link>
          ))}
          <Link
            to='/book'
            onClick={() => setOpen(false)}
            className={cn(
              buttonVariants({ size: 'lg' }),
              'mt-4 w-full bg-brand-deep tracking-wide hover:bg-brand-primary-hover focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            <CalendarPlus className='size-4' aria-hidden='true' />
            Book now
          </Link>
        </nav>
      </CollapsibleContent>
    </Collapsible>
  );
}
