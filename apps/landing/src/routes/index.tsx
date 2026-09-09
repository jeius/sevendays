import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { BranchStripItem } from '../components/branch-strip-item';
import { PackageCard } from '../components/package-card';
import { ServiceTeaserItem } from '../components/service-teaser-item';
import { SiteHeader } from '../components/site-header';
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
    <div className='mx-auto max-w-5xl p-6'>
      <SiteHeader />
      <section className='mt-10 flex flex-col gap-4'>
        <h1 className='font-bold text-5xl'>Sevendays Photography</h1>
        <Link
          to='/book'
          className='rounded-md bg-neutral-900 px-6 py-3 text-center text-white text-xl'
        >
          Book now
        </Link>
      </section>
      {/* TODO(owner-copy): placeholder blurb — replaced when the client supplies copy. */}
      <p className='mt-8 text-neutral-700'>Our studio blurb is coming soon.</p>
      <section className='mt-12' data-strip='featured'>
        <h2 className='font-semibold text-2xl'>{heading}</h2>
        <div className='mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {strip.map((p) => (
            <PackageCard key={p.id} pkg={p} />
          ))}
        </div>
      </section>
      <section className='mt-12' data-strip='services'>
        <h2 className='font-semibold text-2xl'>Our services</h2>
        <div className='mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {services.map((s) => (
            <ServiceTeaserItem key={s.id} service={s} />
          ))}
        </div>
        {/* Plain anchor: /services exists as of this ticket. */}
        <a href='/services' className='mt-4 inline-block underline'>
          View all services
        </a>
      </section>
      <section className='mt-12' data-strip='branches'>
        <h2 className='font-semibold text-2xl'>Our branches</h2>
        <div className='mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {branches.map((b) => (
            <BranchStripItem key={b.id} branch={b} />
          ))}
        </div>
      </section>
    </div>
  );
}
