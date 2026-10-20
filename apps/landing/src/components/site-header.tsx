import type { SiteSettings } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { ThemeToggle } from '@sevendays/ui/components/theme-toggle';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { CalendarPlus } from 'lucide-react';
import { NAV_LINKS } from '../lib/nav';
import { MobileNav } from './mobile-nav';

// Site chrome — the ruled pass C "Sticky ink bar" (#164 Round 1, owner
// endorsed; built M7 #223): the ink band goes sticky and glassy — 90% ink
// + backdrop-blur so scrolling content reads softly beneath it, the
// white/10 hairline keeping the glass legible on bright photos. The
// incumbent wordmark (serif name + mono kicker) carries, desktop-only
// (md+); the brand consumes site settings (the logo chip when the studio
// sets one, the incumbent sd.png otherwise; name/tagline from the Site
// tab, code defaults when unset). Link treatment stays #111's ruled B
// (brand-200 rest 13.94:1, white hover/current, petrol tick). CTA law,
// main arm: Book now carries CalendarPlus — the v1 arm's Call-us swap is a
// pick-time transform, never in this codebase.
export function SiteHeader({ settings }: { settings: SiteSettings }) {
  return (
    <header className='sticky top-0 z-20 border-white/10 border-b bg-brand-ink/90 backdrop-blur-md'>
      {/* py-2.5 + the 36px mark = the 56px bar home's -mt-14 hero tuck matches. */}
      <div className='relative mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-2.5'>
        <Link
          to='/'
          className='flex items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
        >
          <span className='flex size-9 shrink-0 items-center overflow-hidden rounded-md border-line-soft/40'>
            <img src={settings.logoImageUrl ?? '/photos/sd.png'} alt='' aria-hidden='true' />
          </span>
          <span className='flex items-baseline gap-2.5'>
            <span className='font-bold font-serif text-xl text-white'>{settings.brandName}</span>
            <span className='hidden font-mono text-[10px] text-brand-300 uppercase tracking-[0.18em] md:inline'>
              {settings.brandTagline}
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
              buttonVariants({ size: 'sm' }),
              'bg-brand-deep tracking-wide hover:bg-brand-primary-hover focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            <CalendarPlus className='size-4' aria-hidden='true' />
            Book now
          </Link>
          {/* The toggle rides the glass bar (#217's ruled placement), at
              size-9 so the bar keeps its 56px height. */}
          <ThemeToggle className='inline-flex size-9 rounded-md text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring' />
          <MobileNav links={NAV_LINKS} />
        </div>
      </div>
    </header>
  );
}
