import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
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
