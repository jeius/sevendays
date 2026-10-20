import { buttonVariants } from '@sevendays/ui/components/button';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useLocation } from '@tanstack/react-router';
import { cn } from 'cn';
import { PackageCard } from '../../components/package-card';
import { isEmptyJudgingParam } from '../../lib/empty-override';
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
  // The ?empty=1 judging aid (M7 #223, #164 Round 5's mechanism): DEV-gated
  // — production builds answer false by construction, so the aid never
  // ships. The hooks run unconditionally (rules of hooks); the gate
  // renders after them.
  const isEmpty = isEmptyJudgingParam(import.meta.env.DEV, useLocation().searchStr);
  // The API serves only ACTIVE packages here; inactive are invisible
  // (landing CONTEXT.md: Deactivated (Service Package)).
  const { data: packages } = useSuspenseQuery(servicePackageQueries.all());

  if (isEmpty || packages.length === 0) {
    // The ruled whole-page empty line (#164 Round 5): the M5 line + the
    // Back-to-home outline CTA.
    return (
      <div className='mx-auto max-w-5xl px-6 py-12'>
        <h1 className='font-bold font-serif text-4xl text-foreground'>Packages</h1>
        {/* TODO(owner-copy): packages empty-state line — the round ratifies. */}
        <p className='text-muted-foreground mt-6'>
          No packages to show right now — check back soon.
        </p>
        <Link
          to='/'
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'focus-visible:ring-3 focus-visible:ring-brand-focus-ring'
          )}
        >
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div>
      <section className='mx-auto max-w-5xl px-6 pt-12'>
        <h1 className='font-bold font-serif text-4xl text-foreground'>Packages</h1>
        <div className='mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {packages.map((p) => (
            <PackageCard key={p.id} pkg={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
