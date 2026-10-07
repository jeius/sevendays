// The manual refresh (#186; affordance per owner feedback at #187): one
// button invalidating the ['metrics'] prefix — every widget refetches
// (revalidate-on-focus is the passive path; this is the active one; there
// is no polling). useIsFetching over the same prefix drives the
// affordance: the icon spins while any metrics query is in flight and the
// button is disabled, so a click storm can't pile up duplicate refetches.

import { Button } from '@sevendays/ui/components/button';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';

export function RefreshButton() {
  const queryClient = useQueryClient();
  const fetching = useIsFetching({ queryKey: ['metrics'] });
  const isRefreshing = fetching > 0;
  return (
    <Button
      variant='outline'
      size='sm'
      disabled={isRefreshing}
      onClick={() => {
        void queryClient.invalidateQueries({ queryKey: ['metrics'] });
      }}
    >
      <RefreshCw aria-hidden className={isRefreshing ? 'animate-spin' : undefined} />
      {isRefreshing ? 'Refreshing…' : 'Refresh'}
    </Button>
  );
}
