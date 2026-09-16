import { buttonVariants } from '@sevendays/ui/components/button';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { NAV_LINKS } from '../lib/nav';

// Site chrome, ink-led band mirroring the header — Treatment B register
// RULED 2026-09-16 (#111 owner reaction): the logo mark + serif wordmark
// with the mono kicker, nav links resting brand-200 (13.94:1) and
// sharpening to white on hover/current, and the outline-on-dark
// "Call or visit a branch" affordance (white/40 border, 18.64:1 label).
// Deliberately NO booking CTA — the footer is identical pre/post v1-scrub.
export function SiteFooter() {
  return (
    <footer className='bg-brand-ink'>
      <div className='mx-auto max-w-5xl px-6 py-10'>
        <div className='flex flex-col justify-between gap-8 md:flex-row md:items-center'>
          <Link
            to='/'
            className='flex items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
          >
            <span className='border-line-soft/40 relative flex items-center size-10 shrink-0 overflow-hidden rounded-md'>
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
          <nav
            className='flex flex-col gap-2 md:flex-row md:items-center md:gap-6'
            aria-label='Footer'
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className='rounded-sm text-brand-200 text-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring aria-[current=page]:font-medium aria-[current=page]:text-white'
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Link
            to='/branches'
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            Call or visit a branch
          </Link>
        </div>
        <div className='mt-8 border-white/20 border-t pt-4'>
          <p className='text-white/70 text-xs'>© 2026 Sevendays Photography</p>
        </div>
      </div>
    </footer>
  );
}
