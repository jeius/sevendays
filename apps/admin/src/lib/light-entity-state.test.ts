import {
  addonServiceSchema,
  attireSchema,
  branchSchema,
  printSizeSchema,
  studioServiceWithBranchesSchema,
  testimonialSchema,
} from '@sevendays/types';
import { describe, expect, it } from 'vitest';
// biome-ignore lint/performance/noNamespaceImport: the plan pins the `light.*` namespace handle for this seam suite
import * as light from './light-entity-state';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const STAMP = '2026-08-31T00:00:00.000Z';

const branch = branchSchema.parse({
  id: uuid(1),
  name: 'Main Studio',
  address: '12 Sample St.',
  phone: '+63 900 000 0001',
  acceptsWalkIns: true,
  isActive: true,
  createdAt: STAMP,
  updatedAt: STAMP,
});

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

  it('branch state/payload round-trip; the flip carries every field with ONLY isActive flipped', () => {
    const state = light.branchStateFromRead(branch);
    expect(state).toEqual({
      name: 'Main Studio',
      address: '12 Sample St.',
      phone: '+63 900 000 0001',
      acceptsWalkIns: true,
      isActive: true,
    });
    expect(light.buildBranchPayload(state)).toEqual({
      name: 'Main Studio',
      address: '12 Sample St.',
      phone: '+63 900 000 0001',
      acceptsWalkIns: true,
      isActive: true,
    });
    expect(light.buildBranchFlipPayload(branch, false)).toEqual({ ...state, isActive: false });
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
