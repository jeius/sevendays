// #245: the envelope-unwrap seam. ApiClientError.details is the parsed
// apiErrorSchema ENVELOPE ({ error, details? }); the result-value channel's
// consumers (conflictFieldErrors, fieldErrorsFromDetails, blockerLines) want
// the INNER details array. These tests pin the unwrapped shape the server fns
// must carry across the RPC boundary.
import { describe, expect, it } from 'vitest';
import { envelopeDetails } from './api-envelope';
import { conflictFieldErrors } from './package-editor-state';

const conflictEnvelope = {
  error: 'Validation failed',
  details: [{ path: ['name'], message: 'A studio service with this name already exists.' }],
};

describe('envelopeDetails (#245)', () => {
  it('returns the inner details array from a conflict envelope', () => {
    expect(envelopeDetails(conflictEnvelope)).toBe(conflictEnvelope.details);
  });

  it('yields undefined for an envelope with no details key (curated 503 / non-JSON stub)', () => {
    expect(envelopeDetails({ error: 'Media uploads are not configured.' })).toBeUndefined();
    expect(envelopeDetails({ error: 'Non-JSON error response' })).toBeUndefined();
  });

  it('yields undefined for non-object input (defensive — details? is optional on the wire)', () => {
    expect(envelopeDetails(undefined)).toBeUndefined();
    expect(envelopeDetails(null)).toBeUndefined();
    expect(envelopeDetails('nope')).toBeUndefined();
  });

  it('passes a details value of any shape through untouched (validation is conflictFieldErrors’ job)', () => {
    const inner = { anything: true };
    expect(envelopeDetails({ error: 'x', details: inner })).toBe(inner);
  });

  it('composes with conflictFieldErrors: the unwrapped envelope maps, the raw one does not', () => {
    expect(conflictFieldErrors(envelopeDetails(conflictEnvelope))).toEqual({
      name: 'A studio service with this name already exists.',
    });
    // The raw-envelope degradation this ticket retires — pinned so it cannot return:
    expect(conflictFieldErrors(conflictEnvelope)).toEqual({});
  });
});
