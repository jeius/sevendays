import { auditLog, siteSettings } from '@sevendays/db';
import { EMPTY_SITE_SETTINGS } from '@sevendays/types';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index.js';
import { signUpSession } from './helpers/auth.js';
import { createTestDb } from './helpers/db.js';
import { testEnv } from './helpers/env.js';
import { stubCommitBucket } from './helpers/r2-stub.js';
import { truncateAll } from './helpers/truncate.js';

const url = process.env.TEST_DATABASE_URL as string;
const db = createTestDb(url);

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
const STAGING = 'tmp/00000000-0000-4000-8000-0000000000c1.jpg';

const fullSave = (overrides: Record<string, unknown> = {}) => ({
  brandName: 'Sevendays Studio',
  brandTagline: 'Photography',
  homeTitle: 'Three branches. One standard of light.',
  homeDescription: 'Portrait, family, and event photography.',
  packagesTitle: 'Packages',
  packagesDescription: null,
  branchesTitle: 'Branches',
  branchesDescription: null,
  servicesTitle: 'Services',
  servicesDescription: 'Looking for add-ons?',
  aboutTitle: 'About',
  aboutDescription: null,
  aboutStory: 'Line one.\nLine two.',
  kickerGallery: 'The work',
  kickerPackages: 'Featured packages',
  kickerServices: 'What we do',
  kickerTestimonials: 'Kind words',
  socialInstagram: 'https://instagram.com/sevendays',
  socialFacebook: null,
  socialTiktok: null,
  bannerTitle: 'Now booking grads',
  bannerBody: 'Class of 2027 slots are open.',
  bannerIsActive: true,
  contactEmail: 'hello@sevendays.ph',
  contactPhone: '+63 917 000 0000',
  logoImageKey: undefined,
  ...overrides,
});

// undefined JSON.stringify's away — the absent-encoding rides cleanly.
const put = async (
  token: string,
  body: Record<string, unknown>,
  env: Record<string, unknown> = {}
) =>
  app.request(
    '/api/v1/admin/site-settings',
    {
      method: 'PUT',
      headers: { 'content-type': 'application/json', ...bearer(token) },
      body: JSON.stringify(body),
    },
    { ...testEnv(url), ...env }
  );

beforeEach(async () => {
  await truncateAll(db); // the suite needs no catalog fixtures — the singleton starts empty
});

describe('GET /api/v1/site-settings (the public singleton read)', () => {
  it('born-empty: answers the EMPTY wire verbatim — defaults never ride the read (M7 #215)', async () => {
    const res = await app.request('/api/v1/site-settings', undefined, testEnv(url));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(EMPTY_SITE_SETTINGS);
    expect(body).not.toHaveProperty('logoImageKey');
  });

  it('after a save, the stored values answer verbatim; nulls stay null (no defaulting server-side)', async () => {
    const { token } = await signUpSession(url, 'site-settings-null-stay@sevendays.test');
    const saved = fullSave({ brandName: null, bannerIsActive: false });
    expect((await put(token, saved)).status).toBe(200);
    const res = await app.request('/api/v1/site-settings', undefined, testEnv(url));
    const body = (await res.json()) as { brandName: string | null; homeTitle: string | null };
    expect(body.brandName).toBeNull();
    expect(body.homeTitle).toBe('Three branches. One standard of light.');
  });
});

describe('PUT /api/v1/admin/site-settings (the singleton full-object save)', () => {
  it('round-trips the full object: 200 with the refreshed read; one row exists after (the singleton)', async () => {
    const { token } = await signUpSession(url, 'site-settings-save@sevendays.test');
    const res = await put(token, fullSave());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { brandName: string | null; contactEmail: string | null };
    expect(body.brandName).toBe('Sevendays Studio');
    expect(body.contactEmail).toBe('hello@sevendays.ph');
    expect(body).not.toHaveProperty('logoImageKey');
    const rows = await db.select({ id: siteSettings.id }).from(siteSettings);
    expect(rows).toHaveLength(1);
    // A second save UPDATES the same row — never a second one.
    expect((await put(token, fullSave({ brandName: 'Renamed' }))).status).toBe(200);
    const again = await db.select({ id: siteSettings.id }).from(siteSettings);
    expect(again).toHaveLength(1);
  });

  it('a staging logo commits to brand/, resolves on the read, and the staging key deletes (raw keys never on the wire)', async () => {
    const stub = stubCommitBucket({ [STAGING]: { size: 1024, contentType: 'image/jpeg' } });
    const { token } = await signUpSession(url, 'site-settings-logo-bind@sevendays.test');
    const res = await put(token, fullSave({ logoImageKey: STAGING }), {
      MEDIA_BUCKET: stub.bucket,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { logoImageUrl: string | null };
    expect(body.logoImageUrl).toMatch(/^https:\/\/pub-test\.r2\.dev\/brand\/[0-9a-f-]+\.jpg$/);
    expect(stub.putCalls).toHaveLength(1);
    expect(stub.deleteCalls).toEqual([STAGING]);
    const stored = await db.select({ key: siteSettings.logoImageKey }).from(siteSettings);
    expect(stored[0]?.key).toMatch(/^brand\//);
  });

  it('an explicit null logo clears the stored one and deletes the old object only after the commit', async () => {
    const OLD_KEY = 'brand/aaaaaaaa-0000-4000-8000-0000000000d1.jpg';
    const bind = stubCommitBucket({ [STAGING]: { size: 1024, contentType: 'image/jpeg' } });
    const { token } = await signUpSession(url, 'site-settings-logo-clear@sevendays.test');
    await put(token, fullSave({ logoImageKey: STAGING }), { MEDIA_BUCKET: bind.bucket });
    const stored = await db.select({ key: siteSettings.logoImageKey }).from(siteSettings);
    const boundKey = stored[0]?.key;
    expect(boundKey).toMatch(/^brand\//);

    const clear = stubCommitBucket();
    const res = await put(token, fullSave({ logoImageKey: null }), { MEDIA_BUCKET: clear.bucket });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { logoImageUrl: string | null };
    expect(body.logoImageUrl).toBeNull();
    expect(clear.deleteCalls).toEqual([boundKey]);
  });

  it('an ABSENT logo field leaves the stored logo unchanged (no bucket touch)', async () => {
    const bind = stubCommitBucket({ [STAGING]: { size: 1024, contentType: 'image/jpeg' } });
    const { token } = await signUpSession(url, 'site-settings-logo-keep@sevendays.test');
    await put(token, fullSave({ logoImageKey: STAGING }), { MEDIA_BUCKET: bind.bucket });
    const afterBind = await db.select({ key: siteSettings.logoImageKey }).from(siteSettings);
    const boundKey = afterBind[0]?.key;

    const keep = stubCommitBucket();
    const res = await put(token, fullSave(), { MEDIA_BUCKET: keep.bucket });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { logoImageUrl: string | null };
    expect(body.logoImageUrl).toBe(`https://pub-test.r2.dev/${boundKey}`);
    expect(keep.putCalls).toEqual([]);
    expect(keep.deleteCalls).toEqual([]);
  });

  it('a missing staging key → the house 400 with the logoImageKey field detail (the commit re-path)', async () => {
    const stub = stubCommitBucket(); // empty — head misses
    const { token } = await signUpSession(url, 'site-settings-logo-miss@sevendays.test');
    const res = await put(token, fullSave({ logoImageKey: STAGING }), {
      MEDIA_BUCKET: stub.bucket,
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: string;
      details: { path: string[]; message: string }[];
    };
    expect(body.details[0]?.path).toEqual(['logoImageKey']);
  });

  it('one audit row per committed save — create on the first, update after; summary null; the row id carries', async () => {
    const { token } = await signUpSession(url, 'site-settings-audit@sevendays.test');
    await put(token, fullSave());
    await put(token, fullSave({ brandName: 'Renamed' }));
    const rows = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entity, 'site-settings'))
      .orderBy(auditLog.occurredAt, auditLog.id);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.action).toBe('create');
    expect(rows[1]?.action).toBe('update');
    for (const row of rows) {
      expect(row.entityId).toBe(rows[0]?.entityId);
      expect(row.summary).toBeNull();
    }
    // A FAILED validation records nothing: the audit count stays 2 after a 400.
    await put(token, fullSave({ socialInstagram: 'not a url' }));
    const after = await db.select().from(auditLog).where(eq(auditLog.entity, 'site-settings'));
    expect(after).toHaveLength(2);
  });
});
