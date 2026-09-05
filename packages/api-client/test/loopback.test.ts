import { branchSchema } from '@sevendays/types';
import { ZodError } from 'zod';
import { expect, it } from 'vitest';
import { ApiClientError } from '../src/error.js';
import { toLoopbackFetch } from '../src/loopback.js';
import { createApiClient } from '../src/index.js';
import { unwrap } from '../src/unwrap.js';
import { mockApi, mockApiBrokenBranches } from './mock-api.js';
import type { MockApi } from './mock-api.js';

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
  expect(record.packagePriceCents).toBe(250000); // server snapshot, not caller input
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
