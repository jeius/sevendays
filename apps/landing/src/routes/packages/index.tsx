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
        <h1 className='font-bold font-serif text-4xl text-brand-ink'>Packages</h1>
        {packages.length === 0 ? (
          // TODO(owner-copy): packages empty-state line — replaced when the
          // client supplies copy. Text is CDP-assertable (the ⇔ rule in
          // packages-pages.mjs).
          <p className='mt-6 text-muted-foreground'>
            No packages to show right now — check back soon.
          </p>
        ) : (
          <div className='mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2'>
            {packages.map((p) => (
              <PackageCard key={p.id} pkg={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
