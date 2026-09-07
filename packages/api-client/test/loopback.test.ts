import { branchSchema } from '@sevendays/types';
import { expect, it } from 'vitest';
import { ZodError } from 'zod';
import { ApiClientError } from '../src/error.js';
import { createApiClient } from '../src/index.js';
import { toLoopbackFetch } from '../src/loopback.js';
import { unwrap } from '../src/unwrap.js';
import type { MockApi } from './mock-api.js';
import { mockApi, mockApiBrokenBranches } from './mock-api.js';

const BASE = 'http://localhost:4949/';

function clientFor(app: MockApi) {
  return createApiClient({ baseUrl: BASE, fetch: toLoopbackFetch(app) });
}

it('branches.list parses the payload into typed data', async () => {
  const client = clientFor(mockApi);
  const rows = await client.branches.list();
  expect(rows).toHaveLength(2);
  expect(rows[0]?.name).toBe('Main Studio');
  expect(rows[0]?.acceptsWalkIns).toBe(true);
  expect(rows[0]?.createdAt).toBeInstanceOf(Date);
});

it('servicePackages.list carries resolved lookups as typed data', async () => {
  const client = clientFor(mockApi);
  const rows = await client.servicePackages.list();
  expect(rows).toHaveLength(1);
  expect(rows[0]?.inclusions[0]?.printSize?.code).toBe('8R');
  expect(rows[0]?.frames).toHaveLength(1);
});

it('addonServices.list returns active add-ons', async () => {
  const client = clientFor(mockApi);
  const rows = await client.addonServices.list();
  expect(rows[0]?.name).toBe('Makeup');
});

it('appointments.create returns the created record with add-ons (201)', async () => {
  const client = clientFor(mockApi);
  const record = await client.appointments.create({
    branchId: '11111111-1111-4111-8111-111111111111',
    servicePackageId: '44444444-4444-4444-8444-444444444444',
    customerName: 'Ada Lovelace',
    customerEmail: 'ada@example.com',
    customerPhone: '+63 917 222 2222',
    scheduledAt: '2026-10-01T09:00:00.000Z',
    addonServiceIds: ['33333333-3333-4333-8333-333333333333'],
  });
  expect(record.bookedPriceCents).toBe(250000); // server snapshot, not caller input
  expect(record.addonServices[0]?.name).toBe('Makeup');
  expect(record.createdAt).toBeInstanceOf(Date);
});

it('appointments.list filters by branch', async () => {
  const client = clientFor(mockApi);
  const all = await client.appointments.list();
  const filtered = await client.appointments.list({
    query: { branchId: '22222222-2222-4222-8222-222222222222' },
  });
  expect(all).toHaveLength(1);
  expect(filtered).toHaveLength(0);
});

it('a schema-mismatched 2xx payload throws ZodError through the wrapper', async () => {
  const client = clientFor(mockApiBrokenBranches);
  await expect(client.branches.list()).rejects.toBeInstanceOf(ZodError);
});

it('a 400 envelope surfaces as ApiClientError with status + details', async () => {
  const client = clientFor(mockApi);
  const err = await client.appointments
    .create({
      branchId: '99999999-9999-4999-8999-999999999999',
      servicePackageId: '44444444-4444-4444-8444-444444444444',
      customerName: 'X',
      customerEmail: 'x@example.com',
      customerPhone: 'P',
      scheduledAt: '2026-10-01T09:00:00.000Z',
    })
    .catch((e) => e);
  expect(err).toBeInstanceOf(ApiClientError);
  expect((err as ApiClientError).status).toBe(400);
  expect((err as ApiClientError).details).toEqual({ error: 'Unknown branchId.' });
});

it('a 404 envelope surfaces as ApiClientError through the unwrap gate', async () => {
  // Drive the mock's uniform notFound envelope through the exact gate the
  // wrappers use — same assertions the $url/raw path would hit.
  const res = await mockApi.request(`${BASE}api/v1/nope`);
  expect(res.status).toBe(404);
  const err = await unwrap(res, branchSchema.array()).catch((e) => e);
  expect(err).toBeInstanceOf(ApiClientError);
  expect((err as ApiClientError).status).toBe(404);
  expect((err as ApiClientError).details).toEqual({ error: 'Not found.' });
});

it('servicePackages.bySlug returns the package with resolved lookups', async () => {
  const client = clientFor(mockApi);
  const pkg = await client.servicePackages.bySlug({ param: { slug: 'basic-package' } });
  expect(pkg.name).toBe('Basic Package');
  expect(pkg.slug).toBe('basic-package');
  expect(pkg.inclusions[0]?.printSize?.code).toBe('8R');
  expect(pkg.frames).toHaveLength(1);
});

it('servicePackages.bySlug surfaces the uniform 404 as ApiClientError', async () => {
  const client = clientFor(mockApi);
  const err = await client.servicePackages
    .bySlug({ param: { slug: 'no-such-package' } })
    .catch((e) => e);
  expect(err).toBeInstanceOf(ApiClientError);
  expect((err as ApiClientError).status).toBe(404);
  expect((err as ApiClientError).details).toEqual({ error: 'Package not found.' });
});

it('appointments.get returns the record with add-on entries', async () => {
  const client = clientFor(mockApi);
  const record = await client.appointments.get({
    param: { id: '99999999-9999-4999-8999-999999999999' },
  });
  expect(record.bookedPriceCents).toBe(250000);
  expect(record.servicePackageId).toBe('44444444-4444-4444-8444-444444444444');
  expect(record.studioServiceId).toBeNull();
  expect(record.addonServices[0]?.name).toBe('Makeup');
  expect(record.createdAt).toBeInstanceOf(Date);
});

it('appointments.get surfaces the uniform 404 as ApiClientError', async () => {
  const client = clientFor(mockApi);
  const err = await client.appointments
    .get({ param: { id: 'f0000000-0000-4000-8000-000000000000' } })
    .catch((e) => e);
  expect(err).toBeInstanceOf(ApiClientError);
  expect((err as ApiClientError).status).toBe(404);
  expect((err as ApiClientError).details).toEqual({ error: 'Appointment not found.' });
});

it('appointments.get rejects a non-uuid id with the uniform 400 as ApiClientError', async () => {
  const client = clientFor(mockApi);
  const err = await client.appointments.get({ param: { id: 'not-a-uuid' } }).catch((e) => e);
  expect(err).toBeInstanceOf(ApiClientError);
  expect((err as ApiClientError).status).toBe(400);
  // The mock mirrors the real validator envelope (error + details); assert
  // the error wording via toMatchObject so the exact details payload can
  // evolve without weakening the seam.
  expect((err as ApiClientError).details).toMatchObject({ error: 'Invalid request payload.' });
});

it('studioServices.list returns active services with bookable branch ids', async () => {
  const client = clientFor(mockApi);
  const rows = await client.studioServices.list();
  expect(rows).toHaveLength(1);
  expect(rows[0]?.name).toBe('Portraits & ID Photo');
  expect(rows[0]?.priceCents).toBe(50000);
  expect(rows[0]?.bookableBranchIds).toEqual([
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
  ]);
  expect(rows[0]?.createdAt).toBeInstanceOf(Date);
});
