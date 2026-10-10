// The viewer's query-contract tests (#188): the spec's caching posture
// (page stale at 30s, actors at 5m), revalidate-on-focus stated
// explicitly, keepPreviousData on the page query, and search-keyed cache
// identity. Asserts the OPTIONS objects only — the server fns are never
// invoked from a plain-node test (the RPC wrapper needs request context;
// module import is safe, the metrics-queries precedent).
import { keepPreviousData } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { auditLogSearchSchema } from './filters';
import { auditQueries } from './queries';

describe('auditQueries (spec-verbatim caching posture)', () => {
  it('the page query stales at 30s, revalidates on focus, and keeps previous data', () => {
    expect(auditQueries.page(auditLogSearchSchema.parse({}))).toMatchObject({
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      placeholderData: keepPreviousData,
    });
  });

  it('the page key carries the full search — every filter is cache identity', () => {
    const base = auditQueries.page(auditLogSearchSchema.parse({})).queryKey;
    expect(
      auditQueries.page(auditLogSearchSchema.parse({ entity: 'branch' })).queryKey
    ).not.toEqual(base);
    expect(auditQueries.page(auditLogSearchSchema.parse({ page: '2' })).queryKey).not.toEqual(base);
    expect(
      auditQueries.page(auditLogSearchSchema.parse({ from: '2026-10-01', to: '2026-10-06' }))
        .queryKey
    ).not.toEqual(base);
  });

  it('the actors query stales at 5 minutes under the audit prefix', () => {
    expect(auditQueries.actors()).toMatchObject({
      queryKey: ['audit', 'actors'],
      staleTime: 300_000,
      refetchOnWindowFocus: true,
    });
  });

  it('the actors key is stable across calls (one cache entry)', () => {
    expect(auditQueries.actors().queryKey).toEqual(auditQueries.actors().queryKey);
  });
});
