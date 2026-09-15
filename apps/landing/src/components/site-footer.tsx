import { buttonVariants } from '@sevendays/ui/components/button';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { NAV_LINKS } from '../lib/nav';

// Site chrome, ink-led band mirroring the header (M3 #97 / the #92
// composition): brand line, the four nav links, and a "Call or visit a
// branch" affordance to /branches. Deliberately NO booking CTA — the
// footer is identical pre/post v1-scrub. The affordance uses the outline
// variant (wash fill + cool border + ink label — 17.36:1) with the band
// focus-ring override.
export function SiteFooter() {
  return (
    <footer className='bg-brand-ink'>
      <div className='mx-auto max-w-5xl px-6 py-10'>
        <div className='flex flex-col justify-between gap-8 md:flex-row md:items-center'>
          <div>
            <p className='font-bold text-xl text-white'>Sevendays Photography</p>
          </div>
          <nav
            className='flex flex-col gap-2 md:flex-row md:items-center md:gap-6'
            aria-label='Footer'
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className='focus-visible:ring-brand-focus-ring rounded-sm text-sm text-white/85 transition-colors hover:text-white focus-visible:ring-3 focus-visible:outline-none aria-[current=page]:text-white'
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Link
            to='/branches'
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            Call or visit a branch
          </Link>
        </div>
        <div className='mt-8 border-t border-white/20 pt-4'>
          <p className='text-xs text-white/70'>© 2026 Sevendays Photography</p>
        </div>
      </div>
    </footer>
  );
}
