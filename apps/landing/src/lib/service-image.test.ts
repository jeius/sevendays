// The service-card photography precedence (#333, spec #330 §6): a stored
// cover wins; the name-matched stand-ins are the DOCUMENTED NO-COVER
// FALLBACK (owner ruling at charting, map #324 — the home stays
// photo-led with zero admin work). Pinned so a future "swap the
// stand-ins" or "change the precedence" edit moves the seam and the
// suite together.
import type { StudioServiceWithBranches } from '@sevendays/types';
import { describe, expect, it } from 'vitest';
import { serviceImage } from './service-image';

// The wire only yields `string | null` (the Zod-parsed read); the widened
// param exists so the absent-field pin can name `undefined` explicitly —
// that pin is the helper's own defensive ?? contract, not a wire state.
const s = (name: string, coverImageUrl: string | null | undefined = null) =>
  ({ name, coverImageUrl }) as Pick<StudioServiceWithBranches, 'name' | 'coverImageUrl'>;

describe('serviceImage (#333 — cover-first precedence, the documented fallback)', () => {
  it('a stored cover wins — the resolved URL renders verbatim', () => {
    expect(serviceImage(s('Photo Recovery', 'https://pub-test.r2.dev/covers/aaaa.jpg'))).toBe(
      'https://pub-test.r2.dev/covers/aaaa.jpg'
    );
  });

  it('a null cover falls back to the name-matched stand-in', () => {
    expect(serviceImage(s('Photo Recovery'))).toBe('/photos/service-recovery.jpg');
    expect(serviceImage(s('Picture Framing'))).toBe('/photos/service-framing.jpg');
  });

  it('an absent cover falls back too — ?? treats undefined like null (the defensive pin)', () => {
    expect(serviceImage(s('Picture Framing', undefined))).toBe('/photos/service-framing.jpg');
  });

  it('every documented stand-in still resolves — the four seeded names + the default', () => {
    expect(serviceImage(s('Photo Recovery'))).toBe('/photos/service-recovery.jpg');
    expect(serviceImage(s('Tarpaulin & Bulletin Printing'))).toBe('/photos/service-printing.jpg');
    expect(serviceImage(s('Portraits & ID Photo'))).toBe('/photos/service-id.jpg');
    expect(serviceImage(s('Picture Framing'))).toBe('/photos/service-framing.jpg');
    expect(serviceImage(s('Something Not Seeded'))).toBe('/photos/cover-portrait.jpg');
  });
});
