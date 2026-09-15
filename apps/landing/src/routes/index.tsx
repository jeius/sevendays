import type {
  Branch,
  ServicePackageWithInclusions,
  StudioServiceWithBranches,
} from '@sevendays/types';
import { buttonVariants } from '@sevendays/ui/components/button';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { z } from 'zod';
import { BranchStripItem } from '../components/branch-strip-item';
import { PackageCard } from '../components/package-card';
import { HomeVariantA } from '../components/prototype/home-variant-a';
import { HomeVariantB } from '../components/prototype/home-variant-b';
import { DevOnlySwitcher } from '../components/prototype/prototype-switcher';
import { ServiceTeaserItem } from '../components/service-teaser-item';
import { selectFeaturedPackages } from '../lib/featured';
import { branchQueries, servicePackageQueries, studioServiceQueries } from '../lib/queries';

// PROTOTYPE (#111): the default route renders exactly as landed (#98 — the
// CDP seam contract holds: same URL, seams verbatim, scripts read-only).
// `?variant=a|b` renders the two image-led home compositions (Track 1);
// the param is validated by validateSearch, the render swap is dev-only,
// and the switcher bar never ships outside dev builds.

const variantSearchSchema = z.object({
  variant: z.enum(['a', 'b']).optional(),
});

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => variantSearchSchema.parse(search),
  // Prefetch during SSR/navigation; useSuspenseQuery below reads the cache.
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(servicePackageQueries.all()),
      queryClient.ensureQueryData(studioServiceQueries.all()),
      queryClient.ensureQueryData(branchQueries.all()),
    ]);
  },
  component: Home,
});

function Home() {
  const { variant } = Route.useSearch();
  const { data: packages } = useSuspenseQuery(servicePackageQueries.all());
  const { data: services } = useSuspenseQuery(studioServiceQueries.all());
  const { data: branches } = useSuspenseQuery(branchQueries.all());

  const devVariant = import.meta.env.DEV ? variant : undefined;
  const data = { packages, services, branches };

  return (
    <>
      {devVariant === 'a' && <HomeVariantA packages={data.packages} services={data.services} />}
      {devVariant === 'b' && <HomeVariantB packages={data.packages} services={data.services} />}
      {!devVariant && (
        <HomeCurrent packages={data.packages} services={data.services} branches={data.branches} />
      )}
      <DevOnlySwitcher
        current={devVariant ?? 'base'}
        variants={[
          { key: 'base', name: '#98 composition' },
          { key: 'a', name: 'Cinema' },
          { key: 'b', name: 'Editorial mat' },
        ]}
      />
    </>
  );
}

// The as-landed #98 home, byte-for-byte in markup (only the data plumbing
// moves to props — the queries still run + the loader still prefetches).
function HomeCurrent({
  packages,
  services,
  branches,
}: {
  packages: ServicePackageWithInclusions[];
  services: StudioServiceWithBranches[];
  branches: Branch[];
}) {
  const { heading, packages: strip } = selectFeaturedPackages(packages);
  return (
    <div>
      {/* Hero band — the ruled #92 composition (data-92-comp-body), sans
          headings per the #94 ruling. Blurb slot stays placeholder-marked;
          the literal is CDP-asserted (content-pages). Secondary CTA is
          system-styled; the v1 scrub swaps BOTH CTAs for "Call Us" +
          "Services" at pick time — never a runtime branch (the #97
          convention, mobile-nav.tsx). */}
      <section className='border-line-soft border-b'>
        <div className='mx-auto max-w-5xl px-6 py-12'>
          <div className='rounded-xl border border-brand-gray-cool bg-card p-8 shadow-sm'>
            <p className='font-bold font-mono text-brand-700 text-xs uppercase tracking-[0.16em]'>
              Sevendays Photography
            </p>
            <h1 className='mt-3 max-w-2xl font-bold text-4xl text-brand-ink'>
              Three branches. One standard of light.
            </h1>
            {/* TODO(owner-copy): placeholder blurb — replaced when the client supplies copy. */}
            <p className='mt-3 max-w-prose text-muted-text'>Our studio blurb is coming soon.</p>
            <div className='mt-5 flex flex-wrap gap-3'>
              <Link
                to='/book'
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
                )}
              >
                Book now
              </Link>
              <Link
                to='/services'
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
                )}
              >
                View services
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section
        className='mx-auto mt-12 max-w-5xl border-line-soft border-t px-6 pt-12'
        data-strip='featured'
      >
        <h2 className='font-semibold text-2xl'>{heading}</h2>
        <div className='mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {strip.map((p) => (
            <PackageCard key={p.id} pkg={p} cta='card' />
          ))}
        </div>
      </section>
      <section
        className='mx-auto mt-12 max-w-5xl border-line-soft border-t px-6 pt-12'
        data-strip='services'
      >
        <h2 className='font-semibold text-2xl'>Our services</h2>
        <div className='mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {services.map((s) => (
            <ServiceTeaserItem key={s.id} service={s} />
          ))}
        </div>
        <Link to='/services' className='mt-4 inline-block text-brand-700 underline'>
          View all services
        </Link>
      </section>
      <section
        className='mx-auto mt-12 max-w-5xl border-line-soft border-t px-6 pt-12'
        data-strip='branches'
      >
        <h2 className='font-semibold text-2xl'>Our branches</h2>
        <div className='mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {branches.map((b) => (
            <BranchStripItem key={b.id} branch={b} />
          ))}
        </div>
      </section>
      {/* Emphasis strip — gray-light's one remaining job per the #92 composition: the closing call-or-visit band. New seam value; no M2 script asserts it. Copy is the owner-approved mock's. */}
      <section
        className='mt-12 border-line-soft border-t bg-brand-gray-light'
        data-strip='call-visit'
      >
        <div className='mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 px-6 py-8 md:flex-row md:items-center'>
          <div>
            <h2 className='font-semibold text-brand-ink text-xl'>Not sure which session fits?</h2>
            <p className='mt-1 text-brand-700 text-sm'>
              Call or visit a branch — we will help you choose.
            </p>
          </div>
          <Link
            to='/branches'
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
            )}
          >
            Find a branch
          </Link>
        </div>
      </section>
    </div>
  );
}
