import { buttonVariants } from '@sevendays/ui/components/button';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { ServiceCard } from '../components/service-card';
import { bookableBranchNames } from '../lib/bookable-branches';
import { branchQueries, studioServiceQueries } from '../lib/queries';

export const Route = createFileRoute('/services')({
  head: () => ({ meta: [{ title: 'Services | Sevendays Photography' }] }),
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(studioServiceQueries.all()),
      queryClient.ensureQueryData(branchQueries.all()),
    ]);
  },
  component: ServicesPage,
});

function ServicesPage() {
  const { data: services } = useSuspenseQuery(studioServiceQueries.all());
  const { data: branches } = useSuspenseQuery(branchQueries.all());

  return (
    <div>
      <section className='mx-auto max-w-5xl px-6 pt-12'>
        <h1 className='font-bold text-4xl text-brand-ink'>Services</h1>
        <p className='mt-2 max-w-prose text-muted-foreground'>
          Looking for add-ons? Makeup, hairstyle, and more are available with any session.
        </p>
        <div className='mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {services.map((s) => (
            <ServiceCard key={s.id} service={s} branchNames={bookableBranchNames(s, branches)} />
          ))}
        </div>
      </section>
      {/* Closing call-or-visit strip (#60 ruling) — the #97 emphasis-strip
          pattern; new seam value, asserted by no script. Call-or-visit
          flavored: no booking presupposition on either edition. */}
      <section
        className='mt-12 border-line-soft border-t bg-brand-gray-light'
        data-strip='call-visit'
      >
        <div className='mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 px-6 py-8 md:flex-row md:items-center'>
          <div>
            <h2 className='font-semibold text-brand-ink text-xl'>
              Need a service at one of our branches?
            </h2>
            <p className='mt-1 text-brand-700 text-sm'>
              Call or visit a branch — we will confirm availability.
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
