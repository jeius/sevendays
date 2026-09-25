import { describe, expect, it } from 'vitest';
import {
  AdminSaveError,
  conflict,
  guardUnique,
  invalidRefs,
  uniqueViolation,
} from './admin-shared.js';

const pgDuplicate = (constraint: string) =>
  new Error(`Failed query: insert into "t"`, {
    cause: new Error(`duplicate key value violates unique constraint "${constraint}"`),
  });

describe('uniqueViolation', () => {
  it('maps a wrapped 23505 through the constraint map to the payload field', () => {
    const failure = uniqueViolation(pgDuplicate('branches_name_unique'), {
      branches_name_unique: 'name',
    });
    expect(failure).toEqual({
      ok: false,
      reason: 'conflict',
      message: 'That value is already in use.',
      details: [{ path: ['name'], message: 'already in use' }],
    });
  });

  it('returns null for a non-unique driver error (rethrow territory)', () => {
    const err = new Error('Failed query: insert', {
      cause: new Error('null value in column violates not-null'),
    });
    expect(uniqueViolation(err, { branches_name_unique: 'name' })).toBeNull();
  });

  it('returns null for an unmapped constraint (never a guessed field)', () => {
    expect(
      uniqueViolation(pgDuplicate('some_other_unique'), { branches_name_unique: 'name' })
    ).toBeNull();
  });
});

describe('conflict / invalidRefs', () => {
  it('conflict names the field that clashed', () => {
    expect(conflict('slug')).toEqual({
      ok: false,
      reason: 'conflict',
      message: 'That value is already in use.',
      details: [{ path: ['slug'], message: 'already in use' }],
    });
  });

  it('invalidRefs carries reason invalid with caller details', () => {
    const failure = invalidRefs('Unknown branch in branchIds.', [
      { path: ['branchIds'], message: 'unknown id x' },
    ]);
    expect(failure.reason).toBe('invalid');
    expect(failure.message).toBe('Unknown branch in branchIds.');
    expect(failure.details).toEqual([{ path: ['branchIds'], message: 'unknown id x' }]);
  });
});

describe('guardUnique', () => {
  it('passes the write through on success', async () => {
    const result = await guardUnique({}, async () => 42);
    expect(result).toEqual({ ok: true, row: 42 });
  });

  it('maps a 23505 from the write to the conflict failure', async () => {
    const result = await guardUnique({ attires_name_unique: 'name' }, async () => {
      throw pgDuplicate('attires_name_unique');
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('conflict');
    expect(result.details).toEqual([{ path: ['name'], message: 'already in use' }]);
  });

  it('rethrows anything that is not a mapped unique violation', async () => {
    await expect(
      guardUnique({}, async () => {
        throw new Error('connection refused');
      })
    ).rejects.toThrow('connection refused');
  });
});

describe('AdminSaveError', () => {
  it('carries the failure payload and a message', () => {
    const error = new AdminSaveError(conflict('name'));
    expect(error.name).toBe('AdminSaveError');
    expect(error.message).toBe('That value is already in use.');
    expect(error.failure.reason).toBe('conflict');
  });

  it('is thrown (not returned) — the transaction-rollback channel', async () => {
    await expect(
      (async () => {
        throw new AdminSaveError(invalidRefs('bad', []));
      })()
    ).rejects.toBeInstanceOf(AdminSaveError);
  });
});
