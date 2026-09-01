import { zValidator } from '@hono/zod-validator';
import type { ZodSchema } from 'zod';

// Uniform-error validator hook (Q4): Zod failures emit { error, details }
// with per-field details, not zValidator's default shape.
export const validated = <S extends ZodSchema>(schema: S, target: 'json' | 'query') =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: 'Invalid request payload.',
          details: result.error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          })),
        },
        400
      );
    }
  });
