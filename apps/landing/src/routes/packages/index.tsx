import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { PackageCard } from '../../components/package-card';
import { servicePackageQueries } from '../../lib/queries';

export const Route = createFileRoute('/packages/')({
  head: () => ({ meta: [{ title: 'Packages | Sevendays Photography' }] }),
  // Prefetch during SSR/navigation; useSuspenseQuery below reads the cache.
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(servicePackageQueries.all());
  },
  component: PackagesPage,
});

function PackagesPage() {
  // The API serves only ACTIVE packages here; inactive are invisible
  // (landing CONTEXT.md: Deactivated (Service Package)).
  const { data: packages } = useSuspenseQuery(servicePackageQueries.all());

  return (
    <div>
      <section className='mx-auto max-w-5xl px-6 pt-12'>
        <h1 className='text-brand-ink font-bold text-4xl'>Packages</h1>
        <div className='mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {packages.map((p) => (
            <PackageCard key={p.id} pkg={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
