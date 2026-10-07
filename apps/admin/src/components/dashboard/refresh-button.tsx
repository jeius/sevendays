// The manual refresh (#186; affordance per owner feedback at #187): one
// button invalidating the ['metrics'] prefix — every widget refetches
// (revalidate-on-focus is the passive path; this is the active one; there
// is no polling). useIsFetching over the same prefix drives the
// affordance: the icon spins while any metrics query is in flight and the
// button is disabled, so a click storm can't pile up duplicate refetches.
// When the click's fetches settle, the cache is snapshotted onto
// refreshOutcomeMessage: a thrown error or a resolved 'unavailable'
// source raises a toast (the shared sonner Toaster is mounted in
// __root); 'not-configured' stays inline-only. Success stays silent —
// the widgets are the feedback. All five metrics queries are mounted and
// active, so invalidateQueries always starts refetches and the pending
// flag can't linger.

import { Button } from '@sevendays/ui/components/button';
import { toast } from '@sevendays/ui/components/sonner';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { type RefreshQuerySnapshot, refreshOutcomeMessage } from '#/lib/metrics/refresh-outcome';

export function RefreshButton() {
  const queryClient = useQueryClient();
  const fetching = useIsFetching({ queryKey: ['metrics'] });
  const isRefreshing = fetching > 0;
  const pendingClick = useRef(false);

  useEffect(() => {
    if (fetching > 0) return;
    if (!pendingClick.current) return;
    pendingClick.current = false;
    const snapshots: RefreshQuerySnapshot[] = queryClient
      .getQueryCache()
      .findAll({ queryKey: ['metrics'] })
      .map((query) => ({
        queryKey: query.queryKey,
        status: query.state.status,
        error: query.state.error,
        data: query.state.data,
      }));
    const message = refreshOutcomeMessage(snapshots);
    if (message !== null) {
      toast.error(message);
    }
  }, [fetching, queryClient]);

  return (
    <Button
      variant='outline'
      size='sm'
      disabled={isRefreshing}
      onClick={() => {
        pendingClick.current = true;
        void queryClient.invalidateQueries({ queryKey: ['metrics'] });
      }}
    >
      <RefreshCw aria-hidden className={isRefreshing ? 'animate-spin' : undefined} />
      {isRefreshing ? 'Refreshing…' : 'Refresh'}
    </Button>
  );
}
