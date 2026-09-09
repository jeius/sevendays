// The booking wizard's brain (issue #45, prototype variant C re-derived
// against the real schema). Every behavior is a pure function so the lib
// seam can test it; useBookingWizard only wires React state to these.
// Prototype artifacts that die here: Studio Service stubs, the name-keyed
// applicability map (the API now embeds applicableAddonServiceIds), the
// simulated past-datetime floor (the API owns it — the form renders the
// hint and the typed rejection card), and packagePriceCents (renamed
// bookedPriceCents in ticket 02; nothing here reads a snapshot — the
// pre-submit rail keeps LIVE prices, spec ruling).

import type { CreateAppointmentArgs } from '@sevendays/api-client';
import type {
  AddonService,
  Branch,
  ServicePackageWithInclusions,
  StudioServiceWithBranches,
} from '@sevendays/types';
import { useMemo, useState } from 'react';

/** One wizard read snapshot — the four reads the route loader prefetches. */
export interface BookingCatalog {
  branches: Branch[];
  packages: ServicePackageWithInclusions[];
  services: StudioServiceWithBranches[];
  addons: AddonService[];
}

export type Offering = { kind: 'package'; id: string } | { kind: 'service'; id: string } | null;

/** Deep-link contract (IA #32): ids, all optional. */
export interface BookingSearchInit {
  branch?: string;
  package?: string;
  service?: string;
}

export interface BookingDetails {
  branchId: string;
  offering: NonNullable<Offering>;
  addonIds: string[];
  scheduledAt: Date;
  name: string;
  email: string;
  phone: string;
  notes: string;
}

/** Placeholder hourly grid (prototype-verbatim; ADR-0005's M3 replaces it). */
export const TIME_SLOTS = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
] as const;

/** Today's PH wall-clock date for the date input's min (PH is UTC+8, no DST). */
export function phDateInputMin(now: Date): string {
  return new Date(now.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
}

/** PH wall-clock pick → instant (prototype verbatim). */
export function scheduledAtInstant(date: string, time: string): Date | null {
  if (!date || !time) return null;
  return new Date(`${date}T${time}:00+08:00`);
}

/** At-or-before now is past — the same boundary the API's floor enforces. */
export function isPastPick(scheduledAt: Date | null, now: Date): boolean {
  return scheduledAt !== null && scheduledAt.getTime() <= now.getTime();
}

/** Deep-link prefill: ids validate against the reads; unknown drops silently. */
export function prefillFromSearch(
  init: BookingSearchInit,
  catalog: BookingCatalog
): { branchId: string | null; offering: Offering } {
  const branchId =
    init.branch && catalog.branches.some((b) => b.id === init.branch) ? init.branch : null;
  let offering: Offering = null;
  if (init.service && catalog.services.some((s) => s.id === init.service)) {
    offering = { kind: 'service', id: init.service };
  } else if (init.package && catalog.packages.some((p) => p.id === init.package)) {
    offering = { kind: 'package', id: init.package };
  }
  return { branchId, offering };
}

/**
 * The service whose bookability filters the branch step: the chosen service
 * offering wins; otherwise a known deep-linked service filters BEFORE
 * anything is chosen (spec ruling). Unknown ids filter nothing.
 */
export function branchFilterServiceId(
  offering: Offering,
  initService: string | undefined,
  catalog: BookingCatalog
): string | null {
  if (offering?.kind === 'service') return offering.id;
  if (initService && catalog.services.some((s) => s.id === initService)) return initService;
  return null;
}

export function branchChoicesFor(catalog: BookingCatalog, serviceId: string | null): Branch[] {
  if (!serviceId) return catalog.branches;
  const svc = catalog.services.find((s) => s.id === serviceId);
  if (!svc) return catalog.branches;
  return catalog.branches.filter((b) => svc.bookableBranchIds.includes(b.id));
}

/** Packages: uniform (all active add-ons). Services: the junction matrix. */
export function applicableAddonsFor(offering: Offering, catalog: BookingCatalog): AddonService[] {
  if (!offering) return [];
  if (offering.kind === 'package') return catalog.addons;
  const svc = catalog.services.find((s) => s.id === offering.id);
  if (!svc) return [];
  const applicable = new Set(svc.applicableAddonServiceIds);
  return catalog.addons.filter((a) => applicable.has(a.id));
}

export function offeringPriceCents(offering: Offering, catalog: BookingCatalog): number {
  if (!offering) return 0;
  if (offering.kind === 'package') {
    return catalog.packages.find((p) => p.id === offering.id)?.priceCents ?? 0;
  }
  return catalog.services.find((s) => s.id === offering.id)?.priceCents ?? 0;
}

export function addonTotalCents(addonIds: string[], catalog: BookingCatalog): number {
  return addonIds.reduce(
    (sum, id) => sum + (catalog.addons.find((a) => a.id === id)?.priceCents ?? 0),
    0
  );
}

export function totalCents(
  offering: Offering,
  addonIds: string[],
  catalog: BookingCatalog
): number {
  return offeringPriceCents(offering, catalog) + addonTotalCents(addonIds, catalog);
}

/** Steps: 1 branch · 2 offering · 3 add-ons · 4 date/time · 5 contact. */
export function stepAfterOfferingChosen(applicableCount: number): 3 | 4 {
  return applicableCount > 0 ? 3 : 4;
}

export function stepBackFromDateTime(hasApplicableAddons: boolean): 2 | 3 {
  return hasApplicableAddons ? 3 : 2;
}

// ---------------------------------------------------------------------------
// Typed rejections (prototype contract): the wire carries only the API's
// module-owned message ({ error }); the reason is derived by matching that
// message. Wordings pinned from apps/api REJECTION_MESSAGES — suites assert
// them verbatim, so the match is stable.
// ---------------------------------------------------------------------------
export type RejectionReason =
  | 'past_datetime'
  | 'package_inactive'
  | 'service_inactive'
  | 'service_not_bookable_at_branch'
  | 'addon_inactive'
  | 'addon_not_applicable'
  | 'unknown';

export const REJECTION_COPY: Record<RejectionReason, string> = {
  past_datetime:
    'That date and time has already passed in the Philippines (PHT). Please pick a later slot — all times shown are Philippine time.',
  package_inactive: "That package isn't available right now. Please pick another one.",
  // Derived from the ratified package_inactive pattern (veto-flagged).
  service_inactive: "That service isn't available right now. Please pick another one.",
  service_not_bookable_at_branch:
    "That service isn't offered at the branch you picked. Please choose a different branch or service.",
  addon_inactive: "One of the add-ons isn't available right now. Please review your add-ons.",
  addon_not_applicable:
    "One of the add-ons doesn't apply to this booking. Please review your add-ons.",
  unknown: "We couldn't complete your booking. Please review your details or call the branch.",
};

const API_REASON_MAP: Array<[RegExp, RejectionReason]> = [
  [/Service Package is inactive/i, 'package_inactive'],
  [/Studio Service is inactive/i, 'service_inactive'],
  [/isn't offered at the branch/i, 'service_not_bookable_at_branch'],
  [/Add-on Service is inactive/i, 'addon_inactive'],
  [/doesn't apply to the service/i, 'addon_not_applicable'],
  [/already in the past/i, 'past_datetime'],
];

export function reasonForApiMessage(message: string): RejectionReason {
  for (const [re, reason] of API_REASON_MAP) {
    if (re.test(message)) return reason;
  }
  return 'unknown';
}

/** ApiClientError carries { error: message } in details and `API <status>: <error>` as .message. */
export function rejectionFromApiClientError(err: unknown): {
  reason: RejectionReason;
  apiMessage: string;
} {
  const details = (err as { details?: { error?: unknown } } | undefined)?.details;
  const fromDetails = typeof details?.error === 'string' ? details.error : undefined;
  const raw = (err as { message?: unknown } | undefined)?.message;
  const fromMessage = typeof raw === 'string' ? raw.replace(/^API \d+: /, '') : undefined;
  const apiMessage = fromDetails ?? fromMessage ?? '';
  return { reason: reasonForApiMessage(apiMessage), apiMessage };
}

/** Wizard state → the create wire shape (exactly-one; the server snapshots price). */
export function buildCreatePayload(details: BookingDetails): CreateAppointmentArgs {
  return {
    branchId: details.branchId,
    servicePackageId: details.offering.kind === 'package' ? details.offering.id : null,
    studioServiceId: details.offering.kind === 'service' ? details.offering.id : null,
    customerName: details.name,
    customerEmail: details.email,
    customerPhone: details.phone,
    scheduledAt: details.scheduledAt.toISOString(),
    addonServiceIds: details.addonIds,
    notes: details.notes ? details.notes : undefined,
  };
}

export type WizardSubmitResult =
  | { ok: true; appointmentId: string }
  | { ok: false; rejection: { reason: RejectionReason; apiMessage: string } };

/**
 * Thin stateful shell around the pure functions above — deliberately
 * untested (spec § Testing Decisions 5: the CDP scenario owns behavior).
 * The confirm button gates on branch + offering + schedule + the three
 * contact fields, so the submit guard is defensive only.
 */
export function useBookingWizard(
  init: BookingSearchInit,
  deps: {
    catalog: BookingCatalog;
    createAppointment: (args: CreateAppointmentArgs) => Promise<{ id: string }>;
  }
) {
  const { catalog } = deps;
  const [initial] = useState(() => prefillFromSearch(init, catalog));
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [branchId, setBranchIdState] = useState<string | null>(initial.branchId);
  const [offering, setOfferingState] = useState<Offering>(initial.offering);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filterServiceId = useMemo(
    () => branchFilterServiceId(offering, init.service, catalog),
    [offering, init.service, catalog]
  );
  const branchChoices = useMemo(
    () => branchChoicesFor(catalog, filterServiceId),
    [catalog, filterServiceId]
  );
  const applicableAddons = useMemo(
    () => applicableAddonsFor(offering, catalog),
    [offering, catalog]
  );
  const scheduledAt = useMemo(() => scheduledAtInstant(date, time), [date, time]);
  const isPast = isPastPick(scheduledAt, new Date());
  const offeringPrice = offeringPriceCents(offering, catalog);
  const total = totalCents(offering, addonIds, catalog);
  const selectedAddons = useMemo(
    () => catalog.addons.filter((a) => addonIds.includes(a.id)),
    [catalog.addons, addonIds]
  );
  const offeringName = offering
    ? offering.kind === 'package'
      ? (catalog.packages.find((p) => p.id === offering.id)?.name ?? '—')
      : (catalog.services.find((s) => s.id === offering.id)?.name ?? '—')
    : '—';
  const branchName = catalog.branches.find((b) => b.id === branchId)?.name ?? '—';

  /** A branch change that orphaned a service offering clears the offering. */
  function setBranch(id: string | null) {
    setBranchIdState(id);
    if (offering?.kind === 'service') {
      const svc = catalog.services.find((s) => s.id === offering.id);
      if (id === null || !svc?.bookableBranchIds.includes(id)) {
        setOfferingState(null);
        setAddonIds([]);
      }
    }
  }

  /** Variant C auto-advance: the add-ons step is skipped when nothing applies. */
  function chooseOffering(next: Offering) {
    setOfferingState(next);
    setAddonIds([]);
    setStep(stepAfterOfferingChosen(applicableAddonsFor(next, catalog).length));
  }

  function toggleAddon(id: string) {
    setAddonIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  /** Linear advance; the add-ons skip stays guarded for prefill flows. */
  function goNext() {
    setStep((s: 1 | 2 | 3 | 4 | 5): 1 | 2 | 3 | 4 | 5 =>
      s === 2 && applicableAddons.length === 0 ? 4 : (Math.min(s + 1, 5) as 1 | 2 | 3 | 4 | 5)
    );
  }

  /** Back from date/time returns to the offering step when add-ons never applied. */
  function goBack() {
    setStep((s: 1 | 2 | 3 | 4 | 5): 1 | 2 | 3 | 4 | 5 => {
      if (s === 4) return stepBackFromDateTime(applicableAddons.length > 0);
      return Math.max(s - 1, 1) as 1 | 2 | 3 | 4 | 5;
    });
  }

  async function submit(): Promise<WizardSubmitResult> {
    if (submitting || !branchId || !offering || !scheduledAt) {
      return { ok: false, rejection: { reason: 'unknown', apiMessage: '' } };
    }
    setSubmitting(true);
    try {
      const record = await deps.createAppointment(
        buildCreatePayload({ branchId, offering, addonIds, scheduledAt, name, email, phone, notes })
      );
      return { ok: true, appointmentId: record.id };
    } catch (err) {
      return { ok: false, rejection: rejectionFromApiClientError(err) };
    } finally {
      setSubmitting(false);
    }
  }

  return {
    step,
    branchId,
    branchChoices,
    setBranch,
    offering,
    chooseOffering,
    goNext,
    goBack,
    applicableAddons,
    addonIds,
    toggleAddon,
    selectedAddons,
    date,
    setDate,
    time,
    setTime,
    scheduledAt,
    isPast,
    offeringName,
    branchName,
    offeringPriceCents: offeringPrice,
    totalCents: total,
    name,
    setName,
    email,
    setEmail,
    phone,
    setPhone,
    notes,
    setNotes,
    submitting,
    submit,
  };
}

export type BookingWizard = ReturnType<typeof useBookingWizard>;
