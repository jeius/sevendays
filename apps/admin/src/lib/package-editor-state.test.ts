import type { Attire, ServicePackageRead } from '@sevendays/types';
import { servicePackageReadSchema } from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import {
  buildCreatePayload,
  buildRowFlipPayload,
  buildUpdatePayload,
  conflictFieldErrors,
  durationFromInput,
  editorStateFromRead,
  newEditorState,
  quantityFromInput,
  tokenFor,
  validateEditorState,
} from './package-editor-state';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const STAMP = '2026-08-31T00:00:00.000Z';

const attires: Attire[] = [
  {
    id: uuid(1),
    name: 'Toga',
    isActive: true,
    createdAt: new Date(STAMP),
    updatedAt: new Date(STAMP),
  },
  {
    id: uuid(2),
    name: 'Filipiniana',
    isActive: true,
    createdAt: new Date(STAMP),
    updatedAt: new Date(STAMP),
  },
];

// Parsed through the real schema so a shape drift fails HERE, loudly.
// Overrides are typed as the schema's INPUT (z.coerce.date accepts string stamps);
// ServicePackageRead's Date fields are the parse OUTPUT.
function read(
  overrides: Partial<z.input<typeof servicePackageReadSchema>> = {}
): ServicePackageRead {
  return servicePackageReadSchema.parse({
    id: uuid(10),
    name: 'Basic Package',
    description: 'Entry graduation portrait package.',
    priceCents: 90000,
    durationMinutes: null,
    isActive: true,
    isFeatured: false,
    slug: 'basic-package',
    coverImageUrl: null,
    createdAt: STAMP,
    updatedAt: STAMP,
    frames: [{ id: uuid(11), frameNumber: 1 }],
    inclusions: [
      {
        id: uuid(12),
        kind: 'framed_picture',
        quantity: 1,
        frameId: uuid(11),
        description: null,
        createdAt: STAMP,
        updatedAt: STAMP,
        printSize: { id: uuid(13), code: '8R', description: '8R print' },
        attires: [{ id: uuid(1), name: 'Toga' }],
      },
    ],
    ...overrides,
  });
}

describe('editorStateFromRead', () => {
  it('maps the read: frames echo uuid tokens, framed_picture maps frameId → frameToken, raw-string quantity/duration, coverImageKey undefined', () => {
    const state = editorStateFromRead(read());
    expect(state.name).toBe('Basic Package');
    expect(state.priceCents).toBe(90000);
    expect(state.durationInput).toBe('');
    expect(state.slug).toBe('basic-package');
    expect(state.coverImageUrl).toBeNull();
    expect(state.coverImageKey).toBeUndefined();
    expect(state.frames).toEqual([{ token: uuid(11) }]);
    expect(state.inclusions).toHaveLength(1);
    expect(state.inclusions[0]).toMatchObject({
      key: uuid(12),
      kind: 'framed_picture',
      quantityInput: '1',
      printSizeId: uuid(13),
      frameToken: uuid(11),
      attireIds: [uuid(1)],
      description: '',
    });
  });

  it('a numeric duration maps to its raw-string view; privilege rows carry no frameToken', () => {
    const state = editorStateFromRead(
      read({
        durationMinutes: 45,
        frames: [],
        inclusions: [
          {
            id: uuid(14),
            kind: 'privilege',
            quantity: null,
            frameId: null,
            description: 'Studio rights',
            createdAt: STAMP,
            updatedAt: STAMP,
            printSize: null,
            attires: [],
          },
        ],
      })
    );
    expect(state.durationInput).toBe('45');
    expect(state.inclusions[0]).toMatchObject({
      kind: 'privilege',
      quantityInput: '',
      frameToken: null,
      description: 'Studio rights',
    });
  });
});

describe('buildCreatePayload', () => {
  it('serializes frames and inclusions in ARRAY order; frameId only on framed_picture; attireIds pinned to the lookup order filtered to membership', () => {
    const state = {
      ...newEditorState(),
      name: 'Deluxe',
      description: 'The full set.',
      priceCents: 150000,
      frames: [{ token: 'frame-b' }, { token: 'frame-a' }],
      inclusions: [
        {
          key: 'k1',
          kind: 'framed_picture' as const,
          quantityInput: '1',
          printSizeId: uuid(13),
          frameToken: 'frame-b',
          attireIds: [uuid(2), uuid(1)],
          description: '',
        },
        {
          key: 'k2',
          kind: 'privilege' as const,
          quantityInput: '',
          printSizeId: null,
          frameToken: null,
          attireIds: [],
          description: 'Studio rights',
        },
      ],
    };
    const payload = buildCreatePayload(state, attires);
    expect(payload.frames).toEqual([{ id: 'frame-b' }, { id: 'frame-a' }]);
    expect(payload.inclusions).toEqual([
      {
        kind: 'framed_picture',
        quantity: 1,
        printSizeId: uuid(13),
        frameId: 'frame-b',
        attireIds: [uuid(1), uuid(2)],
        description: null,
      },
      {
        kind: 'privilege',
        quantity: null,
        printSizeId: null,
        attireIds: [],
        description: 'Studio rights',
      },
    ]);
    // The privilege row carries NO frameId key at all (not merely null).
    const privilegeRow = payload.inclusions[1];
    expect(privilegeRow).toBeDefined();
    expect(privilegeRow && 'frameId' in privilegeRow).toBe(false);
    expect(payload.coverImageKey).toBeUndefined();
  });

  it('includes coverImageKey ONLY when the state carries a fresh staging-key string', () => {
    const state = { ...newEditorState(), coverImageKey: 'tmp/fresh.jpg' };
    expect(buildCreatePayload(state, attires).coverImageKey).toBe('tmp/fresh.jpg');
    expect(
      buildCreatePayload({ ...state, coverImageKey: null }, attires).coverImageKey
    ).toBeUndefined();
  });
});

describe('buildUpdatePayload', () => {
  it('adds slug and honors the three-state cover encoding: absent / null-clear / string-bind', () => {
    const base = { ...newEditorState(), slug: 'deluxe' };
    const absent = buildUpdatePayload(base, attires);
    expect('coverImageKey' in absent).toBe(false);
    expect(absent.slug).toBe('deluxe');
    expect(buildUpdatePayload({ ...base, coverImageKey: null }, attires).coverImageKey).toBeNull();
    expect(buildUpdatePayload({ ...base, coverImageKey: 'tmp/x.jpg' }, attires).coverImageKey).toBe(
      'tmp/x.jpg'
    );
  });
});

describe('buildRowFlipPayload', () => {
  it('reshapes the read into the full update payload with ONLY isActive flipped and coverImageKey absent', () => {
    const row = read();
    const payload = buildRowFlipPayload(row, false);
    expect(payload.isActive).toBe(false);
    expect(payload.name).toBe(row.name);
    expect(payload.slug).toBe(row.slug);
    expect(payload.priceCents).toBe(row.priceCents);
    expect(payload.frames).toEqual([{ id: uuid(11) }]);
    expect(payload.inclusions[0]).toMatchObject({
      kind: 'framed_picture',
      frameId: uuid(11),
      attireIds: [uuid(1)],
    });
    expect('coverImageKey' in payload).toBe(false);
  });
});

describe('input mappers', () => {
  it('quantityFromInput: empty → null; else the Number (0/NaN stay for validation)', () => {
    expect(quantityFromInput('')).toBeNull();
    expect(quantityFromInput('2')).toBe(2);
    expect(quantityFromInput('abc')).toBeNaN();
  });

  it('durationFromInput: empty / NaN / <= 0 → null; a positive integer maps through', () => {
    expect(durationFromInput('')).toBeNull();
    expect(durationFromInput('x')).toBeNull();
    expect(durationFromInput('0')).toBeNull();
    expect(durationFromInput('-5')).toBeNull();
    expect(durationFromInput('45')).toBe(45);
  });

  it('durationFromInput maps a non-integer to null — the schema demands a positive int, the catalog has no durations (TDD #143 sweep)', () => {
    expect(durationFromInput('45.5')).toBeNull();
    expect(durationFromInput('45.0')).toBe(45);
  });

  it('tokenFor echoes an existing token; null mints a fresh uuid', () => {
    expect(tokenFor('frame-1')).toBe('frame-1');
    const minted = tokenFor(null);
    expect(minted).toMatch(/^[0-9a-f-]{36}$/);
    expect(tokenFor(null)).not.toBe(minted);
  });
});

describe('validateEditorState', () => {
  it('a valid state returns no errors and an empty inclusions record', () => {
    const state = {
      ...newEditorState(),
      name: 'Deluxe',
      description: 'The full set.',
      priceCents: 150000,
      frames: [{ token: 'f1' }],
      inclusions: [
        {
          key: 'k1',
          kind: 'framed_picture' as const,
          quantityInput: '1',
          printSizeId: uuid(13),
          frameToken: 'f1',
          attireIds: [uuid(1)],
          description: '',
        },
      ],
    };
    expect(validateEditorState(state)).toEqual({ inclusions: {} });
  });

  it('blank name/description and a negative price flag their slots', () => {
    const errors = validateEditorState({ ...newEditorState(), priceCents: -1 });
    expect(errors.name).toBe('Name is required.');
    expect(errors.description).toBe('Description is required.');
    expect(errors.price).toBe('Enter a price of zero or more.');
  });

  it('row rules: picture kinds need attires; framed needs a token; privileges need a description; quantities are positive whole numbers', () => {
    const state = {
      ...newEditorState(),
      name: 'n',
      description: 'd',
      inclusions: [
        {
          key: 'k1',
          kind: 'print' as const,
          quantityInput: '0',
          printSizeId: uuid(13),
          frameToken: null,
          attireIds: [],
          description: '',
        },
        {
          key: 'k2',
          kind: 'framed_picture' as const,
          quantityInput: 'x',
          printSizeId: null,
          frameToken: '',
          attireIds: [uuid(1)],
          description: '',
        },
        {
          key: 'k3',
          kind: 'privilege' as const,
          quantityInput: '',
          printSizeId: null,
          frameToken: null,
          attireIds: [],
          description: '  ',
        },
      ],
    };
    const errors = validateEditorState(state);
    expect(errors.inclusions.k1).toMatchObject({
      quantity: 'Enter a positive whole number.',
      attires: 'Pick at least one attire.',
    });
    expect(errors.inclusions.k2).toMatchObject({
      quantity: 'Enter a positive whole number.',
      frameToken: 'framed pictures need a frame',
    });
    expect(errors.inclusions.k3).toMatchObject({ description: 'Privileges need a description.' });
  });

  it('a non-integer priceCents flags the price slot (the schema is int-nonnegative; TDD #143 sweep)', () => {
    const errors = validateEditorState({
      ...newEditorState(),
      name: 'n',
      description: 'd',
      priceCents: 19950.5,
    });
    expect(errors.price).toBe('Enter whole centavos.');
  });

  it('a framed_picture whose frameToken is not among frames[] flags the row (schema parity with refinePackageSave; TDD #143 sweep)', () => {
    const state = {
      ...newEditorState(),
      name: 'n',
      description: 'd',
      frames: [{ token: 'f1' }],
      inclusions: [
        {
          key: 'k1',
          kind: 'framed_picture' as const,
          quantityInput: '1',
          printSizeId: uuid(13),
          frameToken: 'f-gone',
          attireIds: [uuid(1)],
          description: '',
        },
      ],
    };
    const errors = validateEditorState(state);
    expect(errors.inclusions.k1).toMatchObject({ frameToken: 'framed pictures need a frame' });
  });
});

describe('conflictFieldErrors', () => {
  it('narrows the AdminDetail array into a flat first-segment map; later entries overwrite', () => {
    expect(
      conflictFieldErrors([
        { path: ['name'], message: 'already exists' },
        { path: ['inclusions', 0, 'printSizeId'], message: 'unknown size' },
        { path: ['name'], message: 'last wins' },
      ])
    ).toEqual({ name: 'last wins', inclusions: 'unknown size' });
  });

  it('anything non-conforming returns {} so the caller toasts instead', () => {
    expect(conflictFieldErrors('nope')).toEqual({});
    expect(conflictFieldErrors([{ path: 'name', message: 'x' }])).toEqual({});
    expect(conflictFieldErrors([{ path: [], message: 'x' }])).toEqual({});
    expect(conflictFieldErrors([{ path: ['name'] }])).toEqual({});
    expect(conflictFieldErrors([null])).toEqual({});
  });
});
