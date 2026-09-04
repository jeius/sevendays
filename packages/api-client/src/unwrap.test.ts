import { describe, expect, it } from 'vitest';
import { ZodError, z } from 'zod';
import { ApiClientError } from './error.js';
import { unwrap } from './unwrap.js';

const schema = z.object({ name: z.string() });

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('unwrap', () => {
  it('returns the parsed payload on 2xx', async () => {
    const result = await unwrap(jsonResponse({ name: 'Main' }), schema);
    expect(result).toEqual({ name: 'Main' });
  });

  it('throws ApiClientError with status + parsed envelope on non-2xx', async () => {
    const err = await unwrap(
      jsonResponse({ error: 'Unknown branchId.', details: ['x'] }, 400),
      schema
    ).catch((e) => e);
    expect(err).toBeInstanceOf(ApiClientError);
    expect((err as ApiClientError).status).toBe(400);
    expect((err as ApiClientError).details).toEqual({
      error: 'Unknown branchId.',
      details: ['x'],
    });
    expect((err as ApiClientError).message).toBe('API 400: Unknown branchId.');
  });

  it('throws ZodError on a 2xx body that misses the schema', async () => {
    await expect(unwrap(jsonResponse({ wrong: true }), schema)).rejects.toBeInstanceOf(ZodError);
  });

  it('throws ZodError on a non-2xx body that is not the envelope', async () => {
    await expect(unwrap(jsonResponse({ not: 'the envelope' }, 500), schema)).rejects.toBeInstanceOf(
      ZodError
    );
  });

  it('throws ApiClientError on a non-2xx non-JSON (HTML) body', async () => {
    const res = new Response('<html><body>502 Bad Gateway</body></html>', {
      status: 502,
      headers: { 'content-type': 'text/html' },
    });
    const err = await unwrap(res, schema).catch((e) => e);
    expect(err).toBeInstanceOf(ApiClientError);
    expect((err as ApiClientError).status).toBe(502);
    expect((err as ApiClientError).details).toEqual({ error: 'Non-JSON error response' });
  });

  it('throws ApiClientError on a non-2xx empty body', async () => {
    const res = new Response('', { status: 504 });
    const err = await unwrap(res, schema).catch((e) => e);
    expect(err).toBeInstanceOf(ApiClientError);
    expect((err as ApiClientError).status).toBe(504);
    expect((err as ApiClientError).details).toEqual({ error: 'Non-JSON error response' });
  });
});
