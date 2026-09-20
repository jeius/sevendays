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

// Mobile chrome — Mobile panel B RULED 2026-09-16 (#111 owner reaction on
// the prototype panels): full-width hairline rows (white/10 rules), links
// resting brand-200 and sharpening to white when current, a mono index per
// row, and the deep-petrol wide-tracked call CTA closing the panel.
// Hamburger trigger keeps the disclosure semantics over the shared Base UI
// collapsible (the primitive owns aria-expanded/aria-controls; TanStack
// Link owns aria-current). Hidden at md+ where the desktop nav lives.
export function MobileNav({ links }: { links: typeof NAV_LINKS }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className='md:hidden'>
      <CollapsibleTrigger
        aria-label='Menu'
        className='inline-flex size-10 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
      >
        {open ? <X className='size-5' /> : <Menu className='size-5' />}
      </CollapsibleTrigger>
      <CollapsibleContent className='absolute inset-x-0 top-full z-10 border-white/15 border-t bg-brand-ink'>
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
            to='/branches'
            onClick={() => setOpen(false)}
            className={cn(
              buttonVariants({ size: 'lg' }),
              'mt-4 w-full bg-brand-deep tracking-wide hover:bg-brand-primary-hover focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            Call us
          </Link>
        </nav>
      </CollapsibleContent>
    </Collapsible>
  );
}
