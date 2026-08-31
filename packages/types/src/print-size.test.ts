import { describe, expect, it } from 'vitest';
import { createPrintSizeSchema, printSizeSchema } from './print-size.js';

const UUID = '00000000-0000-4000-8000-000000000000';

describe('printSizeSchema', () => {
  it('parses a full row (dates coerce from strings)', () => {
    const result = printSizeSchema.safeParse({
      id: UUID,
      code: '8R',
      description:
        'Nominal same physical size as 8x10; kept as a separate row pending client confirmation.',
      createdAt: '2026-08-31T00:00:00.000Z',
      updatedAt: '2026-08-31T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty code', () => {
    const result = createPrintSizeSchema.safeParse({ code: '', description: 'loose 2R prints' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing description', () => {
    const result = createPrintSizeSchema.safeParse({ code: '2R' });
    expect(result.success).toBe(false);
  });
});
