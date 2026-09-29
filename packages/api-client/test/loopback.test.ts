import { branchSchema } from '@sevendays/types';
import { expect, it } from 'vitest';
import { ZodError } from 'zod';
import { ApiClientError } from '../src/error.js';
import { createApiClient } from '../src/index.js';
import { toLoopbackFetch } from '../src/loopback.js';
import { unwrap } from '../src/unwrap.js';
import type { MockApi } from './mock-api.js';
import {
  mockApi,
  mockApiBrokenBranches,
  mockApiBrokenGallery,
  mockApiBrokenTestimonials,
} from './mock-api.js';

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

it('a schema-mismatched 2xx payload throws ZodError through the wrapper', async () => {
  const client = clientFor(mockApiBrokenBranches);
  await expect(client.branches.list()).rejects.toBeInstanceOf(ZodError);
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

it('gallery.list parses the assembled read into typed data', async () => {
  const client = clientFor(mockApi);
  const read = await client.gallery.list();
  expect(read.categories).toHaveLength(2);
  expect(read.categories[0]?.name).toBe('Weddings');
  expect(read.photos).toHaveLength(1);
  expect(read.photos[0]?.photoUrl).toBe(
    'https://pub-test.r2.dev/gallery/aaaaaaaa-0000-4000-8000-000000000001.jpg'
  );
  expect(read.photos[0]?.categoryId).toBe(read.categories[0]?.id);
});

it('gallery.list surfaces the uniform 404 envelope as ApiClientError', async () => {
  const client = clientFor(mockApiBrokenGallery);
  const err = await client.gallery.list().catch((e) => e);
  expect(err).toBeInstanceOf(ApiClientError);
  expect((err as ApiClientError).status).toBe(404);
  expect((err as ApiClientError).details).toEqual({ error: 'Not found.' });
});

it('testimonials.list parses the public projection into typed data', async () => {
  const client = clientFor(mockApi);
  const rows = await client.testimonials.list();
  expect(rows).toHaveLength(1);
  expect(rows[0]?.quote).toBe('The photos came out better than we hoped.');
  expect(rows[0]?.person).toBe('Maria, batch 2026');
});

it('testimonials.list surfaces the uniform 404 envelope as ApiClientError', async () => {
  const client = clientFor(mockApiBrokenTestimonials);
  const err = await client.testimonials.list().catch((e) => e);
  expect(err).toBeInstanceOf(ApiClientError);
  expect((err as ApiClientError).status).toBe(404);
  expect((err as ApiClientError).details).toEqual({ error: 'Not found.' });
});
