import { buttonVariants } from '@sevendays/ui/components/button';
import { cn } from 'cn';
import type { ReactNode } from 'react';
import { NAV_LINKS } from '../../lib/nav';

// PROTOTYPE (#111) Track 3 — shared-chrome text treatments. The
// owner-named offenders: NAV LINKS and CTA BUTTON TEXTS.
//
// Root cause, found and measured 2026-09-16 (prototype finding F1): the
// unlayered `a { color: var(--brand-700) }` rule in styles.css beat every
// Tailwind utility (unlayered author styles win the cascade), so nav links
// rendered brand-700 on ink (2.27:1 FAIL) and every solid CTA label
// rendered brand-700 on primary (1.45:1 FAIL) — regardless of their
// classes. The prototype branch layers that rule (the F1 edit) so the
// declared pairs below actually render. The as-landed band reproduces the
// bug with inline styles for the owner's before/after.
//
// Measured pairs (scripts/prototype-contrast.mjs, 2026-09-16):
//   white on ink 18.64 · brand-200 on ink 13.94 · white 85% over ink 13.57
//   white 70% over ink 9.39 · white 60% over ink 7.19 · brand-700 on ink 2.27 FAIL
//   white on primary 5.65 · white on brand-700 8.22 · white on deep 10.90
//   brand-700 on primary 1.45 FAIL · ink on gray-light 13.85

const MEASURED = [
  { pair: 'white on ink', r: '18.64', aa: true },
  { pair: 'brand-200 on ink', r: '13.94', aa: true },
  { pair: 'white 85% over ink', r: '13.57', aa: true },
  { pair: 'white 70% over ink', r: '9.39', aa: true },
  { pair: 'white 60% over ink', r: '7.19', aa: true },
  { pair: 'white on primary (CTA)', r: '5.65', aa: true },
  { pair: 'white on deep (CTA alt)', r: '10.90', aa: true },
  { pair: 'ink on gray-light (emphasis)', r: '13.85', aa: true },
  { pair: 'brand-700 on ink — as-landed hijack', r: '2.27', aa: false },
  { pair: 'brand-700 on primary — as-landed hijack', r: '1.45', aa: false },
];

function HeaderBand({ children }: { children: ReactNode }) {
  return <header className='rounded-t-xl bg-brand-ink'>{children}</header>;
}

// Band 0 — the as-landed #97/#98 chrome, bug reproduced via inline styles
// (post-F1 the utilities win again, so this is the only way to show it).
function ChromeAsLanded() {
  return (
    <HeaderBand>
      <div className='mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4'>
        <span className='font-bold text-white text-xl'>Sevendays Photography</span>
        <nav className='hidden items-center gap-6 md:flex' aria-label='As-landed demo'>
          {NAV_LINKS.map((link) => (
            <span key={link.to} className='text-sm' style={{ color: 'var(--brand-700)' }}>
              {link.label}
            </span>
          ))}
          <span
            className='rounded-md bg-primary px-4 py-2 font-medium text-sm'
            style={{ color: 'var(--brand-700)' }}
          >
            Book now
          </span>
        </nav>
      </div>
    </HeaderBand>
  );
}

// Treatment A — "Crisp white": pure-white links (18.64:1), petrol hover,
// current page marked brand-200 + underline; CTA white-on-primary with the
// 700 hover (5.65 / 8.22).
function ChromeCrispWhite() {
  return (
    <HeaderBand>
      <div className='mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4'>
        <span className='font-bold text-white text-xl'>Sevendays Photography</span>
        <nav className='hidden items-center gap-6 md:flex' aria-label='Crisp white demo'>
          {NAV_LINKS.map((link, i) => (
            <span
              key={link.to}
              className={cn(
                'cursor-pointer text-sm transition-colors',
                i === 0
                  ? 'text-brand-200 underline decoration-brand-200/60 underline-offset-4'
                  : 'text-white hover:text-brand-200'
              )}
            >
              {link.label}
            </span>
          ))}
          <button
            type='button'
            className='cursor-pointer rounded-md bg-primary px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-brand-primary-hover'
          >
            Book now
          </button>
        </nav>
      </div>
    </HeaderBand>
  );
}

// Treatment B — "Rebalanced": soft register — links rest at brand-200,
// sharpen to white on hover; current page is white with a petrol tick;
// the CTA drops to deep petrol for a calmer, higher-contrast pill
// (10.90:1) with a wider-tracked label.
function ChromeRebalanced() {
  return (
    <HeaderBand>
      <div className='mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4'>
        <span className='flex items-baseline gap-3'>
          <span className='font-bold font-serif text-white text-xl'>Sevendays</span>
          <span className='font-mono text-[10px] text-brand-300 uppercase tracking-[0.18em]'>
            Photography
          </span>
        </span>
        <nav className='hidden items-center gap-6 md:flex' aria-label='Rebalanced demo'>
          {NAV_LINKS.map((link, i) => (
            <span
              key={link.to}
              className={cn(
                'inline-flex cursor-pointer items-center gap-1.5 text-sm transition-colors',
                i === 0 ? 'font-medium text-white' : 'text-brand-200 hover:text-white'
              )}
            >
              {i === 0 && <span className='size-1.5 rounded-full bg-primary' aria-hidden='true' />}
              {link.label}
            </span>
          ))}
          <button
            type='button'
            className='cursor-pointer rounded-md bg-brand-deep px-4 py-2 font-medium text-sm text-white tracking-wide transition-colors hover:bg-brand-primary-hover'
          >
            Book now
          </button>
        </nav>
      </div>
    </HeaderBand>
  );
}

// Mobile panel demos — statically opened, narrow container. The real
// mobile chrome gets device screenshots at the acceptance gate (#101).
function MobilePanelA() {
  return (
    <div className='mx-auto w-full max-w-sm rounded-xl border border-white/10 bg-brand-ink p-4'>
      <p className='mb-2 font-mono text-[10px] text-white/70 uppercase tracking-wider'>
        Panel — crisp white
      </p>
      <nav className='flex flex-col gap-1' aria-label='Mobile crisp demo'>
        {NAV_LINKS.map((link, i) => (
          <span
            key={link.to}
            className={cn(
              'rounded-md px-3 py-2.5 text-base',
              i === 0 ? 'bg-white/10 text-white' : 'text-white hover:bg-white/10'
            )}
          >
            {link.label}
          </span>
        ))}
        <button type='button' className={cn(buttonVariants({ size: 'lg' }), 'mt-3 w-full')}>
          Book now
        </button>
      </nav>
    </div>
  );
}

function MobilePanelB() {
  return (
    <div className='mx-auto w-full max-w-sm rounded-xl border border-white/10 bg-brand-ink p-4'>
      <p className='mb-2 font-mono text-[10px] text-white/70 uppercase tracking-wider'>
        Panel — rebalanced
      </p>
      <nav className='flex flex-col' aria-label='Mobile rebalanced demo'>
        {NAV_LINKS.map((link, i) => (
          <span
            key={link.to}
            className={cn(
              'flex items-center justify-between border-white/10 border-b py-3 text-base',
              i === 0 ? 'text-white' : 'text-brand-200'
            )}
          >
            {link.label}
            <span className='font-mono text-brand-300 text-xs'>
              {String(i + 1).padStart(2, '0')}
            </span>
          </span>
        ))}
        <button
          type='button'
          className='mt-4 w-full cursor-pointer rounded-md bg-brand-deep py-3 font-medium text-sm text-white tracking-wide'
        >
          Book now
        </button>
      </nav>
    </div>
  );
}

function BandShell({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <figure className='mt-8'>
      <figcaption className='mb-2'>
        <p className='font-semibold text-foreground text-sm'>{title}</p>
        <p className='mt-0.5 text-muted-foreground text-xs'>{note}</p>
      </figcaption>
      <div className='overflow-hidden rounded-xl border border-border'>{children}</div>
    </figure>
  );
}

export function ChromeVariants() {
  return (
    <section className='mx-auto mt-16 max-w-5xl px-6' data-track='chrome'>
      <p className='font-bold font-mono text-brand-700 text-xs uppercase tracking-[0.16em]'>
        Track 3 — chrome text treatment
      </p>
      <h2 className='mt-2 font-semibold font-serif text-3xl text-foreground'>
        Nav links &amp; CTA text, re-ruled
      </h2>
      <div className='mt-5 rounded-xl border border-line-soft bg-card p-5'>
        <p className='text-foreground text-sm'>
          <strong>Prototype finding F1 (root cause, measured).</strong> The unlayered{' '}
          <code>a {'{ color }'}</code> rule in <code>styles.css</code> beat every Tailwind utility,
          so nav links rendered brand-700 on ink (<strong>2.27:1 — FAIL</strong>) and every solid
          CTA label rendered brand-700 on primary (<strong>1.45:1 — FAIL</strong>) no matter what
          their classes said. The declared pairs were all AA-passing; the cascade made them fail.
          The prototype branch moves the rule into <code>@layer base</code>; the build ticket
          ratifies or reworks that edit.
        </p>
        <div className='mt-4 grid gap-2 border-line-soft border-t pt-4 sm:grid-cols-2'>
          {MEASURED.map((m) => (
            <p key={m.pair} className='font-mono text-muted-foreground text-xs'>
              <span className={m.aa ? 'text-foreground' : 'font-bold text-destructive'}>
                {m.aa ? 'AA ✓' : 'FAIL'}
              </span>{' '}
              {m.r}:1 — {m.pair}
            </p>
          ))}
        </div>
      </div>

      <BandShell
        title='As-landed (#97/#98) — the bug, reproduced'
        note='Nav links petrol-on-ink, CTA label petrol-on-petrol. This is what the owner saw.'
      >
        <ChromeAsLanded />
      </BandShell>

      <BandShell
        title='Treatment A — crisp white'
        note='Pure-white links (18.64:1), petrol hover, current page in brand-200 + underline; CTA white-on-primary, hover to 700 (5.65 → 8.22).'
      >
        <ChromeCrispWhite />
      </BandShell>

      <BandShell
        title='Treatment B — rebalanced'
        note='Links rest soft at brand-200 (13.94:1), sharpen to white on hover; current page white with a petrol tick; CTA deep petrol, wide-tracked label (10.90:1).'
      >
        <ChromeRebalanced />
      </BandShell>

      <div className='mt-8 grid gap-6 md:grid-cols-2'>
        <div>
          <p className='mb-2 font-semibold text-foreground text-sm'>Mobile panel — A</p>
          <MobilePanelA />
        </div>
        <div>
          <p className='mb-2 font-semibold text-foreground text-sm'>Mobile panel — B</p>
          <MobilePanelB />
        </div>
      </div>

      <p className='mt-6 text-muted-foreground text-xs'>
        Footer + live-page treatments inherit the winning register (the bands above are the ruling
        surface). Device screenshots of the real chrome come at the #101 gate.
      </p>
    </section>
  );
}
