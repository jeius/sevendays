// The internal send endpoint's wire schema (M7 #221, ADR-0021): the admin
// forwards exactly { to, url } — the recipient and BetterAuth's built token
// URL. Internal Worker-to-Worker machinery, not a public /api/v1 contract
// (ADR-0006 wraps that surface; this rides ADR-0016's transport), but the
// same validate-external-input-with-Zod law applies, so the schema lives
// here with the rest of the wire vocabulary.

import { describe, expect, it } from 'vitest';
import { resetEmailSendSchema } from './reset-email.js';

describe('resetEmailSendSchema (M7 #221)', () => {
  it('parses { to, url, name } and strips unknown keys on the parsed output', () => {
    const parsed = resetEmailSendSchema.parse({
      to: 'owner@sevendays.ph',
      url: 'https://admin.example.workers.dev/api/auth/reset-password/tok?callbackURL=%2Flogin%2Freset',
      name: 'Test Owner',
      extra: 'stripped',
    });
    expect(parsed).toEqual({
      to: 'owner@sevendays.ph',
      url: 'https://admin.example.workers.dev/api/auth/reset-password/tok?callbackURL=%2Flogin%2Freset',
      name: 'Test Owner',
    });
  });

  it('rejects a non-email to', () => {
    expect(
      resetEmailSendSchema.safeParse({ to: 'not-an-email', url: 'https://x.dev/t', name: 'A' })
        .success
    ).toBe(false);
  });

  it('rejects a non-url url', () => {
    expect(
      resetEmailSendSchema.safeParse({ to: 'a@b.ph', url: 'not-a-url', name: 'A' }).success
    ).toBe(false);
  });
});
