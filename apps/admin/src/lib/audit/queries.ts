// The viewer's query factories (#188): the page query keys on the FULL
// search (every filter is cache identity — a filter change is a new
// entry), parses rows through the landed auditLogRowSchema at the RPC
// boundary, and keeps previous data across page flips. Actors are
// long-stale — a studio's staff list barely moves. No server-side cache;
// no polling.

import type { AuditLogRow } from '@sevendays/types';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import { fetchAuditActors, fetchAuditLogPage } from './audit.functions';
import { type AuditLogSearch, parseAuditWireRows } from './filters';

export type AuditLogPage = {
  rows: AuditLogRow[];
  total: number;
  page: number;
  totalPages: number;
};

export const auditQueries = {
  page: (search: AuditLogSearch) =>
    queryOptions({
      queryKey: ['audit', 'page', search] as const,
      queryFn: async () => {
        const result = await fetchAuditLogPage({ data: search });
        return result.ok
          ? {
              ok: true as const,
              data: { ...result.data, rows: parseAuditWireRows(result.data.rows) },
            }
          : result;
      },
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      placeholderData: keepPreviousData,
    }),
  actors: () =>
    queryOptions({
      queryKey: ['audit', 'actors'],
      queryFn: fetchAuditActors,
      staleTime: 300_000,
      refetchOnWindowFocus: true,
    }),
};
