import { describe, expect, it } from 'vitest';
import { apiErrorSchema } from './api-error.js';

describe('apiErrorSchema', () => {
  it('parses a minimal error', () => {
    expect(apiErrorSchema.safeParse({ error: 'Unknown branchId.' }).success).toBe(true);
  });
  it('parses an error with details', () => {
    expect(
      apiErrorSchema.safeParse({
        error: 'Invalid payload.',
        details: [{ path: ['customerEmail'] }],
      }).success
    ).toBe(true);
  });
  it('rejects an empty error string', () => {
    expect(apiErrorSchema.safeParse({ error: '' }).success).toBe(false);
  });
  it('rejects a missing error field', () => {
    expect(apiErrorSchema.safeParse({}).success).toBe(false);
  });
});
