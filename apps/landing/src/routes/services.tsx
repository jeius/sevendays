import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { ServiceCard } from '../components/service-card';
import { SiteHeader } from '../components/site-header';
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
    <div className='mx-auto max-w-5xl p-6'>
      <SiteHeader />
      <h1 className='mt-10 font-bold text-4xl'>Services</h1>
      <p className='mt-2 text-neutral-700'>
        Looking for add-ons? Makeup, hairstyle, and more can attach to your booking.
      </p>
      <div className='mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2'>
        {services.map((s) => (
          <ServiceCard key={s.id} service={s} branchNames={bookableBranchNames(s, branches)} />
        ))}
      </div>
    </div>
  );
}
