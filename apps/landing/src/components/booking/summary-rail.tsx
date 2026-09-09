import type { BookingWizard } from '../../lib/booking';
import { peso, phDateTime } from '../../lib/format';

export function SummaryRail({ wizard }: { wizard: BookingWizard }) {
  return (
    <aside data-summary-rail className='h-fit rounded-xl border p-4 md:sticky md:top-6'>
      <p className='font-semibold text-sm'>Your booking</p>
      <dl className='mt-3 space-y-2 text-sm'>
        <div className='flex justify-between gap-3'>
          <dt className='text-muted-foreground'>Branch</dt>
          <dd className='text-right'>{wizard.branchName}</dd>
        </div>
        <div className='flex justify-between gap-3'>
          <dt className='text-muted-foreground'>Booking</dt>
          <dd className='text-right'>{wizard.offeringName}</dd>
        </div>
        {wizard.selectedAddons.map((a) => (
          <div key={a.id} className='flex justify-between gap-3'>
            <dt className='text-muted-foreground'>Add-on</dt>
            <dd className='text-right'>
              {a.name} · {peso(a.priceCents)}
            </dd>
          </div>
        ))}
        <div className='flex justify-between gap-3'>
          <dt className='text-muted-foreground'>Schedule</dt>
          <dd className='text-right'>
            {wizard.scheduledAt ? phDateTime(wizard.scheduledAt.toISOString()) : '—'} (PHT)
          </dd>
        </div>
        <div className='flex justify-between gap-3 border-t pt-2 font-semibold'>
          <dt>Total</dt>
          <dd>{peso(wizard.totalCents)}</dd>
        </div>
      </dl>
    </aside>
  );
}
