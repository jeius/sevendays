import { buttonVariants } from '@sevendays/ui/components/button';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { ConfirmationCard } from '../components/booking/confirmation-card';
import { toNotFoundError } from '../lib/api-404';
import { branchNameFor, offeringNameFor } from '../lib/booking-read';
import {
  appointmentQueries,
  branchQueries,
  servicePackageQueries,
  studioServiceQueries,
} from '../lib/queries';

export const Route = createFileRoute('/booking/$id')({
  loader: async ({ params, context: { queryClient } }) => {
    // The appointment read gates the 404; the catalog reads feed the name
    // joins. Only the appointment's 404 maps to not-found — the catalog
    // reads are lists with no 404 path, so their failures pass through to
    // the error boundary untouched.
    const catalogPromise = Promise.all([
      queryClient.ensureQueryData(branchQueries.all()),
      queryClient.ensureQueryData(servicePackageQueries.all()),
      queryClient.ensureQueryData(studioServiceQueries.all()),
    ]);
    try {
      const record = await queryClient.ensureQueryData(appointmentQueries.byId(params.id));
      await catalogPromise;
      return record;
    } catch (err) {
      throw toNotFoundError(err);
    }
  },
  component: BookingConfirmation,
  // Unknown id → uniform not-found (copy veto-flagged at PR review). The
  // plain anchor's dependency-free posture ends here — the state wears the
  // system card like the package not-found (#98 precedent); the literals
  // are CDP-asserted and byte-identical.
  notFoundComponent: () => (
    <div className='mx-auto max-w-5xl px-6'>
      <div className='mt-16 flex flex-col items-center gap-4 rounded-xl border border-brand-gray-cool bg-card p-10 text-center shadow-sm'>
        <h1 className='text-brand-ink font-semibold text-2xl'>Booking not found.</h1>
        <p className='text-muted-text text-sm'>
          This booking doesn't exist or is no longer available.
        </p>
        <Link
          to='/book'
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'focus-visible:ring-brand-focus-ring focus-visible:ring-3'
          )}
        >
          Start a new booking
        </Link>
      </div>
    </div>
  ),
});

function BookingConfirmation() {
  const record = Route.useLoaderData();
  const { data: branches } = useSuspenseQuery(branchQueries.all());
  const { data: packages } = useSuspenseQuery(servicePackageQueries.all());
  const { data: services } = useSuspenseQuery(studioServiceQueries.all());

  return (
    <div className='mx-auto max-w-5xl px-6 py-12'>
      <ConfirmationCard
        record={record}
        branchName={branchNameFor(record, branches)}
        offeringName={offeringNameFor(record, { packages, services })}
      />
    </div>
  );
}
