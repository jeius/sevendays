import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { PackageCard } from '../components/package-card';
import { SiteHeader } from '../components/site-header';
import { selectFeaturedPackages } from '../lib/featured';
import { servicePackageQueries } from '../lib/queries';

export const Route = createFileRoute('/')({
  // Prefetch during SSR/navigation; useSuspenseQuery below reads the cache.
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(servicePackageQueries.all());
  },
  component: Home,
});

function Home() {
  const { data: packages } = useSuspenseQuery(servicePackageQueries.all());
  const { heading, packages: strip } = selectFeaturedPackages(packages);

  return (
    <div className='mx-auto max-w-5xl p-6'>
      <SiteHeader />
      <section className='mt-10 flex flex-col gap-4'>
        <h1 className='font-bold text-5xl'>Sevendays Photography</h1>
        {/* Plain anchor: /book arrives with ticket #45. */}
        <a
          href='/book'
          className='rounded-md bg-neutral-900 px-6 py-3 text-center text-white text-xl'
        >
          Book now
        </a>
      </section>
      <section className='mt-12'>
        <h2 className='font-semibold text-2xl'>{heading}</h2>
        <div className='mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {strip.map((p) => (
            <PackageCard key={p.id} pkg={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
