import {
  addonServiceSchema,
  attireSchema,
  branchReadSchema,
  printSizeSchema,
  studioServiceWithBranchesSchema,
  testimonialSchema,
} from '@sevendays/types';
import { describe, expect, it } from 'vitest';
// biome-ignore lint/performance/noNamespaceImport: the plan pins the `light.*` namespace handle for this seam suite
import * as light from './light-entity-state';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const STAMP = '2026-08-31T00:00:00.000Z';

const branch = branchReadSchema.parse({
  id: uuid(1),
  name: 'Main Studio',
  address: '12 Sample St.',
  phone: '+63 900 000 0001',
  acceptsWalkIns: true,
  isActive: true,
  latitude: null,
  longitude: null,
  googleMapsUrl: null,
  appleMapsUrl: null,
  coverImageUrl: null,
  createdAt: STAMP,
  updatedAt: STAMP,
});

// The null-coordinates read's editor state — latitude/longitude are the
// raw input strings ('' = clear to null), the #248 encoding.
const branchState = light.branchStateFromRead(branch);

const service = studioServiceWithBranchesSchema.parse({
  id: uuid(2),
  name: 'Hair & Makeup',
  description: 'On-location styling.',
  priceCents: 150000,
  isActive: true,
  createdAt: STAMP,
  updatedAt: STAMP,
  bookableBranchIds: [uuid(1), uuid(3)],
  applicableAddonServiceIds: [uuid(4)],
});

describe('studio-service state', () => {
  it('studioServiceStateFromRead hands the editor its OWN branchIds copy (replace, never push — the read row is the query cache)', () => {
    const state = light.studioServiceStateFromRead(service);
    expect(state.branchIds).toEqual([uuid(1), uuid(3)]);
    expect(state.branchIds).not.toBe(service.bookableBranchIds);
  });

  it('branch state/payload round-trip; the flip carries every editable field with ONLY isActive flipped and NO cover key', () => {
    const state = light.branchStateFromRead(branch);
    expect(state).toEqual({
      name: 'Main Studio',
      address: '12 Sample St.',
      phone: '+63 900 000 0001',
      latitude: '',
      longitude: '',
      googleMapsUrl: '',
      appleMapsUrl: '',
      acceptsWalkIns: true,
      isActive: true,
      coverImageUrl: null,
    });
    expect(light.buildBranchCreatePayload(state)).toEqual({
      name: 'Main Studio',
      address: '12 Sample St.',
      phone: '+63 900 000 0001',
      acceptsWalkIns: true,
      isActive: true,
      latitude: null,
      longitude: null,
      googleMapsUrl: null,
      appleMapsUrl: null,
    });
    const flip = light.buildBranchFlipPayload(branch, false);
    expect(flip).toEqual({
      name: 'Main Studio',
      address: '12 Sample St.',
      phone: '+63 900 000 0001',
      acceptsWalkIns: true,
      isActive: false,
      latitude: null,
      longitude: null,
      googleMapsUrl: null,
      appleMapsUrl: null,
    });
    // The cover is deliberately ABSENT from a flip — the absence is what
    // makes a flip never re-verify or clobber media (the tri-state law).
    expect('coverImageKey' in flip).toBe(false);
  });

  it('create payload includes the cover ONLY when the state carries a fresh staging key', () => {
    const state = light.branchStateFromRead(branch);
    expect('coverImageKey' in light.buildBranchCreatePayload(state)).toBe(false);
    const bound = { ...state, coverImageKey: 'tmp/00000000-0000-4000-8000-00000000000c.jpg' };
    expect(light.buildBranchCreatePayload(bound).coverImageKey).toBe(
      'tmp/00000000-0000-4000-8000-00000000000c.jpg'
    );
  });

  it('update payload encodes the cover tri-state: absent = property ABSENT, null = clear, string = bind', () => {
    const state = light.branchStateFromRead(branch);
    expect('coverImageKey' in light.buildBranchUpdatePayload(state)).toBe(false);
    expect(
      light.buildBranchUpdatePayload({ ...state, coverImageKey: null }).coverImageKey
    ).toBeNull();
    expect(
      light.buildBranchUpdatePayload({
        ...state,
        coverImageKey: 'tmp/00000000-0000-4000-8000-00000000000c.jpg',
      }).coverImageKey
    ).toBe('tmp/00000000-0000-4000-8000-00000000000c.jpg');
  });

  it('a read with a cover seeds coverImageUrl; the editor key starts undefined (a read never echoes keys)', () => {
    const covered = { ...branch, coverImageUrl: 'https://pub-test.r2.dev/covers/aaaa.jpg' };
    const state = light.branchStateFromRead(covered);
    expect(state.coverImageUrl).toBe('https://pub-test.r2.dev/covers/aaaa.jpg');
    expect(state.coverImageKey).toBeUndefined();
  });

  // #248: the manual coordinate fields — state strings, the payload parse,
  // the validator's bounds/dp/pair rules, and the flip's untouched re-send.
  it('#248: state round-trips stored coordinates as strings', () => {
    const state = light.branchStateFromRead({ ...branch, latitude: 14.16598, longitude: 121.2485 });
    expect(state.latitude).toBe('14.16598');
    expect(state.longitude).toBe('121.2485');
  });

  it('#248: null coordinates round-trip as empty strings', () => {
    const state = light.branchStateFromRead({ ...branch, latitude: null, longitude: null });
    expect(state.latitude).toBe('');
    expect(state.longitude).toBe('');
  });

  it('#248: the update payload parses a valid pair to numbers', () => {
    const payload = light.buildBranchUpdatePayload({
      ...branchState,
      latitude: '14.16598',
      longitude: '121.2485',
    });
    expect(payload.latitude).toBe(14.16598);
    expect(payload.longitude).toBe(121.2485);
  });

  it('#248: empty inputs save the null pair (clear)', () => {
    const payload = light.buildBranchUpdatePayload({ ...branchState, latitude: '', longitude: '' });
    expect(payload.latitude).toBeNull();
    expect(payload.longitude).toBeNull();
  });

  it('#248: validation rejects an out-of-bounds latitude', () => {
    const errors = light.validateBranchState({ ...branchState, latitude: '91', longitude: '0' });
    expect(errors.latitude).toBeDefined();
  });

  it('#248: validation rejects more than 6 decimal places', () => {
    const errors = light.validateBranchState({
      ...branchState,
      latitude: '14.1659812',
      longitude: '0',
    });
    expect(errors.latitude).toBeDefined();
  });

  it('#248: validation rejects exactly one of the pair', () => {
    const bothEmpty = light.validateBranchState({ ...branchState, latitude: '', longitude: '' });
    expect(bothEmpty.latitude).toBeUndefined();
    const oneOnly = light.validateBranchState({ ...branchState, latitude: '14.1', longitude: '' });
    expect(oneOnly.latitude).toBeDefined();
    expect(oneOnly.longitude).toBeUndefined();
  });

  it('#248: validation rejects a non-numeric entry', () => {
    const errors = light.validateBranchState({
      ...branchState,
      latitude: 'not a number',
      longitude: '0',
    });
    expect(errors.latitude).toBeDefined();
  });

  it('#248: the flip payload re-sends the stored coordinates untouched', () => {
    const payload = light.buildBranchFlipPayload(
      { ...branch, latitude: 7.0864, longitude: 125.591 },
      false
    );
    expect(payload.latitude).toBe(7.0864);
    expect(payload.longitude).toBe(125.591);
  });

  // #273: the Maps link fields — state strings ('' = clear to null), the
  // https-transport validation mirror (no host allowlist), and the flip's
  // untouched re-send. The #248 coordinate pins above stay green: the
  // lat/lng state/payload code is dormant, not removed.
  it('#273: state round-trips stored maps links as strings', () => {
    const state = light.branchStateFromRead({
      ...branch,
      googleMapsUrl: 'https://maps.app.goo.gl/main',
      appleMapsUrl: 'https://maps.apple.com/?q=main',
    });
    expect(state.googleMapsUrl).toBe('https://maps.app.goo.gl/main');
    expect(state.appleMapsUrl).toBe('https://maps.apple.com/?q=main');
  });

  it('#273: null links round-trip as empty strings (the clear encoding)', () => {
    const state = light.branchStateFromRead({ ...branch, googleMapsUrl: null, appleMapsUrl: null });
    expect(state.googleMapsUrl).toBe('');
    expect(state.appleMapsUrl).toBe('');
  });

  it('#273: the create payload parses https links to strings; empty inputs save null (clear)', () => {
    const linked = light.buildBranchCreatePayload({
      ...branchState,
      googleMapsUrl: 'https://maps.app.goo.gl/new',
      appleMapsUrl: 'https://maps.apple.com/?q=new',
    });
    expect(linked.googleMapsUrl).toBe('https://maps.app.goo.gl/new');
    expect(linked.appleMapsUrl).toBe('https://maps.apple.com/?q=new');
    const cleared = light.buildBranchCreatePayload({
      ...branchState,
      googleMapsUrl: '',
      appleMapsUrl: '',
    });
    expect(cleared.googleMapsUrl).toBeNull();
    expect(cleared.appleMapsUrl).toBeNull();
  });

  it('#273: the update payload parses https links to strings; empty inputs save null (clear)', () => {
    const linked = light.buildBranchUpdatePayload({
      ...branchState,
      googleMapsUrl: 'https://maps.app.goo.gl/edited',
      appleMapsUrl: 'https://maps.apple.com/?q=edited',
    });
    expect(linked.googleMapsUrl).toBe('https://maps.app.goo.gl/edited');
    expect(linked.appleMapsUrl).toBe('https://maps.apple.com/?q=edited');
    const cleared = light.buildBranchUpdatePayload({
      ...branchState,
      googleMapsUrl: '',
      appleMapsUrl: '',
    });
    expect(cleared.googleMapsUrl).toBeNull();
    expect(cleared.appleMapsUrl).toBeNull();
  });

  it('#273: validation rejects an http:// link — https transport only, no host allowlist', () => {
    const errors = light.validateBranchState({
      ...branchState,
      googleMapsUrl: 'http://maps.app.goo.gl/x',
    });
    expect(errors.googleMapsUrl).toBe('Google Maps URL must be an https URL.');
  });

  it('#273: validation rejects a non-URL entry with an inline error', () => {
    const errors = light.validateBranchState({ ...branchState, appleMapsUrl: 'not a url' });
    expect(errors.appleMapsUrl).toBe('Apple Maps URL must be a valid URL.');
  });

  it('#273: an empty link is valid (clear)', () => {
    const errors = light.validateBranchState({
      ...branchState,
      googleMapsUrl: '',
      appleMapsUrl: '',
    });
    expect(errors.googleMapsUrl).toBeUndefined();
    expect(errors.appleMapsUrl).toBeUndefined();
  });

  it('#273: the flip payload re-sends the stored links untouched (null stays null)', () => {
    const payload = light.buildBranchFlipPayload(
      {
        ...branch,
        googleMapsUrl: 'https://maps.app.goo.gl/main',
        appleMapsUrl: null,
      },
      false
    );
    expect(payload.googleMapsUrl).toBe('https://maps.app.goo.gl/main');
    expect(payload.appleMapsUrl).toBeNull();
  });

  it('studio-service payload round-trip and flip', () => {
    const state = light.studioServiceStateFromRead(service);
    expect(light.buildStudioServicePayload(state)).toEqual({
      name: 'Hair & Makeup',
      description: 'On-location styling.',
      priceCents: 150000,
      isActive: true,
    });
    expect(light.buildStudioServiceFlipPayload(service, false)).toEqual({
      name: 'Hair & Makeup',
      description: 'On-location styling.',
      priceCents: 150000,
      isActive: false,
    });
  });

  it('buildBranchMatrixPayload is the {branchIds} full-replace in the state order', () => {
    const state = { ...light.studioServiceStateFromRead(service), branchIds: [uuid(3), uuid(1)] };
    expect(light.buildBranchMatrixPayload(state)).toEqual({ branchIds: [uuid(3), uuid(1)] });
  });

  it('addon state starts empty applies-to (the bare read embeds none); payload + flip round-trip', () => {
    const addon = addonServiceSchema.parse({
      id: uuid(4),
      name: 'Rush delivery',
      description: '48h turnaround.',
      priceCents: 50000,
      isActive: true,
      createdAt: STAMP,
      updatedAt: STAMP,
    });
    const state = light.addonStateFromRead(addon);
    expect(state.appliesToServiceIds).toEqual([]);
    expect(light.buildAddonPayload(state)).toEqual({
      name: 'Rush delivery',
      description: '48h turnaround.',
      priceCents: 50000,
      isActive: true,
    });
    // The flip carries the 4 entity fields ONLY — `appliesToServiceIds` is
    // display-only editor state, untouched by this PUT (the applicability
    // write path is the service-keyed `buildAddonMatrixDiff`). Brief
    // deviation: the pinned `{ ...state, isActive: false }` spread dragged
    // the display-only field into the expected payload, contradicting the
    // `UpdateAddonServiceInput` type and the green-immediately law.
    expect(light.buildAddonFlipPayload(addon, false)).toEqual({
      name: 'Rush delivery',
      description: '48h turnaround.',
      priceCents: 50000,
      isActive: false,
    });
  });

  it('buildAddonMatrixDiff emits absolute-set payloads ONLY for services whose applicability changes (AQ-1)', () => {
    const other = studioServiceWithBranchesSchema.parse({
      ...service,
      id: uuid(5),
      name: 'Extra look',
      applicableAddonServiceIds: [uuid(4)],
    });
    // desired: service gains the addon; other neither wants nor has it →
    // only service diffs.
    const diff = light.buildAddonMatrixDiff([service, other], uuid(6), [
      uuid(6),
      uuid(4),
      service.id,
    ]);
    expect(diff).toEqual([
      { serviceId: service.id, payload: { addonServiceIds: [uuid(4), uuid(6)] } },
    ]);
    // desired: neither has it anywhere → removals are absolute sets too.
    const removal = light.buildAddonMatrixDiff([service], uuid(4), []);
    expect(removal).toEqual([{ serviceId: service.id, payload: { addonServiceIds: [] } }]);
  });

  it('validators flag blank required fields per entity', () => {
    expect(light.validateBranchState(light.newBranchState())).toMatchObject({
      name: expect.any(String),
      address: expect.any(String),
      phone: expect.any(String),
    });
    expect(light.validateStudioServiceState(light.newStudioServiceState()).name).toBeTruthy();
    expect(light.validateAddonState(light.newAddonState()).name).toBeTruthy();
    expect(light.validateBranchState(light.branchStateFromRead(branch))).toEqual({});
  });

  it('testimonial/print-size/attire state, payload, and flip round-trips', () => {
    const testimonial = testimonialSchema.parse({
      id: uuid(7),
      quote: 'They made us look timeless.',
      person: 'The Santiagos',
      position: 1,
      isActive: true,
      createdAt: STAMP,
      updatedAt: STAMP,
    });
    expect(light.testimonialStateFromRead(testimonial)).toEqual({
      quote: 'They made us look timeless.',
      person: 'The Santiagos',
      isActive: true,
    });
    expect(light.buildTestimonialFlipPayload(testimonial, false)).toEqual({
      quote: 'They made us look timeless.',
      person: 'The Santiagos',
      isActive: false,
    });

    const size = printSizeSchema.parse({
      id: uuid(8),
      code: '8R',
      description: '8R print',
      isActive: true,
      createdAt: STAMP,
      updatedAt: STAMP,
    });
    expect(light.printSizeStateFromRead(size)).toEqual({
      code: '8R',
      description: '8R print',
      isActive: true,
    });
    expect(light.buildPrintSizeFlipPayload(size, false)).toEqual({
      code: '8R',
      description: '8R print',
      isActive: false,
    });

    const attire = attireSchema.parse({
      id: uuid(1),
      name: 'Toga',
      isActive: true,
      createdAt: STAMP,
      updatedAt: STAMP,
    });
    expect(light.attireStateFromRead(attire)).toEqual({ name: 'Toga', isActive: true });
    expect(light.buildAttireFlipPayload(attire, false)).toEqual({ name: 'Toga', isActive: false });
  });

  it('conflictFieldErrors re-exports the package-editor mapping (one implementation, two seams)', async () => {
    const pkg = await import('./package-editor-state');
    expect(light.conflictFieldErrors).toBe(pkg.conflictFieldErrors);
  });
});

describe('unpriced editors (ADR-0020)', () => {
  // The add-on fixture (the file's other price-bearing row) is parsed inline
  // inside the round-trip test above — re-parsed here, describe-local.
  const addon = addonServiceSchema.parse({
    id: uuid(4),
    name: 'Rush delivery',
    description: '48h turnaround.',
    priceCents: 50000,
    isActive: true,
    createdAt: STAMP,
    updatedAt: STAMP,
  });

  it('studio-service: an unpriced read opens unchecked with an empty entry; the payload saves null', () => {
    const state = light.studioServiceStateFromRead({ ...service, priceCents: null });
    expect(state.hasPrice).toBe(false);
    expect(Number.isNaN(state.priceCents)).toBe(true);
    expect(light.buildStudioServicePayload(state).priceCents).toBeNull();
  });

  it('studio-service: create defaults unchecked (owner ruling 2026-10-12) — the fresh payload saves null', () => {
    expect(light.newStudioServiceState().hasPrice).toBe(false);
    expect(light.buildStudioServicePayload(light.newStudioServiceState()).priceCents).toBeNull();
  });

  it('studio-service: validation demands entry when checked, skips the price entirely when unchecked', () => {
    const checkedEmpty = light.validateStudioServiceState({
      ...light.newStudioServiceState(),
      name: 'n',
      description: 'd',
      hasPrice: true,
    });
    expect(checkedEmpty.price).toBe('Enter a valid price.');
    expect(light.validateStudioServiceState(light.newStudioServiceState()).price).toBeUndefined();
  });

  it('addon: an unpriced read opens unchecked; create defaults unchecked; both payloads save null', () => {
    const state = light.addonStateFromRead({ ...addon, priceCents: null });
    expect(state.hasPrice).toBe(false);
    expect(light.buildAddonPayload(state).priceCents).toBeNull();
    expect(light.newAddonState().hasPrice).toBe(false);
    expect(light.buildAddonPayload(light.newAddonState()).priceCents).toBeNull();
  });

  it('addon: validation demands entry when checked, skips the price when unchecked', () => {
    const checkedEmpty = light.validateAddonState({
      ...light.newAddonState(),
      name: 'n',
      description: 'd',
      hasPrice: true,
    });
    expect(checkedEmpty.price).toBe('Enter a valid price.');
    expect(light.validateAddonState(light.newAddonState()).price).toBeUndefined();
  });

  it('the table flip payloads carry row.priceCents verbatim — null stays null, never a 0', () => {
    expect(
      light.buildStudioServiceFlipPayload({ ...service, priceCents: null }, false).priceCents
    ).toBeNull();
    expect(
      light.buildAddonFlipPayload({ ...addon, priceCents: null }, false).priceCents
    ).toBeNull();
  });
});
