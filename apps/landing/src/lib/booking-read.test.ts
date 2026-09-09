import { ApiClientError } from '@sevendays/api-client';
import type {
  AppointmentWithAddons,
  Branch,
  ServicePackageWithInclusions,
  StudioServiceWithBranches,
} from '@sevendays/types';
import type { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAppointment } from './api.functions';
import { branchNameFor, confirmationTotalCents, offeringNameFor } from './booking-read';
import { appointmentQueries } from './queries';

// The ticket-08 read-back feature suite: query factory (Task 1) + the pure
// read lib (Task 2). The seam, not the network (package-slug.test.ts
// pattern): the server fn is mocked so these tests prove the query
// factory's contract without a Start runtime. Page rendering is the CDP
// scripts' job (spec § Testing Decisions 5).
vi.mock('./api.functions', () => ({
  getAppointment: vi.fn(),
}));

const mockedGet = vi.mocked(getAppointment);

type MinimalQueryContext = {
  client: QueryClient;
  queryKey: string[];
  signal: AbortSignal;
  meta: Record<string, unknown> | undefined;
  pageParam?: unknown;
  direction?: unknown;
};

describe('appointmentQueries.byId', () => {
  beforeEach(() => {
    mockedGet.mockClear();
  });

  it('happy path: returns the fetched record (bare id passed through as { data })', async () => {
    const rec = { id: '0c9dc0de-0000-4000-8000-000000000001' } as AppointmentWithAddons;
    mockedGet.mockResolvedValueOnce(rec);
    const queryFn = appointmentQueries.byId('0c9dc0de-0000-4000-8000-000000000001').queryFn;
    await expect(queryFn?.({} as MinimalQueryContext)).resolves.toBe(rec);
    expect(mockedGet).toHaveBeenCalledWith({ data: '0c9dc0de-0000-4000-8000-000000000001' });
  });

  it('404 posture: retry is false (a deterministic 404 is never retried) and staleTime stays default', async () => {
    const err = new ApiClientError(404, { error: 'Appointment not found.' });
    mockedGet.mockRejectedValue(err);
    const queryFn = appointmentQueries.byId('99999999-9999-4999-8999-999999999999').queryFn;
    await expect(queryFn?.({} as MinimalQueryContext)).rejects.toBe(err);
    const options = appointmentQueries.byId('99999999-9999-4999-8999-999999999999');
    expect(options.retry).toBe(false);
    expect(options.staleTime).toBeUndefined();
  });
});

// --- Fixtures (full literals, booking.test.ts pattern) ---------------------

const B1 = branch('11111111-1111-4111-8111-111111111111', 'Branch One');
const B2 = branch('22222222-2222-4222-8222-222222222222', 'Branch Two');
const PKG = pkg('44444444-4444-4444-8444-444444444444', 'Package A');
const SVC = service('33333333-3333-4333-8333-333333333333', 'Portraits & ID Photo');

function branch(id: string, name: string): Branch {
  return {
    id,
    name,
    address: 'test address',
    phone: '+63 900 000 000',
    acceptsWalkIns: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };
}

function pkg(id: string, name: string): ServicePackageWithInclusions {
  return {
    id,
    name,
    description: 'test package',
    priceCents: 90000,
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

function service(id: string, name: string): StudioServiceWithBranches {
  return {
    id,
    name,
    description: 'test service',
    priceCents: 150000,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    bookableBranchIds: [],
    applicableAddonServiceIds: [],
  };
}

function record(overrides: Partial<AppointmentWithAddons> = {}): AppointmentWithAddons {
  return {
    id: '0c9dc0de-0000-4000-8000-000000000001',
    branchId: B1.id,
    servicePackageId: PKG.id,
    studioServiceId: null,
    customerName: 'Juana Dela Cruz',
    customerEmail: 'juana@example.com',
    customerPhone: '+63 917 000 0000',
    scheduledAt: new Date('2026-12-25T01:30:00.000Z'),
    status: 'pending',
    kind: 'scheduled',
    bookedPriceCents: 90000,
    notes: null,
    createdAt: new Date('2026-09-10T00:00:00Z'),
    updatedAt: new Date('2026-09-10T00:00:00Z'),
    addonServices: [],
    ...overrides,
  };
}

describe('confirmationTotalCents', () => {
  it('sums the offering snapshot and the add-on entries (seed-scale: ₱900 + ₱120 + ₱60 = ₱1,080)', () => {
    const rec = record({
      addonServices: [
        {
          addonServiceId: '55555555-5555-4555-8555-555555555555',
          name: 'Makeup',
          priceCents: 12000,
        },
        {
          addonServiceId: '66666666-6666-4666-8666-666666666666',
          name: 'Hairstyle',
          priceCents: 6000,
        },
      ],
    });
    expect(confirmationTotalCents(rec)).toBe(108000);
  });

  it('totals a service booking with no add-ons from the offering snapshot alone', () => {
    expect(
      confirmationTotalCents(
        record({ servicePackageId: null, studioServiceId: SVC.id, bookedPriceCents: 150000 })
      )
    ).toBe(150000);
  });
});

describe('branchNameFor', () => {
  it('resolves the branch name from the branches read', () => {
    expect(branchNameFor(record(), [B1, B2])).toBe('Branch One');
  });

  it("falls back to '—' when the branch is unresolvable", () => {
    expect(
      branchNameFor(record({ branchId: '99999999-9999-4999-8999-999999999999' }), [B1, B2])
    ).toBe('—');
  });
});

describe('offeringNameFor', () => {
  it('resolves a package booking from the packages read', () => {
    expect(offeringNameFor(record(), { packages: [PKG], services: [SVC] })).toBe('Package A');
  });

  it('resolves a service booking from the services read', () => {
    expect(
      offeringNameFor(record({ servicePackageId: null, studioServiceId: SVC.id }), {
        packages: [PKG],
        services: [SVC],
      })
    ).toBe('Portraits & ID Photo');
  });

  it("falls back to '—' when the offering has left the active-only lists", () => {
    expect(offeringNameFor(record(), { packages: [], services: [] })).toBe('—');
  });
});
