import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index.js';
import { signUpSession } from './helpers/auth.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import type { FixtureIds } from './helpers/fixtures.js';
import { loadFixtures } from './helpers/fixtures.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);
let ids: FixtureIds;

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

beforeEach(async () => {
  await truncateAll(db);
  ids = await loadFixtures(db);
});

// AC-1 (completeness half): EVERY admin router answers the uniform 401
// envelope for an anonymous caller — the per-router invalid-body proofs
// live in the entity suites; this sweep proves no router escaped the gate.
describe('the anonymous 401 envelope on every admin router', () => {
  const routers = [
    '/api/v1/admin/branches',
    '/api/v1/admin/service-packages',
    '/api/v1/admin/studio-services',
    '/api/v1/admin/addon-services',
    '/api/v1/admin/print-sizes',
    '/api/v1/admin/attires',
    '/api/v1/admin/gallery-categories',
    '/api/v1/admin/gallery-photos',
    '/api/v1/admin/testimonials',
  ];

  for (const router of routers) {
    it(`GET ${router} → 401 for an anonymous caller`, async () => {
      const res = await app.request(router, undefined, testEnv(url));
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'Authentication required.' });
    });
  }
});

// AC-2 (public-absence half): a deactivated row appears in the admin read
// and is ABSENT from the public read — proven for the three entities whose
// public reads are already active-only. The branches public read stays
// unfiltered until #138 (spec § Read assembly) — deliberately unasserted
// here; #138 owns the flip and its test.
describe('deactivate → admin read shows it, public read does not', () => {
  const authed = async (method: string, path: string, email: string, body?: unknown) => {
    const { token } = await signUpSession(url, email);
    return app.request(
      path,
      {
        method,
        headers: { 'content-type': 'application/json', ...bearer(token) },
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      testEnv(url)
    );
  };

  it('a package: create → deactivate → admin shows it, public list hides it', async () => {
    const created = await authed(
      'POST',
      '/api/v1/admin/service-packages',
      'gate-pkg-a@sevendays.test',
      {
        name: 'Gate Probe Package',
        description: 'Created to be deactivated.',
        priceCents: 100000,
        durationMinutes: null,
        isActive: true,
        isFeatured: false,
        frames: [],
        inclusions: [],
      }
    );
    expect(created.status).toBe(201);
    const { id, slug } = (await created.json()) as { id: string; slug: string };
    const deactivated = await authed(
      'PUT',
      `/api/v1/admin/service-packages/${id}`,
      'gate-pkg-b@sevendays.test',
      {
        name: 'Gate Probe Package',
        description: 'Created to be deactivated.',
        priceCents: 100000,
        durationMinutes: null,
        isActive: false,
        isFeatured: false,
        frames: [],
        inclusions: [],
        slug,
      }
    );
    expect(deactivated.status).toBe(200);
    const adminRead = await authed(
      'GET',
      `/api/v1/admin/service-packages/${id}`,
      'gate-pkg-c@sevendays.test'
    );
    expect(((await adminRead.json()) as { isActive: boolean }).isActive).toBe(false);
    const publicList = await app.request('/api/v1/service-packages', undefined, testEnv(url));
    const publicBody = (await publicList.json()) as { slug: string }[];
    expect(publicBody.map((p) => p.slug)).not.toContain(slug);
  });

  it('a studio service: create → deactivate → public list hides it', async () => {
    const created = await authed(
      'POST',
      '/api/v1/admin/studio-services',
      'gate-svc-a@sevendays.test',
      {
        name: 'Gate Probe Service',
        description: 'Created to be deactivated.',
        priceCents: 20000,
      }
    );
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };
    const deactivated = await authed(
      'PUT',
      `/api/v1/admin/studio-services/${id}`,
      'gate-svc-b@sevendays.test',
      {
        name: 'Gate Probe Service',
        description: 'Created to be deactivated.',
        priceCents: 20000,
        isActive: false,
      }
    );
    expect(deactivated.status).toBe(200);
    const publicList = await app.request('/api/v1/studio-services', undefined, testEnv(url));
    const publicBody = (await publicList.json()) as { name: string }[];
    expect(publicBody.map((s) => s.name)).not.toContain('Gate Probe Service');
  });

  it('an add-on service: create → deactivate → public list hides it', async () => {
    const created = await authed(
      'POST',
      '/api/v1/admin/addon-services',
      'gate-addon-a@sevendays.test',
      {
        name: 'Gate Probe Add-on',
        description: 'Created to be deactivated.',
        priceCents: 5000,
      }
    );
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };
    const deactivated = await authed(
      'PUT',
      `/api/v1/admin/addon-services/${id}`,
      'gate-addon-b@sevendays.test',
      {
        name: 'Gate Probe Add-on',
        description: 'Created to be deactivated.',
        priceCents: 5000,
        isActive: false,
      }
    );
    expect(deactivated.status).toBe(200);
    const publicList = await app.request('/api/v1/addon-services', undefined, testEnv(url));
    const publicBody = (await publicList.json()) as { name: string }[];
    expect(publicBody.map((a) => a.name)).not.toContain('Gate Probe Add-on');
  });
});
