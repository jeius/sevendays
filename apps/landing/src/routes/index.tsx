import { buttonVariants } from '@sevendays/ui/components/button';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { BranchStripItem } from '../components/branch-strip-item';
import { PackageCard } from '../components/package-card';
import { ServiceTeaserItem } from '../components/service-teaser-item';
import { selectFeaturedPackages } from '../lib/featured';
import { branchQueries, servicePackageQueries, studioServiceQueries } from '../lib/queries';

export const Route = createFileRoute('/')({
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
  const { data: packages } = useSuspenseQuery(servicePackageQueries.all());
  const { data: services } = useSuspenseQuery(studioServiceQueries.all());
  const { data: branches } = useSuspenseQuery(branchQueries.all());
  const { heading, packages: strip } = selectFeaturedPackages(packages);

  return (
    <div>
      <section className='mx-auto flex max-w-5xl flex-col items-start gap-4 px-6 pt-12'>
        <h1 className='font-bold text-5xl'>Sevendays Photography</h1>
        {/* v1's ruled call-forward hero CTAs, re-skinned onto the system button; #98 rebuilds this zone. */}
        <div className='flex flex-wrap gap-4'>
          <Link to='/branches' className={buttonVariants({ size: 'lg' })}>
            Call Us
          </Link>
          <Link to='/services' className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            Services
          </Link>
        </div>
      </section>
      {/* TODO(owner-copy): placeholder blurb — replaced when the client supplies copy. */}
      <p className='mx-auto mt-8 max-w-5xl px-6 text-muted-foreground'>
        Our studio blurb is coming soon.
      </p>
      <section
        className='mx-auto mt-12 max-w-5xl border-t border-line-soft px-6 pt-12'
        data-strip='featured'
      >
        <h2 className='font-semibold text-2xl'>{heading}</h2>
        <div className='mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {strip.map((p) => (
            <PackageCard key={p.id} pkg={p} />
          ))}
        </div>
      </section>
      <section
        className='mx-auto mt-12 max-w-5xl border-t border-line-soft px-6 pt-12'
        data-strip='services'
      >
        <h2 className='font-semibold text-2xl'>Our services</h2>
        <div className='mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {services.map((s) => (
            <ServiceTeaserItem key={s.id} service={s} />
          ))}
        </div>
        {/* Plain anchor (renders the href the CDP check reads); #98 sweeps to typed Links. */}
        <a href='/services' className='mt-4 inline-block underline'>
          View all services
        </a>
      </section>
      <section
        className='mx-auto mt-12 max-w-5xl border-t border-line-soft px-6 pt-12'
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
        className='mt-12 border-t border-line-soft bg-brand-gray-light'
        data-strip='call-visit'
      >
        <div className='mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 px-6 py-8 md:flex-row md:items-center'>
          <div>
            <h2 className='text-brand-ink font-semibold text-xl'>Not sure which session fits?</h2>
            <p className='text-brand-700 mt-1 text-sm'>
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
