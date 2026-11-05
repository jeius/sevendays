import type { BranchRead, SiteSettings } from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { Phone } from 'lucide-react';
import { NAV_LINKS } from '../lib/nav';
import { footerContactFor, socialLinksFor } from '../lib/site-chrome';

// Site chrome, the ink band — the page's one dark frame, wearing the ruled
// redesign (#164 Round 1; built M7 #223): the wordmark consumes the
// settings brand (name + mono kicker, md+), the footer carries the
// 3-branch contact truth read live from the API (tel: links + walk-in
// lines), the settings socials and brand contact block, and the outline
// call affordance (Phone icon — the CTA law; outline weight is the law on
// this surface). Deliberately NO booking CTA — the footer is identical
// pre/post v1-scrub (M3 ruling).
const LINK_ON_INK =
  'font-mono text-brand-300 text-xs uppercase tracking-[0.14em] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring';

export function SiteFooter({
  settings,
  branches,
}: {
  settings: SiteSettings;
  branches: BranchRead[];
}) {
  const socials = socialLinksFor(settings);
  const contact = footerContactFor(settings);

  return (
    <footer className='bg-brand-ink'>
      <div className='mx-auto max-w-5xl px-6 py-10'>
        <div className='flex flex-col justify-between gap-8 md:flex-row md:items-center'>
          <Link
            to='/'
            className='flex items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
          >
            <span className='relative flex size-9 shrink-0 items-center overflow-hidden rounded-md border-line-soft/40'>
              <img src={settings.logoImageUrl ?? '/photos/sd.png'} alt='' aria-hidden='true' />
            </span>
            <span className='flex items-baseline gap-2.5'>
              <span className='font-bold font-serif text-xl text-white'>{settings.brandName}</span>
              {/* The Round-1 ruling: the header's kicker treatment in the
                  footer too — desktop-only (md+). */}
              <span className='hidden font-mono text-[10px] text-brand-300 uppercase tracking-[0.18em] md:inline'>
                {settings.brandTagline}
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
            <Phone className='size-4' aria-hidden='true' />
            Call or visit a branch
          </Link>
        </div>
        {branches.length > 0 && (
          <div className='mt-8 grid gap-3 border-white/20 border-t pt-5 sm:grid-cols-3'>
            {branches.map((branch) => (
              <div key={branch.id}>
                <p className='text-white/90 text-sm'>{branch.name}</p>
                <a href={`tel:${branch.phone.replace(/\s/g, '')}`} className={LINK_ON_INK}>
                  {branch.phone}
                </a>
                <p className='text-white/60 text-xs'>
                  {branch.acceptsWalkIns ? 'Walk-ins welcome' : 'By appointment'}
                </p>
              </div>
            ))}
          </div>
        )}
        {(socials.length > 0 || contact !== null) && (
          <div className='mt-6 border-white/20 border-t pt-5'>
            <div className='flex flex-wrap items-center gap-x-6 gap-y-2'>
              {socials.map((social) => (
                <a key={social.key} href={social.href} className={LINK_ON_INK}>
                  {social.label}
                </a>
              ))}
              {contact?.email ? (
                <a href={`mailto:${contact.email}`} className={LINK_ON_INK}>
                  {contact.email}
                </a>
              ) : null}
              {contact?.phone ? (
                <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className={LINK_ON_INK}>
                  {contact.phone}
                </a>
              ) : null}
            </div>
          </div>
        )}
        <div className='mt-6 border-white/20 border-t pt-4'>
          <p className='text-white/70 text-xs'>
            © 2026 {settings.brandName} {settings.brandTagline}
          </p>
        </div>
      </div>
    </footer>
  );
}
