import { buttonVariants } from '@sevendays/ui/components/button';
import { Input } from '@sevendays/ui/components/input';
import { Label } from '@sevendays/ui/components/label';
import { Textarea } from '@sevendays/ui/components/textarea';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { cn } from 'cn';
import { useState } from 'react';
import { z } from 'zod';
import { ChoiceCard } from '../components/booking/choice-card';
import { HourChipGrid } from '../components/booking/hour-chip-grid';
import { RejectionCard } from '../components/booking/rejection-card';
import { StepProgress } from '../components/booking/step-progress';
import { SummaryRail } from '../components/booking/summary-rail';
import { WalkInBadge } from '../components/walk-in-badge';
import { createAppointment } from '../lib/api.functions';
import {
  contactFieldErrors,
  contactSchema,
  phDateInputMin,
  type RejectionReason,
  useBookingWizard,
} from '../lib/booking';
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
  // Inline Zod errors (#58 ruling): a field shows its message only after the
  // customer blurs it still-invalid — display-only state, never part of the
  // gate. The gate itself is the M2 predicate restated as contactSchema
  // (booking-contact.test.ts pins the equivalence).
  const [touched, setTouched] = useState({ name: false, email: false, phone: false });

  async function handleSubmit() {
    setRejection(null);
    const result = await wizard.submit();
    if (result.ok) {
      navigate({ to: '/booking/$id', params: { id: result.appointmentId } });
    } else {
      setRejection(result.rejection);
    }
  }

  const contactFields = {
    name: wizard.name,
    email: wizard.email,
    phone: wizard.phone,
    notes: wizard.notes,
  };
  const canConfirm =
    wizard.branchId !== null &&
    wizard.offering !== null &&
    wizard.scheduledAt !== null &&
    contactSchema.safeParse(contactFields).success;
  const contactErrors = contactFieldErrors(contactFields);

  return (
    <div className='mx-auto max-w-5xl px-6 py-12'>
      {/* Position frozen (M2): the bar sits above the rail grid, full
          container width. */}
      <StepProgress step={wizard.step} className='mt-6' />
      {/* Layout frozen (M2): 1fr + 16rem rail. The step content moves onto
          the white card (#92 atmosphere) — which also puts every
          destructive-bearing text (past hint, inline errors, rejection
          card) on a card surface per the spec placement rule. */}
      <div className='mt-6 grid gap-8 md:grid-cols-[1fr_16rem]'>
        <div className='rounded-xl border border-brand-gray-cool bg-card p-6 shadow-sm'>
          {wizard.step > 1 && (
            <button
              type='button'
              data-back
              onClick={wizard.goBack}
              className='text-muted-foreground mb-4 text-sm underline'
            >
              ← Back
            </button>
          )}
          <h2 className='text-brand-ink font-bold text-2xl'>{QUESTIONS[wizard.step - 1]}</h2>

          {wizard.step === 1 && (
            <section data-step='1' className='mt-5 grid gap-3 sm:grid-cols-2'>
              {wizard.branchChoices.map((b) => (
                <ChoiceCard
                  key={b.id}
                  selected={wizard.branchId === b.id}
                  onSelect={() => {
                    wizard.setBranch(b.id);
                    wizard.goNext();
                  }}
                >
                  <span className='text-brand-ink block font-semibold'>{b.name}</span>
                  <span className='text-muted-foreground mt-1 block text-sm'>{b.address}</span>
                  <span className='mt-2 block'>
                    <WalkInBadge acceptsWalkIns={b.acceptsWalkIns} />
                  </span>
                </ChoiceCard>
              ))}
            </section>
          )}

          {wizard.step === 2 && (
            <section data-step='2' className='mt-5 space-y-6'>
              <div>
                <p className='text-muted-foreground text-sm font-medium'>Service Packages</p>
                <div className='mt-2 grid gap-3 sm:grid-cols-2'>
                  {packages.map((p) => (
                    <ChoiceCard
                      key={p.id}
                      offeringId={p.id}
                      selected={wizard.offering?.kind === 'package' && wizard.offering.id === p.id}
                      onSelect={() => wizard.chooseOffering({ kind: 'package', id: p.id })}
                    >
                      <span className='text-brand-ink block font-semibold'>{p.name}</span>
                      <span className='mt-1 block font-semibold'>{peso(p.priceCents)}</span>
                    </ChoiceCard>
                  ))}
                </div>
              </div>
              <div>
                <p className='text-muted-foreground text-sm font-medium'>
                  Studio Services {wizard.branchId ? `at ${wizard.branchName}` : ''}
                </p>
                {!wizard.branchId ? (
                  <p className='text-muted-foreground mt-2 text-sm'>
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
                        <ChoiceCard
                          key={s.id}
                          offeringId={s.id}
                          selected={
                            wizard.offering?.kind === 'service' && wizard.offering.id === s.id
                          }
                          onSelect={() => wizard.chooseOffering({ kind: 'service', id: s.id })}
                        >
                          <span className='text-brand-ink block font-semibold'>{s.name}</span>
                          <span className='mt-1 block font-semibold'>{peso(s.priceCents)}</span>
                        </ChoiceCard>
                      ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {wizard.step === 3 && (
            <section data-step='3' className='mt-5'>
              {wizard.applicableAddons.length === 0 ? (
                <p className='text-muted-foreground'>No add-ons apply to this booking.</p>
              ) : (
                <div className='grid gap-3 sm:grid-cols-2'>
                  {wizard.applicableAddons.map((a) => (
                    <ChoiceCard
                      key={a.id}
                      selected={wizard.addonIds.includes(a.id)}
                      onSelect={() => wizard.toggleAddon(a.id)}
                    >
                      <span className='text-brand-ink block font-semibold'>{a.name}</span>
                      <span className='text-muted-foreground mt-1 block text-sm'>
                        {a.description}
                      </span>
                      <span className='mt-1 block font-medium'>{peso(a.priceCents)}</span>
                    </ChoiceCard>
                  ))}
                </div>
              )}
              {/* Exactly one of these renders (M2 behavior) — both must stay
                  DIRECT children of the section: the e2e clicks
                  `section[data-step='3'] > button` for Continue. */}
              {wizard.addonIds.length > 0 ? (
                <button
                  type='button'
                  onClick={wizard.goNext}
                  className={cn(
                    buttonVariants(),
                    'focus-visible:ring-brand-focus-ring mt-4 focus-visible:ring-3'
                  )}
                >
                  Continue · {peso(wizard.totalCents)}
                </button>
              ) : (
                <button
                  type='button'
                  onClick={wizard.goNext}
                  className='text-muted-foreground mt-4 text-sm underline'
                >
                  Skip — no add-ons
                </button>
              )}
            </section>
          )}

          {wizard.step === 4 && (
            <section data-step='4' className='mt-5'>
              <Input
                type='date'
                value={wizard.date}
                min={phDateInputMin(new Date())}
                onChange={(e) => wizard.setDate(e.target.value)}
              />
              <HourChipGrid value={wizard.time} onSelect={wizard.setTime} />
              <p className='text-muted-foreground mt-2 text-xs'>
                All times are Philippine time (PHT, UTC+8). Bookings in the past are rejected.
              </p>
              {wizard.isPast && (
                <p data-past-hint className='text-destructive mt-2 text-sm'>
                  That time has already passed — pick a later slot.
                </p>
              )}
              {/* DIRECT child of the section — the scripts click
                  `section[data-step='4'] > button`; the chips live inside
                  HourChipGrid's wrapping div. */}
              <button
                type='button'
                disabled={wizard.scheduledAt === null}
                onClick={wizard.goNext}
                className={cn(
                  buttonVariants(),
                  'focus-visible:ring-brand-focus-ring mt-4 focus-visible:ring-3'
                )}
              >
                Continue
              </button>
            </section>
          )}

          {wizard.step === 5 && (
            <section data-step='5' className='mt-5 grid gap-3'>
              {/* Contact step (#58): plain primitives + inline Zod errors, no
                  bespoke wrapper. Labels are new copy (veto-flagged);
                  placeholders are CDP-frozen byte-for-byte. */}
              <div className='grid gap-1.5'>
                <Label htmlFor='contact-name'>Full name</Label>
                <Input
                  id='contact-name'
                  placeholder='Full name'
                  value={wizard.name}
                  aria-invalid={touched.name && contactErrors.name !== undefined}
                  aria-describedby={
                    touched.name && contactErrors.name ? 'contact-name-error' : undefined
                  }
                  onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                  onChange={(e) => wizard.setName(e.target.value)}
                />
                {touched.name && contactErrors.name && (
                  <p id='contact-name-error' className='text-destructive text-sm'>
                    {contactErrors.name}
                  </p>
                )}
              </div>
              <div className='grid gap-1.5'>
                <Label htmlFor='contact-email'>Email</Label>
                <Input
                  id='contact-email'
                  type='email'
                  placeholder='Email'
                  value={wizard.email}
                  aria-invalid={touched.email && contactErrors.email !== undefined}
                  aria-describedby={
                    touched.email && contactErrors.email ? 'contact-email-error' : undefined
                  }
                  onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                  onChange={(e) => wizard.setEmail(e.target.value)}
                />
                {touched.email && contactErrors.email && (
                  <p id='contact-email-error' className='text-destructive text-sm'>
                    {contactErrors.email}
                  </p>
                )}
              </div>
              <div className='grid gap-1.5'>
                <Label htmlFor='contact-phone'>Phone</Label>
                <Input
                  id='contact-phone'
                  placeholder='Phone (+63…)'
                  value={wizard.phone}
                  aria-invalid={touched.phone && contactErrors.phone !== undefined}
                  aria-describedby={
                    touched.phone && contactErrors.phone ? 'contact-phone-error' : undefined
                  }
                  onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                  onChange={(e) => wizard.setPhone(e.target.value)}
                />
                {touched.phone && contactErrors.phone && (
                  <p id='contact-phone-error' className='text-destructive text-sm'>
                    {contactErrors.phone}
                  </p>
                )}
              </div>
              <div className='grid gap-1.5'>
                <Label htmlFor='contact-notes'>Notes (optional)</Label>
                <Textarea
                  id='contact-notes'
                  placeholder='Notes (optional — tell the studio anything useful)'
                  value={wizard.notes}
                  onChange={(e) => wizard.setNotes(e.target.value)}
                />
              </div>
              {rejection && (
                <RejectionCard reason={rejection.reason} apiMessage={rejection.apiMessage} />
              )}
              <button
                type='button'
                disabled={!canConfirm || wizard.submitting}
                onClick={handleSubmit}
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'focus-visible:ring-brand-focus-ring mt-1 focus-visible:ring-3'
                )}
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
