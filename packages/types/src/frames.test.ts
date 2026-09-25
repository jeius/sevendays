import { describe, expect, it } from 'vitest';
import { frameSchema } from './frames.js';

const UUID = '00000000-0000-4000-8000-000000000000';

describe('frameSchema', () => {
  it('parses a frame row', () => {
    const result = frameSchema.safeParse({
      id: UUID,
      servicePackageId: UUID,
      frameNumber: 1,
    });
    expect(result.success).toBe(true);
  });

  it('rejects frameNumber 0 and negatives', () => {
    for (const n of [0, -1]) {
      const result = frameSchema.safeParse({
        id: UUID,
        servicePackageId: UUID,
        frameNumber: n,
      });
      expect(result.success).toBe(false);
    }
  });
});
