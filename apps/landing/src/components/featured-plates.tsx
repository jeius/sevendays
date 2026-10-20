import type { ServicePackageRead } from '@sevendays/types';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { peso } from '../lib/format';
import { CoverPanel } from './cover-panel';
import { inclusionPhrase } from './inclusions-list';

// The featured strip, OWNER-RULED D2 "light split plate" (#164 Round 2 —
// "I think I'll go with D2"): the cover is 60% of the plate at natural
// quality (no overlay touches it — the CoverPanel law renders the muted
// placeholder when a row has no cover), the light panel carries serif
// name, mono peso (nothing when unpriced — the #163 law), a subline, and
// dotted inclusion lines; short PRIMARY ticks separate the plates. The
// losing variants (rate card, editorial index, plate+lineup, ink panel,
// the retired parallax) stay on the prototype branch — nothing merges.

function subline(p: ServicePackageRead): string {
  const mins = p.durationMinutes;
  const incls = p.inclusions.length;
  return [mins != null ? `${mins} min` : null, `${incls} inclusion${incls === 1 ? '' : 's'}`]
    .filter(Boolean)
    .join(' · ');
}

export function FeaturedPlates({
  heading,
  strip,
}: {
  heading: string;
  strip: ServicePackageRead[];
}) {
  return (
    <section className='mx-auto max-w-5xl px-6 pt-16' data-strip='featured'>
      {/* One voice per section (owner ruling): the serif heading alone. */}
      <h2 className='font-semibold font-serif text-3xl text-brand-ink dark:text-foreground'>
        {heading}
      </h2>
      <div className='pt-8 pb-16'>
        {strip.map((p, i) => {
          const flip = i % 2 === 1;
          const shown = p.inclusions.slice(0, 4);
          const more = p.inclusions.length - shown.length;
          return (
            <div key={p.id}>
              {i > 0 && (
                <div aria-hidden='true' className='flex justify-center py-8'>
                  <span className='bg-primary h-0.5 w-16 rounded-full' />
                </div>
              )}
              <Link
                to='/packages/$slug'
                params={{ slug: p.slug }}
                className='group border-line-soft bg-card grid overflow-hidden rounded-xl border shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-focus-ring md:grid-cols-5'
              >
                <div
                  className={cn(
                    'relative min-h-56 md:col-span-3 md:min-h-[22rem]',
                    flip && 'md:order-2'
                  )}
                >
                  <CoverPanel
                    name={p.name}
                    coverImageUrl={p.coverImageUrl}
                    className='absolute inset-0 size-full rounded-none object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100'
                  />
                </div>
                <div
                  className={cn(
                    'flex flex-col justify-center gap-1 p-6 md:col-span-2 md:p-8',
                    flip && 'md:order-1'
                  )}
                >
                  <h3 className='font-semibold font-serif text-2xl text-brand-ink dark:text-foreground'>
                    {p.name}
                  </h3>
                  {/* The unpriced law: peso(null) renders nothing — no
                      placeholder, no inquire line, the panel reflows. */}
                  <p className='font-mono text-brand-700 text-sm dark:text-brand-300'>
                    {peso(p.priceCents)}
                  </p>
                  <p className='text-muted-foreground text-sm'>{subline(p)}</p>
                  <ul className='mt-3 space-y-1.5'>
                    {shown.map((inc) => (
                      <li
                        key={inc.id}
                        className='text-foreground/85 flex items-center gap-2 text-sm'
                      >
                        <span className='bg-primary size-1 shrink-0 rounded-full' />
                        <span className='min-w-0'>{inclusionPhrase(inc)}</span>
                      </li>
                    ))}
                    {more > 0 && (
                      <li className='text-muted-foreground font-mono text-[11px]'>
                        +{more} more inclusion{more === 1 ? '' : 's'}
                      </li>
                    )}
                  </ul>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
