import { buttonVariants } from '@sevendays/ui/components/button';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { NAV_LINKS } from '../lib/nav';
import { MobileNav } from './mobile-nav';

// Site chrome, ink-led band (M3 #97 / the #92 composition): ink background,
// white text, petrol as the action color. Desktop row structure unchanged
// from M2; mobile gets the MobileNav hamburger panel. Every interactive
// control carries the full-opacity brand focus ring — the band-CTA
// normalization the spec rules (7.15:1 non-text on ink).
export function SiteHeader() {
  return (
    <header className='bg-brand-ink'>
      <div className='relative mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4'>
        <Link
          to='/'
          className='focus-visible:ring-brand-focus-ring rounded-sm font-bold text-xl text-white focus-visible:ring-3 focus-visible:outline-none'
        >
          Sevendays Photography
        </Link>
        <div className='flex items-center gap-4 md:gap-6'>
          <nav className='hidden items-center gap-6 md:flex' aria-label='Primary'>
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
            to='/book'
            className={cn(
              buttonVariants(),
              'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
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
