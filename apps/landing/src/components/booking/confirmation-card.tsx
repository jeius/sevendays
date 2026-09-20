import type { AppointmentWithAddons } from '@sevendays/types';
import { confirmationTotalCents } from '../../lib/booking-read';
import { peso, phDateTime } from '../../lib/format';

// The /booking/:id snapshot read-back (#58: extracted from the confirmation
// page). Every literal is owner-pinned from the M2 prototype and asserted by
// the e2e — copy is frozen. The card renders record snapshot values only;
// names join at the route (the snapshot rule is enforced by the lib
// signatures — prices never come from the catalog).
export function ConfirmationCard({
  record,
  branchName,
  offeringName,
}: {
  record: AppointmentWithAddons;
  branchName: string;
  offeringName: string;
}) {
  return (
    <div className='mx-auto mt-8 max-w-lg rounded-xl border border-brand-gray-cool bg-card p-6 shadow-sm'>
      <p className='text-brand-ink font-semibold text-lg'>Booking confirmed ✓</p>
      <dl className='mt-4 space-y-2 text-sm'>
        <div className='flex justify-between gap-4'>
          <dt className='text-muted-foreground'>Confirmation #</dt>
          <dd className='font-mono'>{record.id}</dd>
        </div>
        <div className='flex justify-between gap-4'>
          <dt className='text-muted-foreground'>Branch</dt>
          <dd>{branchName}</dd>
        </div>
        <div className='flex justify-between gap-4'>
          <dt className='text-muted-foreground'>Booking</dt>
          <dd>{offeringName}</dd>
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
      <p className='text-muted-foreground mt-1 text-sm'>
        Need to change something? Call the branch.
      </p>
    </div>
  );
}
