import type {
  AddonService,
  Branch,
  ServicePackageWithInclusions,
  StudioServiceWithBranches,
} from '@sevendays/types';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addonTotalCents,
  applicableAddonsFor,
  branchChoicesFor,
  branchFilterServiceId,
  buildCreatePayload,
  isPastPick,
  offeringPriceCents,
  phDateInputMin,
  prefillFromSearch,
  reasonForApiMessage,
  rejectionFromApiClientError,
  scheduledAtInstant,
  stepAfterOfferingChosen,
  stepBackFromDateTime,
  TIME_SLOTS,
  totalCents,
} from './booking';

// Deterministic clock for the time-coupled tests (api-suite pattern:
// toFake ['Date'] only, so driver timers stay real).
function useClock(iso: string) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(iso));
}
afterEach(() => {
  vi.useRealTimers();
});

function branch(id: string): Branch {
  return {
    id,
    name: `Branch ${id.slice(-4)}`,
    address: 'test address',
    phone: '+63 900 000 000',
    acceptsWalkIns: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };
}

function service(
  id: string,
  overrides: Partial<StudioServiceWithBranches> = {}
): StudioServiceWithBranches {
  return {
    id,
    name: `Service ${id.slice(-4)}`,
    description: 'test service',
    priceCents: 150000,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    bookableBranchIds: [],
    applicableAddonServiceIds: [],
    ...overrides,
  };
}

function addon(id: string, priceCents: number): AddonService {
  return {
    id,
    name: `Addon ${id.slice(-4)}`,
    description: 'test add-on',
    priceCents,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };
}

function pkg(id: string, priceCents: number): ServicePackageWithInclusions {
  return {
    id,
    name: `Package ${id.slice(-4)}`,
    description: 'test package',
    priceCents,
    durationMinutes: null,
    isActive: true,
    coverImageKey: null,
    slug: `slug-${id.slice(-4)}`,
    isFeatured: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    inclusions: [],
    frames: [],
  };
}

const B1 = branch('11111111-1111-4111-8111-111111111111');
const B2 = branch('22222222-2222-4222-8222-222222222222');
const SVC = service('33333333-3333-4333-8333-333333333333', {
  bookableBranchIds: [B2.id],
  applicableAddonServiceIds: ['55555555-5555-4555-8555-555555555555'],
});
const ADDON_A = addon('55555555-5555-4555-8555-555555555555', 12000);
const ADDON_B = addon('66666666-6666-4666-8666-666666666666', 6000);
const PKG = pkg('44444444-4444-4444-8444-444444444444', 90000);

const CATALOG = {
  branches: [B1, B2],
  packages: [PKG],
  services: [SVC],
  addons: [ADDON_A, ADDON_B],
};

describe('TIME_SLOTS', () => {
  it('pins the placeholder hourly grid (ADR-0005; M3 replaces it)', () => {
    expect(TIME_SLOTS).toEqual([
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
    ]);
  });
});

describe('phDateInputMin', () => {
  it("returns today's PH wall-clock date for a PH-morning now", () => {
    expect(phDateInputMin(new Date('2026-12-25T02:00:00.000Z'))).toBe('2026-12-25');
  });

  it('rolls a UTC-late now into the next PH day (rollover pin)', () => {
    expect(phDateInputMin(new Date('2026-12-31T16:30:00.000Z'))).toBe('2027-01-01');
  });
});

describe('scheduledAtInstant', () => {
  it('treats the PH wall-clock pick as a UTC+8 instant', () => {
    expect(scheduledAtInstant('2026-12-25', '09:30')?.toISOString()).toBe(
      '2026-12-25T01:30:00.000Z'
    );
  });

  it('returns null while date or time are unpicked', () => {
    expect(scheduledAtInstant('', '09:30')).toBeNull();
    expect(scheduledAtInstant('2026-12-25', '')).toBeNull();
  });
});

describe('isPastPick', () => {
  it('flags at-or-before now as past (the API floor is at-or-before too)', () => {
    useClock('2026-09-10T00:00:00.000Z');
    expect(isPastPick(new Date('2026-09-10T00:00:00.000Z'), new Date())).toBe(true);
    expect(isPastPick(new Date('2026-09-09T23:59:59.999Z'), new Date())).toBe(true);
  });

  it('does not flag a future pick', () => {
    useClock('2026-09-10T00:00:00.000Z');
    expect(isPastPick(new Date('2026-09-10T00:00:00.001Z'), new Date())).toBe(false);
    expect(isPastPick(null, new Date())).toBe(false);
  });
});

describe('prefillFromSearch', () => {
  it('keeps deep-linked branch and package ids that exist', () => {
    expect(prefillFromSearch({ branch: B1.id, package: PKG.id }, CATALOG)).toEqual({
      branchId: B1.id,
      offering: { kind: 'package', id: PKG.id },
    });
  });

  it('sets a service offering for a known deep-linked service', () => {
    expect(prefillFromSearch({ service: SVC.id }, CATALOG)).toEqual({
      branchId: null,
      offering: { kind: 'service', id: SVC.id },
    });
  });

  it('silently drops unknown ids (stale deep links prefill nothing)', () => {
    expect(
      prefillFromSearch(
        {
          branch: '99999999-9999-4999-8999-999999999999',
          package: '99999999-9999-4999-8999-999999999999',
          service: '99999999-9999-4999-8999-999999999999',
        },
        CATALOG
      )
    ).toEqual({ branchId: null, offering: null });
  });
});

describe('branchFilterServiceId', () => {
  it('prefers the chosen service offering', () => {
    const offering = { kind: 'service' as const, id: SVC.id };
    expect(branchFilterServiceId(offering, PKG.id, CATALOG)).toBe(SVC.id);
  });

  it('falls to a known deep-linked service before anything is chosen', () => {
    expect(branchFilterServiceId(null, SVC.id, CATALOG)).toBe(SVC.id);
  });

  it('is null with no offering and no (or an unknown) deep-linked service', () => {
    expect(branchFilterServiceId(null, undefined, CATALOG)).toBeNull();
    expect(branchFilterServiceId(null, '99999999-9999-4999-8999-999999999999', CATALOG)).toBeNull();
  });
});

describe('branchChoicesFor', () => {
  it('offers all branches with no service filter', () => {
    expect(branchChoicesFor(CATALOG, null)).toEqual([B1, B2]);
  });

  it("filters to the service's bookable branches in branches-read order", () => {
    expect(branchChoicesFor(CATALOG, SVC.id)).toEqual([B2]);
  });

  it('falls back to all branches for an unknown service id', () => {
    expect(branchChoicesFor(CATALOG, '99999999-9999-4999-8999-999999999999')).toEqual([B1, B2]);
  });
});

describe('applicableAddonsFor', () => {
  it('offers the full active add-on list for a package (uniform rule)', () => {
    const offering = { kind: 'package' as const, id: PKG.id };
    expect(applicableAddonsFor(offering, CATALOG)).toEqual([ADDON_A, ADDON_B]);
  });

  it('matrix-gates a service booking to the embedded applicable ids', () => {
    const offering = { kind: 'service' as const, id: SVC.id };
    expect(applicableAddonsFor(offering, CATALOG)).toEqual([ADDON_A]);
  });

  it('offers nothing for a service with no applicable add-ons and for no offering', () => {
    const bare = service('77777777-7777-4777-8777-777777777777');
    const offering = { kind: 'service' as const, id: bare.id };
    expect(applicableAddonsFor(offering, CATALOG)).toEqual([]);
    expect(applicableAddonsFor(null, CATALOG)).toEqual([]);
  });
});

describe('totals', () => {
  it('sums the offering price and selected add-on prices (seed-scale check: ₱900 + ₱120 + ₱60 = ₱1,080)', () => {
    const offering = { kind: 'package' as const, id: PKG.id };
    expect(offeringPriceCents(offering, CATALOG)).toBe(90000);
    expect(addonTotalCents([ADDON_A.id, ADDON_B.id], CATALOG)).toBe(18000);
    expect(totalCents(offering, [ADDON_A.id, ADDON_B.id], CATALOG)).toBe(108000);
  });

  it('totals zero before an offering exists', () => {
    expect(totalCents(null, [], CATALOG)).toBe(0);
  });
});

describe('step transitions', () => {
  it('an offering WITH applicable add-ons advances to the add-ons step; without, straight to date/time', () => {
    expect(stepAfterOfferingChosen(2)).toBe(3);
    expect(stepAfterOfferingChosen(0)).toBe(4);
  });

  it('Back from date/time returns to add-ons only when they applied; otherwise to the offering step', () => {
    expect(stepBackFromDateTime(true)).toBe(3);
    expect(stepBackFromDateTime(false)).toBe(2);
  });
});

describe('reasonForApiMessage', () => {
  it("maps the intake module's owned wordings to their reasons", () => {
    expect(reasonForApiMessage('Service Package is inactive.')).toBe('package_inactive');
    expect(reasonForApiMessage('Studio Service is inactive.')).toBe('service_inactive');
    expect(reasonForApiMessage("That service isn't offered at the branch you picked.")).toBe(
      'service_not_bookable_at_branch'
    );
    expect(reasonForApiMessage('Add-on Service is inactive.')).toBe('addon_inactive');
    expect(reasonForApiMessage("That add-on doesn't apply to the service you picked.")).toBe(
      'addon_not_applicable'
    );
    expect(
      reasonForApiMessage(
        'Your chosen schedule is already in the past. Please pick a future date and time.'
      )
    ).toBe('past_datetime');
  });

  it('falls through to unknown for unmatched messages (schema 400s, unknown ids)', () => {
    expect(reasonForApiMessage('Unknown branchId.')).toBe('unknown');
    expect(reasonForApiMessage('')).toBe('unknown');
  });
});

describe('rejectionFromApiClientError', () => {
  it('reads the envelope message off ApiClientError.details', () => {
    const err = Object.assign(new Error('API 400: Service Package is inactive.'), {
      name: 'ApiClientError',
      status: 400,
      details: { error: 'Service Package is inactive.' },
    });
    expect(rejectionFromApiClientError(err)).toEqual({
      reason: 'package_inactive',
      apiMessage: 'Service Package is inactive.',
    });
  });

  it('strips the "API <status>: " prefix when details are absent', () => {
    const err = new Error(
      'API 400: Your chosen schedule is already in the past. Please pick a future date and time.'
    );
    expect(rejectionFromApiClientError(err)).toEqual({
      reason: 'past_datetime',
      apiMessage:
        'Your chosen schedule is already in the past. Please pick a future date and time.',
    });
  });

  it('degrades to the unknown card for foreign throwables', () => {
    expect(rejectionFromApiClientError(new TypeError('fetch failed'))).toEqual({
      reason: 'unknown',
      apiMessage: 'fetch failed',
    });
    expect(rejectionFromApiClientError('boom')).toEqual({ reason: 'unknown', apiMessage: '' });
  });
});

describe('buildCreatePayload', () => {
  it('maps a package booking to the create wire shape (no price ever)', () => {
    const payload = buildCreatePayload({
      branchId: B1.id,
      offering: { kind: 'package', id: PKG.id },
      addonIds: [ADDON_A.id],
      scheduledAt: new Date('2026-12-25T01:30:00.000Z'),
      name: 'Juana Dela Cruz',
      email: 'juana@example.com',
      phone: '+63 917 000 0000',
      notes: ' graduations ',
    });
    expect(payload).toEqual({
      branchId: B1.id,
      servicePackageId: PKG.id,
      studioServiceId: null,
      customerName: 'Juana Dela Cruz',
      customerEmail: 'juana@example.com',
      customerPhone: '+63 917 000 0000',
      scheduledAt: '2026-12-25T01:30:00.000Z',
      addonServiceIds: [ADDON_A.id],
      notes: ' graduations ',
    });
  });

  it('maps a service booking (exactly-one: the other ref null) and omits empty notes', () => {
    const payload = buildCreatePayload({
      branchId: B2.id,
      offering: { kind: 'service', id: SVC.id },
      addonIds: [],
      scheduledAt: new Date('2026-12-25T01:30:00.000Z'),
      name: 'Juan Dela Cruz',
      email: 'juan@example.com',
      phone: '+63 917 000 0001',
      notes: '',
    });
    expect(payload.studioServiceId).toBe(SVC.id);
    expect(payload.servicePackageId).toBeNull();
    expect(payload.addonServiceIds).toEqual([]);
    expect(payload.notes).toBeUndefined();
  });
});
