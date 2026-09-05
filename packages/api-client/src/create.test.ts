import { describe, expect, it } from 'vitest';
import { ApiClientError } from './error.js';
import { createApiClient } from './index.js';

describe('createApiClient', () => {
  it('throws when options carry no baseUrl', () => {
    expect(() => createApiClient({} as never)).toThrow(/baseUrl/);
  });

  it('throws when baseUrl is blank', () => {
    expect(() => createApiClient({ baseUrl: '   ' })).toThrow(/baseUrl/);
  });

  it('throws when baseUrl has no scheme', () => {
    expect(() => createApiClient({ baseUrl: 'api.example.com' })).toThrow(/baseUrl/);
  });

  it('throws when baseUrl uses a non-http(s) scheme', () => {
    expect(() => createApiClient({ baseUrl: 'ftp://api.example.com' })).toThrow(/baseUrl/);
  });

  it('builds a client whose raw surface is the RPC client', () => {
    const client = createApiClient({ baseUrl: 'http://localhost:4949/' });
    expect(typeof client.raw.api.v1.branches.$get).toBe('function');
  });

  it('ApiClientError carries status and details', () => {
    const err = new ApiClientError(404, { error: 'Not found.' });
    expect(err.status).toBe(404);
    expect(err.details).toEqual({ error: 'Not found.' });
    expect(err.message).toBe('API 404: Not found.');
  });
});
