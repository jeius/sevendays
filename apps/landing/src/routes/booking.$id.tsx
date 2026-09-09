import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { SiteHeader } from '../components/site-header';
import { toNotFoundError } from '../lib/api-404';
import { branchNameFor, confirmationTotalCents, offeringNameFor } from '../lib/booking-read';
import { peso, phDateTime } from '../lib/format';
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
  // Unknown id → uniform not-found (copy veto-flagged at PR review).
  notFoundComponent: () => (
    <div className='mx-auto max-w-5xl p-6'>
      <SiteHeader />
      <div className='mt-16 flex flex-col items-center gap-4'>
        <h1 className='font-semibold text-2xl'>Booking not found.</h1>
        {/* Plain anchor: keeps the not-found page dependency-free. */}
        <a href='/book' className='underline'>
          Start a new booking
        </a>
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
    <div className='mx-auto max-w-5xl p-6'>
      <SiteHeader />
      <div className='mx-auto mt-8 max-w-lg rounded-xl border p-6'>
        <p className='font-semibold text-lg'>Booking confirmed ✓</p>
        <dl className='mt-4 space-y-2 text-sm'>
          <div className='flex justify-between gap-4'>
            <dt className='text-muted-foreground'>Confirmation #</dt>
            <dd className='font-mono'>{record.id}</dd>
          </div>
          <div className='flex justify-between gap-4'>
            <dt className='text-muted-foreground'>Branch</dt>
            <dd>{branchNameFor(record, branches)}</dd>
          </div>
          <div className='flex justify-between gap-4'>
            <dt className='text-muted-foreground'>Booking</dt>
            <dd>{offeringNameFor(record, { packages, services })}</dd>
          </div>
          {record.addonServices.map((a) => (
            <div key={a.addonServiceId} className='flex justify-between gap-4'>
              <dt className='text-muted-foreground'>Add-on</dt>
              <dd>
                {a.name} · {peso(a.priceCents)}
              </dd>
            </div>
          ))}
          <div className='flex justify-between gap-4'>
            <dt className='text-muted-foreground'>Schedule</dt>
            <dd>{phDateTime(record.scheduledAt.toISOString())} (PHT)</dd>
          </div>
          <div className='flex justify-between gap-4 border-t pt-2 font-semibold'>
            <dt>Total</dt>
            <dd>{peso(confirmationTotalCents(record))}</dd>
          </div>
        </dl>
        <p className='mt-4 text-sm'>A confirmation email was sent to {record.customerEmail}.</p>
        <p className='mt-1 text-muted-foreground text-sm'>
          Need to change something? Call the branch.
        </p>
      </div>
    </div>
  );
}
