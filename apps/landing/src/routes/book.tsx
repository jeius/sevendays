import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';
import { RejectionCard } from '../components/booking/rejection-card';
import { SummaryRail } from '../components/booking/summary-rail';
import { SiteHeader } from '../components/site-header';
import { createAppointment } from '../lib/api.functions';
import { phDateInputMin, type RejectionReason, TIME_SLOTS, useBookingWizard } from '../lib/booking';
import { peso } from '../lib/format';
import {
  addonServiceQueries,
  branchQueries,
  servicePackageQueries,
  studioServiceQueries,
} from '../lib/queries';

const searchSchema = z.object({
  branch: z.string().min(1).optional(),
  package: z.string().min(1).optional(),
  service: z.string().min(1).optional(),
});

export const Route = createFileRoute('/book')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(branchQueries.all()),
      queryClient.ensureQueryData(servicePackageQueries.all()),
      queryClient.ensureQueryData(studioServiceQueries.all()),
      queryClient.ensureQueryData(addonServiceQueries.all()),
    ]);
  },
  component: BookPage,
});

const QUESTIONS = [
  'Where would you like to book?',
  'What are you booking?',
  'Any add-ons? (optional)',
  'When? (Philippine time)',
  'Last — your details',
];

function BookPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { data: branches } = useSuspenseQuery(branchQueries.all());
  const { data: packages } = useSuspenseQuery(servicePackageQueries.all());
  const { data: services } = useSuspenseQuery(studioServiceQueries.all());
  const { data: addons } = useSuspenseQuery(addonServiceQueries.all());

  const wizard = useBookingWizard(search, {
    catalog: { branches, packages, services, addons },
    createAppointment: (args) => createAppointment({ data: args }),
  });
  const [rejection, setRejection] = useState<{
    reason: RejectionReason;
    apiMessage: string;
  } | null>(null);

  async function handleSubmit() {
    setRejection(null);
    const result = await wizard.submit();
    if (result.ok) {
      navigate({ to: '/booking/$id', params: { id: result.appointmentId } });
    } else {
      setRejection(result.rejection);
    }
  }

  const canConfirm =
    wizard.branchId !== null &&
    wizard.offering !== null &&
    wizard.scheduledAt !== null &&
    wizard.name.trim() !== '' &&
    wizard.email.trim() !== '' &&
    wizard.phone.trim() !== '';

  return (
    <div className='mx-auto min-h-screen max-w-4xl p-6'>
      <SiteHeader />
      <div className='mt-6 h-1.5 rounded-full bg-neutral-200'>
        <div
          className='h-full rounded-full bg-neutral-900 transition-all'
          style={{ width: `${(wizard.step / 5) * 100}%` }}
        />
      </div>
      <div className='mt-6 grid gap-8 md:grid-cols-[1fr_16rem]'>
        <div>
          {wizard.step > 1 && (
            <button
              type='button'
              data-back
              onClick={wizard.goBack}
              className='mb-4 text-neutral-500 text-sm underline'
            >
              ← Back
            </button>
          )}
          <h2 className='font-bold text-2xl'>{QUESTIONS[wizard.step - 1]}</h2>

          {wizard.step === 1 && (
            <section data-step='1' className='mt-5 grid gap-3 sm:grid-cols-2'>
              {wizard.branchChoices.map((b) => (
                <button
                  key={b.id}
                  type='button'
                  onClick={() => {
                    wizard.setBranch(b.id);
                    wizard.goNext();
                  }}
                  className={`rounded-xl border p-4 text-left ${
                    wizard.branchId === b.id ? 'border-neutral-900 ring-2 ring-neutral-900' : ''
                  }`}
                >
                  <span className='font-semibold'>{b.name}</span>
                  <span className='mt-1 block text-neutral-500 text-sm'>{b.address}</span>
                  <span className='mt-2 block'>
                    <span className='rounded-full border px-2 py-0.5 text-xs'>
                      {b.acceptsWalkIns ? 'Walk-ins welcome' : 'No walk-ins'}
                    </span>
                  </span>
                </button>
              ))}
            </section>
          )}

          {wizard.step === 2 && (
            <section data-step='2' className='mt-5 space-y-6'>
              <div>
                <p className='font-medium text-neutral-500 text-sm'>Service Packages</p>
                <div className='mt-2 grid gap-3 sm:grid-cols-2'>
                  {packages.map((p) => (
                    <button
                      key={p.id}
                      type='button'
                      data-offering={p.id}
                      onClick={() => wizard.chooseOffering({ kind: 'package', id: p.id })}
                      className={`rounded-xl border p-4 text-left ${
                        wizard.offering?.kind === 'package' && wizard.offering.id === p.id
                          ? 'border-neutral-900 ring-2 ring-neutral-900'
                          : ''
                      }`}
                    >
                      <span className='font-semibold'>{p.name}</span>
                      <span className='mt-1 block font-semibold'>{peso(p.priceCents)}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className='font-medium text-neutral-500 text-sm'>
                  Studio Services {wizard.branchId ? `at ${wizard.branchName}` : ''}
                </p>
                {!wizard.branchId ? (
                  <p className='mt-2 text-neutral-500 text-sm'>
                    Choose a branch first — services are bookable per branch.
                  </p>
                ) : (
                  <div className='mt-2 grid gap-3 sm:grid-cols-2'>
                    {services
                      .filter(
                        (s) =>
                          wizard.branchId !== null && s.bookableBranchIds.includes(wizard.branchId)
                      )
                      .map((s) => (
                        <button
                          key={s.id}
                          type='button'
                          data-offering={s.id}
                          onClick={() => wizard.chooseOffering({ kind: 'service', id: s.id })}
                          className={`rounded-xl border p-4 text-left ${
                            wizard.offering?.kind === 'service' && wizard.offering.id === s.id
                              ? 'border-neutral-900 ring-2 ring-neutral-900'
                              : ''
                          }`}
                        >
                          <span className='font-semibold'>{s.name}</span>
                          <span className='mt-1 block font-semibold'>{peso(s.priceCents)}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {wizard.step === 3 && (
            <section data-step='3' className='mt-5'>
              {wizard.applicableAddons.length === 0 ? (
                <p className='text-neutral-500'>No add-ons apply to this booking.</p>
              ) : (
                <div className='grid gap-3 sm:grid-cols-2'>
                  {wizard.applicableAddons.map((a) => (
                    <button
                      key={a.id}
                      type='button'
                      onClick={() => wizard.toggleAddon(a.id)}
                      className={`rounded-xl border p-4 text-left ${
                        wizard.addonIds.includes(a.id)
                          ? 'border-neutral-900 ring-2 ring-neutral-900'
                          : ''
                      }`}
                    >
                      <span className='font-semibold'>{a.name}</span>
                      <span className='mt-1 block text-neutral-500 text-sm'>{a.description}</span>
                      <span className='mt-1 block font-medium'>{peso(a.priceCents)}</span>
                    </button>
                  ))}
                </div>
              )}
              {wizard.addonIds.length > 0 ? (
                <button
                  type='button'
                  onClick={wizard.goNext}
                  className='mt-4 rounded-md bg-neutral-900 px-4 py-2 text-primary-foreground text-sm text-white'
                >
                  Continue · {peso(wizard.totalCents)}
                </button>
              ) : (
                <button
                  type='button'
                  onClick={wizard.goNext}
                  className='mt-4 text-neutral-500 text-sm underline'
                >
                  Skip — no add-ons
                </button>
              )}
            </section>
          )}

          {wizard.step === 4 && (
            <section data-step='4' className='mt-5'>
              <input
                type='date'
                className='rounded-md border px-3 py-2'
                value={wizard.date}
                min={phDateInputMin(new Date())}
                onChange={(e) => wizard.setDate(e.target.value)}
              />
              <div className='mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5'>
                {TIME_SLOTS.map((t) => (
                  <button
                    key={t}
                    type='button'
                    onClick={() => wizard.setTime(t)}
                    className={`rounded-lg border px-2 py-2 text-sm ${
                      wizard.time === t ? 'border-neutral-900 bg-neutral-900 text-white' : ''
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <p className='mt-2 text-neutral-500 text-xs'>
                All times are Philippine time (PHT, UTC+8). Bookings in the past are rejected.
              </p>
              {wizard.isPast && (
                <p data-past-hint className='mt-2 text-destructive text-sm'>
                  That time has already passed — pick a later slot.
                </p>
              )}
              <button
                type='button'
                disabled={wizard.scheduledAt === null}
                onClick={wizard.goNext}
                className='mt-4 rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50'
              >
                Continue
              </button>
            </section>
          )}

          {wizard.step === 5 && (
            <section data-step='5' className='mt-5 grid gap-3'>
              <input
                className='rounded-md border px-3 py-2'
                placeholder='Full name'
                value={wizard.name}
                onChange={(e) => wizard.setName(e.target.value)}
              />
              <input
                className='rounded-md border px-3 py-2'
                placeholder='Email'
                type='email'
                value={wizard.email}
                onChange={(e) => wizard.setEmail(e.target.value)}
              />
              <input
                className='rounded-md border px-3 py-2'
                placeholder='Phone (+63…)'
                value={wizard.phone}
                onChange={(e) => wizard.setPhone(e.target.value)}
              />
              <textarea
                className='rounded-md border px-3 py-2'
                placeholder='Notes (optional — tell the studio anything useful)'
                value={wizard.notes}
                onChange={(e) => wizard.setNotes(e.target.value)}
              />
              {rejection && (
                <RejectionCard reason={rejection.reason} apiMessage={rejection.apiMessage} />
              )}
              <button
                type='button'
                disabled={!canConfirm || wizard.submitting}
                onClick={handleSubmit}
                className='mt-1 rounded-md bg-neutral-900 px-4 py-3 font-medium text-white disabled:opacity-50'
              >
                {wizard.submitting ? 'Booking…' : `Confirm booking · ${peso(wizard.totalCents)}`}
              </button>
            </section>
          )}
        </div>

        <SummaryRail wizard={wizard} />
      </div>
    </div>
  );
}
