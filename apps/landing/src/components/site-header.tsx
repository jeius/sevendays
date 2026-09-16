import { buttonVariants } from '@sevendays/ui/components/button';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { NAV_LINKS } from '../lib/nav';
import { MobileNav } from './mobile-nav';

// Site chrome — Treatment B "rebalanced" RULED 2026-09-16 (#111 owner
// reaction on the prototype bands): links rest soft at brand-200 (13.94:1
// on ink), sharpen to white on hover; the current page is white + medium
// with a petrol tick; the CTA drops to deep petrol with a wide-tracked
// label (10.90:1). The owner's logo mark leads the wordmark (the owner-supplied
// sd.png monogram — the full lockup's wordmark is illegible at chip size).
// Mobile panel carries the ruled Mobile panel B treatment.
export function SiteHeader() {
  return (
    <header className='bg-brand-ink'>
      <div className='relative mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4'>
        <Link
          to='/'
          className='flex items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
        >
          <span className='relative size-10 shrink-0 overflow-hidden border-line-soft/40 flex items-center'>
            <img
              src='/photos/sd.png'
              alt=''
              aria-hidden='true'
            />
          </span>
          <span className='flex items-baseline gap-2.5'>
            <span className='font-bold font-serif text-white text-xl'>Sevendays</span>
            <span className='hidden font-mono text-[10px] text-brand-300 uppercase tracking-[0.18em] sm:inline'>
              Photography
            </span>
          </span>
        </Link>
        <div className='flex items-center gap-4 md:gap-6'>
          <nav className='hidden items-center gap-6 md:flex' aria-label='Primary'>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className='inline-flex items-center gap-1.5 rounded-sm text-brand-200 text-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring aria-[current=page]:font-medium aria-[current=page]:text-white'
              >
                <span
                  className='hidden size-1.5 rounded-full bg-primary aria-[current=page]:inline-block'
                  aria-hidden='true'
                />
                {link.label}
              </Link>
            ))}
          </nav>
          <Link
            to='/book'
            className={cn(
              buttonVariants(),
              'bg-brand-deep tracking-wide hover:bg-brand-primary-hover focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            Book now
          </Link>
          <MobileNav links={NAV_LINKS} />
        </div>
      </div>
    </header>
  );
}
