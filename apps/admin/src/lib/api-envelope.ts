// #245: the envelope-unwrap seam, extracted so the server-fn error paths
// (runAdminAction + the inline catches in admin.functions.ts) share ONE
// implementation. ApiClientError.details is the parsed apiErrorSchema
// ENVELOPE ({ error, details? } — packages/types; unwrap.ts:39 pins that it
// is ALWAYS the envelope, with the non-JSON stub { error: 'Non-JSON error
// response' } as the only other shape); the result-value channel's consumers
// (conflictFieldErrors, fieldErrorsFromDetails, blockerLines in the delete
// dialogs) want the INNER details array.
/**
 * Narrows `ApiClientError.details` (the parsed error envelope) to the inner
 * `details`. An envelope without a `details` key (curated 503s, the non-JSON
 * stub) yields `undefined`. Never validates the inner shape — the mappers
 * downstream own that.
 */
export function envelopeDetails(errorDetails: unknown): unknown {
  if (typeof errorDetails !== 'object' || errorDetails === null) {
    return undefined;
  }
  return (errorDetails as { details?: unknown }).details;
}
